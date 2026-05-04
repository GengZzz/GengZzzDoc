# 查询性能调优

理解了查询计划器之后，本节聚焦于实际开发中常见的慢查询模式和优化策略。这些问题在 PostgreSQL 和其他数据库中都存在，但 PostgreSQL 的优化器行为有其独特之处。

## 常见慢查询模式

### 全表扫描陷阱

```sql
-- 问题：函数调用导致索引失效
EXPLAIN SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';
-- Seq Scan：函数 DATE() 阻止了 B-Tree 索引使用

-- 解决 1：改写为范围查询
SELECT * FROM orders
WHERE created_at >= '2024-01-15'
  AND created_at < '2024-01-16';

-- 解决 2：创建表达式索引
CREATE INDEX idx_orders_date ON orders ((DATE(created_at)));
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';

-- 问题：隐式类型转换
EXPLAIN SELECT * FROM orders WHERE id = '42';
-- 如果 id 是 INTEGER，'42' 是 TEXT
-- PostgreSQL 不会隐式转换（与 MySQL 不同），会直接报错
-- 但如果索引列有隐式转换函数，可能仍然导致全表扫描
```

### 类型不匹配

```sql
-- PostgreSQL 不做隐式类型转换（比 MySQL 严格）
-- 这通常是个优点，但也可能造成困惑

-- 错误示例：TEXT 列与 INTEGER 比较
SELECT * FROM users WHERE phone = 13800000000;
-- ERROR: operator does not exist: text = integer

-- 正确写法
SELECT * FROM users WHERE phone = '13800000000';

-- 特殊情况：如果在 TEXT 列上用数字查询
-- PostgreSQL 会尝试找一个两边都能接受的类型进行转换
-- 但这可能导致无法使用索引
```

### SELECT * 的问题

```sql
-- 问题：SELECT * 无法使用 Index-only Scan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;
-- Index Scan + Heap Fetch（需要回表）

-- 优化：只查询需要的列
EXPLAIN ANALYZE SELECT user_id, amount, status
FROM orders WHERE user_id = 42;
-- 如果有覆盖索引 idx_orders_covering (user_id) INCLUDE (amount, status)
-- 可以走 Index-only Scan
```

## N+1 查询问题

N+1 查询是 ORM 框架中最常见的性能问题：

```sql
-- 问题：查询 1 个用户 + N 个用户的订单 = N+1 次查询
-- SELECT * FROM users LIMIT 10;
-- 然后对每个用户执行：
-- SELECT * FROM orders WHERE user_id = ?;

-- 解决 1：JOIN 一次性获取
SELECT u.id, u.name, o.id AS order_id, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

-- 解决 2：IN 批量查询（适合一对多且不需要关联详情）
SELECT * FROM orders WHERE user_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

-- 解决 3：LATERAL JOIN（每组取最新 N 条）
SELECT u.id, u.name, o.id AS order_id, o.amount, o.created_at
FROM users u
LEFT JOIN LATERAL (
    SELECT * FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 5
) o ON true
WHERE u.id IN (1, 2, 3, 4, 5);

-- 解决 4：Window Function
SELECT * FROM (
    SELECT
        o.*,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM orders o
    WHERE user_id IN (1, 2, 3, 4, 5)
) ranked
WHERE rn <= 5;
```

::: tip LATERAL JOIN 的优势
`LATERAL` 子查询可以引用外部表的列，实现"每组取 N 条"的模式。PostgreSQL 的优化器可以将 LATERAL 转换为高效的 Index Scan，避免为每个外部行执行独立的子查询。
:::

## LIMIT OFFSET 性能

```sql
-- 问题：OFFSET 大值时性能急剧下降
EXPLAIN ANALYZE SELECT * FROM orders ORDER BY created_at DESC LIMIT 10 OFFSET 1000000;
-- 扫描并跳过前 1000000 行，然后返回 10 行
-- 成本与 OFFSET 值成正比

-- 解决 1：Keyset Pagination（游标分页）
-- 第一页
SELECT * FROM orders ORDER BY id ASC LIMIT 10;
-- 假设最后一行 id=100
SELECT * FROM orders WHERE id > 100 ORDER BY id ASC LIMIT 10;

-- 适合无限滚动的场景
-- 优点：成本恒定，不随页码增大而增大
-- 缺点：不支持跳页

-- 解决 2：覆盖索引 + 内部查询
SELECT o.* FROM orders o
JOIN (
    SELECT id FROM orders ORDER BY created_at DESC LIMIT 10 OFFSET 1000000
) sub ON o.id = sub.id;
-- 内部查询走 Index-only Scan（只扫描索引，不访问堆）
-- 外部查询通过主键精确获取
```

