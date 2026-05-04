# CTE 与视图

CTE（Common Table Expressions）和视图是 SQL 模块化的基础。PostgreSQL 对 CTE 的实现有独特的行为——普通 CTE 是优化栅栏（optimization fence），而物化视图和窗口函数提供了额外的分析能力。

## WITH 子句（CTE）

CTE 将复杂查询分解为可读的步骤，每个 CTE 在语义上是独立的。

```sql
-- 基础 CTE：可读的多步查询
WITH user_orders AS (
    SELECT user_id,
           COUNT(*) AS order_count,
           SUM(amount) AS total_spent
    FROM orders
    WHERE created_at >= '2024-01-01'
    GROUP BY user_id
),
active_users AS (
    SELECT u.id, u.name, u.email,
           uo.order_count, uo.total_spent
    FROM users u
    JOIN user_orders uo ON u.id = uo.user_id
    WHERE uo.order_count >= 5
)
SELECT * FROM active_users ORDER BY total_spent DESC;
```

### CTE 与子查询的区别

```sql
-- 子查询：优化器可能合并到外层查询
SELECT * FROM (
    SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
) sub WHERE sub.total > 1000;

-- CTE（PostgreSQL 12 之前）：始终被物化为临时结果
-- 优化器不会将 CTE 的条件推入内部
WITH user_totals AS (
    SELECT user_id, SUM(amount) AS total FROM orders GROUP BY user_id
)
SELECT * FROM user_totals WHERE total > 1000;
```

::: tip PostgreSQL 12+ 的行为变化
PostgreSQL 12 之后，普通 CTE（没有 MATERIALIZED 关键字）会被优化器考虑是否内联。如果你需要强制物化（比如避免重复执行副作用），显式使用 `MATERIALIZED`：

```sql
WITH log_insert AS MATERIALIZED (
    INSERT INTO audit_log (action) VALUES ('report_generated') RETURNING id
)
SELECT * FROM report_data;
```
:::

### 可写 CTE

PostgreSQL 的 CTE 中可以包含 INSERT/UPDATE/DELETE：

```sql
-- 在 CTE 中执行 INSERT 并引用其结果
WITH new_order AS (
    INSERT INTO orders (user_id, amount, status)
    VALUES (1, 299.00, 'pending')
    RETURNING id, user_id
),
new_items AS (
    INSERT INTO order_items (order_id, product_id, quantity)
    SELECT new_order.id, p.id, 1
    FROM new_order, (VALUES (101), (102), (103)) AS p(id)
    RETURNING order_id
)
SELECT DISTINCT order_id FROM new_items;

-- 原子性：整个语句要么全部成功，要么全部失败
-- 如果 new_items 的 INSERT 失败，new_order 的 INSERT 也会回滚
```

::: tip 可写 CTE 的事务特性
所有可写 CTE 在同一个事务中执行。这对于需要"先插入主记录再插入关联记录"的场景非常有用，保证了引用完整性的同时避免了多次往返。
:::

## 递归 CTE

递归 CTE 用于处理树形或图结构数据，语法是 `WITH RECURSIVE`：

```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES categories(id)
);

INSERT INTO categories (id, name, parent_id) VALUES
  (1, '电子产品', NULL),
  (2, '手机', 1),
  (3, '电脑', 1),
  (4, 'iPhone', 2),
  (5, 'Android 手机', 2),
  (6, 'MacBook', 3),
  (7, 'Windows 笔记本', 3);

-- 查询某分类的所有子分类（含层级深度）
WITH RECURSIVE category_tree AS (
    -- 锚点：起始节点
    SELECT id, name, parent_id, 0 AS depth,
           name::TEXT AS path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- 递归：连接子节点
    SELECT c.id, c.name, c.parent_id, ct.depth + 1,
           ct.path || ' > ' || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT id, name, depth, path
FROM category_tree
ORDER BY path;
```

输出：

```
 id |    name     | depth |                path
----+-------------+-------+------------------------------------
  1 | 电子产品    |     0 | 电子产品
  2 | 手机        |     1 | 电子产品 > 手机
  4 | iPhone      |     2 | 电子产品 > 手机 > iPhone
  5 | Android 手机 |     2 | 电子产品 > 手机 > Android 手机
  3 | 电脑        |     1 | 电子产品 > 电脑
  6 | MacBook     |     2 | 电子产品 > 电脑 > MacBook
  7 | Windows 笔记本 |  2 | 电子产品 > 电脑 > Windows 笔记本
```

### 递归 CTE 的终止控制

