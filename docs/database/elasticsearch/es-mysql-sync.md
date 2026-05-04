# ES + MySQL 同步

实际项目中，MySQL 通常作为主数据库存储业务数据，ES 作为搜索引擎提供全文检索和聚合分析能力。两者的数据同步方案是架构设计中的关键一环。

## 双写方案

应用层在写入 MySQL 的同时写入 ES，是最直接的同步方式。

### 同步双写

```java
@Transactional
public void createProduct(Product product) {
    // 1. 写入 MySQL
    productMapper.insert(product);
    
    // 2. 写入 ES
    elasticsearchTemplate.save(product);
}
```

### 异步双写

同步双写的性能瓶颈在于 ES 写入失败会导致整个操作回滚。异步方案将 ES 写入解耦：

```java
@Transactional
public void createProduct(Product product) {
    productMapper.insert(product);
    // 发送消息到 MQ，异步消费后写入 ES
    messageQueue.send("product_create", product);
}
```

### 双写的问题

| 问题 | 说明 |
|------|------|
| 数据不一致 | ES 写入失败（网络超时、ES 宕机），MySQL 已提交 |
| 性能损耗 | 同步双写增加一倍延迟；异步双写增加架构复杂度 |
| 代码侵入 | 需要在每个写入点添加 ES 写入逻辑 |
| 顺序问题 | 异步场景下 MySQL 写入顺序和 ES 写入顺序可能不一致 |

::: tip 双写适用场景
数据量小、变更不频繁、一致性要求不高的场景。比如用户资料、配置信息。
:::

## Canal 监听 Binlog 同步

Canal 是阿里巴巴开源的 MySQL Binlog 增量订阅工具。它伪装成 MySQL Slave，实时获取数据变更事件。

### 架构

```
MySQL ──Binlog──→ Canal Server ──解析──→ Canal Client ──写入──→ Elasticsearch
                     │
                     ├── 模拟 MySQL Slave 协议
                     ├── 解析 Binlog 事件（ROW 格式）
                     └── 按表过滤、推送变更事件
```

### Canal 配置

**MySQL 侧**：开启 Binlog，设置 ROW 格式：

```ini
[mysqld]
log-bin=mysql-bin
binlog-format=ROW
server-id=1
```

**Canal Server** 配置（`conf/example/instance.properties`）：

```properties
# MySQL 连接
canal.instance.master.address=127.0.0.1:3306
canal.instance.dbUsername=canal
canal.instance.dbPassword=canal

# 监听的库和表（正则）
canal.instance.filter.regex=mydb\\.product,mydb\\.order

# 输出到 MQ（推荐）
canal.mq.servers=kafka:9092
canal.mq.topic=canal-topic
```

### Canal Client 同步到 ES

```java
@KafkaListener(topics = "canal-topic")
public void handleCanalMessage(CanalMessage message) {
    String tableName = message.getTable();
    CanalEntry.EventType eventType = message.getType();
    
    switch (eventType) {
        case INSERT:
        case UPDATE:
            // 从 MySQL 读取完整数据（Canal 只有变更字段）
            Product product = productMapper.selectById(message.getId());
            // 写入/更新 ES
            elasticsearchTemplate.save(product);
            break;
        case DELETE:
            // 从 ES 删除
            elasticsearchTemplate.delete(message.getIndex(), message.getId());
            break;
    }
}
```

::: tip 为什么 INSERT/UPDATE 需要回查 MySQL
Canal Binlog（ROW 格式）只包含变更的字段，不包含完整的行数据。如果 ES 索引需要完整数据，需要回查 MySQL。也可以在 MySQL 中配置 Binlog 包含完整行数据（但会增大 Binlog 体积）。
:::

## 数据一致性保障

### 一致性问题来源

```
MySQL 更新 → Binlog 产生 → Canal 消费 → 写入 ES
    │              │            │           │
    └── T1 ────────┴── T2 ──────┴── T3 ────┴── T4
```

T1 到 T4 之间存在延迟窗口，在这个窗口内 MySQL 和 ES 数据不一致。

### 一致性方案

#### 1. 最终一致性（推荐）

接受短暂不一致，通过补偿机制保证最终一致：

```java
// 定时任务：对比 MySQL 和 ES 数据
@Scheduled(cron = "0 0 2 * * ?")
public void dataConsistencyCheck() {
    List<Long> mysqlIds = productMapper.selectAllIds();
    List<Long> esIds = elasticsearchTemplate.getAllIds();
    
    // 找出差异
    Set<Long> diff = symmetricDifference(mysqlIds, esIds);
    for (Long id : diff) {
        Product product = productMapper.selectById(id);
        if (product != null) {
            elasticsearchTemplate.save(product);
        } else {
            elasticsearchTemplate.delete(id);
        }
    }
}
```

#### 2. 版本号对比

每次写入时携带版本号（MySQL 的 `updated_at` 或自增版本号），ES 用版本号判断是否需要更新：

```java
// Canal 消费处理
if (message.getUpdatedAt() > esDocument.getUpdatedAt()) {
    elasticsearchTemplate.save(product);
} else {
    // ES 版本更新，跳过（可能的乱序场景）
}
```

#### 3. 双写 + Binlog 补偿

```
应用写入 MySQL ──→ 异步写入 ES（可能失败）
MySQL Binlog ──→ Canal ──→ 补偿写入 ES（兜底）
```

双写处理实时同步，Canal 处理补偿。两者配合保证最终一致性。

## 读写分离策略

### 策略选择

| 读操作 | 数据源 | 原因 |
|--------|--------|------|
| 全文搜索 | ES | ES 擅长全文检索 |
| 精确查询（按 ID） | MySQL | 直接走主键，延迟最低 |
| 聚合统计 | ES | ES 聚合能力强大 |
| 事务读取 | MySQL | ES 数据可能有延迟 |
| 列表分页 | 视场景 | 需要全文搜索用 ES，其他用 MySQL |

### 实际示例

```java
@Service
public class ProductService {
    
    // 搜索用 ES
    public Page<Product> search(String keyword, int page, int size) {
        return elasticsearchTemplate.search(keyword, page, size);
    }
    
    // 按 ID 获取用 MySQL（确保一致性）
    public Product getById(Long id) {
        return productMapper.selectById(id);
    }
    
    // 聚合用 ES
    public Map<String, Long> aggregateByCategory() {
        return elasticsearchTemplate.termsAggregation("category");
    }
}
```

::: tip 一致性读取策略
对于对一致性要求极高的操作（如支付后立即查询订单状态），可以：
1. 强制从 MySQL 读取。
2. 在 ES 写入成功后返回（`refresh=wait_for`）。
3. 在应用层标记"写入中"状态，引导用户稍后查看。
:::
