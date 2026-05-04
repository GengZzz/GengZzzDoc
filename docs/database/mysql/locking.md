# 锁类型与锁策略

锁是数据库实现并发控制的基本机制。InnoDB 实现了多种类型的锁，从不同维度分类有不同的名称。深入理解锁的分类和行为，是排查死锁、优化并发性能的前提。

## 锁的分类维度

### 按粒度分

| 粒度 | 说明 | 锁定范围 | 并发度 |
|------|------|---------|--------|
| 行锁 (Row Lock) | 锁定单行或多行记录 | 最小 | 最高 |
| 页锁 (Page Lock) | 锁定一个数据页 | 中等 | 中等 |
| 表锁 (Table Lock) | 锁定整张表 | 最大 | 最低 |

InnoDB 默认使用**行锁**，在特殊情况下（如无法使用索引时）会退化为表锁。

### 按模式分

| 模式 | 缩写 | 兼容矩阵 |
|------|------|---------|
| 共享锁 (Shared Lock) | S | S 与 S 兼容，S 与 X 冲突 |
| 排他锁 (Exclusive Lock) | X | X 与所有锁冲突 |
| 意向共享锁 (Intention Shared) | IS | IS 与 IS/IX/S 兼容，与 X 冲突 |
| 意向排他锁 (Intention Exclusive) | IX | IX 与 IS/IX 兼容，与 S/X 冲突 |

```sql
-- 显式加锁语法
-- 共享锁（读锁）
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE;
-- MySQL 8.0.1+
SELECT * FROM users WHERE id = 1 FOR SHARE;

-- 排他锁（写锁）
SELECT * FROM users WHERE id = 1 FOR UPDATE;
```

### 兼容矩阵

```
       │  IS    │  IX    │  S     │  X
───────┼────────┼────────┼────────┼──────
  IS   │  兼容  │  兼容  │  兼容  │  冲突
  IX   │  兼容  │  兼容  │  冲突  │  冲突
  S    │  兼容  │  冲突  │  兼容  │  冲突
  X    │  冲突  │  冲突  │  冲突  │  冲突
```

## 行锁 (Record Lock)

行锁是最细粒度的锁，锁定的是**索引记录**而不是物理行。

```sql
-- 假设 id 是主键
SELECT * FROM users WHERE id = 1 FOR UPDATE;
-- 在主键索引 id=1 的记录上加 X 型 Record Lock
```

::: tip 行锁加在索引上
InnoDB 的行锁是加在索引记录上的。如果一条 SQL 没有使用任何索引（导致全表扫描），InnoDB 会对所有扫描到的索引记录加锁，效果等同于锁表。
:::

```sql
-- name 列没有索引
SELECT * FROM users WHERE name = 'Alice' FOR UPDATE;
-- InnoDB 会扫描聚簇索引，对每一行都加 X 锁
-- 即使最终只返回 name='Alice' 的行
-- 效果：整张表被锁住
```

## 间隙锁 (Gap Lock)

间隙锁锁定的是索引记录之间的**间隙**（不包含记录本身），目的是**防止其他事务在间隙中插入数据**，从而解决幻读问题。

```sql
-- 假设表中有 id = 1, 5, 10 三条记录
-- 间隙：(-∞, 1), (1, 5), (5, 10), (10, +∞)

SELECT * FROM users WHERE id > 3 AND id < 8 FOR UPDATE;
-- 加间隙锁：(1, 5) 和 (5, 10)
-- 其他事务无法在这些间隙中插入数据
```

间隙锁的特性：

- 只在 **REPEATABLE READ** 和 **SERIALIZABLE** 隔离级别下存在
- 间隙锁之间**不冲突**（两个事务可以对同一个间隙加间隙锁）
- 间隙锁只阻止**插入**操作
- 间隙锁是**开区间**（不包含端点的记录）

```sql
-- 事务 A
BEGIN;
SELECT * FROM users WHERE id = 7 FOR UPDATE;
-- 加间隙锁 (5, 10)

-- 事务 B
BEGIN;
SELECT * FROM users WHERE id = 8 FOR UPDATE;
-- 也可以加间隙锁 (5, 10)，不冲突

INSERT INTO users (id, name) VALUES (6, 'Test');
-- 阻塞！插入操作与间隙锁冲突
```

