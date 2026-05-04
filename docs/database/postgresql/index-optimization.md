# 索引优化

创建索引只是第一步，理解 PostgreSQL 的索引使用策略才能做出正确的优化决策。本节深入分析不同的索引扫描方式、Index-only Scan 的条件、VACUUM 对索引的影响，以及索引膨胀的检测与处理。

## 扫描方式对比

PostgreSQL 的查询执行器会根据表大小、选择性、可用索引等因素选择不同的扫描方式。

### Sequential Scan

全表扫描，读取表的每一个页面：

```sql
EXPLAIN ANALYZE SELECT * FROM orders;
-- Seq Scan on orders (actual time=0.012..45.231 rows=1000000 loops=1)

-- 全表扫描何时最优？
-- 1. 表很小（全表读取比走索引 + 回表更快）
-- 2. 查询返回大部分行（选择性低）
-- 3. 没有可用索引
-- 4. 顺序 I/O 比随机 I/O 快得多（尤其是 SSD 时代差距缩小）
```

### Index Scan

逐行通过索引定位数据，每次定位需要一次随机 I/O 到堆（Heap）取数据：

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;
-- Index Scan using idx_orders_user_id on orders
--   Index Cond: (user_id = 42)
--   (actual time=0.045..0.832 rows=150 loops=1)

-- Index Scan 适合：返回少量行（选择性高）
-- 代价 = 索引读取 + 行数 × 随机I/O
```

### Bitmap Scan

先用索引找到所有满足条件的行的物理位置，排序后批量读取数据页：

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id BETWEEN 100 AND 200;
-- Bitmap Heap Scan on orders
--   Recheck Cond: ((user_id >= 100) AND (user_id <= 200))
--   ->  Bitmap Index Scan on idx_orders_user_id
--         Index Cond: ((user_id >= 100) AND (user_id <= 200))

-- Bitmap Scan 分两步：
-- 1. Bitmap Index Scan：遍历索引，构建位图（页面号 → 匹配行的位图）
-- 2. Bitmap Heap Scan：按页面顺序批量读取（减少随机 I/O）

-- 如果位图放不进 work_mem，降级为 Lossy Bitmap（只有页面号，没有行位置）
-- 需要 Recheck 条件
```

### 选择策略总结

```
返回行数/总行数    推荐扫描方式
< 5%             Index Scan（索引选择性高）
5% ~ 25%         Bitmap Index Scan（减少随机 I/O）
25% ~ 100%       Seq Scan（全表扫描反而更快）
```

::: tip random_page_cost 的影响
`random_page_cost` 默认为 4.0（HDD 假设）。SSD 环境建议调低：

```sql
SET random_page_cost = 1.1;   -- SSD
SET effective_io_concurrency = 200;   -- SSD 可以承受更高并发
```

调低 `random_page_cost` 后，优化器更倾向于使用 Index Scan 而不是 Seq Scan。
:::

## Index-only Scan

Index-only Scan 直接从索引中获取查询所需的所有数据，不需要访问堆（Heap）。这是减少 I/O 的终极手段。

### 条件

```sql
-- Index-only Scan 需要两个条件：
-- 1. 查询涉及的所有列都包含在索引中（覆盖索引）
-- 2. 可见性映射（Visibility Map）中标记为全部可见的页面

-- 创建覆盖索引
CREATE INDEX idx_orders_covering ON orders (user_id) INCLUDE (amount, status);

-- 以下查询可以走 Index-only Scan
SELECT user_id, amount, status FROM orders WHERE user_id = 42;

-- EXPLAIN 输出
-- Index Only Scan using idx_orders_covering on orders
--   Index Cond: (user_id = 42)
--   Heap Fetches: 0   -- 关键指标：0 表示完全没有访问堆
```

### Visibility Map

Index-only Scan 依赖 Visibility Map（VM）来判断索引指向的堆页面是否所有行对所有事务可见：

```sql
-- 查看表的可见性映射统计
SELECT relname,
       n_live_tup,
       n_dead_tup,
       ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE relname = 'orders';

-- 如果 Heap Fetches 远大于 0，说明 VACUUM 跟不上
-- 运行 VACUUM 更新可见性映射
VACUUM orders;

-- 之后再次执行 Index-only Scan，Heap Fetches 应该大幅下降
```

::: tip 提升 Index-only Scan 命中率
定期运行 VACUUM（通过 autovacuum）保持可见性映射更新。如果 `Heap Fetches` 仍然很高，说明表上有很多更新操作，考虑增加 autovacuum 的频率。
:::

## VACUUM 对索引的影响

VACUUM 不仅清理堆中的 Dead Tuple，也会清理索引中的 Dead Entry：

