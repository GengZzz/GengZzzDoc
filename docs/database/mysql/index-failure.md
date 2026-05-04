# 索引失效场景全解

索引建了但不生效，是线上最常见的性能问题之一。以下列出所有导致索引失效的场景，每种场景都给出 SQL 示例和 EXPLAIN 验证方法。

---

## 1. 对索引列使用函数

对索引列使用任何函数（包括内置函数和自定义函数），都会导致索引失效。因为 B+ 树存储的是列的原始值，函数运算后的结果不在索引中。

```sql
-- 索引：idx_create_time (create_time)

-- 失效：对索引列使用 YEAR() 函数
SELECT * FROM orders WHERE YEAR(create_time) = 2024;
-- type: ALL, key: NULL, rows: 全表

-- 失效：对索引列使用 DATE_FORMAT()
SELECT * FROM orders WHERE DATE_FORMAT(create_time, '%Y-%m') = '2024-01';
-- type: ALL, key: NULL

-- 失效：对索引列使用 DATE()
SELECT * FROM orders WHERE DATE(create_time) = '2024-01-15';
-- type: ALL, key: NULL
```

**正确写法**：改写为范围查询，不要对索引列做运算：

```sql
-- 正确：用范围查询代替函数
SELECT * FROM orders
WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01';
-- type: range, key: idx_create_time ✓

-- 正确：DATE() 的等价写法
SELECT * FROM orders
WHERE create_time >= '2024-01-15' AND create_time < '2024-01-16';
-- type: range, key: idx_create_time ✓

-- 正确：DATE_FORMAT 的等价写法
SELECT * FROM orders
WHERE create_time >= '2024-01-01' AND create_time < '2024-02-01';
-- type: range, key: idx_create_time ✓
```

::: danger LEFT() / SUBSTRING() 同样失效
```sql
-- 失效
SELECT * FROM users WHERE LEFT(phone, 3) = '138';

-- 如果确实需要按前缀查询，考虑建立前缀索引
ALTER TABLE users ADD INDEX idx_phone_prefix (phone(3));
SELECT * FROM users WHERE phone LIKE '138%';  -- 这个能用索引
```
:::

---

## 2. 隐式类型转换

当查询值的类型与列定义的类型不匹配时，MySQL 会进行隐式类型转换，相当于对索引列使用了函数。

```sql
-- phone 列是 VARCHAR(20)
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    phone VARCHAR(20),
    INDEX idx_phone (phone)
);

-- 失效：传入数值而非字符串，触发隐式类型转换
SELECT * FROM users WHERE phone = 13800000000;
-- 等价于：WHERE CAST(phone AS DECIMAL) = 13800000000
-- type: ALL, key: NULL

-- 正确：传入字符串
SELECT * FROM users WHERE phone = '13800000000';
-- type: ref, key: idx_phone ✓
```

验证隐式类型转换：

```sql
-- 查看 MySQL 如何执行这个查询
SHOW WARNINGS;
-- 或者用 EXPLAIN FORMAT=JSON
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE phone = 13800000000\G
-- 在 attached_condition 中可以看到 CAST 函数
```

更多的隐式类型转换场景：

```sql
-- VARCHAR 列与 INT 比较
SELECT * FROM users WHERE phone = 13800000000;         -- 失效

-- CHAR 列与 INT 比较
SELECT * FROM users WHERE code = 12345;                 -- code 是 CHAR，失效

-- DATE 列与字符串比较（这个不会失效，因为 MySQL 的隐式转换对 DATE 有效）
SELECT * FROM orders WHERE create_time = '2024-01-15';  -- 通常可以

-- ENUM 列与字符串比较（不会失效）
SELECT * FROM orders WHERE status = 1;                  -- status 是 ENUM，通常可以
```

::: warning 数字字符串字段的陷阱
```sql
-- 如果 phone 定义为 VARCHAR，查询时必须传字符串
-- 如果 code 定义为 VARCHAR，查询时必须传字符串
-- 团队规范：所有字符串类型的查询参数，应用层强制转为字符串
```
:::

---

## 3. 隐式字符集转换

当 JOIN 的两张表使用不同的字符集时，MySQL 会对其中一张表的列做隐式字符集转换，导致索引失效。

