# 复制机制

PostgreSQL 的复制机制建立在 WAL（Write-Ahead Log）之上。WAL 不仅保证了崩溃恢复，还提供了物理复制和逻辑复制的基础。理解复制原理是搭建高可用架构的前提。

## WAL 机制

WAL（预写式日志）是 PostgreSQL 持久性的核心：任何数据变更都先写入 WAL，再修改内存中的数据页。

```
事务提交流程：
1. 数据修改写入 WAL Buffer
2. WAL Buffer 刷入 WAL 文件（fsync）
3. 返回提交成功
4. 后台进程（bgwriter）异步将脏页写入数据文件

崩溃恢复：
1. 从最后一个 checkpoint 开始
2. 重放 WAL 日志（Redo）
3. 回滚未提交的事务（Undo）
4. 数据恢复到一致状态
```

### WAL 配置

```sql
-- wal_level 决定 WAL 记录的详细程度
-- minimal：最少的日志，不支持复制
-- replica：支持物理复制（默认）
-- logical：支持逻辑复制

SHOW wal_level;

-- 关键参数
max_wal_size = 1GB               -- 触发 checkpoint 的 WAL 大小
min_wal_size = 80MB              -- WAL 文件最小保留量
wal_keep_size = 1GB              -- 保留 WAL 文件大小（用于复制）
checkpoint_timeout = 5min        -- checkpoint 最大间隔
checkpoint_completion_target = 0.9  -- checkpoint 写入分散度

-- 查看 WAL 位置
SELECT pg_current_wal_lsn();     -- 当前 WAL 位置
SELECT pg_walfile_name(pg_current_wal_lsn());  -- WAL 文件名
```

## 物理复制（Streaming Replication）

物理复制在块级别复制数据，Standby 是 Primary 的字节级副本。

### 部署流程

```sql
-- Primary 节点配置
-- 1. postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = 2GB
synchronous_standby_names = ''   -- 先配置为异步

-- 2. pg_hba.conf 添加复制用户
-- host replication replicator standby-ip/32 scram-sha-256

-- 3. 创建复制用户
CREATE USER replicator WITH REPLICATION LOGIN PASSWORD 'replication_password';

-- 4. 在 Standby 节点初始化（使用 pg_basebackup）
-- pg_basebackup -h primary-host -U replicator -D /var/lib/postgresql/16/main
--              -Fp -Xs -P -R

-- -Fp: plain 格式
-- -Xs: 使用流复制传输 WAL
-- -P: 显示进度
-- -R: 创建 standby.signal 和 postgresql.auto.conf（连接信息）

-- 5. Standby 节点
-- 确保存在 standby.signal 文件
-- postgresql.auto.conf 中应有 primary_conninfo
```

### 复制状态监控

```sql
-- Primary 上查看复制状态
SELECT
    client_addr,
    state,
    sent_lsn,         -- 已发送的 WAL 位置
    write_lsn,        -- Standby 已写入的 WAL 位置
    flush_lsn,        -- Standby 已刷入磁盘的 WAL 位置
    replay_lsn,       -- Standby 已重放的 WAL 位置
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
    sync_state
FROM pg_stat_replication;

-- Standby 上查看恢复状态
SELECT
    pg_is_in_recovery(),                  -- 是否在恢复模式
    pg_last_wal_receive_lsn(),            -- 最后接收的 WAL
    pg_last_wal_replay_lsn(),             -- 最后重放的 WAL
    pg_last_xact_replay_timestamp(),      -- 最后重放的事务时间
    NOW() - pg_last_xact_replay_timestamp() AS replay_delay;  -- 复制延迟
```

### 同步模式

```sql
-- synchronous_commit 参数控制提交时的同步级别
-- off：不等 WAL 刷入磁盘（最快，但有数据丢失风险）
-- local：等本地 WAL 刷入（默认）
-- remote_write：等 Standby 写入（不等刷盘）
-- on / remote_apply：等 Standby 刷入（最安全）
-- remote_apply：等 Standby 重放完成（读一致性最强）

-- 同步复制配置
ALTER SYSTEM SET synchronous_standby_names = 'FIRST 1 (standby1, standby2)';
-- 第一个 standby（按优先级）作为同步 standby
-- 其他作为潜在同步 standby

ALTER SYSTEM SET synchronous_commit = 'remote_apply';
SELECT pg_reload_conf();
```

