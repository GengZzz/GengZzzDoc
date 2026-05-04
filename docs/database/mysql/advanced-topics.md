# MySQL 综合实战

## 大表 DDL 方案

在大表（百万级以上行数）上执行 `ALTER TABLE` 会锁表，在高并发生产环境中可能阻塞业务数小时。需要使用在线 DDL 工具来避免此问题。

### pt-online-schema-change 原理和使用

Percona Toolkit 的 `pt-online-schema-change` 通过创建影子表、触发器同步增量数据的方式实现在线 DDL。

**工作原理：**

```
1. 创建与原表结构相同的新表（_orders_new）
2. 在新表上执行 ALTER TABLE（此时只有新表，不影响业务）
3. 在原表上创建触发器：
   - AFTER INSERT → 插入新表
   - AFTER UPDATE → 更新新表
   - AFTER DELETE → 从新表删除
4. 分批将原表数据复制到新表（每次复制一小批）
5. 复制完成后，原子性地 RENAME TABLE 替换原表
6. 删除触发器和旧表
```

**使用示例：**

```bash
# 给 orders 表添加一列
pt-online-schema-change \
  --alter "ADD COLUMN category_id INT DEFAULT NULL, ADD INDEX idx_category(category_id)" \
  D=mydb,t=orders \
  --host=localhost \
  --user=root \
  --password=pass \
  --execute

# 修改列类型
pt-online-schema-change \
  --alter "MODIFY COLUMN description VARCHAR(2000) DEFAULT NULL" \
  D=mydb,t=orders \
  --execute

# 添加索引
pt-online-schema-change \
  --alter "ADD INDEX idx_created_at(created_at)" \
  D=mydb,t=orders \
  --chunk-size=5000 \                # 每批复制 5000 行
  --max-load="Threads_running=50" \  # 线程数超过 50 暂停
  --critical-load="Threads_running=100" \  # 超过 100 中止
  --max-lag=10 \                     # 从库延迟超过 10 秒暂停
  --execute
```

**关键参数：**

| 参数 | 说明 |
|------|------|
| `--chunk-size` | 每批复制的行数，默认 1000。大表可适当增大 |
| `--max-load` | 负载超过此阈值时暂停复制 |
| `--critical-load` | 负载超过此阈值时中止操作 |
| `--max-lag` | 从库延迟超过此值时暂停（避免从库严重滞后） |
| `--pause-file` | 创建此文件暂停操作，删除后继续 |
| `--alter-foreign-keys-method` | 外键处理方式：`auto`、`rebuild_constraints`、`drop_swap` |

::: warning pt-online-schema-change 的注意事项
1. 原表必须有主键或唯一键（用于分批复制的数据分片）。
2. 触发器会增加写操作的开销（每次 INSERT/UPDATE/DELETE 都会额外执行一次对新表的操作）。
3. 外键处理比较复杂，有外键的表需要特别小心。
4. RENAME TABLE 瞬间会短暂阻塞（通常毫秒级），对高并发场景仍可能有影响。
5. 复制过程中如果原表有大量写入，触发器可能导致新表复制速度赶不上增量速度。
:::

### gh-ost 原理和使用

gh-ost 是 GitHub 开源的在线 DDL 工具，基于 binlog 而非触发器同步增量数据。

**工作原理：**

```
1. 创建影子表（_orders_gho）
2. 在影子表上执行 ALTER TABLE
3. 在影子表上执行初始数据拷贝
4. 开启 binlog 解析，获取增量变更
5. 将 binlog 中的变更应用到影子表
6. 当影子表数据追上主表后，执行原子性切换（RENAME）
```

**与 pt-osc 的核心区别：** gh-ost 通过解析 binlog 获取增量数据，不需要在原表上创建触发器。

**使用示例：**

```bash
gh-ost \
  --host="10.0.0.1" \
  --port=3306 \
  --user="root" \
  --password="pass" \
  --database="mydb" \
  --table="orders" \
  --alter="ADD COLUMN category_id INT DEFAULT NULL" \
  --assume-rbr \                     # 使用 RBR 模式
  --chunk-size=1000 \                # 每批 1000 行
  --max-lag-millis=1500 \            # 从库延迟阈值 1.5 秒
  --max-load=Threads_running=50 \
  --critical-load=Threads_running=100 \
  --switch-to-rbr \                  # 自动切换到 RBR
  --initially-drop-ghost-table \     # 删除之前的影子表
  --initially-drop-old-table \       # 删除之前的旧表
  --execute

# 交互模式（可以在执行过程中控制）
# 可以通过 unix socket 文件发送命令：
# echo status | nc -U /tmp/gh-ost.mydb.orders.sock
# echo pause    | nc -U /tmp/gh-ost.mydb.sock  # 暂停
# echo resume   | nc -U /tmp/gh-ost.mydb.sock  # 恢复
# echo panic    | nc -U /tmp/gh-ost.mydb.sock  # 中止
```

