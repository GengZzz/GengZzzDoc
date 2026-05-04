# EXPLAIN 执行计划

EXPLAIN 是 MySQL 查询优化最重要的工具。通过分析 EXPLAIN 的输出，可以了解 MySQL 优化器如何执行一条查询，从而找到性能瓶颈并进行针对性优化。

## EXPLAIN 基本用法

```sql
-- 基本用法：分析 SELECT 语句
EXPLAIN SELECT * FROM users WHERE id = 1;

-- 也可以分析 UPDATE/DELETE（MySQL 8.0.18+）
EXPLAIN UPDATE users SET name = 'Bob' WHERE id = 1;
EXPLAIN DELETE FROM users WHERE id > 100;

-- 分析多表连接
EXPLAIN SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 1;

-- 分析子查询
EXPLAIN SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 100);

-- JSON 格式输出（更详细）
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE id = 1;

-- 传统格式
EXPLAIN FORMAT=TRADITIONAL SELECT * FROM users WHERE id = 1;

-- TREE 格式（MySQL 8.0.16+，更易读）
EXPLAIN FORMAT=TREE SELECT * FROM users WHERE id = 1;
```

## 各字段详解

### id

查询序号，标识查询中各个 SELECT 子句的执行顺序。

```sql
-- 简单查询：id 相同
EXPLAIN SELECT * FROM users u JOIN orders o ON u.id = o.user_id;
-- +----+-------------+-------+------+---------------+------+---------+------+------+-------+
-- | id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra |
-- +----+-------------+-------+------+---------------+------+---------+------+------+-------+
-- |  1 | SIMPLE      | u     | ALL  | PRIMARY       | NULL | NULL    | NULL | 1000 |       |
-- |  1 | SIMPLE      | o     | ref  | idx_user_id   | idx  | 8       | u.id |    5 |       |
-- +----+-------------+-------+------+---------------+------+---------+------+------+-------+

-- 子查询：id 不同，id 越大优先级越高（先执行内层）
EXPLAIN SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 100);
-- +----+--------------+-------------+-------+---------------+------------+---------+------+------+----------+-------------+
-- | id | select_type  | table       | type  | possible_keys | key        | key_len | ref  | rows | filtered | Extra       |
-- +----+--------------+-------------+-------+---------------+------------+---------+------+------+----------+-------------+
-- |  1 | PRIMARY      | <subquery2> | ALL   | NULL          | NULL       | NULL    | NULL | NULL |   100.00 |             |
-- |  1 | PRIMARY      | users       | eq_ref| PRIMARY       | PRIMARY    | 8       | func |    1 |   100.00 | Using where |
-- |  2 | MATERIALIZED | orders      | range | idx_amount    | idx_amount | 5       | NULL |  100|   100.00 | Using where |
-- +----+--------------+-------------+-------+---------------+------------+---------+------+------+----------+-------------+

-- UNION：id 为 NULL 的行是 UNION RESULT
EXPLAIN SELECT id FROM users WHERE id < 10 UNION SELECT id FROM orders WHERE id < 10;
-- id 列：1, 2, NULL（NULL 表示 UNION RESULT）
```

### select_type

查询类型，表示该 SELECT 子句的类型。

| 值 | 含义 |
|---|------|
| `SIMPLE` | 简单查询，不包含子查询或 UNION |
| `PRIMARY` | 最外层的 SELECT |
| `SUBQUERY` | SELECT 或 WHERE 中包含的子查询 |
| `DERIVED` | FROM 子句中的子查询（派生表） |
| `UNION` | UNION 中第二个及之后的 SELECT |
| `UNION RESULT` | UNION 的结果集 |
| `DEPENDENT SUBQUERY` | 依赖于外部查询的子查询（相关子查询） |
| `DEPENDENT UNION` | UNION 中依赖外部查询的 SELECT |
| `MATERIALIZED` | 物化子查询（MySQL 5.6+） |

```sql
-- SIMPLE：最简单的查询
EXPLAIN SELECT * FROM users WHERE id = 1;
-- select_type = SIMPLE

-- DERIVED：FROM 子句中的子查询
EXPLAIN SELECT * FROM (SELECT id, name FROM users WHERE status = 1) AS active_users;
-- 主查询：select_type = PRIMARY
-- 子查询：select_type = DERIVED

-- SUBQUERY：WHERE 中的子查询
EXPLAIN SELECT * FROM users WHERE id = (SELECT MAX(user_id) FROM orders);
-- 第一行：select_type = PRIMARY
-- 第二行：select_type = SUBQUERY
```