## 临键锁 (Next-Key Lock)

临键锁是**记录锁 + 间隙锁**的组合，锁定的是一个**左开右闭**的区间 `(prev_key, current_key]`。

这是 InnoDB 在 RR 级别下默认使用的行锁算法。

```sql
-- 假设表中 id 索引有值：1, 5, 10, 15
-- Next-Key Lock 的区间：
-- (-∞, 1]  (1, 5]  (5, 10]  (10, 15]  (15, +supremum)

SELECT * FROM users WHERE id = 10 FOR UPDATE;
-- Next-Key Lock: (5, 10]（锁定 10 这条记录 + 5 到 10 之间的间隙）
-- 另外，InnoDB 还会对 (10, 15) 加间隙锁，防止幻读
```

::: tip Next-Key Lock 的退化
InnoDB 对 Next-Key Lock 有自动优化机制：
- 如果查询条件使用**唯一索引**且命中**单条记录**，Next-Key Lock 退化为 Record Lock（不需要锁间隙）
- 如果查询条件命中**范围查询**，仍然使用 Next-Key Lock

```sql
-- id 是唯一索引（主键）
SELECT * FROM users WHERE id = 10 FOR UPDATE;
-- 退化为 Record Lock，只锁 id=10

-- 非唯一索引
SELECT * FROM users WHERE name = 'Alice' FOR UPDATE;
-- Next-Key Lock: 锁定 name='Alice' 的记录及其前后间隙
```
:::

## 插入意向锁 (Insert Intention Lock)

插入意向锁是一种特殊的**间隙锁**，在 INSERT 操作时使用。它表示事务打算在某个间隙中插入数据，但需要先检查是否存在冲突的间隙锁。

```sql
-- 事务 A
BEGIN;
SELECT * FROM users WHERE id > 5 AND id < 10 FOR UPDATE;
-- 加间隙锁 (5, 10)

-- 事务 B
BEGIN;
INSERT INTO users (id, name) VALUES (7, 'Test');
-- 尝试获取插入意向锁 (5, 10)
-- 与事务 A 的间隙锁冲突，阻塞等待
```

::: tip 插入意向锁与其他锁的关系
- 插入意向锁之间**不冲突**（不同事务可以在同一间隙的不同位置插入）
- 插入意向锁与间隙锁**冲突**（间隙锁阻止所有插入）
- 插入意向锁是导致死锁的常见原因之一
:::

## 意向锁 (Intention Lock)

意向锁是**表级锁**，用于标记事务打算在表中加什么类型的行锁。它的存在是为了让表锁和行锁能够高效共存。

### 为什么需要意向锁

```sql
-- 事务 A 对 id=1 的行加了 X 锁
-- 事务 B 想对整个表加 S 锁（LOCK TABLES ... READ）

-- 没有意向锁时：事务 B 需要逐行检查是否有行锁（效率极低）
-- 有意向锁时：事务 A 在行锁之前先加了 IX 锁（表级），事务 B 发现表上有 IX 锁，直接等待
```

### 意向锁的工作流程

```sql
-- 事务 A 执行：
SELECT * FROM users WHERE id = 1 FOR UPDATE;
-- 1. 先在 users 表上加 IX 锁（表级）
-- 2. 再在 id=1 的索引记录上加 X 锁（行级）

-- 事务 B 执行：
LOCK TABLES users READ;
-- 尝试在 users 表上加 S 锁
-- 发现表上已有 IX 锁，S 和 IX 冲突
-- 等待事务 A 释放
```

## 自增锁 (AUTO-INC Lock)

自增锁是用于保证 AUTO_INCREMENT 列值连续递增的特殊表级锁。

InnoDB 提供了三种自增锁模式，通过 `innodb_autoinc_lock_mode` 控制：

```sql
SHOW VARIABLES LIKE 'innodb_autoinc_lock_mode';
-- +--------------------------+-------+
-- | Variable_name            | Value |
-- +--------------------------+-------+
-- | innodb_autoinc_lock_mode | 2     |
-- +--------------------------+-------+
```

