# 事务

MongoDB 从 4.0 版本开始支持多文档事务，4.2 版本扩展到分片集群。但事务在 MongoDB 中不是首选方案——它有性能开销，文档模型的设计目标之一就是通过嵌入避免事务。

## 多文档事务

### 基本用法

```javascript
const session = db.getMongo().startSession()
const orders = session.getDatabase("myapp").orders
const inventory = session.getDatabase("myapp").inventory

try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" }
  })

  // 扣减库存
  inventory.updateOne(
    { _id: "product_123", stock: { $gte: 1 } },
    { $inc: { stock: -1 } }
  )

  // 创建订单
  orders.insertOne({
    userId: "user_456",
    productId: "product_123",
    quantity: 1,
    status: "pending"
  })

  session.commitTransaction()
} catch (error) {
  session.abortTransaction()
  throw error
} finally {
  session.endSession()
}
```

### 驱动中的事务（Node.js 示例）

```javascript
const { MongoClient } = require('mongodb')

async function transferOrder(client, orderData) {
  const session = client.startSession()
  try {
    session.startTransaction()

    const orders = client.db('myapp').collection('orders')
    const inventory = client.db('myapp').collection('inventory')

    // 检查库存
    const product = await inventory.findOne(
      { _id: orderData.productId },
      { session }
    )

    if (product.stock < orderData.quantity) {
      throw new Error('库存不足')
    }

    // 扣减库存
    await inventory.updateOne(
      { _id: orderData.productId },
      { $inc: { stock: -orderData.quantity } },
      { session }
    )

    // 创建订单
    await orders.insertOne(orderData, { session })

    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    await session.endSession()
  }
}
```

## ReadConcern 级别

ReadConcern 控制读取操作的数据可见性：

| ReadConcern | 含义 | 一致性 | 性能 |
|-------------|------|--------|------|
| `local` | 读取节点最新数据 | 可能读到回滚数据 | 最高 |
| `available` | 同 local（分片集群中更宽松） | 最弱 | 最高 |
| `majority` | 读取多数派确认的快照 | 读不到未确认数据 | 高 |
| `snapshot` | 事务开始时的一致快照 | 强一致 | 中等 |
| `linearizable` | 读取最新确认的数据（需 w:majority） | 最强 | 最低 |

```javascript
// 读取已提交的数据
db.users.find().readConcern("majority")

// 事务中的快照读
session.startTransaction({ readConcern: { level: "snapshot" } })

// 线性化读（必须针对单个文档，且 find 后排序或 _id 查询）
db.users.find({ _id: ObjectId("...") }).readConcern("linearizable")
```

## WriteConcern 与事务

事务中的写关注在 `startTransaction` 时设置，而非每个操作单独设置：

```javascript
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority", wtimeout: 5000 }
})
```

::: tip 事务中的 WriteConcern
事务使用 `w: "majority"` 是必须的。如果事务只用 `w: 1`，当 Primary 在提交后立即崩溃且 Secondary 未同步到事务提交记录时，数据会丢失且状态不一致。
:::

## 事务限制

### 时间限制

```javascript
// 默认事务超时 60 秒
session.startTransaction({
  maxCommitTimeMS: 30000   // 30 秒提交超时
})
```

### 操作数量限制

- 单个事务最多包含 1000 个操作（MongoDB 5.0+）
- 事务中操作的文档总大小不超过 16MB

### Oplog 大小限制

事务的所有操作在提交时一次性写入 Oplog。如果事务很大，可能产生巨大的 Oplog 条目。

```javascript
// 事务中的操作在提交前对外不可见
// 其他会话（使用 readConcern: "local"）也看不到未提交的事务
```

## Snapshot ReadConcern

`readConcern: "snapshot"` 提供事务开始时刻的一致快照：

```javascript
session.startTransaction({
  readConcern: { level: "snapshot" }
})

// 在事务内读取的数据是事务开始时刻的快照
// 即使其他事务在此期间修改了数据，当前事务也看不到
const user = await users.findOne({ _id: "u1" }, { session })
const orders = await orders.find({ userId: "u1" }, { session }).toArray()

// user 和 orders 的数据是同一时间点的
```

## 事务的 MVCC 实现

MongoDB 的事务基于 WiredTiger 的 MVCC（多版本并发控制）机制：

```
WiredTiger 维护全局的"活跃事务快照"
  ↓
每个事务启动时记录当前活跃事务列表
  ↓
事务只能看到：
  - 事务启动前已提交的修改
  - 自身的修改
  ↓
看不到：
  - 事务启动时仍在运行的其他事务的修改
  - 事务启动后才开始的事务的修改
```

WiredTiger 在磁盘上保存多个版本的文档，通过 Write-ahead Log（WAL）保证崩溃恢复。

## 最佳实践

### 尽量避免事务

MongoDB 的文档模型天然适合单文档原子操作。大多数场景通过嵌入文档可以避免事务：

```javascript
// 不好：两个集合，需要事务
// users 集合：{ _id: "u1", name: "张三" }
// addresses 集合：{ userId: "u1", city: "北京" }

// 好：嵌入文档，单文档原子操作
db.users.insertOne({
  _id: "u1",
  name: "张三",
  address: { city: "北京", street: "中关村大街1号" }
})
```

### 必须使用事务时的规范

```javascript
// 1. 保持事务尽可能短小
//    将非事务操作移到事务外面
const product = await inventory.findOne({ _id: "p1" })  // 事务外读取
if (product.stock < 1) throw new Error('库存不足')

session.startTransaction()
// 事务内只做写操作
await inventory.updateOne({ _id: "p1" }, { $inc: { stock: -1 } }, { session })
await orders.insertOne(orderData, { session })
await session.commitTransaction()

// 2. 在事务开始前获取 Session
//    不要在循环中创建新事务

// 3. 使用 retryable writes
//    连接字符串加 retryWrites=true，网络抖动时自动重试

// 4. 设置合理的超时
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority", wtimeout: 5000 },
  maxCommitTimeMS: 10000
})
```

::: warning 事务与索引
事务中涉及的查询也应命中索引。事务内的 COLLSCAN 会持有更长时间的锁（MVCC 快照），增加与其他事务冲突的概率。如果一个事务做了大量无索引的查询，可能阻塞整个集合的写入。
:::
