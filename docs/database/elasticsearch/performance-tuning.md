# 性能调优

ES 的性能瓶颈通常出现在查询延迟、写入吞吐和深分页三个方向。理解底层机制后，有针对性地调优。

## 深分页问题

ES 的默认分页使用 `from + size` 方式，类似 SQL 的 `LIMIT offset, size`。但这种方式在深度翻页时存在严重的性能问题。

### 问题根因

假设每页 10 条，查询第 10000 页（`from=99990, size=10`）：

```
每个 Shard 需要返回前 99990 + 10 = 100000 条结果
Coordinating Node 需要汇总所有 Shard 的结果（假设 5 个 Shard = 50 万条）
排序后取第 99991~100000 条返回
```

页数越深，Coordinating Node 的内存和 CPU 消耗越大。ES 默认限制 `index.max_result_window: 10000`。

### 解决方案

#### Search After（游标分页）

不使用 `from`，而是基于上一页最后一条结果的排序值继续查询：

```bash
# 第一页
GET /my-index/_search
{
  "size": 10,
  "query": { "match_all": {} },
  "sort": [
    { "created_at": "desc" },
    { "_id": "asc" }
  ]
}

# 返回结果中包含 sort 值：
# "sort": [1706227200000, "doc_42"]

# 下一页
GET /my-index/_search
{
  "size": 10,
  "query": { "match_all": {} },
  "search_after": [1706227200000, "doc_42"],
  "sort": [
    { "created_at": "desc" },
    { "_id": "asc" }
  ]
}
```

优点：没有深度限制，每页性能一致。
缺点：只能向下翻页，不能跳页。

#### Scroll API（7.x 后已弃用）

Scroll 创建一个搜索上下文（Search Context），保持快照状态，适合大批量数据导出。

::: warning Scroll 的问题
Scroll 占用大量资源（保持搜索上下文的内存），且不适用于用户翻页场景。7.x 后已标记为弃用，推荐使用 `PIT + Search After` 替代。
:::

#### PIT（Point In Time）

PIT 创建一个搜索时间点快照，保证在该时间点的数据一致性视图：

```bash
# 创建 PIT
POST /my-index/_pit?keep_alive=1m

# 返回: { "id": "46ToAwMDaWR..." }

# 使用 PIT 查询
GET /_search
{
  "size": 10,
  "pit": { "id": "46ToAwMDaWR...", "keep_alive": "1m" },
  "query": { "match_all": {} },
  "sort": [{ "created_at": "desc" }, { "_id": "asc" }],
  "search_after": [1706227200000, "doc_42"]
}

# 关闭 PIT
DELETE /_pit
{
  "id": ["46ToAwMDaWR..."]
}
```

PIT 的优势：不需要指定索引名，保证时间点一致性，配合 Search After 实现无限深度分页。

::: tip 方案选择
| 场景 | 推荐方案 |
|------|---------|
| 用户翻页（前几页） | `from + size` |
| 用户深度翻页 | `PIT + Search After` |
| 大批量数据导出 | `PIT + Search After` |
| 实时数据同步 | `PIT + Search After` |
:::

## Routing 自定义路由

默认路由规则 `shard = hash(_id) % num_shards` 会将文档均匀分布到所有 Shard。查询时需要在所有 Shard 上执行，再合并结果。自定义 Routing 可以将相关数据集中在同一 Shard，减少查询时需要搜索的 Shard 数量。

### 使用方法

```bash
# 写入时指定 routing
POST /orders/_doc?routing=user_123
{
  "user_id": "user_123",
  "product": "MacBook Pro",
  "price": 14999
}

# 查询时指定 routing（只搜索该 Shard）
GET /orders/_search?routing=user_123
{
  "query": {
    "term": { "user_id": "user_123" }
  }
}
```

### 应用场景

- **订单系统**：按用户 ID 路由，查询某用户的订单时只需搜索一个 Shard。
- **多租户系统**：按租户 ID 路由，实现租户数据隔离。
- **日志系统**：按服务名路由，查询某服务的日志时只需搜索部分 Shard。

