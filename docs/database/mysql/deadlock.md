# 死锁分析与处理

死锁是数据库并发操作中最棘手的问题之一。当两个或多个事务互相持有对方需要的锁，又都在等待对方释放锁时，就形成了死锁，所有相关事务都无法继续执行。

## 死锁产生的必要条件

死锁的产生必须同时满足以下四个条件（Coffman 条件）：

| 条件 | 说明 |
|------|------|
| 互斥 | 一个资源同一时间只能被一个事务持有 |
| 持有并等待 | 事务持有一些锁的同时，等待获取其他锁 |
| 不可抢占 | 已获得的锁不能被强制释放，只能由持有者主动释放 |
| 循环等待 | 存在一组事务 T1→T2→...→Tn→T1 的循环等待链 |

打破任何一个条件就可以避免死锁。InnoDB 的死锁检测机制主要通过打破"循环等待"条件来处理。

## 常见死锁场景

### 场景一：两个事务交叉更新两行

这是最经典的死锁场景。

```sql
-- 建表
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance DECIMAL(10,2)
);
INSERT INTO accounts VALUES (1, 1000.00), (2, 2000.00);

-- 事务 A                          -- 事务 B
BEGIN;                             BEGIN;
UPDATE accounts SET balance = 900
  WHERE id = 1;
                                   UPDATE accounts SET balance = 1800
                                     WHERE id = 2;
UPDATE accounts SET balance = 1800
  WHERE id = 2;
-- 等待事务 B 释放 id=2 的锁
                                   UPDATE accounts SET balance = 900
                                     WHERE id = 1;
                                   -- 等待事务 A 释放 id=1 的锁
                                   -- 死锁！
```

```
事务 A 持有 id=1 的锁，等待 id=2 的锁
事务 B 持有 id=2 的锁，等待 id=1 的锁
→ 循环等待 → 死锁
```

### 场景二：间隙锁冲突导致死锁

```sql
-- 建表
CREATE TABLE t (
    id INT PRIMARY KEY,
    KEY idx_id (id)
);
INSERT INTO t VALUES (1), (5), (10), (15);

-- 事务 A                          -- 事务 B
BEGIN;                             BEGIN;
SELECT * FROM t WHERE id = 7
  FOR UPDATE;
-- 间隙锁 (5, 10)
                                   SELECT * FROM t WHERE id = 3
                                     FOR UPDATE;
                                   -- 间隙锁 (1, 5)

INSERT INTO t VALUES (7);
-- 需要插入意向锁 (5, 10)
-- 与事务 B 的间隙锁 (1, 5) 不冲突
-- 但需要检查是否有其他冲突...
                                   INSERT INTO t VALUES (3);
                                   -- 需要插入意向锁 (1, 5)
                                   -- 与事务 A 的间隙锁 (5, 10) 不直接冲突
-- 但在某些情况下会形成死锁
```

### 场景三：唯一索引与二级索引的加锁顺序

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(32) UNIQUE,
    user_id BIGINT,
    KEY idx_user_id (user_id)
);

-- 事务 A                          -- 事务 B
BEGIN;                             BEGIN;
UPDATE orders SET user_id = 20
  WHERE order_no = 'A001';
-- 1. 锁 idx(order_no='A001')     UPDATE orders SET user_id = 30
-- 2. 锁 PK(id=对应行)              WHERE order_no = 'B002');
                                   -- 1. 锁 idx(order_no='B002')
                                   -- 2. 锁 PK(id=对应行)
-- 如果 A001 和 B002 对应的       -- 如果需要更新的是同一条二级索引记录
-- 二级索引记录相邻               -- 就可能产生死锁
DELETE FROM orders
  WHERE order_no = 'B002';
-- 需要锁 idx(order_no='B002')
                                   DELETE FROM orders
                                     WHERE order_no = 'A001';
                                   -- 需要锁 idx(order_no='A001')
-- 死锁！
```

### 场景四：外键检查导致的死锁

```sql
CREATE TABLE parent (
    id INT PRIMARY KEY,
    name VARCHAR(32)
);

CREATE TABLE child (
    id INT PRIMARY KEY,
    parent_id INT,
    FOREIGN KEY (parent_id) REFERENCES parent(id)
);

-- 事务 A                          -- 事务 B
BEGIN;                             BEGIN;
INSERT INTO child VALUES (1, 10);
-- 对 parent.id=10 加共享锁
-- （外键检查）
                                   DELETE FROM parent WHERE id = 10;
                                   -- 需要排他锁
                                   -- 与事务 A 的共享锁冲突

