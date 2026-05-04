# 文档建模

MongoDB 的 Schema 设计是"无模式"的误解。良好的文档建模需要深入理解业务查询模式，在嵌入与引用之间做出正确的工程权衡。本节介绍常见的建模模式和实战经验。

## Subset Pattern（子集模式）

当一个文档包含大量子文档（如博客文章的评论），但查询时通常只需要最新的一部分时，使用子集模式。

```javascript
// ❌ 全量嵌入：评论越来越多，文档膨胀
{
  _id: ObjectId("post1"),
  title: "MongoDB 建模",
  content: "...",
  comments: [
    { user: "u1", text: "好文", createdAt: ISODate("2024-01-01") },
    // ... 10000 条评论
  ]
}

// ✅ Subset Pattern：文档中只保留最近 N 条，完整评论在独立集合
{
  _id: ObjectId("post1"),
  title: "MongoDB 建模",
  content: "...",
  recentComments: [
    { _id: ObjectId("c9999"), user: "u500", text: "最新评论", createdAt: ISODate("2024-03-15") },
    { _id: ObjectId("c9998"), user: "u320", text: "前一条", createdAt: ISODate("2024-03-14") },
    // ... 最多 10 条
  ],
  commentCount: 10000
}

// 完整评论集合
db.comments.createIndex({ postId: 1, createdAt: -1 })
db.comments.insertOne({
  postId: ObjectId("post1"),
  user: "u500",
  text: "最新评论",
  createdAt: ISODate("2024-03-15")
})
```

读取最新评论：直接从文章文档的 `recentComments` 获取。
读取所有评论：`db.comments.find({ postId: "post1" }).sort({ createdAt: -1 })`。

## Extended Reference Pattern（扩展引用模式）

将频繁查询的关联数据冗余到主文档中，避免 `$lookup`。

```javascript
// ❌ 纯引用：每次查订单都要 $lookup 用户
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),
  items: [{ productId: "p1", quantity: 2 }]
}

// ✅ Extended Reference：订单中冗余用户的常用信息
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),
  userName: "张三",           // 冗余
  userPhone: "13800138000",   // 冗余
  userLevel: "gold",          // 冗余
  items: [{
    productId: "p1",
    productName: "iPhone 15",  // 冗余商品名
    productImage: "url",       // 冗余图片
    price: NumberDecimal("5999"),
    quantity: 2
  }],
  totalPrice: NumberDecimal("11998")
}
```

**权衡：** 冗余数据会带来更新不一致。用户名变了，历史订单中的名字不会自动更新。但对订单场景来说，下单时刻的用户名就是订单的一部分，不一致反而是正确的语义。

::: tip Extended Reference 的适用条件
- 冗余的数据是只读或极少变更的
- 查询频率远高于更新频率
- 冗余的数据量很小（几个字段）
- 数据一致性要求允许短暂或永久不一致
:::

## Bucket Pattern（桶模式）

将高频小文档聚合成桶，减少文档数量和索引开销。

```javascript
// ❌ 每条传感器数据一个文档：数据量爆炸
db.sensor_data.insertOne({
  sensorId: "s001",
  temp: 25.3,
  humidity: 60,
  timestamp: ISODate("2024-01-15T10:00:00")
})
// 100 个传感器 × 每分钟 1 条 × 24 小时 = 144000 条/天

// ✅ Bucket Pattern：每小时一个文档
{
  sensorId: "s001",
  date: ISODate("2024-01-15"),
  hour: 10,
  measurements: [
    { temp: 25.3, humidity: 60, ts: ISODate("2024-01-15T10:00:00") },
    { temp: 25.5, humidity: 59, ts: ISODate("2024-01-15T10:01:00") },
    // ... 60 条
  ],
  count: 60,
  avgTemp: 25.4,
  minTemp: 25.1,
  maxTemp: 25.8
}
// 100 个传感器 × 24 小时 = 2400 条/天（减少 98%）
```

