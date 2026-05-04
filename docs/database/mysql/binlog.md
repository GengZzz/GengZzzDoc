# Binlog 深度解析

## Binlog 的作用

Binlog（二进制日志）是 MySQL Server 层的日志，承担两个核心职责：

1. **归档与恢复**：通过重放 binlog 可以将数据库恢复到任意时间点（Point-in-Time Recovery, PITR）
2. **主从复制**：Master 将 binlog 发送给 Slave，Slave 重放以保持数据同步

```sql
-- 查看 binlog 是否开启
SHOW VARIABLES LIKE 'log_bin';
-- ON 表示已开启

-- 查看 binlog 文件列表
SHOW BINARY LOGS;

-- 查看当前正在写入的 binlog 文件和位置
SHOW MASTER STATUS;

-- 手动切换 binlog 文件（产生新的 binlog 文件）
FLUSH LOGS;
```

## Binlog vs Redo Log

| 维度 | Binlog | Redo Log |
|------|--------|----------|
| **层级** | MySQL Server 层 | InnoDB 存储引擎层 |
| **作用** | 归档 + 主从复制 | 崩溃恢复（Crash Recovery） |
| **日志类型** | 逻辑日志（SQL 语句或行变更） | 物理日志（页的修改） |
| **写入方式** | 追加写（写满后新建文件） | 循环写（固定大小，覆盖旧数据） |
| **内容范围** | 所有存储引擎的修改 | 仅 InnoDB 引擎的修改 |
| **是否必需** | 可关闭（但不推荐） | 不可关闭（InnoDB 核心组件） |
| **持久化控制** | `sync_binlog` | `innodb_flush_log_at_trx_commit` |

```sql
-- 查看 binlog 相关文件
SHOW VARIABLES LIKE 'log_bin_basename';
-- 例如：/var/lib/mysql/binlog
-- 实际文件：binlog.000001, binlog.000002, ...

-- 查看当前写入位置
SHOW MASTER STATUS\G
-- File: binlog.000005
-- Position: 123456
-- Binlog_Do_DB: (空表示记录所有库)
-- Binlog_Ignore_DB:
```

## Binlog 格式

### STATEMENT 格式

记录执行的 SQL 语句本身。

```sql
SET GLOBAL binlog_format = 'STATEMENT';

-- binlog 中记录的内容：
-- INSERT INTO users (name, age) VALUES ('Alice', 25);
```

优点：
- 日志量小（一条 SQL 只记录一次）
- 不管修改了多少行，日志体积固定

缺点：
- **不确定性问题**：某些函数在主从上可能产生不同结果

```sql
-- 以下 SQL 在 STATEMENT 格式下会导致主从不一致：

-- 1. NOW() / SYSDATE()
INSERT INTO logs (msg, created_at) VALUES ('test', NOW());
-- NOW() 在主库和从库执行时间不同

-- 2. UUID()
INSERT INTO sessions (session_id) VALUES (UUID());
-- UUID() 在主从上产生不同值

-- 3. LIMIT 不带 ORDER BY
UPDATE users SET status = 'active' LIMIT 10;
-- 主从可能选择不同的 10 行

-- 4. 使用用户变量
SET @row_num = 0;
UPDATE users SET @row_num := @row_num + 1, rank = @row_num;
-- 用户变量在从库可能有不同初始值
```

### ROW 格式

记录每一行数据的变更（前像和后像）。

```sql
SET GLOBAL binlog_format = 'ROW';

-- binlog 中记录的内容：
-- UPDATE users SET name = 'Bob' WHERE id = 1;
-- 记录为：
-- Table_map: users
-- Update_rows: id=1 (before: name='Alice') → (after: name='Bob')
```

优点：
- **最安全**：主从数据绝对一致
- 不存在函数不确定性问题
- 可以精确知道每行的变更内容

缺点：
- 日志量大（尤其是批量 UPDATE/DELETE）
- 不能直接看到 SQL 语句

```sql
-- 批量修改时 ROW 格式的日志量
UPDATE users SET status = 'inactive' WHERE last_login < '2025-01-01';
-- 假设匹配 10 万行
-- STATEMENT: 记录一条 SQL（几十字节）
-- ROW: 记录 10 万行的变更（巨大）
```

### MIXED 格式

默认使用 STATEMENT，当遇到不安全的操作时自动切换为 ROW。

