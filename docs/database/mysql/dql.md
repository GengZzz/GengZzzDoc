# DQL 数据查询语言

DQL（Data Query Language）以 `SELECT` 为核心，是从数据库中提取、分析和汇总数据的关键工具。一条复杂的 SELECT 语句可能涉及多表连接、子查询、分组聚合、窗口函数等高级特性。理解 SELECT 的执行顺序和各子句的语义，是写出正确且高效查询的前提。

## SELECT 执行顺序

理解 SQL 的执行顺序至关重要，因为它决定了为什么某些语法能用（如在 ORDER BY 中使用列别名）而另一些不能用（如在 WHERE 中使用聚合函数）。

```sql
SELECT              -- 第 5 步：选择输出的列和表达式
    department,
    AVG(salary) AS avg_sal
FROM                -- 第 1 步：确定数据源
    employees
WHERE               -- 第 2 步：逐行过滤
    status = 'active'
GROUP BY            -- 第 3 步：分组
    department
HAVING              -- 第 4 步：过滤分组结果
    AVG(salary) > 10000
ORDER BY            -- 第 6 步：排序
    avg_sal DESC
LIMIT               -- 第 7 步：限制返回行数
    10;
```

**逻辑执行顺序：**

```
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

| 步骤 | 子句 | 作用 | 可使用的对象 |
|------|------|------|-------------|
| 1 | FROM | 确定数据源（表、视图、子查询结果） | 表名、表别名 |
| 2 | WHERE | 逐行过滤原始数据 | 列值、标量函数（不能用聚合函数和列别名） |
| 3 | GROUP BY | 将数据分组 | 列名、表达式 |
| 4 | HAVING | 过滤分组后的结果 | 聚合函数、列别名（MySQL 允许） |
| 5 | SELECT | 选择输出列、计算表达式、生成别名 | 所有列、表达式、聚合函数 |
| 6 | ORDER BY | 结果排序 | 列名、列别名、表达式 |
| 7 | LIMIT | 限制返回行数 | 数字 |

::: tip 物理执行顺序与逻辑执行顺序
上述是逻辑执行顺序，MySQL 优化器可能调整实际执行顺序（如先 LIMIT 再排序）来优化性能，但逻辑语义始终遵循此顺序。理解逻辑顺序有助于解释"为什么 WHERE 不能用别名"等问题。
:::

## 多表连接

当数据分散在多张表中时，需要通过 JOIN 将它们关联起来。

### INNER JOIN（内连接）

返回两张表中匹配的行。不匹配的行不会出现在结果中。

```sql
-- 查询每个订单对应的用户名
SELECT
    o.id AS order_id,
    o.amount,
    u.username,
    u.email
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.status = 'completed';

-- 多表内连接
SELECT
    o.id AS order_id,
    u.username,
    p.name AS product_name,
    oi.quantity,
    oi.unit_price
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.created_at >= '2024-01-01';
```

### LEFT JOIN（左连接）

返回左表的所有行，右表不匹配的行以 NULL 填充。

```sql
-- 查询所有用户及其订单（包括没有订单的用户）
SELECT
    u.id,
    u.username,
    o.id AS order_id,
    o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- 找出没有下单的用户（左连接的典型用法）
SELECT u.id, u.username
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;

-- 多层左连接
SELECT
    u.username,
    o.id AS order_id,
    r.rating,
    r.comment
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN reviews r ON o.id = r.order_id
WHERE u.created_at >= '2024-01-01';
```

### RIGHT JOIN（右连接）

与左连接对称，返回右表的所有行。实际上可以用左连接重写（调换表的顺序），因此实践中很少使用 RIGHT JOIN。

```sql
-- RIGHT JOIN（不常用）
SELECT o.id, u.username
FROM orders o
RIGHT JOIN users u ON o.user_id = u.id;

-- 等价的 LEFT JOIN（推荐写法）
SELECT o.id, u.username
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

### CROSS JOIN（交叉连接）

返回两表的笛卡尔积：左表的每一行与右表的每一行组合。结果行数 = 左表行数 x 右表行数。

```sql
-- 显式交叉连接
SELECT s.name, p.name
FROM sizes s
CROSS JOIN colors p;

-- 隐式交叉连接（逗号连接）
SELECT s.name, p.name
FROM sizes s, colors p;

-- 实际应用：生成所有可能的产品规格组合
SELECT
    p.name AS product,
    s.size_name,
    c.color_name,
    CONCAT(p.name, '-', s.size_name, '-', c.color_name) AS sku
FROM products p
CROSS JOIN size_options s
CROSS JOIN color_options c
WHERE p.id = 1001;
```