```sql
-- VACUUM 的索引操作
-- 1. 扫描堆，收集 Dead Tuple 的 TID
-- 2. 遍历每个索引，删除指向 Dead TID 的条目
-- 3. 回收堆中 Dead Tuple 的空间

-- VACUUM 期间的 I/O 模式
-- 堆：顺序扫描 + 顺序写入
-- 索引：随机读写（每个索引独立处理）

-- 监控 VACUUM 对索引的影响
SELECT indexrelid::regclass AS index_name,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'orders';
```

## 索引膨胀

频繁的 UPDATE/DELETE 会产生 Dead Tuple，索引中的对应条目也需要清理。如果 VACUUM 跟不上，索引会膨胀。

### 检测索引膨胀

```sql
-- 方法 1：比较索引大小与理论大小
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS scans
FROM pg_stat_user_indexes
JOIN pg_index ON indexrelid = pg_stat_user_indexes.indexrelid
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 方法 2：B-Tree 索引统计
SELECT
    indexrelid::regclass AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    idx_scan,
    pg_stat_get_index_tuples_fetched(indexrelid) AS tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'orders';

-- 方法 3：使用 pgstattuple 扩展精确检测
CREATE EXTENSION pgstattuple;
SELECT * FROM pgstatindex('idx_orders_user_id');
-- 查看 leaf_fragmentation：碎片率 > 30% 需要重建
```

### 重建索引

```sql
-- REINDEX（PostgreSQL 12+ 支持 CONCURRENTLY）
REINDEX INDEX CONCURRENTLY idx_orders_user_id;    -- 不阻塞读写
REINDEX TABLE orders;                              -- 重建表上所有索引

-- 传统方式：创建新索引再删除旧索引
CREATE INDEX CONCURRENTLY idx_orders_user_id_new ON orders (user_id);
DROP INDEX idx_orders_user_id;
ALTER INDEX idx_orders_user_id_new RENAME TO idx_orders_user_id;

-- VACUUM FULL 重建整个表（会锁表，阻塞所有操作）
VACUUM FULL orders;

-- 使用 pg_repack 扩展在线重建表（不锁表）
-- pg_repack 需要单独安装
-- pg_repack -t orders -d mydb
```

::: warning CONCURRENTLY 的开销
`REINDEX CONCURRENTLY` 需要扫描表两次，比普通 REINDEX 慢约 2-3 倍。但它是生产环境重建索引的唯一安全选择。PostgreSQL 14+ 的 `REINDEX INDEX CONCURRENTLY` 比以前版本更高效。
:::

## 索引监控

```sql
-- 从未使用的索引（浪费空间）
SELECT
    indexrelid::regclass AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
      SELECT conindid FROM pg_constraint   -- 排除约束索引
  )
ORDER BY pg_relation_size(indexrelid) DESC;

-- 重复索引检测
SELECT
    a.indexrelid::regclass AS index_a,
    b.indexrelid::regclass AS index_b,
    pg_size_pretty(pg_relation_size(a.indexrelid)) AS size_a,
    pg_size_pretty(pg_relation_size(b.indexrelid)) AS size_b
FROM pg_index a
JOIN pg_index b ON a.indrelid = b.indrelid
    AND a.indexrelid < b.indexrelid
    AND a.indkey::text = b.indkey::text    -- 相同的列
    AND a.indpred IS NULL AND b.indpred IS NULL;

-- 索引使用频率排名
SELECT
    indexrelid::regclass AS index_name,
    relname AS table_name,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;
```

## 索引设计实践

### 选择性评估

```sql
-- 评估列的选择性（唯一值比例）
SELECT
    attname AS column_name,
    n_distinct,
    CASE WHEN n_distinct > 0
         THEN ROUND(1.0 / ABS(n_distinct), 6)
         ELSE 0 END AS selectivity
FROM pg_stats
WHERE tablename = 'orders'
ORDER BY n_distinct DESC;

-- n_distinct > 0：有 n_distinct 个不同值
-- n_distinct < 0：绝对值是比例（如 -0.5 表示 50% 的行有唯一值）
-- 值越接近 1.0 / 总行数，选择性越好
```

### 复合索引列顺序

```sql
-- 规则 1：等值查询列在前
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- 规则 2：范围查询列在后
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);

-- 规则 3：ORDER BY 列加入索引
SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10;
-- 索引 (user_id, created_at DESC) 可以直接输出有序结果

-- 规则 4：INCLUDE 用于覆盖更多列
CREATE INDEX idx_orders_cover ON orders (user_id)
INCLUDE (amount, status, created_at);
-- INCLUDE 的列不参与索引排序，只用于 Index-only Scan
-- 索引体积更小
```
