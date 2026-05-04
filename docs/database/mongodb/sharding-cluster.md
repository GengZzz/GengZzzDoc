# 分片集群

当单个副本集的数据量或写入吞吐量达到瓶颈时，需要通过分片（Sharding）将数据分布到多个副本集上。分片是 MongoDB 水平扩展的核心机制。

<MongoShardingDemo />

## 架构概述

分片集群由三个组件组成：

```
┌─────────────────────────────────────────┐
│              Application                 │
│          (MongoDB Driver)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          mongos (路由层)                  │
│     路由请求到正确的 Shard               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Config Server (配置服务器)           │
│  存储集群元数据：Chunk 分布、Shard Key    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Shard1 │ │ Shard2 │ │ Shard3 │
│(副本集) │ │(副本集) │ │(副本集) │
└────────┘ └────────┘ └────────┘
```

- **mongos**：无状态的路由进程，客户端连接 mongos 而非直接连接 Shard
- **Config Server**：存储分片元数据（每个 Shard 负责哪些 Chunk），通常部署为 3 节点副本集
- **Shard**：存储实际数据的副本集

## 启用分片

```javascript
// 1. 启动 Config Server（3 节点副本集）
mongod --configsvr --replSet configRS --port 27019 --dbpath /data/config

// 2. 初始化 Config Server 副本集
rs.initiate({
  _id: "configRS",
  configsvr: true,
  members: [
    { _id: 0, host: "cfg1:27019" },
    { _id: 1, host: "cfg2:27019" },
    { _id: 2, host: "cfg3:27019" }
  ]
})

// 3. 启动 mongos（连接 Config Server）
mongos --configdb configRS/cfg1:27019,cfg2:27019,cfg3:27019 --port 27017

// 4. 通过 mongos 添加 Shard
sh.addShard("shardRS1/shard1a:27018,shard1b:27018")
sh.addShard("shardRS2/shard2a:27018,shard2b:27018")
sh.addShard("shardRS3/shard3a:27018,shard3b:27018")

// 5. 对数据库启用分片
sh.enableSharding("myapp")

// 6. 对集合启用分片（指定 Shard Key）
sh.shardCollection("myapp.orders", { userId: 1 })
```

## Shard Key 选择

Shard Key 是分片集群最关键的设计决策。一旦选定，几乎不可能更改（需要停机重建集合）。

### Range Sharding

按 Shard Key 的值范围分配数据：

```javascript
sh.shardCollection("myapp.orders", { createdAt: 1 })

// Chunk 分布示例：
// Shard1: createdAt < 2024-01-01
// Shard2: 2024-01-01 <= createdAt < 2024-07-01
// Shard3: createdAt >= 2024-07-01
```

**优点：** 范围查询高效（请求只发送到相关 Shard）。

**缺点：** 写入可能集中在单个范围（如最新时间戳全部写入最后一个 Shard），导致热点。

### Hashed Sharding

对 Shard Key 计算哈希值再分配：

```javascript
sh.shardCollection("myapp.users", { _id: "hashed" })

// Hash 分布示例：
// Shard1: hash(_id) 的某个范围
// Shard2: hash(_id) 的另一个范围
// Shard3: ...
```

**优点：** 写入均匀分布，避免热点。

**缺点：** 范围查询需要广播到所有 Shard（哈希值不保序）。

### Shard Key 选择原则

```javascript
// 好的 Shard Key：高基数 + 低频率 + 非单调递增

// ✅ 好：userId（高基数、写入分散）
sh.shardCollection("myapp.orders", { userId: 1 })

// ✅ 好：复合 Shard Key（userId + createdAt）
sh.shardCollection("myapp.orders", { userId: 1, createdAt: 1 })

// ❌ 差：createdAt（单调递增，所有写入集中到最后一个 Shard）
sh.shardCollection("myapp.orders", { createdAt: 1 })

// ❌ 差：status（低基数，只有几个值）
sh.shardCollection("myapp.orders", { status: 1 })

// ✅ 好：_id hashed（均匀分布）
sh.shardCollection("myapp.logs", { _id: "hashed" })
```

| Shard Key 特征 | 好 | 差 |
|---------------|---|---|
| 基数（Cardinality） | 高（百万级不同值） | 低（几个值） |
| 频率（Frequency） | 低（值均匀分布） | 高（某些值集中大量文档） |
| 单调性（Monotonicity） | 非单调 | 单调递增（如时间戳） |