| 模式 | 值 | 说明 |
|------|---|------|
| 传统模式 | 0 | 所有 INSERT 都使用 AUTO-INC 表锁，语句执行完释放 |
| 连续模式 | 1 | 简单 INSERT 用轻量级互斥锁，批量 INSERT 用 AUTO-INC 锁 |
| 交错模式 | 2 | 所有 INSERT 都用轻量级互斥锁，性能最好，但值不连续 |

```sql
-- 查看当前模式
SELECT @@innodb_autoinc_lock_mode;

-- 在 my.cnf 中配置
-- [mysqld]
-- innodb_autoinc_lock_mode = 2  -- 推荐使用交错模式
```

::: tip 交错模式与 binlog
交错模式（mode=2）要求 binlog 格式为 ROW，否则可能导致主从数据不一致。MySQL 8.0 默认使用 ROW 格式 binlog，所以默认 mode=2 是安全的。
:::

## 加锁分析：一条 UPDATE 到底加了哪些锁

```sql
-- 建表
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(32) NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TINYINT DEFAULT 0,
    KEY idx_user_id (user_id),
    KEY idx_order_no (order_no)
);

-- 场景 1：基于唯一索引的等值查询（命中）
UPDATE orders SET status = 1 WHERE id = 100;
-- 加锁：
--   1. IX 锁（表级）
--   2. X 型 Record Lock on id=100（主键索引）
--   3. X 型 Record Lock on 对应的二级索引记录（如果有）

-- 场景 2：基于唯一索引的等值查询（未命中）
UPDATE orders SET status = 1 WHERE id = 105; -- id=105 不存在
-- 加锁：
--   1. IX 锁（表级）
--   2. 间隙锁 on (100, +supremum)（主键索引上的间隙锁）

-- 场景 3：基于非唯一索引的等值查询
UPDATE orders SET status = 1 WHERE user_id = 10;
-- 加锁：
--   1. IX 锁（表级）
--   2. Next-Key Lock on idx_user_id: (prev_key, 10]
--   3. 间隙锁 on idx_user_id: (10, next_key)
--   4. 对应主键索引记录上的 Record Lock

-- 场景 4：范围查询
UPDATE orders SET status = 1 WHERE id > 100 AND id < 200;
-- 加锁：
--   1. IX 锁（表级）
--   2. Next-Key Lock on id in (100, 200]
--   3. 间隙锁 on (200, next_key)（防止幻读）

-- 场景 5：无索引（最危险！）
UPDATE orders SET status = 1 WHERE amount = 99.99;
-- 加锁：
--   1. IX 锁（表级）
--   2. 聚簇索引上所有行的 X 锁！
--   效果：锁表
```

::: danger 没有索引的 UPDATE 等同于锁表
当 UPDATE 的 WHERE 条件没有可用索引时，InnoDB 必须扫描聚簇索引的每一行来判断是否满足条件，对每一行都加 X 锁。这实际上等同于锁表，会严重阻塞其他事务。
:::

## 查看锁信息

```sql
-- MySQL 8.0+：performance_schema 中的锁信息
SELECT * FROM performance_schema.data_locks\G
-- 字段说明：
-- ENGINE_LOCK_ID: 锁 ID
-- ENGINE_TRANSACTION_ID: 事务 ID
-- OBJECT_NAME: 表名
-- INDEX_NAME: 索引名
-- LOCK_TYPE: RECORD 或 TABLE
-- LOCK_MODE: X, S, X_GAP, S_GAP, X_REC_NOT_GAP, etc.
-- LOCK_STATUS: GRANTED 或 WAITING
-- LOCK_DATA: 锁定的数据（仅行锁有值）

-- 查看锁等待关系
SELECT * FROM performance_schema.data_lock_waits\G

-- MySQL 5.7 使用已废弃的表
SELECT * FROM information_schema.INNODB_LOCKS\G
SELECT * FROM information_schema.INNODB_LOCK_WAITS\G
```

<MySQLLockDemo />
