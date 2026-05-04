# 大数据处理

PostgreSQL 作为单机数据库，大数据处理的核心策略是：减少 I/O、利用并行、合理分层。本节覆盖大表优化、TOAST 机制、并行查询、FDW 外部数据封装和 TimescaleDB 时序扩展。

## 大表优化

### 表结构优化

```sql
-- 1. 使用合适的字段类型
-- 避免用 TEXT 存储固定长度数据
-- 用 TIMESTAMPTZ 不用 TIMESTAMP
-- 用 INTEGER 不用 BIGINT（如果值范围够用）

-- 2. 垂直拆分宽表
-- 将不常用的字段移到扩展表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB
);

-- 3. 利用列的物理存储顺序
-- 经常一起查询的字段放在一起
-- 变长字段（TEXT, JSONB）放在行末尾
ALTER TABLE orders DROP COLUMN note;
ALTER TABLE orders ADD COLUMN note TEXT;
-- 新添加的列在物理上位于行末尾
```

### 查询优化

```sql
-- 1. 避免 SELECT *，只取需要的列
-- 减少从磁盘读取的数据量

-- 2. 使用 LIMIT 和 Keyset Pagination
-- 避免 OFFSET 造成的无意义扫描

-- 3. 使用物化视图预计算聚合
CREATE MATERIALIZED VIEW mv_hourly_metrics AS
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    metric_name,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY DATE_TRUNC('hour', created_at), metric_name;

-- 4. 使用 BRIN 索引加速时序数据查询
CREATE INDEX idx_metrics_time_brin ON metrics USING BRIN (created_at);
-- BRIN 索引体积约 2 MB vs B-Tree 约 200 MB（千万行级别）
```

## TOAST 机制

TOAST（The Oversized-Attribute Storage Technique）自动将大值存储在单独的表中：

```
行内存储限制：约 2 KB（(BLCKSZ - page_header) / 4）
超过限制的值自动压缩并移到 TOAST 表

-- TOAST 策略
PLAIN：不压缩，不外部化（固定长度类型）
EXTENDED：压缩 + 外部化（默认，TEXT/JSONB 等变长类型）
EXTERNAL：不压缩，只外部化（JSONB 推荐，压缩效果差）
MAIN：压缩但不外部化（优先保留行内）
```

```sql
-- 设置 TOAST 策略
ALTER TABLE api_responses ALTER COLUMN payload SET STORAGE EXTERNAL;

-- 查看表的 TOAST 表
SELECT relname, reltoastrelid::regclass
FROM pg_class
WHERE relname = 'api_responses';

-- 查看 TOAST 表大小
SELECT pg_size_pretty(pg_total_relation_size(reltoastrelid))
FROM pg_class
WHERE relname = 'api_responses';

-- JSONB 建议用 EXTERNAL 策略
-- JSONB 压缩率很低（二进制格式本身不包含大量重复）
-- 用 EXTERNAL 节省压缩/解压缩的 CPU 开销
```

::: tip TOAST 与查询
查询时，只有 SELECT 中引用的列才会从 TOAST 表中取出。如果查询不包含大字段列，不会触发 TOAST 读取。这也是避免 `SELECT *` 的另一个原因。
:::

## 并行查询

```sql
-- 关键配置
max_parallel_workers_per_gather = 2     -- 每个 Gather 节点的 worker 数
max_parallel_workers = 8               -- 全局最大并行 worker
min_parallel_table_scan_size = 8MB     -- 触发并行的最小表大小
parallel_tuple_cost = 0.1              -- 元组传递成本（越低越倾向并行）

-- 强制并行（测试用）
SET max_parallel_workers_per_gather = 4;

-- 查看并行执行计划
EXPLAIN ANALYZE SELECT COUNT(*), AVG(amount) FROM orders;
-- Gather (cost=10000.00..14352.00 rows=1 width=12)
--   Workers Planned: 2
--   Workers Launched: 2
--   -> Partial Aggregate
--         -> Parallel Seq Scan on orders

-- 并行 Index Scan（PostgreSQL 10+）
EXPLAIN ANALYZE SELECT COUNT(*) FROM orders WHERE user_id BETWEEN 1 AND 1000;
-- Finalize Aggregate
--   -> Gather
--         Workers Planned: 2
--         -> Partial Aggregate
--               -> Parallel Index Scan using idx_orders_user_id

-- 并行 B-Tree 扫描（PostgreSQL 13+ 改进）
EXPLAIN ANALYZE SELECT * FROM orders WHERE created_at > '2024-01-01' ORDER BY created_at LIMIT 1000;
-- Limit
--   -> Gather Merge
--         Workers Planned: 2
--         -> Parallel Index Scan using idx_orders_created
```

