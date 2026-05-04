# 写入流程

ES 的写入流程设计精巧，兼顾了性能、可靠性和近实时搜索能力。理解写入流程是排查写入延迟、数据丢失、一致性问题的基础。

## 写入链路

一条文档从客户端发出到持久化到磁盘，经过以下步骤：

```
Client
  │
  ▼
Coordinating Node（协调节点）
  │  ① 接收请求，路由到目标 Primary Shard
  ▼
Primary Shard（主分片）
  │  ② 写入内存 Buffer
  │  ③ 写入 Translog（事务日志）
  │  ④ Refresh：Buffer → 新 Segment（可搜索）
  │  ⑤ Flush：Segment 从文件系统缓存持久化到磁盘
  ▼
Replica Shard（副本分片）
  │  ⑥ 同步转发给所有 Replica
  ▼
返回客户端
```

### 步骤详解

**① 路由（Routing）**

Coordinating Node 根据 `_id` 计算文档应该落到哪个 Shard：

```text
shard = hash(_id) % number_of_primary_shards
```

也可以在写入时指定自定义 `routing` 值（如按用户 ID 路由），保证同一用户的数据落在同一 Shard，提升查询效率。

**② 写入内存 Buffer**

文档首先被写入内存中的 Buffer。此时数据还不可被搜索。

**③ 写入 Translog**

同时将操作记录写入 Translog（事务日志）。Translog 是顺序写入的文件，用于故障恢复——如果节点宕机，重启后会重放 Translog 中未持久化的操作。

**④ Refresh**

每隔 1 秒（默认），Buffer 中的数据被写入一个新的 Segment 文件，Buffer 被清空。此时数据变为可搜索。这个过程叫 Refresh。

**⑤ Flush**

每隔 30 分钟或 Translog 达到一定大小（默认 512MB），ES 执行 Flush：将文件系统缓存中的 Segment 数据 fsync 到磁盘，然后清空 Translog。

**⑥ 副本同步**

Primary Shard 收到写入请求后，同步转发给所有 Replica Shard。所有 Replica 确认写入成功后，Coordinating Node 才向客户端返回成功。

::: tip 写入一致性
默认 `wait_for_active_shards` 为 1（只需 Primary 成功即可返回）。可以设置为 `"all"` 确保所有 Shard 都写入成功，但会增加延迟。
:::

## Refresh 机制

Refresh 是 ES 实现"近实时搜索"（Near Real-Time）的核心。

### 为什么是 1 秒？

频繁 Refresh 会产生大量小 Segment，增加后续 Merge 压力。ES 默认每秒 Refresh 一次，平衡了搜索实时性和写入吞吐。

```bash
# 查看当前 Refresh 间隔
GET /my-index/_settings/index.refresh_interval

# 调整 Refresh 间隔（大批量导入时建议关闭）
PUT /my-index/_settings
{
  "index.refresh_interval": "-1"    # 禁用自动 Refresh
}

# 导入完成后恢复
PUT /my-index/_settings
{
  "index.refresh_interval": "1s"
}
```

### 手动 Refresh

```bash
# 立即 Refresh（让数据可搜索）
POST /my-index/_refresh
```

::: warning 不要频繁手动 Refresh
每次 Refresh 都会生成新 Segment。频繁手动 Refresh 会导致 Segment 泛滥，严重影响写入和查询性能。批量导入场景下建议关闭自动 Refresh，导入完毕后一次性 Refresh。
:::

## Translog（事务日志）

Translog 是 ES 的 WAL（Write-Ahead Log），保证数据不丢失。

### Translog 的作用

内存 Buffer 中的数据是易失的。如果 ES 进程崩溃，Buffer 中的数据会丢失。Translog 在写入 Buffer 的同时记录操作，节点重启时重放 Translog 恢复数据。

### Translog 刷盘策略