::: danger 笛卡尔积陷阱
不小心遗漏 JOIN 条件会产生笛卡尔积，导致结果行数爆炸。

```sql
-- 如果 users 有 10000 行，orders 有 100000 行
-- 以下查询的结果集为 10000 x 100000 = 10 亿行！
SELECT u.username, o.amount
FROM users u, orders o;   -- 没有 WHERE 条件关联
```
:::

### NATURAL JOIN（自然连接）

自动根据两个表中同名列进行连接，不需要手动指定连接条件。

```sql
-- 如果两表都有 user_id 列，自动以此连接
SELECT * FROM orders NATURAL JOIN users;

-- 不推荐使用：如果两表有多个同名列（如 created_at），会作为多个连接条件
-- 可能产生意外结果，可读性差
```

::: warning 慎用 NATURAL JOIN
`NATURAL JOIN` 的行为依赖于表结构（同名列），如果表结构变更（添加同名列），连接条件会无声地改变，导致查询结果异常。生产代码中应明确写出 ON 条件，不要依赖 NATURAL JOIN。
:::

## 子查询

子查询是嵌套在其他 SQL 语句中的 SELECT 查询，按返回结果的形状分为三类。

### 标量子查询

返回单个值（一行一列），可以用在任何期望单个值的位置。

```sql
-- 查询薪资高于平均值的员工
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- 在 SELECT 中使用标量子查询
SELECT
    name,
    salary,
    salary - (SELECT AVG(salary) FROM employees) AS diff_from_avg
FROM employees;

-- 在 UPDATE 中使用
UPDATE products
SET discount_price = price * (
    SELECT discount_rate FROM categories WHERE id = products.category_id
);
```

### 行子查询

返回单行多列，常用于同时比较多个字段。

```sql
-- 查找与指定用户同部门同职级的其他员工
SELECT name, department, level
FROM employees
WHERE (department, level) = (
    SELECT department, level
    FROM employees
    WHERE id = 1001
)
AND id != 1001;
```

### 表子查询

返回多行多列，通常用在 FROM 或 IN 子句中。

```sql
-- 使用表子查询作为派生表
SELECT dept, avg_sal
FROM (
    SELECT department AS dept, AVG(salary) AS avg_sal
    FROM employees
    GROUP BY department
) AS dept_stats
WHERE avg_sal > 15000;

-- 配合 IN 使用
SELECT * FROM products
WHERE category_id IN (
    SELECT id FROM categories WHERE parent_id = 10
);
```

### EXISTS

`EXISTS` 检查子查询是否返回至少一行，返回布尔值。通常比 `IN` 更高效，尤其当子查询结果集较大时。

```sql
-- 查找下过单的用户
SELECT u.id, u.username
FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- 查找没有下过单的用户（NOT EXISTS）
SELECT u.id, u.username
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- EXISTS vs IN 的性能对比
-- IN：先执行子查询，再将结果集用于外层过滤
-- EXISTS：对外层每一行执行子查询，找到第一个匹配即停止

-- 当 orders 表很大时，EXISTS 通常比 IN 更快
-- （因为 EXISTS 找到一个匹配就返回，不需要构建完整结果集）
```

::: tip EXISTS vs IN 的选择原则
- 子查询结果集小 → `IN` 可读性更好
- 子查询结果集大 → `EXISTS` 性能通常更优
- 主表行数少、子查询表行数多 → 差异不大
- 主表行数多、子查询表行数多 → 优先 `EXISTS`，或考虑改写为 `JOIN`
:::

## 聚合与分组进阶

### GROUP BY 多列

```sql
-- 按多个维度分组统计
SELECT
    department,
    YEAR(hire_date) AS hire_year,
    gender,
    COUNT(*) AS emp_count,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY department, YEAR(hire_date), gender
ORDER BY department, hire_year;
```

### WITH ROLLUP

`WITH ROLLUP` 在分组结果中添加汇总行（小计和总计），替代应用层的二次计算。

```sql
-- 按部门分组，自动添加部门小计和总计行
SELECT
    COALESCE(department, '【总计】') AS department,
    COUNT(*) AS emp_count,
    SUM(salary) AS total_salary,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY department WITH ROLLUP;
```

输出示例：

| department | emp_count | total_salary | avg_salary |
|-----------|-----------|-------------|------------|
| Engineering | 50 | 750000.00 | 15000.00 |
| Sales | 30 | 360000.00 | 12000.00 |
| HR | 10 | 100000.00 | 10000.00 |
| **NULL** | **90** | **1210000.00** | **13444.44** |

```sql
-- 多列 ROLLUP：生成多级汇总
SELECT
    COALESCE(department, '小计') AS dept,
    COALESCE(YEAR(hire_date), '年度小计') AS hire_year,
    COUNT(*) AS cnt,
    SUM(salary) AS total
FROM employees
GROUP BY department, YEAR(hire_date) WITH ROLLUP;
```

