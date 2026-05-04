# CRUD 操作深入

MongoDB 的 CRUD 操作看似简单，但涉及批量写入的有序/无序、写关注（Write Concern）的一致性级别、upsert 等高级用法时，细节决定性能和可靠性。

## 插入操作

### 单文档插入

```javascript
db.users.insertOne({
  name: "张三",
  age: 28,
  email: "zhangsan@example.com",
  createdAt: new Date()
})
```

`insertOne` 是原子操作，单文档写入天然具有 ACID 语义。

### 批量插入

```javascript
db.users.insertMany([
  { name: "李四", age: 25 },
  { name: "王五", age: 30 },
  { name: "赵六", age: 22 }
], { ordered: false })  // unordered：遇到错误继续插入剩余文档
```

**`ordered` 参数的影响：**

- `ordered: true`（默认）：遇到第一个错误立即停止，已插入的文档不回滚
- `ordered: false`：并行插入，遇到错误跳过继续，全部完成后返回错误详情

```javascript
// 有序插入错误示例
db.users.insertMany([
  { _id: 1, name: "A" },
  { _id: 1, name: "B" },  // _id 重复，报错
  { _id: 3, name: "C" }   // ordered: true 时不会插入
], { ordered: true })
// 结果：只有 _id:1 的 "A" 插入成功，B 和 C 都失败

// 无序插入
db.users.insertMany([
  { _id: 1, name: "A" },
  { _id: 1, name: "B" },  // _id 重复，跳过
  { _id: 3, name: "C" }   // 继续插入
], { ordered: false })
// 结果：A 和 C 插入成功，B 失败并报告错误
```

::: tip 批量插入性能
批量插入的单次网络往返远优于循环 `insertOne`。建议每批 1000-5000 条文档，太大会占用过多内存并可能触发 `maxBsonObjectSize` 限制（16MB）。
:::

## 查询操作

### 基本查询

```javascript
// 等值查询
db.users.find({ age: 28 })

// 范围查询
db.users.find({ age: { $gte: 25, $lte: 35 } })

// 嵌套字段查询（点号语法）
db.users.find({ "address.city": "北京" })

// 数组包含查询
db.users.find({ tags: "java" })  // tags 数组包含 "java"

// 数组多条件（$all：包含所有指定元素）
db.users.find({ tags: { $all: ["java", "spring"] } })
```

### 逻辑运算符

```javascript
// $and（隐式，逗号分隔即 AND）
db.users.find({ age: { $gte: 25 }, city: "北京" })

// $or
db.users.find({
  $or: [
    { age: { $lt: 20 } },
    { city: "上海" }
  ]
})

// $not
db.users.find({ age: { $not: { $gte: 25 } } })

// $nor（所有条件都不满足）
db.users.find({ $nor: [{ age: { $lt: 20 } }, { city: "上海" }] })
```

## 更新操作

### $set 与字段操作

```javascript
// 设置字段值
db.users.updateOne(
  { name: "张三" },
  { $set: { age: 29, updatedAt: new Date() } }
)

// 删除字段
db.users.updateOne(
  { name: "张三" },
  { $unset: { tempField: "" } }
)

// 数值自增
db.products.updateOne(
  { _id: ObjectId("...") },
  { $inc: { stock: -1, soldCount: 1 } }
)
```

### 数组操作

```javascript
// 追加元素
db.users.updateOne(
  { name: "张三" },
  { $push: { tags: "mongodb" } }
)

// 追加多个元素（不去重）
db.users.updateOne(
  { name: "张三" },
  { $push: { tags: { $each: ["redis", "kafka"] } } }
)

// 追加并去重
db.users.updateOne(
  { name: "张三" },
  { $addToSet: { tags: "mongodb" } }  // 已存在则不添加
)

// 删除数组元素
db.users.updateOne(
  { name: "张三" },
  { $pull: { tags: "temp" } }  // 删除所有值为 "temp" 的元素
)

// 按位置更新数组元素
db.users.updateOne(
  { name: "张三" },
  { $set: { "addresses.0.city": "深圳" } }  // 更新第一个地址的城市
)

// 按条件更新数组中的匹配元素（$ 操作符）
db.users.updateOne(
  { name: "张三", "addresses.city": "北京" },
  { $set: { "addresses.$.zipCode": "100080" } }
)
```

