# 索引类型

MongoDB 提供丰富的索引类型，每种类型对应不同的查询模式。选错索引类型不会报错，但会导致索引失效和性能灾难。

## 单字段索引

最基础的索引，对单个字段创建 B-tree 索引。

```javascript
// 升序索引
db.users.createIndex({ age: 1 })

// 降序索引（对单字段索引无区别，对复合索引有影响）
db.users.createIndex({ createdAt: -1 })

// 嵌套字段索引
db.users.createIndex({ "address.city": 1 })
```

## 复合索引

对多个字段创建的索引。复合索引中字段的顺序决定了索引的使用方式。

```javascript
// 复合索引
db.users.createIndex({ city: 1, age: -1, name: 1 })
```

复合索引按字段顺序建立 B-tree，索引中的文档先按第一个字段排序，相同时按第二个字段排序，以此类推。

```
索引结构示意：
city=北京, age=35, name="张三"
city=北京, age=28, name="李四"
city=北京, age=22, name="王五"
city=上海, age=30, name="赵六"
city=上海, age=25, name="钱七"
```

```javascript
// 可以利用该索引的查询
db.users.find({ city: "北京" })                        // 命中前缀
db.users.find({ city: "北京", age: { $gt: 25 } })     // 命中前缀 + 范围
db.users.find({ city: "北京" }).sort({ age: -1 })      // 命中前缀 + 排序

// 无法利用该索引的查询
db.users.find({ age: 28 })                              // 跳过了 city 前缀
db.users.find({ city: "北京" }).sort({ name: 1 })       // 跳过了 age
```

::: tip 复合索引的顺序至关重要
复合索引遵循"最左前缀"原则：索引 `{ A: 1, B: 1, C: 1 }` 可以支持 `{A}`、`{A, B}`、`{A, B, C}` 的查询，但不能单独支持 `{B}` 或 `{C}`。设计复合索引时，将等值查询字段放在最前，排序字段其次，范围查询字段放最后。
:::

## 多键索引

当索引字段是数组时，MongoDB 自动为数组中的每个元素创建索引条目，这就是多键索引。

```javascript
// 文档示例
// { name: "张三", tags: ["java", "spring", "mongodb"] }

// 自动成为多键索引
db.users.createIndex({ tags: 1 })

// 查询（利用多键索引）
db.users.find({ tags: "java" })

// 复合多键索引限制：一个复合索引中最多只能有一个数组字段
db.users.createIndex({ tags: 1, age: 1 })   // 合法
// db.users.createIndex({ tags: 1, hobbies: 1 })  // 错误：两个数组字段
```

## 文本索引

用于全文搜索，支持分词、权重和语言处理。

```javascript
// 创建文本索引
db.articles.createIndex({ title: "text", content: "text" })

// 全文搜索
db.articles.find({ $text: { $search: "mongodb 优化 性能" } })

// 带权重的文本索引（标题权重 10，内容权重 1）
db.articles.createIndex(
  { title: "text", content: "text" },
  { weights: { title: 10, content: 1 }, name: "ArticleTextIndex" }
)

// 搜索结果按相关性得分排序
db.articles.find(
  { $text: { $search: "mongodb 性能" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

::: warning 文本索引限制
- 每个集合只能有一个文本索引
- 文本索引不支持前缀匹配和正则
- 中文分词效果有限（按字符分词，非语义分词）
- 大规模全文搜索建议使用 Elasticsearch
:::

## 地理空间索引

MongoDB 支持两种地理空间索引：2d（平面坐标）和 2dsphere（球面坐标）。

```javascript
// 2dsphere 索引（推荐，支持 GeoJSON）
db.restaurants.createIndex({ location: "2dsphere" })

// 插入 GeoJSON 数据
db.restaurants.insertOne({
  name: "海底捞中关村店",
  location: {
    type: "Point",
    coordinates: [116.316833, 39.983472]   // [经度, 纬度]
  }
})

// 查找 3 公里内的餐厅
db.restaurants.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [116.32, 39.98] },
      $maxDistance: 3000   // 米
    }
  }
})

// 查找某个区域内的餐厅
db.restaurants.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [116.30, 39.97], [116.34, 39.97],
          [116.34, 40.00], [116.30, 40.00],
          [116.30, 39.97]
        ]]
      }
    }
  }
})
```

## TTL 索引

TTL（Time To Live）索引让 MongoDB 自动删除过期文档，常用于会话、日志、验证码等临时数据。

```javascript
// 创建 TTL 索引（expireAfterSeconds 单位：秒）
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })

// 文档将在 createdAt 之后 3600 秒（1 小时）自动删除

// 验证码 5 分钟过期
db.verification_codes.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 })
```

::: warning TTL 索引注意事项
- TTL 索引只能是单字段索引
- 索引字段必须是 Date 类型
- MongoDB 的 TTL 后台线程每 60 秒运行一次，不保证精确到秒级删除
- 副本集中，只有 Primary 节点执行 TTL 删除
:::

## 部分索引

只对满足条件的文档创建索引，减少索引体积和维护开销。

```javascript
// 只对活跃用户创建 email 索引
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: "active" } }
)

// 只对有手机号的用户创建索引
db.users.createIndex(
  { phone: 1 },
  { partialFilterExpression: { phone: { $exists: true } } }
)
```

查询必须匹配部分索引的过滤条件才能命中索引：

```javascript
db.users.find({ email: "test@example.com", status: "active" })  // 命中部分索引
db.users.find({ email: "test@example.com" })                     // 不命中（没有 status 条件）
```

## 隐藏索引（Hidden Index）

隐藏索引仍然维护但不被查询优化器使用，用于测试删除索引的影响。

```javascript
// 隐藏索引
db.users.hideIndex({ city: 1, age: -1 })

// 取消隐藏
db.users.unhideIndex({ city: 1, age: -1 })

// 通过 explain 确认隐藏后查询不再使用该索引
db.users.find({ city: "北京" }).explain()
```

::: tip 隐藏索引的用途
在删除索引前先隐藏它，观察一段时间。如果查询性能没有下降，说明可以安全删除。这比直接删除索引后发现问题再重建要安全得多。
:::

## 唯一索引

```javascript
// 唯一索引
db.users.createIndex({ email: 1 }, { unique: true })

// 复合唯一索引
db.orders.createIndex({ userId: 1, productId: 1 }, { unique: true })

// 唯一 + 稀疏（只对有该字段的文档强制唯一性）
db.users.createIndex(
  { phone: 1 },
  { unique: true, sparse: true }
)
```

## 索引属性查看

```javascript
// 查看集合的所有索引
db.users.getIndexes()

// 查看索引大小
db.users.stats().indexSizes

// 删除索引
db.users.dropIndex("city_1_age_-1")

// 删除所有非 _id 索引
db.users.dropIndexes()
```