### pt-osc vs gh-ost 对比

| 对比维度 | pt-online-schema-change | gh-ost |
|---------|------------------------|--------|
| 增量同步方式 | 触发器（AFTER INSERT/UPDATE/DELETE） | Binlog 解析 |
| 对原表影响 | 触发器增加写操作开销 | 无触发器，零额外开销 |
| 外键支持 | 有外键处理方案 | 不支持外键 |
| 主键要求 | 必须有主键或唯一键 | 必须有主键 |
| 可交互性 | 弱（通过 pause-file 控制） | 强（支持交互式命令） |
| 切换方式 | RENAME TABLE | RENAME TABLE |
| 从库感知 | 支持（--max-lag） | 支持（--max-lag-millis） |
| 适用场景 | 通用场景 | 无外键的高写入场景 |

::: tip 如何选择
- 有外键的表：只能用 pt-online-schema-change
- 写入量极高的表：gh-ost 更好（无触发器开销）
- 需要执行过程中精细控制：gh-ost 更好（交互式命令）
- 需要同时处理多张表：pt-osc 更方便（脚本批量调用）
:::

## 数据迁移

### mysqldump 导入导出

```bash
# 导出整个数据库
mysqldump -u root -p --single-transaction --quick mydb > mydb.sql

# 导出到远程服务器（通过 SSH）
mysqldump -u root -p --single-transaction mydb | ssh user@remote "cat > /backup/mydb.sql"

# 压缩导出（节省空间和传输时间）
mysqldump -u root -p --single-transaction mydb | gzip > mydb.sql.gz

# 导入
gunzip < mydb.sql.gz | mysql -u root -p target_db

# 导入优化（关闭 binlog、关闭外键检查、关闭自动提交）
mysql -u root -p target_db << 'EOF'
SET SESSION sql_log_bin = 0;
SET FOREIGN_KEY_CHECKS = 0;
SET AUTOCOMMIT = 0;
SOURCE /data/mydb.sql;
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
EOF
```

### LOAD DATA INFILE（批量导入最快方案）

`LOAD DATA INFILE` 是 MySQL 批量导入数据最快的方式，速度可达 `INSERT` 的 20 倍以上。

```sql
-- 从 CSV 文件导入数据
LOAD DATA INFILE '/data/import/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','          -- 字段分隔符
ENCLOSED BY '"'                   -- 字段引用符
LINES TERMINATED BY '\n'          -- 行分隔符
IGNORE 1 LINES                    -- 跳过 CSV 头部
(order_id, user_id, product_id, amount, status, created_at);

-- 从 CSV 文件导入，只导入指定列
LOAD DATA INFILE '/data/import/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(name, email, @phone, @created_at)
SET phone = NULLIF(@phone, ''),
    created_at = STR_TO_DATE(@created_at, '%Y-%m-%d %H:%i:%s');

-- 使用 LOCAL（从客户端读取文件，需要 secure_file_priv 允许）
LOAD DATA LOCAL INFILE '/home/user/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 LINES;
```

**批量导入优化技巧：**

```sql
-- 导入前关闭安全检查
SET SESSION sql_log_bin = 0;           -- 不记录 binlog
SET FOREIGN_KEY_CHECKS = 0;            -- 关闭外键检查
SET UNIQUE_CHECKS = 0;                 -- 关闭唯一性检查
SET AUTOCOMMIT = 0;                    -- 关闭自动提交

-- 如果表已有数据，先禁用索引
ALTER TABLE orders DISABLE KEYS;

-- 执行导入
LOAD DATA INFILE '/data/orders.csv' INTO TABLE orders
FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 LINES;

-- 导入后重建索引
ALTER TABLE orders ENABLE KEYS;

-- 恢复设置
COMMIT;
SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;
SET AUTOCOMMIT = 1;

-- 如果表是空的，最快的方案是先把数据文件直接拷贝到数据目录
-- 需要使用 .ibd 和 .cfg 文件（物理导入，仅 InnoDB 支持）
-- 适用场景：跨实例的大批量数据迁移
```

