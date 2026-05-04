# 分库分表

## 为什么要分库分表

当数据库达到一定规模后，会遇到以下瓶颈：

```
单库瓶颈：
├── 单库容量：MySQL 单实例数据量过大（如超过 1TB），备份恢复时间过长
├── 单表行数：单表超过千万行后，索引树层级变深，查询变慢
├── 连接数：单库的 max_connections 有上限（通常几千）
├── 写入瓶颈：主库单点写入，无法水平扩展写能力
└── 锁竞争：行锁/表锁冲突加剧，吞吐量下降
```

```sql
-- 诊断：查看当前数据库状态
SHOW VARIABLES LIKE 'max_connections';    -- 连接数上限
SELECT COUNT(*) FROM information_schema.PROCESSLIST;  -- 当前连接数

-- 查看单表大小
SELECT
    TABLE_NAME,
    TABLE_ROWS / 1000000 AS rows_million,
    DATA_LENGTH / 1024 / 1024 AS data_mb,
    INDEX_LENGTH / 1024 / 1024 AS index_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY TABLE_ROWS DESC
LIMIT 20;
```

## 垂直拆分

### 垂直分库

按业务模块将不同表拆分到不同的数据库实例中。

```
拆分前（单库）：
┌─────────────────────────────┐
│  mydb                       │
│  ├── users                  │
│  ├── orders                 │
│  ├── products               │
│  ├── payments               │
│  └── ...                    │
└─────────────────────────────┘

拆分后（多库）：
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  user_db     │ │  order_db    │ │  product_db  │
│  ├── users   │ │  ├── orders  │ │  ├── products│
│  ├── profiles│ │  ├── payments│ │  ├── skus    │
│  └── sessions│ │  └── refunds │ │  └── stocks  │
└──────────────┘ └──────────────┘ └──────────────┘
  独立实例        独立实例         独立实例
```

```sql
-- 拆分后，原来同一库内的 JOIN 变成了跨库操作
-- 拆分前：
SELECT u.name, o.order_no, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;

-- 拆分后需要应用层处理：
-- 1. 先从 user_db 查用户信息
-- 2. 再从 order_db 查订单信息
-- 3. 应用层合并结果
```

### 垂直分表

将一张宽表拆分为多张窄表，实现冷热数据分离。

```
拆分前：
┌──────────────────────────────────────────────────────┐
│  users (80 列, 平均每行 2KB)                          │
│  id | name | email | phone | avatar | bio | ...      │
│  (高频访问列)         (低频访问列，大字段)              │
└──────────────────────────────────────────────────────┘

拆分后：
┌────────────────────────┐ ┌────────────────────────────┐
│  users (主表, 紧凑)    │  │  users_ext (扩展表)         │
│  id | name | email     │  │  user_id | avatar | bio    │
│  phone | status        │  │  address | preferences     │
│  (平均每行 200B)       │  │  (大字段，按需加载)         │
└────────────────────────┘ └────────────────────────────┘
```

```sql
-- 主表：高频访问的短字段
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone)
) ENGINE=InnoDB;

-- 扩展表：低频访问的大字段
CREATE TABLE users_ext (
    user_id BIGINT PRIMARY KEY,
    avatar VARCHAR(500),
    bio TEXT,
    address JSON,
    preferences JSON,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 高频查询只访问主表
SELECT id, name, email FROM users WHERE phone = '13800138000';

-- 需要详情时才 JOIN 扩展表
SELECT u.*, ue.avatar, ue.bio
FROM users u
LEFT JOIN users_ext ue ON u.id = ue.user_id
WHERE u.id = 1;
```

## 水平拆分

### 水平分库

将同一张表的数据按规则分布到多个数据库实例中。