::: warning Shard Key 不可更改
MongoDB 不允许修改已分片集合的 Shard Key。选错 Shard Key 的唯一解决方案是：创建新集合、重新分片、迁移数据、切换应用。这是分片集群最大的运维风险。
:::

## Chunk 分裂与迁移

### Chunk

Chunk 是分片数据的逻辑单元，默认大小 64MB。每个 Chunk 是 Shard Key 值的一个连续范围。

```
Shard1: [MinKey, 100) [100, 200) [200, 300)
Shard2: [300, 400) [400, 500)
Shard3: [500, 600) [600, MaxKey)
```

### 分裂（Split）

当一个 Chunk 的大小超过阈值（默认 64MB）时，mongos 会将它分裂为两个较小的 Chunk：

```javascript
// 查看 Chunk 分布
sh.status()

// 手动分裂（通常不需要）
sh.splitAt("myapp.orders", { userId: "u50000" })

// 预分裂（数据导入前预先创建 Chunk，避免后期频繁分裂）
for (let i = 0; i < 100000; i += 10000) {
  sh.splitAt("myapp.orders", { userId: `user${i}` })
}
```

### Balancer（均衡器）

Balancer 是 mongos 中的后台线程，定期检查各 Shard 的 Chunk 数量。如果最大 Shard 与最小 Shard 的 Chunk 数差超过 2（迁移阈值），Balancer 将 Chunk 从多的 Shard 迁移到少的 Shard。

```
Balancer 检测到不均衡：
Shard1: 10 chunks
Shard2: 6 chunks
Shard3: 4 chunks

迁移过程：
1. mongos 向目标 Shard 发送 moveChunk 命令
2. 目标 Shard 从源 Shard 复制文档
3. 复制期间的增量变更通过 Change Stream 同步
4. 元数据更新（Config Server 记录新的 Chunk 分布）
5. 源 Shard 删除旧 Chunk
```

```javascript
// 查看 Balancer 状态
sh.getBalancerState()

// 停止 Balancer（备份或维护期间）
sh.stopBalancer()

// 启动 Balancer
sh.startBalancer()

// 查看正在迁移的 Chunk
db.adminCommand({ balancerStatus: 1 })
```

## 热点问题

热点是分片集群最常见的性能问题——写入集中到少数 Shard。

### 热点的表现

```javascript
// 查看各 Shard 的写入负载
sh.status(true)   // 显示详细 Chunk 分布

// 监控各 Shard 的 opcounter
db.serverStatus().opcounters
// 如果某个 Shard 的 insert 远高于其他 Shard，就是热点
```

### 热点的解决

```javascript
// 方案 1：使用 Hashed Shard Key
// 不可以对已有集合更改 Shard Key，需要重新建集合
sh.shardCollection("myapp.orders", { _id: "hashed" })

// 方案 2：复合 Shard Key（前缀字段打散）
// 在 userId 前加上随机后缀或哈希前缀
db.orders.insertOne({
  _id: ObjectId(),
  userId: "user12345",
  userIdHash: MD5("user12345").substring(0, 8),  // 哈希前缀
  shardKey: "a3f1:user12345"                      // 组合键
})
sh.shardCollection("myapp.orders", { userIdHash: 1, userId: 1 })

// 方案 3：预分片 + 区域分片（Zone Sharding）
```

## Zone Sharding

Zone Sharding 将数据按区域亲和性分配到特定 Shard，常用于多地域部署：

```javascript
// 定义 Zone
sh.addShardTag("shardRS1", "asia")
sh.addShardTag("shardRS2", "europe")
sh.addShardTag("shardRS3", "america")

// 定义 Zone 的 Shard Key 范围
sh.addTagRange("myapp.users", { region: "asia" }, { region: "asiz" }, "asia")
sh.addTagRange("myapp.users", { region: "europe" }, { region: "europf" }, "europe")
sh.addTagRange("myapp.users", { region: "america" }, { region: "americb" }, "america")

// asia 用户的数据只存储在 Shard1
// europe 用户的数据只存储在 Shard2
// america 用户的数据只存储在 Shard3
```

::: tip Zone Sharding 的应用场景
- 多地域部署：用户数据就近存储，降低读写延迟
- 数据合规：特定地区的数据必须存储在特定区域
- 冷热分离：历史数据迁移到低成本存储 Shard
:::