::: tip LOAD DATA INFILE 性能对比
- `INSERT INTO ... VALUES`：逐行插入，每行一次网络往返，速度最慢
- `INSERT INTO ... VALUES (..), (..), (..)`：批量 VALUES，减少网络往返，速度中等
- `LOAD DATA INFILE`：直接读取文件批量导入，速度最快（20x ~ 40x 于单行 INSERT）
- 物理文件拷贝：速度最快但操作复杂，仅适合冷数据迁移
:::

### 数据同步：Canal 监听 Binlog

当需要将数据实时同步到其他系统（搜索引擎、数据仓库、缓存）时，可以使用 Canal 监听 MySQL binlog。

**架构：**

```
MySQL (binlog) → Canal Server → Kafka/RocketMQ → Consumer → ES/Redis/其他
```

**Canal 配置：**

```yaml
# canal.properties
canal.id = 1
canal.ip = canal-server
canal.port = 11111
canal.destinations = example

# conf/example/instance.properties
canal.instance.master.address=10.0.0.1:3306
canal.instance.master.journal.name=
canal.instance.master.position=
canal.instance.dbUsername=canal
canal.instance.dbPassword=canal_pass
canal.instance.defaultDatabaseName=mydb
canal.instance.filter.regex=mydb\\..*    # 只监听 mydb 库的表
canal.instance.filter.black.regex=       # 黑名单正则

# MQ 配置
canal.serverMode = kafka
canal.mq.servers = kafka:9092
canal.mq.topic = canal_mydb
```

**消费者示例（Java）：**

```java
@KafkaListener(topics = "canal_mydb")
public void consume(ConsumerRecord<String, String> record) {
    CanalMessage message = JSON.parseObject(record.value(), CanalMessage.class);

    String database = message.getDatabase();
    String table = message.getTable();
    String eventType = message.getType();  // INSERT / UPDATE / DELETE

    for (Map<String, String> row : message.getData()) {
        switch (eventType) {
            case "INSERT":
                // 将新数据同步到 ES
                elasticsearchClient.index(indexName, row);
                break;
            case "UPDATE":
                // 更新 ES 中的文档
                elasticsearchClient.update(indexName, row.get("id"), row);
                break;
            case "DELETE":
                // 从 ES 中删除
                elasticsearchClient.delete(indexName, row.get("id"));
                break;
        }
    }
}
```

## 热点数据问题

### 行锁竞争

当大量并发事务同时更新同一行数据时，会产生严重的行锁竞争，导致吞吐量急剧下降。

**典型场景：**

```sql
-- 库存扣减（秒杀场景）
UPDATE products SET stock = stock - 1 WHERE product_id = 1001 AND stock > 0;

-- 计数器更新
UPDATE counters SET count = count + 1 WHERE counter_name = 'page_view';

-- 账户余额更新
UPDATE accounts SET balance = balance - 100 WHERE account_id = 'ACC001';
```

这些场景的共同特点：所有请求都在竞争同一行的行锁，串行执行。

### 解决方案

#### 方案一：分段锁（把一行拆成多行）

将热点数据拆成多行，分散锁竞争。

```sql
-- 原始方案：一行库存
-- products: stock = 1000（所有请求竞争这一行）

-- 分段方案：拆成 10 行，每行 100 个库存
CREATE TABLE stock_segments (
  product_id INT,
  segment_id INT,    -- 1~10
  stock INT,
  PRIMARY KEY (product_id, segment_id)
);

-- 插入 10 个库存段
INSERT INTO stock_segments VALUES (1001, 1, 100), (1001, 2, 100), ...;

-- 扣减时随机选择一个段（或轮询选择）
UPDATE stock_segments
SET stock = stock - 1
WHERE product_id = 1001
  AND segment_id = FLOOR(RAND() * 10) + 1  -- 随机选段
  AND stock > 0;

-- 如果随机段库存不足，尝试其他段
-- 应用层重试逻辑
```

#### 方案二：Redis 预扣减

将热点数据的扣减逻辑前置到 Redis，利用 Redis 的单线程特性保证原子性。

