# 主从复制

## 主从复制原理

MySQL 主从复制基于 binlog 实现，核心流程包含三个线程和两个日志。

```
Master                              Slave
┌────────────────┐                 ┌────────────────────────────┐
│                │                 │                            │
│  客户端写入     │                 │  客户端读取（从库）          │
│     ↓          │                 │                            │
│  写入 Binlog ─── Binlog Dump ───→ IO Thread ─→ Relay Log     │
│                │   Thread        │                  ↓         │
│                │                 │             SQL Thread     │
│                │                 │                  ↓         │
│                │                 │          回放 Relay Log     │
│                │                 │          写入数据           │
└────────────────┘                 └────────────────────────────┘

三个线程：
1. Binlog Dump Thread (Master): 将 binlog 事件发送给从库
2. IO Thread (Slave): 从主库拉取 binlog，写入本地 Relay Log
3. SQL Thread (Slave): 读取 Relay Log，回放到从库数据
```

```sql
-- 主库配置
-- my.cnf
[mysqld]
server-id = 1                    -- 主库 server-id
log-bin = mysql-bin              -- 开启 binlog
binlog-format = ROW              -- 推荐 ROW 格式
sync_binlog = 1                  -- 每次事务提交都刷盘

-- 从库配置
[mysqld]
server-id = 2                    -- 从库 server-id（不能与主库相同）
relay-log = relay-bin            -- relay log 文件名
read_only = ON                   -- 从库只读
super_read_only = ON             -- 即使 SUPER 权限也只读
```

### 复制搭建步骤

```sql
-- 1. 主库创建复制用户
CREATE USER 'repl'@'%' IDENTIFIED BY 'strong_password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;

-- 2. 查看主库 binlog 位置
SHOW MASTER STATUS\G
-- File: mysql-bin.000003
-- Position: 154

-- 3. 从库配置主库连接
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.100',
    MASTER_PORT = 3306,
    MASTER_USER = 'repl',
    MASTER_PASSWORD = 'strong_password',
    MASTER_LOG_FILE = 'mysql-bin.000003',
    MASTER_LOG_POS = 154;

-- MySQL 8.0.22+ 使用新语法
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.100',
    SOURCE_PORT = 3306,
    SOURCE_USER = 'repl',
    SOURCE_PASSWORD = 'strong_password',
    SOURCE_LOG_FILE = 'mysql-bin.000003',
    SOURCE_LOG_POS = 154;

-- 4. 启动从库复制
START SLAVE;
-- MySQL 8.0.22+: START REPLICA;

-- 5. 检查复制状态
SHOW SLAVE STATUS\G
-- MySQL 8.0.22+: SHOW REPLICA STATUS\G
```

关键状态指标：

```sql
SHOW SLAVE STATUS\G

-- 核心字段：
-- Slave_IO_Running: Yes            -- IO 线程是否运行正常
-- Slave_SQL_Running: Yes            -- SQL 线程是否运行正常
-- Seconds_Behind_Master: 0          -- 主从延迟秒数
-- Master_Log_File: mysql-bin.000005 -- IO 线程正在读取的主库 binlog 文件
-- Read_Master_Log_Pos: 123456       -- IO 线程读取位置
-- Relay_Master_Log_File: mysql-bin.000003 -- SQL 线程正在回放的主库 binlog 文件
-- Exec_Master_Log_Pos: 154          -- SQL 线程回放位置
-- Last_IO_Error:                    -- IO 线程最后的错误信息
-- Last_SQL_Error:                   -- SQL 线程最后的错误信息
```

::: tip 复制方向
传统语法使用 `MASTER/SLAVE`，MySQL 8.0.22 开始推荐使用 `SOURCE/REPLICA` 避免不恰当的术语。新语法：`CHANGE REPLICATION SOURCE TO`、`START REPLICA`、`SHOW REPLICA STATUS`。
:::

## 复制模式

### 异步复制 (Asynchronous Replication)

```
客户端 → Master 写入 → binlog
                         ↓ (异步发送)
                      Slave 写入 relay log → 回放

Master 不等待 Slave 确认，直接向客户端返回成功。
```

```sql
-- 异步复制是 MySQL 的默认模式
-- 无需额外配置
CHANGE MASTER TO ...;
START SLAVE;
```

优点：
- 性能好，主库不被从库拖慢
- 实现简单

缺点：
- **可能丢数据**：如果主库崩溃且 binlog 未发送到从库，数据丢失