### table

该行数据访问的是哪张表。可能的值包括：

- 实际表名
- `<derivedN>`：派生表，N 对应 id
- `<subqueryN>`：物化子查询
- `NULL`：UNION 结果集

### partitions

匹配的分区。如果表没有分区，则显示 NULL。

```sql
-- 对于分区表
EXPLAIN SELECT * FROM partitioned_orders WHERE order_date = '2026-01-01';
-- partitions: p202601（只扫描 p202601 分区）
```

### type（最重要）

访问类型，是 EXPLAIN 输出中**最需要关注**的字段。它表示 MySQL 如何查找表中的行。

从最优到最差的顺序：

```
system > const > eq_ref > ref > range > index > ALL
```

#### system

表只有一行数据（系统表），是 const 的特殊情况。

```sql
EXPLAIN SELECT * FROM (SELECT 1) AS t;
-- type = system（派生表只有一行）
```

#### const

通过主键或唯一索引进行等值查询，最多匹配一行。

```sql
EXPLAIN SELECT * FROM users WHERE id = 1;
-- type = const
-- key = PRIMARY

EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
-- email 是唯一索引
-- type = const
```

::: tip const 是最快的访问类型
const 类型的查询在优化阶段就能确定最多返回一行，MySQL 会将主键/唯一索引值直接替换到查询中，非常高效。
:::

#### eq_ref

在多表 JOIN 中，对于前表的每一行，在当前表中只能匹配到一行。使用主键或唯一索引进行关联。

```sql
EXPLAIN SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- u 表：type = ALL（全表扫描，作为驱动表）
-- o 表：type = eq_ref（通过主键/唯一索引关联，每行只匹配一条）

-- 如果 orders.user_id 是唯一索引且 orders 中每个 user_id 值唯一
```

#### ref

使用非唯一索引进行等值查询，可能匹配多行。

```sql
-- user_id 是普通索引（非唯一）
EXPLAIN SELECT * FROM orders WHERE user_id = 100;
-- type = ref
-- key = idx_user_id
-- rows = 5（预计返回 5 行）

-- 使用前缀索引
EXPLAIN SELECT * FROM users WHERE name = 'Alice';
-- name 列有索引 idx_name(name(10))
-- type = ref
```

#### range

使用索引进行范围查询。

```sql
-- 常见的 range 操作
EXPLAIN SELECT * FROM users WHERE id > 100;              -- >
EXPLAIN SELECT * FROM users WHERE id BETWEEN 1 AND 100;  -- BETWEEN
EXPLAIN SELECT * FROM users WHERE id IN (1, 2, 3);       -- IN
EXPLAIN SELECT * FROM users WHERE id < 10;               -- <
EXPLAIN SELECT * FROM users WHERE name LIKE 'A%';        -- 前缀匹配

-- type = range
-- key = PRIMARY / idx_name
```

::: tip IN 和 OR 是否走 range
在大多数情况下，IN 和 OR 会被优化为 range 访问。但当 IN 列表中的值非常多时，优化器可能选择全表扫描。
:::

#### index

全索引扫描（Full Index Scan），遍历整个索引树。

```sql
-- 假设 users 表有索引 idx_name(name)
EXPLAIN SELECT name FROM users;
-- type = index
-- key = idx_name
-- 扫描整个 idx_name 索引树（比全表扫描的数据量小）

-- 如果查询不需要回表
EXPLAIN SELECT name, id FROM users;  -- idx_name 包含 name 和主键 id
-- type = index（覆盖索引扫描）
```

与 ALL 的区别：index 扫描的是索引树（通常比数据文件小），ALL 扫描的是数据文件。

#### ALL

全表扫描（Full Table Scan），逐行扫描整张表。**性能最差**。

```sql
-- 没有可用索引
EXPLAIN SELECT * FROM users WHERE age = 25;
-- age 列没有索引
-- type = ALL
-- rows = 1000000（全表扫描）

-- 索引失效
EXPLAIN SELECT * FROM users WHERE age + 1 = 26;
-- 对索引列做运算，索引失效
-- type = ALL
```

::: danger ALL 类型需要立即优化
如果 EXPLAIN 中出现 type = ALL，且表的数据量较大（rows 值很高），通常需要添加索引或改写查询。
:::

### possible_keys

可能用到的索引。MySQL 根据查询条件和表结构分析出所有可能使用的索引。