```sql
-- 限制递归深度防止无限循环
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories WHERE id = 1

    UNION ALL

    SELECT c.id, c.name, c.parent_id, t.depth + 1
    FROM categories c JOIN tree t ON c.parent_id = t.id
    WHERE t.depth < 10  -- 深度限制
)
SELECT * FROM tree;

-- 用 SEARCH 子句控制遍历顺序（PostgreSQL 14+）
WITH RECURSIVE tree AS (
    SELECT id, name, parent_id
    FROM categories WHERE id = 1

    UNION ALL

    SELECT c.id, c.name, c.parent_id
    FROM categories c JOIN tree t ON c.parent_id = t.id
) SEARCH DEPTH FIRST BY id SET order_seq
SELECT * FROM tree;
```

## 物化视图

物化视图将查询结果持久化存储，适合计算成本高的聚合查询：

```sql
-- 创建物化视图
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
    DATE_TRUNC('day', created_at) AS sale_date,
    category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount
FROM orders
GROUP BY DATE_TRUNC('day', created_at), category;

-- 在物化视图上创建索引（唯一索引支持 CONCURRENTLY 刷新）
CREATE UNIQUE INDEX idx_mv_daily_sales ON mv_daily_sales (sale_date, category);

-- 手动刷新
REFRESH MATERIALIZED VIEW mv_daily_sales;                -- 阻塞读写
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;   -- 不阻塞读

-- 定时刷新（通过 pg_cron 扩展或 cron 任务）
-- pg_cron 扩展方式：
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh_daily_sales', '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales');
```

::: warning CONCURRENTLY 的限制
`REFRESH MATERIALIZED VIEW CONCURRENTLY` 要求物化视图上至少有一个 UNIQUE 索引。它比普通刷新慢，但不会阻塞并发查询。
:::

## Window Functions 深入

窗口函数在不折叠行的情况下进行计算，PostgreSQL 支持完整的 SQL 窗口函数规范。

### 基础语法

```sql
SELECT
    user_id,
    order_date,
    amount,
    SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS running_total,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rank_in_user,
    LAG(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS prev_amount
FROM orders;
```

### FRAME 子句

FRAME 定义了窗口函数的计算范围：

```sql
SELECT
    order_date,
    amount,
    -- ROWS BETWEEN: 基于行数
    SUM(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS sum_last_3_rows,

    -- RANGE BETWEEN: 基于值的范围
    SUM(amount) OVER (
        ORDER BY amount
        RANGE BETWEEN 100 PRECEDING AND 100 FOLLOWING
    ) AS sum_amount_range,

    -- GROUPS BETWEEN: 基于 peer groups（值相同的行一组）
    SUM(amount) OVER (
        ORDER BY amount
        GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS sum_adjacent_groups
FROM orders;

-- 默认 FRAME：RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- 这意味着 SUM(amount) OVER (ORDER BY date) 累计的是"到当前值为止"
-- 如果有多行共享同一个 date 值，它们的 SUM 相同
```

::: tip ROWS vs RANGE vs GROUPS
`ROWS` 按物理行计数（精确但可能同值不同结果）。`RANGE` 按值的范围计数（同值同结果，但范围可能很大）。`GROUPS` 按 peer group 计数（折中方案）。大多数场景用 `ROWS`，需要"截止到当前值"的累计时用 `RANGE`。
:::

### DISTINCT 在窗口函数中的使用

```sql
-- PostgreSQL 14+：窗口函数中支持 DISTINCT
SELECT
    user_id,
    COUNT(DISTINCT product_id) OVER (PARTITION BY user_id) AS distinct_products,
    SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date
                      ROWS UNBOUNDED PRECEDING) AS running_total
FROM orders;
```

### 常用窗口函数速查

```sql
-- 排名类
ROW_NUMBER()    -- 行号（同值不同序）
RANK()          -- 排名（同值同序，跳号）
DENSE_RANK()    -- 排名（同值同序，不跳号）
NTILE(4)        -- 分位数（将数据分为 4 组）

-- 偏移类
LAG(col, n, default)     -- 前 n 行的值
LEAD(col, n, default)    -- 后 n 行的值
FIRST_VALUE(col)         -- 窗口内第一个值
LAST_VALUE(col)          -- 窗口内最后一个值
NTH_VALUE(col, n)        -- 窗口内第 n 个值

-- 聚合类（所有聚合函数都可以用作窗口函数）
SUM / AVG / COUNT / MAX / MIN

-- 示例：查询每个用户的订单同比增长率
WITH monthly AS (
    SELECT
        user_id,
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount) AS monthly_total
    FROM orders
    GROUP BY user_id, DATE_TRUNC('month', order_date)
)
SELECT
    user_id,
    month,
    monthly_total,
    LAG(monthly_total) OVER (PARTITION BY user_id ORDER BY month) AS prev_month,
    ROUND(
        (monthly_total - LAG(monthly_total) OVER (PARTITION BY user_id ORDER BY month))
        / NULLIF(LAG(monthly_total) OVER (PARTITION BY user_id ORDER BY month), 0) * 100,
    2) AS growth_pct
FROM monthly;
```
