# Redis

Redis（Remote Dictionary Server）是一个开源的内存数据结构存储，支持 String、List、Hash、Set、ZSet 等多种数据结构，广泛用于缓存、消息队列、分布式锁等场景。Redis 的单线程事件循环模型、丰富的数据结构和灵活的持久化机制，使其成为后端开发中不可或缺的中间件。

这套文档从 Redis 的底层数据结构实现出发，覆盖持久化、高可用集群、分布式锁、缓存模式等核心主题，结合日常开发中遇到的实际问题和解决方案。

## 学习路径

### 1. 入门

- [Redis 简介与安装](./introduction-install.md)：Redis 特性、单机/集群/Docker 安装、redis-cli 基础操作。
- [数据结构与编码](./data-structures.md)：5 种基本数据类型及底层编码切换（embstr/raw、ziplist/listpack、skiplist）。

### 2. 数据结构深入

- [String 与 SDS](./string-implementation.md)：SDS 结构对比 C 字符串、int/embstr/raw 编码切换、bitmap 位操作、分布式 ID 场景。
- [List 与阻塞队列](./list-implementation.md)：ziplist 到 listpack/quicklist 的演进、阻塞弹出 BRPOP、消息队列场景。
- [Hash、Set 与 ZSet](./hash-set-zset.md)：hashtable 渐进式 rehash、ZSet skiplist + hashtable 双编码、排行榜实现。
- [高级数据结构](./advanced-structures.md)：HyperLogLog 基数统计、GEO 地理位置、Stream 消费者组与消息确认。

### 3. 持久化

- [RDB 持久化](./rdb-persistence.md)：RDB 原理、fork + COW 机制、BGSAVE 触发策略、RDB 文件格式。
- [AOF 持久化](./aof-persistence.md)：AOF 写入策略（always/everysec/no）、AOF 重写原理、RDB-AOF 混合持久化。

### 4. 高可用与集群

- [主从复制](./replication.md)：全量/增量同步、PSYNC 协议、无盘复制、过期 key 传播。
- [Sentinel 哨兵](./sentinel.md)：Sentinel 架构、主观/客观下线、Raft 选举、故障转移流程。
- [Redis Cluster](./cluster.md)：16384 槽位分配、Gossip 协议、MOVED/ASK 重定向、槽迁移。

### 5. 应用场景与实践

- [分布式锁](./distributed-lock.md)：SETNX + 过期时间、Redlock 算法、Redisson 实现、Fencing Token。
- [缓存模式](./cache-patterns.md)：缓存穿透/击穿/雪崩、布隆过滤器、逻辑过期、延迟双删、Canal 监听。
- [Pipeline 与 Lua](./pipeline-lua.md)：Pipeline 批量命令、Lua 脚本原子性、MULTI/EXEC 事务、Watch 乐观锁。

### 6. 运维与调优

- [内存管理](./memory-management.md)：8 种淘汰策略、内存碎片率、大 Key 发现与拆分、热 Key 问题。
- [监控与调优](./monitoring-tuning.md)：INFO 关键指标、慢查询日志、Benchmark 压测、生产配置建议。
