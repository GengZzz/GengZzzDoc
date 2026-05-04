# MVCC 机制

PostgreSQL 的 MVCC（Multi-Version Concurrency Control）直接内建在存储层。每个事务看到的是数据的一个快照版本，读写操作互不阻塞。理解 MVCC 的实现细节，是排查锁等待、理解隔离级别差异、调优 VACUUM 策略的基础。

## HeapTuple 元组结构

PostgreSQL 表中的每一行（Tuple）存储在 Heap 页面中，每个 Tuple 有一个 23 字节的头部信息：

```
┌─────────────────────────────────────────────────────────┐
│                    HeapTuple Header (23 bytes)           │
├─────────┬─────────┬──────────┬──────────┬───────────────┤
│  xmin   │  xmax   │  infomask│  ctid    │  其他字段      │
│ (4 byte)│ (4 byte)│ (2 byte)│ (6 byte) │  (7 byte)     │
└─────────┴─────────┴──────────┴──────────┴───────────────┘
```

关键字段：

- **xmin**：插入此行的事务 ID（Transaction ID）
- **xmax**：删除（或更新）此行的事务 ID。0 表示未被删除/更新
- **ctid**：指向当前 Tuple 的物理位置（page_number, tuple_index）
- **infomask**：状态标记位（HEAP_XMIN_COMMITTED、HEAP_XMAX_INVALID 等）

```sql
-- 查看元组的 xmin/xmax
SELECT id, xmin, xmax, ctid FROM users;

-- xmin=752, xmax=0  表示事务 752 插入，未被删除
-- xmin=752, xmax=753 表示事务 752 插入，事务 753 删除/更新了它
-- ctid=(0,1) 表示第 0 页第 1 个元组
```

## 多版本实现原理

当 UPDATE 或 DELETE 发生时，PostgreSQL 不会修改原行，而是：

```
-- UPDATE 操作的内部流程
-- 初始状态：id=1, name='Alice', age=20, xmin=100, xmax=0

-- 事务 101 执行：UPDATE users SET age=25 WHERE id=1

步骤 1：标记旧行的 xmax=101（逻辑删除）
         旧行：id=1, name='Alice', age=20, xmin=100, xmax=101

步骤 2：插入新行，xmin=101
         新行：id=1, name='Alice', age=25, xmin=101, xmax=0

-- 两个版本物理上都存在于表中
-- 不同的事务根据快照决定看到哪个版本
```

<PgMvccDemo />

## 快照隔离

### 事务快照

每个事务在开始时获取一个全局快照，记录了当前活跃事务的列表：

```sql
-- 查看当前快照
SELECT txid_current_snapshot();
-- 输出格式: xmin:xmax:xip_list
-- 例: 100:105:101,103
--   xmin=100: 小于此 ID 的事务都已提交或回滚
--   xmax=105: 大于此 ID 的事务对当前快照不可见
--   xip_list: xmin~xmax 之间仍活跃的事务

-- 快照可见性规则：
-- 事务 T 的变更对当前事务可见，当且仅当：
--   1. T.xmin < xmin（T 已提交） 且 T 不在 xip_list 中
--   2. T 不是当前事务本身
```

### 可见性判断流程

```
对于元组 (xmin=100, xmax=103)，当前快照 (xmin=95, xmax=105, xip=[102])：

xmin=100 的可见性：
  100 >= xmax(105)?     否 → 继续
  100 在 xip_list 中?  否（xip 只有 102）
  → xmin 的事务已提交，此行是有效插入

xmax=103 的可见性：
  103 >= xmax(105)?     否 → 继续
  103 在 xip_list 中?  否
  → xmax 的事务已提交，此行已被删除/更新

结论：当前事务看不到此行（xmax 事务的变更已提交）
```

### Read Committed vs Repeatable Read