```java
// Lua 脚本：Redis 中原子扣减库存
String script =
    "local stock = tonumber(redis.call('GET', KEYS[1])) " +
    "if stock >= tonumber(ARGV[1]) then " +
    "  redis.call('DECRBY', KEYS[1], ARGV[1]) " +
    "  return 1 " +  // 扣减成功
    "else " +
    "  return 0 " +  // 库存不足
    "end";

// 执行扣减
Long result = redisTemplate.execute(
    new DefaultRedisScript<>(script, Long.class),
    List.of("stock:product:1001"),
    "1"
);

if (result == 1) {
    // Redis 扣减成功，异步写入 MySQL
    messageQueue.send(new StockDeductMessage(productId, 1));
    return OrderResult.success();
} else {
    return OrderResult.fail("库存不足");
}
```

#### 方案三：异步写入

将同步的数据库更新改为异步，削峰填谷。

```java
// 同步方案（每秒处理几百次更新）
public void updateCounter(String name) {
    counterMapper.increment(name);  // 直接 UPDATE，行锁竞争严重
}

// 异步方案（每秒可处理数万次更新）
public void updateCounter(String name) {
    localBuffer.add(name);  // 写入本地内存缓冲区
}

// 后台线程定时批量合并写入
@Scheduled(fixedRate = 100)  // 每 100ms 执行一次
public void flushCounters() {
    Map<String, Integer> aggregated = localBuffer.drainAndAggregate();

    // 合并后批量更新（100ms 内的多次更新合并为 1 次）
    for (Map.Entry<String, Integer> entry : aggregated.entrySet()) {
        counterMapper.incrementBy(entry.getKey(), entry.getValue());
    }
}
```

## 数据一致性

### 缓存一致性

在 MySQL + Redis 的架构中，缓存与数据库的一致性是最常见的问题。

**Cache Aside Pattern（旁路缓存模式）：**

```
读流程：
  1. 先读 Redis 缓存
  2. 缓存命中 → 直接返回
  3. 缓存未命中 → 读 MySQL → 写入缓存 → 返回

写流程（推荐：先更新数据库，再删除缓存）：
  1. 更新 MySQL
  2. 删除 Redis 缓存
```

**为什么不先删缓存再更新数据库？**

```
先删缓存：
  线程A: 删缓存 → 更新数据库
  线程B:         读缓存（未命中）→ 读数据库（读到旧值）→ 写入缓存（旧值）
  
  结果：缓存中是旧值，数据库中是新值 → 数据不一致
```

**先更新数据库再删除缓存也有问题吗？**

```
先更新数据库：
  线程A: 更新数据库 → 删缓存
  线程B:               读缓存（命中缓存旧值）→ 返回旧值
  
  这种不一致的窗口非常小（只有删缓存前的那一瞬间），且缓存过期后会自动修复。
```

**更稳妥的方案：延迟双删 + 消息队列保证最终一致**

```java
@Transactional
public void updateUser(User user) {
    // 1. 更新数据库
    userMapper.updateById(user);

    // 2. 删除缓存
    redisTemplate.delete("user:" + user.getId());

    // 3. 延迟双删（防止并发读请求在更新后、删缓存前写入旧值到缓存）
    CompletableFuture.runAsync(() -> {
        try {
            Thread.sleep(500);  // 延迟 500ms
            redisTemplate.delete("user:" + user.getId());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    });

    // 4. 发送消息确保最终一致（补偿机制）
    mqProducer.send("cache_invalidation", user.getId());
}
```

::: tip 缓存一致性最佳实践
1. 更新数据库后删除缓存，而不是更新缓存（避免并发更新导致的顺序问题）。
2. 缓存必须设置过期时间（TTL），作为最后的兜底保障。
3. 对于一致性要求极高的场景，使用消息队列做缓存失效通知。
4. 延迟双删是应对极端并发场景的补充手段，不是必须的。
:::

### 最终一致性

在分布式系统中，强一致性往往需要付出性能代价。很多业务场景可以接受短暂的不一致，通过消息队列实现最终一致性。

```
用户下单流程（最终一致性）：
  1. 扣减库存（本地事务）
  2. 创建订单（本地事务）
  3. 发送 MQ 消息（在本地事务内发送或使用事务消息）
  4. 消费者异步扣减积分、发送通知等
  
  如果步骤 4 失败，MQ 会重试 → 最终所有数据一致
```

**幂等消费是关键：**

