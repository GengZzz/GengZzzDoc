# 慢查询分析

慢查询是数据库性能优化的切入点。通过开启慢查询日志、使用分析工具定位问题 SQL，再结合 EXPLAIN 进行针对性优化，是 DBA 和开发人员必备的技能。

## 开启慢查询日志

```sql
-- 查看慢查询日志状态
SHOW VARIABLES LIKE 'slow_query_log';
-- +----------------+-------+
-- | Variable_name  | Value |
-- +----------------+-------+
-- | slow_query_log | OFF   |  -- 默认关闭
-- +----------------+-------+

-- 查看慢查询阈值（默认 10 秒）
SHOW VARIABLES LIKE 'long_query_time';
-- +-----------------+-----------+
-- | Variable_name   | Value     |
-- +-----------------+-----------+
-- | long_query_time | 10.000000 |
-- +-----------------+-----------+

-- 查看日志文件路径
SHOW VARIABLES LIKE 'slow_query_log_file';
-- +---------------------+-----------------------------------+
-- | Variable_name       | Value                             |
-- +---------------------+-----------------------------------+
-- | slow_query_log_file | /var/lib/mysql/hostname-slow.log  |
-- +---------------------+-----------------------------------+
```

### 临时开启（当前会话重启后失效）

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';

-- 设置阈值为 1 秒
SET GLOBAL long_query_time = 1;

-- 也记录没有使用索引的查询
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- 设置阈值（对当前会话立即生效）
SET long_query_time = 1;
```

### 永久开启（my.cnf 配置文件）

```ini
[mysqld]
# 开启慢查询日志
slow_query_log = 1

# 日志文件路径
slow_query_log_file = /var/log/mysql/slow.log

# 慢查询阈值（秒）
long_query_time = 1

# 记录未使用索引的查询
log_queries_not_using_indexes = 1

# 限制未使用索引查询的最小扫描行数（避免记录太多小查询）
min_examined_row_limit = 1000
```

::: tip 生产环境建议
- `long_query_time` 设置为 1 秒（大多数业务场景下超过 1 秒的查询都需要关注）
- 开启 `log_queries_not_using_indexes` 可以发现遗漏的索引问题
- 配合 `min_examined_row_limit` 过滤掉扫描行数少的查询，减少日志量
- 定期清理慢查询日志文件，避免磁盘空间耗尽
:::

## 慢查询日志格式和内容

```
# Time: 2026-05-04T10:30:15.123456Z
# User@Host: root[root] @ localhost []  Id:    42
# Query_time: 5.234567  Lock_time: 0.000123 Rows_sent: 100  Rows_examined: 1000000
SET timestamp=1714820215;
SELECT u.id, u.name, o.order_no, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 1
  AND o.created_at > '2026-01-01'
ORDER BY o.amount DESC;
```

日志字段说明：

| 字段 | 说明 |
|------|------|
| `Time` | 查询执行的时间 |
| `User@Host` | 执行查询的用户和来源主机 |
| `Id` | 连接 ID |
| `Query_time` | 查询执行总耗时（秒） |
| `Lock_time` | 等待锁的时间（秒） |
| `Rows_sent` | 返回给客户端的行数 |
| `Rows_examined` | 扫描的总行数 |
| `timestamp` | Unix 时间戳 |
| 后续内容 | 实际的 SQL 语句 |

::: tip 关注 Rows_examined
`Rows_examined / Rows_sent` 的比值越大，说明查询效率越低。如果一条查询返回 10 行但扫描了 100 万行，说明索引使用不合理。
:::

## mysqldumpslow 分析工具

MySQL 自带的慢查询日志分析工具，用于汇总和排序慢查询。

```bash
# 按查询次数排序，显示前 10 条
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# 按平均查询时间排序
mysqldumpslow -s at -t 10 /var/log/mysql/slow.log

# 按返回行数排序
mysqldumpslow -s r -t 10 /var/log/mysql/slow.log

# 按锁定时间排序
mysqldumpslow -s l -t 10 /var/log/mysql/slow.log

# 只看包含特定表的慢查询
mysqldumpslow -g 'orders' -t 10 /var/log/mysql/slow.log