```sql
SET GLOBAL binlog_format = 'MIXED';

-- 自动切换为 ROW 的场景：
-- 1. UUID()
-- 2. USER()
-- 3. CURRENT_USER()
-- 4. LOAD_FILE()
-- 5. 使用了 AUTO_INCREMENT 且有触发器
-- 6. 使用了系统变量 @@timestamp
```

::: tip 推荐使用 ROW 格式
MySQL 8.0 默认使用 ROW 格式。ROW 格式虽然日志量大，但保证了主从数据的一致性，是生产环境的最佳实践。配合 `binlog_row_image = MINIMAL`（只记录变更列的前像和主键）可以减少日志量。

```sql
-- 减少 ROW 格式日志量的参数
SHOW VARIABLES LIKE 'binlog_row_image';
-- FULL（默认）：记录所有列的前像和后像
-- MINIMAL：只记录变更列的前像 + 后像，以及定位行所需的列（主键/唯一键）
-- NOBLOB：不记录 BLOB 列
```
:::

## Binlog 写入流程

```
事务执行过程中：
┌──────────────────────────────────────────────────┐
│                   事务线程                         │
│                                                  │
│  1. 执行 SQL，生成 binlog 事件                    │
│  2. 写入 binlog cache（内存）                     │
│  3. 事务提交：                                    │
│     a. binlog cache → binlog file（追加写入）     │
│     b. 根据 sync_binlog 决定是否 fsync            │
│                                                  │
└──────────────────────────────────────────────────┘
```

```sql
-- binlog cache 相关参数
SHOW VARIABLES LIKE 'binlog_cache_size';
-- 默认 32KB
-- 每个事务线程独立的 binlog 缓存
-- 如果事务产生的 binlog 超过该大小，使用临时文件

SHOW VARIABLES LIKE 'max_binlog_cache_size';
-- 默认 1GB
-- 事务 binlog 的最大大小（包括 cache 和临时文件）
-- 超过该值事务会被回滚

-- 监控 binlog cache 使用情况
SHOW STATUS LIKE 'Binlog_cache%';
-- Binlog_cache_disk_use: 使用临时文件的次数（说明 binlog_cache_size 太小）
-- Binlog_cache_use: 使用 cache 的总次数
-- 理想情况下 Binlog_cache_disk_use / Binlog_cache_use 的比例应该很低
```

## sync_binlog 刷盘策略

```sql
SHOW VARIABLES LIKE 'sync_binlog';
```

| 值 | 行为 | 安全性 | 性能 |
|----|------|--------|------|
| **0** | 不主动 fsync，由操作系统决定刷盘时机 | 最差（OS 崩溃丢失数据） | 最高 |
| **1** | 每次事务提交都 fsync | 最好 | 最低 |
| **N** | 每累计 N 次事务提交后 fsync 一次 | 中等（最多丢失 N 个事务） | 中等 |

```sql
-- 生产环境推荐
SET GLOBAL sync_binlog = 1;
-- 配合 innodb_flush_log_at_trx_commit = 1
-- 确保事务提交后 redo log 和 binlog 都已持久化

-- 高写入吞吐量场景（可容忍少量数据丢失）
SET GLOBAL sync_binlog = 100;
-- 每 100 次事务 fsync 一次
-- 性能提升显著，但崩溃时最多丢失 100 个事务
```

::: danger 两阶段提交 + sync_binlog 配置
```ini
[mysqld]
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1
```
这是数据安全的最低要求。两者缺一不可：
- 只设 `innodb_flush_log_at_trx_commit = 1`：redo log 安全，但 binlog 可能丢失 → 主从不一致
- 只设 `sync_binlog = 1`：binlog 安全，但 redo log 可能丢失 → 数据丢失
:::

## Binlog 查看工具

### mysqlbinlog

```bash
# 查看 binlog 内容（文本格式）
mysqlbinlog /var/lib/mysql/binlog.000005

# 查看指定时间段的 binlog
mysqlbinlog --start-datetime='2026-05-04 10:00:00' \
            --stop-datetime='2026-05-04 11:00:00' \
            /var/lib/mysql/binlog.000005

# 查看指定位置范围的 binlog
mysqlbinlog --start-position=123456 \
            --stop-position=789012 \
            /var/lib/mysql/binlog.000005

# ROW 格式下显示可读内容
mysqlbinlog --base64-output=DECODE-ROWS -v /var/lib/mysql/binlog.000005
# -v: 显示行变更的伪 SQL
# -vv: 显示列类型信息

# 导出 binlog 为 SQL 文件（用于恢复）
mysqlbinlog --start-datetime='2026-05-04 10:00:00' \
            /var/lib/mysql/binlog.000005 > recovery.sql

# 执行恢复
mysql -u root -p < recovery.sql
```