```
orders 表水平分库（4 个库）：

┌─────────────────┐ ┌─────────────────┐
│  orders_db_0    │ │  orders_db_1    │
│  orders_0       │ │  orders_1       │
│  orders_4       │ │  orders_5       │
└─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐
│  orders_db_2    │ │  orders_db_3    │
│  orders_2       │ │  orders_3       │
│  orders_6       │ │  orders_7       │
└─────────────────┘ └─────────────────┘

分片规则：user_id % 4 → 库编号，再 % 2 → 表编号
```

### 水平分表

将一张大表拆分为多张结构相同的子表。

```
orders 表（10 亿行）水平拆分为 16 张子表：

orders_00 ~ orders_15
每张表约 6250 万行

分片键：order_id 或 user_id
```

```sql
-- 子表结构完全相同
CREATE TABLE orders_00 (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2),
    status TINYINT,
    created_at TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- 创建 16 张子表
-- orders_00, orders_01, ..., orders_15
```

## 分片策略

### Range 分片

按值的范围将数据分配到不同的分片。

```sql
-- 按时间分片
-- orders_2024: 2024-01-01 ~ 2024-12-31 的订单
-- orders_2025: 2025-01-01 ~ 2025-12-31 的订单
-- orders_2026: 2026-01-01 ~ 2026-12-31 的订单

-- 按 ID 范围分片
-- shard_0: order_id 1 ~ 10000000
-- shard_1: order_id 10000001 ~ 20000000
-- shard_2: order_id 20000001 ~ 30000000
```

优点：
- 实现简单，新数据自然写入最新的分片
- 范围查询效率高（如查询最近一个月的订单）

缺点：
- 数据分布可能不均匀（热点集中在最新分片）
- 单个分片可能成为写入瓶颈

### Hash 分片

对分片键取模，将数据均匀分布。

```sql
-- 分片规则：user_id % 4 = 库编号
-- user_id = 100 → 100 % 4 = 0 → orders_db_0
-- user_id = 101 → 101 % 4 = 1 → orders_db_1
-- user_id = 102 → 102 % 4 = 2 → orders_db_2
-- user_id = 103 → 103 % 4 = 3 → orders_db_3

-- 应用层路由逻辑（伪代码）
function getShardDb(userId) {
    return 'orders_db_' + (userId % 4);
}

function getShardTable(orderId) {
    return 'orders_' + String(orderId % 16).padStart(2, '0');
}
```

优点：
- 数据分布均匀
- 写入压力分散到多个分片

缺点：
- 范围查询需要访问所有分片
- 扩容时需要迁移大量数据

### 一致性 Hash

解决 Hash 分片扩容时的数据迁移问题。

```
传统 Hash 取模：user_id % N
扩容：N → N+1，几乎所有数据的映射都变了

一致性 Hash：
将哈希空间组织为一个环（0 ~ 2^32-1）
每个节点（分片）在环上分配一个位置
数据沿环顺时针找到最近的节点

扩容时只需迁移相邻节点的部分数据
```

```
          0
         ╱ ╲
       ╱     ╲
   node_A      node_B
   (分片 0)    (分片 1)
      ╲       ╱
        ╲   ╱
        ╱   ╲
      ╱       ╲
   node_C      node_D
   (分片 2)    (分片 3)

新增 node_E：只迁移 node_D 中顺时针方向最近的部分数据
```

::: tip 一致性 Hash 的实际应用
一致性 Hash 在 Redis Cluster、DynamoDB 等分布式系统中广泛使用。MySQL 分库分表中间件（如 ShardingSphere）也支持一致性 Hash 策略。对于需要频繁扩容的系统，一致性 Hash 可以显著减少数据迁移量。
:::

## 分库分表带来的问题

### 跨库 JOIN

