# 高可用方案

PostgreSQL 本身不内置高可用方案，但社区提供了成熟的工具链。本节覆盖 Patroni 自动故障转移、PgBouncer 连接池、pgpool-II 读写分离和 HAProxy 负载均衡的实践配置。

<PgReplicationDemo />

## Patroni 自动故障转移

Patroni 是目前最流行的 PostgreSQL 高可用方案，基于分布式共识（DCS）实现 Leader 选举和自动故障转移。

### 架构

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Primary │     │ Standby1 │     │ Standby2 │
│ Patroni  │────▶│ Patroni  │     │ Patroni  │
│ pg       │────▶│ pg       │     │ pg       │
└──────────┘     └──────────┘     └──────────┘
      │               │                │
      └───────────────┼────────────────┘
                      ▼
              ┌───────────────┐
              │  etcd / ZooKeeper / Consul  │
              │   (分布式共识层)             │
              └───────────────┘
```

### 配置文件

```yaml
# patroni.yml
scope: postgres-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: node1-ip:8008

etcd3:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    synchronous_mode: true
    postgresql:
      use_pg_rewind: true
      parameters:
        max_connections: 200
        shared_buffers: 2GB
        wal_level: replica
        max_wal_senders: 10
        max_replication_slots: 10
        hot_standby: "on"
        synchronous_commit: "on"
        synchronous_mode_strict: true

  initdb:
    - encoding: UTF8
    - data-checksums

postgresql:
  listen: 0.0.0.0:5432
  connect_address: node1-ip:5432
  data_dir: /var/lib/postgresql/16/main
  authentication:
    superuser:
      username: postgres
      password: secret
    replication:
      username: replicator
      password: replication_secret
  parameters:
    unix_socket_directories: '/var/run/postgresql'

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

::: tip Patroni 的关键机制
Patroni 每 10 秒（loop_wait）在 DCS 中更新 Leader 锁（TTL 30 秒）。如果 Leader 故障，TTL 过期后其他节点竞争 Leader 锁。获得锁的 Standby 被提升为 Primary，其余 Standby 切换到新 Primary。`pg_rewind` 可以让旧 Primary 不需要全量重建就能加入集群。
:::

## PgBouncer 连接池

PgBouncer 是轻量级的 PostgreSQL 连接池，解决连接风暴和内存消耗问题。

### 连接池模式

```ini
; pgbouncer.ini
[databases]
mydb = host=primary-host port=5432 dbname=mydb
mydb_ro = host=standby-host port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; 三种池模式：
; session - 会话级：连接在会话生命周期内独占（最安全）
; transaction - 事务级：事务结束后连接归还池（最常用）
; statement - 语句级：每条语句后归还（限制最多，不支持多语句事务）
pool_mode = transaction

; 池大小
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; 连接限制
max_client_conn = 1000
max_db_connections = 100

; 超时
server_idle_timeout = 300
client_idle_timeout = 0
query_timeout = 0
query_wait_timeout = 120

; 日志
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
```

### 事务模式的注意事项

```sql
-- 事务模式下不支持的操作：
-- 1. LISTEN/NOTIFY（需要连接级别的通知）
-- 2. SET（会话级参数设置不会保留）
-- 3. PREPARE（prepared statement 不能跨连接）
-- 4. DECLARE CURSOR（不带 WITH HOLD 的游标）
-- 5. 临时表（会话结束后丢失）

-- 应用层适配
-- 使用 SET LOCAL（事务级参数）替代 SET
BEGIN;
SET LOCAL statement_timeout = '5s';
SET LOCAL work_mem = '256MB';
SELECT * FROM large_table ORDER BY created_at;
COMMIT;
-- 事务结束后，参数自动恢复
```

::: tip 连接池的黄金法则
PostgreSQL 每个连接消耗约 10 MB 内存（取决于 work_mem 设置）。100 个 PostgreSQL 连接 ≈ 1 GB 内存。PgBouncer 可以用 1000 个客户端连接复用 100 个数据库连接。`max_client_conn` = 应用实例数 × 每实例线程数；`max_db_connections` = PostgreSQL `max_connections` - 复制连接 - 管理连接。
:::

## pgpool-II 读写分离

