# 覆盖索引与索引下推

## 覆盖索引 (Covering Index)

### 原理

覆盖索引不是一种独立的索引类型，而是索引的一种**使用方式**。当查询所需的所有列都包含在某个二级索引中时，InnoDB 不需要回表到聚簇索引取数据，直接从二级索引就能返回结果。

```
普通查询（需要回表）：
SELECT id, name, age, email FROM users WHERE name = '张三';

二级索引 (name)       →  找到 name='张三' 对应的主键 id
聚簇索引 (id)         →  用 id 回表获取 age, email
                        每匹配一行就一次随机 IO

覆盖索引查询（无需回表）：
SELECT id, name, age FROM users WHERE name = '张三';

联合索引 (name, age)  →  name='张三' 的记录中已经包含了 id 和 age
                        直接返回，零回表
```

### 如何判断是否使用了覆盖索引

通过 `EXPLAIN` 的 `Extra` 字段判断：

```sql
-- 假设有索引 idx_name_age (name, age)

EXPLAIN SELECT id, name, age FROM users WHERE name = '张三'\G
```

```
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: users
         type: ref
possible_keys: idx_name_age
          key: idx_name_age
      key_len: 202
          ref: const
         rows: 1
        Extra: Using index       ← 这就是覆盖索引的标志
```

对比非覆盖索引的情况：

```sql
-- email 不在索引中
EXPLAIN SELECT id, name, age, email FROM users WHERE name = '张三'\G
```

```
*************************** 1. row ***************************
          key: idx_name_age
        Extra: Using index condition   ← 没有 "Using index"，需要回表
```

### 覆盖索引的典型应用场景

#### 场景一：分页查询优化

```sql
-- 慢：先回表取所有列，再取 10 条
SELECT * FROM orders
WHERE user_id = 12345
ORDER BY created_at DESC
LIMIT 10000, 10;

-- 快：先用覆盖索引定位 id，再回表取少量数据
SELECT o.*
FROM orders o
INNER JOIN (
    SELECT id FROM orders
    WHERE user_id = 12345
    ORDER BY created_at DESC
    LIMIT 10000, 10
) AS tmp ON o.id = tmp.id;

-- 内层子查询只查 id（主键），完全覆盖，不需要回表
-- 外层只对 10 条 id 回表
```

::: tip 这种优化的关键
子查询 `SELECT id` 只需要二级索引就能完成，即使 OFFSET 很大（如 10000），也不会产生 10000 次回表。外层只对最终的 10 条结果回表。
:::

#### 场景二：COUNT 查询

```sql
-- 如果有索引 idx_user_status (user_id, status)
-- 这个查询可以覆盖
SELECT COUNT(*) FROM orders WHERE user_id = 12345 AND status = 2;
-- Extra: Using index

-- COUNT(status) 也可以覆盖（status 在索引中）
SELECT COUNT(status) FROM orders WHERE user_id = 12345;

-- COUNT(*) 和 COUNT(列) 的区别：
-- COUNT(*) 统计行数，不关心列值
-- COUNT(列) 统计该列非 NULL 的行数
```

#### 场景三：统计查询

```sql
-- 索引 (user_id, status, created_at)
-- 这个统计查询完全覆盖
SELECT user_id, status, COUNT(*)
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY user_id, status;

-- 如果索引按 (created_at, user_id, status) 排列，覆盖效果更好
-- 因为 created_at 是范围查询，放前面更合理
```

### 覆盖索引的代价

| 代价 | 说明 |
|------|------|
| 索引体积增大 | 联合索引包含更多列，占用更多磁盘和内存 |
| 写入变慢 | INSERT/UPDATE/DELETE 需要维护更大的索引 |
| Buffer Pool 压力 | 更多的索引页需要缓存 |

::: warning 不要过度追求覆盖索引
如果为了覆盖某个查询，需要将 5 个列加入联合索引，导致索引体积超过表数据的一半，就得不偿失了。

**原则**：只对高频查询考虑覆盖索引，低频查询接受回表。
:::

---

## 索引下推 (Index Condition Pushdown, ICP)

### 什么是 ICP

索引下推是 MySQL 5.6 引入的优化。在没有 ICP 之前，存储引擎层只负责索引查找，所有 WHERE 条件都在 Server 层过滤。有了 ICP，部分 WHERE 条件可以**下推**到存储引擎层，在读取索引时就直接过滤。

### 没有 ICP 的执行流程（MySQL 5.5 及之前）

```sql
-- 索引 (name, age)
SELECT * FROM users WHERE name LIKE '张%' AND age = 25;
```

```
存储引擎层：
  1. 在索引中找到 name LIKE '张%' 的所有记录
  2. 每条记录都回表取完整行数据
  3. 将完整行数据交给 Server 层

Server 层：
  4. 用 age = 25 条件过滤
  5. 如果 name = '张三' 且 age ≠ 25，这行数据白回表了
```

假设 name LIKE '张%' 匹配 1000 条，其中只有 10 条 age = 25：
- 回表 1000 次（其中 990 次是无效的）

### 有 ICP 的执行流程（MySQL 5.6+）

```
存储引擎层：
  1. 在索引中找到 name LIKE '张%' 的所有记录
  2. 在索引中直接检查 age = 25（age 在联合索引中）
  3. 只对满足 age = 25 的记录回表
  4. 将完整行数据交给 Server 层

Server 层：
  5. 数据已经过滤完毕，直接返回
```