```sql
-- 表 orders 使用 utf8mb4
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    order_no VARCHAR(32) CHARACTER SET utf8mb4,
    INDEX idx_order_no (order_no)
);

-- 表 order_log 使用 utf8（假设是历史遗留表）
CREATE TABLE order_log (
    id BIGINT PRIMARY KEY,
    order_no VARCHAR(32) CHARACTER SET utf8,
    log_content TEXT
);

-- JOIN 时字符集不一致
SELECT o.*, l.log_content
FROM orders o
JOIN order_log l ON l.order_no = o.order_no
WHERE o.order_no = 'ORD2024010001';
```

MySQL 需要将 `utf8` 的 `order_no` 转换为 `utf8mb4`（或反过来），相当于对 `order_log.order_no` 使用了 `CONVERT()` 函数，索引失效。

```sql
-- EXPLAIN 结果
-- orders 表：type: ref, key: idx_order_no  (正常)
-- order_log 表：type: ALL, key: NULL        (索引失效)
```

**解决方案**：统一字符集

```sql
-- 修改表的字符集
ALTER TABLE order_log CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 之后的 JOIN 查询可以正常使用索引
```

::: danger 生产环境统一字符集
所有表统一使用 `utf8mb4`，杜绝隐式字符集转换。在新建数据库时就设定好默认字符集：

```sql
CREATE DATABASE mydb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
:::

---

## 4. LIKE 以通配符开头

```sql
-- 索引：idx_name (name)

-- 可以使用索引：前缀匹配
SELECT * FROM users WHERE name LIKE '张%';
-- type: range, key: idx_name ✓

-- 失效：通配符开头
SELECT * FROM users WHERE name LIKE '%张';
-- type: ALL, key: NULL

-- 失效：通配符前后都有
SELECT * FROM users WHERE name LIKE '%张三%';
-- type: ALL, key: NULL
```

原理：B+ 树是按列值排序的。`LIKE '张%'` 可以在 B+ 树中定位到所有以 '张' 开头的范围。但 `LIKE '%张'` 需要逐条匹配，无法利用有序性。

**替代方案**：

```sql
-- 方案 1：全文索引（适合文本搜索）
ALTER TABLE users ADD FULLTEXT INDEX ft_name (name);
SELECT * FROM users WHERE MATCH(name) AGAINST('张三');

-- 方案 2：搜索引擎（Elasticsearch）
-- 如果是模糊搜索场景，ES 远比 MySQL 全文索引强大

-- 方案 3：业务层优化（如果可能的话，避免前缀通配符）
SELECT * FROM users WHERE name LIKE '张%';  -- 能用索引
```

::: tip 覆盖索引 + LIKE 前缀通配符的特殊情况
```sql
-- 即使 LIKE '%abc' 无法用索引过滤，但如果索引可以覆盖查询列
-- MySQL 可能选择扫描整个索引（比扫描全表数据更快）
SELECT id, name FROM users WHERE name LIKE '%张%';
-- Extra: Using index（扫描索引而非表数据，虽然还是全索引扫描）
```
:::

---

## 5. OR 条件部分列无索引

```sql
-- 只有 idx_name，没有 idx_age
ALTER TABLE users ADD INDEX idx_name (name);

-- 失效：age 列没有索引，整个 OR 条件无法使用索引
SELECT * FROM users WHERE name = '张三' OR age = 25;
-- type: ALL, key: NULL

-- 能用索引：两个列都有索引，MySQL 使用 Index Merge
ALTER TABLE users ADD INDEX idx_age (age);
SELECT * FROM users WHERE name = '张三' OR age = 25;
-- type: index_merge, Extra: Using union(idx_name, idx_age) ✓
```

**正确写法**：确保 OR 的每一列都有索引，或者改写为 UNION：

```sql
-- 改写为 UNION ALL（避免 Index Merge 的开销）
SELECT * FROM users WHERE name = '张三'
UNION ALL
SELECT * FROM users WHERE age = 25 AND name != '张三';
-- 防止 '张三' 且 age=25 的记录被重复计算
```

::: tip 用 UNION 替代 OR 是常见优化手段
```sql
-- 慢：OR 条件
SELECT * FROM orders WHERE user_id = 1 OR status = 2;
-- 如果 status 有索引但 user_id 无索引，全部失效