### 批量更新

```javascript
// 默认只更新第一个匹配文档
db.users.updateMany(
  { city: "北京" },
  { $set: { region: "华北" } }
)

// upsert：存在则更新，不存在则插入
db.users.updateOne(
  { email: "newuser@example.com" },
  {
    $set: { name: "新用户", age: 25 },
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true }
)
```

::: warning updateOne vs updateMany
`updateOne` 只更新第一个匹配文档，`updateMany` 更新所有匹配文档。生产环境中误用 `updateMany` 可能导致数据批量错误修改。建议在开发阶段先用 `find()` 确认匹配范围，再执行更新。
:::

## 删除操作

```javascript
// 删除单个文档
db.users.deleteOne({ name: "张三" })

// 删除多个文档
db.users.deleteMany({ status: "inactive" })

// 删除所有文档（保留集合和索引）
db.users.deleteMany({})

// 删除整个集合（删除集合 + 索引，更快）
db.users.drop()
```

::: tip 清理大量数据
如果需要删除集合中 80% 以上的数据，`deleteMany` 效率极低（逐条删除）。更好的做法是：将要保留的数据复制到新集合，然后 drop 旧集合，再重命名：
```javascript
db.users.aggregate([{ $match: { status: "active" } }, { $out: "users_new" }])
db.users.drop()
db.users_new.renameCollection("users")
```
:::

## 批量写入操作

`bulkWrite` 允许在一个请求中混合执行多种操作：

```javascript
db.orders.bulkWrite([
  { insertOne: { document: { userId: "u1", status: "pending", total: 100 } } },
  {
    updateOne: {
      filter: { _id: ObjectId("...") },
      update: { $set: { status: "shipped" } }
    }
  },
  { deleteOne: { filter: { status: "cancelled", createdAt: { $lt: ISODate("2024-01-01") } } } },
  {
    updateOne: {
      filter: { userId: "u2" },
      update: { $set: { status: "active" } },
      upsert: true
    }
  }
], { ordered: false })
```

## 写关注（Write Concern）

写关注控制写操作的确认级别，直接影响数据持久化保证：

```javascript
// w:1 — 默认，主节点确认即返回（性能最高，可能丢数据）
db.users.insertOne({ name: "张三" }, { writeConcern: { w: 1 } })

// w:majority — 多数节点确认（推荐，持久化保证好）
db.users.insertOne({ name: "张三" }, { writeConcern: { w: "majority" } })

// w:2 + j:true — 2 个节点 + 写入 Journal（最强保证，性能最低）
db.users.insertOne({ name: "张三" }, { writeConcern: { w: 2, j: true } })

// w:1 + wtimeout — 超时保护
db.users.insertOne({ name: "张三" }, {
  writeConcern: { w: "majority", wtimeout: 5000 }
})
```

| Write Concern | 含义 | 数据安全 | 性能 |
|--------------|------|---------|------|
| `w:0` | 不等待确认 | 无保证 | 最高 |
| `w:1` | 主节点确认 | 主节点故障可能丢 | 高 |
| `w:majority` | 多数节点确认 | 持久化有保证 | 中等 |
| `w:all` | 全部节点确认 | 最强保证 | 最低 |

::: tip 生产环境建议
多数场景使用 `w:majority` 即可。对金融级数据安全要求的场景，额外开启 `j: true`（写入 Journal 后才确认）。`wtimeout` 一定要设置，避免主节点故障时写入无限阻塞。
:::