pgpool-II 是功能更丰富的中间件，支持连接池、查询缓存、读写分离、并行查询等。

```ini
; pgpool.conf 关键配置

; 连接池
num_init_children = 32         ; 并发客户端连接数
max_pool = 4                   ; 每个子进程的连接池大小

; 负载均衡
load_balance_mode = on         ; 开启读写分离
master_slave_mode = on         ; 流复制模式
master_slave_sub_mode = 'stream'

; 健康检查
health_check_period = 10       ; 每 10 秒检查一次
health_check_timeout = 20
health_check_user = 'pgpool'
health_check_password = 'password'
health_check_max_retries = 3

; 故障转移脚本
failover_command = '/etc/pgpool2/failover.sh %d %h %p %D %H %P'

; 延迟阈值（避免从延迟过大的 Standby 读取）
delay_threshold = 1000000      ; 1MB WAL 延迟阈值

; 主从检测
backend_clustering_mode = 'streaming_replication'
```

### 读写分离的 SQL 控制

```sql
-- pgpool 通过 SQL 注释识别读写意图
-- /* NO LOAD BALANCE */ 强制走主库
SELECT /* NO LOAD BALANCE */ * FROM orders WHERE id = 1;

-- 应用层可以通过连接参数指定
-- pgpool 根据 SQL 类型自动路由：
-- SELECT → 负载均衡到 Standby
-- INSERT/UPDATE/DELETE → 路由到 Primary
```

::: warning 读写分离的一致性问题
pgpool-II 的读写分离是基于 SQL 类型的简单路由。如果在一个事务中先写后读，读操作可能被路由到尚未同步的 Standby。解决方案：使用 `/* NO LOAD BALANCE */` 注释或在事务中将读也路由到 Primary。
:::

## HAProxy 负载均衡

HAProxy 不直接管理 PostgreSQL，而是作为前端负载均衡器，配合 Patroni 使用：

```conf
# haproxy.cfg

global
    maxconn 1000

defaults
    mode tcp
    timeout connect 10s
    timeout client 30m
    timeout server 30m

# 写入端口（只路由到 Primary）
frontend pg_write
    bind *:5432
    default_backend pg_primary

backend pg_primary
    option httpchk GET /primary
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server pg1 node1-ip:5432 maxconn 100 check port 8008
    server pg2 node2-ip:5432 maxconn 100 check port 8008
    server pg3 node3-ip:5432 maxconn 100 check port 8008

# 只读端口（路由到所有 Healthy 节点）
frontend pg_read
    bind *:5433
    default_backend pg_replicas

backend pg_replicas
    balance leastconn
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 3s fall 3 rise 2
    server pg1 node1-ip:5432 maxconn 100 check port 8008
    server pg2 node2-ip:5432 maxconn 100 check port 8008
    server pg3 node3-ip:5432 maxconn 100 check port 8008
```

::: tip Patroni + HAProxy + PgBouncer 最佳实践
推荐架构：HAProxy (5432 写 / 5433 读) → PgBouncer (连接池) → PostgreSQL。HAProxy 检查 Patroni 的 REST API 判断节点角色，PgBouncer 管理连接池。
:::

## 双活架构考量

PostgreSQL 原生不支持多主写入。社区方案：

- **BDR（Bi-Directional Replication）**：EDB 的商业扩展，基于逻辑复制实现多主
- **Citus**：分布式 PostgreSQL，适合多租户和分析场景
- **应用程序层路由**：不同业务写不同节点，通过逻辑复制同步

```sql
-- 基于逻辑复制的双写方案示意
-- 节点 A 处理用户 1-10000 的订单
-- 节点 B 处理用户 10001-20000 的订单
-- 通过逻辑复制同步数据

-- 节点 A 的发布
CREATE PUBLICATION pub_a FOR TABLE orders
WHERE (user_id <= 10000);

-- 节点 B 的订阅
CREATE SUBSCRIPTION sub_a
CONNECTION 'host=node-a dbname=mydb'
PUBLICATION pub_a;
```

::: warning 双活的复杂性
真正的双活需要解决冲突检测（同一行被两个节点同时修改）、时钟同步、网络分区等问题。大多数业务场景不需要双活——一主多从 + 自动故障转移（Patroni）已经足够。
:::
