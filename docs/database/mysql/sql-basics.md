# SQL 基础

SQL（Structured Query Language）是关系型数据库的标准操作语言，几乎所有关系型数据库都遵循或兼容 SQL 标准。掌握 SQL 基础是数据库开发的核心前提，本文将从分类体系出发，深入讲解 CRUD 操作、条件过滤、排序分页、聚合计算等核心语法，并给出生产环境中的书写规范建议。

## SQL 分类体系

SQL 按功能可分为五大类，每类对应数据库操作的不同维度：

| 分类 | 全称 | 核心关键字 | 作用 |
|------|------|------------|------|
| DDL | Data Definition Language | `CREATE`、`ALTER`、`DROP`、`TRUNCATE` | 定义和修改数据库对象结构 |
| DML | Data Manipulation Language | `INSERT`、`UPDATE`、`DELETE` | 操作表中的数据 |
| DQL | Data Query Language | `SELECT` | 查询数据（ANSI 标准中 SELECT 属于 DML，但实践中常独立分类） |
| DCL | Data Control Language | `GRANT`、`REVOKE` | 控制访问权限 |
| TCL | Transaction Control Language | `COMMIT`、`ROLLBACK`、`SAVEPOINT` | 管理事务 |

::: tip 事务的本质
事务是数据库操作的最小逻辑单元，满足 ACID 特性：原子性（Atomicity）、一致性（Consistency）、隔离性（Isolation）、持久性（Durability）。InnoDB 引擎通过 undo log 保证原子性和一致性，通过 MVCC 和锁保证隔离性，通过 redo log 保证持久性。
:::

## CRUD 基础操作

### INSERT —— 插入数据

```sql
-- 单行插入（指定列）
INSERT INTO users (username, email, age)
VALUES ('zhangsan', 'zhangsan@example.com', 25);

-- 单行插入（不指定列，必须提供所有列的值）
INSERT INTO users
VALUES (NULL, 'lisi', 'lisi@example.com', 30, NOW());

-- 多行批量插入（效率远高于多次单行插入）
INSERT INTO users (username, email, age) VALUES
    ('wangwu', 'wangwu@example.com', 28),
    ('zhaoliu', 'zhaoliu@example.com', 32),
    ('sunqi', 'sunqi@example.com', 24);

-- 从其他表插入
INSERT INTO users_archive (username, email, age)
SELECT username, email, age FROM users WHERE created_at < '2024-01-01';
```

### SELECT —— 查询数据

```sql
-- 基础查询
SELECT * FROM users WHERE age > 25;

-- 指定列查询
SELECT username, email FROM users;

-- 去重查询
SELECT DISTINCT department FROM employees;

-- 条件查询 + 排序
SELECT username, age
FROM users
WHERE age BETWEEN 20 AND 30
ORDER BY age DESC, username ASC
LIMIT 10 OFFSET 20;
```

### UPDATE —— 更新数据

```sql
-- 单列更新
UPDATE users SET status = 'inactive' WHERE last_login < '2024-01-01';

-- 多列更新
UPDATE users
SET email = 'new@example.com', updated_at = NOW()
WHERE id = 100;

-- 使用表达式更新
UPDATE products
SET price = price * 0.9
WHERE category = 'electronics' AND stock > 100;
```

::: danger UPDATE 不带 WHERE
`UPDATE` 不加 `WHERE` 条件将更新表中所有行。在生产环境中执行 UPDATE 前，务必先用相同条件的 SELECT 确认影响范围。建议开启 `safe-updates` 模式（`SET sql_safe_updates = 1`），该模式下不带 WHERE 或 LIMIT 的 UPDATE/DELETE 会被拒绝。
:::

### DELETE —— 删除数据

```sql
-- 条件删除
DELETE FROM users WHERE status = 'deleted' AND deleted_at < '2023-01-01';

-- 带 LIMIT 的删除（防止一次性删除过多行）
DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 10000;

-- 删除所有数据（不推荐，使用 TRUNCATE）
DELETE FROM temp_table;
```

## WHERE 条件过滤

WHERE 子句是 SQL 查询中最重要的过滤机制，支持多种条件表达式：

### 比较运算

```sql
-- 等于 / 不等于
SELECT * FROM users WHERE age = 25;
SELECT * FROM users WHERE age != 25;
SELECT * FROM users WHERE age <> 25;      -- ANSI 标准不等于

-- 大小比较
SELECT * FROM products WHERE price > 100;
SELECT * FROM products WHERE price >= 100 AND price <= 500;
```

### IN 操作符

