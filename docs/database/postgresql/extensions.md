# 扩展生态

PostgreSQL 的扩展机制是其最强大的特性之一。扩展可以添加新的数据类型、索引方法、函数、甚至存储引擎。理解扩展系统和常用扩展，是发挥 PostgreSQL 全部潜力的关键。

## 扩展管理

```sql
-- 安装扩展
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 查看可用扩展
SELECT * FROM pg_available_extensions ORDER BY name;

-- 查看已安装扩展
SELECT * FROM pg_extension;

-- 更新扩展
ALTER EXTENSION pg_stat_statements UPDATE;

-- 卸载扩展
DROP EXTENSION pg_stat_statements;

-- 扩展的依赖关系
SELECT e.extname, d.refobjid::regclass AS depends_on
FROM pg_depend d
JOIN pg_extension e ON d.objid = e.oid
WHERE d.deptype = 'e';
```

::: tip shared_preload_libraries
部分扩展需要在 `postgresql.conf` 中预加载，安装前需要修改配置并重启 PostgreSQL：

```ini
shared_preload_libraries = 'pg_stat_statements,pg_trgm'
```
:::

## PostGIS 空间查询

PostGIS 是最成功的 PostgreSQL 扩展，将 PostgreSQL 变为功能完整的空间数据库。

```sql
-- 安装
CREATE EXTENSION IF NOT EXISTS postgis;

-- 查看版本
SELECT PostGIS_Version();

-- 创建空间表
CREATE TABLE poi (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    geom GEOMETRY(Point, 4326),        -- WGS84 坐标系的点
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建空间索引
CREATE INDEX idx_poi_geom ON poi USING GIST (geom);

-- 插入空间数据
INSERT INTO poi (name, category, geom) VALUES
  ('北京大学', 'university', ST_SetSRID(ST_MakePoint(116.3104, 39.9926), 4326)),
  ('清华大学', 'university', ST_SetSRID(ST_MakePoint(116.3266, 40.0033), 4326)),
  ('中关村', 'business', ST_SetSRID(ST_MakePoint(116.3179, 39.9830), 4326)),
  ('天安门', 'landmark', ST_SetSRID(ST_MakePoint(116.3975, 39.9087), 4326));

-- 空间查询

-- 1. 距离查询：找到距离某个点 5 公里内的 POI
SELECT name, category,
       ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(116.3179, 39.9830), 4326)::geography) AS distance_m
FROM poi
WHERE ST_DWithin(
    geom::geography,
    ST_SetSRID(ST_MakePoint(116.3179, 39.9830), 4326)::geography,
    5000  -- 5 公里
)
ORDER BY distance_m;

-- 2. 包含查询：找到某个多边形内的点
SELECT * FROM poi
WHERE ST_Contains(
    ST_MakeEnvelope(116.2, 39.9, 116.4, 40.05, 4326),
    geom
);

-- 3. 最近邻查询（KNN）
SELECT name, geom <-> ST_SetSRID(ST_MakePoint(116.3179, 39.9830), 4326) AS distance
FROM poi
ORDER BY geom <-> ST_SetSRID(ST_MakePoint(116.3179, 39.9830), 4326)
LIMIT 5;

-- 4. 线和面的操作
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name TEXT,
    boundary GEOMETRY(MultiPolygon, 4326)
);

-- 面积计算（单位：平方米）
SELECT name, ST_Area(boundary::geography) AS area_sqm FROM districts;

-- 两个多边形的交集
SELECT ST_Intersection(a.boundary, b.boundary)
FROM districts a, districts b
WHERE a.id = 1 AND b.id = 2;
```

::: tip 距离计算的注意事项
`ST_Distance` 在几何类型上返回投影坐标系的单位（可能是度），需要转为 geography 类型才能得到米。`ST_DWithin` 在 geography 类型上直接支持米为单位的距离条件，且能走 GiST 索引。
:::

## pg_trgm 模糊搜索

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram 是三个连续字符的集合
SELECT show_trgm('hello');
-- {"  h"," he","ell","hel","llo","lo "}

-- 相似度
SELECT similarity('postgresql', 'postgre');  -- 0.625

-- 模糊搜索 + 索引
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE INDEX idx_products_trgm ON products USING GIN (name gin_trgm_ops);

