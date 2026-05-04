# JOIN 优化

JOIN 是 SQL 中最强大的操作之一，也是最容易出现性能问题的地方。理解 JOIN 的底层算法和优化策略，对编写高效查询至关重要。

## JOIN 算法

### Nested-Loop Join (NLJ)

NLJ 是最基础的 JOIN 算法。对外层表（驱动表）的每一行，在内层表（被驱动表）上执行一次查找。

```
for each row r1 in 驱动表:
    for each row r2 in 被驱动表 where join_key = r1.join_key:
        output (r1, r2)
```

```sql
-- 有索引时的 NLJ
EXPLAIN SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- u 表（驱动表）：全表扫描 10000 行
-- o 表（被驱动表）：每次通过 idx_user_id 查找，约 3 行
-- 总扫描次数 ≈ 10000 + 10000*3 = 40000

-- 输出示例：
-- +----+-------------+-------+------+---------------+-------------+---------+-------------------+------+-------------+
-- | id | select_type | table | type | possible_keys | key         | key_len | ref               | rows | Extra       |
-- +----+-------------+-------+------+---------------+-------------+---------+-------------------+------+-------------+
-- |  1 | SIMPLE      | u     | ALL  | PRIMARY       | NULL        | NULL    | NULL              | 10000|             |
-- |  1 | SIMPLE      | o     | ref  | idx_user_id   | idx_user_id | 8       | test.u.id         |    3 | Using where |
-- +----+-------------+-------+------+---------------+-------------+---------+-------------------+------+-------------+
```

::: tip NLJ 的效率取决于被驱动表的索引
NLJ 在被驱动表有索引时效率很高。外层扫描 N 行，内层每次查找消耗 O(log M)，总复杂度为 O(N * log M)。但如果被驱动表没有索引，内层需要全表扫描，复杂度退化为 O(N * M)。
:::

### Block Nested-Loop Join (BNL)

当被驱动表的关联字段没有索引时，InnoDB 使用 BNL 算法。它将驱动表的数据分批读入 `join_buffer`，然后一次性与被驱动表比较，减少内层表的扫描次数。

```
for each batch b1 in 驱动表 (填满 join_buffer):
    for each row r2 in 被驱动表:
        for each row r1 in b1:
            if r1.join_key = r2.join_key:
                output (r1, r2)
```

```sql
-- 没有索引时的 BNL
-- join_buffer_size = 256KB（默认）
SHOW VARIABLES LIKE 'join_buffer_size';
-- +-----------------+--------+
-- | Variable_name   | Value  |
-- +-----------------+--------+
-- | join_buffer_size| 262144 |
-- +-----------------+--------+

-- 假设驱动表每行 100 bytes，join_buffer 可以放 2560 行
-- 驱动表共 10000 行，需要分 4 批
-- 被驱动表需要扫描 4 次（而不是 10000 次）
-- 大幅减少了内层表的扫描次数

EXPLAIN SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- 如果 orders.user_id 没有索引：
-- o 表：Extra: Using join buffer (Block Nested Loop)
```

::: warning BNL 的性能
BNL 虽然比纯 NLJ（无索引时）好很多，但仍然远不如有索引的 NLJ。`join_buffer` 越大，分批越少，性能越好。可以考虑增大 `join_buffer_size`：
```sql
SET SESSION join_buffer_size = 1024 * 1024; -- 1MB
```
但根本解决方案是给被驱动表的关联字段添加索引。
:::

### Hash Join（MySQL 8.0.18+）

MySQL 8.0.18 引入 Hash Join 替代 BNL。它分为两个阶段：

1. **构建阶段（Build）**：将较小的表（驱动表）的数据构建成哈希表，存储在内存中
2. **探测阶段（Probe）**：遍历较大的表（被驱动表），用每一行的关联键去哈希表中查找匹配

```
阶段 1（Build）：扫描驱动表，构建哈希表
hash_table = {}
for each row r1 in 驱动表:
    key = hash(r1.join_key)
    hash_table[key].append(r1)

阶段 2（Probe）：扫描被驱动表，探测匹配
for each row r2 in 被驱动表:
    key = hash(r2.join_key)
    for each r1 in hash_table[key]:
        if r1.join_key = r2.join_key:
            output (r1, r2)
```

```sql
-- MySQL 8.0.18+ 自动选择 Hash Join
EXPLAIN FORMAT=TREE
SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- 输出示例：
-- -> Hash join (o.user_id = u.id)  (cost=1250.00 rows=50000)
--     -> Table scan on o  (cost=150.00 rows=50000)
--     -> Hash
--         -> Table scan on u  (cost=1000.00 rows=10000)

-- 如果内存不够，会使用磁盘临时文件
-- 输出中会显示 (BKA) 或 (hash) 标记
```

::: tip Hash Join vs BNL
- Hash Join 比 BNL 更高效，因为它利用哈希表的 O(1) 查找特性
- MySQL 8.0.18+ 会自动选择，无法手动禁用（8.0.18 之前用 BNL）
- 当 join_buffer 放不下整个哈希表时，会使用磁盘溢出（Grace Hash Join）
:::

