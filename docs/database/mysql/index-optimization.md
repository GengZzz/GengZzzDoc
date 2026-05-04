# 索引优化策略

## 最左前缀原则

联合索引（也叫复合索引）遵循最左前缀匹配原则。理解这个原则是索引优化的核心。

### 联合索引的存储结构

```sql
-- 联合索引 (a, b, c)
ALTER TABLE orders ADD INDEX idx_abc (a, b, c);
```

在 B+ 树中的存储：先按 `a` 排序，`a` 相同时按 `b` 排序，`a` 和 `b` 都相同时按 `c` 排序。

```
(1, 1, 1) → (1, 1, 5) → (1, 2, 3) → (2, 1, 1) → (2, 1, 4) → (3, 1, 2)
```

### 匹配规则

```sql
-- 建立联合索引
ALTER TABLE orders ADD INDEX idx_user_status_created (user_id, status, created_at);
```

| 查询条件 | 是否使用索引 | 说明 |
|---------|------------|------|
| `WHERE user_id = 1` | 使用（部分） | 匹配第一列 |
| `WHERE user_id = 1 AND status = 2` | 使用（部分） | 匹配前两列 |
| `WHERE user_id = 1 AND status = 2 AND created_at > '2024-01-01'` | 完全使用 | 匹配全部三列 |
| `WHERE status = 2` | **不使用** | 缺少第一列 user_id |
| `WHERE status = 2 AND created_at > '2024-01-01'` | **不使用** | 缺少第一列 |
| `WHERE user_id = 1 AND created_at > '2024-01-01'` | 使用（部分） | 匹配第一列，跳过第二列后第三列无法使用 |
| `WHERE user_id = 1 AND status IN (1, 2)` | 使用 | IN 仍然能用索引 |

```sql
-- 验证：EXPLAIN 看 key_len
EXPLAIN SELECT * FROM orders WHERE user_id = 1;
-- key_len = 8 (BIGINT 的长度，只用了第一列)

EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND status = 2;
-- key_len = 9 (BIGINT + TINYINT = 8 + 1，用了前两列)

EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01';
-- key_len = 8 (只用了第一列 user_id，created_at 因为跳过了 status 无法使用)
```

::: tip 范围查询导致后续列失效
联合索引中，遇到**第一个范围查询**后，后续的列无法再利用索引排序：

```sql
-- 索引 (user_id, status, created_at)

-- status 用 = ，created_at 可以用索引排序
SELECT * FROM orders WHERE user_id = 1 AND status = 2 ORDER BY created_at;
-- Extra: Using index condition（利用了索引排序）

-- status 用范围，created_at 无法用索引排序
SELECT * FROM orders WHERE user_id = 1 AND status > 0 ORDER BY created_at;
-- Extra: Using filesort（需要额外排序，因为 status 是范围查询，created_at 的有序性被打破）
```
:::

---

## 索引选择性

索引选择性 = 不重复的索引值数量 / 数据总行数。选择性越高，索引效率越好。

### 计算选择性

```sql
-- 计算单列选择性
SELECT
    COUNT(DISTINCT user_id) / COUNT(*) AS selectivity_user_id,
    COUNT(DISTINCT status) / COUNT(*) AS selectivity_status,
    COUNT(DISTINCT order_no) / COUNT(*) AS selectivity_order_no
FROM orders;

-- 结果示例：
-- selectivity_user_id: 0.0500   (5%，5 万用户 / 100 万订单)
-- selectivity_status:  0.000005 (极低，只有 5 个状态值)
-- selectivity_order_no: 1.0000  (100%，订单号唯一)
```

| 选择性 | 适合建索引 | 原因 |
|--------|-----------|------|
| 接近 1.0 | 非常适合 | 几乎唯一，过滤效率极高（如主键、UUID） |
| 0.1 - 1.0 | 适合 | 过滤掉大部分数据 |
| 0.01 - 0.1 | 需要评估 | 如果查询频繁可以考虑 |
| < 0.01 | 不适合 | 过滤效果差，优化器可能选择全表扫描 |

::: warning 性别字段不适合单独建索引
```sql
-- status 只有 5 个值，选择性极低
SELECT * FROM orders WHERE status = 1;
-- 优化器可能认为全表扫描比走索引更快
-- 因为索引查到后还需要回表，20% 的数据走索引还不如直接全表扫描
```
:::

---

## 联合索引设计原则

### 核心原则

1. **把区分度高的列放前面**：先过滤掉大部分数据
2. **考虑查询频率**：高频查询的等值条件列优先
3. **考虑排序需求**：需要 ORDER BY 的列加入索引

### 实例分析