```sql
-- IN：匹配列表中的任意值
SELECT * FROM orders
WHERE status IN ('pending', 'processing', 'shipped');

-- NOT IN：排除列表中的值
SELECT * FROM employees
WHERE department NOT IN ('HR', 'Finance');

-- 子查询配合 IN
SELECT * FROM products
WHERE category_id IN (
    SELECT id FROM categories WHERE active = 1
);
```

::: warning NULL 与 NOT IN 陷阱
`NOT IN` 遇到 `NULL` 值会导致整个条件返回 `NULL`（而非 `true`），从而查不到任何结果。

```sql
-- 如果 manager_id 列包含 NULL，以下查询将返回空结果集
SELECT * FROM employees WHERE id NOT IN (SELECT manager_id FROM employees);

-- 正确做法：排除 NULL
SELECT * FROM employees
WHERE id NOT IN (SELECT manager_id FROM employees WHERE manager_id IS NOT NULL);

-- 或使用 NOT EXISTS（更安全）
SELECT * FROM employees e1
WHERE NOT EXISTS (
    SELECT 1 FROM employees e2 WHERE e2.manager_id = e1.id
);
```
:::

### BETWEEN

```sql
-- 闭区间：包含两端值
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-06-30';

-- 等价于
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date <= '2024-06-30';
```

### LIKE 模糊匹配

```sql
-- % 匹配任意长度任意字符
SELECT * FROM users WHERE username LIKE 'zhang%';    -- 姓张的所有用户
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- Gmail 用户

-- _ 匹配单个字符
SELECT * FROM users WHERE username LIKE '张_';       -- 张三、张伟等两个字的名字

-- 转义特殊字符
SELECT * FROM files WHERE name LIKE '%\%%';          -- 包含 % 的文件名
SELECT * FROM files WHERE name LIKE '%!_%' ESCAPE '!'; -- 自定义转义符
```

::: tip LIKE 与索引
`LIKE 'prefix%'` 可以利用 B+ 树索引进行范围扫描。但 `LIKE '%suffix'` 或 `LIKE '%keyword%'` 会导致全表扫描。如果全文搜索是核心需求，应使用全文索引（Full-Text Index）或 Elasticsearch 等外部搜索引擎。
:::

### IS NULL

```sql
-- NULL 不能用 = 或 != 判断，必须用 IS NULL / IS NOT NULL
SELECT * FROM users WHERE deleted_at IS NULL;       -- 未删除的用户
SELECT * FROM users WHERE deleted_at IS NOT NULL;   -- 已删除的用户

-- NULL 的特殊行为：任何值与 NULL 的比较结果都是 NULL
SELECT 1 = NULL;    -- NULL（不是 true 也不是 false）
SELECT NULL = NULL; -- NULL
```

## 排序与分页

### ORDER BY

```sql
-- 单列排序
SELECT * FROM products ORDER BY price DESC;

-- 多列排序（先按第一个列排序，相同则按第二个列）
SELECT * FROM employees
ORDER BY department ASC, salary DESC, hire_date ASC;

-- 使用表达式排序
SELECT * FROM orders
ORDER BY YEAR(order_date) DESC, MONTH(order_date) DESC;

-- 使用列位置排序（不推荐，可读性差）
SELECT username, age FROM users ORDER BY 2 DESC;  -- 按第 2 列（age）排序
```

### LIMIT 分页

```sql
-- LIMIT count：取前 N 条
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- LIMIT offset, count：跳过 offset 条，取 count 条
SELECT * FROM users ORDER BY id LIMIT 0, 20;    -- 第 1 页，每页 20 条
SELECT * FROM users ORDER BY id LIMIT 20, 20;   -- 第 2 页
SELECT * FROM users ORDER BY id LIMIT 40, 20;   -- 第 3 页

-- 标准写法（MySQL 8.0.19+）
SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 20;

-- 深分页优化：使用游标代替 OFFSET
-- OFFSET 1000000 需要扫描前 100 万行再丢弃，效率极低
-- 改用上一页最后一条记录的 ID 作为游标
SELECT * FROM users WHERE id > 1000000 ORDER BY id LIMIT 20;
```

::: warning 深分页问题
`LIMIT 1000000, 20` 看似只取 20 条，但 MySQL 需要先扫描并丢弃前 1000000 行。对于千万级大表，深分页查询可能需要数秒。生产环境推荐使用「游标分页」（Keyset Pagination），即以上一页最后一条记录的排序字段值作为下一页的起始条件。
:::

## 聚合函数

聚合函数对一组值执行计算并返回单个结果值，常与 `GROUP BY` 配合使用。