```sql
-- 拆分前
SELECT o.order_no, u.name, p.product_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.created_at > '2026-01-01';

-- 拆分后（user_db, order_db, product_db）
-- 无法直接执行跨库 JOIN

-- 解决方案 1：应用层组装
-- Step 1: 从 order_db 查订单
SELECT order_no, user_id FROM orders WHERE created_at > '2026-01-01';
-- Step 2: 用 user_id 列表从 user_db 查用户名
SELECT id, name FROM users WHERE id IN (1, 2, 3, ...);
-- Step 3: 应用层合并

-- 解决方案 2：数据冗余
-- 在 orders 表中冗余 user_name、product_name
-- 牺牲写入一致性换取查询效率

-- 解决方案 3：全局表/广播表
-- 将小表（如字典表）复制到每个分片
-- 每个库都有一份完整的副本
```

### 跨库事务

```sql
-- 场景：下单扣库存，订单和库存在不同库
-- orders_db: INSERT INTO orders (user_id, product_id, amount) VALUES (...)
-- inventory_db: UPDATE stock SET quantity = quantity - 1 WHERE product_id = ...

-- 传统事务无法跨库
BEGIN;
INSERT INTO orders_db.orders ...;  -- 库 A
UPDATE inventory_db.stock ...;      -- 库 B
COMMIT;  -- 无法保证原子性
```

解决跨库事务的方案：

**两阶段提交（2PC）**：

```
阶段 1（Prepare）：
├── 协调者向各参与者发送 Prepare 请求
├── 各参与者执行本地事务，但不提交
└── 返回 OK / Fail

阶段 2（Commit/Rollback）：
├── 如果所有参与者 OK → 发送 Commit
├── 如果任一参与者 Fail → 发送 Rollback
└── 各参与者执行提交或回滚

缺点：同步阻塞、协调者单点故障、网络分区问题
```

**TCC（Try-Confirm-Cancel）**：

```
Try：预留资源（冻结库存）
Confirm：确认提交（减少冻结库存）
Cancel：取消预留（解冻库存）

示例：
Try:    UPDATE stock SET frozen = frozen + 1 WHERE id = 1 AND available >= 1
Confirm: UPDATE stock SET available = available - 1, frozen = frozen - 1 WHERE id = 1
Cancel: UPDATE stock SET frozen = frozen - 1 WHERE id = 1
```

**最终一致性**：

```
1. 本地事务 + 消息队列
2. 先在本地库执行操作，写入消息表
3. 异步发送消息到 MQ
4. 消费者执行跨库操作
5. 如果失败，通过重试机制保证最终一致

适用场景：对一致性要求不严格（如积分、通知、统计）
```

### 全局排序

```sql
-- 拆分前：单库排序
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- 拆分后：每个分片各自排序
-- shard_0: SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
-- shard_1: SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
-- ...
-- 应用层合并 4 个结果集，取 Top 10

-- 如果 ORDER BY 列上有索引，各分片只需扫描少量数据
-- 如果 ORDER BY 列上没有索引，各分片需要全表排序
```

### 分页查询

```sql
-- 拆分前
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- 拆分后
-- 每个分片需要查询 LIMIT 10020 OFFSET 0
-- 然后在应用层合并排序，取第 10001~10020 条

-- 优化方案：禁止深度分页，改用游标分页
-- 使用上一页的最后一条记录的排序字段值作为起点
SELECT * FROM orders
WHERE created_at < '2026-05-04 10:00:00'
ORDER BY created_at DESC
LIMIT 20;
```

### 聚合函数

```sql
-- 拆分前
SELECT COUNT(*), SUM(amount), AVG(amount) FROM orders WHERE status = 1;

-- 拆分后（4 个分片）
-- shard_0: COUNT(*)=1000, SUM(amount)=50000, AVG(amount)=50
-- shard_1: COUNT(*)=800,  SUM(amount)=40000, AVG(amount)=50
-- shard_2: COUNT(*)=1200, SUM(amount)=60000, AVG(amount)=50
-- shard_3: COUNT(*)=900,  SUM(amount)=45000, AVG(amount)=50

-- 应用层聚合：
-- COUNT(*) = 1000 + 800 + 1200 + 900 = 3900
-- SUM(amount) = 50000 + 40000 + 60000 + 45000 = 195000
-- AVG(amount) = 195000 / 3900 = 50（不能直接取各分片 AVG 的平均值！）
```