# 详细模式（显示每条 SQL 的执行计划）
mysqldumpslow -v -s c -t 10 /var/log/mysql/slow.log
```

排序参数：

| 参数 | 含义 |
|------|------|
| `-s c` | 按查询次数（count）排序 |
| `-s t` | 按查询时间（time）排序 |
| `-s l` | 按锁定时间（lock）排序 |
| `-s r` | 按返回行数（rows）排序 |
| `-s at` | 按平均查询时间排序 |

输出示例：

```
Count: 156  Time=3.21s (500s)  Lock=0.00s (0s)  Rows=100.0 (15600), root[root]@localhost
  SELECT u.id, u.name, o.order_no, o.amount
  FROM users u
  JOIN orders o ON u.id = o.user_id
  WHERE u.status = N AND o.created_at > 'S'
  ORDER BY o.amount DESC

Count: 89  Time=5.67s (504s)  Lock=0.01s (1s)  Rows=1.0 (89), root[root]@localhost
  SELECT * FROM products WHERE category_id = N AND price BETWEEN N AND N
```

::: tip
mysqldumpslow 会将 SQL 中的数字和字符串替换为 `N` 和 `S` 进行归类，方便统计相同模式的慢查询。
:::

## pt-query-digest（Percona Toolkit）

pt-query-digest 是 Percona Toolkit 中最强大的慢查询分析工具，功能远超 mysqldumpslow。

### 安装

```bash
# Ubuntu/Debian
apt-get install percona-toolkit

# CentOS/RHEL
yum install percona-toolkit

# 或通过 CPAN 安装
cpan install Percona::Toolkit
```

### 基本使用

```bash
# 分析慢查询日志，生成报告
pt-query-digest /var/log/mysql/slow.log > /tmp/slow_report.txt

# 分析最近 24 小时的慢查询
pt-query-digest --since 24h /var/log/mysql/slow.log

# 分析指定时间范围的慢查询
pt-query-digest --since '2026-05-03 00:00:00' --until '2026-05-04 00:00:00' /var/log/mysql/slow.log

# 只看前 5 条最慢的查询
pt-query-digest --limit 5 /var/log/mysql/slow.log

# 从 processlist 实时分析
pt-query-digest --processlist h=localhost,u=root,p=password

# 分析 binlog（需要先转换为文本格式）
mysqlbinlog mysql-bin.000123 | pt-query-digest --type binlog

# 分析 general log
pt-query-digest --type genlog /var/log/mysql/general.log
```

### 报告解读

pt-query-digest 的输出分为三部分：

**第一部分：总体统计**

```
# Overall: 500 total, 15 unique, 0.00 QPS, 0.00x concurrency ________
# Time range: 2026-05-04T08:00:00 to 2026-05-04T12:00:00
# Attribute          total     min     max     avg     95%  stddev  median
# ============     ======= ======= ======= ======= ======= ======= =======
# Exec time         1200s   0.5s    30.0s   2.4s    8.0s    3.2s    1.8s
# Lock time           5s   0.001s   1.0s   0.01s   0.05s   0.08s   0.005s
# Rows sent       50,000       1   5,000     100   1,000     500     200
# Rows examine  10,000,000    100  500,000  20,000 100,000  50,000  15,000
```

**第二部分：各查询的详细分析**

```
# Query 1: 0.50 QPS, 1.20x concurrency, ID 0x1234ABCD at byte 500
# Scores: V/M = 2.50
# Time range: 2026-05-04T08:00:00 to 2026-05-04T12:00:00
# Attribute    pct   total     min     max     avg     95%  stddev  median
# ============ === ======= ======= ======= ======= ======= ======= =======
# Count         30     150
# Exec time     45    540s   1.0s    20.0s   3.6s   10.0s    4.0s    2.5s
# Lock time     20      1s   0.001s  0.05s   0.007s  0.02s   0.01s   0.005s
# Rows sent     15   7,500       1     200      50     150      40      50
# Rows examine  40 4,000,000  1,000  100,000  26,667  80,000 30,000  20,000
# Query size    10   5.00K     34      34      34      34       0      34

# EXPLAIN
SELECT u.id, u.name, o.order_no, o.amount FROM users u JOIN orders o ON u.id = o.user_id WHERE u.status=1 AND o.created_at > '2026-01-01' ORDER BY o.amount DESC\G
```

**第三部分：优化建议**

::: tip pt-query-digest vs mysqldumpslow
- pt-query-digest 的分析报告更详细，包含 95 分位数、标准差等统计指标
- 可以按多种维度排序（Query_time、Lock_time、Rows_examined 等）
- 支持多种数据源（慢查询日志、processlist、binlog）
- 输出格式更适合分享和归档
:::

## 常见慢查询原因

### 1. 没有索引或索引失效

```sql
-- 没有索引：全表扫描
EXPLAIN SELECT * FROM orders WHERE user_id = 100;
-- user_id 没有索引 → type = ALL → rows = 1000000

