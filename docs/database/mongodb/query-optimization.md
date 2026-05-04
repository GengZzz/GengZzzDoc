# 查询优化

`explain()` 是 MongoDB 查询优化的核心工具。学会读懂执行计划，就能判断查询是否命中索引、扫描了多少文档、是否存在性能瓶颈。

## explain() 执行计划

### 基本用法

```javascript
// queryPlanner：只显示查询计划（不执行查询）
db.users.find({ city: "北京" }).explain("queryPlanner")

// executionStats：执行查询并显示实际统计（推荐）
db.users.find({ city: "北京" }).explain("executionStats")

// allPlansExecution：显示所有候选计划的统计
db.users.find({ city: "北京" }).explain("allPlansExecution")
```

### 执行计划关键字段

```javascript
{
  queryPlanner: {
    winningPlan: {
      stage: "IXSCAN",           // 执行阶段
      indexName: "city_1",       // 使用的索引
      direction: "forward"       // 索引扫描方向
    }
  },
  executionStats: {
    nReturned: 5000,             // 返回文档数
    executionTimeMillis: 12,     // 执行时间（毫秒）
    totalKeysExamined: 5000,     // 扫描的索引条目数
    totalDocsExamined: 5000      // 扫描的文档数
  }
}
```

### 关键 stage 类型

| Stage | 说明 | 性能 |
|-------|------|------|
| `COLLSCAN` | 全集合扫描 | 差（数据量大时灾难性） |
| `IXSCAN` | 索引扫描 | 好 |
| `FETCH` | 从磁盘/内存读取完整文档 | 正常 |
| `IXSCAN_FETCH` | 索引扫描 + 回表 | 较好 |
| `SORT` | 内存排序 | 差（数据量大时） |
| `SORT_KEY_GENERATOR` | 排序键生成 | 可能有开销 |
| `LIMIT` | 限制返回数量 | 好 |
| `SKIP` | 跳过文档 | 差（数据量大时） |
| `SHARD_MERGE` | 分片结果合并 | 正常 |
| `SHARDING_FILTER` | 分片过滤 | 正常 |

## COLLSCAN vs IXSCAN

```javascript
// 无索引 → COLLSCAN（全表扫描）
db.users.find({ city: "北京" }).explain("executionStats")
// {
//   stage: "COLLSCAN",
//   filter: { city: { $eq: "北京" } },
//   totalDocsExamined: 1000000,  // 扫描了所有文档！
//   nReturned: 50000
// }

// 创建索引后 → IXSCAN
db.users.createIndex({ city: 1 })
db.users.find({ city: "北京" }).explain("executionStats")
// {
//   stage: "IXSCAN",
//   indexName: "city_1",
//   totalKeysExamined: 50000,    // 只扫描匹配的索引条目
//   totalDocsExamined: 50000,
//   nReturned: 50000
// }
```

## 索引命中判断

### 判断标准

```javascript
// 命中索引的标志
const explain = db.users.find({ city: "北京", age: { $gte: 25 } })
  .explain("executionStats")

// 1. winningPlan.stage 包含 IXSCAN
explain.executionStats.executionStages.stage  // "IXSCAN" 或 "FETCH"（前一阶段是 IXSCAN）

// 2. totalDocsExamined 远小于集合文档数
explain.executionStats.totalDocsExamined  // 不是 1000000

// 3. totalDocsExamined ≈ nReturned
explain.executionStats.totalDocsExamined  // 应接近 nReturned
explain.executionStats.nReturned          // 如果差距很大，说明有冗余扫描
```

### 常见的索引失效场景

```javascript
// 1. 隐式类型转换
db.users.find({ age: "28" })        // age 是数字，传入字符串
// MongoDB 需要在运行时做类型转换，无法使用索引

// 2. 对字段使用函数
db.users.find({ $expr: { $gt: [{ $strLenCP: "$name" }, 5] } })
// 函数操作无法利用 B-tree 索引

// 3. $or 的一部分条件无索引
db.users.find({
  $or: [
    { city: "北京" },    // 有索引
    { bio: /mongodb/ }   // 无索引
  ]
})
// $or 中任何一个分支无索引，可能导致整体 COLLSCAN

// 4. 范围查询在索引中间字段
// 索引 { city: 1, age: 1, name: 1 }
db.users.find({ city: "北京", age: { $gt: 25 }, name: "张三" })
// age 是范围查询，阻断了 name 利用索引
// 只有 city + age 使用了索引，name 需要内存过滤
```

## 慢查询分析

### 开启 Profiler

```javascript
// 设置慢查询阈值为 100ms
db.setProfilingLevel(1, { slowms: 100 })

// 设置 Profiler（更精细的控制）
db.system.profile.drop()
db.createCollection("system.profile", { capped: true, size: 1024 * 1024 * 100 })  // 100MB

db.setProfilingLevel(2, { slowms: 100, sampleRate: 0.5 })  // 50% 采样
```

### 查询 Profiler 数据

```javascript
// 查看最近的慢查询
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()

// 筛选特定集合的慢查询
db.system.profile.find({
  ns: "myapp.orders",
  millis: { $gt: 500 }
}).sort({ millis: -1 })

// 关注字段
// op: 操作类型（query, insert, update, delete, command）
// ns: 命名空间（数据库.集合）
// millis: 执行时间（毫秒）
// docsExamined: 扫描文档数
// nreturned: 返回文档数
// planSummary: 查询计划摘要（COLLSCAN / IXSCAN / IDHACK）
// query: 查询语句
```

### 慢查询优化流程

```
发现慢查询
  ↓
读取 Profiler 记录（docsExamined vs nreturned）
  ↓
docsExamined >> nreturned？
  ├── 是 → 缺失索引或索引设计不当
  │   └── explain() 分析 → 创建/调整索引
  └── 否 → 查询本身返回大量数据
      ├── 是否需要全部数据？→ 分页/限制返回
      └── 是否可以投影优化？→ 减少字段传输
```

### 常见优化手段

```javascript
// 1. 避免 SELECT *（投影优化）
db.users.find({ city: "北京" }, { name: 1, age: 1 })  // 只取需要的字段

// 2. 利用覆盖查询
db.users.find({ city: "北京" }, { _id: 0, city: 1, name: 1 })

// 3. 限制返回数量
db.users.find({ city: "北京" }).limit(20)

// 4. 使用排序索引
db.users.createIndex({ city: 1, createdAt: -1 })
db.users.find({ city: "北京" }).sort({ createdAt: -1 }).limit(20)

// 5. 批量操作代替循环单条操作
// 差：1000 次 find + update
for (let id of ids) {
  db.users.updateOne({ _id: id }, { $set: { status: "processed" } })
}
// 好：1 次 updateMany
db.users.updateMany({ _id: { $in: ids } }, { $set: { status: "processed" } })

// 6. 避免深分页（使用游标分页）
// 差
db.users.find().skip(100000).limit(10)
// 好
db.users.find({ _id: { $gt: lastSeenId } }).sort({ _id: 1 }).limit(10)
```

::: tip docsExamined / nreturned 比值
这个比值是最关键的性能指标。比值接近 1.0 说明查询效率很高（几乎每扫描一个文档就返回一个）。如果比值 > 10，说明大部分扫描是浪费的，需要检查索引设计。
:::

## 查看当前操作

```javascript
// 查看当前正在执行的操作
db.currentOp({
  active: true,
  secs_running: { $gt: 5 }   // 运行超过 5 秒的操作
})

// 终止长时间运行的查询
db.killOp(operationId)
```