### 常用聚合函数

```sql
-- COUNT：计数
SELECT COUNT(*) FROM users;                    -- 总行数（包含 NULL）
SELECT COUNT(email) FROM users;                -- email 非 NULL 的行数
SELECT COUNT(DISTINCT department) FROM employees;  -- 不同部门数

-- SUM：求和
SELECT SUM(amount) FROM orders WHERE status = 'completed';

-- AVG：平均值
SELECT AVG(salary) FROM employees WHERE department = 'Engineering';

-- MAX / MIN：最大/最小值
SELECT MAX(price) AS max_price, MIN(price) AS min_price FROM products;

-- 组合使用
SELECT
    department,
    COUNT(*) AS emp_count,
    AVG(salary) AS avg_salary,
    MAX(salary) AS max_salary,
    MIN(salary) AS min_salary,
    SUM(salary) AS total_salary
FROM employees
GROUP BY department;
```

### GROUP BY 分组

```sql
-- 按单列分组
SELECT department, COUNT(*) AS cnt
FROM employees
GROUP BY department;

-- 按多列分组
SELECT department, YEAR(hire_date) AS hire_year, COUNT(*) AS cnt
FROM employees
GROUP BY department, YEAR(hire_date);

-- HAVING：过滤分组后的结果
SELECT department, AVG(salary) AS avg_sal
FROM employees
GROUP BY department
HAVING AVG(salary) > 10000;
```

### HAVING vs WHERE

```sql
-- WHERE：分组前过滤（逐行过滤），不能使用聚合函数
-- HAVING：分组后过滤（过滤组），可以使用聚合函数

-- 查询平均薪资超过 10000 且部门人数大于 5 人的部门
SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS cnt
FROM employees
WHERE status = 'active'             -- 先过滤掉非在职员工
GROUP BY department
HAVING AVG(salary) > 10000 AND COUNT(*) > 5;  -- 再过滤分组结果
```

| 特性 | WHERE | HAVING |
|------|-------|--------|
| 执行时机 | GROUP BY 之前 | GROUP BY 之后 |
| 作用对象 | 逐行数据 | 分组结果 |
| 是否可用聚合函数 | 否 | 是 |
| 是否可用列别名 | 否（MySQL 特例允许，但不推荐） | 可以 |

## 别名（AS）

别名用于给表或列赋予临时名称，提升查询可读性。

```sql
-- 列别名
SELECT
    username AS 用户名,
    YEAR(NOW()) - YEAR(birthdate) AS age,
    CONCAT(first_name, ' ', last_name) AS full_name
FROM users;

-- 表别名（多表连接时尤其重要）
SELECT u.username, o.order_id, o.amount
FROM users AS u
INNER JOIN orders AS o ON u.id = o.user_id;

-- AS 关键字可以省略
SELECT username 用户名 FROM users;
SELECT u.username FROM users u;
```

## SQL 书写规范

生产环境的 SQL 书写应遵循以下规范，以确保可读性、可维护性和安全性：

**关键字大写：**
```sql
-- 推荐
SELECT username, email FROM users WHERE age > 25 ORDER BY created_at DESC;

-- 不推荐（关键字小写，难以区分关键字和标识符）
select username, email from users where age > 25 order by created_at desc;
```

**缩进与换行：**
```sql
SELECT
    u.id,
    u.username,
    o.order_id,
    o.amount,
    o.created_at
FROM users AS u
INNER JOIN orders AS o
    ON u.id = o.user_id
WHERE o.status = 'completed'
    AND o.amount > 100
ORDER BY o.created_at DESC
LIMIT 20;
```

**禁止事项：**

1. 永远不要在生产环境使用 `SELECT *`——明确列出所需列，避免不必要的 IO 和网络传输，且表结构变更不会导致程序异常。
2. 永远不要将用户输入直接拼接到 SQL 中——使用参数化查询（Prepared Statement）防止 SQL 注入。
3. 大批量数据操作必须分批执行，包裹在事务中，并设置合理的批次大小（通常 1000-5000 行）。
4. 禁止在索引列上使用函数——`WHERE YEAR(create_time) = 2024` 无法使用索引，改用范围查询 `WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01'`。

::: danger SQL 注入
SQL 注入是最常见的 Web 安全漏洞之一。永远不要使用字符串拼接构建 SQL 语句。

```sql
-- 危险：字符串拼接
query = "SELECT * FROM users WHERE username = '" + userInput + "'"

-- 安全：使用预编译语句
query = "SELECT * FROM users WHERE username = ?"
params = [userInput]
```
:::
