# MongoDB

MongoDB 是面向文档的分布式数据库，以 BSON 格式存储数据，天然支持灵活的 Schema 和水平扩展。这套文档从文档模型设计到集群架构运维，覆盖 MongoDB 核心知识体系，包含聚合管道、索引策略、副本集、分片集群、Change Streams 等开发与运维中的关键主题。

## 学习路径

### 1. 入门

- [MongoDB 简介与安装](./introduction-install.md)：MongoDB 版本演进、单机/副本集/Docker 安装、mongosh 基础操作。
- [文档模型](./document-model.md)：文档模型 vs 关系模型、BSON 类型、_id 设计、嵌入与引用的权衡。

### 2. CRUD 与查询

- [CRUD 操作深入](./crud-operations.md)：插入/查询/更新/删除深入、批量操作、写关注、事务性写入。
- [查询、投影与排序](./query-projection-sort.md)：查询运算符、投影、排序、分页（skip 性能陷阱）、正则表达式。
- [聚合管道](./aggregation-pipeline.md)：管道阶段（$match/$group/$lookup/$unwind/$facet/$bucket）、执行计划、内存限制、$merge/$out 输出。

### 3. 索引

- [索引类型](./index-types.md)：单字段/复合/多键/文本/地理空间/TTL/部分索引/隐藏索引。
- [索引策略](./index-strategy.md)：ESR 规则（Equality/Sort/Range）、覆盖查询、索引选择性、索引交集。
- [查询优化](./query-optimization.md)：explain() 执行计划分析、COLLSCAN vs IXSCAN、索引命中判断、慢查询分析。

### 4. 架构与部署

- [副本集](./replica-set.md)：副本集架构、Raft 选举、Priority/Votes/Hidden 节点、Oplog 与同步、Rollback 场景、读偏好策略。
- [分片集群](./sharding-cluster.md)：分片架构、Shard Key 选择（Hashed/Range）、Chunk 分裂与迁移、Balancer、热点问题、Zone Sharding。
- [事务](./transactions.md)：多文档事务、Snapshot ReadConcern、性能影响、最佳实践（尽量避免）。

### 5. 存储引擎与数据管理

- [存储引擎](./storage-engines.md)：WiredTiger 架构（B+ Tree + LSM Tree）、Cache 与压缩、Checkpoint、Journal 刷盘策略。
- [文档建模](./schema-design.md)：文档建模模式（Subset Pattern、Extended Reference、Bucket Pattern）、多态 Schema、版本迁移。

### 6. 运维与实践

- [Change Streams](./change-streams.md)：Change Streams 原理、Resume Token、Watch Pipeline、与 Kafka Connect 集成、实时数据同步方案。
- [备份与恢复](./backup-restore.md)：mongodump/mongorestore、文件快照备份、时间点恢复、Oplog 备份策略。
- [监控与安全](./monitoring-security.md)：关键指标（ops/connections/replication lag）、Profiler、Atlas 监控、认证授权、加密。