::: tip OFFSET 的本质问题
OFFSET 要求数据库"读取并丢弃"前面的所有行。无论索引多好，OFFSET 100 万意味着至少要读取 100 万条索引条目。Keyset Pagination 通过 WHERE 条件跳过行，完全避免了这个问题。
:::

## CTE 优化器行为

PostgreSQL 12 之后，普通 CTE 可能被内联（inline）到外层查询中。这改变了 CTE 的性能特性：

```sql
-- PostgreSQL 11 及之前：CTE 始终被物化
WITH user_totals AS (
    SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
)
SELECT * FROM user_totals WHERE user_id = 1;
-- 即使有 user_id=1 的条件过滤，也会先计算所有用户的总额

-- PostgreSQL 12+：优化器可能内联
WITH user_totals AS (
    SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
)
SELECT * FROM user_totals WHERE user_id = 1;
-- 优化器可能将 WHERE user_id=1 推入 CTE 内部
-- 只计算 user_id=1 的总额

-- 强制物化（PostgreSQL 12+）
WITH user_totals AS MATERIALIZED (
    SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
)
SELECT * FROM user_totals WHERE user_id = 1;

-- 强制不物化（PostgreSQL 12+）
WITH user_totals AS NOT MATERIALIZED (
    SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
)
SELECT * FROM user_totals WHERE user_id = 1;
```

::: tip 何时使用 MATERIALIZED
需要确保 CTE 只执行一次（如包含副作用的写入 CTE、时间敏感的数据快照）时使用 `MATERIALIZED`。其他情况让优化器自行决定。
:::

## Prepared Statement

Prepared Statement 预编译 SQL，避免重复解析和规划：

```sql
-- PostgreSQL 协议级别（推荐，大多数驱动自动使用）
-- 通过扩展查询协议（Extended Query Protocol）实现
-- 应用代码中使用参数化查询即可自动获得 prepared statement

-- SQL 层面
PREPARE find_user (INT) AS
    SELECT * FROM users WHERE id = $1;

EXECUTE find_user(42);

-- 使用 PREPARE 的注意事项
-- 1. 第一次执行时生成执行计划
-- 2. 后续执行复用同一计划
-- 3. 如果参数值导致行数差异很大，固定计划可能不是最优

-- 优化器对 prepared statement 的处理
-- PostgreSQL 默认使用 custom plan（前 5 次）和 generic plan（之后）
-- 如果 generic plan 的成本估算与 custom plan 相当，就使用 generic plan

-- 查看 prepared statement
SELECT * FROM pg_prepared_statements;

-- 删除 prepared statement
DEALLOCATE find_user;
```

## 并行查询

PostgreSQL 9.6+ 支持并行查询，将大查询拆分为多个 worker 并行执行：

```sql
-- 关键配置
max_parallel_workers_per_gather = 2     -- 每个 Gather 节点的最大 worker
max_parallel_workers = 8               -- 全局最大并行 worker
parallel_tuple_cost = 0.1              -- worker 传递元组的成本
parallel_setup_cost = 1000             -- 启动并行的成本
min_parallel_table_scan_size = 8MB     -- 触发并行的最小表大小
min_parallel_index_scan_size = 512kB   -- 触发并行的最小索引大小

-- 强制并行（测试用）
SET max_parallel_workers_per_gather = 4;
SET force_parallel_mode = on;

-- 查看并行执行计划
EXPLAIN ANALYZE SELECT COUNT(*) FROM orders;
-- Gather (cost=10000.00..14352.00 rows=1 width=8)
--   Workers Planned: 2
--   Workers Launched: 2
--   -> Partial Aggregate
--         -> Parallel Seq Scan on orders

-- 表级别的并行控制
ALTER TABLE orders SET (parallel_workers = 4);
```

::: tip 并行查询的限制
并行查询不会用于写入操作（INSERT/UPDATE/DELETE）、涉及访问临时表的查询、以及被标记为 PARALLEL UNSAFE 的函数。小表（小于 `min_parallel_table_scan_size`）也不触发并行。
:::

## 通用调优清单

```sql
-- 1. 检查是否有锁等待
SELECT pid, query, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state = 'active' AND wait_event IS NOT NULL;

-- 2. 检查 long running query
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > INTERVAL '5 minutes'
ORDER BY duration DESC;

-- 3. 检查统计信息是否过时
SELECT relname, last_analyze, last_autoanalyze, n_live_tup
FROM pg_stat_user_tables
WHERE last_analyze IS NULL AND last_autoanalyze IS NULL
ORDER BY n_live_tup DESC;

-- 4. 从未使用的索引
SELECT indexrelid::regclass, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (SELECT conindid FROM pg_constraint);
```