```sql
-- 查询模式分析
-- Q1: SELECT * FROM orders WHERE user_id = ? AND status = ? （最频繁）
-- Q2: SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC （频繁）
-- Q3: SELECT * FROM orders WHERE status = ? AND created_at > ? （低频）

-- 错误的设计：按业务直觉设计
ALTER TABLE orders ADD INDEX idx_status_user (status, user_id);
-- status 区分度低，放前面效果差

-- 正确的设计：分析查询模式
ALTER TABLE orders ADD INDEX idx_user_status (user_id, status);    -- 满足 Q1
ALTER TABLE orders ADD INDEX idx_user_created (user_id, created_at); -- 满足 Q2
-- Q3 频率低，可以接受全表扫描或文件排序
```

### 联合索引 vs 多个单列索引

```sql
-- 错误：为每个列建独立索引
ALTER TABLE orders ADD INDEX idx_user_id (user_id);
ALTER TABLE orders ADD INDEX idx_status (status);
ALTER TABLE orders ADD INDEX idx_created_at (created_at);

-- WHERE user_id = 1 AND status = 2
-- MySQL 5.0+ 会使用 Index Merge（intersect 模式）合并两个索引
-- 但 Index Merge 的性能不如联合索引
```

::: tip 一个联合索引 vs 多个单列索引
联合索引 `(user_id, status, created_at)` 一个索引可以覆盖多种查询：
- `WHERE user_id = ?`
- `WHERE user_id = ? AND status = ?`
- `WHERE user_id = ? AND status = ? AND created_at > ?`
- `WHERE user_id = ? ORDER BY created_at`

比三个独立索引更高效。
:::

---

## 前缀索引

对于字符串类型的列，如果直接对整个列建索引，索引会很大。可以用前缀索引只索引前 N 个字符。

### 选择合适的前缀长度

```sql
-- 分析不同前缀长度的选择性
SELECT
    COUNT(DISTINCT LEFT(email, 5)) / COUNT(*) AS sel_5,
    COUNT(DISTINCT LEFT(email, 10)) / COUNT(*) AS sel_10,
    COUNT(DISTINCT LEFT(email, 15)) / COUNT(*) AS sel_15,
    COUNT(DISTINCT LEFT(email, 20)) / COUNT(*) AS sel_20
FROM users;

-- 结果示例：
-- sel_5:  0.6500  (区分度不够，很多邮箱前 5 字符相同如 "user@")
-- sel_10: 0.9500  (可以接受)
-- sel_15: 0.9980  (接近全列选择性)
-- sel_20: 1.0000  (等于全列)

-- 选择区分度接近全列的最短前缀
ALTER TABLE users ADD INDEX idx_email_prefix (email(15));
```

### 前缀索引的限制

```sql
-- 可以用前缀索引
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM users WHERE email LIKE 'user@%';

-- 不能用前缀索引（前缀索引不支持索引排序和覆盖索引）
SELECT * FROM users ORDER BY email;
-- 前缀索引只存储前 15 个字符的值，无法完成完整的排序比较
```

::: warning 前缀索引的取舍
- **优点**：索引体积小，节省空间
- **缺点**：不支持覆盖索引、不支持索引排序、增加回表概率
- **建议**：如果列的前缀区分度已经足够高（> 0.95），前缀索引是好的选择
:::

---

## 索引排序：ORDER BY 走索引 vs filesort

### 走索引排序

```sql
-- 索引 (user_id, created_at)
SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at;

-- EXPLAIN 中 Extra 没有 "Using filesort"
-- 说明 ORDER BY 直接利用了索引的有序性
```

### filesort

当 ORDER BY 的列不在索引中，或无法利用索引有序性时，MySQL 需要额外排序：

```sql
-- 索引 (user_id, status)
SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at;
-- created_at 不在索引中，需要 filesort

-- EXPLAIN 中 Extra 显示 "Using filesort"
```

filesort 的两种算法：
1. **双路排序**：先读取排序字段和行指针，排序后再回表取数据（两次 IO）
2. **单路排序**：一次性读取所有需要的列，在内存中排序（MySQL 4.1+ 默认）

::: tip 优化 ORDER BY
1. 把 ORDER BY 列加入索引
2. 确保 ORDER BY 列的方向与索引一致（`ORDER BY a ASC, b DESC` 需要索引 `(a, b DESC)`）
3. 减少排序的数据量（加 LIMIT 或更严格的 WHERE 条件）
4. 调大 `sort_buffer_size`（默认 256KB）让单路排序在内存中完成
:::

---

## 索引条件下推 (ICP)

索引条件下推（Index Condition Pushdown）是 MySQL 5.6 引入的优化，将部分 WHERE 条件从 Server 层下推到存储引擎层过滤。

详见 [覆盖索引与索引下推](./covering-index-icp.md)。

---

## 索引合并 (Index Merge)

