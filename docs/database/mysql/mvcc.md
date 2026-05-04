# MVCC 机制

MVCC（Multi-Version Concurrency Control，多版本并发控制）是 InnoDB 存储引擎实现高并发的核心技术。它使得读操作不需要加锁，读写互不阻塞，极大地提高了数据库的并发性能。

## MVCC 解决什么问题

在没有 MVCC 的情况下，并发的读写操作需要通过加锁来保证数据一致性，这会导致：

- 读操作阻塞写操作
- 写操作阻塞读操作
- 并发性能急剧下降

MVCC 的核心思想：**每次修改数据时不直接覆盖旧数据，而是保留旧版本，读操作读取合适的旧版本快照，从而无需加锁。**

```sql
-- 没有 MVCC：读写互斥
-- 事务 A: SELECT * FROM users WHERE id=1; -- 加共享锁
-- 事务 B: UPDATE users SET name='Bob' WHERE id=1; -- 阻塞，等待锁

-- 有 MVCC：读写不阻塞
-- 事务 A: SELECT * FROM users WHERE id=1; -- 读快照，不加锁
-- 事务 B: UPDATE users SET name='Bob' WHERE id=1; -- 正常执行，不影响事务 A
```

## 实现原理三要素

InnoDB 中 MVCC 的实现依赖三个核心组件：隐藏列、Undo Log 版本链、ReadView。

### 1. 隐藏列

InnoDB 的每一行数据都包含三个隐藏列：

| 列名 | 长度 | 说明 |
|------|------|------|
| `DB_TRX_ID` | 6 字节 | 最后一次修改该行的事务 ID |
| `DB_ROLL_PTR` | 7 字节 | 回滚指针，指向 Undo Log 中该行的上一个版本 |
| `DB_ROW_ID` | 6 字节 | 隐式自增主键（当表没有显式主键时 InnoDB 自动创建） |

```sql
-- 查看隐藏列（需要特殊工具，这里用伪代码表示）
-- 实际表数据：
-- +----+-------+-----------+------------------+----------+
-- | id | name  | DB_TRX_ID | DB_ROLL_PTR      | DB_ROW_ID|
-- +----+-------+-----------+------------------+----------+
-- |  1 | Alice |       100 | 0x7A0000010A0110 |        1 |
-- +----+-------+-----------+------------------+----------+
```

### 2. Undo Log 版本链

每次对行数据执行 UPDATE 操作时，InnoDB 会：

1. 将当前版本的数据拷贝到 Undo Log 中
2. 修改当前行的数据
3. 更新 `DB_TRX_ID` 为当前事务 ID
4. 更新 `DB_ROLL_PTR` 指向 Undo Log 中的旧版本

多个版本通过 `DB_ROLL_PTR` 串联成一条**版本链**。

```
当前行 (DB_TRX_ID=150) → Undo V1 (DB_TRX_ID=120) → Undo V2 (DB_TRX_ID=100) → ...
```

具体示例：

```sql
-- 初始状态：id=1, name='Alice'，事务 ID=100 写入
-- 版本链：[当前行: Alice, trx_id=100]

-- 事务 120 执行：
UPDATE users SET name = 'Bob' WHERE id = 1;
-- 版本链：[当前行: Bob, trx_id=120] → [Undo: Alice, trx_id=100]

-- 事务 150 执行：
UPDATE users SET name = 'Charlie' WHERE id = 1;
-- 版本链：[当前行: Charlie, trx_id=150] → [Undo: Bob, trx_id=120] → [Undo: Alice, trx_id=100]
```

```
 ┌─────────────┐    DB_ROLL_PTR    ┌─────────────┐    DB_ROLL_PTR    ┌─────────────┐
 │ Charlie     │ ───────────────→ │ Bob         │ ───────────────→ │ Alice       │
 │ trx_id=150  │                  │ trx_id=120  │                  │ trx_id=100  │
 │ (当前行)     │                  │ (Undo Log)  │                  │ (Undo Log)  │
 └─────────────┘                  └─────────────┘                  └─────────────┘
```

### 3. ReadView

ReadView 是 MVCC 在做可见性判断时的核心数据结构。它在特定时刻生成，记录了"从这个时刻的角度看，哪些事务是活跃的"。

ReadView 包含以下关键字段：

| 字段 | 说明 |
|------|------|
| `m_ids` | 生成 ReadView 时，系统中所有**活跃（未提交）**事务的 ID 列表 |
| `up_limit_id` | `m_ids` 中的最小值（最早活跃事务 ID） |
| `low_limit_id` | 生成 ReadView 时，系统**已分配的最大事务 ID + 1** |
| `creator_trx_id` | 创建该 ReadView 的事务 ID |

```sql
-- 假设当前系统状态：
-- 事务 100：已提交
-- 事务 120：活跃（未提交）
-- 事务 130：活跃（未提交）
-- 事务 140：已提交
-- 事务 150：活跃（当前事务）

-- 当前事务 150 创建 ReadView：
-- m_ids = [120, 130, 150]  -- 所有活跃事务
-- up_limit_id = 120         -- 最早活跃事务
-- low_limit_id = 151        -- 已分配最大事务ID + 1
-- creator_trx_id = 150
```

## ReadView 可见性判断规则

当一个事务读取某行数据时，需要根据该行的 `DB_TRX_ID` 和当前 ReadView 来判断该版本是否可见。

判断流程如下：