-- 模糊搜索（带相似度阈值）
SET pg_trgm.similarity_threshold = 0.3;
SELECT * FROM products WHERE name % 'postgrs';

-- LIKE 优化（前缀通配也走索引）
SELECT * FROM products WHERE name ILIKE '%database%';

-- 相似度排序
SELECT name, similarity(name, 'postgrs') AS score
FROM products
WHERE name % 'postgrs'
ORDER BY score DESC
LIMIT 10;
```

## pg_stat_statements 性能分析

pg_stat_statements 记录所有 SQL 语句的执行统计，是性能分析的必备工具。

```sql
-- 需要在 postgresql.conf 中预加载
-- shared_preload_libraries = 'pg_stat_statements'

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 耗时最多的查询 Top 10
SELECT
    LEFT(query, 80) AS short_query,
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
    rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 平均耗时最高的查询
SELECT
    LEFT(query, 80) AS short_query,
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER ())::numeric, 2) AS pct
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 读取/写入最多的查询
SELECT
    LEFT(query, 80) AS short_query,
    calls,
    shared_blks_hit + shared_blks_read AS total_blks,
    shared_blks_hit AS cache_hit,
    ROUND(shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0) * 100, 2) AS hit_ratio
FROM pg_stat_statements
ORDER BY total_blks DESC
LIMIT 10;

-- 重置统计
SELECT pg_stat_statements_reset();
```

::: tip 缓存命中率
`hit_ratio` 应该接近 99%。如果低于 95%，可能需要增加 `shared_buffers` 或检查是否有全表扫描问题。
:::

## pgcrypto 加密

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 密码哈希（推荐使用 bcrypt）
INSERT INTO users (name, password_hash) VALUES
  ('alice', crypt('mypassword', gen_salt('bf', 12)));
-- bf = bcrypt, 12 = 工作因子

-- 验证密码
SELECT (password_hash = crypt('mypassword', password_hash)) AS is_valid
FROM users WHERE name = 'alice';

-- AES 加密/解密
SELECT pgp_sym_encrypt('secret data', 'my_key');
SELECT pgp_sym_decrypt(pgp_sym_encrypt('secret data', 'my_key'), 'my_key');

-- 生成随机值
SELECT gen_random_uuid();            -- UUID v4
SELECT gen_random_bytes(16);         -- 16 字节随机值
SELECT encode(gen_random_bytes(16), 'hex');  -- Hex 编码
```

## 其他实用扩展

```sql
-- pg_cron：定时任务调度
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup', '0 3 * * *', 'DELETE FROM logs WHERE created_at < NOW() - INTERVAL ''90 days''');

-- auto_explain：自动记录慢查询计划
-- postgresql.conf:
-- shared_preload_libraries = 'auto_explain'
-- auto_explain.log_min_duration = 1000
-- auto_explain.log_analyze = on

-- pg_partman：分区管理自动化
CREATE EXTENSION IF NOT EXISTS pg_partman;
-- 自动创建分区、清理旧分区

-- dblink / postgres_fdw：跨库/跨服务器查询
CREATE EXTENSION IF NOT EXISTS postgres_fdw;
CREATE SERVER remote_db FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'remote-host', dbname 'other_db');
CREATE USER MAPPING FOR current_user SERVER remote_db
OPTIONS (user 'remote_user', password 'password');

-- hstore：键值对存储
CREATE EXTENSION IF NOT EXISTS hstore;
SELECT 'a => 1, b => 2'::hstore -> 'a';  -- "1"

-- pg_trgm：模糊搜索（前面已介绍）

-- uuid-ossp：UUID 生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();

-- pgrowlocks：行锁监控
CREATE EXTENSION IF NOT EXISTS pgrowlocks;
SELECT * FROM pgrowlocks('orders');

-- tablefunc：交叉表/行列转换
CREATE EXTENSION IF NOT EXISTS tablefunc;
SELECT * FROM crosstab(
    'SELECT category, month, total FROM monthly_sales ORDER BY 1,2',
    'SELECT DISTINCT month FROM monthly_sales ORDER BY 1'
) AS ct(category TEXT, jan NUMERIC, feb NUMERIC, mar NUMERIC);
```