## JOIN 类型

### INNER JOIN

只返回两个表中匹配的行。驱动表的选择取决于优化器的成本估算。

```sql
-- INNER JOIN：返回 orders 和 users 中都能匹配的行
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.status = 1;

-- 优化器选择驱动表的规则：
-- 1. 过滤后行数少的表优先作为驱动表
-- 2. 有排序需求时，能利用索引排序的表优先
-- 3. 成本估算最低的方案

EXPLAIN SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
-- 可能是 u 驱动 o，也可能是 o 驱动 u
-- 取决于哪个方案成本更低
```

### LEFT JOIN

左表（驱动表）的所有行都会出现在结果中，右表（被驱动表）没有匹配的行填 NULL。

```sql
-- LEFT JOIN：users 表的所有行都会返回
SELECT u.name, o.order_no
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- EXPLAIN 中左表（users）一定是驱动表
-- +----+-------------+-------+------+---------------+------+---------+------+------+-------+
-- | id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra |
-- +----+-------------+-------+------+---------------+------+---------+------+------+-------+
-- |  1 | SIMPLE      | u     | ALL  | NULL          | NULL | NULL    | NULL | 10000|       |
-- |  1 | SIMPLE      | o     | ref  | idx_user_id   | idx  | 8       |u.id  |    3 |       |
-- +----+-------------+-------+------+---------------+------+---------+------+------+-------+
```

### RIGHT JOIN

与 LEFT JOIN 对称，右表是驱动表。实际开发中较少使用，通常改写为 LEFT JOIN。

```sql
-- RIGHT JOIN（等价于上面的 LEFT JOIN，只是表顺序交换）
SELECT u.name, o.order_no
FROM orders o
RIGHT JOIN users u ON u.id = o.user_id;

-- 建议始终使用 LEFT JOIN，表的顺序更直观
```

## 驱动表与被驱动表

### 如何判断驱动表

EXPLAIN 输出中，**第一行**是驱动表。

```sql
EXPLAIN SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- 第一行 table = u → u 是驱动表
-- 第二行 table = o → o 是被驱动表

EXPLAIN SELECT u.name, o.amount
FROM orders o
JOIN users u ON o.user_id = u.id;
-- 第一行 table = o → o 是驱动表
-- 第二行 table = u → u 是被驱动表
```

### 小表驱动大表

JOIN 优化的核心原则：**让数据量小的表作为驱动表**。

```sql
-- users 表 10000 行，orders 表 1000000 行

-- 好：users 驱动 orders
SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- 驱动表扫描 10000 行，被驱动表每次索引查找 O(log 1000000)

-- 差：orders 驱动 users
SELECT u.name, o.amount
FROM orders o
JOIN users u ON o.user_id = u.id;
-- 优化器可能仍然选择 o 为驱动表
-- 但如果 users 过滤后只剩 100 行，优化器会选择 users 为驱动表
```

::: tip 优化器自动选择驱动表
MySQL 优化器会根据表的统计信息（行数、索引区分度等）自动选择成本最低的驱动表。但优化器的估算不一定准确，特别是当统计信息过时的时候。可以使用 `ANALYZE TABLE` 更新统计信息：
```sql
ANALYZE TABLE users, orders;
```
:::

## LEFT JOIN 的陷阱：ON 条件 vs WHERE 条件

这是 LEFT JOIN 中最容易出错的地方。

### ON 条件：影响被驱动表的匹配

ON 条件只决定被驱动表中哪些行与驱动表匹配，不匹配的驱动表行仍然会返回（被驱动表部分填 NULL）。

```sql
-- 数据
-- users: (1, 'Alice'), (2, 'Bob'), (3, 'Charlie')
-- orders: (1, 1, 100), (2, 1, 200), (3, 2, 300)

SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.amount > 150;
-- 结果：
-- Alice,   NULL    -- o.amount=100 不满足 AND 条件，但 Alice 仍然出现
-- Alice,   200     -- o.amount=200 满足
-- Bob,     300     -- o.amount=300 满足
-- Charlie, NULL    -- 没有订单
```

### WHERE 条件：过滤最终结果

WHERE 条件在 JOIN 完成后对所有行进行过滤，不满足条件的行直接排除。

```sql
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.amount > 150;
-- 结果：
-- Alice, 200
-- Bob,   300
-- 注意：Charlie 消失了！因为 o.amount 是 NULL，不满足 WHERE 条件
-- 此时 LEFT JOIN 退化为 INNER JOIN！
```

::: danger WHERE 条件中的被驱动表字段
在 LEFT JOIN 中，如果 WHERE 条件中包含被驱动表的字段（非 NULL 检查），LEFT JOIN 会退化为 INNER JOIN。如果确实需要过滤被驱动表的行，应该放在 ON 条件中，而不是 WHERE 中。
:::