同样的场景：
- 只回表 10 次

### 如何判断是否使用了 ICP

```sql
EXPLAIN SELECT * FROM users WHERE name LIKE '张%' AND age = 25\G
```

```
*************************** 1. row ***************************
          key: idx_name_age
        Extra: Using index condition   ← 这就是 ICP 的标志
```

| Extra 值 | 含义 |
|----------|------|
| `Using index condition` | 使用了索引下推 |
| `Using index` | 使用了覆盖索引 |
| `Using index condition; Using index` | 同时使用了 ICP 和覆盖索引 |

### ICP 的适用条件

1. **目标索引包含需要下推的列**：联合索引 (name, age) 中，age 可以下推
2. **适用于 range、ref、eq_ref、ref_or_null 访问类型**
3. **不适用于覆盖索引**（覆盖索引不需要回表，ICP 也就没有意义）

```sql
-- 联合索引 (name, age, city)

-- ICP 可以下推 age 和 city
SELECT * FROM users WHERE name = '张三' AND age > 20 AND city = '北京';
-- 因为 name, age, city 都在索引中，过滤条件可以全部下推

-- ICP 只能下推到 age（范围查询后的列无法继续下推 city 的精确匹配）
SELECT * FROM users WHERE name LIKE '张%' AND city = '北京' AND age > 20;
-- name 是范围查询，age 和 city 可以下推（但 city 不在 name 范围之后的有序部分中，
-- 实际只能下推 age）
```

---

## 覆盖索引 vs 索引下推

两者是**不同层面**的优化，可以同时生效：

| 特性 | 覆盖索引 | 索引下推 |
|------|---------|---------|
| 优化目标 | 避免回表 | 减少回表次数 |
| 实现方式 | 查询列全在索引中 | WHERE 条件在索引中过滤 |
| Extra 标志 | `Using index` | `Using index condition` |
| 收益 | 完全消除回表 IO | 减少无效回表 IO |
| 可否共存 | 可以 | 可以 |

```
场景：索引 (name, age, city)，查询 SELECT * FROM users WHERE name LIKE '张%' AND age > 20

  ICP 发挥作用：
    存储引擎在索引中过滤 name LIKE '张%' AND age > 20
    只对匹配的记录回表（减少了回表次数）
    Extra: Using index condition

场景：索引 (name, age, city)，查询 SELECT id, name, age FROM users WHERE name LIKE '张%'

  覆盖索引发挥作用：
    查询的列 id, name, age 都在索引中
    完全不需要回表
    Extra: Using index

场景：索引 (name, age, city)，查询 SELECT id, name, age FROM users WHERE name LIKE '张%' AND age > 20

  两者同时发挥作用：
    ICP 过滤 age > 20（在索引层过滤，减少需要处理的记录数）
    覆盖索引避免回表（查询列都在索引中）
    Extra: Using index condition; Using index
```

---

## 实际案例：优化一个需要回表的查询

### 问题

```sql
-- 原始查询
SELECT o.id, o.order_no, o.user_id, o.total_amount, o.status, o.created_at
FROM orders o
WHERE o.user_id = 12345
  AND o.status IN (1, 2, 3)
  AND o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC
LIMIT 20;

-- 现有索引：idx_user (user_id)
-- 数据量：1000 万订单，user_id = 12345 约 5000 条
-- 执行时间：2.1 秒
```

### 分析

```sql
EXPLAIN SELECT ...\G
```

```
          key: idx_user
        rows: 5000
        Extra: Using where; Using filesort
```

问题：
1. `idx_user` 只按 user_id 过滤，5000 条记录需要回表
2. 回表后还需要用 status 和 created_at 过滤
3. 没有利用索引排序，需要 filesort

### 优化方案

```sql
-- 方案 1：联合索引 (user_id, status, created_at)
ALTER TABLE orders ADD INDEX idx_user_status_created (user_id, status, created_at);

-- 方案 2：覆盖索引（如果查询列都在索引中）
-- 查询的列：id, order_no, user_id, total_amount, status, created_at
-- id 是主键（二级索引自带）
-- user_id, status, created_at 已在索引中
-- 缺少 order_no 和 total_amount
ALTER TABLE orders DROP INDEX idx_user_status_created;
ALTER TABLE orders ADD INDEX idx_covering (
    user_id, status, created_at, order_no, total_amount
);
```

验证方案 2 的效果：

```sql
EXPLAIN SELECT o.id, o.order_no, o.user_id, o.total_amount, o.status, o.created_at
FROM orders o
WHERE o.user_id = 12345
  AND o.status IN (1, 2, 3)
  AND o.created_at >= '2024-01-01'
ORDER BY o.created_at DESC
LIMIT 20\G
```

```
          key: idx_covering
        rows: 300
        Extra: Using where; Using index   ← 覆盖索引
```

### 优化结果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 索引 | idx_user | idx_covering |
| 扫描行数 | 5000 | 300 |
| 回表次数 | 5000 | 0 |
| 排序 | filesort | 索引排序 |
| 执行时间 | 2.1s | 12ms |

::: tip 索引设计决策
覆盖索引 `(user_id, status, created_at, order_no, total_amount)` 包含 5 列，索引体积较大。但考虑到这是最高频的查询模式，收益远大于代价。

如果这个查询不是最高频的，方案 1（3 列联合索引）已经足够好，只是需要少量回表。
:::