```sql
-- MySQL 内部查看 binlog 事件
SHOW BINLOG EVENTS IN 'binlog.000005';

-- 指定位置
SHOW BINLOG EVENTS IN 'binlog.000005' FROM 123456 LIMIT 10;

-- 查看所有 binlog 文件
SHOW BINARY LOGS;
```

## GTID (Global Transaction Identifier)

GTID 是 MySQL 5.6 引入的全局事务标识符，格式为 `server_uuid:transaction_id`。

### GTID 格式

```
GTID = server_uuid : transaction_id

示例：
3E11FA47-71CA-11E1-9E33-C80AA9429562:1
3E11FA47-71CA-11E1-9E33-C80AA9429562:2
...

- server_uuid: 实例唯一标识（安装时自动生成，位于 auto.cnf 文件中）
- transaction_id: 事务在该实例上的自增序号
```

```sql
-- 启用 GTID
-- my.cnf
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON

-- 查看 GTID 状态
SHOW VARIABLES LIKE 'gtid_mode';
SHOW VARIABLES LIKE 'enforce_gtid_consistency';

-- 查看已执行的 GTID 集合
SELECT @@global.gtid_executed;

-- 查看当前事务的 GTID（事务提交后才有值）
SELECT @@global.gtid_next;
```

### GTID 的优势

```sql
-- 传统复制：需要手动指定 binlog 文件和位置
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.100',
    MASTER_LOG_FILE = 'binlog.000005',
    MASTER_LOG_POS = 123456;

-- GTID 复制：自动定位断点
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.100',
    MASTER_AUTO_POSITION = 1;

-- GTID 复制不需要关心：
-- 1. 从库断点在哪个 binlog 文件
-- 2. 断点的具体位置
-- 只需要知道从库已经执行了哪些 GTID
```

### GTID 约束

启用 `enforce_gtid_consistency` 后，以下操作被禁止：

```sql
-- 1. 事务内混合使用 InnoDB 和非 InnoDB 引擎
BEGIN;
CREATE TABLE t1 (id INT) ENGINE=MyISAM;  -- 报错
COMMIT;

-- 2. CREATE TABLE ... SELECT（需要拆分为两条语句）
CREATE TABLE t2 SELECT * FROM t1;  -- 报错
-- 改为：
CREATE TABLE t2 LIKE t1;
INSERT INTO t2 SELECT * FROM t1;

-- 3. 事务内使用临时表
BEGIN;
CREATE TEMPORARY TABLE tmp (id INT);  -- 报错
COMMIT;
```

```sql
-- 查看 GTID 相关状态
SHOW MASTER STATUS\G
-- Executed_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100

-- GTID 集合运算
SELECT GTID_SUBSET('3E11FA47-71CA-11E1-9E33-C80AA9429562:1-50',
                   '3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100');
-- 返回 1，表示前者是后者的子集

SELECT GTID_SUBTRACT('3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100',
                     '3E11FA47-71CA-11E1-9E33-C80AA9429562:1-50');
-- 返回 '3E11FA47-71CA-11E1-9E33-C80AA9429562:51-100'
```

::: tip GTID 是主从复制的标配
GTID 复制让故障切换和从库重建变得简单——不需要手动找断点位置，从库自动从正确的 GTID 位置继续复制。MySQL 8.0 中，GTID 复制已成为默认推荐的复制方式。
:::

## Binlog 管理

```sql
-- 查看 binlog 空间使用
SHOW BINARY LOGS;

-- 手动清理过期 binlog（保留最近 7 天）
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 清理到指定文件
PURGE BINARY LOGS TO 'binlog.000010';

-- 配置自动过期
SHOW VARIABLES LIKE 'binlog_expire_logs_seconds';
-- 默认 2592000（30 天）
SET GLOBAL binlog_expire_logs_seconds = 7 * 24 * 3600;  -- 7 天

-- 查看 binlog 写入速率
SHOW STATUS LIKE 'Binlog_cache_disk_use';
SHOW STATUS LIKE 'Binlog_cache_use';
```

::: warning binlog 空间管理
binlog 是追加写入，文件只会增长不会收缩。如果不设置过期策略，磁盘空间会被 binlog 耗尽。务必配置 `binlog_expire_logs_seconds` 并监控磁盘使用率。
:::
