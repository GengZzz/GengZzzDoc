# 运维与安全

PostgreSQL 的运维涵盖备份恢复、认证授权、监控调优。本节覆盖最实用的运维场景，配合具体命令和配置示例。

## 备份与恢复

### pg_dump / pg_restore

```bash
# 逻辑备份（SQL 格式）
pg_dump -h localhost -U postgres -d mydb -f mydb_backup.sql

# 自定义格式（支持并行、压缩、选择性恢复）
pg_dump -h localhost -U postgres -d mydb -F c -f mydb_backup.dump
# -F c: custom 格式
# -F d: directory 格式（每个表一个文件，支持并行）
# -F t: tar 格式

# 并行备份（directory 格式）
pg_dump -h localhost -U postgres -d mydb -F d -j 4 -f mydb_backup_dir/

# 备份特定表
pg_dump -h localhost -U postgres -d mydb -t orders -t users -F c -f tables.dump

# 恢复
psql -h localhost -U postgres -d mydb < mydb_backup.sql          # SQL 格式
pg_restore -h localhost -U postgres -d mydb mydb_backup.dump     # 自定义格式

# 并行恢复
pg_restore -h localhost -U postgres -d mydb -j 4 mydb_backup_dir/

# 查看备份内容（不恢复）
pg_restore -l mydb_backup.dump > backup_list.txt
# 编辑 backup_list.txt 排除不需要的表
pg_restore -L backup_list.txt mydb_backup.dump -d mydb
```

::: tip 全量备份策略
每天一次 `pg_dump -F d -j 4` 并行逻辑备份。对于 TB 级别的数据库，使用 `pg_basebackup` 做物理备份（速度更快，但恢复需要完整的 WAL 回放）。
:::

### 物理备份（pg_basebackup）

```bash
# 全量物理备份
pg_basebackup -h localhost -U replicator \
  -D /backup/base_$(date +%Y%m%d) \
  -Ft -z -Xs -P

# -Ft: tar 格式
# -z: gzip 压缩
# -Xs: 流式传输 WAL
# -P: 进度显示
```

## PITR 时间点恢复

PITR（Point-In-Time Recovery）允许恢复到任意时间点：

### 配置 WAL 归档

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal_archive/%f'
archive_timeout = 300           # 最多 5 分钟归档一次
```

### 执行 PITR

```bash
# 1. 创建基础备份
pg_basebackup -h localhost -U replicator -D /backup/base -Ft -z -Xs

# 2. 记录恢复目标时间（假设事故发生时间：2024-06-15 14:30:00）

# 3. 创建恢复配置
cat > /backup/recovery.conf << EOF
restore_command = 'cp /backup/wal_archive/%f %p'
recovery_target_time = '2024-06-15 14:30:00+08'
recovery_target_action = 'promote'
EOF

# 4. 恢复
# 停止 PostgreSQL
systemctl stop postgresql

