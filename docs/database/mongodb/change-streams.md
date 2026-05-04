# Change Streams

Change Streams 是 MongoDB 3.6 引入的实时数据变更监听机制。它基于 Oplog，为应用提供了一种低延迟、可靠的方式来响应数据变更事件。

## 工作原理

```
应用订阅 Change Stream
  ↓
MongoDB 在 Oplog 上建立 Watcher
  ↓
Oplog 中出现匹配的变更操作
  ↓
MongoDB 按通知顺序（Notification Order）推送给客户端
  ↓
客户端处理事件
```

Change Streams 与直接读 Oplog 的区别：

| 特性 | Change Streams | 直接读 Oplog |
|------|---------------|-------------|
| API 友好度 | 高（驱动原生支持） | 低（需解析 Oplog 格式） |
| 排序保证 | 跨 Shard 有序 | 仅单 Shard 有序 |
| 安全性 | 受 RBAC 权限控制 | 需要 local 数据库权限 |
| 投影 | 支持 | 不支持 |
| 恢复 | 支持 Resume Token | 需要手动记录时间戳 |

## 基本用法

### Node.js 示例

```javascript
const { MongoClient } = require('mongodb')

async function watchCollection() {
  const client = new MongoClient('mongodb://localhost:27017')
  await client.connect()

  const collection = client.db('myapp').collection('orders')

  // 打开 Change Stream
  const changeStream = collection.watch()

  // 监听变更事件
  changeStream.on('change', (change) => {
    console.log('变更类型:', change.operationType)
    console.log('完整文档:', change.fullDocument)
    console.log('Resume Token:', change._id)
  })

  // 优雅关闭
  process.on('SIGINT', async () => {
    await changeStream.close()
    await client.close()
    process.exit(0)
  })
}
```

### mongosh 示例

```javascript
// 监听整个集合
const cursor = db.orders.watch()

// 一直等待直到有变更
while (!cursor.isExhausted()) {
  if (cursor.hasNext()) {
    printjson(cursor.next())
  }
}
```

## 变更事件类型

```javascript
const changeStream = collection.watch()

changeStream.on('change', (change) => {
  switch (change.operationType) {
    case 'insert':
      console.log('新增文档:', change.fullDocument)
      break
    case 'update':
      console.log('更新字段:', change.updateDescription.updatedFields)
      console.log('删除字段:', change.updateDescription.removedFields)
      console.log('更新后文档:', change.fullDocument)  // 需要配置
      break
    case 'replace':
      console.log('替换文档:', change.fullDocument)
      break
    case 'delete':
      console.log('删除文档 ID:', change.documentKey._id)
      // delete 事件没有 fullDocument
      break
    case 'drop':
      console.log('集合被删除')
      break
    case 'dropDatabase':
      console.log('数据库被删除')
      break
    case 'invalidate':
      console.log('Change Stream 失效（集合重命名/删除）')
      break
  }
})
```

## Watch Pipeline

可以在 `watch()` 中传入聚合管道，过滤和转换变更事件：

```javascript
// 只监听插入和更新事件
const changeStream = collection.watch([
  { $match: { operationType: { $in: ['insert', 'update'] } } }
])

// 只监听特定字段的变更
const changeStream = collection.watch([
  {
    $match: {
      $or: [
        { 'updateDescription.updatedFields.status': { $exists: true } },
        { operationType: 'insert' }
      ]
    }
  }
])

// 只监听满足条件的文档
const changeStream = collection.watch([
  {
    $match: {
      'fullDocument.status': 'completed',
      operationType: { $in: ['insert', 'update'] }
    }
  }
])

// 投影需要的字段
const changeStream = collection.watch([
  { $match: { operationType: 'insert' } },
  {
    $project: {
      operationType: 1,
      'fullDocument.userId': 1,
      'fullDocument.totalPrice': 1,
      'fullDocument.createdAt': 1
    }
  }
])
```

::: tip Change Stream 过滤的性能
`watch()` 中的 `$match` 阶段在 MongoDB 服务端执行，不是客户端过滤。这意味着只有匹配的事件才会发送到客户端，减少网络传输。尽量使用 `$match` 而非客户端过滤。
:::

## Resume Token

Resume Token 是 Change Stream 的断点续传机制。如果应用崩溃或网络断开，可以用 Resume Token 从断点处继续监听，不丢失事件。