## HAVING vs WHERE 的深入对比

```sql
-- WHERE：在分组前过滤行，不能使用聚合函数
-- HAVING：在分组后过滤组，可以使用聚合函数

-- 错误写法：在 WHERE 中使用聚合函数
SELECT department, AVG(salary)
FROM employees
WHERE AVG(salary) > 10000   -- ERROR: Invalid use of group function
GROUP BY department;

-- 正确写法
SELECT department, AVG(salary) AS avg_sal
FROM employees
WHERE status = 'active'              -- 先过滤非在职员工（逐行过滤）
GROUP BY department
HAVING AVG(salary) > 10000           -- 再过滤平均薪资过低的部门（过滤组）
    AND COUNT(*) >= 5;               -- 只保留 5 人以上的部门
```

## UNION vs UNION ALL

`UNION` 用于合并多个 SELECT 语句的结果集。

```sql
-- UNION ALL：直接合并，不去重（速度快）
SELECT id, name, 'active' AS source FROM active_users
UNION ALL
SELECT id, name, 'archived' AS source FROM archived_users;

-- UNION：合并后去除重复行（需要排序去重，速度慢）
SELECT email FROM customers
UNION
SELECT email FROM newsletter_subscribers;
```

| 特性 | UNION | UNION ALL |
|------|-------|-----------|
| 是否去重 | 是（去除完全相同的行） | 否 |
| 性能 | 需要额外的排序和去重操作 | 直接合并，无额外开销 |
| 适用场景 | 需要结果集唯一 | 不需要去重或已知无重复 |
| 排序 | ORDER BY 放在最后一个 SELECT 后，作用于整个结果集 | 同左 |

::: tip 优先使用 UNION ALL
如果确定结果集之间没有重复数据（或者业务上不关心重复），应使用 `UNION ALL`。`UNION` 的去重操作需要对整个结果集排序，在数据量大时性能差距显著。
:::

## 窗口函数（MySQL 8.0+）

窗口函数对一组相关行（窗口）执行计算，同时保留每一行的独立性——不像 GROUP BY 那样折叠行。语法格式：

```sql
function_name([arguments]) OVER (
    [PARTITION BY partition_expression, ...]
    [ORDER BY sort_expression [ASC|DESC], ...]
    [frame_clause]
)
```

### ROW_NUMBER, RANK, DENSE_RANK

这三个函数都用于编号，但处理并列值的方式不同：

```sql
SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rnk
FROM employees;
```

假设 Engineering 部门的薪资：20000, 20000, 18000, 15000

| name | salary | ROW_NUMBER | RANK | DENSE_RANK |
|------|--------|-----------|------|-----------|
| A | 20000 | 1 | 1 | 1 |
| B | 20000 | 2 | 1 | 1 |
| C | 18000 | 3 | 3 | 2 |
| D | 15000 | 4 | 4 | 3 |

- `ROW_NUMBER()`：严格递增，无并列
- `RANK()`：并列后跳号（1, 1, 3, 4）
- `DENSE_RANK()`：并列后不跳号（1, 1, 2, 3）

**典型应用：取每个部门薪资最高的前 3 名**

```sql
SELECT * FROM (
    SELECT
        name,
        department,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
) ranked
WHERE rn <= 3;
```

### LAG 和 LEAD

访问当前行的前一行（LAG）或后一行（LEAD）的值。

```sql
SELECT
    name,
    department,
    salary,
    LAG(salary, 1) OVER (PARTITION BY department ORDER BY salary DESC) AS prev_salary,
    LEAD(salary, 1) OVER (PARTITION BY department ORDER BY salary DESC) AS next_salary,
    salary - LAG(salary, 1) OVER (PARTITION BY department ORDER BY salary DESC) AS diff_from_prev
FROM employees;
```

**典型应用：计算月环比增长率**

```sql
SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(amount) AS monthly_total,
    LAG(SUM(amount)) OVER (ORDER BY DATE_FORMAT(order_date, '%Y-%m')) AS prev_month,
    ROUND(
        (SUM(amount) - LAG(SUM(amount)) OVER (ORDER BY DATE_FORMAT(order_date, '%Y-%m')))
        / LAG(SUM(amount)) OVER (ORDER BY DATE_FORMAT(order_date, '%Y-%m')) * 100,
    2) AS growth_rate_pct
FROM orders
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY month;
```

### NTILE

将结果集均匀分成 N 个组（桶），并为每行分配组号。