MongoDB 5.0+ 提供了原生的[时间序列集合](https://www.mongodb.com/docs/manual/core/timeseries-collections/)，内部自动使用桶模式：

```javascript
db.createCollection("sensor_data", {
  timeseries: {
    timeField: "timestamp",
    metaField: "sensorId",
    granularity: "minutes"
  }
})
```

## 多态模式（Polymorphic Pattern）

同一集合中存储不同类型的文档，通过字段区分类型：

```javascript
// 支付系统：不同支付方式的结构不同
{
  _id: ObjectId("pay1"),
  type: "alipay",
  orderId: "order1",
  amount: NumberDecimal("99.00"),
  alipayTradeNo: "2024011512345678",
  alipayUserId: "2088xxxx"
}

{
  _id: ObjectId("pay2"),
  type: "wechat",
  orderId: "order2",
  amount: NumberDecimal("199.00"),
  wechatTransactionId: "wx2024011512345678",
  openid: "oUpF8uMuAJ..."
}

{
  _id: ObjectId("pay3"),
  type: "credit_card",
  orderId: "order3",
  amount: NumberDecimal("299.00"),
  cardLast4: "1234",
  cardBrand: "visa"
}
```

查询时通过 `type` 字段过滤：

```javascript
// 所有支付宝支付
db.payments.find({ type: "alipay" })

// 为不同类型创建部分索引
db.payments.createIndex(
  { alipayTradeNo: 1 },
  { partialFilterExpression: { type: "alipay" } }
)
db.payments.createIndex(
  { wechatTransactionId: 1 },
  { partialFilterExpression: { type: "wechat" } }
)
```

## 版本迁移

MongoDB 无固定 Schema，但应用层的 Schema 演进需要策略。

### 添加新字段

最简单——新文档有新字段，旧文档没有。查询时注意处理缺失字段：

```javascript
// 新文档自动包含新字段
db.users.insertOne({ name: "张三", email: "zhang@test.com", phone: "13800138000" })

// 旧文档没有 phone 字段
db.users.find({ phone: { $exists: true } })  // 只查有 phone 的

// 给旧文档批量添加默认值
db.users.updateMany(
  { phone: { $exists: false } },
  { $set: { phone: "" } }
)
```

### 字段重命名

```javascript
// 批量重命名
db.users.updateMany(
  {},
  { $rename: { "fullName": "name" } }
)
```

### 文档版本字段

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: 2,    // Schema 版本号
  name: "张三",
  email: "zhang@test.com",
  phone: "13800138000"  // v2 新增
}

// 应用层读取时根据版本号做兼容处理
function processUser(user) {
  switch (user.schemaVersion || 1) {
    case 1:
      user.phone = ''  // v1 默认值
      user.schemaVersion = 2
      break
    case 2:
      break
  }
  return user
}
```

### 后台迁移任务

对大数据量集合的 Schema 变更，使用后台批量迁移：

```javascript
// 分批迁移（避免长时间阻塞）
const batchSize = 1000
let processed = 0

while (true) {
  const docs = db.users.find({ schemaVersion: { $exists: false } })
    .limit(batchSize)
    .toArray()

  if (docs.length === 0) break

  const bulk = db.users.initializeUnorderedBulkOp()
  for (const doc of docs) {
    bulk.find({ _id: doc._id }).update({
      $set: { schemaVersion: 2, phone: "" }
    })
  }
  bulk.execute()

  processed += docs.length
  print(`已处理 ${processed} 条文档`)
  sleep(100)  // 降低对线上服务的影响
}
```

::: tip Schema 迁移经验
1. 新增字段和添加默认值可以随时做，风险最低
2. 重命名和删除字段需要应用层先适配新旧两种结构
3. 大集合迁移使用分批 + sleep 控制速率
4. 迁移期间应用需要同时兼容新旧 Schema
5. 迁移完成后清理兼容代码
:::