```javascript
const { MongoClient, Timestamp } = require('mongodb')

let resumeToken = null

async function watchWithResume() {
  const client = new MongoClient('mongodb://localhost:27017')
  await client.connect()
  const collection = client.db('myapp').collection('orders')

  const options = {}
  if (resumeToken) {
    options.resumeAfter = resumeToken    // 从断点继续
  }

  const changeStream = collection.watch([], options)

  try {
    for await (const change of changeStream) {
      // 保存最新的 Resume Token
      resumeToken = change._id

      // 处理变更...
      await processChange(change)

      // 持久化 Token（写入数据库或文件）
      await saveResumeToken(resumeToken)
    }
  } catch (error) {
    console.error('Change Stream 错误:', error)
    // 可以用 resumeToken 重新连接
  } finally {
    await changeStream.close()
    await client.close()
  }
}
```

### 恢复选项

```javascript
// 从指定 Resume Token 恢复
const stream = collection.watch([], { resumeAfter: token })

// 从指定时间点恢复（MongoDB 4.2+）
const stream = collection.watch([], {
  startAtOperationTime: Timestamp(1625000000, 1)
})

// 从指定时间恢复（MongoDB 6.0+）
const stream = collection.watch([], {
  startAfter: token   // 与 resumeAfter 类似，但在 invalidate 事件后更灵活
})
```

## 与 Kafka Connect 集成

Kafka Connect MongoDB Source Connector 可以将 Change Stream 事件推送到 Kafka Topic，实现 CDC（Change Data Capture）：

```json
{
  "name": "mongodb-source-connector",
  "config": {
    "connector.class": "com.mongodb.kafka.connect.MongoSourceConnector",
    "connection.uri": "mongodb://admin:secret@localhost:27017",
    "database": "myapp",
    "collection": "orders",
    "pipeline": "[{\"$match\":{\"operationType\":{\"$in\":[\"insert\",\"update\"]}}}]",
    "copy.existing": true,
    "topic.prefix": "mongodb",
    "output.format.key": "json",
    "output.format.value": "json",
    "change.stream.full.document": "updateLookup"
  }
}
```

Kafka 端的 Topic 名为 `mongodb.myapp.orders`。

## 实时数据同步方案

### 方案 1：MongoDB → MongoDB（跨集群同步）

```javascript
// 源集群的 Change Stream
const sourceStream = sourceCollection.watch([], {
  fullDocument: 'updateLookup'
})

for await (const change of sourceStream) {
  const targetCollection = targetDb.collection(change.ns.coll)

  switch (change.operationType) {
    case 'insert':
      await targetCollection.replaceOne(
        { _id: change.documentKey._id },
        change.fullDocument,
        { upsert: true }
      )
      break
    case 'update':
      await targetCollection.updateOne(
        { _id: change.documentKey._id },
        { $set: change.updateDescription.updatedFields },
        { upsert: true }
      )
      break
    case 'delete':
      await targetCollection.deleteOne({ _id: change.documentKey._id })
      break
  }
}
```

### 方案 2：MongoDB → Elasticsearch（搜索同步）

```javascript
const { Client } = require('@elastic/elasticsearch')
const esClient = new Client({ node: 'http://localhost:9200' })

const changeStream = collection.watch([
  { $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }
], { fullDocument: 'updateLookup' })

for await (const change of changeStream) {
  await esClient.index({
    index: 'orders',
    id: change.documentKey._id.toString(),
    document: {
      ...change.fullDocument,
      _id: undefined  // ES 用 id 字段
    }
  })
}
```

### 方案 3：MongoDB → Redis（缓存失效）

```javascript
const Redis = require('ioredis')
const redis = new Redis()

const changeStream = collection.watch([], { fullDocument: 'updateLookup' })

for await (const change of changeStream) {
  const key = `order:${change.documentKey._id}`

  switch (change.operationType) {
    case 'insert':
    case 'update':
    case 'replace':
      await redis.set(key, JSON.stringify(change.fullDocument), 'EX', 3600)
      break
    case 'delete':
      await redis.del(key)
      break
  }
}
```

::: warning Change Streams 注意事项
1. 需要副本集或分片集群（单节点不支持 Change Streams）
2. Oplog 被覆盖后，Resume Token 失效，需要重新初始化
3. `delete` 事件不包含 `fullDocument`
4. 分片集群中，Change Stream 保证跨 Shard 的全局排序（基于 Cluster Time）
5. 长时间运行的 Change Stream 要处理 `invalidate` 事件（集合重命名/删除）
:::