### 半同步复制 (Semi-Synchronous Replication)

```
客户端 → Master 写入 → binlog
                         ↓ (等待至少一个 Slave 确认)
                      Slave 写入 relay log + 返回 ACK
                         ↓
                      Master 收到 ACK → 向客户端返回成功
```

```sql
-- 安装半同步复制插件
-- 主库
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';

-- 从库
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';

-- 启用半同步复制
-- 主库
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 10000;  -- 超时时间（毫秒）

-- 从库
SET GLOBAL rpl_semi_sync_slave_enabled = 1;

-- 重启从库 IO 线程使配置生效
STOP SLAVE IO_THREAD;
START SLAVE IO_THREAD;

-- 查看半同步状态
SHOW STATUS LIKE 'Rpl_semi_sync%';
-- Rpl_semi_sync_master_status: ON          -- 半同步是否启用
-- Rpl_semi_sync_master_yes_tx: 12345       -- 半同步成功的事务数
-- Rpl_semi_sync_master_no_tx: 10           -- 半同步超时降级为异步的事务数
-- Rpl_semi_sync_master_wait_sessions: 0    -- 当前等待 Slave 确认的会话数
```

::: warning 半同步的降级行为
当 `rpl_semi_sync_master_timeout` 超时后（默认 10 秒），主库会自动降级为异步复制。此时主库不再等待从库确认，直接返回客户端成功。待从库恢复后，自动恢复为半同步。

如果所有从库都不可用且持续超时，实际上等同于异步复制，数据仍有丢失风险。
:::

### 增强半同步 (AFTER_SYNC / Lossless Semi-Sync)

MySQL 5.7+ 引入，binlog 写入但不刷盘前等待从库确认。

```
传统半同步 (AFTER_COMMIT)：
  Prepare redo → Write binlog → Commit（引擎提交）→ 等待 Slave ACK → 返回
  问题：引擎提交后崩溃，主库数据可见但从库没有（幻读）

增强半同步 (AFTER_SYNC)：
  Prepare redo → Write binlog → 等待 Slave ACK → Commit（引擎提交）→ 返回
  优势：引擎提交前已确认从库收到 binlog，崩溃恢复时主从数据一致
```

```sql
-- 配置增强半同步（MySQL 5.7+）
SET GLOBAL rpl_semi_sync_master_wait_point = 'AFTER_SYNC';
-- 默认值，推荐使用

-- 传统模式
SET GLOBAL rpl_semi_sync_master_wait_point = 'AFTER_COMMIT';
```

### 全同步复制

所有从库都确认收到并回放后，主库才返回成功。

```sql
-- MySQL Group Replication / InnoDB Cluster
-- 使用 Paxos 协议实现多节点同步
-- 配置略复杂，适合金融级高可用场景
```

优点：数据零丢失。
缺点：性能最差，受最慢的从库影响。

## GTID 复制

### GTID 格式

```
GTID = server_uuid : transaction_id

示例：
3E11FA47-71CA-11E1-9E33-C80AA9429562:1
3E11FA47-71CA-11E1-9E33-C80AA9429562:2
...

GTID 集合：
3E11FA47-71CA-11E1-9E33-C80AA9429562:1-100,
A1B2C3D4-5678-90AB-CDEF-1234567890AB:1-50
```

```sql
-- 主库配置
[mysqld]
server-id = 1
log-bin = mysql-bin
gtid_mode = ON
enforce_gtid_consistency = ON
binlog-format = ROW

-- 从库配置
[mysqld]
server-id = 2
gtid_mode = ON
enforce_gtid_consistency = ON
relay-log = relay-bin
read_only = ON
```

### GTID 复制搭建

```sql
-- 从库配置 GTID 复制
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.100',
    MASTER_USER = 'repl',
    MASTER_PASSWORD = 'strong_password',
    MASTER_AUTO_POSITION = 1;  -- 关键：自动定位 GTID

-- 从库查看已执行的 GTID 集合
SELECT @@global.gtid_executed;

-- 主库查看已执行的 GTID 集合
SELECT @@global.gtid_executed;
```

### GTID 的核心优势

