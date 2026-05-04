# MySQL 监控与调优

## 关键性能指标

### QPS / TPS

QPS（Queries Per Second）和 TPS（Transactions Per Second）是最基本的吞吐量指标。

```sql
-- 查看各种命令的执行次数
SHOW GLOBAL STATUS LIKE 'Com_select';     -- SELECT 执行次数
SHOW GLOBAL STATUS LIKE 'Com_insert';     -- INSERT 执行次数
SHOW GLOBAL STATUS LIKE 'Com_update';     -- UPDATE 执行次数
SHOW GLOBAL STATUS LIKE 'Com_delete';     -- DELETE 执行次数

-- 计算 QPS（每秒查询数）
-- QPS = Com_select 增量 / 时间间隔

-- 计算 TPS（每秒事务数）
-- TPS = (Com_insert + Com_update + Com_delete) 增量 / 时间间隔
```

通过脚本持续采样计算实时 QPS/TPS：

```bash
#!/bin/bash
# qps_monitor.sh - 每秒采样一次

mysql -u monitor -p -e "SHOW GLOBAL STATUS LIKE 'Com_select'" | awk '/Com_select/{print $2}'
# 记录两次采样的差值，除以时间间隔
```

在 SQL 中直接计算（两次采样间隔 1 秒）：

```sql
-- 第一次采样
SELECT VARIABLE_VALUE INTO @select1 FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Com_select';

-- 等待 1 秒（或外部脚本控制间隔）

-- 第二次采样
SELECT VARIABLE_VALUE INTO @select2 FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Com_select';

-- 计算 QPS
SELECT @select2 - @select1 AS qps;
```

### 连接数

```sql
-- 当前连接数
SHOW GLOBAL STATUS LIKE 'Threads_connected';

-- 当前正在执行查询的线程数（区别于空闲连接）
SHOW GLOBAL STATUS LIKE 'Threads_running';

-- 历史最大连接数
SHOW GLOBAL STATUS LIKE 'Max_used_connections';

-- 最大连接数配置
SHOW VARIABLES LIKE 'max_connections';

-- 连接使用率
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status
   WHERE VARIABLE_NAME = 'Threads_connected') AS current_connections,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_variables
   WHERE VARIABLE_NAME = 'max_connections') AS max_connections,
  ROUND(
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Threads_connected') * 100.0 /
    (SELECT VARIABLE_VALUE FROM performance_schema.global_variables
     WHERE VARIABLE_NAME = 'max_connections'), 2
  ) AS usage_percent;
```

::: warning 连接数告警阈值
当连接使用率超过 80% 时就应该发出告警。连接数打满后，新连接会被拒绝（报 `Too many connections` 错误），所有新业务请求都会失败。此时不应盲目调大 `max_connections`，因为更多连接意味着更多内存消耗和更严重的锁竞争，反而可能导致数据库崩溃。应优先排查连接泄漏或慢查询导致的连接堆积。
:::

### 缓冲池命中率

InnoDB Buffer Pool 命中率直接反映了缓存效率。命中率低意味着频繁从磁盘读取数据，性能会急剧下降。

```sql
-- InnoDB Buffer Pool 读请求统计
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests';  -- 逻辑读（从内存）
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_reads';           -- 物理读（从磁盘）

-- 计算命中率
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status
   WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests') AS logical_reads,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status
   WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') AS physical_reads,
  ROUND(
    (1 - (
      (SELECT VARIABLE_VALUE FROM performance_schema.global_status
       WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads') /
      (SELECT VARIABLE_VALUE FROM performance_schema.global_status
       WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests')
    )) * 100, 4
  ) AS hit_rate_percent;
```

::: tip 命中率标准
- **99% 以上**：优秀，数据基本都在内存中
- **95%~99%**：正常，大部分热数据在内存中
- **90%~95%**：需要关注，可能 Buffer Pool 偏小
- **低于 90%**：严重，必须排查原因（Buffer Pool 太小？有大量全表扫描？冷数据冲击？）
:::

### 锁等待

