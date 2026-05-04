# 索引类型

PostgreSQL 支持的索引类型远不止 B-Tree。每种索引方法针对特定的数据结构和查询模式进行了优化，理解它们的适用场景是性能调优的关键。

## B-Tree 索引

B-Tree 是默认索引类型，适用于等值查询、范围查询、排序。PostgreSQL 的 B-Tree 实现支持多列索引、唯一约束、NULL 值处理。

```sql
-- 默认创建的就是 B-Tree
CREATE INDEX idx_orders_user_id ON orders (user_id);

-- 多列 B-Tree
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at DESC);

-- 唯一索引
CREATE UNIQUE INDEX idx_users_email ON users (email);

-- NULL 排序控制
CREATE INDEX idx_orders_nullable ON orders (user_id NULLS LAST);
SELECT * FROM orders ORDER BY user_id NULLS LAST;  -- 可以走索引
```

B-Tree 的适用场景：

- `=`、`<`、`<=`、`>`、`>=`、`BETWEEN`、`IN`
- `ORDER BY`、`IS NULL` / `IS NOT NULL`（PostgreSQL 11+）
- `LIKE 'prefix%'` 前缀匹配（不支持 `%keyword%`）
- 索引支持降序、NULLS FIRST/LAST

## Hash 索引

Hash 索引只支持等值查询，不能用于范围查询或排序。PostgreSQL 10+ 之后 Hash 索引才真正可用于生产环境（之前 WAL 不记录 Hash 索引变更）。

```sql
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);

-- 只有等值查询能走 Hash 索引
SELECT * FROM sessions WHERE token = 'abc123';    -- 走 Hash 索引
SELECT * FROM sessions WHERE token > 'abc';       -- 不走 Hash 索引
```

::: tip Hash 索引的适用场景
等值查询为主、键值很长（Hash 索引比 B-Tree 索引体积更小）、不需要范围查询。实际中 B-Tree 几乎总是足够好，Hash 索引的使用场景较少。
:::

## GiST 索引

GiST（Generalized Search Tree）是一个框架，支持多种数据类型和查询操作的自定义索引策略。

```sql
-- 几何类型：范围包含、交集查询
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name TEXT,
    area BOX                      -- 矩形区域
);
CREATE INDEX idx_locations_area ON locations USING GIST (area);

SELECT * FROM locations WHERE area && BOX '((0,0),(10,10))';  -- 是否重叠
SELECT * FROM locations WHERE area @> POINT '(5,5)';          -- 是否包含点

-- 范围类型
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    room_id INTEGER,
    during TSRANGE
);
CREATE INDEX idx_reservations_during ON reservations USING GIST (during);

SELECT * FROM reservations
WHERE during && '[2024-01-15, 2024-01-20)'::tsrange;  -- 范围重叠

-- 全文搜索（比 GIN 慢但构建更快）
CREATE INDEX idx_fts_gist ON articles USING GIST (search_vector);

-- 排除约束（EXCLUDE）
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER,
    during TSRANGE,
    EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);
-- 同一房间不允许时间重叠的会议
```

GiST 的适用场景：

- 几何数据（点、线、面、包含、相交）
- 范围类型（daterange、tsrange 等）
- 全文搜索（构建快，适合频繁更新）
- 排除约束（EXCLUDE）
- 最近邻搜索（KNN，使用 `<->` 距离运算符）

## SP-GiST 索引

SP-GiST（Space-Partitioned Generalized Search Tree）适用于非平衡的、可递归划分的数据结构。

```sql
-- 适合点类型（四叉树）
CREATE INDEX idx_points ON points USING SPGIST (point_column);

-- 适合范围类型（当范围值的分布不均匀时）
CREATE INDEX idx_ranges ON events USING SPGIST (duration_range);

-- 适合前缀树（文本前缀搜索）
CREATE INDEX idx_text_prefix ON documents USING SPGIST (title);
SELECT * FROM documents WHERE title ^@ 'Postgre';  -- ^@ 是前缀运算符
```

SP-GiST vs GiST：

- SP-GiST 更适合高度非均匀分布的数据（如 IP 地址、文件路径）
- SP-GiST 不支持多列索引
- GiST 更通用，SP-GiST 更专精

## GIN 索引

GIN（Generalized Inverted Index）是倒排索引，适合一个值包含多个元素的场景。

```sql
-- 全文搜索
CREATE INDEX idx_fts ON articles USING GIN (search_vector);

-- JSONB
CREATE INDEX idx_jsonb ON api_cache USING GIN (response);
-- 支持 @>, ?, ?|, ?& 运算符

-- JSONB 路径操作（只支持 @>，但更紧凑）
CREATE INDEX idx_jsonb_path ON api_cache USING GIN (response jsonb_path_ops);

-- 数组
CREATE INDEX idx_tags ON articles USING GIN (tags);
SELECT * FROM articles WHERE tags @> ARRAY['database'];  -- 包含查询

-- 多列 GIN（不同列用不同运算符类）
CREATE INDEX idx_multi_gin ON items USING GIN (tags, properties);
```