```java
@KafkaListener(topics = "order_created")
public void onOrderCreated(ConsumerRecord<String, String> record) {
    OrderMessage order = JSON.parseObject(record.value(), OrderMessage.class);

    // 幂等处理：先检查是否已处理过
    if (pointService.isProcessed(order.getOrderId())) {
        log.info("订单 {} 已处理过，跳过", order.getOrderId());
        return;
    }

    // 处理业务
    pointService.addPoints(order.getUserId(), order.getAmount());

    // 标记为已处理
    pointService.markProcessed(order.getOrderId());
}
```

### 分布式事务

当一个业务操作跨越多个数据库或服务时，需要分布式事务来保证一致性。

#### 2PC（两阶段提交）

```
协调者                    参与者A（订单库）    参与者B（库存库）
   │                          │                    │
   ├── Prepare ──────────────►│                    │
   │                          ├── Prepare ────────►│
   │                          │                    │
   │◄──── Yes ────────────────┤                    │
   │                          │◄──── Yes ──────────┤
   │                          │                    │
   ├── Commit ───────────────►│                    │
   │                          ├── Commit ─────────►│
   │                          │                    │
   │◄──── ACK ────────────────┤                    │
   │                          │◄──── ACK ──────────┤
```

MySQL XA 事务示例：

```sql
-- 参与者 A（订单库）
XA START 'order_001';
INSERT INTO orders (id, user_id, amount) VALUES (1, 100, 99.9);
XA END 'order_001';
XA PREPARE 'order_001';  -- 准备阶段：写 redo log，但不提交

-- 参与者 B（库存库）
XA START 'order_001';
UPDATE products SET stock = stock - 1 WHERE id = 2001;
XA END 'order_001';
XA PREPARE 'order_001';

-- 协调者收到两个 PREPARE 成功后，发送 COMMIT
XA COMMIT 'order_001';   -- 参与者 A
XA COMMIT 'order_001';   -- 参与者 B
```

::: warning 2PC 的问题
2PC 虽然能保证强一致性，但在生产环境中很少直接使用：
- 同步阻塞：Prepare 阶段会锁定资源，降低吞吐量
- 单点故障：协调者崩溃可能导致参与者一直持有锁
- 数据不一致：如果部分参与者 Commit 成功、部分失败，数据仍可能不一致
- 性能差：一次分布式事务需要多轮网络往返
:::

#### TCC（Try-Confirm-Cancel）

TCC 是一种业务层面的两阶段方案，将事务拆分为 Try、Confirm、Cancel 三个阶段。

```
Try 阶段（预留资源）：
  订单服务：创建预订单（status = PENDING）
  库存服务：冻结库存（frozen_stock += 1, stock -= 1）
  账户服务：冻结余额（frozen_balance += 99.9, balance -= 99.9）

Confirm 阶段（提交，Try 全部成功后）：
  订单服务：status = CONFIRMED
  库存服务：frozen_stock -= 1（实际扣减）
  账户服务：frozen_balance -= 99.9（实际扣减）

Cancel 阶段（回滚，Try 失败后）：
  订单服务：status = CANCELLED
  库存服务：stock += 1, frozen_stock -= 1（释放冻结）
  账户服务：balance += 99.9, frozen_balance -= 99.9（释放冻结）
```

#### Saga 模式

Saga 将长事务拆分为一系列本地事务，每个事务有对应的补偿操作（逆向操作）。

```
正向流程：
  T1: 创建订单 → T2: 扣减库存 → T3: 扣减余额 → T4: 发货

如果 T3 失败，反向补偿：
  T3 失败 → C2: 恢复库存 → C1: 取消订单
```

#### 本地消息表

最实用的最终一致性方案，在本地事务中同时写业务数据和消息记录。

```sql
-- 本地消息表
CREATE TABLE local_message (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  message_type VARCHAR(64),
  message_body TEXT,
  status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
  retry_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_retry (status, retry_count)
);

-- 在同一个事务中写业务数据和消息
BEGIN;
  INSERT INTO orders (user_id, amount) VALUES (100, 99.9);
  INSERT INTO local_message (message_type, message_body)
    VALUES ('ORDER_CREATED', '{"order_id": 1, "user_id": 100}');
COMMIT;

-- 后台任务定时扫描 PENDING 消息，发送到 MQ
-- 发送成功后更新状态为 SENT
-- 失败则重试，超过最大重试次数标记为 FAILED 并告警
```

## 死锁案例分析

死锁是指两个或多个事务互相等待对方持有的锁，导致所有事务都无法继续执行的情况。

### 查看死锁信息

