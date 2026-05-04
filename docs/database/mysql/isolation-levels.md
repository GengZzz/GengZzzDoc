# 隔离级别

SQL 标准定义了四种隔离级别，从低到高依次为：READ UNCOMMITTED、READ COMMITTED、REPEATABLE READ、SERIALIZABLE。不同的隔离级别在并发性能和数据一致性之间做出不同的取舍。

## 并发事务的三大问题

在讨论隔离级别之前，先明确三种典型的并发异常现象：

| 问题 | 描述 |
|------|------|
| 脏读 (Dirty Read) | 事务 A 读取到事务 B 未提交的修改，如果事务 B 回滚，事务 A 读到的数据就是"脏"的 |
| 不可重复读 (Non-Repeatable Read) | 事务 A 两次读取同一行数据，结果不同（被事务 B 的提交修改了） |
| 幻读 (Phantom Read) | 事务 A 两次查询同一个范围，第二次多出了事务 B 新插入的行 |

## READ UNCOMMITTED

最低的隔离级别。事务可以读取其他事务未提交的修改。

```sql
-- 设置隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
```

### 脏读示例

```sql
-- 会话 A
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：1000

-- 会话 B（同时执行）
BEGIN;
UPDATE accounts SET balance = 500 WHERE user_id = 1;
-- 未提交！

-- 会话 A 再次读取
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：500（读到了未提交的数据！）

-- 会话 B 回滚
ROLLBACK;
-- 实际余额仍然是 1000，但会话 A 已经基于 500 做了业务判断
```

::: danger 实际几乎不用
READ UNCOMMITTED 在生产环境中几乎没有使用场景。它允许读取未提交的数据，本质上是放弃了隔离性。即使在对数据一致性要求极低的场景（如粗略统计），也很少使用这个级别。
:::

## READ COMMITTED (RC)

事务只能读取其他事务已提交的修改。解决了脏读问题。

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### 解决脏读

```sql
-- 会话 A
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：1000

-- 会话 B
BEGIN;
UPDATE accounts SET balance = 500 WHERE user_id = 1;

-- 会话 A（会话 B 尚未提交）
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：1000（不会读到未提交数据，问题解决）

-- 会话 B 提交
COMMIT;

-- 会话 A 再次读取
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：500（读到了已提交的新数据）
```

### 不可重复读问题

```sql
-- 会话 A
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：1000

-- 会话 B
BEGIN;
UPDATE accounts SET balance = 800 WHERE user_id = 1;
COMMIT; -- 提交

-- 会话 A 第二次读取
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：800（同一事务内两次读取结果不同！这就是不可重复读）
```

### MVCC 在 RC 级别的行为

在 RC 级别下，**每次 SELECT 都会生成一个新的 ReadView**。这意味着每次读取都能看到截至本次读取时已提交的最新数据。

```sql
-- RC 级别下 ReadView 的生成策略
-- 事务 A 第一次 SELECT → 生成 ReadView_1
-- 事务 B 提交
-- 事务 A 第二次 SELECT → 生成 ReadView_2（新的！能看到 B 的提交）
```

::: tip
RC 是 Oracle、PostgreSQL、SQL Server 的默认隔离级别。MySQL 选择 RR 作为默认级别，主要是为了兼容早期的 binlog 格式（STATEMENT 格式在 RC 下可能导致主从不一致）。MySQL 8.0 使用 ROW 格式的 binlog 后，RC 级别已经足够安全。
:::

## REPEATABLE READ (RR)

MySQL InnoDB 的默认隔离级别。解决了不可重复读问题。

```sql
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### 解决不可重复读

```sql
-- 会话 A
BEGIN; -- 默认 RR 级别
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：1000

-- 会话 B
BEGIN;
UPDATE accounts SET balance = 800 WHERE user_id = 1;
COMMIT;

-- 会话 A 第二次读取
SELECT balance FROM accounts WHERE user_id = 1;
-- 结果：1000（仍然是 1000，可重复读！）
```

### MVCC 在 RR 级别的行为

在 RR 级别下，ReadView 在**事务第一次 SELECT 时生成**，后续所有 SELECT 复用同一个 ReadView。因此整个事务期间看到的数据是一致的快照。

```sql
-- RR 级别下 ReadView 的生成策略
-- 事务 A 第一次 SELECT → 生成 ReadView（记录当前活跃事务列表）
-- 事务 B 提交
-- 事务 A 第二次 SELECT → 复用同一个 ReadView（看不到 B 的提交）
```

### 幻读问题与解决方案

在纯 MVCC 的 RR 级别下，**快照读**不会出现幻读，但**当前读**可能出现幻读。InnoDB 通过**间隙锁（Gap Lock）**和**临键锁（Next-Key Lock）**来解决当前读的幻读问题。

```sql
-- 会话 A
BEGIN;
SELECT * FROM orders WHERE amount > 100 AND amount < 200;
-- 结果：空

-- 会话 B
BEGIN;
INSERT INTO orders (user_id, amount) VALUES (1, 150);
COMMIT;

