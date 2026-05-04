# Undo Log 深度解析

## Undo Log 的作用

Undo Log 承担两个核心职责：

1. **事务回滚**：当事务执行 ROLLBACK 时，利用 undo log 将数据恢复到修改前的状态
2. **MVCC 版本链**：通过 undo log 构建数据的多版本快照，实现一致性读（Consistent Read）

```
Undo Log 在 MVCC 中的角色：

当前版本 (id=1, name='Alice', trx_id=100, roll_ptr=→)
    ↓ roll_ptr
undo log (id=1, name='Bob', trx_id=90, roll_ptr=→)
    ↓ roll_ptr
undo log (id=1, name='Charlie', trx_id=80, roll_ptr=→)
    ↓ roll_ptr
更早的版本...

ReadView 遍历版本链，找到对当前事务可见的版本。
```

## Undo Log 记录内容

Undo Log 记录的是**反向操作**（逻辑日志），用于将数据恢复到修改前的状态。

### INSERT 的 Undo

```sql
INSERT INTO users (id, name, age) VALUES (10, 'Alice', 25);
```

对应的 undo log 记录：**DELETE**

```
Undo Type: TRX_UNDO_INSERT_REC
操作：删除主键 id=10 的记录
因为 INSERT 只影响当前事务，回滚时直接删除即可
```

### DELETE 的 Undo

```sql
DELETE FROM users WHERE id = 10;
```

对应的 undo log 记录：**INSERT**（完整的行数据）

```
Undo Type: TRX_UNDO_DEL_MARK_REC
操作：恢复 id=10 的记录（包括所有列的值）
实际上 DELETE 是标记删除（delete_mark），undo log 恢复标记即可
```

### UPDATE 的 Undo

```sql
UPDATE users SET name = 'Bob' WHERE id = 10;
```

对应的 undo log 记录：**反向 UPDATE**

```
Undo Type: TRX_UNDO_UPD_EXIST_REC
操作：将 name 从 'Bob' 恢复为 'Alice'

注意：如果修改的是主键，InnoDB 的处理等价于 DELETE + INSERT
需要记录完整的旧值
```

```sql
-- 非主键列更新（就地更新，如果新旧值长度相同）
UPDATE users SET name = 'Bob' WHERE id = 10;
-- undo log: name='Bob' → name='Alice'

-- 主键列更新（标记删除 + 插入新记录）
UPDATE users SET id = 20 WHERE id = 10;
-- undo log 中需要记录完整的旧行数据
```

::: tip 更新操作的优化
如果 UPDATE 不修改主键且新旧值长度相同，InnoDB 会执行**就地更新（in-place update）**，不产生新的行版本。否则，会执行**删除标记 + 插入新记录**，产生新的版本链节点。
:::

## Undo Log 存储

### Undo 表空间

MySQL 8.0+ 支持独立的 undo 表空间，将 undo log 从系统表空间中分离。

```sql
-- 查看 undo 表空间配置
SHOW VARIABLES LIKE 'innodb_undo_tablespaces';
-- 默认 2（2 个 undo 表空间文件）
-- 0 表示使用系统表空间

SHOW VARIABLES LIKE 'innodb_undo_directory';
-- undo 文件存储路径

-- undo 文件命名：undo_001, undo_002, ...
-- 位于 innodb_undo_directory 指定的目录
```

### Undo Log Segment

每个 undo log 被分配到一个 undo log segment 中：

```
Undo Tablespace
├── Undo Segment 1 (Rollback Segment 1)
│   ├── Undo Log Slot 1 (事务 100 的 undo log)
│   ├── Undo Log Slot 2 (事务 101 的 undo log)
│   └── ...
├── Undo Segment 2
│   └── ...
└── ...
```

```sql
-- 查看 undo log 的使用情况
SELECT
    SPACE AS tablespace_id,
    NAME AS segment_name,
    SIZE AS segment_size
FROM information_schema.INNODB_UNDO_LOGS;

-- 查看活跃事务的 undo log 占用
SELECT
    trx_id,
    trx_state,
    trx_started,
    trx_rows_modified,
    trx_undo_log_current
FROM information_schema.INNODB_TRX;
```

## 版本链 (Version Chain)

InnoDB 使用隐藏列 `DB_ROLL_PTR`（回滚指针）将同一行的多个版本串联起来。

