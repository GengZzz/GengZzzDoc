# 事务基础与 ACID

事务是数据库区别于文件系统的核心特性之一。理解事务的 ACID 特性及其底层保障机制，是深入掌握 MySQL InnoDB 的基础。

## ACID 四大特性详解

### 原子性 (Atomicity)

原子性指事务中的所有操作要么全部成功，要么全部失败回滚，不存在部分成功的情况。

```sql
-- 转账操作：要么都成功，要么都失败
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE user_id = 1;
UPDATE accounts SET balance = balance + 500 WHERE user_id = 2;
COMMIT;
```

如果第一条 UPDATE 成功而第二条失败（比如违反约束），整个事务必须回滚到 BEGIN 之前的状态。

::: tip 底层保障：Undo Log
InnoDB 通过 **Undo Log（回滚日志）** 保障原子性。每条修改数据的 SQL 在执行前，都会先将修改前的数据写入 Undo Log。当事务需要回滚时，InnoDB 从 Undo Log 中读取旧版本数据，逆向恢复。

Undo Log 的存储结构是一个版本链——每次更新都会在旧版本上挂载一个新版本，通过 `DB_ROLL_PTR`（回滚指针）串联起来。这条版本链同时也是 MVCC 实现快照读的基础。
:::

### 一致性 (Consistency)

一致性指事务执行前后，数据库从一个合法状态变换到另一个合法状态，始终满足业务定义的所有约束条件。

一致性包含多个层面：

- **数据库层面**：主键唯一、外键约束、NOT NULL、CHECK 约束等
- **业务层面**：转账前后总金额不变、库存不为负数等
- **应用层面**：缓存与数据库一致、索引与数据一致

```sql
-- 建表时定义的约束
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

::: tip
一致性是事务的**最终目标**，原子性、隔离性、持久性都是为了达成一致性的手段。可以理解为：AID 是实现方式，C 是最终结果。
:::

### 隔离性 (Isolation)

隔离性指并发执行的事务之间互不干扰，每个事务都感觉不到其他事务的存在。

InnoDB 通过两种机制保障隔离性：

1. **锁机制**：写操作之间通过行锁互斥
2. **MVCC（多版本并发控制）**：读操作不阻塞写操作，写操作不阻塞读操作

```sql
-- 事务 A
BEGIN;
UPDATE products SET stock = stock - 1 WHERE id = 100;
-- 此时事务 A 持有 id=100 这行的排他锁

-- 事务 B（同时执行）
BEGIN;
SELECT stock FROM products WHERE id = 100;
-- 通过 MVCC 读取快照，不被事务 A 阻塞
-- 但如果事务 B 也执行 UPDATE，则需要等待事务 A 释放锁
```

### 持久性 (Durability)

持久性指事务一旦提交，数据的修改就是永久性的，即使系统崩溃也不会丢失。

::: tip 底层保障：Redo Log
InnoDB 通过 **Redo Log（重做日志）** 保障持久性。事务提交时，修改并不是直接写入磁盘数据文件（随机 IO 太慢），而是先写入 Redo Log Buffer，再刷盘到 Redo Log 文件（顺序 IO，更快）。

这个过程称为 **WAL（Write-Ahead Logging）**：先写日志，再写数据。

当 MySQL 崩溃重启后，InnoDB 会检查 Redo Log，将已提交但未刷入数据文件的修改重新应用（redo），保证已提交事务的数据不丢失。

Redo Log 是固定大小的环形缓冲区，由 `innodb_log_file_size` 和 `innodb_log_files_in_group` 控制。
:::

## 事务控制语句

### 开启事务

```sql
-- 方式一：显式开启
BEGIN;
-- 或
START TRANSACTION;

-- 方式二：带参数的开启
-- 只读事务，优化器可以做更多优化
START TRANSACTION READ ONLY;
-- 读写事务（默认）
START TRANSACTION READ WRITE;
-- 带一致性快照（RR 级别下，开启事务时就创建 ReadView）
START TRANSACTION WITH CONSISTENT SNAPSHOT;
```

::: warning 注意
`BEGIN` 在 MySQL 中是 `BEGIN WORK` 的简写，不会开启一个匿名事务块（与某些编程语言中的 BEGIN/END 不同）。真正开启事务的是 `BEGIN` 后的第一条 SQL 语句。
:::

### 提交与回滚

```sql
-- 提交事务，修改永久生效
COMMIT;

-- 回滚事务，所有修改撤销
ROLLBACK;

-- 场景：转账
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE user_id = 1 AND balance >= 500;
-- 检查是否有行被更新（余额不足时 affected_rows 为 0）
-- 如果余额不足，回滚
-- 如果余额充足，继续
UPDATE accounts SET balance = balance + 500 WHERE user_id = 2;
COMMIT;
```

### Savepoint（保存点）

Savepoint 允许在事务内设置回滚点，可以回滚到指定保存点而不是回滚整个事务。

```sql
BEGIN;

INSERT INTO orders (user_id, amount) VALUES (1, 100.00);
-- 设置保存点
SAVEPOINT sp1;

INSERT INTO order_items (order_id, product_id, quantity) VALUES (LAST_INSERT_ID(), 10, 2);
-- 发现出错，回滚到保存点 sp1
ROLLBACK TO SAVEPOINT sp1;
-- 此时 order_items 的插入被撤销，但 orders 的插入仍然保留

-- 可以继续操作
INSERT INTO order_items (order_id, product_id, quantity) VALUES (LAST_INSERT_ID(), 20, 1);