::: warning AVG 的陷阱
各分片的 `AVG` 值不能直接求平均。正确的计算方式是 `SUM(SUM值) / SUM(COUNT值)`。

```python
# 错误：avg(avg_0, avg_1, avg_2, avg_3)
# 正确：
total_sum = sum_0 + sum_1 + sum_2 + sum_3
total_count = count_0 + count_1 + count_2 + count_3
avg = total_sum / total_count
```
:::

## 分布式 ID 方案

分库分表后，自增 ID 无法保证全局唯一，需要使用分布式 ID 生成方案。

### UUID

```sql
-- 生成 UUID
SELECT UUID();
-- 输出：'3E11FA47-71CA-11E1-9E33-C80AA9429562'

-- UUID 作为主键的问题：
-- 1. 32 字符，占用空间大
-- 2. 无序，导致 B+ 树频繁分裂（插入性能差）
-- 3. 不适合做聚簇索引的主键
```

### 数据库自增（多主设置不同步长）

```sql
-- 库 A
SET @@auto_increment_offset = 1;  -- 起始值
SET @@auto_increment_increment = 3; -- 步长
-- 生成: 1, 4, 7, 10, 13, ...

-- 库 B
SET @@auto_increment_offset = 2;
SET @@auto_increment_increment = 3;
-- 生成: 2, 5, 8, 11, 14, ...

-- 库 C
SET @@auto_increment_offset = 3;
SET @@auto_increment_increment = 3;
-- 生成: 3, 6, 9, 12, 15, ...
```

缺点：扩容时需要调整步长，影响已有数据。

### Redis INCR

```
SET id_generator:orders 0
INCR id_generator:orders  -- 返回 1
INCR id_generator:orders  -- 返回 2

# 批量获取（减少 Redis 调用）
INCRBY id_generator:orders 100  -- 返回 100（代表 1~100）
# 应用本地分配 1~100
```

优点：高性能，简单。
缺点：Redis 单点故障风险，需要持久化保证不重复。

### 雪花算法 (Snowflake)

64 位 ID 结构：

```
┌──────┬────────────┬──────────┬──────────────┐
│ 符号位 │ 时间戳      │ 机器 ID   │ 序列号         │
│ 1 bit│ 41 bits    │ 10 bits  │ 12 bits      │
└──────┴────────────┴──────────┴──────────────┘

- 符号位：0（正数）
- 时间戳：毫秒级，可用 69 年
- 机器 ID：最多 1024 个节点
- 序列号：同一毫秒内最多 4096 个 ID
```

```python
# Python 雪花算法实现
import time
import threading

class Snowflake:
    def __init__(self, machine_id):
        self.machine_id = machine_id & 0x3FF  # 10 bits
        self.sequence = 0
        self.last_timestamp = -1
        self.lock = threading.Lock()
        # 起始时间戳（自定义纪元）
        self.epoch = 1609459200000  # 2021-01-01 00:00:00 UTC

    def generate(self):
        with self.lock:
            timestamp = int(time.time() * 1000)
            if timestamp == self.last_timestamp:
                self.sequence = (self.sequence + 1) & 0xFFF  # 12 bits
                if self.sequence == 0:
                    # 当前毫秒序列号用尽，等待下一毫秒
                    while timestamp <= self.last_timestamp:
                        timestamp = int(time.time() * 1000)
            else:
                self.sequence = 0

            self.last_timestamp = timestamp
            return ((timestamp - self.epoch) << 22) | \
                   (self.machine_id << 12) | \
                   self.sequence

# 使用
sf = Snowflake(machine_id=1)
id_1 = sf.generate()  # 例如: 1234567890123456789
id_2 = sf.generate()  # 例如: 1234567890123456790
```