```sql
EXPLAIN SELECT * FROM users WHERE name = 'Alice' AND age = 25;
-- 如果 name 和 age 各有独立索引
-- possible_keys: idx_name, idx_age
-- 实际可能只用其中一个
```

::: tip possible_keys 为 NULL
possible_keys 为 NULL 表示没有可用索引，通常意味着需要考虑添加索引。但也可能是优化器认为全表扫描更快（数据量小或区分度低）。
:::

### key

实际使用的索引。为 NULL 表示没有使用索引。

```sql
EXPLAIN SELECT * FROM users WHERE name = 'Alice';
-- possible_keys: idx_name
-- key: idx_name  -- 实际使用了 idx_name
```

### key_len

实际使用的索引长度（字节数）。用于判断联合索引使用了几列。

```sql
-- 联合索引 idx_name_age(name, age)
-- name: VARCHAR(32), utf8mb4 → 32*4 + 2 = 130 bytes（可变长度 + 2字节长度标识）
-- age: INT → 4 bytes

EXPLAIN SELECT * FROM users WHERE name = 'Alice';
-- key_len = 130（只用了 name 列）

EXPLAIN SELECT * FROM users WHERE name = 'Alice' AND age = 25;
-- key_len = 134（用了 name + age 两列：130 + 4 = 134）

EXPLAIN SELECT * FROM users WHERE name LIKE 'Ali%';
-- key_len = 130（前缀匹配，只用了 name 列）
```

::: tip key_len 的计算规则
| 数据类型 | key_len |
|---------|---------|
| CHAR(N) utf8mb4 | N * 4 |
| VARCHAR(N) utf8mb4 | N * 4 + 2 |
| INT | 4 |
| BIGINT | 8 |
| DATE | 3 |
| DATETIME | 5 |
| TIMESTAMP | 4 |
| NULL 列额外 | +1 |

如果允许 NULL，每个可空列额外加 1 字节。
:::

### ref

索引的比较对象。可能的值：

| 值 | 含义 |
|---|------|
| `const` | 使用常量值与索引比较 |
| `库名.表名.列名` | 使用其他表的列与索引比较 |
| `NULL` | 没有使用索引或使用了范围查询 |

```sql
-- const
EXPLAIN SELECT * FROM users WHERE name = 'Alice';
-- ref = const（常量 'Alice'）

-- 关联字段
EXPLAIN SELECT * FROM users u JOIN orders o ON u.id = o.user_id;
-- u 表：ref = NULL（全表扫描）
-- o 表：ref = test.u.id（使用 u 表的 id 列进行比较）
```

### rows

MySQL 估计需要扫描的行数。**不是精确值**，但可以用来判断查询效率。

```sql
EXPLAIN SELECT * FROM users WHERE id = 1;
-- rows = 1（主键查询，精确）

EXPLAIN SELECT * FROM users WHERE age > 25;
-- rows = 500000（没有索引，全表扫描）
-- 这个数字越大，查询越慢
```

::: tip rows 是估算值
rows 是 InnoDB 根据索引统计信息估算的，可能与实际行数有偏差。可以用 `ANALYZE TABLE` 更新统计信息。
:::

### filtered

按表条件过滤后，剩余行数占 rows 的百分比。

```sql
EXPLAIN SELECT * FROM users WHERE age > 25 AND status = 1;
-- rows = 1000000（扫描 100 万行）
-- filtered = 10.00（只有 10% 满足条件）
-- 实际返回约 100000 行

-- filtered * rows / 100 = 实际返回行数的估算值
```

### Extra

额外的重要信息，包含多种可能的值。

#### Using index（覆盖索引）

查询所需的所有列都可以从索引中获取，不需要回表。**这是最好的情况之一。**

```sql
-- 假设有联合索引 idx_name_age(name, age)
EXPLAIN SELECT name, age FROM users WHERE name = 'Alice';
-- Extra: Using index
-- 所需要的列（name, age）都在索引中，不需要回表查聚簇索引
```

::: tip 覆盖索引的优化效果
覆盖索引避免了回表操作（随机 IO），大大提升查询性能。优化时应尽量让查询列被索引覆盖。
:::

#### Using where

在 Server 层（而非存储引擎层）进行了 WHERE 条件过滤。

```sql
EXPLAIN SELECT * FROM users WHERE age > 25 AND name = 'Alice';
-- 如果只用了 idx_name
-- Storage Engine 层：用 name='Alice' 过滤
-- Server 层：用 age>25 过滤
-- Extra: Using where
```

#### Using index condition（索引下推 ICP）

