# VACUUM 机制

VACUUM 是 PostgreSQL 运维的核心。与 MySQL 不同，PostgreSQL 没有 Undo Log——旧版本的行直接留在表中，由 VACUUM 负责清理。理解 VACUUM 的工作原理和调优方法，是保证 PostgreSQL 长期稳定运行的关键。

## Dead Tuple 的产生

```
UPDATE/DELETE 操作不会物理删除旧行，而是：
1. UPDATE：旧行 xmax 设为当前事务 ID，插入新行
2. DELETE：旧行 xmax 设为当前事务 ID

旧行对新事务不可见，但物理上仍占用空间 → Dead Tuple
Dead Tuple 的累积导致：
- 表膨胀（表文件越来越大）
- 索引膨胀（索引中保留了指向 Dead Tuple 的条目）
- 查询需要扫描更多页面
```

## VACUUM 操作

### 普通 VACUUM

```sql
-- 基本语法
VACUUM;                       -- 清理所有表
VACUUM orders;                -- 清理指定表
VACUUM (VERBOSE) orders;      -- 输出详细日志
VACUUM (ANALYZE) orders;      -- 清理并更新统计信息

-- VACUUM 的工作流程：
-- 1. 扫描堆页面，收集 Dead Tuple 的 TID
-- 2. 遍历表的每个索引，删除指向 Dead Tuple 的索引条目
-- 3. 将 Dead Tuple 对应的空间标记为可重用（加入 Free Space Map）
-- 4. 更新 Visibility Map（标记全部可见的页面）
-- 5. 更新冻结信息（Truncate CLOG 中不需要的事务状态）

-- VACUUM 不会：
-- - 缩小表文件（不会释放磁盘空间给 OS）
-- - 移动元组位置（不改变数据的物理布局）
-- - 阻塞读写操作（对业务基本无影响）
```

### VACUUM FULL

```sql
-- VACUUM FULL 重建整个表
VACUUM FULL orders;

-- VACUUM FULL 的工作方式：
-- 1. 对表加排他锁（阻塞所有读写）
-- 2. 创建一个新表文件
-- 3. 将存活的元组复制到新文件
-- 4. 重建所有索引
-- 5. 删除旧文件

-- 适用场景：表膨胀严重，普通 VACUUM 无法回收空间
-- 缺点：长时间锁表，不适合在线生产环境
```

::: warning VACUUM FULL 会锁表
VACUUM FULL 需要排他锁，期间所有查询和写入都会阻塞。生产环境中优先使用 `pg_repack` 或 `pg_squeeze` 扩展实现在线表重建。
:::

## autovacuum 调优

autovacuum 是后台守护进程，自动执行 VACUUM 和 ANALYZE：

```sql
-- 关键配置参数（postgresql.conf）
autovacuum = on                        -- 默认开启，不要关闭
autovacuum_naptime = 1min              -- 检查间隔（默认 1 分钟）
autovacuum_max_workers = 3             -- 最大 worker 数（默认 3）
autovacuum_vacuum_threshold = 50       -- 触发 VACUUM 的最少 Dead Tuple 数
autovacuum_vacuum_scale_factor = 0.2   -- 触发 VACUUM 的比例阈值（默认 20%）
autovacuum_analyze_threshold = 50      -- 触发 ANALYZE 的最少变更行数
autovacuum_analyze_scale_factor = 0.1  -- 触发 ANALYZE 的比例阈值（默认 10%）
autovacuum_vacuum_cost_delay = 2ms     -- 限速延迟（默认 2ms）
autovacuum_vacuum_cost_limit = -1      -- 使用全局值（默认 200）

-- 触发条件：Dead Tuple 数量 > threshold + scale_factor × 行数
-- 默认：Dead Tuple > 50 + 0.2 × 总行数
-- 对于 1000 万行的表：Dead Tuple > 200 万才触发
```

### 针对大表的调优

```sql
-- 大表需要更频繁的 VACUUM
ALTER TABLE orders SET (
    autovacuum_vacuum_threshold = 1000,
    autovacuum_vacuum_scale_factor = 0.01,    -- 1% 就触发
    autovacuum_analyze_threshold = 500,
    autovacuum_analyze_scale_factor = 0.005,   -- 0.5% 触发
    autovacuum_vacuum_cost_delay = 0           -- 不限速
);

-- 高频写入的表：减少限速
ALTER TABLE events SET (
    autovacuum_vacuum_cost_delay = 0,          -- 关闭延迟
    autovacuum_vacuum_cost_limit = 1000        -- 提高成本限额
);

-- 查看表的 autovacuum 配置
SELECT relname,
       reloptions
FROM pg_class
WHERE relname = 'orders';
```

::: tip cost_delay 调优
`autovacuum_vacuum_cost_delay = 0` 可以让 VACUUM 不受 I/O 预算限制，全速运行。在 SSD 环境下，这通常不会对业务 I/O 造成明显影响。对于 HDD 或共享存储，需要谨慎。
:::

## Freeze 防止事务回卷