```sql
-- 场景：从库故障恢复后，需要找到正确的复制断点

-- 传统复制（无 GTID）：
-- 1. 查看从库的 Relay_Master_Log_File 和 Exec_Master_Log_Pos
-- 2. 可能需要备份恢复 + 手动找断点
-- 3. 操作复杂，容易出错

-- GTID 复制：
-- 1. 从库启动后，自动知道哪些 GTID 已执行
-- 2. 告诉主库已执行的 GTID 集合
-- 3. 主库自动跳过已执行的事务，从断点继续
-- 4. 完全不需要手动找 binlog 文件和位置

-- 场景：从库数据损坏
-- 传统方式：mysqldump 主库数据 → 恢复到从库 → 手动找断点
-- GTID 方式：
-- 1. 从主库或另一从库备份
-- SET GLOBAL gtid_purged = 'executed_gtid_set';
-- 2. CHANGE MASTER TO MASTER_AUTO_POSITION = 1;
-- 3. START SLAVE;
-- 自动从正确位置继续复制
```

```sql
-- GTID 故障跳过（比传统方式简单得多）

-- 跳过单个事务
SET GTID_NEXT = '3E11FA47-71CA-11E1-9E33-C80AA9429562:100';
BEGIN; COMMIT;  -- 创建一个空事务来"消耗"这个 GTID
SET GTID_NEXT = 'AUTOMATIC';

-- 对比传统方式需要：SET GLOBAL sql_slave_skip_counter = 1;
-- 而且必须知道跳过的是哪条 SQL
```

## 主从延迟

### 延迟原因

```
常见原因：
├── 1. 从库单线程回放（MySQL 5.5-5.6 的默认行为）
├── 2. 主库大事务（一条 UPDATE 百万行，从库回放时间长）
├── 3. 从库机器性能差（CPU/IO 不如主库）
├── 4. 从库承担大量查询（占用 IO 和 CPU）
├── 5. 网络延迟（主从不在同一机房）
├── 6. 主库并发高，从库回放跟不上
└── 7. 从库锁竞争（大查询阻塞回放线程）
```

### 查看延迟

```sql
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master: 0
-- NULL 表示 IO 线程未运行
-- 0 表示无延迟（或刚好追上）

-- 更精确的方式：比较主从 GTID 差异
-- 主库
SELECT @@global.gtid_executed;
-- 3E11FA47-...:1-10000

-- 从库
SELECT @@global.gtid_executed;
-- 3E11FA47-...:1-9998
-- 说明从库落后 2 个事务

-- MySQL 8.0+ 的复制延迟监控
SELECT * FROM performance_schema.replication_applier_status_by_worker\G
-- SERVICE_STATE: ON
-- LAST_APPLIED_TRANSACTION: 事务 ID
-- APPLYING_TRANSACTION: 正在回放的事务 ID
```

### 优化方案

#### 并行复制

MySQL 5.7+ 支持从库并行回放 relay log，显著减少延迟。

```sql
-- MySQL 5.7 并行复制
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
-- LOGICAL_CLOCK: 同一个 binlog group commit 的事务可以并行回放
-- DATABASE: 不同库的事务可以并行回放

SET GLOBAL slave_parallel_workers = 8;
-- 并行回放线程数，通常设为 4-16

-- MySQL 8.0.27+ 的 enhanced multi-threaded replica
-- 自动判断哪些事务可以并行，不需要手动配置
SET GLOBAL replica_parallel_workers = 16;
SET GLOBAL replica_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL replica_preserve_commit_order = ON;
-- 保证从库提交顺序与主库一致

-- 查看并行复制状态
SHOW SLAVE STATUS\G
-- Slave_SQL_Running_State: Slave has read all relay log
--                          waiting for more updates

-- 查看各个 worker 线程
SELECT * FROM performance_schema.replication_applier_status_by_worker\G
```

::: tip 并行复制效果
- MySQL 5.5-5.6 单线程回放：延迟可能达到小时级
- MySQL 5.7 LOGICAL_CLOCK 并行：延迟降低到分钟级
- MySQL 8.0 enhanced MTS：延迟降低到秒级

并行复制是解决主从延迟最有效的方案。
:::

#### 其他优化手段

```sql
-- 1. 使用增强半同步，减少主库到从库的 binlog 传输延迟
SET GLOBAL rpl_semi_sync_master_wait_point = 'AFTER_SYNC';

-- 2. 从库关闭二进制日志写入（如果从库不需要级联复制）
-- 从库 my.cnf
[mysqld]
skip-log-bin

-- 3. 从库使用更快的存储（NVMe SSD）
-- 4. 从库增大 redo log 和 buffer pool
-- 5. 避免在从库执行慢查询（或使用单独的分析从库）
```

## 主从切换

### 计划内切换