MySQL 5.6+ 引入的优化。将部分 WHERE 条件下推到存储引擎层，在索引遍历过程中直接过滤，减少回表次数。

```sql
-- 联合索引 idx_name_age(name, age)
EXPLAIN SELECT * FROM users WHERE name LIKE 'A%' AND age = 25;
-- Extra: Using index condition

-- 没有 ICP（MySQL 5.6 之前）：
--   1. 存储引擎找到所有 name LIKE 'A%' 的记录
--   2. 回表取出完整行
--   3. Server 层过滤 age = 25

-- 有 ICP（MySQL 5.6+）：
--   1. 存储引擎找到所有 name LIKE 'A%' 的记录
--   2. 在索引层面直接检查 age = 25（不需要回表就过滤掉不满足的）
--   3. 只对满足条件的记录回表
```

::: tip 索引下推只适用于二级索引
ICP 对聚簇索引（主键）的查询没有效果，因为聚簇索引本身不需要回表。ICP 的优化在于减少二级索引的回表次数。
:::

#### Using filesort

需要额外的排序操作，无法利用索引完成排序。**应尽量避免。**

```sql
EXPLAIN SELECT * FROM users WHERE age > 25 ORDER BY name;
-- 如果 age 上有索引但没有 (age, name) 联合索引
-- Extra: Using filesort
-- MySQL 需要额外排序，性能较差

-- 优化方案：添加联合索引
ALTER TABLE users ADD INDEX idx_age_name(age, name);
EXPLAIN SELECT * FROM users WHERE age > 25 ORDER BY name;
-- Extra: (无 Using filesort)
-- 利用索引的有序性，不再需要额外排序
```

::: warning filesort 的代价
filesort 不一定使用文件排序（可能在内存中完成），但一定意味着额外的排序开销。当排序数据量大时，会使用临时文件。
:::

#### Using temporary

使用临时表来处理查询。**通常需要优化。**

```sql
-- DISTINCT 去重
EXPLAIN SELECT DISTINCT name FROM users WHERE age > 25;
-- Extra: Using temporary
-- 需要临时表来去重

-- GROUP BY 没有合适的索引
EXPLAIN SELECT name, COUNT(*) FROM users GROUP BY name;
-- 如果没有 idx_name 索引
-- Extra: Using temporary; Using filesort
```

#### Using join buffer (Block Nested Loop)

JOIN 操作没有使用索引，使用 Block Nested-Loop 算法。

```sql
-- orders 表的 user_id 没有索引
EXPLAIN SELECT * FROM users u JOIN orders o ON u.id = o.user_id;
-- orders 表：Extra: Using join buffer (Block Nested Loop)
-- 说明 orders 表没有可用索引，使用了 join buffer
```

::: danger Using join buffer
出现 Using join buffer 说明被驱动表的关联字段没有索引，JOIN 性能很差。应该在被驱动表的关联字段上添加索引。
:::

## EXPLAIN ANALYZE（MySQL 8.0.18+）

`EXPLAIN ANALYZE` 会**实际执行**查询，提供真实的执行统计信息，包括实际行数和执行时间。

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 1
GROUP BY u.name
ORDER BY order_count DESC
LIMIT 10;

-- 输出示例（TREE 格式）：
-- -> Limit: 10 row(s)  (actual time=15.234..15.235 rows=10 loops=1)
--     -> Sort: order_count DESC, limit input to 10 row(s) per chunk  (actual time=15.233..15.234 rows=10 loops=1)
--         -> Table scan on <temporary>  (actual time=15.100..15.200 rows=50 loops=1)
--             -> Aggregate using temporary table  (actual time=15.099..15.199 rows=50 loops=1)
--                 -> Nested loop left join  (actual time=0.150..14.500 rows=5000 loops=1)
--                     -> Filter: (u.status = 1)  (actual time=0.100..5.200 rows=8000 loops=1)
--                         -> Table scan on u  (actual time=0.095..4.800 rows=10000 loops=1)
--                     -> Index lookup on o using idx_user_id (user_id=u.id)  (actual time=0.001..0.001 rows=1 loops=8000)
```

::: tip EXPLAIN vs EXPLAIN ANALYZE
- `EXPLAIN` 只是分析，不实际执行查询，显示的是**估算值**
- `EXPLAIN ANALYZE` 实际执行查询，显示的是**真实值**（包括实际行数、循环次数、执行时间）
- 使用 `EXPLAIN ANALYZE` 时要小心，对于慢查询可能会真的执行很久
:::