COMMIT;

-- 释放保存点（不回滚，只是删除保存点标记）
RELEASE SAVEPOINT sp1;
```

::: tip Savepoint 与 Undo Log
Savepoint 的实现依赖 Undo Log。回滚到 Savepoint 时，InnoDB 会利用 Savepoint 之后产生的 Undo Log 记录进行数据恢复。因此 Savepoint 不会带来额外的存储开销，只是在 Undo Log 链上做一个标记。
:::

## 隐式提交

某些 SQL 语句会**隐式提交**当前事务，即在执行这些语句之前，会自动 COMMIT 当前事务。

会导致隐式提交的语句类别：

| 类别 | 具体语句 |
|------|---------|
| DDL | `CREATE TABLE`、`ALTER TABLE`、`DROP TABLE`、`TRUNCATE TABLE`、`RENAME TABLE` |
| DCL | `GRANT`、`REVOKE`、`SET PASSWORD` |
| 管理语句 | `LOCK TABLES`、`UNLOCK TABLES`、`ANALYZE TABLE`、`OPTIMIZE TABLE` |
| 复制相关 | `START SLAVE`、`STOP SLAVE`、`CHANGE MASTER TO` |

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
-- 以下语句会隐式提交上面的 UPDATE 事务
ALTER TABLE accounts ADD COLUMN last_login DATETIME;
-- 此时 UPDATE 已经被提交，无法回滚
ROLLBACK; -- 这个 ROLLBACK 无效
```

::: danger 隐式提交陷阱
在事务中执行 DDL 是最常见的隐式提交陷阱。如果你的业务逻辑需要在事务中动态创建表（虽然这本身是不好的设计），请务必注意：DDL 会导致隐式提交，后续的 ROLLBACK 无法撤销前面已提交的操作。
:::

## 自动提交

MySQL 默认开启 `autocommit`，即每条单独的 SQL 语句都是一个独立的事务，执行后立即提交。

```sql
-- 查看当前 autocommit 设置
SHOW VARIABLES LIKE 'autocommit';
-- +---------------+-------+
-- | Variable_name | Value |
-- +---------------+-------+
-- | autocommit    | ON    |
-- +---------------+-------+

-- 关闭自动提交（当前会话）
SET autocommit = 0;

-- 关闭后，需要手动 COMMIT
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
-- 此时修改未提交
COMMIT; -- 手动提交

-- 全局关闭（影响所有新连接，不建议在生产环境使用）
SET GLOBAL autocommit = 0;
```

::: tip autocommit 与 DDL
即使 `autocommit = OFF`，DDL 语句仍然会隐式提交。`autocommit` 只影响 DML 语句（INSERT/UPDATE/DELETE）的行为。
:::

## 长事务的问题

长事务是指执行时间很长、长时间不提交的事务。长事务会带来一系列问题：

### 1. 占用锁资源，阻塞其他事务

```sql
-- 事务 A：长事务
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
-- ... 执行复杂业务逻辑，耗时 30 秒 ...
-- 这 30 秒内，其他任何要修改 user_id=1 的事务都会被阻塞
COMMIT;
```

### 2. Undo Log 膨胀

长事务持有 Undo Log 不释放，导致 Undo 表空间持续增长。

```sql
-- 查看 Undo 表空间状态
SELECT SPACE, NAME, STATE FROM INFORMATION_SCHEMA.INNODB_TABLESPACES
WHERE NAME LIKE '%undo%';
```

当一个长事务运行期间，它之后启动的所有事务产生的 Undo Log 都不能被 purge（清理），因为长事务可能需要访问这些旧版本数据。

### 3. 主从延迟

在主从复制架构中，长事务会导致从库回放延迟增大。从库需要等主库 COMMIT 后才能开始回放整个事务，事务越长延迟越大。

### 4. 锁等待超时

```sql
-- 锁等待超时设置（默认 50 秒）
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
-- +--------------------------+-------+
-- | Variable_name            | Value |
-- +--------------------------+-------+
-- | innodb_lock_wait_timeout | 50    |
-- +--------------------------+-------+
```

长事务长时间持有锁，其他等待的事务可能超时报错：

```
ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

### 如何避免长事务

```sql
-- 1. 拆分大事务，分批提交
-- 错误示范：一次性处理 100 万行
BEGIN;
UPDATE big_table SET status = 1 WHERE created_at < '2025-01-01';
COMMIT;

-- 正确示范：分批处理
SET @batch_size = 1000;
REPEAT
    UPDATE big_table SET status = 1
    WHERE created_at < '2025-01-01' AND status = 0
    LIMIT @batch_size;
    SELECT ROW_COUNT();
UNTIL ROW_COUNT() = 0
END REPEAT;

-- 2. 监控长事务
SELECT trx_id, trx_state, trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_sec,
       trx_rows_modified, trx_mysql_thread_id
FROM information_schema.INNODB_TRX
WHERE trx_state = 'RUNNING'
ORDER BY trx_started ASC;

-- 3. 设置事务超时（MySQL 8.0+）
SET SESSION innodb_rollback_on_timeout = ON;
SET SESSION max_execution_time = 30000; -- 毫秒
```

::: danger 生产环境建议
- 事务内只做必要的数据库操作，不要在事务中执行 RPC 调用、HTTP 请求等外部操作
- 控制事务粒度，尽量做到"短平快"
- 定期检查 `INNODB_TRX` 表，发现并处理长事务
- 使用 `max_execution_time` 限制单条 SQL 执行时间
:::
