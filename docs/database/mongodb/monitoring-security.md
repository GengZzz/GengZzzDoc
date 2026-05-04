# 监控与安全

生产环境的 MongoDB 需要持续监控关键指标并实施纵深防御的安全策略。本节覆盖核心监控指标、Profiler 慢查询分析、以及认证授权加密等安全实践。

## 关键监控指标

### 核心指标

```javascript
// 服务器状态
db.serverStatus()

// 关注以下指标：

// 1. 操作计数（ops）
db.serverStatus().opcounters
// { insert: 150000, query: 500000, update: 80000, delete: 5000 }

// 2. 连接数
db.serverStatus().connections
// { current: 150, available: 19850, totalCreated: 320, rejected: 0 }
// available 接近 0 时告警

// 3. 内存使用
db.serverStatus().wiredTiger.cache
// { "bytes currently in the cache": 2147483648,
//   "maximum bytes configured": 4294967296,
//   "pages evicted": 1500 }
// 使用率超过 80% 需要关注

// 4. 锁信息
db.serverStatus().locks
// Global、Database、Collection 级别的锁等待时间

// 5. 复制延迟
rs.printSecondaryReplicationInfo()
// syncedTo: Timestamp(1625000000, 1)
// replication lag: 2 seconds
// 延迟 > 10 秒需要告警
```

### 副本集指标

```javascript
// 副本集状态
rs.status()

// 关注字段：
// myState: 1 (Primary), 2 (Secondary)
// health: 1 (健康), 0 (故障)
// optimeDate: 最后同步时间
// pingMs: 心跳延迟

// 复制延迟
db.printSecondaryReplicationInfo()
db.printReplicationInfo()   // Oplog 信息
```

### 分片集群指标

```javascript
// Balancer 状态
sh.getBalancerState()
sh.status()   // Chunk 分布

// 各 Shard 负载
use config
db.chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])
```

## Profiler

MongoDB 的 Profiler 记录慢查询和所有操作，是排查性能问题的核心工具。

### 配置 Profiler

```javascript
// 级别 0：关闭 Profiler
db.setProfilingLevel(0)

// 级别 1：只记录慢查询
db.setProfilingLevel(1, { slowms: 100 })    // 超过 100ms

// 级别 2：记录所有操作（生产环境慎用）
db.setProfilingLevel(2)

// 采样率（MongoDB 4.4+，减少开销）
db.setProfilingLevel(1, { slowms: 100, sampleRate: 0.1 })  // 10% 采样
```

### 查询 Profiler 数据

```javascript
// 查看最近的慢查询
db.system.profile.find().sort({ ts: -1 }).limit(20)

// 筛选慢查询详情
db.system.profile.find({
  op: "query",
  millis: { $gt: 500 }
}).sort({ millis: -1 })

// 查看 Profiler 中的字段
// op: 操作类型 (query, insert, update, delete, command)
// ns: 命名空间
// millis: 执行时间
// docsExamined: 扫描文档数
// nreturned: 返回文档数
// planSummary: COLLSCAN / IXSCAN / IDHACK
// query: 查询语句
// keysExamined: 扫描索引键数
```

### 慢查询分析实战

```javascript
// 找出扫描文档远多于返回文档的查询
db.system.profile.find({
  op: "query",
  millis: { $gt: 100 }
}).forEach(function(doc) {
  const ratio = doc.docsExamined / doc.nreturned
  if (ratio > 10) {
    print(`集合: ${doc.ns}, 耗时: ${doc.millis}ms, 扫描/返回: ${ratio.toFixed(1)}x`)
    print(`查询: ${JSON.stringify(doc.query)}`)
    print(`计划: ${doc.planSummary}`)
    print("---")
  }
})
```

## Atlas 监控（云服务）

MongoDB Atlas 提供内置的监控仪表盘：