PostgreSQL 使用 32 位事务 ID（约 21 亿个），会循环使用。如果一个元组的 xmin 太旧（超过 freeze 阈值），需要被"冻结"以防止事务 ID 回卷导致数据丢失。

### 事务回卷问题

```
事务 ID 是循环的：... → 2,147,483,647 → 0 → 1 → ...

如果一个元组的 xmin=100，事务运行到 ID=2,147,483,647 + 100 = 100
此时新事务 (ID=100) 会误认为这个元组是自己插入的 → 数据混乱

解决：在 xmin 超过"安全距离"之前，将元组冻结
```

### Freeze 机制

```sql
-- VACUUM 会自动执行 Freeze
-- 冻结阈值 = max_freeze_age（默认 2 亿）

-- 查看需要 Freeze 的表
SELECT relname,
       age(relfrozenxid) AS xid_age,
       pg_size_pretty(pg_total_relation_size(oid)) AS size
FROM pg_class
WHERE relkind = 'r'
  AND age(relfrozenxid) > 100000000    -- 超过 1 亿
ORDER BY age(relfrozenxid) DESC;

-- 强制 Freeze（如果 xid_age 接近 20 亿）
VACUUM (FREEZE, VERBOSE) orders;

-- 关键配置
vacuum_freeze_min_age = 50000000        -- 最小冻结年龄（默认 5000 万）
vacuum_freeze_table_age = 150000000     -- 触发 aggressive freeze 的表年龄（默认 1.5 亿）
```

::: warning 事务回卷是严重事故
如果 `relfrozenxid` 超过 `autovacuum_freeze_max_age`（默认 2 亿），autovacuum 会紧急强制 VACUUM。如果此时 autovacuum 不可用（比如配置错误），PostgreSQL 会拒绝一切写入以保护数据完整性。定期监控 `xid_age` 是运维必需。
:::

## 膨胀检测与处理

### 检测表膨胀

```sql
-- 方法 1：使用 pg_stat_user_tables
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 方法 2：使用 pgstattuple 扩展（精确但需要全表扫描）
CREATE EXTENSION IF NOT EXISTS pgstattuple;
SELECT * FROM pgstattuple('orders');
-- table_len: 表大小
-- dead_tuple_len: Dead Tuple 占用空间
-- dead_tuple_percent: Dead Tuple 比例

-- 方法 3：比较实际大小与理论大小
SELECT
    relname,
    pg_size_pretty(pg_total_relation_size(oid)) AS actual_size,
    pg_size_pretty(pg_relation_size(oid)) AS table_size,
    n_live_tup,
    pg_size_pretty(pg_total_relation_size(oid) / NULLIF(n_live_tup, 0)) AS per_row
FROM pg_class
JOIN pg_stat_user_tables ON oid = relid
WHERE relkind = 'r'
ORDER BY pg_total_relation_size(oid) DESC;
```

### 处理膨胀

```sql
-- 方案 1：普通 VACUUM（轻度膨胀）
VACUUM (VERBOSE, ANALYZE) orders;

-- 方案 2：pg_repack（推荐，不锁表）
-- 安装：apt install postgresql-16-repack
-- CREATE EXTENSION pg_repack;
-- 命令行：pg_repack -t orders -d mydb

-- 方案 3：Online 方式（不用扩展）
-- 1. 创建新表
CREATE TABLE orders_new (LIKE orders INCLUDING ALL);
-- 2. 用 pg_truncate 或分批插入
INSERT INTO orders_new SELECT * FROM orders;
-- 3. 创建索引
-- 4. 原子切换
BEGIN;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
DROP TABLE orders_old;
COMMIT;

-- 方案 4：VACUUM FULL（最后手段，会锁表）
VACUUM FULL orders;
```

## Free Space Map 与 Visibility Map

```
-- Free Space Map (FSM)
-- 记录每个页面的可用空间（1/256 粒度）
-- INSERT 时查找有足够空间的页面，避免全表扫描
-- 文件：pg_fsm/relfilenode_fsm

-- Visibility Map (VM)
-- 记录每个页面是否全部可见（对所有事务）
-- Index-only Scan 依赖 VM 判断是否需要访问堆
-- VACUUM 时更新 VM
-- 文件：pg_vm/relfilenode_vm

-- 查看 FSM/VM 信息
SELECT pg_relation_filepath('orders');      -- 主数据文件路径
SELECT pg_freespace('orders');              -- 每个页面的可用空间
```

## VACUUM 监控

```sql
-- 正在运行的 VACUUM
SELECT
    pid,
    query,
    phase,
    heap_blks_total,
    heap_blks_scanned,
    heap_blks_vacuumed,
    index_vacuum_count
FROM pg_stat_progress_vacuum;

-- 历史 VACUUM 统计
SELECT
    relname,
    last_vacuum,
    last_autovacuum,
    vacuum_count,
    autovacuum_count,
    last_analyze,
    last_autoanalyze,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
ORDER BY autovacuum_count DESC
LIMIT 20;
```