```sql
-- 查看最近一次死锁详情
SHOW ENGINE INNODB STATUS\G
-- 关注 LATEST DETECTED DEADLOCK 部分

-- 查看当前锁等待
SELECT * FROM performance_schema.data_lock_waits;   -- MySQL 8.0+
SELECT * FROM information_schema.INNODB_LOCK_WAITS; -- MySQL 5.7

-- 查看当前事务
SELECT * FROM information_schema.INNODB_TRX;
```

### 案例一：批量更新顺序不一致

**场景描述：** 两个事务批量更新多行数据，但更新顺序相反，导致死锁。

```sql
-- 事务 A：按 id 升序更新
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 锁住 id=1
-- 此时持有 id=1 的行锁

UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 需要锁 id=2

-- 事务 B：按 id 降序更新
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 2;  -- 锁住 id=2
-- 此时持有 id=2 的行锁

UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- 需要锁 id=1，被事务 A 持有
-- 事务 B 等待事务 A 释放 id=1 的锁
-- 事务 A 等待事务 B 释放 id=2 的锁
-- 死锁！
```

**解决方案：** 确保所有事务按相同顺序访问资源。

```java
// 排序后再更新，确保顺序一致
List<Long> ids = Arrays.asList(1L, 2L);
Collections.sort(ids);  // 排序！
for (Long id : ids) {
    accountMapper.deductBalance(id, 100);
}
```

### 案例二：唯一索引冲突 + 间隙锁

**场景描述：** 两个事务同时插入相同唯一索引值，间隙锁互相阻塞。

```sql
-- 表结构
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE
);

-- 事务 A：尝试插入
BEGIN;
INSERT INTO users (email) VALUES ('test@example.com');
-- 对 email 唯一索引加排他锁（X 型插入意向锁）

-- 事务 B：尝试插入相同 email
BEGIN;
INSERT INTO users (email) VALUES ('test@example.com');
-- 需要获取 X 型插入意向锁，被事务 A 阻塞

-- InnoDB 检测到死锁，回滚其中一个事务
-- ERROR 1213: Deadlock found when trying to get lock
```

**解决方案：** 插入前先查询是否存在，或使用 `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE`。

```sql
-- 方案1：INSERT IGNORE（冲突时忽略）
INSERT IGNORE INTO users (email) VALUES ('test@example.com');

-- 方案2：ON DUPLICATE KEY UPDATE（冲突时更新）
INSERT INTO users (email) VALUES ('test@example.com')
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 方案3：应用层先查后插（需要 SERIALIZABLE 隔离级别才完全安全）
SELECT id FROM users WHERE email = 'test@example.com';
-- 不存在则插入（仍有极小概率竞态条件）
```

### 案例三：外键检查死锁

**场景描述：** 有外键关联的表，删除父表记录时 InnoDB 自动检查子表。

```sql
-- 父表：orders
-- 子表：order_items（外键 order_id → orders.id）

-- 事务 A：删除订单
BEGIN;
DELETE FROM orders WHERE id = 100;
-- InnoDB 自动对 order_items 中 order_id=100 的行加共享锁

-- 事务 B：插入订单项
BEGIN;
INSERT INTO order_items (order_id, product_id, quantity) VALUES (100, 1, 1);
-- InnoDB 检查外键时需要获取 orders.id=100 的共享锁
-- 被事务 A 的排他锁阻塞

-- 事务 A 再尝试删除 order_items 中的行
DELETE FROM order_items WHERE order_id = 100;
-- 需要获取 order_items 的排他锁，被事务 B 的共享锁阻塞

-- 死锁！
```

**解决方案：**

```sql
-- 总是先删子表，再删父表
BEGIN;
DELETE FROM order_items WHERE order_id = 100;  -- 先删子表
DELETE FROM orders WHERE id = 100;             -- 再删父表
COMMIT;

-- 或者使用级联删除
ALTER TABLE order_items
  ADD CONSTRAINT fk_order
  FOREIGN KEY (order_id) REFERENCES orders(id)
  ON DELETE CASCADE;  -- 删父表时自动删子表记录
```

::: tip 死锁防范经验
1. **统一访问顺序**：所有事务按相同顺序访问行（如按主键排序）。
2. **缩短事务时长**：事务越短，持锁时间越短，死锁概率越低。
3. **避免间隙锁**：尽量使用唯一索引等值查询，减少间隙锁范围。
4. **分批处理**：大批量操作拆分成小批次（如每次 1000 行）。
5. **外键操作顺序**：先操作子表，再操作父表。
6. **设置死锁超时**：`innodb_lock_wait_timeout` 设置合理值（默认 50 秒，实际可根据业务调整）。
7. **监控和告警**：定期检查死锁日志，及时发现并修复死锁模式。
:::