::: warning Routing 的风险
如果 Routing 值分布不均（某些用户订单量极大），会导致热点 Shard。解决办法：
1. 对超大用户单独创建索引。
2. 在 Routing 值中添加随机前缀分散热点。
:::

## 预计算（Denormalization）

ES 不支持 JOIN，联合查询的正确做法是在写入时预计算（Denormalization），将关联数据嵌入到文档中。

```
传统设计（规范化）：
  orders: { id: 1, user_id: 100 }
  users:  { id: 100, name: "张三" }

ES 设计（反规范化）：
  orders: { id: 1, user_id: 100, user_name: "张三", user_city: "上海" }
```

### 权衡

| 方面 | 规范化 | 反规范化 |
|------|--------|---------|
| 存储 | 较小 | 较大（冗余） |
| 更新 | 更新一处即可 | 需更新多处 |
| 查询 | 需要 JOIN | 单文档查询，高效 |
| 适用场景 | 关系型数据库 | ES / 文档数据库 |

## 缓存策略

ES 内置多级缓存，合理利用可以显著提升查询性能。

### Request Cache（请求缓存）

缓存整个搜索请求的结果。适合聚合查询和频繁重复的搜索。

```json
{
  "size": 0,
  "aggs": { ... },
  "request_cache": true    // 默认对 size=0 的请求开启
}
```

Request Cache 的特点：
- 基于完整的请求 JSON 做缓存 key。
- Segment 级别的缓存（Segment 变更后自动失效）。
- 只对 `size=0`（纯聚合）的请求默认开启。

### Query Cache（查询缓存）

缓存 Lucene 内部的查询结果（Bitset）。主要针对 Filter Context 的 `bool` 查询。

```
Filter 查询 → Lucene 缓存 Bitset → 复用
```

### Fielddata Cache

缓存 text 字段的 Fielddata（用于排序和聚合）。默认不开启 text 字段的 Fielddata（因为消耗大量堆内存）。

::: tip 缓存最佳实践
1. 使用 Filter Context 代替 Query Context（Filter 可缓存 Bitset）。
2. 聚合查询设置 `size: 0`（触发 Request Cache）。
3. 避免使用脚本排序（Script Sort），它无法利用任何缓存。
4. 合理设置缓存大小（`indices.queries.cache.size`）。
:::

## 索引预加载

默认情况下，Segment 文件按需加载到文件系统缓存。可以通过预加载加速冷索引的首次查询：

```json
{
  "index": {
    "store": {
      "preload": ["dvd", "tim", "tip"]
    }
  }
}
```

预加载的文件类型：

| 扩展名 | 文件 | 作用 |
|--------|------|------|
| `.dvd` | Doc Values | 排序、聚合 |
| `.tim` | Term Dictionary | 全文搜索 |
| `.tip` | Term Index (FST) | Term 定位 |
| `.doc` | Posting List | 文档匹配 |

::: warning 预加载的风险
预加载会占用大量系统缓存。如果预加载的索引太大，会挤占其他索引的缓存空间。只对需要低延迟查询的关键索引开启预加载。
:::

## 慢查询排查

### Profile API

Profile API 输出查询每个阶段的耗时：

```bash
GET /my-index/_search
{
  "profile": true,
  "query": {
    "bool": {
      "must": [{ "match": { "title": "Elasticsearch" } }],
      "filter": [{ "term": { "status": "published" } }]
    }
  }
}
```

返回中每个 Shard 的查询被分解为多个组件，显示每个组件的耗时（微秒级）。

### Task API

查看正在执行的长查询：

```bash
GET _tasks?actions=*search&detailed=true
```

可以取消正在执行的慢查询：

```bash
POST _tasks/<task_id>/_cancel
```

### 慢日志

ES 支持记录慢查询到日志文件：

```json
PUT /my-index/_settings
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.search.slowlog.threshold.query.debug": "2s",
  "index.search.slowlog.threshold.query.trace": "500ms",
  "index.search.slowlog.threshold.fetch.warn": "1s"
}
```