```sql
-- 行锁等待次数
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits';

-- 行锁等待总时间（毫秒）
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_time';

-- 行锁平均等待时间
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_time_avg';

-- 当前锁等待详情
SELECT * FROM information_schema.INNODB_LOCK_WAITS;

-- 当前持有的锁
SELECT * FROM information_schema.INNODB_LOCKS;

-- InnoDB 锁等待超时配置
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';  -- 默认 50 秒

-- 查看正在等待锁的事务
SELECT
  r.trx_id AS waiting_trx_id,
  r.trx_mysql_thread_id AS waiting_thread,
  r.trx_query AS waiting_query,
  b.trx_id AS blocking_trx_id,
  b.trx_mysql_thread_id AS blocking_thread,
  b.trx_query AS blocking_query
FROM information_schema.INNODB_LOCK_WAITS w
JOIN information_schema.INNODB_TRX b ON b.trx_id = w.blocking_trx_id
JOIN information_schema.INNODB_TRX r ON r.trx_id = w.requesting_trx_id;
```

### 慢查询数

```sql
-- 慢查询总数（自上次启动）
SHOW GLOBAL STATUS LIKE 'Slow_queries';

-- 慢查询阈值（秒）
SHOW VARIABLES LIKE 'long_query_time';

-- 慢查询日志是否开启
SHOW VARIABLES LIKE 'slow_query_log';

-- 慢查询日志文件路径
SHOW VARIABLES LIKE 'slow_query_log_file';

-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 超过 1 秒的查询记录为慢查询

-- 未使用索引的查询也记录
SET GLOBAL log_queries_not_using_indexes = ON;
```

## 状态变量查看

MySQL 的状态变量分为两种：全局（GLOBAL）和会话级（SESSION）。

```sql
-- 查看所有全局状态变量
SHOW GLOBAL STATUS;

-- 模糊搜索
SHOW GLOBAL STATUS LIKE 'Innodb%';
SHOW GLOBAL STATUS LIKE '%lock%';
SHOW GLOBAL STATUS LIKE '%connections%';

-- 在 MySQL 8.0+ 中，推荐使用 performance_schema
SELECT * FROM performance_schema.global_status
WHERE VARIABLE_NAME LIKE 'Innodb%';

-- 比较两次快照的增量（实际监控中常用）
-- 创建辅助表存储上次快照
CREATE TABLE IF NOT EXISTS status_snapshot (
  snapshot_time DATETIME,
  variable_name VARCHAR(64),
  variable_value BIGINT
);

-- 存储当前快照
INSERT INTO status_snapshot
SELECT NOW(), VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status;

-- 一段时间后比较增量
SELECT
  curr.variable_name,
  curr.variable_value - prev.variable_value AS delta,
  TIMESTAMPDIFF(SECOND, prev.snapshot_time, curr.snapshot_time) AS seconds,
  ROUND((curr.variable_value - prev.variable_value) /
    TIMESTAMPDIFF(SECOND, prev.snapshot_time, curr.snapshot_time), 2) AS per_second
FROM performance_schema.global_status curr
JOIN status_snapshot prev ON prev.variable_name = curr.variable_name
WHERE curr.variable_name IN (
  'Com_select', 'Com_insert', 'Com_update', 'Com_delete',
  'Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_reads',
  'Threads_connected', 'Threads_running'
)
ORDER BY variable_name;
```

## Performance Schema

Performance Schema 是 MySQL 内置的性能监控框架，以极低的开销采集数据库运行时的各项指标。

### events_statements_summary_by_digest：SQL 统计

这是最有用的视图之一，按 SQL 指纹（digest）汇总执行统计信息。

```sql
-- 查看执行次数最多的 Top 20 SQL
SELECT
  SCHEMA_NAME AS db,
  DIGEST_TEXT AS sql_fingerprint,
  COUNT_STAR AS exec_count,
  ROUND(SUM_TIMER_WAIT / 1e12, 3) AS total_time_sec,
  ROUND(AVG_TIMER_WAIT / 1e12, 3) AS avg_time_sec,
  ROUND(MAX_TIMER_WAIT / 1e12, 3) AS max_time_sec,
  SUM_ROWS_EXAMINED AS total_rows_examined,
  SUM_ROWS_SENT AS total_rows_sent,
  SUM_NO_INDEX_USED AS no_index_count,
  FIRST_SEEN,
  LAST_SEEN
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME IS NOT NULL
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20\G

-- 找出没有使用索引的 SQL
SELECT
  DIGEST_TEXT AS sql_fingerprint,
  COUNT_STAR AS exec_count,
  SUM_NO_INDEX_USED AS no_index_count,
  SUM_ROWS_EXAMINED AS total_rows_examined,
  SUM_ROWS_SENT AS total_rows_sent
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0
  AND SCHEMA_NAME = 'mydb'
ORDER BY SUM_NO_INDEX_USED DESC
LIMIT 20;

-- 扫描行数远大于返回行数的 SQL（可能是全表扫描或索引效率低）
SELECT
  DIGEST_TEXT AS sql_fingerprint,
  COUNT_STAR AS exec_count,
  SUM_ROWS_EXAMINED AS examined,
  SUM_ROWS_SENT AS sent,
  ROUND(SUM_ROWS_EXAMINED / NULLIF(SUM_ROWS_SENT, 0), 0) AS examine_send_ratio
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_ROWS_SENT > 0
  AND SUM_ROWS_EXAMINED / SUM_ROWS_SENT > 1000
ORDER BY examine_send_ratio DESC
LIMIT 20;

-- 清空统计信息（比如版本发布后重新统计）
TRUNCATE TABLE performance_schema.events_statements_summary_by_digest;
```