## SQL 注入防范

SQL 注入是最危险的 Web 安全漏洞之一，攻击者通过构造特殊的输入篡改 SQL 语句，获取或修改数据库数据。

### 攻击示例

```sql
-- 正常查询
SELECT * FROM users WHERE username = 'admin' AND password = '123456';

-- 注入攻击：password 输入为 ' OR '1'='1
SELECT * FROM users WHERE username = 'admin' AND password = '' OR '1'='1';
-- 永远为真，绕过登录验证

-- 更危险的注入：password 输入为 '; DROP TABLE users; --
SELECT * FROM users WHERE username = 'admin' AND password = ''; DROP TABLE users; --';
-- 删除整个用户表
```

### 防范措施

**1. 参数化查询（最根本的防范方式）：**

```java
// 危险：字符串拼接
String sql = "SELECT * FROM users WHERE username = '" + username + "'";
// 任何时候都不要这样做！

// 安全：参数化查询（PreparedStatement）
String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement ps = connection.prepareStatement(sql);
ps.setString(1, username);
ps.setString(2, password);
ResultSet rs = ps.executeQuery();
```

```python
# Python 示例（同样危险的拼接）
cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")  # 危险！

# 安全的参数化
cursor.execute("SELECT * FROM users WHERE name = %s", (name,))  # 安全
```

**2. 最小权限原则：**

```sql
-- 应用账号只授予必要的最小权限
CREATE USER 'app'@'%' IDENTIFIED BY '...';
GRANT SELECT, INSERT, UPDATE ON shop.* TO 'app'@'%';
-- 不授予 DROP、ALTER、FILE、SUPER 等危险权限
-- 即使被注入，攻击者也只能执行 SELECT/INSERT/UPDATE
```

**3. 输入验证和转义：**

```java
// 使用白名单验证
if (!VALID_STATUSES.contains(inputStatus)) {
    throw new IllegalArgumentException("Invalid status");
}

// 对特殊字符进行转义
String escaped = input.replace("'", "''").replace("\\", "\\\\");
// 但转义不是万能的，参数化查询才是根本方案
```

**4. WAF（Web 应用防火墙）：**

```nginx
# Nginx + ModSecurity 规则示例
SecRule ARGS "@detectSQLi" \
  "id:1,phase:2,deny,status:403,msg:'SQL Injection Detected'"

# 常见 WAF 规则：
# - 检测 UNION、SELECT、DROP、DELETE 等关键字
# - 检测单引号、双注释符等特殊字符
# - 检测编码绕过（URL 编码、Unicode 编码）
```

::: danger 防范 SQL 注入的核心原则
1. **永远使用参数化查询**，不要拼接 SQL。
2. **最小权限原则**，应用账号不应有 DDL 权限。
3. **对用户输入零信任**，所有外部输入都必须验证和过滤。
4. **部署 WAF** 作为额外的安全层，但不能替代参数化查询。
5. **定期安全审计**，使用 SQLMap 等工具扫描接口。
:::

## 千万级大表优化经验

### 冷热数据分离

将高频访问的热数据和低频访问的冷数据分开存储，减少热表的体积。

```sql
-- 原始表：1 亿条订单记录
-- 热数据：最近 3 个月的订单（高频查询）
-- 冷数据：3 个月前的历史订单（偶尔查询）

-- 方案1：分区表（按时间分区）
ALTER TABLE orders PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
  PARTITION p202401 VALUES LESS THAN (202402),
  PARTITION p202402 VALUES LESS THAN (202403),
  PARTITION p202403 VALUES LESS THAN (202404),
  -- ...
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 查询最近 3 个月的订单时，自动只扫描相关分区
SELECT * FROM orders WHERE created_at >= '2024-01-01';
-- EXPLAIN 显示只扫描了 3 个分区

-- 方案2：应用层路由（更灵活）
-- orders_current：近 3 个月的订单（在线库）
-- orders_history：3 个月前的历史（归档库，可以是压缩存储）

-- 写入：新订单只写 orders_current
-- 查询：先查 orders_current，未命中再查 orders_history
-- 归档：定时任务将过期数据迁移到 orders_history
```

### 分区表

