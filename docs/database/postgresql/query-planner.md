# 查询计划器

PostgreSQL 的查询优化器是基于成本的（Cost-Based Optimizer, CBO）。理解 EXPLAIN 的输出、成本估算模型和统计信息的作用，是诊断和优化查询性能的核心技能。

## EXPLAIN 输出详解

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.name
ORDER BY order_count DESC
LIMIT 10;
```

输出示例：

```
Limit (cost=2857.34..2857.37 rows=10 width=40)
  (actual time=42.156..42.159 rows=10 loops=1)
  Buffers: shared hit=1520 read=340
  -> Sort (cost=2857.34..2871.59 rows=5700 width=40)
       (actual time=42.154..42.156 rows=10 loops=1)
       Sort Key: (count(o.id)) DESC
       Sort Method: top-N heapsort Memory: 26kB
       Buffers: shared hit=1520 read=340
       -> HashAggregate (cost=2628.34..2685.34 rows=5700 width=40)
            (actual time=40.890..41.456 rows=5700 loops=1)
            Group Key: u.name
            Batches: 1 Memory Usage: 2481kB
            Buffers: shared hit=1520 read=340
            -> Hash Join (cost=415.00..2485.84 rows=5700 width=32)
                 (actual time=8.234..35.120 rows=5700 loops=1)
                 Hash Cond: (o.user_id = u.id)
                 Buffers: shared hit=1520 read=340
                 -> Seq Scan on orders o (cost=0.00..1920.00 rows=50000 width=12)
                      (actual time=0.012..18.456 rows=50000 loops=1)
                      Buffers: shared hit=1200 read=320
                 -> Hash (cost=378.00..378.00 rows=2960 width=24)
                      (actual time=8.180..8.181 rows=2960 loops=1)
                      Buckets: 4096 Batches: 1 Memory Usage: 215kB
                      Buffers: shared hit=320 read=20
              -> Index Scan using idx_users_created on users u
                   (cost=0.42..75.00 rows=2960 width=24)
                   (actual time=0.018..2.340 rows=2960 loops=1)
                   Index Cond: (created_at > '2024-01-01 00:00:00+08')
                   Buffers: shared hit=320 read=20
```

### 关键字段解读

```
cost=2857.34..2857.37
│       │      │
│       │      └─ 获取所有输出行的总成本
│       └─ 获取第一行的成本
└─ 任意单位的成本值（不等于时间）

rows=10               估算返回行数
width=40              每行估算字节数
actual time=42.156..  实际首行时间（ms）
actual rows=10        实际返回行数
loops=1               节点执行次数

Buffers: shared hit=1520 read=340
│          │    │      │
│          │    │      └─ 从磁盘读取的页面数
│          │    └─ 从 shared_buffers 命中的页面数
│          └─ 共享缓冲区
└─ 缓冲区统计
```

### ESTIMATE vs ACTUAL

```sql
-- 估算与实际偏差大的节点是优化重点
-- 如果 rows=5700 但 actual rows=500000，统计信息可能过时
-- 运行 ANALYZE 更新统计信息
ANALYZE orders;

-- 偏差分析
-- 小偏差（2-3倍以内）：正常
-- 大偏差（10倍以上）：需要更新统计或多列统计
```

## 成本估算模型

### 成本公式

```
总成本 = 页面读取成本 + CPU 成本

页面读取成本 = 页面数 × 单页成本
CPU 成本 = 行数 × CPU tuple 成本 + 行数 × CPU operator 成本
```

### 关键成本参数

```sql
-- 查看当前成本参数
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name LIKE '%cost%' OR name LIKE '%page_size%';

-- 核心参数
seq_page_cost = 1.0           -- 顺序读取一页的成本（基准值）
random_page_cost = 4.0        -- 随机读取一页的成本（默认 HDD 假设）
cpu_tuple_cost = 0.01         -- 处理一行的 CPU 成本
cpu_index_tuple_cost = 0.005  -- 处理一条索引条目的 CPU 成本
cpu_operator_cost = 0.0025    -- 执行一个运算符/函数的 CPU 成本
effective_cache_size = 4GB    -- OS 缓存估算值

-- SSD 环境调优
SET random_page_cost = 1.1;
SET effective_io_concurrency = 200;
SET maintenance_io_concurrency = 200;
```

### 成本计算示例

```sql
-- Seq Scan on orders（10 万行，400 个页面）
-- 成本 = 400 × seq_page_cost + 100000 × cpu_tuple_cost
--      = 400 × 1.0 + 100000 × 0.01
--      = 400 + 1000 = 1400

-- Index Scan on idx_orders_user_id（选择 150 行）
-- 索引成本：3 层 B-Tree → 3 × random_page_cost = 12
-- 回表成本：150 × random_page_cost = 600
-- CPU 成本：150 × cpu_tuple_cost = 1.5
-- 总成本 ≈ 613.5
```

<PgQueryPlannerDemo />

## 统计信息

PostgreSQL 通过 `ANALYZE` 收集统计信息，存储在 `pg_statistic` 系统目录中。

### 基本统计信息

```sql
-- 手动执行 ANALYZE
ANALYZE orders;                   -- 采样分析
ANALYZE orders (columns user_id, amount);  -- 指定列
ANALYZE VERBOSE orders;           -- 显示详情