MySQL 5.0+ 支持对同一个查询使用多个索引，将结果合并：

### Index Merge Intersect（交集）

```sql
-- 两个独立索引
ALTER TABLE users ADD INDEX idx_name (name);
ALTER TABLE users ADD INDEX idx_age (age);

EXPLAIN SELECT * FROM users WHERE name = '张三' AND age = 25;
-- type: index_merge
-- Extra: Using intersect(idx_name, idx_age)
```

```
idx_name 查找 name='张三' → 结果集 A
idx_age 查找 age=25       → 结果集 B
A ∩ B = 最终结果
```

### Index Merge Union（并集）

```sql
EXPLAIN SELECT * FROM users WHERE name = '张三' OR name = '李四';
-- type: index_merge
-- Extra: Using union(idx_name)

-- 或者
EXPLAIN SELECT * FROM users WHERE name = '张三' OR age > 30;
-- Extra: Using union(idx_name, idx_age)
```

### Index Merge Sort-Union（排序并集）

```sql
EXPLAIN SELECT * FROM users WHERE name > '李' OR age > 30;
-- 范围查询不能直接 union，需要 sort-union
-- Extra: Using sort_union(idx_name, idx_age)
```

::: warning Index Merge 不是银弹
Index Merge 看起来解决了 OR 条件的索引使用问题，但实际性能往往不如联合索引：
1. 需要读取多个索引
2. 需要合并结果集
3. 合并过程中需要额外的排序和去重

**更好的做法**：通过联合索引设计避免 Index Merge。
:::

---

## 实际案例：慢查询优化

### 问题

一个电商系统的订单查询接口，高峰期响应时间超过 5 秒。

```sql
-- 慢查询
SELECT o.id, o.order_no, o.total_amount, o.status, o.created_at,
       u.username, u.phone
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status IN (1, 2)
  AND o.created_at BETWEEN '2024-01-01' AND '2024-06-30'
ORDER BY o.created_at DESC
LIMIT 20;

-- 执行时间：4.8 秒
```

### 分析

```sql
EXPLAIN SELECT ...\G
```

```
id | select_type | table | type  | key            | rows   | Extra
---|-------------|-------|-------|----------------|--------|------------------
1  | SIMPLE      | o     | ALL   | NULL           | 200万  | Using where; Using filesort
1  | SIMPLE      | u     | eq_ref| PRIMARY        | 1      | NULL
```

问题诊断：
1. `orders` 表没有用到索引（`type: ALL`，全表扫描 200 万行）
2. `Using filesort`：需要额外排序
3. `users` 表走主键，正常

### 优化

```sql
-- 步骤 1：分析现有索引
SHOW INDEX FROM orders;

-- 步骤 2：分析查询模式
-- WHERE 条件：status IN (1,2) AND created_at BETWEEN ...
-- ORDER BY：created_at DESC
-- status 的选择性：5 个值，太低
-- created_at 的选择性：时间范围过滤效果好

-- 步骤 3：设计索引
-- 方案 A：联合索引 (created_at, status)
-- 理由：created_at 范围过滤 + status 等值过滤 + ORDER BY created_at
ALTER TABLE orders ADD INDEX idx_created_status (created_at, status);

-- 步骤 4：验证
EXPLAIN SELECT ...\G
```

```
id | select_type | table | type  | key                    | rows | Extra
---|-------------|-------|-------|------------------------|------|------------------
1  | SIMPLE      | o     | range | idx_created_status     | 8万  | Using index condition
1  | SIMPLE      | u     | eq_ref| PRIMARY                | 1    | NULL
```

进一步优化——创建覆盖索引减少回表：

```sql
-- 如果查询的列不多，考虑覆盖索引
ALTER TABLE orders
ADD INDEX idx_covering (created_at, status, user_id, order_no, total_amount);

-- 这样二级索引包含查询所需的所有列（id 是主键自带）
-- 不需要回表，性能最优
```

### 优化结果

```sql
-- 优化后执行时间：48ms
-- 性能提升约 100 倍
```

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 执行时间 | 4.8s | 48ms |
| 扫描行数 | 200 万 | 8 万 |
| 是否回表 | 回表 200 万次 | 不回表（覆盖索引） |
| 排序方式 | filesort | 索引排序 |
| type | ALL | range |

::: tip 优化套路总结
1. **先 EXPLAIN**：看 type、key、rows、Extra
2. **分析查询模式**：哪些列在 WHERE、ORDER BY、GROUP BY 中
3. **计算选择性**：区分度高的列优先
4. **设计联合索引**：等值列在前，范围列在后，ORDER BY 列纳入索引
5. **追求覆盖索引**：尽量让查询的列都在索引中
6. **验证效果**：EXPLAIN 确认索引命中，对比执行时间
:::