::: tip 并行查询的限制
不支持写操作（INSERT/UPDATE/DELETE）、涉及临时表的查询、标记为 PARALLEL UNSAFE 的函数、以及 SERIALIZABLE 隔离级别。并行查询的启动成本较高，小查询可能反而变慢。
:::

## FDW 外部数据封装

FDW（Foreign Data Wrapper）让 PostgreSQL 可以访问外部数据源，如同访问本地表一样。

### postgres_fdw（跨 PostgreSQL 实例查询）

```sql
-- 安装
CREATE EXTENSION postgres_fdw;

-- 创建外部服务器
CREATE SERVER remote_pg
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host 'remote-host', port '5432', dbname 'analytics_db');

-- 创建用户映射
CREATE USER MAPPING FOR current_user
    SERVER remote_pg
    OPTIONS (user 'analyst', password 'password');

-- 创建外部表
CREATE FOREIGN TABLE remote_orders (
    id BIGINT,
    user_id INT,
    amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ
) SERVER remote_pg OPTIONS (table_name 'orders');

-- 查询外部表
SELECT user_id, SUM(amount) FROM remote_orders
WHERE created_at > '2024-01-01'
GROUP BY user_id;

-- 外部表的 JOIN
SELECT l.name, r.total
FROM users l
JOIN (
    SELECT user_id, SUM(amount) AS total FROM remote_orders GROUP BY user_id
) r ON l.id = r.user_id;
```

### file_fdw（读取 CSV 文件）

```sql
CREATE EXTENSION file_fdw;
CREATE SERVER csv_server FOREIGN DATA WRAPPER file_fdw;

CREATE FOREIGN TABLE csv_import (
    id INT,
    name TEXT,
    amount NUMERIC
) SERVER csv_server
OPTIONS (filename '/tmp/import.csv', format 'csv', header 'true');

-- 直接查询 CSV
SELECT * FROM csv_import WHERE amount > 100;

-- 从 CSV 导入数据
INSERT INTO orders (user_id, amount)
SELECT id, amount FROM csv_import;
```

## TimescaleDB 时序扩展

TimescaleDB 是基于 PostgreSQL 的时序数据库扩展，自动管理分区（Hypertable）并提供时序优化函数。

```sql
-- 安装
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 创建 Hypertable（自动分区）
CREATE TABLE sensor_data (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION
);

-- 转为 Hypertable（按 time 列，每 1 天一个分区）
SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '1 day');

-- 自动压缩旧数据（14 天前的数据压缩）
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'sensor_id',
    timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('sensor_data', INTERVAL '14 days');

-- 自动删除旧数据（保留 90 天）
SELECT add_retention_policy('sensor_data', INTERVAL '90 days');

-- 时序聚合函数
-- time_bucket：时间桶聚合
SELECT
    time_bucket('1 hour', time) AS hour,
    sensor_id,
    AVG(temperature) AS avg_temp,
    MAX(temperature) AS max_temp,
    MIN(humidity) AS min_humidity
FROM sensor_data
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY hour, sensor_id
ORDER BY hour;

-- 降采样（连续聚合）
CREATE MATERIALIZED VIEW sensor_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS hour,
    sensor_id,
    AVG(temperature) AS avg_temp,
    AVG(humidity) AS avg_humidity
FROM sensor_data
GROUP BY hour, sensor_id;

-- 自动刷新连续聚合
SELECT add_continuous_aggregate_policy('sensor_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

::: tip TimescaleDB 的价值
对于时序数据场景（IoT 传感器、监控指标、日志），TimescaleDB 的 Hypertable 自动管理分区创建和压缩，连续聚合自动维护预计算结果。这比手动管理分区表要省心得多。
:::