-- 快：UNION（每个子查询独立使用索引）
SELECT * FROM orders WHERE user_id = 1
UNION ALL
SELECT * FROM orders WHERE status = 2 AND user_id != 1;
```
:::

---

## 6. NOT IN / NOT EXISTS

```sql
-- 索引：idx_status (status)

-- 失效：NOT IN
SELECT * FROM orders WHERE status NOT IN (1, 2, 3);
-- type: ALL, key: NULL

-- 失效：NOT EXISTS
SELECT * FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM order_item oi WHERE oi.order_id = o.id
);
-- orders 表通常全表扫描

-- 失效：!= 或 NOT IN 的子查询
SELECT * FROM orders WHERE user_id NOT IN (SELECT id FROM blacklist);
```

**原因**：NOT IN 和 NOT EXISTS 通常需要扫描大部分数据，优化器认为全表扫描比走索引更高效。

**部分场景可以用索引**：

```sql
-- 如果 NOT IN 的范围很小，排除的数据很少，优化器可能选择索引
SELECT * FROM orders WHERE status NOT IN (99);
-- 假设 status=99 的记录极少，其他记录占 99%+，仍然会全表扫描

-- 改写为 LEFT JOIN + IS NULL
SELECT o.*
FROM orders o
LEFT JOIN blacklist b ON b.user_id = o.user_id
WHERE b.user_id IS NULL;
```

---

## 7. 联合索引不满足最左前缀

详见 [索引优化](./index-optimization.md) 中的最左前缀原则。

```sql
-- 联合索引 (a, b, c)

-- 失效：跳过第一列
SELECT * FROM t WHERE b = 1 AND c = 2;
-- key: NULL

-- 失效：跳过中间列
SELECT * FROM t WHERE a = 1 AND c = 2;
-- c 无法利用索引（只用了 a 列）

-- 正确：满足最左前缀
SELECT * FROM t WHERE a = 1 AND b = 2 AND c = 3;
-- key: idx_abc, 使用了全部三列
```

---

## 8. IS NOT NULL（部分场景）

```sql
-- 索引：idx_email (email)

-- IS NULL 可以用索引
SELECT * FROM users WHERE email IS NULL;
-- type: ref, key: idx_email ✓

-- IS NOT NULL 可能失效，取决于 NULL 值的比例
SELECT * FROM users WHERE email IS NOT NULL;
-- 如果大部分记录的 email 非 NULL → type: ALL（全表扫描）
-- 如果大部分记录的 email 为 NULL → type: range（使用索引）
```

**原因**：优化器根据 NULL 值的比例决定是否使用索引。如果 IS NOT NULL 匹配的数据量很大（如 95%），走索引再回表反而比全表扫描慢。

::: tip IS NOT NULL 的优化建议
1. 尽量设置 NOT NULL 约束 + DEFAULT 值，避免 NULL 值
2. 如果业务允许，将 IS NOT NULL 改为范围查询或其他更高效的条件
3. 使用 COALESCE 或 IFNULL 提供默认值
:::

---

## 9. 使用 != 或 <> 操作符

```sql
-- 索引：idx_status (status)

-- 失效：!= 排除的范围太大
SELECT * FROM orders WHERE status != 0;
-- 如果 status=0 占 10% 的数据，则 status != 0 占 90%
-- type: ALL, 优化器认为全表扫描更高效

-- 可能生效：!= 排除的数据量小
SELECT * FROM orders WHERE status != 99;
-- 如果 status=99 的记录极少，可能用索引（但概率低）
```

**改写方案**：

```sql
-- 如果 status 可枚举，用 IN 替代 !=
SELECT * FROM orders WHERE status IN (1, 2, 3);
-- 比 != 更容易走索引
```

---

## 10. 索引列参与计算

```sql
-- 索引：idx_price (price)

-- 失效：索引列参与运算
SELECT * FROM products WHERE price * 0.8 > 100;
-- 等价于 WHERE price > 100 / 0.8 但 MySQL 不会自动转换
-- type: ALL, key: NULL

