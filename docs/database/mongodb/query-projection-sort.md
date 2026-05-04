# 查询、投影与排序

MongoDB 的查询体系比表面上看到的丰富得多。掌握投影优化、排序原理和分页策略，能显著提升查询性能。

## 查询运算符

### 比较运算符

```javascript
db.users.find({ age: { $eq: 25 } })    // 等于
db.users.find({ age: { $ne: 25 } })    // 不等于
db.users.find({ age: { $gt: 25 } })    // 大于
db.users.find({ age: { $gte: 25 } })   // 大于等于
db.users.find({ age: { $lt: 25 } })    // 小于
db.users.find({ age: { $lte: 25 } })   // 小于等于
db.users.find({ age: { $in: [25, 30, 35] } })   // 在数组中
db.users.find({ age: { $nin: [25, 30] } })      // 不在数组中
```

### 存在性与类型检查

```javascript
// 字段是否存在
db.users.find({ phone: { $exists: true } })

// 字段类型检查（BSON 类型编号）
db.users.find({ age: { $type: "int" } })    // age 是整数类型
db.users.find({ tags: { $type: "array" } })  // tags 是数组类型
```

### 元素匹配（数组查询）

```javascript
// 至少一个元素满足条件（$elemMatch）
db.students.find({
  scores: { $elemMatch: { subject: "math", score: { $gte: 90 } } }
})

// 简写（只要存在 score >= 90 的元素）
db.students.find({ "scores.score": { $gte: 90 } })
```

`$elemMatch` vs 点号语法的关键区别：

```javascript
// 文档示例
// { scores: [{ subject: "math", score: 80 }, { subject: "english", score: 95 }] }

// 点号语法：匹配所有元素中的条件（subject 为 math 的记录 score 可能 < 90）
db.students.find({ "scores.subject": "math", "scores.score": { $gte: 90 } })
// 命中上述文档！因为 subject:math 和 score:95 分属不同元素

// $elemMatch：要求单个元素同时满足所有条件
db.students.find({ scores: { $elemMatch: { subject: "math", score: { $gte: 90 } } } })
// 不命中上述文档
```

## 投影（Projection）

投影控制返回文档中包含或排除哪些字段，减少网络传输和内存占用。

```javascript
// 只返回指定字段（_id 默认返回）
db.users.find(
  { city: "北京" },
  { name: 1, email: 1, age: 1 }
)

// 排除指定字段
db.users.find(
  { city: "北京" },
  { password: 0, salt: 0 }
)

// 投影数组切片
db.posts.find(
  {},
  { title: 1, comments: { $slice: 5 } }   // 只返回前 5 条评论
)

// 投影数组中满足条件的元素
db.students.find(
  {},
  {
    name: 1,
    scores: {
      $elemMatch: { subject: "math" }
    }
  }
)

// 数组投影：$filter（聚合中更常用）
db.students.aggregate([
  { $match: { name: "张三" } },
  {
    $project: {
      name: 1,
      highScores: {
        $filter: {
          input: "$scores",
          as: "s",
          cond: { $gte: ["$$s.score", 90] }
        }
      }
    }
  }
])
```

::: tip 投影与覆盖查询
如果投影只包含索引中的字段，MongoDB 可以直接从索引返回结果，无需读取文档（覆盖查询）。这对高频查询的性能提升非常显著。详见[索引策略](./index-strategy.md)。
:::

## 排序（Sort）

```javascript
// 单字段升序/降序
db.users.find().sort({ age: 1 })   // 升序
db.users.find().sort({ age: -1 })  // 降序

// 多字段排序
db.users.find().sort({ city: 1, age: -1 })

// 结合查询条件
db.users.find({ status: "active" }).sort({ createdAt: -1 })
```

排序的内存限制：MongoDB 为排序分配 100MB 内存。如果排序结果集超出 100MB，查询会报错。解决方式是在排序字段上建索引，让排序在索引层面完成。

```javascript
// 创建支持排序的索引
db.users.createIndex({ city: 1, age: -1 })

// 这个查询可以利用索引排序，不在内存中排序
db.users.find({ city: "北京" }).sort({ age: -1 })
```

## 分页

### skip + limit（传统方式）

```javascript
// 第 1 页（每页 10 条）
db.users.find().sort({ createdAt: -1 }).skip(0).limit(10)

// 第 2 页
db.users.find().sort({ createdAt: -1 }).skip(10).limit(10)

// 第 100 页
db.users.find().sort({ createdAt: -1 }).skip(990).limit(10)
```

::: warning skip 的性能陷阱
`skip(N)` 需要扫描并跳过前 N 条文档，时间复杂度 O(N)。页码越大，性能越差。当数据量达到百万级时，第 1000 页的查询需要跳过近万条文档，延迟可能达到秒级。

**绝对不要在生产环境对大数据集使用深分页。**
:::

### 游标分页（推荐方式）

利用上一页最后一条文档的排序字段值，作为下一页的查询条件：

```javascript
// 第 1 页
const page1 = db.users.find()
  .sort({ createdAt: -1, _id: 1 })
  .limit(10)
  .toArray()

// 取最后一条的 createdAt 和 _id
const lastDoc = page1[page1.length - 1]
const cursor = lastDoc.createdAt
const lastId = lastDoc._id

// 第 2 页（游标分页）
const page2 = db.users.find({
  $or: [
    { createdAt: { $lt: cursor } },
    { createdAt: cursor, _id: { $gt: lastId } }
  ]
})
  .sort({ createdAt: -1, _id: 1 })
  .limit(10)
  .toArray()
```

这种分页方式性能恒定，不随页码增长而变慢，且不依赖 `skip`。

::: tip 游标分页的关键
排序字段必须能唯一标识文档顺序。如果排序字段有重复值（如大量文档 `createdAt` 相同），必须追加 `_id` 作为第二排序字段，否则会漏文档或重复文档。
:::

## 正则表达式查询

```javascript
// 前缀匹配（可以利用索引）
db.users.find({ name: /^张/ })

// 包含匹配（无法利用索引，需要全表扫描）
db.users.find({ name: /三/ })

// 忽略大小写
db.users.find({ email: { $regex: /gmail\.com$/i } })

// 使用 $regex 运算符
db.users.find({ name: { $regex: "^张", $options: "" } })
```

::: warning 正则与索引
正则表达式只有前缀匹配（`/^prefix/`）可以利用 B-tree 索引。包含匹配（`/text/`）和后缀匹配（`/suffix$/`）会导致全集合扫描。如果需要全文搜索，应使用文本索引（Text Index）。
:::