GIN 的适用场景：

- 全文搜索（tsvector）
- JSONB 查询（@>, ?）
- 数组包含查询（@>, &&）
- pg_trgm 模糊搜索（gin_trgm_ops）

::: warning GIN 的缺点
GIN 索引的更新成本很高。每次 INSERT/UPDATE 都需要更新倒排索引中的多个条目。对于高频写入的表，考虑使用 `fastupdate = on`（默认开启）来延迟更新，但会增加查询时的扫描范围。
:::

```sql
-- 关闭 fastupdate 以降低查询延迟（但写入变慢）
CREATE INDEX idx_tags_nofast ON articles USING GIN (tags) WITH (fastupdate = off);
```

## BRIN 索引

BRIN（Block Range Index）是最小的索引类型，存储每个物理块范围内的最小/最大值。适合数据与物理存储顺序相关的列。

```sql
-- 时序数据：created_at 自然递增
CREATE TABLE logs (
    id BIGSERIAL,
    level TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
) WITH (autovacuum_enabled = true);

-- BRIN 索引：极小的体积（通常几 KB 到几 MB）
CREATE INDEX idx_logs_created_brin ON logs USING BRIN (created_at);

-- 每 128 个页面记录 min/max（默认）
CREATE INDEX idx_logs_created_brin ON logs
  USING BRIN (created_at) WITH (pages_per_range = 32);

-- 查询时，BRIN 会跳过不包含目标时间范围的块
SELECT * FROM logs WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
```

BRIN vs B-Tree 对比：

```sql
-- 假设 logs 表有 1000 万行
-- B-Tree 索引：~214 MB
-- BRIN 索引（pages_per_range=128）：~2 MB

-- 查询 '2024-01-01' 一天的数据（约 2.7 万行）
-- B-Tree：Index Scan，精确跳转
-- BRIN：Bitmap Index Scan + Bitmap Heap Scan，跳过大部分块
```

::: tip BRIN 的适用条件
BRIN 的前提是数据的物理存储顺序与索引列的逻辑顺序强相关。典型场景：时间序列数据（INSERT 时间即 created_at）、地理数据（按区域批量导入）。如果数据是随机插入的（如 UUID 主键），BRIN 无效。
:::

## Partial Index

部分索引只为满足条件的行创建索引：

```sql
-- 只索引未完成的订单（假设 95% 的订单已完结）
CREATE INDEX idx_orders_pending ON orders (user_id, created_at)
WHERE status = 'pending';

-- 只索引非空 email
CREATE INDEX idx_users_email ON users (email)
WHERE email IS NOT NULL;

-- 查询必须匹配 WHERE 条件才能走索引
SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';   -- 走索引
SELECT * FROM orders WHERE user_id = 1;                           -- 不走索引
```

Partial Index 的价值：

- 索引体积大幅缩小（只索引少量热数据）
- 写入开销降低（INSERT 不满足条件时不更新索引）
- 经典场景：软删除数据的查询（`WHERE deleted_at IS NULL`）、状态筛选

## Expression Index

表达式索引对函数或表达式的结果创建索引：

```sql
-- 不区分大小写的搜索
CREATE INDEX idx_users_lower_email ON users (LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- 日期截断索引
CREATE INDEX idx_orders_date ON orders (DATE(created_at));
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-15';

-- JSONB 字段索引
CREATE INDEX idx_products_brand ON products ((attrs ->> 'brand'));
SELECT * FROM products WHERE attrs ->> 'brand' = 'Apple';

-- 复杂表达式
CREATE INDEX idx_users_fullname ON users ((first_name || ' ' || last_name));
SELECT * FROM users WHERE first_name || ' ' || last_name = 'Alice Smith';
```

::: warning 表达式索引的匹配条件
查询中的表达式必须与索引定义完全一致（包括函数名大小写）。`LOWER(email)` 的索引不能加速 `lower(email)`（PostgreSQL 默认将函数名转小写，所以实际上是一致的）。但自定义函数可能有区别。
:::

## 多列索引

```sql
-- 多列 B-Tree 索引遵循最左前缀规则
CREATE INDEX idx_composite ON orders (user_id, status, created_at DESC);

-- 能走索引
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';
SELECT * FROM orders WHERE user_id = 1 AND status = 'pending ORDER BY created_at DESC';

-- 不能走索引（跳过了 status）
SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01';
-- PostgreSQL 可以部分使用索引（Bitmap Index Scan on user_id）
```

::: tip PostgreSQL 多列索引 vs MySQL
PostgreSQL 的多列 B-Tree 索引和 MySQL InnoDB 一样遵循最左前缀。但 PostgreSQL 支持不同列指定不同排序方向（`ASC`/`DESC`），这在 MySQL 中需要通过索引实现。
:::