-- 索引失效：对索引列做运算
EXPLAIN SELECT * FROM orders WHERE YEAR(created_at) = 2026;
-- 对 created_at 使用 YEAR() 函数 → 索引失效 → type = ALL

-- 优化：改为范围查询
EXPLAIN SELECT * FROM orders
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
-- type = range → 使用索引
```

### 2. 数据量过大

```sql
-- 查询返回大量数据
SELECT * FROM orders WHERE created_at > '2020-01-01';
-- 返回 500 万行 → 即使有索引也很慢

-- 优化：分页 + 只查需要的列
SELECT id, order_no, amount FROM orders
WHERE created_at > '2020-01-01'
ORDER BY id LIMIT 1000;
```

### 3. 返回数据量过多

```sql
-- SELECT * 返回所有列
SELECT * FROM users WHERE status = 1;
-- 用户表有 TEXT 列，每行 5KB，返回 10 万行 = 500MB 数据

-- 优化：只查需要的列
SELECT id, name, email FROM users WHERE status = 1;
-- 每行 200 bytes，减少 96% 的数据传输
```

### 4. 锁等待

```sql
-- 查看锁等待情况
SHOW ENGINE INNODB STATUS\G

-- 查看当前锁等待
SELECT * FROM performance_schema.data_lock_waits;

-- 查看正在等待锁的事务
SELECT trx_id, trx_state, trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS wait_sec,
       trx_rows_locked, trx_mysql_thread_id, trx_query
FROM information_schema.INNODB_TRX
WHERE trx_state = 'LOCK WAIT';
```

### 5. 服务器资源不足

```sql
-- 查看 Buffer Pool 命中率
SHOW STATUS LIKE 'Innodb_buffer_pool_read%';
-- Innodb_buffer_pool_read_requests: 逻辑读（内存）
-- Innodb_buffer_pool_reads: 物理读（磁盘）
-- 命中率 = 1 - (reads / read_requests)
-- 低于 99% 说明 Buffer Pool 太小

-- 查看连接数使用情况
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';
-- 接近 max_connections 说明连接池可能需要优化
```

## 优化思路：从 EXPLAIN 入手

拿到一条慢查询后，按照以下步骤分析 EXPLAIN 输出：

```
1. 看 type：
   └─ 是否为 ALL（全表扫描）→ 考虑添加索引
   └─ 是否为 index（全索引扫描）→ 检查是否有更好的索引

2. 看 key：
   └─ 是否为 NULL（没有使用索引）→ 添加索引
   └─ 是否使用了预期的索引 → 检查 possible_keys

3. 看 rows：
   └─ 扫描行数是否远大于返回行数 → 索引区分度不够

4. 看 key_len：
   └─ 联合索引是否只用了部分列 → 调整查询条件或索引顺序

5. 看 Extra：
   └─ Using filesort → 添加排序相关索引
   └─ Using temporary → 检查 GROUP BY/ DISTINCT
   └─ Using join buffer → 被驱动表关联字段加索引
   └─ Using where → 条件是否可以被索引覆盖
   └─ Using index → 很好，覆盖索引
```

## 实际案例：分析一条 10 秒慢查询的优化过程

### 原始查询

```sql
SELECT o.id, o.order_no, o.amount, o.created_at,
       u.name AS user_name, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 1
  AND o.created_at BETWEEN '2026-01-01' AND '2026-04-30'
  AND u.status = 1
ORDER BY o.created_at DESC
LIMIT 100;
```

执行时间：10.23 秒。

### 第一步：EXPLAIN 分析

```sql
EXPLAIN SELECT o.id, o.order_no, o.amount, o.created_at,
       u.name AS user_name, u.email
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 1
  AND o.created_at BETWEEN '2026-01-01' AND '2026-04-30'
  AND u.status = 1
