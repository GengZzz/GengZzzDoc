# 索引策略

建索引容易，建对索引很难。MongoDB 索引策略的核心是 ESR 规则（Equality、Sort、Range），理解它能避免大部分索引设计失误。

## ESR 规则

设计复合索引时，字段顺序应遵循：

1. **E（Equality）**：等值查询字段放在最前面
2. **S（Sort）**：排序字段紧随其后
3. **R（Range）**：范围查询字段放在最后

```javascript
// 查询示例
db.orders.find({
  userId: "u123",                        // 等值
  status: "completed",                   // 等值
  totalPrice: { $gte: 100 }             // 范围
}).sort({ createdAt: -1 })               // 排序

// 正确的索引设计（ESR）
db.orders.createIndex({
  userId: 1,       // E
  status: 1,       // E
  createdAt: -1,   // S
  totalPrice: 1    // R
})
```

为什么是 ESR 而不是其他顺序？考虑索引结构：

```
索引 { userId: 1, status: 1, createdAt: -1, totalPrice: 1 } 的排列：

userId=u123, status=completed, createdAt=2024-03-01, totalPrice=200
userId=u123, status=completed, createdAt=2024-02-15, totalPrice=150
userId=u123, status=completed, createdAt=2024-02-15, totalPrice=80
userId=u123, status=completed, createdAt=2024-01-10, totalPrice=300
userId=u123, status=pending,   createdAt=2024-03-01, totalPrice=50
...
```

等值字段过滤后，同一 userId + status 的文档在索引中已经按 createdAt 排好序。范围字段 totalPrice 放在最后，不影响排序顺序。如果把 totalPrice 放在 createdAt 前面，排序就必须额外的内存排序阶段。

### ESR 违反的后果

```javascript
// 错误索引：范围字段在排序字段前面
db.orders.createIndex({ userId: 1, status: 1, totalPrice: 1, createdAt: -1 })

// 执行上述查询时：
// userId + status 等值过滤后，文档按 totalPrice 排序
// totalPrice 范围扫描会打乱 createdAt 的顺序
// 结果：需要额外的 SORT 阶段，性能从 O(log n) 降为 O(n log n)
```

## 覆盖查询（Covered Query）

当查询的投影只包含索引中的字段时，MongoDB 可以直接从索引返回结果，完全不读取文档。这是性能最优的查询方式。

```javascript
// 索引
db.users.createIndex({ city: 1, age: 1, name: 1 })

// 覆盖查询：所有查询条件和返回字段都在索引中
db.users.find(
  { city: "北京", age: { $gte: 25 } },   // 查询条件在索引中
  { _id: 0, name: 1, age: 1 }            // 返回字段在索引中
)
// explain 输出中 totalDocsExamined: 0，说明没有读取任何文档
```

判断覆盖查询的标准：`explain()` 输出中 `totalDocsExamined` 为 0 或 `totalDocsExamined < nReturned`。

::: tip 覆盖查询的限制
- `_id` 字段默认会返回，需要在投影中显式排除 `_id: 0`
- 不能覆盖数组字段（多键索引不能完全覆盖）
- 不能覆盖嵌套文档的子字段（需要显式投影到根级别）
:::

## 索引选择性

索引选择性 = 不同值数量 / 文档总数。选择性越高，索引效果越好。

```javascript
// 检查字段选择性
db.users.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
// 输出：active: 99000, inactive: 1000
// status 只有 2 个值，选择性极低，不适合单独建索引

// 但可以作为部分索引的过滤条件
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { status: "active" } }
)
```

选择性低的字段（如布尔值、性别、状态）单独建索引效果差，因为索引扫描的比例和全集合扫描差不多。应该将低选择性字段与高选择性字段组合在复合索引中。

## 索引交集（Index Intersection）

MongoDB 可以利用多个单字段索引来完成一个查询，但这不意味着可以不建复合索引。

```javascript
// 两个单字段索引
db.users.createIndex({ city: 1 })
db.users.createIndex({ age: 1 })

// 查询可以使用索引交集
db.users.find({ city: "北京", age: { $gte: 25 } })
// explain 中会显示 IXSCAN + IXSCAN + AND_SORTED 或 AND_HASH
```

::: warning 索引交集不如复合索引
索引交集的开销通常大于单个复合索引：
- 需要从多个索引中取结果集再做交集
- 不能支持排序
- 不能实现覆盖查询

**能建复合索引就不要依赖索引交集。**
:::

## 索引与排序

排序能否利用索引取决于查询条件 + 排序字段是否能形成索引前缀。

```javascript
// 索引 { status: 1, createdAt: -1 }

// 可以利用索引排序
db.orders.find({ status: "completed" }).sort({ createdAt: -1 })

// 不能利用索引排序（排序方向不一致）
db.orders.find({ status: "completed" }).sort({ createdAt: 1 })
// 索引中 createdAt 是降序，查询要求升序 → 需要内存排序
// 但如果只有等值条件，MongoDB 可以反向扫描索引
// 实际上这个例子可能可以利用索引，取决于 MongoDB 版本和优化器

// 不能利用索引排序（跳过了等值条件）
db.orders.find({}).sort({ createdAt: -1 })
// 没有 status 条件，无法利用索引前缀
```

## 索引覆盖的更新/删除

索引不仅用于查询，更新和删除操作也可以利用索引定位目标文档：

```javascript
// 如果 email 有索引，updateOne 只扫描 1 个文档
db.users.updateOne({ email: "test@example.com" }, { $set: { age: 30 } })

// explain 验证
db.users.find({ email: "test@example.com" }).explain("executionStats")
// 关注 totalDocsExamined，理想值等于 nReturned
```

## 索引设计原则

1. **覆盖高频查询**：针对应用中最频繁的 3-5 个查询设计索引
2. **遵循 ESR 规则**：等值 → 排序 → 范围
3. **控制索引数量**：每个索引都有写入开销（每次写入需更新所有相关索引）
4. **使用部分索引**：避免为少数文档创建全量索引
5. **定期审查**：用 `db.currentOp()` 和慢查询日志发现缺失索引

```javascript
// 找出未使用的索引（MongoDB 4.4+）
db.users.aggregate([{ $indexStats: { } }])
// 查看 usageCount 字段，长期为 0 的索引可以考虑隐藏或删除
```

::: tip 索引不是越多越好
每个索引在写入时都需要维护。5 个索引意味着一次 `insertOne` 需要 6 次写操作（1 次文档写入 + 5 次索引更新）。过度索引会显著降低写入性能。定期使用 `$indexStats` 审查并删除未使用的索引。
:::