- **Real-time Performance Panel**：实时操作延迟和吞吐量
- **Performance Advisor**：自动推荐索引
- **Query Profiler**：可视化慢查询分布
- **Alerts**：自定义告警规则

免费的自建集群可以使用以下开源监控方案：

```bash
# MongoDB Exporter for Prometheus
mongodb_exporter --mongodb.uri=mongodb://localhost:27017

# 关键告警规则示例
# - connections_current > available 的 80%
# - replication_lag > 10 秒
# - wiredTiger_cache_used > cache_max 的 80%
# - opcounters 插入/查询突增
```

## 认证

### 开启认证

```yaml
# mongod.conf
security:
  authorization: enabled
```

### 用户管理

```javascript
// 创建管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "strong_password_here",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})

// 创建应用用户（最小权限）
use myapp
db.createUser({
  user: "app_user",
  pwd: "app_password",
  roles: [
    { role: "readWrite", db: "myapp" },
    { role: "read", db: "analytics" }
  ]
})

// 创建只读用户
db.createUser({
  user: "readonly_user",
  pwd: "readonly_password",
  roles: [{ role: "read", db: "myapp" }]
})
```

### 内置角色

| 角色 | 权限 |
|------|------|
| `read` | 读取指定数据库的所有非系统集合 |
| `readWrite` | 读写指定数据库 |
| `dbAdmin` | 数据库管理（索引、统计、验证等） |
| `userAdmin` | 用户和角色管理 |
| `clusterAdmin` | 集群管理（副本集、分片） |
| `root` | 超级管理员（所有权限） |

::: warning 最小权限原则
- 应用账户只授予 `readWrite` 到业务数据库
- 不要给应用账户 `root` 或 `clusterAdmin`
- 运维操作使用独立的运维账户
- 定期审计 `db.getUsers()` 和 `db.getRoles()`
:::

## 授权

### 自定义角色

```javascript
// 创建自定义角色（只能操作 orders 集合）
use myapp
db.createRole({
  role: "orderManager",
  privileges: [
    {
      resource: { db: "myapp", collection: "orders" },
      actions: ["find", "insert", "update"]
    },
    {
      resource: { db: "myapp", collection: "order_logs" },
      actions: ["insert"]  // 只能写日志
    }
  ],
  roles: []
})
```

## 加密

### 传输加密（TLS/SSL）

```yaml
# mongod.conf
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/ssl/mongodb.pem
    CAFile: /etc/mongodb/ssl/ca.pem
```

```bash
# 连接时指定 TLS
mongosh --tls --tlsCAFile /etc/mongodb/ssl/ca.pem \
  --tlsCertificateKeyFile /etc/mongodb/ssl/client.pem
```

### 静态加密（Encryption at Rest）

MongoDB Enterprise 支持 WiredTiger 加密：

```yaml
security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/encryption-keyfile
  encryptionCipherMode: AES256-CBC
```

使用 AWS KMS、Azure Key Vault 或 Google Cloud KMS 管理加密密钥更安全。

### 审计日志

```yaml
# MongoDB Enterprise
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ "atype": { "$in": ["authenticate", "authCheck", "createUser", "dropUser"] } }'
```

```javascript
// 记录特定操作的审计
db.adminCommand({
  auditFilter: {
    atype: "authCheck",
    "param.command": { $in: ["drop", "dropDatabase"] }
  }
})
```

::: tip 安全检查清单
1. 开启认证（`security.authorization: enabled`）
2. 绑定内网 IP（`net.bindIp` 不要设为 `0.0.0.0`）
3. 启用 TLS 传输加密
4. 应用使用最小权限账户
5. 禁用不必要的接口（如 HTTP Status Page：`net.http.enabled: false`）
6. 定期更新 MongoDB 版本（安全补丁）
7. 配置审计日志（Enterprise 版本）
8. KeyFile 保护副本集内部通信
9. 使用 `--noscripting` 禁用服务端 JavaScript（不需要 $where 时）
:::