```sql
-- 将员工按薪资分为 4 个等级（四分位数）
SELECT
    name,
    salary,
    NTILE(4) OVER (ORDER BY salary DESC) AS quartile
FROM employees;
-- quartile = 1: 前 25%（最高薪）
-- quartile = 4: 后 25%（最低薪）

-- 按部门分桶
SELECT
    name,
    department,
    salary,
    NTILE(3) OVER (PARTITION BY department ORDER BY salary DESC) AS tier
FROM employees;
-- tier = 1: 该部门薪资前 1/3
-- tier = 3: 该部门薪资后 1/3
```

### 窗口函数的 frame 子句

`frame_clause` 定义窗口的范围，支持 `ROWS`（物理行）和 `RANGE`（值范围）两种模式。

```sql
-- 计算滚动 3 个月的移动平均
SELECT
    month,
    revenue,
    AVG(revenue) OVER (
        ORDER BY month
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3m
FROM monthly_revenue;

-- 累计求和
SELECT
    order_date,
    amount,
    SUM(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM daily_orders;
```

**frame 子句选项：**

| 语法 | 含义 |
|------|------|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | 从第一行到当前行 |
| `ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING` | 当前行的前 2 行到后 2 行（共 5 行窗口） |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` | 整个分区 |
| `RANGE BETWEEN INTERVAL 7 DAY PRECEDING AND CURRENT ROW` | 当前行值往前 7 天范围 |

## CTE 公用表表达式（MySQL 8.0+）

CTE（Common Table Expression）使用 `WITH ... AS` 语法定义命名的临时结果集，提升复杂查询的可读性和复用性。

### 非递归 CTE

```sql
-- 基本 CTE
WITH high_value_customers AS (
    SELECT
        user_id,
        SUM(amount) AS total_spent,
        COUNT(*) AS order_count
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
    HAVING SUM(amount) > 10000
)
SELECT
    u.username,
    u.email,
    h.total_spent,
    h.order_count
FROM users u
INNER JOIN high_value_customers h ON u.id = h.user_id
ORDER BY h.total_spent DESC;

-- 多个 CTE（用逗号分隔）
WITH
    dept_stats AS (
        SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS cnt
        FROM employees GROUP BY department
    ),
    company_avg AS (
        SELECT AVG(salary) AS company_avg_sal FROM employees
    )
SELECT
    d.department,
    d.avg_sal,
    c.company_avg_sal,
    d.avg_sal - c.company_avg_sal AS diff
FROM dept_stats d
CROSS JOIN company_avg c
WHERE d.avg_sal > c.company_avg_sal;
```

### 递归 CTE

递归 CTE 用于处理树形结构数据（组织架构、分类层级、评论回复等）。

```sql
WITH RECURSIVE tree AS (
    -- 锚点查询（初始行集）
    SELECT
        id,
        name,
        parent_id,
        0 AS depth,
        CAST(name AS CHAR(500)) AS path
    FROM categories
    WHERE parent_id IS NULL    -- 顶级分类

    UNION ALL

    -- 递归查询（基于上一轮结果继续查找子节点）
    SELECT
        c.id,
        c.name,
        c.parent_id,
        t.depth + 1,
        CONCAT(t.path, ' > ', c.name)
    FROM categories c
    INNER JOIN tree t ON c.parent_id = t.id
    WHERE t.depth < 10          -- 防止无限递归（设置最大深度）
)
SELECT
    id,
    REPEAT('  ', depth) AS indent,   -- 缩进显示层级
    name,
    depth,
    path
FROM tree
ORDER BY path;
```

```sql
-- 递归 CTE 生成日期序列
WITH RECURSIVE date_series AS (
    SELECT DATE('2024-01-01') AS dt
    UNION ALL
    SELECT dt + INTERVAL 1 DAY
    FROM date_series
    WHERE dt < '2024-12-31'
)
SELECT dt FROM date_series;

-- 使用日期序列统计每天的订单数（包括没有订单的日期）
WITH RECURSIVE date_series AS (
    SELECT DATE('2024-01-01') AS dt
    UNION ALL
    SELECT dt + INTERVAL 1 DAY FROM date_series WHERE dt < '2024-01-31'
)
SELECT
    d.dt,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.amount), 0) AS total_amount
FROM date_series d
LEFT JOIN orders o ON DATE(o.created_at) = d.dt
GROUP BY d.dt
ORDER BY d.dt;
```

::: warning 递归 CTE 安全措施
MySQL 8.0 对递归 CTE 有以下保护机制：
- `cte_max_recursion_depth` 变量限制最大递归深度（默认 1000）
- 超过限制时报错并终止查询
- 建议在递归查询中显式添加深度限制条件（`WHERE depth < N`），防止数据结构异常时的无限递归
:::