-- 会话 A 快照读（不会看到幻行）
SELECT * FROM orders WHERE amount > 100 AND amount < 200;
-- 结果：空（快照读，复用 ReadView）

-- 会话 A 当前读（加锁读）
SELECT * FROM orders WHERE amount > 100 AND amount < 200 FOR UPDATE;
-- 在 InnoDB 的 RR 级别下，这个范围查询会加间隙锁 (100, 200)
-- 会话 B 的 INSERT 会被阻塞，直到会话 A 提交
```

::: tip InnoDB 对幻读的处理
InnoDB 在 RR 级别下通过两种机制解决幻读：
1. **MVCC**：快照读通过 ReadView 避免看到新插入的行
2. **间隙锁**：当前读通过间隙锁阻止其他事务在范围内插入新行

因此，InnoDB 的 RR 级别在大多数场景下可以达到 SQL 标准 SERIALIZABLE 的效果。
:::

## SERIALIZABLE

最严格的隔离级别。所有 SELECT 语句都会被隐式转换为 `SELECT ... LOCK IN SHARE MODE`（共享锁）。

```sql
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

```sql
-- 会话 A
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
SELECT * FROM accounts WHERE user_id = 1;
-- 隐式加共享锁

-- 会话 B
BEGIN;
UPDATE accounts SET balance = 800 WHERE user_id = 1;
-- 阻塞！需要等待会话 A 释放共享锁

-- 会话 A
COMMIT;
-- 会话 B 的 UPDATE 才能执行
```

::: warning 性能影响
SERIALIZABLE 级别下，读写完全互斥，性能最差。除非有严格的串行化需求，否则不建议使用。在实际生产中，RR 级别配合间隙锁通常已经足够。
:::

## 四种隔离级别对比

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 实现机制 |
|---------|------|-----------|------|---------|
| READ UNCOMMITTED | 可能 | 可能 | 可能 | 无特殊处理 |
| READ COMMITTED | 不可能 | 可能 | 可能 | 每次 SELECT 新建 ReadView |
| REPEATABLE READ | 不可能 | 不可能 | 当前读可能 | 事务首次 SELECT 建 ReadView + 间隙锁 |
| SERIALIZABLE | 不可能 | 不可能 | 不可能 | 所有 SELECT 加共享锁 |

### 同一场景在不同级别下的表现

```sql
-- 初始数据
CREATE TABLE demo (id INT PRIMARY KEY, val INT);
INSERT INTO demo VALUES (1, 100), (2, 200), (3, 300);

-- 并发场景：会话 A 读取，会话 B 修改并提交

-- ============ READ UNCOMMITTED ============
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 100
-- 会话 B: UPDATE demo SET val=999 WHERE id=1; (不提交)
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 999（脏读！）

-- ============ READ COMMITTED ============
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 100
-- 会话 B: UPDATE demo SET val=999 WHERE id=1; COMMIT;
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 999（不可重复读）

-- ============ REPEATABLE READ ============
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 100（创建 ReadView）
-- 会话 B: UPDATE demo SET val=999 WHERE id=1; COMMIT;
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 100（复用 ReadView）
-- 会话 A: SELECT val FROM demo WHERE id=1 FOR UPDATE; -- 999（当前读）

-- ============ SERIALIZABLE ============
-- 会话 A: SELECT val FROM demo WHERE id=1; -- 100（加共享锁）
-- 会话 B: UPDATE demo SET val=999 WHERE id=1; -- 阻塞，等待会话 A 提交
```

## 查看和设置隔离级别

```sql
-- MySQL 8.0.3+
SELECT @@transaction_isolation;
-- +-------------------------+
-- | @@transaction_isolation |
-- +-------------------------+
-- | REPEATABLE-READ         |
-- +-------------------------+

-- MySQL 8.0.3 之前
SELECT @@tx_isolation;

-- 设置当前会话隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 设置全局隔离级别（影响新连接）
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 在启动时设置（my.cnf）
-- [mysqld]
-- transaction-isolation = READ-COMMITTED
```

## 生产环境建议

::: tip 大多数场景使用 RR
MySQL InnoDB 的默认 RR 级别已经通过 MVCC + 间隙锁很好地解决了并发问题。对于大多数业务场景，RR 是安全且高效的选择。
:::

::: tip 特殊需求使用 RC
以下场景可以考虑使用 RC：
- **高并发写入场景**：RC 不使用间隙锁，减少锁冲突，提高吞吐量
- **Binlog 使用 ROW 格式时**：RC + ROW 格式的 binlog 可以保证主从一致性
- **从 Oracle 迁移的项目**：保持一致的默认行为，减少应用改造
- **使用读写分离时**：RC 级别下从库的延迟窗口更小
:::

```sql
-- 推荐的生产配置
-- my.cnf
[mysqld]
transaction-isolation = READ-COMMITTED  -- 如果业务允许
binlog_format = ROW                     -- 必须
innodb_autoinc_lock_mode = 2            -- 最佳性能
```