-- 如果事务 A 还需要访问           -- 死锁
-- 事务 B 持有的其他锁
```

### 场景五：INSERT ... ON DUPLICATE KEY 死锁

```sql
-- 有唯一索引的表
CREATE TABLE user_login (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    login_count INT DEFAULT 1
);

-- 两个事务同时插入相同 user_id
-- 事务 A                          -- 事务 B
BEGIN;                             BEGIN;
INSERT INTO user_login (user_id, login_count)
  VALUES (100, 1)
  ON DUPLICATE KEY UPDATE
    login_count = login_count + 1;
                                   INSERT INTO user_login (user_id, login_count)
                                     VALUES (100, 1)
                                     ON DUPLICATE KEY UPDATE
                                       login_count = login_count + 1;
-- 两者都检测到唯一键冲突
-- 都尝试加锁更新已有记录
-- 死锁！
```

## 死锁检测

### 死锁检测机制

InnoDB 默认开启死锁检测。当检测到死锁时，InnoDB 会选择一个"代价最小"的事务进行回滚，打破死锁。

```sql
-- 查看死锁检测开关
SHOW VARIABLES LIKE 'innodb_deadlock_detect';
-- +----------------------+-------+
-- | Variable_name        | Value |
-- +----------------------+-------+
-- | innodb_deadlock_detect | ON  |
-- +----------------------+-------+

-- 关闭死锁检测（高并发场景下可能有性能收益，但需要配合锁等待超时）
SET GLOBAL innodb_deadlock_detect = OFF;
```

::: tip 死锁检测的代价
死锁检测的时间复杂度是 O(n^2)，其中 n 是等待锁的事务数量。在高并发场景下（几百上千个事务同时等待锁），死锁检测本身可能成为性能瓶颈。此时可以考虑关闭死锁检测，改用 `innodb_lock_wait_timeout` 来控制。
:::

### 查看最近一次死锁

```sql
-- 查看最近一次死锁的详细信息
SHOW ENGINE INNODB STATUS\G
```

输出中的 `LATEST DETECTED DEADLOCK` 部分：

```
------------------------
LATEST DETECTED DEADLOCK
------------------------
2026-05-04 10:30:15 0x7f8a1c0a0700
*** (1) TRANSACTION:
TRANSACTION 12345, ACTIVE 0 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 3 lock struct(s), heap size 1136, 2 row lock(s)
MySQL thread id 100, OS thread handle 140234567890, query id 500 localhost root Updating
UPDATE accounts SET balance = 1800 WHERE id = 2
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 100 page no 3 n bits 72 index PRIMARY of table `test`.`accounts`
trx id 12345 lock_mode X locks rec but not gap waiting
Record lock, heap no 3 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 4; hex 80000002; asc     ;;  -- id = 2

*** (2) TRANSACTION:
TRANSACTION 12346, ACTIVE 0 sec starting index read
mysql tables in use 1, locked 1
3 lock struct(s), heap size 1136, 2 row lock(s)
MySQL thread id 101, OS thread handle 140234567891, query id 501 localhost root Updating
UPDATE accounts SET balance = 900 WHERE id = 1
*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 100 page no 3 n bits 72 index PRIMARY of table `test`.`accounts`
trx id 12346 lock_mode X locks rec but not gap waiting
Record lock, heap no 2 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 4; hex 80000001; asc     ;;  -- id = 1

*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 100 page no 3 n bits 72 index PRIMARY of table `test`.`accounts`
trx id 12346 lock_mode X locks rec but not gap
Record lock, heap no 3 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 4; hex 80000002; asc     ;;  -- id = 2

*** WE ROLL BACK TRANSACTION (1)
```

### 死锁日志解读

关键信息提取：

| 字段 | 含义 |
|------|------|
| `TRANSACTION 12345` | 事务 ID |
| `ACTIVE 0 sec` | 事务已运行时间 |
| `lock_mode X locks rec but not gap` | 等待的是记录排他锁（非间隙锁） |
| `heap no 3` | 记录在页面中的位置 |
| `WE ROLL BACK TRANSACTION (1)` | InnoDB 选择回滚事务 (1) |

::: tip InnoDB 选择回滚哪个事务
InnoDB 选择回滚"代价最小"的事务，通常选择修改行数最少的那个。如果事务中已经修改了大量行，则回滚代价大，InnoDB 倾向于保留它、回滚修改少的事务。
:::

### 通过 performance_schema 查看死锁

```sql
-- 查看最近的死锁事件
SELECT * FROM performance_schema.events_errors_summary_global_by_error
WHERE error_name = 'ER_LOCK_DEADLOCK'\G