用于主库维护、版本升级等有计划的切换。

```sql
-- 步骤 1：主库停止写入
-- 设置主库为只读
SET GLOBAL read_only = ON;
SET GLOBAL super_read_only = ON;

-- 等待从库追上
-- 检查从库的 Seconds_Behind_Master = 0

-- 步骤 2：从库提升为主库
-- 从库停止复制
STOP SLAVE;
RESET SLAVE ALL;  -- 清除主库连接配置

-- 步骤 3：从库取消只读
SET GLOBAL read_only = OFF;
SET GLOBAL super_read_only = OFF;

-- 步骤 4：原主库变为从库
-- 原主库配置为从库
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.101',  -- 新主库
    MASTER_AUTO_POSITION = 1;
START SLAVE;
```

### 故障切换

主库宕机时的自动或半自动切换。

**MHA (Master High Availability)**：

```
MHA Manager
├── 监控主库心跳
├── 检测到主库宕机
├── 选择最新的从库（数据最全）
├── 尝试从宕机主库获取未发送的 binlog（如果可以 SSH 连接）
├── 将选中的从库提升为主库
├── 重新配置其他从库指向新主库
└── 通知应用切换连接
```

**Orchestrator**：

```
Orchestrator 特点：
├── 基于 Web UI 的可视化拓扑管理
├── 自动故障检测和切换
├── 支持多种故障恢复策略
├── 与 Consul / 集群管理集成
└── 比 MHA 更灵活，维护更活跃
```

**Keepalived + VIP**：

```
Keepalived
├── Master 节点持有 VIP
├── 通过 VRRP 协议检测 Master 存活
├── Master 故障时，VIP 漂移到 Backup 节点
├── 应用连接 VIP，无需修改配置
└── 结合 Shell 脚本自动执行主从切换
```

## 拓扑结构

### 一主多从

```
         ┌── Slave 1（读负载）
         │
Master ──┼── Slave 2（读负载）
         │
         └── Slave 3（备份 + 延迟从库）

优点：简单，读能力线性扩展
缺点：主库是单点，Slave 越多 Master 压力越大
```

### 级联复制

```
Master ──→ Slave 1 ──→ Slave 2（级联）
  │                      │
  └──→ Slave 3          Slave 4（级联的级联）

优点：减轻 Master 的 binlog 发送压力
缺点：级联越深延迟越大，故障传播路径更长
```

```sql
-- 级联从库配置
-- Slave 1（从 Master 复制）
-- 需要开启 log_slave_updates，将从 Master 复制的 binlog 也写入自己的 binlog
[mysqld]
log_slave_updates = ON
-- MySQL 8.0.22+: log_replica_updates = ON

-- Slave 2（从 Slave 1 复制）
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.102',  -- Slave 1 的地址
    MASTER_AUTO_POSITION = 1;
START SLAVE;
```

::: tip 级联复制的延迟问题
每一级都会增加延迟。如果使用并行复制，级联的延迟影响会减小。对于延迟敏感的场景，应尽量减少级联层级（不超过 2-3 级）。延迟从库（如设置 `CHANGE MASTER TO MASTER_DELAY = 3600`）通常放在级联的最后一级。
:::

```sql
-- 延迟从库（用于误操作恢复）
CHANGE MASTER TO
    MASTER_HOST = '192.168.1.100',
    MASTER_DELAY = 3600,  -- 延迟 1 小时回放
    MASTER_AUTO_POSITION = 1;
START SLAVE;

-- 如果主库执行了 DROP TABLE，有一小时的窗口恢复
-- 延迟从库此时还未执行该语句
-- 可以从延迟从库导出数据恢复
```

```sql
-- 完整的高可用架构示例

-- 主库
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
gtid_mode = ON
enforce_gtid_consistency = ON
sync_binlog = 1
innodb_flush_log_at_trx_commit = 1
log_slave_updates = ON

-- 从库（读负载）
[mysqld]
server-id = 2
relay-log = relay-bin
gtid_mode = ON
enforce_gtid_consistency = ON
read_only = ON
super_read_only = ON
slave_parallel_workers = 16
slave_parallel_type = LOGICAL_CLOCK
replica_preserve_commit_order = ON

-- 延迟从库（备份恢复用）
[mysqld]
server-id = 3
relay-log = relay-bin
gtid_mode = ON
enforce_gtid_consistency = ON
read_only = ON
super_read_only = ON
-- MASTER_DELAY = 7200  -- 延迟 2 小时
```
