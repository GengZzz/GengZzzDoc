# PostgreSQL

PostgreSQL 是功能最强大的开源关系型数据库，其 MVCC 实现、扩展性设计和 SQL 标准遵循度在开源数据库中首屈一指。这套文档从安装入门到高可用架构，覆盖 MVCC 机制、查询优化器、高级索引、流复制、分区表、扩展生态等核心主题。

## 学习路径

### 1. 入门

- [PostgreSQL 简介与安装](./introduction-install.md)：版本演进、单机/Docker 安装、psql 基础、pgAdmin。
- [SQL 基础](./sql-fundamentals.md)：SQL 语法特点、标识符规则、数据类型（SERIAL/UUID/ARRAY/RANGE）。

### 2. 高级 SQL

- [JSONB 操作](./jsonb-operations.md)：JSONB 存储结构、GIN 索引、jsonb 运算符、jsonb_path_query、与 JSON 类型对比。
- [CTE 与视图](./cte-views.md)：WITH 子句、递归 CTE、物化视图、Window Functions 深入。
- [全文搜索](./full-text-search.md)：tsvector/tsquery、GiST/GIN 索引、zhparser 中文分词、权重与相似度。

### 3. 索引

- [索引类型](./index-types.md)：B-Tree、Hash、GiST、SP-GiST、GIN、BRIN 各自适用场景，Partial Index、Expression Index。
- [索引优化](./index-optimization.md)：Index Scan vs Bitmap Scan vs Seq Scan、Index-only Scan、VACUUM 对索引的影响、索引膨胀重建。

### 4. 事务与 MVCC

- [MVCC 机制](./mvcc-mechanism.md)：HeapTuple 元组结构（xmin/xmax）、快照隔离实现、可重复读 vs 可串行化、SSI。
- [VACUUM 机制](./vacuum-mechanism.md)：VACUUM/VACUUM FULL、Dead Tuple 清理、autovacuum 调优、Freeze 防 Wraparound、膨胀处理。

### 5. 查询优化

- [查询计划器](./query-planner.md)：EXPLAIN 输出详解、成本估算、统计信息、直方图、连接顺序优化。
- [查询性能调优](./query-performance.md)：常见慢查询模式、N+1 查询问题、LIMIT OFFSET 性能、CTE 优化器行为变化。

### 6. 扩展与编程

- [PL/pgSQL](./plpgsql.md)：存储过程/函数、触发器、异常处理、RETURN QUERY。
- [扩展生态](./extensions.md)：PostGIS 空间查询、pg_trgm 模糊搜索、pg_stat_statements 性能分析。

### 7. 高可用与复制

- [复制机制](./replication.md)：WAL 机制、流复制（Physical/Logical）、同步模式、级联复制、复制槽。
- [高可用方案](./high-availability.md)：Patroni 自动故障转移、PgBouncer 连接池、pgpool-II 读写分离。

### 8. 分区与大数据

- [分区表](./partitioning.md)：Range/Hash/List 分区、Partition Pruning、子分区、分区管理。
- [大数据处理](./large-data.md)：大表优化、TOAST 机制、并行查询、FDW、TimescaleDB。

### 9. 运维与安全

- [运维与安全](./operations-security.md)：备份恢复、PITR、认证配置、Row Level Security、审计日志。