-- 正确：把运算移到值上
SELECT * FROM products WHERE price > 100 / 0.8;
-- type: range, key: idx_price ✓

-- 正确：直接写计算结果
SELECT * FROM products WHERE price > 125;
-- type: range, key: idx_price ✓
```

更多的计算失效场景：

```sql
-- 失效：加法
SELECT * FROM orders WHERE total_amount + 10 > 100;

-- 正确
SELECT * FROM orders WHERE total_amount > 90;

-- 失效：字符串拼接
SELECT * FROM users WHERE CONCAT(first_name, last_name) = '张三';

-- 正确：在应用层拼接，或改为分别查询
SELECT * FROM users WHERE first_name = '张' AND last_name = '三';

-- 失效：数学函数
SELECT * FROM orders WHERE ABS(discount) > 10;

-- 正确：如果 discount 可能为负，考虑设计上改进
SELECT * FROM orders WHERE discount > 10 OR discount < -10;
```

::: danger 核心原则
**永远不要对索引列做任何运算**。如果需要对列做运算，将运算移到值（常量）的一侧。
:::

---

## 11. 数据量太小优化器选择全表扫描

当表的数据量很小时（如几百行），即使有索引，优化器也可能选择全表扫描，因为：
- 全表扫描只需要顺序读取少量数据页
- 走索引需要先读索引页再回表，反而更慢

```sql
-- 表只有 100 行
SELECT * FROM users WHERE age = 25;
-- type: ALL, key: NULL（不是索引失效，是优化器的合理选择）
```

验证方式：

```sql
-- 强制使用索引，对比性能
SELECT * FROM users FORCE INDEX (idx_age) WHERE age = 25;
SELECT * FROM users USE INDEX (idx_age) WHERE age = 25;
-- 如果强制用索引后反而更慢，说明优化器的选择是正确的
```

---

## 快速诊断索引失效

当怀疑索引失效时，使用以下流程排查：

```sql
-- 1. EXPLAIN 查看执行计划
EXPLAIN SELECT * FROM orders WHERE ...;

-- 关注这些字段：
-- type = ALL        → 全表扫描，索引很可能失效
-- key = NULL        → 没有使用任何索引
-- rows = 很大的数    → 扫描行数多

-- 2. EXPLAIN FORMAT=JSON 查看详细信息
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE ...;
-- 关注 attached_condition 中是否有 CAST、CONVERT 等函数

-- 3. SHOW WARNINGS 查看改写后的 SQL
EXPLAIN SELECT * FROM orders WHERE phone = 13800000000;
SHOW WARNINGS;
-- 可以看到 MySQL 实际执行的 SQL（包含隐式转换）

-- 4. 检查索引是否存在
SHOW INDEX FROM orders;

-- 5. 检查表的字符集一致性
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb';
```

---

## 索引失效场景速查表

| 场景 | 示例 | 是否失效 | 正确写法 |
|------|------|---------|---------|
| 对列用函数 | `WHERE YEAR(create_time) = 2024` | 是 | `WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01'` |
| 隐式类型转换 | `WHERE phone = 138` (VARCHAR列) | 是 | `WHERE phone = '138'` |
| 隐式字符集转换 | JOIN 表字符集不同 | 是 | 统一字符集为 utf8mb4 |
| LIKE 通配符开头 | `WHERE name LIKE '%abc'` | 是 | `LIKE 'abc%'` 或全文索引 |
| OR 部分列无索引 | `WHERE name = 'a' OR age = 1` (age无索引) | 是 | 给 age 建索引，或用 UNION |
| NOT IN | `WHERE status NOT IN (1,2)` | 通常 | 改写为 LEFT JOIN + IS NULL |
| 联合索引不满足最左前缀 | `WHERE b = 1` (索引是 a,b) | 是 | 确保查询包含第一列 |
| IS NOT NULL | `WHERE email IS NOT NULL` | 部分 | 设置 NOT NULL + DEFAULT |
| != 或 <> | `WHERE status != 0` | 通常 | 用 IN 列出所有可能值 |
| 列参与计算 | `WHERE price * 0.8 > 100` | 是 | `WHERE price > 125` |
| 数据量太小 | 小表查询 | 否（正常行为） | 不需要优化 |