-- 查看统计信息
SELECT
    attname AS column_name,
    n_distinct,                    -- 不同值数量
    null_frac,                     -- NULL 比例
    avg_width,                     -- 平均字节数
    most_common_vals,              -- 最常见值
    most_common_freqs,             -- 最常见值的频率
    histogram_bounds               -- 等深直方图边界
FROM pg_stats
WHERE tablename = 'orders' AND attname = 'user_id';

-- n_distinct 的解读：
-- > 0：有 n_distinct 个不同值
-- < 0：绝对值是比例（如 -0.5 表示 50% 的行有唯一值）
```

### 直方图类型

PostgreSQL 使用等深直方图（Equi-Depth Histogram），每个桶包含大致相同数量的行：

```sql
-- 等深直方图示例
-- 列 user_id 有 1000 个不同值，100000 行
-- 100 个桶，每个桶约 1000 行
-- histogram_bounds: {1, 15, 33, ..., 998, 1000}

-- WHERE user_id = 50
-- 优化器在直方图中找到 50 所在的桶 (33, 67)
-- 估算该桶中 user_id=50 的比例 = 1000 / (67-33) / 1000
-- ≈ 0.029，估算行数 = 100000 × 0.029 = 2900
```

### 多列统计

PostgreSQL 10+ 支持多列统计，解决列之间存在关联的问题：

```sql
-- 创建多列统计
CREATE STATISTICS st_orders_user_status (dependencies, ndistinct)
ON user_id, status FROM orders;

-- dependencies：列之间的函数依赖
-- ndistinct：多列组合的不同值数量
-- mcv：最常见值组合

-- 更新统计信息
ANALYZE orders;

-- 场景：status='pending' 的行全部是 user_id=1 的
-- 不创建多列统计时，优化器假设两个条件独立
-- WHERE user_id = 1 AND status = 'pending'
-- 错误估算：P(user_id=1) × P(status='pending') × 总行数
-- 正确估算：在多列统计的帮助下，估算更准确
```

::: tip 多列统计的价值
当查询涉及多个相关列的筛选条件时，多列统计可以显著改善估算精度。在实际项目中，经常遇到"某个状态的订单只属于特定用户"的场景，此时多列统计至关重要。
:::

### 扩展统计信息

```sql
-- 查看已有统计信息
SELECT stxname, stxkeys, stxkind
FROM pg_statistic_ext;

-- 删除统计信息
DROP STATISTICS st_orders_user_status;

-- Expression Statistics（PostgreSQL 14+）
CREATE STATISTICS st_orders_date (ndistinct)
ON (DATE(created_at)) FROM orders;
-- 支持对表达式创建统计
```

## 连接顺序优化

PostgreSQL 使用动态规划（小表数量）或遗传算法（大量表连接）来确定最优连接顺序：

```sql
-- 小于 join_collapse_limit（默认 8）个表：动态规划
-- 大于 geqo_threshold（默认 12）个表：遗传算法

-- 查看连接顺序
EXPLAIN SELECT *
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id;
-- 优化器评估 3! = 6 种连接顺序

-- 强制连接顺序
SET join_collapse_limit = 1;
-- 此时 JOIN 的书写顺序就是执行顺序

-- 查看遗传算法设置
SHOW geqo_threshold;           -- 默认 12
SHOW geqo_effort;              -- 默认 5（1-10）
SHOW join_collapse_limit;      -- 默认 8
```

::: tip 为什么连接顺序重要
假设有 3 张表：A(100行)、B(1000行)、C(10000行)，连接条件分别是 A-B 和 B-C。先连接 A-B 得到中间结果（假设 500 行），再与 C 连接，比先连接 B-C 得到 50000 行，再与 A 连接要高效得多。优化器通过估算中间结果大小来选择顺序。
:::

## EXPLAIN 常用选项

```sql
-- 格式化输出
EXPLAIN (FORMAT JSON) SELECT ...;       -- JSON 格式，便于工具解析
EXPLAIN (FORMAT YAML) SELECT ...;       -- YAML 格式
EXPLAIN (FORMAT XML) SELECT ...;        -- XML 格式

-- 详细信息
EXPLAIN (ANALYZE, BUFFERS, TIMING, SUMMARY)
SELECT ...;
-- ANALYZE：实际执行，显示实际时间和行数
-- BUFFERS：显示缓冲区使用情况
-- TIMING：显示每个节点的时间（部分系统上关闭可减少开销）
-- SUMMARY：显示计划总时间

-- 调试慢查询
EXPLAIN (ANALYZE, BUFFERS, WAL, FORMAT TEXT)
UPDATE orders SET status = 'completed' WHERE id = 1;
-- WAL：显示 WAL 日志生成量（INSERT/UPDATE/DELETE 时可用）
```

::: warning ANALYZE 会真正执行
`EXPLAIN ANALYZE` 会执行查询。对于 INSERT/UPDATE/DELETE，用 `EXPLAIN ANALYZE` 会真正修改数据。安全做法：

```sql
BEGIN;
EXPLAIN ANALYZE DELETE FROM orders WHERE created_at < '2023-01-01';
ROLLBACK;   -- 回滚，不实际删除
```
:::