```
users 表中 id=1 的版本链（从新到旧）：

版本 4（当前可见版本）:
┌────┬───────┬──────┬─────────┬─────────────────────────────────┐
│ id │ name  │ age  │ trx_id  │ roll_ptr → (指向 undo log)      │
│ 1  │ Eve   │ 30   │ 104     │ ──────────────────────────────── │
└────┴───────┴──────┴─────────┴─────────────────────────────────┘
                                                          │
          ┌───────────────────────────────────────────────┘
          ↓
版本 3（undo log）:
┌────┬───────┬──────┬─────────┬─────────────────────────────────┐
│ id │ name  │ age  │ trx_id  │ roll_ptr →                      │
│ 1  │ Dave  │ 28   │ 103     │ ──────────────────────────────── │
└────┴───────┴──────┴─────────┴─────────────────────────────────┘
                                                          │
          ┌───────────────────────────────────────────────┘
          ↓
版本 2（undo log）:
┌────┬───────┬──────┬─────────┬─────────────────────────────────┐
│ id │ name  │ age  │ trx_id  │ roll_ptr →                      │
│ 1  │ Carol │ 27   │ 102     │ ──────────────────────────────── │
└────┴───────┴──────┴─────────┴─────────────────────────────────┘
                                                          │
          ┌───────────────────────────────────────────────┘
          ↓
版本 1（undo log）:
┌────┬───────┬──────┬─────────┬─────────────────────────────────┐
│ id │ name  │ age  │ trx_id  │ roll_ptr → NULL                 │
│ 1  │ Bob   │ 25   │ 101     │                                 │
└────┴───────┴──────┴─────────┴─────────────────────────────────┘
```

## ReadView 如何利用 Undo Log

ReadView 是 MVCC 实现一致性读的核心数据结构。它在某个时刻拍快照，记录当时活跃的事务信息。

### ReadView 的结构

```c
struct ReadView {
    trx_id_t m_ids[];        // 创建 ReadView 时所有活跃事务 ID 列表
    trx_id_t m_low_limit_id; // m_ids 中最大事务 ID + 1
    trx_id_t m_up_limit_id;  // m_ids 中最小事务 ID
    trx_id_t m_creator_trx_id; // 创建此 ReadView 的事务 ID
};
```

### 可见性判断规则

对于版本链中的每个版本，按以下规则判断对当前 ReadView 是否可见：

```
1. trx_id < m_up_limit_id
   → 该版本在创建 ReadView 之前已提交 → 可见 ✓

2. trx_id >= m_low_limit_id
   → 该版本在创建 ReadView 之后才开启 → 不可见 ✗

3. m_up_limit_id <= trx_id < m_low_limit_id
   3a. trx_id 在 m_ids[] 中 → 该事务未提交 → 不可见 ✗
   3b. trx_id 不在 m_ids[] 中 → 该事务已提交 → 可见 ✓

4. 如果当前版本不可见，沿 roll_ptr 遍历到下一个版本，重复判断

5. 如果到达版本链尽头仍不可见 → 返回空结果
```

```sql
-- READ COMMITTED：每次 SELECT 都创建新的 ReadView
-- REPEATABLE READ：事务中只创建一次 ReadView（第一次 SELECT 时）

-- 查看当前事务的隔离级别
SELECT @@transaction_isolation;

-- 验证 MVCC 行为
SET SESSION transaction_isolation = 'REPEATABLE-READ';

-- 会话 A
BEGIN;
SELECT * FROM users WHERE id = 1;
-- 假设看到 name='Bob'，记下当前 ReadView

-- 会话 B
BEGIN;
UPDATE users SET name = 'Alice' WHERE id = 1;
COMMIT;

-- 会话 A（同一个事务中）
SELECT * FROM users WHERE id = 1;
-- 仍然看到 name='Bob'（Repeatable Read 的快照读）
-- 因为 ReadView 是在第一次 SELECT 时创建的
```

::: tip 快照读 vs 当前读
- **快照读（Snapshot Read）**：普通的 SELECT 语句，读取 ReadView 对应的版本
- **当前读（Current Read）**：`SELECT ... FOR UPDATE`、`SELECT ... LOCK IN SHARE MODE`、`INSERT`、`UPDATE`、`DELETE`，读取最新已提交的版本

```sql
-- 快照读：读取历史版本
SELECT * FROM users WHERE id = 1;

-- 当前读：读取最新版本（加锁）
SELECT * FROM users WHERE id = 1 FOR UPDATE;
UPDATE users SET name = 'Carol' WHERE id = 1;
```
:::

## Purge 机制

Undo log 不能无限增长。当某些版本不再被任何 ReadView 需要时，purge 线程会清理这些 undo log。

### 什么时候 undo log 可以被 purge