### file_summary_by_event_name：IO 统计

```sql
-- 文件 IO 统计（了解数据文件和日志文件的读写情况）
SELECT
  EVENT_NAME,
  COUNT_STAR AS io_operations,
  ROUND(SUM_TIMER_WAIT / 1e9, 2) AS total_time_ms,
  ROUND(SUM_NUMBER_OF_BYTES_READ / 1024 / 1024, 2) AS read_mb,
  ROUND(SUM_NUMBER_OF_BYTES_WRITE / 1024 / 1024, 2) AS write_mb
FROM performance_schema.file_summary_by_event_name
WHERE EVENT_NAME LIKE 'wait/io/file/%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

### table_io_waits_summary_by_table：表级 IO

```sql
-- 哪些表的 IO 操作最频繁
SELECT
  OBJECT_SCHEMA AS db,
  OBJECT_NAME AS table_name,
  COUNT_STAR AS total_operations,
  COUNT_READ AS read_ops,
  COUNT_WRITE AS write_ops,
  COUNT_FETCH AS fetch_ops,
  COUNT_INSERT AS insert_ops,
  COUNT_UPDATE AS update_ops,
  COUNT_DELETE AS delete_ops,
  ROUND(SUM_TIMER_WAIT / 1e12, 3) AS total_time_sec
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'sys', 'information_schema')
ORDER BY COUNT_STAR DESC
LIMIT 20;

-- 哪些表有索引未命中的情况
SELECT
  OBJECT_SCHEMA AS db,
  OBJECT_NAME AS table_name,
  COUNT_READ AS read_ops,
  COUNT_WRITE AS write_ops,
  ROUND(SUM_TIMER_READ / 1e12, 3) AS read_time_sec,
  ROUND(SUM_TIMER_WRITE / 1e12, 3) AS write_time_sec
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA = 'mydb'
ORDER BY SUM_TIMER_WAIT DESC;
```

## Sys Schema

Sys Schema 是基于 Performance Schema 构建的预置监控视图集合，提供了更易读的输出格式。

```sql
-- 启用 sys schema（MySQL 5.7+ 默认安装）
USE sys;

-- 查看当前连接和执行的 SQL
SELECT * FROM sys.processlist;

-- 查看冗余索引（可以安全删除的索引）
SELECT * FROM sys.schema_redundant_indexes;

-- 查看未使用的索引
SELECT * FROM sys.schema_unused_indexes;

-- 查看全表扫描的表
SELECT * FROM sys.schema_tables_with_full_table_scans
ORDER BY rows_full_scanned DESC;

-- 查看语句分析（已排序）
SELECT * FROM sys.statements_with_sorting
ORDER BY no_sort_used_count DESC
LIMIT 10;

-- 查看有临时表的语句
SELECT * FROM sys.statements_with_temp_tables
ORDER BY tmp_tables_to_disk_pct DESC
LIMIT 10;

-- 查看等待事件最多的语句
SELECT * FROM sys.statements_with_runtimes_in_95th_percentile
ORDER BY avg_latency DESC;

-- InnoDB 缓冲池使用情况
SELECT * FROM sys.innodb_buffer_stats_by_table
ORDER BY pages DESC
LIMIT 20;

-- 表的读写统计和锁等待
SELECT * FROM sys.schema_table_statistics_with_buffer
ORDER BY rows_fetched DESC
LIMIT 20;
```

## 关键参数调优

### innodb_buffer_pool_size

这是 InnoDB 最重要的参数，决定了 InnoDB 可以在内存中缓存多少数据和索引。

```sql
-- 查看当前值
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- 查看 Buffer Pool 状态
SHOW STATUS LIKE 'Innodb_buffer_pool%';