```sql
-- 正确：将过滤条件放在 ON 中
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id AND o.amount > 150;
-- 所有用户都出现，只是不满足条件的订单填 NULL

-- 正确：在 WHERE 中检查 NULL
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.user_id IS NULL;  -- 查找没有订单的用户
-- 这是 LEFT JOIN 的常见用法：查找不存在关联记录的行
```

## JOIN 的索引要求

### 被驱动表的关联字段需要索引

```sql
-- 重要：被驱动表的 ON 条件字段必须有索引
SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id;
-- o.user_id 需要索引
-- u.id 是主键，天然有索引

-- 如果 o.user_id 没有索引：
-- type = ALL, Extra: Using join buffer (Block Nested Loop)
-- 性能极差

-- 添加索引
ALTER TABLE orders ADD INDEX idx_user_id(user_id);
-- 重新 EXPLAIN：
-- o 表：type = ref, key = idx_user_id
-- 性能提升 100 倍以上
```

### 多表 JOIN 的索引需求

```sql
-- 三表 JOIN
SELECT u.name, o.order_no, p.name AS product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;

-- 所需索引：
-- orders.user_id → 外键关联
-- order_items.order_id → 外键关联
-- products.id → 主键（天然有索引）
```

## 大表 JOIN 的优化

### 1. 分批 JOIN

当两张大表 JOIN 时，可以将数据分批处理，避免一次性占用过多内存。

```sql
-- 一次性 JOIN（可能很慢）
SELECT u.name, o.order_no, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at BETWEEN '2026-01-01' AND '2026-04-30';

-- 分批处理：按 user_id 范围分批
-- 批次 1
SELECT u.name, o.order_no, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at BETWEEN '2026-01-01' AND '2026-04-30'
  AND u.id BETWEEN 1 AND 10000;

-- 批次 2
SELECT u.name, o.order_no, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at BETWEEN '2026-01-01' AND '2026-04-30'
  AND u.id BETWEEN 10001 AND 20000;

-- ... 依此类推
```

### 2. 使用临时表

先将筛选后的数据放入临时表，再做 JOIN，减少 JOIN 的数据量。

```sql
-- 步骤 1：创建临时表，只包含需要的订单
CREATE TEMPORARY TABLE tmp_orders AS
SELECT id, user_id, order_no, amount
FROM orders
WHERE created_at BETWEEN '2026-01-01' AND '2026-04-30'
  AND status = 1;

-- 步骤 2：为临时表添加索引
ALTER TABLE tmp_orders ADD INDEX idx_user_id(user_id);

-- 步骤 3：与临时表 JOIN
SELECT u.name, t.order_no, t.amount
FROM users u
JOIN tmp_orders t ON u.id = t.user_id;

-- 步骤 4：清理
DROP TEMPORARY TABLE tmp_orders;
```

### 3. 应用层拆分

将大 JOIN 拆分为多次简单查询，在应用层组装数据。

```sql
-- 原始大 JOIN（慢）
SELECT u.id, u.name, o.order_no, o.amount, p.name AS product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.created_at > '2026-01-01';

-- 拆分为多次查询（应用层）
-- 查询 1：获取符合条件的订单
SELECT id, user_id, order_no, amount FROM orders WHERE created_at > '2026-01-01';
-- 假设返回 order_ids = [1, 2, 3, ...]

-- 查询 2：获取订单关联的用户
SELECT id, name FROM users WHERE id IN (1, 5, 10, ...);

-- 查询 3：获取订单项和产品
SELECT oi.order_id, p.name
FROM order_items oi
JOIN products p ON oi.product_id = p.id
WHERE oi.order_id IN (1, 2, 3, ...);

-- 应用层组装结果
```

::: tip 应用层拆分的适用场景
- 可以利用缓存（如 Redis 缓存用户信息）
- 可以并行执行多个简单查询
- 减少数据库的锁持有时间
- 适合微服务架构（不同表可能在不同数据库）
:::

### 4. 使用子查询预过滤

```sql
-- 先用子查询过滤出少量数据，再做 JOIN
SELECT u.name, t.order_no, t.amount
FROM (
    SELECT id, user_id, order_no, amount
    FROM orders
    WHERE created_at BETWEEN '2026-01-01' AND '2026-04-30'
      AND status = 1
    ORDER BY amount DESC
    LIMIT 1000
) t
JOIN users u ON t.user_id = u.id;
-- 子查询先过滤到 1000 行，再与 users JOIN
```

### 5. 关联字段类型一致

```sql
-- 确保 JOIN 关联字段的数据类型完全一致
-- 错误：INT 关联 BIGINT
-- orders.user_id: INT
-- users.id: BIGINT
-- 导致隐式类型转换，索引失效

-- 正确：统一为同一类型
ALTER TABLE orders MODIFY user_id BIGINT NOT NULL;
```

::: danger 数据类型不一致的隐式转换
JOIN 关联字段的数据类型不一致是常见的性能杀手。MySQL 的隐式类型转换会导致索引失效，JOIN 从 NLJ 退化为 BNL/Hash Join。务必确保关联字段的数据类型、字符集、排序规则完全一致。
:::