# 清空数据目录
rm -rf /var/lib/postgresql/16/main/*

# 从基础备份恢复
tar xzf /backup/base/base.tar.gz -C /var/lib/postgresql/16/main/

# 启动（进入恢复模式）
systemctl start postgresql

# PostgreSQL 自动回放 WAL 到目标时间点，然后提升为主库
```

::: tip PITR 恢复目标
- `recovery_target_time`：恢复到指定时间
- `recovery_target_lsn`：恢复到指定 WAL 位置
- `recovery_target_name`：恢复到命名恢复点（`pg_create_restore_point()` 创建）
- `recovery_target_xid`：恢复到指定事务 ID
:::

## pg_hba.conf 认证

pg_hba.conf 控制客户端认证，格式：

```
# TYPE  DATABASE  USER  ADDRESS         METHOD
local   all       postgres              peer
local   all       all                   scram-sha-256
host    all       all   127.0.0.1/32    scram-sha-256
host    all       all   0.0.0.0/0       scram-sha-256
host    replication replicator 0.0.0.0/0 scram-sha-256
```

```sql
-- 查看当前连接使用的认证方法
SELECT usename, client_addr, auth_method FROM pg_stat_activity;

-- 常用认证方法
-- peer: 使用 OS 用户名（仅 local 连接）
-- scram-sha-256: 最安全的密码认证（推荐）
-- md5: 兼容旧客户端（不推荐，已知漏洞）
-- cert: SSL 客户端证书认证
-- trust: 无密码（仅限本地开发）
```

::: warning 生产环境安全
- 禁止 `trust` 认证（本地连接也不推荐）
- 使用 `scram-sha-256` 代替 `md5`
- 限制允许的 IP 范围（`host all all 10.0.0.0/8 scram-sha-256`）
- 复制用户使用独立的认证行
:::

## Row Level Security

RLS 在行级别控制数据访问，应用层不需要修改查询逻辑：

```sql
-- 启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能看到自己的订单
CREATE POLICY orders_user_policy ON orders
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::INT);

-- 使用时设置 session 变量
SET app.current_user_id = '42';
SELECT * FROM orders;  -- 只返回 user_id=42 的订单

-- 不同操作的策略
-- SELECT 策略
CREATE POLICY orders_select ON orders
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::INT);

-- INSERT 策略（只能插入自己的订单）
CREATE POLICY orders_insert ON orders
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id')::INT);

-- UPDATE 策略（只能更新自己的订单）
CREATE POLICY orders_update ON orders
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id')::INT);

-- 排除 Superuser
-- Superuser 和表 Owner 默认绕过 RLS
-- 强制 RLS 对 Superuser 生效
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
```

::: tip RLS 的实际价值
RLS 实现了多租户数据隔离：所有租户共享同一张表，通过 RLS 策略自动过滤。这比按租户分表要简单得多，同时保持了数据隔离的安全性。Supabase 等平台大量使用 RLS 实现用户级数据隔离。
:::

## 审计日志

```ini
# postgresql.conf 审计配置
log_statement = 'ddl'              # 记录 DDL（CREATE/ALTER/DROP）
log_connections = on               # 记录连接
log_disconnections = on            # 记录断开
log_line_prefix = '%m [%p] %q%u@%d '
log_destination = 'csvlog'         # CSV 格式便于分析
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
```

```sql
-- 使用 pgAudit 扩展细粒度审计
-- CREATE EXTENSION pgaudit;

-- 审计特定表的 SELECT/INSERT/UPDATE/DELETE
ALTER DATABASE mydb SET pgaudit.log = 'read, write';
ALTER ROLE auditor SET pgaudit.role = 'auditor_role';

-- 创建审计角色
CREATE ROLE auditor_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO auditor_role;
-- 审计 auditor_role 执行的所有操作
```

## 关键监控指标

```sql
-- 1. 连接数
SELECT
    COUNT(*) AS total_connections,
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_tx,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max_conn
FROM pg_stat_activity;

-- 2. 缓存命中率
SELECT
    SUM(blks_hit) AS cache_hit,
    SUM(blks_read) AS disk_read,
    ROUND(SUM(blks_hit)::NUMERIC / NULLIF(SUM(blks_hit) + SUM(blks_read), 0) * 100, 2) AS hit_ratio
FROM pg_stat_database
WHERE datname = current_database();
-- 健康值：> 99%

-- 3. 表膨胀
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup::NUMERIC / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 4. 复制延迟
SELECT
    client_addr,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag_pretty
FROM pg_stat_replication;

-- 5. 锁等待
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query,
    NOW() - blocked.query_start AS wait_time
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks gl ON gl.locktype = bl.locktype
    AND gl.database IS NOT DISTINCT FROM bl.database
    AND gl.relation IS NOT DISTINCT FROM bl.relation
    AND gl.page IS NOT DISTINCT FROM bl.page
    AND gl.tuple IS NOT DISTINCT FROM bl.tuple
    AND gl.virtualxid IS NOT DISTINCT FROM bl.virtualxid
    AND gl.pid != bl.pid
    AND gl.granted
JOIN pg_stat_activity blocking ON blocking.pid = gl.pid;

-- 6. 事务 ID 回卷风险
SELECT
    datname,
    age(datfrozenxid) AS xid_age,
    ROUND(age(datfrozenxid)::NUMERIC / 2000000000 * 100, 2) AS pct_to_wraparound
FROM pg_database
ORDER BY age(datfrozenxid) DESC;
-- 健康值：< 50%（10 亿以下）
```

::: tip 监控工具推荐
- **pgwatch2**：开箱即用的 PostgreSQL 监控，基于 Grafana
- **Prometheus + postgres_exporter**：云原生监控方案
- **pgBadger**：日志分析工具，生成 HTML 报告
- **check_pgactivity**：Nagios/Icinga 插件
:::
