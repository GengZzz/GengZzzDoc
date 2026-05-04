# 存储引擎

MongoDB 支持多种存储引擎，但自 3.2 版本起 WiredTiger 成为默认引擎。理解 WiredTiger 的内部架构对性能调优至关重要。

## WiredTiger 架构

WiredTiger 是一个高性能的存储引擎，结合了 B+ Tree 和 LSM Tree 的优势，提供文档级并发控制和多种压缩算法。

### 整体架构

```
┌─────────────────────────────────────────────────┐
│                 MongoDB Server                    │
│            (查询解析、执行计划、聚合)               │
└──────────────┬──────────────────────────────────┘
               │ Document-level Locking
┌──────────────▼──────────────────────────────────┐
│              WiredTiger Engine                    │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │          Data: B+ Tree                       │ │
│  │  （主数据存储，按 _id 组织）                   │ │
│  └─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │          Index: B+ Tree                       │ │
│  │  （二级索引，按索引键组织）                    │ │
│  └─────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  WT Cache    │  │  Journal (Write-ahead Log) │ │
│  │ (未压缩数据)  │  │  (崩溃恢复保障)             │ │
│  └──────────────┘  └───────────────────────────┘ │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│              文件系统 (推荐 XFS)                    │
│  *.wt 数据文件    WiredTiger.wt 元数据文件         │
│  journal/ 日志目录                                 │
└─────────────────────────────────────────────────┘
```

### B+ Tree

WiredTiger 使用 B+ Tree 作为主要数据和索引的存储结构：

- 数据文件以 B+ Tree 组织，叶节点存储实际文档数据
- 索引是独立的 B+ Tree，叶节点存储索引键 + 指向数据的引用
- 内部节点存储分隔键（Separator Key），用于快速定位
- 叶节点之间通过双向链表连接，支持高效的范围扫描

### 并发控制

WiredTiger 使用 **MVCC（多版本并发控制）** 实现文档级并发：

- 读操作不阻塞写操作，写操作不阻塞读操作
- 每个读操作获取一个时间戳（Snapshot），只能看到该时间戳之前的数据
- 写操作获取文档级锁（Document-level Lock），不再使用全局锁或集合锁
- 相比 MMAPv1 的 Collection-level Lock，并发性能大幅提升

## Cache 与压缩

### WiredTiger Cache

```yaml
# mongod.conf
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4   # 默认为 (RAM - 1GB) * 50%，最少 256MB
```

Cache 的工作机制：

```
写入流程：
应用写入 → WiredTiger Cache（内存中修改）→ Checkpoint 定期刷盘 → Journal 记录
                                              ↓
                                   数据文件（磁盘上的 .wt 文件）

读取流程：
读请求 → Cache 命中？ → 直接返回
       → Cache 未命中 → 从磁盘读取到 Cache → 返回
```

::: tip Cache 大小配置
WiredTiger Cache 默认占用可用内存的 50%。剩余内存留给：
- 文件系统缓存（操作系统级别的磁盘缓存）
- 其他 mongod 线程（连接、排序、聚合等）

如果服务器只有 MongoDB，Cache 可以设到 60-70%。如果与其他服务共存，保持 50% 或更低。
:::

### 压缩算法

WiredTiger 支持三级压缩：

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: snappy     # 集合数据压缩（默认 snappy）
    indexConfig:
      prefixCompression: true     # 索引前缀压缩
    journalConfig:
      compressor: snappy          # Journal 日志压缩
```

| 压缩算法 | 压缩比 | CPU 开销 | 适用场景 |
|---------|--------|---------|---------|
| snappy | 中等 | 低 | 默认，平衡性能与空间 |
| zstd | 高 | 中等 | 磁盘紧张、数据量大的场景 |
| zlib | 最高 | 高 | 冷数据归档 |
| none | 无 | 无 | 不压缩（纯测试场景） |

```javascript
// 集合级别指定压缩算法
db.createCollection("logs", { storageEngine: { wiredTiger: { configString: "block_compressor=zstd" } } })
```

## Checkpoint 机制

Checkpoint 是 WiredTiger 将内存中的脏数据（Dirty Data）写入磁盘的周期性操作。

### 工作原理

```
60 秒间隔（默认）
  ↓
WiredTiger 开始 Checkpoint
  ↓
将 Cache 中所有脏页写入 .wt 数据文件
  ↓
记录 Checkpoint 元数据（哪些数据块已被持久化）
  ↓
Checkpoint 完成，旧的 Journal 日志可以被截断
```

```yaml
# 调整 Checkpoint 间隔
storage:
  wiredTiger:
    engineConfig:
      checkpoint: (wait=60, logSize=2GB)
      # wait=60：每 60 秒执行一次 Checkpoint
      # logSize=2GB：Journal 达到 2GB 时强制 Checkpoint
```

::: tip Checkpoint 与性能
Checkpoint 期间会有短暂的 I/O 峰值。如果 Checkpoint 间隔太短（如 10 秒），频繁的磁盘写入会降低性能。如果太长（如 10 分钟），崩溃恢复需要重放更多 Journal 日志。60 秒是经过优化的默认值，大多数场景不需要修改。
:::

## Journal 刷盘策略

Journal（预写日志）保证数据的持久性，即使 Checkpoint 之间的数据丢失也能通过 Journal 恢复。

### Journal 写入流程

```
写操作 → WiredTiger Cache（内存修改）
       → Journal（同步写入磁盘）
       → 返回成功
       
Checkpoint 时：
Cache 脏数据 → 写入 .wt 数据文件
旧 Journal 日志 → 被截断（因为数据已持久化到数据文件）
```

### Journal 配置

```yaml
storage:
  journal:
    enabled: true
    commitIntervalMs: 100    # Journal 刷盘间隔（默认 100ms）
```

| 配置 | 含义 | 数据安全 | 性能 |
|------|------|---------|------|
| `commitIntervalMs: 100` | 每 100ms 刷盘一次 | 最多丢 100ms 数据 | 高 |
| `commitIntervalMs: 0` | 每次操作都刷盘 | 不丢数据 | 低 |

::: warning 关闭 Journal 的风险
`journal.enabled: false` 可以提升写入性能，但崩溃时可能丢失最近一个 Checkpoint 之后的所有数据。**生产环境绝不能关闭 Journal。** 唯一例外是某些纯分析场景的数据副本。
:::

## 其他存储引擎

### In-Memory（已弃用，Enterprise 版本）

所有数据存储在内存中，不写磁盘。适用于极高性能要求但可以容忍数据丢失的场景（如缓存、会话）。

### 历史引擎 MMAPv1（已移除）

MongoDB 3.2 之前的默认引擎，使用内存映射文件和集合级锁。3.2+ 已被 WiredTiger 完全取代。

## 存储引擎选择建议

| 场景 | 推荐引擎 | 原因 |
|------|---------|------|
| 通用 OLTP | WiredTiger | 文档级锁、压缩、MVCC |
| 时间序列 | WiredTiger | MongoDB 5.0+ 原生时间序列集合 |
| 内存缓存 | Redis（外部） | MongoDB 不适合纯缓存场景 |
| 分析型 | WiredTiger + Column Store | MongoDB 6.0+ Column Store 索引 |

::: tip 实践总结
除非有特殊需求，一律使用 WiredTiger。它的默认配置已经很优秀，日常调优只需关注 `cacheSizeGB` 和压缩算法。把精力放在文档建模和索引优化上，收益远大于存储引擎调优。
:::
