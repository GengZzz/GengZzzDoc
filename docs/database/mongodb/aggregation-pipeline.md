# 聚合管道

聚合管道（Aggregation Pipeline）是 MongoDB 最强大的数据处理工具。它将文档通过多个阶段（Stage）逐级处理，类似 Unix 管道，每个阶段对输入文档进行变换后输出给下一个阶段。

<MongoAggregationDemo />

## 管道阶段

### $match — 过滤

`$match` 用于过滤文档，语法与 `find()` 完全一致。应尽量放在管道最前面，利用索引减少后续阶段的输入量。

```javascript
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: ISODate("2024-01-01") } } },
  // 后续阶段...
])
```

### $group — 分组

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $group: {
      _id: "$userId",                              // 按 userId 分组
      totalAmount: { $sum: "$totalPrice" },        // 求和
      avgAmount: { $avg: "$totalPrice" },          // 平均值
      orderCount: { $sum: 1 },                     // 计数
      maxAmount: { $max: "$totalPrice" },          // 最大值
      minAmount: { $min: "$totalPrice" },          // 最小值
      orders: { $push: "$$ROOT" }                  // 收集所有文档
    }
  },
  { $sort: { totalAmount: -1 } }
])
```

### $unwind — 展开数组

将数组字段中的每个元素展开为独立文档：

```javascript
// 原始文档
// { userId: "u1", tags: ["java", "spring", "mongodb"] }

db.users.aggregate([
  { $unwind: "$tags" }
])
// 输出 3 个文档：
// { userId: "u1", tags: "java" }
// { userId: "u1", tags: "spring" }
// { userId: "u1", tags: "mongodb" }
```

```javascript
// 保留空数组和 null
db.users.aggregate([
  { $unwind: { path: "$tags", preserveNullAndEmptyArrays: true } }
])
```

### $lookup — 关联查询

等价于 SQL 的 LEFT JOIN：

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "users",                  // 关联的集合
      localField: "userId",           // 当前集合的字段
      foreignField: "_id",            // 关联集合的字段
      as: "user"                      // 输出数组字段名
    }
  },
  { $unwind: "$user" }               // 数组展开为对象
])
```

```javascript
// 带条件的 $lookup
db.orders.aggregate([
  {
    $lookup: {
      from: "order_items",
      let: { orderId: "$_id" },      // 定义变量
      pipeline: [
        { $match: { $expr: { $eq: ["$orderId", "$$orderId"] } } },
        { $match: { quantity: { $gte: 2 } } }
      ],
      as: "bulkItems"
    }
  }
])
```

### $project — 投影

```javascript
db.orders.aggregate([
  {
    $project: {
      _id: 0,
      orderNumber: { $concat: ["ORD-", { $toString: "$_id" }] },
      userId: 1,
      itemCount: { $size: "$items" },
      total: "$totalPrice"
    }
  }
])
```

### $addFields — 添加计算字段

```javascript
db.orders.aggregate([
  {
    $addFields: {
      itemCount: { $size: "$items" },
      avgItemPrice: { $divide: ["$totalPrice", { $size: "$items" }] },
      month: { $month: "$createdAt" }
    }
  }
])
```

### $facet — 多管道并行

在一个查询中同时执行多个管道，返回多个结果集：

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  {
    $facet: {
      // 管道 1：按月统计
      monthlyStats: [
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$totalPrice" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ],
      // 管道 2：Top 10 用户
      topUsers: [
        {
          $group: {
            _id: "$userId",
            total: { $sum: "$totalPrice" }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ],
      // 管道 3：总体统计
      summary: [
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalPrice" },
            totalOrders: { $sum: 1 },
            avgOrder: { $avg: "$totalPrice" }
          }
        }
      ]
    }
  }
])
```

### $bucket — 分桶

```javascript
db.products.aggregate([
  {
    $bucket: {
      groupBy: "$price",
      boundaries: [0, 50, 100, 200, 500, 1000, Infinity],
      default: "其他",
      output: {
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" },
        products: { $push: "$name" }
      }
    }
  }
])
```

### $bucketAuto — 自动分桶

```javascript
db.products.aggregate([
  {
    $bucketAuto: {
      groupBy: "$price",
      buckets: 5,                          // 自动分成 5 个桶
      output: {
        count: { $sum: 1 },
        avgPrice: { $avg: "$price" }
      }
    }
  }
])
```

### 窗口函数（$setWindowFields）

MongoDB 5.0+ 支持窗口函数，可在分组内执行排行、累计、移动平均等计算：

```javascript
db.orders.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$userId",
      sortBy: { createdAt: 1 },
      output: {
        // 每个用户的订单序号
        orderRank: {
          $rank: {}
        },
        // 累计金额
        runningTotal: {
          $sum: "$totalPrice",
          window: { documents: ["unbounded", "current"] }
        },
        // 移动平均（最近 3 单）
        movingAvg: {
          $avg: "$totalPrice",
          window: { documents: [-2, 0] }
        }
      }
    }
  }
])
```

### $merge / $out — 输出结果

```javascript
// $out：覆盖目标集合（删除旧数据）
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: "$totalPrice" } } },
  { $out: "user_totals" }
])

// $merge：合并到目标集合（可以 upsert，推荐）
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: "$totalPrice" } } },
  {
    $merge: {
      into: "user_totals",
      on: "_id",
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
])
```

::: tip $merge vs $out
`$out` 会先删除目标集合再插入，期间目标集合不可用且丢失索引。`$merge` 支持增量更新，不影响已有数据，是生产环境的首选。
:::

## 执行计划与优化

```javascript
// 查看聚合管道执行计划
db.orders.explain("executionStats").aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: "$totalPrice" } } }
])
```

### 性能优化原则

1. **$match 尽量前置**：在管道早期过滤数据，减少后续阶段处理量
2. **$match 使用索引**：管道最前面的 `$match` 可以利用索引
3. **避免 $lookup 的笛卡尔积**：`$lookup` 后 $unwind 会倍增文档量
4. **$project 尽量后置**：过早投影可能导致索引失效
5. **限制中间文档大小**：单个文档不超过 16MB（BSON 限制）

### 内存限制

聚合管道的每个阶段默认有 100MB 内存限制。如果某个阶段超出限制（如排序大量数据），会报错。

```javascript
// 开启磁盘溢出（允许使用磁盘做临时存储）
db.orders.aggregate([
  { $sort: { totalPrice: -1 } },
  { $group: { _id: "$userId", orders: { $push: "$$ROOT" } } }
], { allowDiskUse: true })
```

::: warning allowDiskUse
开启 `allowDiskUse` 后管道不会因内存限制而失败，但会大量使用磁盘 I/O，性能显著下降。更好的做法是优化管道设计，避免中间结果集过大。
:::