```sql
-- Read Committed（PostgreSQL 默认）
-- 每条语句执行前获取新快照
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT * FROM users WHERE id = 1;     -- 看到 age=20
-- 另一个事务在此期间 UPDATE age=25 并 COMMIT
SELECT * FROM users WHERE id = 1;     -- 看到 age=25（新快照）
COMMIT;

-- Repeatable Read
-- 事务开始时获取快照，整事务使用同一快照
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT * FROM users WHERE id = 1;     -- 看到 age=20
-- 另一个事务 UPDATE age=25 并 COMMIT
SELECT * FROM users WHERE id = 1;     -- 仍然看到 age=20（旧快照）
COMMIT;
```

::: tip 与 MySQL 的区别
MySQL InnoDB 的 REPEATABLE READ 通过 Undo Log 版本链实现快照读。PostgreSQL 通过 xmin/xmax 直接在堆元组上判断可见性。PostgreSQL 没有 Undo Log——旧行就留在表中，由 VACUUM 清理。
:::

## 隔离级别详解

### Read Uncommitted

```sql
-- PostgreSQL 中 READ UNCOMMITTED 等价于 READ COMMITTED
-- 不可能发生脏读（PostgreSQL 的实现保证了这一点）
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- 实际行为与 READ COMMITTED 完全相同
COMMIT;
```

::: tip 原因
PostgreSQL 的 MVCC 实现中，只有已提交事务的变更才对其他事务可见。未提交事务的元组（xmax 是活跃事务）对其他事务不可见。因此脏读在 PostgreSQL 中物理上不可能发生。
:::

### Repeatable Read

```sql
-- 可重复读 + 写冲突检测
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

SELECT * FROM orders WHERE id = 1;
-- 读取时 amount = 100

-- 另一个事务此时 UPDATE orders SET amount = 200 WHERE id = 1; COMMIT;

UPDATE orders SET amount = amount + 50 WHERE id = 1;
-- ERROR: could not serialize access due to concurrent update
-- PostgreSQL 检测到该行在快照之后被其他事务修改过

COMMIT;  -- 事务必须回滚或重试
```

### Serializable

PostgreSQL 11+ 实现了真正的 Serializable 隔离级别（SSI，Serializable Snapshot Isolation）：

```sql
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- SSI 通过检测"读写依赖"来防止所有异常：
-- 1. 读取了其他事务写入的数据（rw-dependency）
-- 2. 自己又写了影响其他事务读取的数据

-- 经典的写偏斜（Write Skew）场景
-- 两个医生值班问题：至少保留一个医生值班
-- 事务 A：SELECT COUNT(*) FROM doctors WHERE on_call = true;  -- 得到 2
-- 事务 B：SELECT COUNT(*) FROM doctors WHERE on_call = true;  -- 得到 2
-- 事务 A：UPDATE doctors SET on_call = false WHERE id = 1;
-- 事务 B：UPDATE doctors SET on_call = false WHERE id = 2;
-- 在 SERIALIZABLE 级别，后提交的事务会被回滚：
-- ERROR: could not serialize access due to read/write dependencies among transactions

COMMIT;
```

::: tip SSI 的性能影响
SSI 需要跟踪读写依赖，有一定开销。大多数应用使用 READ COMMITTED 即可。只有需要严格串行化保证的场景（金融转账、库存扣减）才需要 SERIALIZABLE。
:::

## 行锁与 MVCC 的关系

```sql
-- SELECT ... FOR UPDATE 获取行锁
BEGIN;
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
-- 在元组上设置 xmax = 当前事务 ID，标记 HEAP_XMAX_IS_MULTI（锁标记）
-- 其他事务执行 FOR UPDATE 时会等待

-- FOR UPDATE / FOR NO KEY UPDATE / FOR SHARE / FOR KEY SHARE
-- 四种锁模式的兼容性不同
```

## xmin/xmax 的实际应用

```sql
-- 查找长时间未清理的旧版本
SELECT ctid, xmin, xmax, *
FROM users
WHERE xmax != 0
  AND age(xmin) > INTERVAL '1 hour'
ORDER BY xmin;

-- 查找两版本链长度
SELECT id,
       ctid,
       xmin,
       xmax,
       (xmax = 0) AS is_current
FROM users
WHERE id = 1
ORDER BY xmin DESC;
```