-- MySQL 8.0.28+ 可以直接查看锁信息
SELECT
    t.PROCESSLIST_ID,
    t.PROCESSLIST_USER,
    t.PROCESSLIST_HOST,
    t.PROCESSLIST_DB,
    t.PROCESSLIST_INFO AS current_sql,
    l.OBJECT_NAME,
    l.LOCK_TYPE,
    l.LOCK_MODE,
    l.LOCK_STATUS,
    l.LOCK_DATA
FROM performance_schema.data_locks l
JOIN performance_schema.threads t ON l.ENGINE_TRANSACTION_ID = t.PROCESSLIST_TRX_ID
WHERE l.LOCK_STATUS = 'WAITING';
```

## 规避策略

### 1. 按固定顺序访问表和行

```sql
-- 错误：两个事务访问顺序不同
-- 事务 A: UPDATE accounts SET ... WHERE id=1; UPDATE accounts SET ... WHERE id=2;
-- 事务 B: UPDATE accounts SET ... WHERE id=2; UPDATE accounts SET ... WHERE id=1;

-- 正确：所有事务都按 id 升序访问
-- 事务 A: UPDATE accounts SET ... WHERE id=1; UPDATE accounts SET ... WHERE id=2;
-- 事务 B: UPDATE accounts SET ... WHERE id=1; UPDATE accounts SET ... WHERE id=2;

-- 应用层排序
SELECT * FROM accounts WHERE id IN (2, 1) ORDER BY id;
-- 确保无论传入顺序如何，都按 id 升序处理
```

### 2. 缩小事务粒度

```sql
-- 错误：大事务
BEGIN;
UPDATE orders SET status = 1 WHERE user_id = 100;    -- 可能锁很多行
UPDATE orders SET status = 1 WHERE user_id = 200;    -- 又锁很多行
UPDATE orders SET status = 1 WHERE user_id = 300;
COMMIT;

-- 正确：拆分为多个小事务
-- 每次只处理一个 user_id，立即提交
BEGIN;
UPDATE orders SET status = 1 WHERE user_id = 100;
COMMIT;

BEGIN;
UPDATE orders SET status = 1 WHERE user_id = 200;
COMMIT;
```

### 3. 使用较低的隔离级别

```sql
-- 在允许的场景下使用 RC 而非 RR
-- RC 不使用间隙锁，大幅减少间隙锁导致的死锁
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

::: tip RC 减少死锁
RC 级别下不使用间隙锁和临键锁，消除了大量因间隙锁冲突导致的死锁。如果业务允许不可重复读，使用 RC 是减少死锁最有效的手段之一。
:::

### 4. 合理使用索引减少锁范围

```sql
-- 错误：没有索引，锁全表
UPDATE orders SET status = 1 WHERE amount > 100;
-- amount 没有索引 → 全表扫描 → 所有行加锁

-- 正确：添加索引，精确锁定
ALTER TABLE orders ADD INDEX idx_amount (amount);
UPDATE orders SET status = 1 WHERE amount > 100;
-- 使用索引 → 只锁定满足条件的行和间隙
```

### 5. 添加重试机制

```sql
-- 应用层伪代码
max_retries = 3
for retry in range(max_retries):
    try:
        begin_transaction()
        execute_update()
        commit()
        break
    except DeadlockError:
        rollback()
        if retry == max_retries - 1:
            raise
        sleep(0.1 * (retry + 1))  -- 退避重试
```

## 死锁 vs 锁等待超时

```sql
-- 锁等待超时设置（默认 50 秒）
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
-- +--------------------------+-------+
-- | Variable_name            | Value |
-- +--------------------------+-------+
-- | innodb_lock_wait_timeout | 50    |
-- +--------------------------+-------+

-- 设置当前会话的锁等待超时
SET SESSION innodb_lock_wait_timeout = 10;

-- 全局设置
SET GLOBAL innodb_lock_wait_timeout = 10;
```

两者的区别：

| 特性 | 死锁 | 锁等待超时 |
|------|------|-----------|
| 触发条件 | 循环等待 | 单向等待超过阈值 |
| 检测方式 | InnoDB 自动检测 | 定时器 |
| 处理方式 | 自动回滚代价最小的事务 | 返回超时错误 |
| 错误码 | `1213` | `1205` |
| 可关闭 | 可以（`innodb_deadlock_detect=OFF`） | 不建议设为无限大 |

```sql
-- 死锁错误
-- ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction

-- 锁等待超时错误
-- ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

::: danger 高并发场景的建议
- **开启死锁检测**（默认开启），除非事务并发量极高（>1000）且死锁检测成为瓶颈
- **设置合理的锁等待超时**（5-30 秒），不要用默认的 50 秒
- **应用层实现重试逻辑**，捕获错误码 1213 和 1205
- **使用 RC 隔离级别**减少间隙锁导致的死锁
:::