```sql
-- 按日期范围分区（最常用）
CREATE TABLE logs (
  id BIGINT AUTO_INCREMENT,
  level VARCHAR(10),
  message TEXT,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (TO_DAYS(created_at)) (
  PARTITION p2024_q1 VALUES LESS THAN (TO_DAYS('2024-04-01')),
  PARTITION p2024_q2 VALUES LESS THAN (TO_DAYS('2024-07-01')),
  PARTITION p2024_q3 VALUES LESS THAN (TO_DAYS('2024-10-01')),
  PARTITION p2024_q4 VALUES LESS THAN (TO_DAYS('2025-01-01')),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 分区裁剪：查询只扫描相关分区
EXPLAIN SELECT * FROM logs WHERE created_at BETWEEN '2024-04-01' AND '2024-06-30';
-- partitions: p2024_q2 ← 只扫描了一个分区

-- 快速删除旧数据（直接 DROP 分区，比 DELETE 快几个数量级）
ALTER TABLE logs DROP PARTITION p2024_q1;

-- 添加新分区
ALTER TABLE logs REORGANIZE PARTITION p_future INTO (
  PARTITION p2025_q1 VALUES LESS THAN (TO_DAYS('2025-04-01')),
  PARTITION p2025_q2 VALUES LESS THAN (TO_DAYS('2025-07-01')),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 查看分区信息
SELECT partition_name, table_rows, data_length / 1024 / 1024 AS data_mb
FROM information_schema.PARTITIONS
WHERE table_schema = 'mydb' AND table_name = 'logs';
```

### 归档历史数据

```sql
-- 创建归档表（结构相同，可启用压缩）
CREATE TABLE orders_archive LIKE orders;

-- 修改归档表为压缩存储
ALTER TABLE orders_archive ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;

-- 归档旧数据
INSERT INTO orders_archive
SELECT * FROM orders
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- 确认归档数据完整后，从原表删除
DELETE FROM orders
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

-- 大批量删除优化：分批删除，避免长时间锁表
-- 每次删除 10000 行
DELETE FROM orders
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
ORDER BY id
LIMIT 10000;

-- 循环执行直到影响行数为 0
```

::: tip 分批删除的脚本
```bash
#!/bin/bash
# 分批删除历史数据，避免大事务
BATCH_SIZE=10000
while true; do
  AFFECTED=$(mysql -u root -p -N -e "
    DELETE FROM mydb.orders
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
    ORDER BY id
    LIMIT ${BATCH_SIZE};
    SELECT ROW_COUNT();" 2>/dev/null)
  echo "Deleted ${AFFECTED} rows"
  if [ "$AFFECTED" -eq 0 ]; then
    break
  fi
  sleep 1  # 间隔 1 秒，让出 IO
done
```
:::

### 读写分离 + 缓存

千万级大表的最终优化方案是综合运用多种策略：

```
                    用户请求
                       │
                  ┌────▼────┐
                  │   Nginx  │ (负载均衡)
                  └────┬────┘
                       │
               ┌───────▼────────┐
               │   应用服务器    │
               │ ┌────────────┐ │
               │ │  Redis 缓存 │ │ ← 热数据缓存（查询→缓存→返回）
               │ └────────────┘ │
               └───────┬────────┘
                       │
              ┌────────┼────────┐
              │        │        │
         ┌────▼──┐ ┌──▼────┐ ┌─▼──────┐
         │ 主库  │ │ 从库1 │ │ 从库2  │
         │ (写)  │ │ (读)  │ │ (读)   │
         └───────┘ └───────┘ └────────┘

优化层次：
  1. 缓存层：Redis 缓存热点数据，拦截 80% 以上的读请求
  2. 读写分离：剩余读请求分散到从库
  3. 索引优化：确保查询都走索引，消灭慢查询
  4. 冷热分离：历史数据归档，热表保持精简
  5. 分区表：利用分区裁剪减少扫描量
  6. 分库分表：单表数据量超过 5000 万时考虑水平拆分
```

```sql
-- 最终效果验证
-- 查看表大小和行数
SELECT
  table_name,
  table_rows,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mb
FROM information_schema.TABLES
WHERE table_schema = 'mydb'
ORDER BY data_length DESC;

-- 确认关键查询的执行计划
EXPLAIN SELECT * FROM orders
WHERE user_id = 100 AND created_at >= '2024-01-01'
ORDER BY created_at DESC LIMIT 20;
-- 期望结果：type=ref/range, key=idx_user_created, rows < 1000
```