```
undo log 可以被清理的条件：
该 undo log 对应的版本，不会被任何当前活跃的 ReadView 需要。

即：所有比该版本更晚开启的事务都已经提交或回滚。

举例：
- 事务 100 创建了 undo log 版本
- 事务 105 在该版本基础上创建了 ReadView
- 只有当事务 105 提交/回滚后，事务 100 的 undo log 才能被 purge
```

### Purge 线程配置

```sql
-- 查看 purge 线程数
SHOW VARIABLES LIKE 'innodb_purge_threads';
-- 默认 4
-- 高并发写入场景可适当增大

-- purge 线程的调度间隔
SHOW VARIABLES LIKE 'innodb_purge_batch_size';
-- 默认 300
-- 每次 purge 处理的 undo log 页数

-- purge 延迟上限
SHOW VARIABLES LIKE 'innodb_max_purge_lag';
-- 默认 0（不限制）
-- 当待 purge 的事务数超过该值时，减慢 DML 操作的速度

SHOW VARIABLES LIKE 'innodb_max_purge_lag_delay';
-- 默认 0（不限制延迟时间，毫秒）
-- DML 操作被延迟的最大时间

-- 查看 purge 状态
SHOW ENGINE INNODB STATUS\G
-- "TRANSACTIONS" 部分：
-- ---TRANSACTION xxx, ACTIVE 0 sec
-- Trx read view will not see trx with id >= xxx, sees < xxx
-- Trx #rec lock waits 0 #table lock waits 0
-- Trx #inserts 0, updates 0, deletes 0
```

```sql
-- 监控 purge 进度
SELECT
    VARIABLE_NAME,
    VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
    'Innodb_purge_undo_truncations',
    'Innodb_purge_usec'
);
```

## Undo Log 膨胀问题

长事务是 undo log 膨胀的最常见原因。

### 问题分析

```
场景：
- 事务 A 开启（执行了一个 SELECT，创建了 ReadView）
- 事务 A 挂着不提交（比如应用忘记关闭连接）
- 后续大量 UPDATE/DELETE 操作创建了大量 undo log
- 由于事务 A 的 ReadView 仍然活跃，所有这些 undo log 都不能被 purge
- undo log 持续增长，磁盘空间被耗尽
```

### 排查方法

```sql
-- 查看长事务
SELECT
    trx_id,
    trx_state,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS duration_sec,
    trx_rows_modified,
    trx_mysql_thread_id
FROM information_schema.INNODB_TRX
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 60
ORDER BY trx_started;

-- 查看所有活跃事务
SELECT * FROM information_schema.INNODB_TRX;

-- 查看 undo log 空间占用
SELECT
    FILE_NAME,
    TABLESPACE_NAME,
    TOTAL_EXTENTS * EXTENT_SIZE / 1024 / 1024 AS size_mb
FROM information_schema.FILES
WHERE TABLESPACE_NAME LIKE '%undo%';

-- 查看历史列表长度（hist list len）
SHOW ENGINE INNODB STATUS\G
-- "TRANSACTIONS" 部分
-- History list length xxx
-- 值越大说明待 purge 的 undo log 越多
```

### 解决方案

```sql
-- 1. 杀掉长事务
KILL <thread_id>;

-- 2. 设置事务超时
SHOW VARIABLES LIKE 'innodb_rollback_on_timeout';
-- 默认 OFF（超时只回滚最后一条语句，不回滚整个事务）

SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';

-- 3. 限制事务运行时间（MySQL 8.0+）
SHOW VARIABLES LIKE 'max_execution_time';
-- 单位毫秒，0 表示不限制
SET GLOBAL max_execution_time = 30000;  -- 30 秒

-- 4. 增大 purge 线程数
SET GLOBAL innodb_purge_threads = 8;

-- 5. 启用 undo log 自动截断（MySQL 8.0.14+）
SHOW VARIABLES LIKE 'innodb_undo_log_truncate';
-- 默认 ON
-- 当 undo 表空间超过阈值时自动截断回收空间

SHOW VARIABLES LIKE 'innodb_max_undo_log_size';
-- 默认 1073741824（1GB）
-- 超过该大小的 undo 表空间会被截断
```

::: danger 长事务的生产事故
常见的 undo log 膨胀场景：
1. 应用连接池泄漏（连接未归还）
2. 自动提交被关闭（`autocommit=0`）且忘记手动提交
3. 大事务（批量 UPDATE 百万行数据）
4. 开发人员在交互式客户端开启事务后忘记提交

预防措施：配置 `max_execution_time`、监控 `History list length`、设置连接超时。
:::