-- 推荐设置（专用 MySQL 服务器）
-- innodb_buffer_pool_size = 物理内存的 60%~80%
-- 例：32GB 内存的服务器，设置为 20GB~25GB

-- 在线修改（MySQL 5.7+ 支持动态调整，无需重启）
SET GLOBAL innodb_buffer_pool_size = 21474836480;  -- 20GB

-- 查看 Buffer Pool 各指标
SELECT
  FORMAT(pages_total * page_size / 1024 / 1024 / 1024, 2) AS total_gb,
  FORMAT(pages_data * page_size / 1024 / 1024 / 1024, 2) AS data_gb,
  FORMAT(pages_free * page_size / 1024 / 1024 / 1024, 2) AS free_gb,
  FORMAT(pages_misc * page_size / 1024 / 1024 / 1024, 2) AS misc_gb,
  FORMAT(pages_dirty * page_size / 1024 / 1024 / 1024, 2) AS dirty_gb
FROM (
  SELECT
    VARIABLE_VALUE AS pages_total,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_data') AS pages_data,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_free') AS pages_free,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_misc') AS pages_misc,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_dirty') AS pages_dirty,
    (SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'Innodb_page_size') AS page_size
  FROM performance_schema.global_status
  WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total'
) t;
```

::: tip Buffer Pool 配置经验
- 专用数据库服务器：物理内存的 60%~80%
- 共享服务器（数据库与其他服务共存）：物理内存的 40%~50%
- Buffer Pool 应大于数据+索引总大小（完全缓存热数据）
- 多实例场景：每个实例分别设置，总和不超过物理内存
- 配置多个 Buffer Pool 实例可以减少并发争用：`innodb_buffer_pool_instances = 8`（每个实例至少 1GB）
:::

### innodb_log_file_size

redo log 文件大小影响恢复时间和写入性能。写入量大的场景需要更大的 redo log。

```sql
-- 查看当前配置
SHOW VARIABLES LIKE 'innodb_log_file_size';       -- 单个文件大小
SHOW VARIABLES LIKE 'innodb_log_files_in_group';  -- 文件数量（通常为 2）
-- 总 redo log 大小 = innodb_log_file_size * innodb_log_files_in_group

-- 查看当前 redo log 使用情况
SHOW ENGINE INNODB STATUS\G
-- 关注 LOG 部分：
-- Log sequence number: 1234567890
-- Log flushed up to:   1234567800
-- Pages flushed up to: 1234567500

-- 经验公式：
-- redo log 总大小 ≈ 每小时写入量（让检查点间隔约 1 小时）
-- 常见配置：
-- 写入量小的业务: 1GB~2GB
-- 写入量中等: 4GB
-- 写入量大: 8GB（最大支持 512GB，但太大恢复时间也长）
```

::: danger 修改 innodb_log_file_size 的步骤
innodb_log_file_size 不能在线修改，需要重启。步骤：
1. 确保数据已完全写入磁盘：`SET GLOBAL innodb_fast_shutdown = 0;`
2. 停止 MySQL
3. 修改 my.cnf 中的 `innodb_log_file_size`
4. 删除旧的 redo log 文件（ib_logfile0, ib_logfile1）
5. 启动 MySQL（会自动创建新的 redo log 文件）
6. 验证启动成功且数据完整
:::

### innodb_flush_log_at_trx_commit

这个参数控制事务提交时 redo log 的刷新策略，是**安全性与性能之间最重要的权衡点**。

```sql
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
```

| 值 | 行为 | 安全性 | 性能 |
|----|------|--------|------|
| **1**（默认） | 每次事务提交都刷盘 | 最高，不丢数据 | 最低 |
| **0** | 每秒由后台线程刷盘 | 可能丢 1 秒数据 | 最高 |
| **2** | 每次提交写到 OS 缓存，每秒刷盘 | 可能丢 1 秒数据（OS 崩溃才会） | 较高 |

```sql
-- 生产环境建议：主库用 1（安全优先），从库用 2（性能优先）

-- 主库
SET GLOBAL innodb_flush_log_at_trx_commit = 1;

-- 从库（允许丢失 1 秒数据以提升复制性能）
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
```

::: danger 不要轻易将主库设为 0 或 2
将 `innodb_flush_log_at_trx_commit` 设为 0 或 2 能显著提升写入性能（可能提升 10 倍以上），但代价是在 MySQL 进程崩溃或操作系统崩溃时可能丢失最近 1 秒的事务数据。主库是数据安全的最后一道防线，除非业务明确接受这种数据丢失风险，否则主库必须设为 1。
:::

### sync_binlog

控制 binlog 的刷盘策略，与 `innodb_flush_log_at_trx_commit` 类似。

```sql
SHOW VARIABLES LIKE 'sync_binlog';