::: tip 同步模式的权衡
`remote_apply` 最安全，但写入延迟 = Primary WAL 刷盘 + 网络传输 + Standby WAL 刷盘 + Standby 重放。大多数场景用 `remote_write` 或默认的 `on` 即可。
:::

## 逻辑复制

逻辑复制在行级别复制数据变更，基于逻辑解码（Logical Decoding）。与物理复制不同，逻辑复制可以：

- 只复制特定的表
- 跨版本复制（不同 PostgreSQL 版本之间）
- 双向复制（多主复制的基础）

```sql
-- Primary 配置
wal_level = logical
max_replication_slots = 10
max_logical_replication_workers = 4

-- 创建发布
CREATE PUBLICATION pub_orders FOR TABLE orders, order_items;
-- 或发布所有表
CREATE PUBLICATION pub_all FOR ALL TABLES;

-- 查看发布
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;

-- Subscriber 配置
-- 1. 创建表结构（可以不同，但列名/类型需要兼容）
-- 2. 创建订阅
CREATE SUBSCRIPTION sub_orders
CONNECTION 'host=primary-host dbname=mydb user=replicator'
PUBLICATION pub_orders;

-- 3. 查看订阅状态
SELECT * FROM pg_subscription;
SELECT * FROM pg_stat_subscription;

-- 同步状态
SELECT subname, received_lsn, latest_end_lsn
FROM pg_stat_subscription;
```

::: tip 逻辑复制的注意事项
逻辑复制不复制 DDL（ALTER TABLE 等）。如果 Primary 修改了表结构，Subscriber 需要手动执行相同的 DDL。也不复制 TRUNCATE（除非 PostgreSQL 14+ 显式设置）。初始同步阶段会执行全表复制，大表可能需要较长时间。
:::

## 级联复制

Standby 可以作为其他 Standby 的源，形成级联复制：

```
Primary ──→ Standby 1 ──→ Standby 2
              │
              └──→ Standby 3
```

```sql
-- Standby 1 配置（postgresql.conf）
wal_level = replica
max_wal_senders = 10
hot_standby = on

-- Standby 2 配置（primary_conninfo 指向 Standby 1）
-- standby.signal 中的 primary_conninfo
primary_conninfo = 'host=standby1-host port=5432 user=replicator'
```

::: tip 级联复制的用途
- 减轻 Primary 的复制压力
- 跨机房部署（Primary → 同机房 Standby → 跨机房 Standby）
- 备份用（从 Standby 做 pg_basebackup，不影响 Primary）
:::

## 复制槽（Replication Slot）

复制槽确保 Primary 保留 Standby 还未消费的 WAL 文件，防止 WAL 被过早清理。

```sql
-- 创建物理复制槽
SELECT pg_create_physical_replication_slot('standby1_slot');

-- 创建逻辑复制槽
SELECT pg_create_logical_replication_slot('logical_slot', 'pgoutput');

-- 查看复制槽
SELECT
    slot_name,
    slot_type,
    active,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
FROM pg_replication_slots;

-- 删除复制槽（防止 WAL 无限增长）
SELECT pg_drop_replication_slot('standby1_slot');
```

::: warning 复制槽的风险
如果 Standby 长时间断开，复制槽会让 Primary 保留越来越多的 WAL 文件，可能导致磁盘满。需要监控复制槽的 lag，设置 `max_slot_wal_keep_size`（PostgreSQL 13+）限制 WAL 保留量。
:::

## pg_basebackup

```sql
-- 物理备份（全量）
pg_basebackup -h primary-host -U replicator \
  -D /backup/pg_basebackup_$(date +%Y%m%d) \
  -Ft -z -P

-- -Ft: tar 格式
-- -z: 压缩
-- -P: 进度显示
-- -Xs: 流复制传输 WAL（默认）
-- -Xf: 包含 WAL 文件

-- 创建备份标签
pg_basebackup -h primary-host -U replicator -D /backup \
  --checkpoint=fast --wal-method=stream --label=full-backup
```