```json
{
  "index.translog.durability": "async",      // "request"（每次请求刷盘）或 "async"（异步刷盘）
  "index.translog.sync_interval": "5s",      // async 模式下的同步间隔
  "index.translog.flush_threshold_size": "512mb"  // Translog 达到此大小触发 Flush
}
```

| 策略 | 可靠性 | 性能 |
|------|--------|------|
| `request` | 每次写入都 fsync Translog，不丢数据 | 较低 |
| `async` | 按间隔 fsync，崩溃可能丢失最近几秒数据 | 较高 |

::: tip 日志场景建议
日志场景对数据丢失容忍度较高，可以使用 `async` 模式提升写入性能。金融等对可靠性要求极高的场景必须使用 `request` 模式。
:::

## Segment 不可变性

Segment 文件一旦生成就是不可变的（immutable）。这意味着：

- **不需要锁**：并发读取 Segment 不需要任何同步机制。
- **高效缓存**：操作系统可以安全地将 Segment 缓存在文件系统缓存中。
- **删除标记**：删除文档不会真正移除数据，而是添加一个 `.del` 标记。查询时过滤掉被标记的文档。
- **更新 = 删除 + 新增**：更新文档实际上是标记旧文档为删除，写入新文档。

## Segment Merge

随着写入的进行，Segment 数量会不断增长。过多的 Segment 会导致：

- 每个查询需要搜索所有 Segment 后合并结果，开销大。
- 每个 Segment 占用文件句柄。

ES 后台自动执行 Segment Merge（合并），将多个小 Segment 合并为一个大 Segment。

### Merge 策略

ES 默认使用 `tiered` 合并策略（Lucene 的 TieredMergePolicy）：

```
每层最多 10 个 Segment
当某层 Segment 数量超过阈值时，选出部分 Segment 合并为更大的 Segment
合并后的 Segment 进入下一层
```

### Force Merge

对于不再写入的只读索引（如 ILM Warm 阶段），可以手动执行 Force Merge 减少 Segment 数量：

```bash
POST /my-index/_forcemerge?max_num_segments=1
```

::: warning Force Merge 注意事项
- Force Merge 是 CPU 和 I/O 密集型操作，建议在低峰期执行。
- 只对不再写入的索引执行。正在写入的索引执行 Force Merge 会浪费资源（新写入又会生成新 Segment）。
- `max_num_segments=1` 会将所有 Segment 合并为一个，适合 Warm/Cold 阶段。
:::

## 写入性能调优

### Bulk API

单条写入每次请求只能写一条文档，网络开销大。Bulk API 允许一次请求写入多条文档：

```bash
POST _bulk
{ "index": { "_index": "logs" } }
{ "message": "log entry 1", "@timestamp": "2026-01-15T10:00:00Z" }
{ "index": { "_index": "logs" } }
{ "message": "log entry 2", "@timestamp": "2026-01-15T10:00:01Z" }
```

### 写入优化清单

| 优化项 | 配置 | 效果 |
|--------|------|------|
| 增大 Refresh 间隔 | `refresh_interval: 30s` | 减少 Segment 生成频率 |
| 使用 Translog async | `translog.durability: async` | 减少 fsync 开销 |
| 增大 Translog 缓冲 | `translog.flush_threshold_size: 1gb` | 减少 Flush 频率 |
| 关闭副本写入 | `number_of_replicas: 0`，导入后恢复 | 避免双倍写入 |
| 使用 Bulk 批量写入 | 单次 5-15MB | 减少网络往返 |
| 减少字段数 | 避免不必要的字段 | 减少索引开销 |
| 使用自定义 Routing | `?routing=<value>` | 减少 Shard 数量 |

::: tip 批量导入最佳实践
导入大量数据时的推荐配置：
```json
PUT /my-index/_settings
{
  "index.refresh_interval": "-1",
  "index.number_of_replicas": 0,
  "index.translog.durability": "async"
}
```
导入完成后恢复正常配置，然后手动 `_refresh`。
:::
