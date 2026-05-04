# 副本集

MongoDB 副本集（Replica Set）是一组维护相同数据集的 mongod 进程，提供数据冗余和高可用性。理解副本集的选举机制、Oplog 同步和读写关注配置，是生产部署的基础。

<MongoReplicaSetDemo />

## 架构概述

副本集由多个节点组成，最少 3 个节点（推荐奇数个）：

- **Primary**：接收所有写操作，将操作记录写入 Oplog
- **Secondary**：异步拉取 Primary 的 Oplog 并重放，保持数据同步
- **Arbiter**（仲裁者）：不存储数据，只参与投票，用于凑奇数

```
          ┌──────────┐
          │  Client   │
          └────┬─────┘
               │
        ┌──────┴──────┐
        │   Primary    │ ← 写入
        └──────┬──────┘
      Oplog    │    Oplog
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Secondary│ │Secondary│ │Arbiter │
│ (同步)  │ │ (同步)  │ │(只投票)│
└────────┘ └────────┘ └────────┘
```

## 部署副本集

### 配置文件

```yaml
# mongod-rs.conf
storage:
  dbPath: /data/rs0
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1

systemLog:
  destination: file
  path: /var/log/mongodb/mongod-rs.log
  logAppend: true

net:
  port: 27017
  bindIp: 0.0.0.0

replication:
  replSetName: "rs0"

security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile    # 副本集节点间认证
```

```bash
# 生成 keyfile
openssl rand -base64 756 > /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
chown mongodb:mongodb /etc/mongodb/keyfile
```

### 初始化副本集

```javascript
// 连接到其中一个节点
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },     // 优先选为主
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 }
  ]
})

// 查看副本集状态
rs.status()

// 查看配置
rs.conf()
```

### Docker Compose 快速部署

```yaml
version: '3.8'
services:
  mongo1:
    image: mongo:7.0
    container_name: mongo1
    command: mongod --replSet rs0 --bind_ip_all --keyFile /etc/mongodb/keyfile
    ports: ["27017:27017"]
    volumes:
      - rs0_data1:/data/db
      - ./keyfile:/etc/mongodb/keyfile:ro

  mongo2:
    image: mongo:7.0
    container_name: mongo2
    command: mongod --replSet rs0 --bind_ip_all --keyFile /etc/mongodb/keyfile
    ports: ["27018:27017"]
    volumes:
      - rs0_data2:/data/db
      - ./keyfile:/etc/mongodb/keyfile:ro

  mongo3:
    image: mongo:7.0
    container_name: mongo3
    command: mongod --replSet rs0 --bind_ip_all --keyFile /etc/mongodb/keyfile
    ports: ["27019:27017"]
    volumes:
      - rs0_data3:/data/db
      - ./keyfile:/etc/mongodb/keyfile:ro

volumes:
  rs0_data1:
  rs0_data2:
  rs0_data3:
```

## Raft 选举

MongoDB 副本集使用类似 Raft 的共识协议进行选举。每个节点有一票，选举需要多数票（> N/2）才能胜出。

### 选举触发条件

1. 副本集初始化时
2. Secondary 与 Primary 心跳超时（默认 10 秒）
3. Primary 不可达（网络分区、进程崩溃）
4. 优先级更高的节点加入副本集
5. 人工执行 `rs.stepDown()`

### 选举过程

```
Secondary 检测到 Primary 无响应（electionTimeout = 10s）
  ↓
节点将自身状态转为 Candidate
  ↓
自增 Term（选举轮次），投票给自己
  ↓
向其他节点发送 RequestVote 请求
  ↓
获得多数票 → 成为新 Primary
  ↓
其他节点降为 Secondary
```

### 节点角色配置

```javascript
// Priority：选举优先级（0-1000，默认 1，0 表示不能成为 Primary）
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 10 },    // 优先成为 Primary
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 },
    { _id: 3, host: "mongo4:27017", priority: 0 },     // 永远不会成为 Primary
    { _id: 4, host: "mongo5:27017", arbiterOnly: true } // Arbiter
  ]
})

// Hidden：隐藏节点（不接收客户端读请求，用于备份/分析）
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 1 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 0, hidden: true }
  ]
})

// Votes：投票权重（默认 1，最多 7 个投票节点）
rs.reconfig({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", votes: 1 },
    { _id: 1, host: "mongo2:27017", votes: 1 },
    { _id: 2, host: "mongo3:27017", votes: 1 },
    { _id: 3, host: "mongo4:27017", votes: 0 }   // 不投票（第 4+ 节点）
  ]
})
```

