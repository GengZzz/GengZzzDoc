# 分区表

PostgreSQL 10+ 支持声明式分区（Declarative Partitioning），将大表按规则拆分为多个子表。分区对应用透明——SQL 查询不需要修改，优化器通过 Partition Pruning 自动排除不相关的分区。

## 分区类型

### Range 分区

按值范围划分，最常用于时间序列数据：

```sql
-- 按月分区的日志表
CREATE TABLE logs (
    id BIGSERIAL,
    level TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 创建分区（按月）
CREATE TABLE logs_2024_01 PARTITION OF logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE logs_2024_02 PARTITION OF logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE logs_2024_03 PARTITION OF logs
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- 默认分区（捕获不匹配任何分区的数据）
CREATE TABLE logs_default PARTITION OF logs DEFAULT;

-- 插入数据（自动路由到对应分区）
INSERT INTO logs (level, message, created_at) VALUES
    ('INFO', 'Server started', '2024-01-15 10:00:00+08'),
    ('ERROR', 'Connection timeout', '2024-02-20 15:30:00+08');

-- 多列 Range 分区
CREATE TABLE events (
    id BIGSERIAL,
    region TEXT,
    event_date DATE
) PARTITION BY RANGE (region, event_date);

CREATE TABLE events_apac_2024 PARTITION OF events
    FOR VALUES FROM ('APAC', '2024-01-01') TO ('APAC', '2025-01-01');
```

### List 分区

按离散值划分：

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    region TEXT NOT NULL,
    amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY LIST (region);

CREATE TABLE orders_apac PARTITION OF orders
    FOR VALUES IN ('CN', 'JP', 'KR', 'AU');

CREATE TABLE orders_emea PARTITION OF orders
    FOR VALUES IN ('DE', 'FR', 'UK', 'IT');

CREATE TABLE orders_americas PARTITION OF orders
    FOR VALUES IN ('US', 'CA', 'BR', 'MX');