ORDER BY o.created_at DESC
LIMIT 100;
```

```
+----+-------------+-------+-------+---------------------+-------------+---------+------+--------+----------------------------------------------+
| id | select_type | table | type  | possible_keys       | key         | key_len | ref  | rows   | Extra                                        |
+----+-------------+-------+-------+---------------------+-------------+---------+------+--------+----------------------------------------------+
|  1 | SIMPLE      | o     | range | idx_created_at      | idx_created_at| 5      | NULL | 500000 | Using where; Using temporary; Using filesort |
|  1 | SIMPLE      | u     | ALL   | PRIMARY             | NULL        | NULL    | NULL | 200000 | Using where; Using join buffer               |
+----+-------------+-------+-------+---------------------+-------------+---------+------+--------+----------------------------------------------+
```

问题发现：

1. **u 表 type = ALL**：全表扫描，没有使用索引关联
2. **Extra 中有 Using temporary 和 Using filesort**：需要临时表和额外排序
3. **Extra 中有 Using join buffer**：被驱动表没有索引

### 第二步：问题分析

u 表没有使用索引的原因：`o.user_id = u.id` 关联时，u 表应该走主键索引（eq_ref），但 EXPLAIN 显示 type = ALL。这可能是因为：

- 统计信息不准确
- 数据类型不匹配（JOIN 时的隐式类型转换）

检查表结构：

```sql
SHOW CREATE TABLE orders;
-- user_id 是 INT

SHOW CREATE TABLE users;
-- id 是 BIGINT ！！！类型不匹配！
```

::: danger 隐式类型转换导致索引失效
`orders.user_id` 是 INT，`users.id` 是 BIGINT。JOIN 时 MySQL 需要做隐式类型转换，导致 u 表的主键索引失效。
:::

### 第三步：修复

```sql
-- 方案 A：修改 orders.user_id 的类型（推荐，根治）
ALTER TABLE orders MODIFY user_id BIGINT NOT NULL;

-- 方案 B：在查询中显式转换（临时方案）
-- 不推荐，因为 CAST 也会导致索引失效
```

修复后再次 EXPLAIN：

```
+----+-------------+-------+-------+---------------------+---------------------+---------+-------------------+--------+----------------------------------------------+
| id | select_type | table | type  | possible_keys       | key                 | key_len | ref               | rows   | Extra                                        |
+----+-------------+-------+-------+---------------------+---------------------+---------+-------------------+--------+----------------------------------------------+
|  1 | SIMPLE      | o     | range | idx_created_at      | idx_created_at      | 5       | NULL              | 500000 | Using where; Using temporary; Using filesort |
|  1 | SIMPLE      | u     | eq_ref| PRIMARY             | PRIMARY             | 8       | test.o.user_id    |      1 | Using where                                  |
+----+-------------+-------+-------+---------------------+---------------------+---------+-------------------+--------+----------------------------------------------+
```

u 表已经变成 eq_ref，但仍有 Using temporary 和 Using filesort。

### 第四步：优化排序

添加联合索引，覆盖 WHERE 和 ORDER BY：

```sql
-- 为 orders 表添加联合索引
ALTER TABLE orders ADD INDEX idx_status_created(status, created_at);
```

再次 EXPLAIN：

```
+----+-------------+-------+-------+----------------------------------+-----------------------------+---------+-------------------+------+-------------+
| id | select_type | table | type  | possible_keys                    | key                         | key_len | ref               | rows | Extra       |
+----+-------------+-------+-------+----------------------------------+-----------------------------+---------+-------------------+------+-------------+
|  1 | SIMPLE      | o     | range | idx_status_created               | idx_status_created          | 9       | NULL              | 80000| Using where |
|  1 | SIMPLE      | u     | eq_ref| PRIMARY                          | PRIMARY                     | 8       | test.o.user_id    |    1 | Using where |
+----+-------------+-------+-------+----------------------------------+-----------------------------+---------+-------------------+------+-------------+
```

Using temporary 和 Using filesort 消失了！

### 最终结果

```
优化前：10.23 秒
优化后：0.05 秒
提升：204 倍
```

优化措施总结：

1. 修复 `orders.user_id` 的数据类型（INT → BIGINT），消除隐式类型转换
2. 添加联合索引 `idx_status_created(status, created_at)`，消除排序和临时表
3. 确保 `users.id` 作为主键被 JOIN 使用

::: tip 慢查询优化的一般流程
1. 开启慢查询日志，定位问题 SQL
2. 使用 pt-query-digest 分析，找出频率高或耗时长的查询
3. 对问题 SQL 执行 EXPLAIN，分析执行计划
4. 优先解决 type = ALL 和 key = NULL 的问题（添加索引）
5. 消除 Using filesort 和 Using temporary（优化索引覆盖）
6. 检查数据类型一致性（避免隐式转换）
7. 考虑改写查询（子查询改 JOIN、OR 改 UNION 等）
:::