```
取出当前行（或 Undo Log 某版本）的 DB_TRX_ID
         │
         ▼
┌─ DB_TRX_ID < up_limit_id? ─── 是 ──→ 可见（该版本在 ReadView 创建前就已提交）
│         │
│        否
│         ▼
├─ DB_TRX_ID >= low_limit_id? ── 是 ──→ 不可见（该版本在 ReadView 创建后才生成）
│         │
│        否
│         ▼
├─ DB_TRX_ID 在 m_ids 中? ────── 是 ──→ 不可见（该版本的事务还未提交）
│         │
│        否
│         ▼
└─────────────────────────────────────→ 可见（该版本的事务已提交）
```

如果当前版本不可见，则沿着 Undo Log 版本链向前查找，直到找到可见的版本。

```sql
-- 示例：事务 150 的 ReadView
-- m_ids = [120, 130, 150]
-- up_limit_id = 120
-- low_limit_id = 151

-- 读取 id=1 的数据，当前行 DB_TRX_ID = 150
-- 150 >= 120 → 继续
-- 150 < 151 → 继续
-- 150 在 m_ids 中 → 不可见（自己修改的，对自己也可见，因为 creator_trx_id=150）
-- 注意：creator_trx_id 的修改对本事务是可见的

-- 读取 Undo Log 中的版本，DB_TRX_ID = 120
-- 120 >= 120 → 继续
-- 120 < 151 → 继续
-- 120 在 m_ids 中 → 不可见（事务 120 还没提交）

-- 读取 Undo Log 中更早的版本，DB_TRX_ID = 100
-- 100 < 120 → 可见！
```

### RC 与 RR 的 ReadView 差异

```
READ COMMITTED（RC）：每次 SELECT 都创建新的 ReadView
  SELECT #1 → ReadView_1（此时活跃事务：120, 130）
  SELECT #2 → ReadView_2（此时活跃事务：130，120 已提交）

REPEATABLE READ（RR）：事务首次 SELECT 时创建 ReadView，后续复用
  SELECT #1 → ReadView（此时活跃事务：120, 130）
  SELECT #2 → 复用同一个 ReadView（仍然认为 120 活跃，即使它已提交）
```

## 快照读 vs 当前读

MVCC 的一个重要概念是区分"快照读"和"当前读"。

### 快照读 (Snapshot Read)

快照读读取的是数据的历史版本（通过 MVCC 的 ReadView 机制），不需要加锁。

```sql
-- 普通 SELECT 都是快照读
SELECT * FROM users WHERE id = 1;
SELECT name, balance FROM accounts WHERE user_id = 1;
```

### 当前读 (Current Read)

当前读读取的是数据的最新已提交版本，需要加锁。

```sql
-- 以下操作都是当前读

-- 显式加锁读
SELECT * FROM users WHERE id = 1 FOR UPDATE;          -- 加排他锁
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE;  -- 加共享锁
-- MySQL 8.0.1+ 也支持：
SELECT * FROM users WHERE id = 1 FOR SHARE;

-- 所有修改操作也是当前读
INSERT INTO users (name) VALUES ('David');
UPDATE users SET name = 'Eve' WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

::: tip 为什么修改操作是当前读
UPDATE 和 DELETE 需要先找到最新版本的数据才能修改，所以必须是当前读。这也意味着 UPDATE/DELETE 会加锁，可能阻塞其他并发事务。
:::

### 快照读与当前读的实际差异

```sql
-- 会话 A（RR 级别）
BEGIN;
SELECT * FROM users WHERE id = 1;
-- 快照读：name = 'Alice'（读取快照版本）

-- 会话 B
BEGIN;
UPDATE users SET name = 'Bob' WHERE id = 1;
COMMIT;

-- 会话 A 继续
SELECT * FROM users WHERE id = 1;
-- 快照读：name = 'Alice'（仍然是快照，看不到 B 的修改）

SELECT * FROM users WHERE id = 1 FOR UPDATE;
-- 当前读：name = 'Bob'（读取最新版本！）
-- 注意：这会加排他锁

COMMIT;
```

<MySQLMvccDemo />

## MVCC 与 Purge 机制

Undo Log 中的旧版本不能无限保留，否则会持续增长。InnoDB 通过 **Purge 线程**定期清理不再需要的 Undo Log。

Purge 的判断依据：如果一个 Undo Log 版本对所有活跃事务都不可见（即没有任何事务需要读取这个旧版本），就可以被清理。

```sql
-- 查看 purge 相关状态
SHOW ENGINE INNODB STATUS\G
-- 查找 TRANSACTIONS 部分中的：
-- History list length: xxx
-- 这个值越大，说明待清理的 Undo Log 越多

-- 控制 purge 线程数量
SHOW VARIABLES LIKE 'innodb_purge_threads';  -- 默认 4

-- 控制 purge 批量大小
SHOW VARIABLES LIKE 'innodb_purge_batch_size';  -- 默认 300
```

::: warning 长事务导致 Undo Log 膨胀
如果一个事务长时间运行（比如一个报表查询跑了 2 小时），那么在这 2 小时内产生的所有 Undo Log 版本都不能被 purge，因为长事务可能需要读取这些旧版本。这就是为什么应该避免长事务。
:::

## MVCC 的局限性

1. **只在 READ COMMITTED 和 REPEATABLE READ 下生效**：READ UNCOMMITTED 不使用 MVCC（直接读最新数据），SERIALIZABLE 对所有读都加锁

2. **当前读不走 MVCC**：`SELECT ... FOR UPDATE` 和 `LOCK IN SHARE MODE` 读取的是最新版本

3. **DDL 不走 MVCC**：`ALTER TABLE` 等操作不支持多版本

4. **无法精确控制读取哪个版本**：只能看到对当前 ReadView 可见的版本，不能随意读取历史版本
