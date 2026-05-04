# Elasticsearch

Elasticsearch 是一个基于 Lucene 构建的分布式搜索与分析引擎。这套文档从核心原理到生产实践，覆盖倒排索引、分词器、分布式架构、写入流程、搜索机制、集群管理、性能调优等开发者需要掌握的知识体系。

## 学习路径

### 1. 入门

- [Elasticsearch 简介与安装](./introduction-install.md)：ES 的定位、单机/Docker/K8s 安装、Kibana 配置、基本 REST API 操作。
- [核心概念](./basic-concepts.md)：集群/节点/索引/文档/字段的层级关系、倒排索引核心思想、与关系型数据库的概念映射。

### 2. 索引与映射

- [映射与分词](./mapping-analysis.md)：Field Type（text/keyword/numeric/date/object/nested）、Dynamic Mapping 规则、Analyzer 三阶段流水线、IK 中文分词配置。
- [索引设计](./index-design.md)：索引模板、Rollover 索引（日志场景）、别名管理、ILM 生命周期管理、分片数规划。

### 3. 写入与存储

- [写入流程](./write-process.md)：Client 到 Primary Shard 的完整链路、Refresh/Flush/Translog 机制、Segment 不可变性、Segment Merge 策略。
- [存储引擎](./storage-engines.md)：Lucene 存储结构、倒排索引实现细节（FST、跳表）、Doc Values 列式存储、Stored Fields、Term Vector。

### 4. 搜索深入

- [搜索与查询](./search-queries.md)：Query DSL 深入（match/term/range/bool）、Query Context vs Filter Context、相关性评分原理（TF-IDF 到 BM25）、Explain API 调试。
- [聚合分析](./aggregations.md)：Bucket/Metric/Pipeline 三类聚合、聚合精度、嵌套聚合、深度分页问题。

### 5. 分布式架构

- [分布式架构](./distributed-architecture.md)：集群发现与 Master 选举、脑裂问题、Cluster State、分片分配策略、Shard Awareness。
- [集群运维](./cluster-operations.md)：滚动重启、节点扩缩容、Rebalance、Hot-Warm-Cold 架构、跨集群复制（CCR）、Snapshot/Restore。

### 6. 性能调优与实践

- [性能调优](./performance-tuning.md)：深分页方案（Search After / Scroll / PIT）、Routing 自定义路由、缓存策略、索引预加载。
- [实战场景](./real-world-scenarios.md)：日志检索（ELK Stack）、商品搜索（拼写纠错/同义词/高亮/自动补全）、监控告警、安全（X-Pack / RBAC）。

### 7. 与数据库协作

- [ES + MySQL 同步](./es-mysql-sync.md)：双写方案、Canal 监听 Binlog 同步、数据一致性保障、读写分离策略。
- [数据建模](./data-modeling.md)：嵌套对象 vs 父子文档 vs 宽表、Denormalization 设计原则、`_source` 与 Stored Fields 的存储权衡。