### 开源方案

| 方案 | 特点 |
|------|------|
| **美团 Leaf** | 支持号段模式和 Snowflake 模式，号段模式预分配 ID 段落减少数据库访问 |
| **滴滴 TinyID** | 基于号段模式，通过数据库预分配 ID 批次 |
| **百度 UidGenerator** | 基于 Snowflake，使用 RingBuffer 优化性能 |

## 扩容问题

### 停机扩容

```
步骤：
1. 停止应用服务
2. 导出数据
3. 按新分片规则重新分片
4. 导入到新的分片
5. 修改应用配置
6. 启动应用服务

优点：简单、安全
缺点：需要停机，适用于业务量小的系统
```

### 双写迁移

```
步骤：
1. 新旧分片同时写入（双写）
2. 全量迁移历史数据
3. 增量数据通过双写同步
4. 数据校验（新旧分片数据一致）
5. 切换读流量到新分片
6. 切换写流量到新分片
7. 停止旧分片

流程：
┌──────────┐      ┌──────────────┐
│  应用     │ ──→  │  旧分片 (读写) │
│  (双写)   │      └──────────────┘
│           │ ──→  ┌──────────────┐
│           │      │  新分片 (只写) │
└──────────┘      └──────────────┘
                         │
                   数据校验完成后
                         ↓
                    ┌──────────────┐
                    │  新分片 (读写) │ ← 切换流量
                    └──────────────┘
```

## 中间件

### ShardingSphere

Apache 顶级项目，提供 ShardingSphere-JDBC（客户端模式）和 ShardingSphere-Proxy（代理模式）。

```yaml
# ShardingSphere-JDBC 配置示例
dataSources:
  ds_0:
    dataSourceClassName: com.zaxxer.hikari.HikariDataSource
    driverClassName: com.mysql.cj.jdbc.Driver
    jdbcUrl: jdbc:mysql://192.168.1.101:3306/orders_db_0
    username: root
    password: xxx
  ds_1:
    jdbcUrl: jdbc:mysql://192.168.1.102:3306/orders_db_1

rules:
  - !SHARDING
    tables:
      orders:
        actualDataNodes: ds_${0..1}.orders_${0..15}
        databaseStrategy:
          standard:
            shardingColumn: user_id
            shardingAlgorithmName: db-hash-mod
        tableStrategy:
          standard:
            shardingColumn: order_id
            shardingAlgorithmName: table-hash-mod
    shardingAlgorithms:
      db-hash-mod:
        type: HASH_MOD
        props:
          sharding-count: 2
      table-hash-mod:
        type: HASH_MOD
        props:
          sharding-count: 16
```

### MyCat

基于 Proxy 的数据库中间件，应用无需修改代码。

```
应用 → MyCat Proxy (3306) → MySQL 分片集群
           │
           ├── 解析 SQL
           ├── 路由到对应分片
           ├── 合并结果
           └── 返回给应用
```

### Vitess

YouTube 开源的数据库分片方案，基于 Proxy + Kubernetes。

特点：
- 支持自动分片和在线扩缩容
- 连接池和查询合并
- 与 Kubernetes 深度集成
- CNCF 毕业项目

::: danger 分库分表是最后手段
分库分表引入了巨大的复杂度：分布式事务、跨库 JOIN、全局排序、分布式 ID、扩容迁移。在决定分库分表之前，务必按以下顺序评估：

1. **读写分离**：主库写，从库读，解决读扩展问题
2. **缓存**：Redis 缓存热点数据，减少数据库压力
3. **垂直分库**：按业务模块拆分，每个库独立扩展
4. **垂直分表**：冷热数据分离，减少单行宽度
5. **水平分表**：单库内分表，减轻单表压力
6. **水平分库**：最后手段，解决写入瓶颈

每一步都会引入额外的复杂度和运维成本。过早分库分表是绝大多数团队犯的最大架构错误。
:::