-- sync_binlog = 0:  不主动刷盘，由 OS 决定何时刷盘（性能最高，安全性最低）
-- sync_binlog = 1:  每次事务提交都刷盘（安全性最高，性能最低）
-- sync_binlog = N:  每 N 次事务提交刷盘一次
```

::: tip 推荐配置
主库：`innodb_flush_log_at_trx_commit=1` + `sync_binlog=1`，这是数据最安全的配置。
从库：`innodb_flush_log_at_trx_commit=2` + `sync_binlog=1000`，提升从库复制性能。
对数据安全要求极高的场景（如金融）：主从都设为 1。
:::

### max_connections

```sql
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'wait_timeout';           -- 非交互连接空闲超时（秒）
SHOW VARIABLES LIKE 'interactive_timeout';    -- 交互连接空闲超时（秒）

-- 合理设置 max_connections
-- 太小：Too many connections 错误
-- 太大：内存消耗增加，上下文切换开销增加

-- 经验公式：
-- max_connections = (可用内存 - 系统保留 - Buffer Pool) / 每个连接内存开销
-- 每个连接的内存开销约为 4MB~10MB（取决于 sort_buffer_size、join_buffer_size 等）

-- 常见配置：
-- 小型业务：200~500
-- 中型业务：500~1000
-- 大型业务：1000~2000（配合连接池和中间件控制）
-- 超过 2000 连接通常意味着架构需要优化（引入连接池中间件）
```

### 连接超时配置

```sql
-- wait_timeout: 非交互式连接（如应用连接）的空闲超时时间
SET GLOBAL wait_timeout = 600;         -- 10 分钟

-- interactive_timeout: 交互式连接（如命令行客户端）的空闲超时时间
SET GLOBAL interactive_timeout = 28800; -- 8 小时

-- 空闲连接会占用内存资源，适当缩短 wait_timeout 可以回收不用的连接
-- 但不能设得太短，否则应用连接池中的连接可能被服务器端断开
-- 建议：wait_timeout > 应用连接池的 maxLifetime
```

::: warning 连接超时与连接池的配合
如果 MySQL 的 `wait_timeout` 小于连接池的 `maxLifetime`，连接池可能返回一个已被服务端断开的"死连接"，导致应用报 `Connection reset` 或 `Communications link failure` 错误。解决方法：MySQL 的 `wait_timeout` 应大于连接池的 `maxLifetime`，或在连接池中开启连接有效性检查（testOnBorrow / validationQuery）。
:::

### 会话级缓冲区

```sql
-- 排序缓冲区（每个会话独占）
SHOW VARIABLES LIKE 'sort_buffer_size';        -- 默认 256KB，排序操作使用
SET SESSION sort_buffer_size = 2 * 1024 * 1024; -- 临时设为 2MB（只影响当前会话）

-- 连接缓冲区（每个会话独占）
SHOW VARIABLES LIKE 'join_buffer_size';         -- 默认 256KB，不走索引的 JOIN 使用

-- 顺序读缓冲区
SHOW VARIABLES LIKE 'read_buffer_size';         -- 默认 128KB，顺序扫描使用

-- 随机读缓冲区
SHOW VARIABLES LIKE 'read_rnd_buffer_size';     -- 默认 256KB，按索引排序后读取使用
```

::: danger 缓冲区不是越大越好
这些缓冲区是**每个会话独占**的。如果设得太大，1000 个连接 × 4MB = 4GB 内存消耗。应该根据实际查询需求设置，并在 SQL 层面优化以减少对这些缓冲区的依赖（如确保排序使用索引，而不是靠增大 sort_buffer_size）。
:::

## 连接池最佳实践

### HikariCP 配置

HikariCP 是 Spring Boot 2.x 默认的连接池，以高性能和轻量著称。

```yaml
spring:
  datasource:
    url: jdbc:mysql://10.0.0.1:3306/mydb?useSSL=false&serverTimezone=Asia/Shanghai
    username: app_user
    password: password
    hikari:
      # 核心配置
      maximum-pool-size: 20           # 最大连接数（不宜太大）
      minimum-idle: 5                 # 最小空闲连接
      connection-timeout: 3000        # 获取连接超时 3 秒
      idle-timeout: 600000            # 空闲连接存活 10 分钟
      max-lifetime: 1800000           # 连接最大存活 30 分钟
      # 连接验证
      connection-test-query: SELECT 1  # 验证连接有效性的 SQL
      validation-timeout: 3000        # 验证超时
      # 其他
      pool-name: MyApp-HikariPool
      leak-detection-threshold: 60000 # 连接泄漏检测阈值 60 秒
      auto-commit: true               # 默认自动提交