CREATE TABLE orders_other PARTITION OF orders DEFAULT;
```

### Hash 分区

按哈希值均匀分布，适合无法按范围或列表划分的场景：

```sql
CREATE TABLE user_data (
    user_id BIGINT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (user_id);

-- 创建 4 个哈希分区
CREATE TABLE user_data_p0 PARTITION OF user_data FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE user_data_p1 PARTITION OF user_data FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE user_data_p2 PARTITION OF user_data FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE user_data_p3 PARTITION OF user_data FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

::: tip 分区类型选择
Range 适合时间序列和连续值。List 适合有限枚举值（地区、状态）。Hash 适合均匀分布（user_id），但无法利用分区键进行范围查询。Range 是最常见的选择。
:::

## Partition Pruning

Partition Pruning 是分区表的核心优化：在查询执行前排除不相关的分区。

```sql
-- 确保开启 partition pruning
SET enable_partition_pruning = on;  -- 默认开启

-- 查看 pruning 效果
EXPLAIN ANALYZE
SELECT * FROM logs WHERE created_at >= '2024-01-15' AND created_at < '2024-01-20';
-- Append
--   ->  Seq Scan on logs_2024_01
--         Filter: (created_at >= '2024-01-15' AND created_at < '2024-01-20')
-- 只扫描了 logs_2024_01 分区

-- 运行时 pruning（参数化查询）
PREPARE find_logs (TIMESTAMPTZ) AS
    SELECT * FROM logs WHERE created_at = $1;

EXPLAIN EXECUTE find_logs('2024-02-15 10:00:00+08');
-- 只扫描 logs_2024_02 分区

-- List 分区的 pruning
EXPLAIN SELECT * FROM orders WHERE region = 'CN';
-- 只扫描 orders_apac 分区

-- Hash 分区的 pruning
EXPLAIN SELECT * FROM user_data WHERE user_id = 42;
-- 只扫描 user_id % 4 = 2 的分区
```

::: warning 无法 pruning 的场景
分区键不在 WHERE 条件中、函数调用包裹了分区键（`WHERE DATE(created_at) = '2024-01-15'` 不会 pruning，需要改写为范围查询）、JOIN 中的分区键需要额外注意。
:::

## 子分区

分区表本身也可以再分区：

```sql
-- 按地区+时间的二级分区
CREATE TABLE orders (
    id BIGSERIAL,
    region TEXT NOT NULL,
    amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY LIST (region);

CREATE TABLE orders_apac PARTITION OF orders
    FOR VALUES IN ('CN', 'JP', 'KR')
    PARTITION BY RANGE (created_at);

CREATE TABLE orders_apac_2024_q1 PARTITION OF orders_apac
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_apac_2024_q2 PARTITION OF orders_apac
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
```

::: tip 子分区的管理成本
子分区的分区数量是父分区数乘以子分区数。4 个地区 × 12 个月 = 48 个实际表。分区过多会增加 DDL 管理复杂度和查询规划开销。大多数场景，一级分区就够了。
:::

## 分区管理

### 添加分区

```sql
-- 提前创建未来的分区
CREATE TABLE logs_2024_04 PARTITION OF logs
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

-- 批量创建分区（存储过程）
CREATE OR REPLACE PROCEDURE create_monthly_partitions(
    p_table_name TEXT,
    p_start_date DATE,
    p_months INT
) AS $$
DECLARE
    v_start DATE := p_start_date;
    v_end DATE;
    v_part_name TEXT;
BEGIN
    FOR i IN 0..p_months - 1 LOOP
        v_end := v_start + INTERVAL '1 month';
        v_part_name := p_table_name || '_' || TO_CHAR(v_start, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            v_part_name, p_table_name, v_start, v_end
        );
        v_start := v_end;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CALL create_monthly_partitions('logs', '2024-04-01', 12);
```

### 分离分区

```sql
-- DETACH：将分区从父表分离（变成独立表）
ALTER TABLE logs DETACH PARTITION logs_2024_01;
-- 或者并发分离（不阻塞读写）
ALTER TABLE logs DETACH PARTITION logs_2024_01 CONCURRENTLY;

-- 归档旧分区
ALTER TABLE logs DETACH PARTITION logs_2023_01;
-- 可以对独立的 logs_2023_01 做 VACUUM FULL、压缩、备份
```

### ATTACH 分区

```sql
-- 将独立表附加为分区
ALTER TABLE logs ATTACH PARTITION logs_2024_04
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

-- 验证附加（检查数据是否符合分区约束）
ALTER TABLE logs ATTACH PARTITION logs_2024_04
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01')
    VALIDATE CONSTRAINT logs_2024_04_created_at_check;
```

### 自动分区管理（pg_partman）

```sql
-- 安装 pg_partman
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- 创建分区配置
SELECT partman.create_parent(
    p_parent_table := 'public.logs',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3              -- 预创建未来 3 个分区
);

-- 更新配置：自动维护
UPDATE partman.part_config
SET retention = '12 months',             -- 保留 12 个月
    retention_keep_table = true,         -- 分离而不是删除
    infinite_time_partitions = true
WHERE parent_table = 'public.logs';

-- 定时调用维护（配合 pg_cron）
SELECT cron.schedule('partman_maintenance', '0 2 * * *',
    $$CALL partman.run_maintenance_proc()$$);
```

## 性能对比

```sql
-- 对比分区表 vs 非分区表的查询性能
-- 假设 logs 表有 1 亿行，logs 分区为 12 个月

-- 非分区表（全表 Seq Scan）
EXPLAIN ANALYZE SELECT * FROM logs WHERE created_at = '2024-06-15';
-- Seq Scan on logs (actual time=0.012..8523.456 rows=27389 loops=1)

-- 分区表（只扫描一个月的分区）
EXPLAIN ANALYZE SELECT * FROM logs WHERE created_at = '2024-06-15';
-- Append -> Seq Scan on logs_2024_06 (actual time=0.015..712.345 rows=27389 loops=1)

-- 性能提升：约 12 倍（跳过了 11/12 的数据）

-- 跨分区查询
EXPLAIN ANALYZE SELECT * FROM logs
WHERE created_at >= '2024-01-01' AND created_at < '2024-04-01';
-- Append -> Seq Scan on logs_2024_01 + logs_2024_02 + logs_2024_03
-- 扫描 3 个分区，跳过 9 个分区
```

::: tip 分区键选择原则
- 分区键必须出现在查询的 WHERE 条件中
- Range 分区键应该让大多数查询只访问少数分区
- 主键/唯一约束必须包含分区键
- 全局唯一性无法仅通过分区键保证（需要 UUID 或应用层方案）
:::