::: warning 节点数量与多数派
- 3 节点：容忍 1 个故障
- 5 节点：容忍 2 个故障
- 7 节点：容忍 3 个故障
- Arbiter 不存储数据，不建议大量使用（可用 1 个 Arbiter 凑奇数）
:::

## Oplog 与同步

Oplog（Operation Log）是一个特殊的 capped collection，记录所有数据变更操作。

### Oplog 结构

```javascript
// Oplog 记录示例
{
  ts: Timestamp(1625000000, 1),    // 操作时间戳
  t: Long(5),                     // Term（选举轮次）
  h: Long(1234567890),            // 操作哈希
  op: "u",                        // 操作类型：i(插入), u(更新), d(删除), c(命令)
  ns: "myapp.users",              // 命名空间
  o: { $set: { age: 29 } },       // 操作内容
  o2: { _id: ObjectId("...") }    // 更新条件（u 操作专用）
}
```

### Oplog 同步流程

```
Primary 执行写操作
  ↓
写入 Oplog（local.oplog.rs）
  ↓
Secondary 通过长轮询（long polling）拉取 Oplog
  ↓
按时间戳顺序重放操作
  ↓
更新自身的 appliedThrough 时间戳
```

### Oplog 大小配置

```javascript
// 查看当前 Oplog 大小
db.oplog.rs.stats().maxSize
db.printReplicationInfo()

// 修改 Oplog 大小（需要在每个节点执行）
db.adminCommand({ replSetResizeOplog: 1, size: 2048 })  // 2GB
```

::: tip Oplog 大小规划
Oplog 大小决定了 Secondary 能"落后"多久。如果 Secondary 离线时间超过了 Oplog 覆盖窗口，就需要做全量同步（initial sync）。生产环境建议至少 2-10GB，根据写入速率调整。可以通过 `db.printReplicationInfo()` 查看 Oplog 覆盖的时间范围。
:::

### 同步方式

- **Initial Sync**：全量同步（首次加入或 Oplog 丢失时触发），从 Primary 复制所有数据
- **Steady-State Replication**：增量同步，持续拉取 Oplog
- **Rollback**：当旧 Primary 重新加入时，发现自己的 Oplog 有分叉，需要回滚未被多数节点确认的操作

## Rollback 场景

当发生网络分区时，可能出现 Rollback：

```
时间线：
Primary A (term 1) ──── 写入 op1, op2, op3
  │ 网络分区
  │
Secondary B (term 2) ── 选举为新 Primary，写入 op4
  │ 网络恢复
  │
旧 Primary A 重新加入：
  - 发现 term 2 > term 1
  - op2, op3 未被其他节点复制（没有多数派确认）
  - 回滚 op2, op3 到 rollback/ 目录
  - 同步新 Primary 的 Oplog
```

::: warning Rollback 的代价
回滚的数据不会自动丢失，而是保存在 `rollback/` 目录中。运维人员需要人工决定是否恢复这些数据。这就是为什么生产环境必须使用 `w:majority` 写关注——多数派确认的写入永远不会被 Rollback。
:::

## 读偏好（Read Preference）

读偏好控制客户端从哪个节点读取数据：

```javascript
// 通过连接字符串设置
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myapp?readPreference=secondaryPreferred

// 通过驱动 API 设置
db.collection.find().readPref("secondary")

// 可选值
// primary            — 只从 Primary 读（默认，强一致）
// primaryPreferred   — Primary 可用时从 Primary 读，否则从 Secondary 读
// secondary          — 只从 Secondary 读
// secondaryPreferred — Secondary 可用时从 Secondary 读，否则从 Primary 读
// nearest            — 从延迟最低的节点读
```

| 读偏好 | 一致性 | 延迟 | 适用场景 |
|--------|--------|------|---------|
| primary | 强一致 | 可能高（Primary 压力大） | 金融、订单 |
| primaryPreferred | 近强一致 | 一般 | 默认推荐 |
| secondary | 最终一致 | 低（分流读压力） | 报表、分析 |
| secondaryPreferred | 最终一致 | 低 | CMS、内容展示 |
| nearest | 不保证 | 最低 | 地理分布、CDN |

::: warning 读偏好与数据一致性
从 Secondary 读取可能读到旧数据（Oplog 延迟）。如果业务不能容忍读到旧数据，必须使用 `primary` 读偏好。使用 `secondary` 读偏好时，应配合 `readConcern: "majority"` 来保证至少读到多数派确认的数据。
:::