```

::: tip HikariCP 最佳实践
- `maximum-pool-size`：经典公式 = CPU核心数 * 2 + 磁盘数。实际中 10~20 是大多数应用的合理值。超过 50 通常说明应用设计有问题。
- `max-lifetime`：必须小于 MySQL 的 `wait_timeout`，建议比 `wait_timeout` 小 1~2 分钟。
- `leak-detection-threshold`：开启连接泄漏检测，设为预期最长使用时间。获取但未关闭的连接会在日志中告警。
:::

### Druid 配置

Druid 是阿里巴巴开源的连接池，功能丰富，自带监控和 SQL 防火墙。

```yaml
spring:
  datasource:
    type: com.alibaba.druid.pool.DruidDataSource
    druid:
      driver-class-name: com.mysql.cj.jdbc.Driver
      url: jdbc:mysql://10.0.0.1:3306/mydb
      username: app_user
      password: password
      # 连接池配置
      initial-size: 5                 # 初始化连接数
      min-idle: 5                     # 最小空闲连接
      max-active: 20                  # 最大活跃连接
      max-wait: 3000                  # 获取连接超时 3 秒
      # 验证配置
      validation-query: SELECT 1
      test-while-idle: true           # 空闲时检查连接有效性
      test-on-borrow: false           # 不在借出时检查（影响性能）
      test-on-return: false           # 不在归还时检查
      time-between-eviction-runs: 60000  # 检查间隔 60 秒
      min-evictable-idle-time: 300000    # 最小空闲时间 5 分钟
      # SQL 监控
      filters: stat,wall              # stat=统计, wall=SQL 防火墙
      # 慢 SQL 记录
      connection-properties: druid.stat.mergeSql=true;druid.stat.slowSqlMillis=1000
      # Web 监控
      stat-view-servlet:
        enabled: true
        url-pattern: /druid/*
        login-username: admin
        login-password: druid123
        allow: 127.0.0.1             # 只允许本地访问监控页面
```

## 慢查询治理流程

慢查询是 MySQL 性能问题最常见的原因。系统化的治理流程如下：

### 第一步：发现慢查询

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 1 秒阈值

-- 使用 Performance Schema 找慢 SQL
SELECT
  DIGEST_TEXT,
  COUNT_STAR,
  ROUND(AVG_TIMER_WAIT / 1e12, 3) AS avg_sec,
  ROUND(MAX_TIMER_WAIT / 1e12, 3) AS max_sec,
  SUM_ROWS_EXAMINED,
  SUM_ROWS_SENT
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 20;
```

### 第二步：分析慢查询

```bash
# 使用 mysqldumpslow 分析慢查询日志
# 按执行时间排序
mysqldumpslow -s t /var/lib/mysql/slow.log | head -20

# 按执行次数排序
mysqldumpslow -s c /var/lib/mysql/slow.log | head -20

# 按返回行数排序
mysqldumpslow -s r /var/lib/mysql/slow.log | head -20

# 使用 pt-query-digest（Percona Toolkit）更详细的分析
pt-query-digest /var/lib/mysql/slow.log > slow_report.txt
```

### 第三步：优化 SQL

```sql
-- 对每条慢 SQL 执行 EXPLAIN 分析
EXPLAIN SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';

-- 关注 EXPLAIN 输出中的问题：
-- type=ALL：全表扫描，需要加索引
-- key=NULL：没有使用索引
-- rows 很大：扫描行数过多
-- Extra=Using filesort：需要额外排序
-- Extra=Using temporary：使用了临时表
```

### 第四步：验证优化效果

```sql
-- 优化后再次执行 EXPLAIN，对比前后差异
-- 确认 type 改善（ALL → ref/range/const）
-- 确认 rows 减少
-- 确认 key 被正确使用

-- 上线后通过 Performance Schema 确认效果
-- 清空统计，观察新指标
TRUNCATE TABLE performance_schema.events_statements_summary_by_digest;
```
