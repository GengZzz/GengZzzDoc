# MySQL

MySQL 是全球使用最广泛的开源关系型数据库之一。这套文档从基础操作到架构实践，覆盖 MySQL 核心知识体系，包含索引、事务、锁、查询优化、分库分表、主从复制等开发中常遇到的问题。

## 学习路径

### 1. 入门

- [MySQL 简介与安装](./introduction-setup.md)：MySQL 版本演进、安装配置、客户端连接。
- [SQL 基础操作](./sql-basics.md)：CRUD 基本语句、SQL 语句分类。
- [数据库与表管理](./database-table-management.md)：创建/删除数据库、表结构管理。

### 2. SQL 进阶

- [数据类型详解](./data-types.md)：整型、浮点、字符串、日期时间、JSON 类型的选择与陷阱。
- [DDL 数据定义](./ddl.md)：CREATE/ALTER/DROP TABLE，约束定义。
- [DML 数据操作](./dml.md)：INSERT/UPDATE/DELETE 高级用法、批量操作优化。
- [DQL 数据查询](./dql.md)：SELECT 高级语法、聚合、分组、窗口函数。

### 3. 表设计

- [范式与反范式](./normalization.md)：三大范式、反范式化的权衡。
- [表结构设计实践](./table-design.md)：主键选择、软删除、时间字段、枚举 vs 字典表。
- [字符集与排序规则](./charset-collation.md)：utf8 vs utf8mb4、collation 对查询的影响。

### 4. 索引技术

- [索引原理](./index-principles.md)：B+ 树结构、为什么 MySQL 选择 B+ 树、Hash 索引。
- [聚簇索引与二级索引](./clustered-secondary-index.md)：InnoDB 索引组织表、回表查询。
- [索引优化策略](./index-optimization.md)：最左前缀、索引选择性、联合索引设计。
- [覆盖索引与索引下推](./covering-index-icp.md)：减少回表、ICP 优化原理。
- [索引失效与排查](./index-failure.md)：隐式转换、函数操作、OR 条件等导致索引失效的场景。

### 5. 事务与锁

- [事务基础与 ACID](./transaction-basics.md)：原子性、一致性、隔离性、持久性。
- [隔离级别](./isolation-levels.md)：READ UNCOMMITTED / READ COMMITTED / REPEATABLE READ / SERIALIZABLE。
- [MVCC 机制](./mvcc.md)：版本链、ReadView、快照读 vs 当前读。
- [锁类型与锁策略](./locking.md)：行锁、表锁、间隙锁、临键锁、意向锁。
- [死锁分析与处理](./deadlock.md)：死锁场景、排查方法、规避策略。

### 6. 查询优化

- [EXPLAIN 执行计划](./explain.md)：各字段含义、type 判断、Extra 信息。
- [慢查询分析](./slow-query.md)：慢查询日志、pt-query-digest、常见优化手段。
- [JOIN 优化](./join-optimization.md)：NLJ / BNL / Hash Join、JOIN 顺序优化。
- [子查询与优化器](./subquery-optimizer.md)：子查询优化、成本模型、统计信息。

### 7. 存储引擎

- [InnoDB 存储引擎](./innodb.md)：架构、行格式、Change Buffer、自适应 Hash。
- [MyISAM 与对比](./myisam-comparison.md)：MyISAM 特点、适用场景、与 InnoDB 对比。
- [Buffer Pool 机制](./buffer-pool.md)：缓冲池原理、LRU 算法、预读机制。

### 8. 日志系统

- [Redo Log](./redo-log.md)：WAL 机制、刷盘策略、两阶段提交。
- [Undo Log](./undo-log.md)：回滚日志、MVCC 支撑、purge 机制。
- [Binlog](./binlog.md)：归档日志、主从同步基础、binlog 格式对比。

### 9. 架构实践

- [分库分表](./sharding.md)：垂直拆分、水平拆分、分片策略、分布式 ID、跨库查询。
- [主从复制](./replication.md)：binlog 同步流程、半同步、GTID、延迟问题。
- [读写分离](./read-write-split.md)：实现方案、主从延迟问题、强制走主库。

### 10. 运维与安全

- [备份与恢复](./backup-recovery.md)：逻辑备份、物理备份、增量备份、恢复流程。
- [权限管理](./privileges.md)：用户管理、权限体系、最小权限原则。
- [监控与调优实践](./monitoring-tuning.md)：关键指标、Performance Schema、参数调优。
