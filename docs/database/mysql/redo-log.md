# Redo Log 深度解析

## WAL (Write-Ahead Logging)

WAL 是 InnoDB 保证数据持久性的核心原则：**先写日志，再写磁盘**。

```
为什么需要 WAL？
─────────────────
修改一条数据时，如果直接将修改后的数据页写回磁盘（随机 IO，16KB），性能极差。
WAL 的做法：
1. 先将"做了什么修改"以日志形式顺序写入磁盘（顺序 IO，几百字节）
2. 数据页的真正写入可以延迟到空闲时批量刷盘

关键：顺序写入 redo log 的速度远快于随机写入数据页
```

## Redo Log 的作用

Redo Log 解决的核心问题：**保证已提交事务的持久性（Durability）**。

```
事务提交后，修改可能还在 Buffer Pool 中（脏页），尚未写入磁盘。
如果此时数据库崩溃：
1. 重启后，InnoDB 读取 redo log
2. 找到已提交事务对应的修改
3. 将这些修改重新应用到数据页上（重做 = redo）
4. 数据恢复到崩溃前的状态
```

## Redo Log 结构

```
┌─────────────────────────────────────────────────────┐
│                    Redo Log                          │
│                                                     │
│  ┌─────────────────┐    ┌────────────────────────┐  │
│  │ redo log buffer │    │  redo log files (磁盘)  │  │
│  │   (内存)        │ →  │  ib_logfile0            │  │
│  │                 │    │  ib_logfile1            │  │
│  │  事务修改时      │    │  ib_logfile2 ...        │  │
│  │  先写入 buffer  │    │  (循环写入)              │  │
│  └─────────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

```sql
-- 查看 redo log 配置
SHOW VARIABLES LIKE 'innodb_log_file_size';
-- 单个 redo log 文件大小（MySQL 5.x）

SHOW VARIABLES LIKE 'innodb_log_files_in_group';
-- redo log 文件数量（MySQL 5.x，通常为 2）

-- MySQL 8.0.30+ 使用新参数
SHOW VARIABLES LIKE 'innodb_redo_log_capacity';
-- 统一配置所有 redo log 的总容量
-- 默认 100MB（保守默认值，生产环境需要调大）

-- 查看 redo log 文件位置
SHOW VARIABLES LIKE 'innodb_log_group_home_dir';
```

## 写入过程

```
事务修改数据的完整流程：

1. 事务开始
2. 修改 Buffer Pool 中的数据页 → 数据页变为脏页
3. 同时将修改记录写入 redo log buffer（内存）
4. 事务提交 → 根据 innodb_flush_log_at_trx_commit 策略刷 redo log
5. 后台线程择机将 Buffer Pool 中的脏页刷到磁盘
```

```sql
-- 查看 redo log buffer 大小
SHOW VARIABLES LIKE 'innodb_log_buffer_size';
-- 默认 16MB
-- 大事务多时建议增大（如 64MB-128MB）

-- redo log buffer 在以下时机刷到磁盘：
-- 1. 事务提交时（根据 innodb_flush_log_at_trx_commit）
-- 2. redo log buffer 使用超过一半
-- 3. 后台线程每秒刷一次
-- 4. checkpoint 时
```

## 刷盘策略：innodb_flush_log_at_trx_commit

这是影响 InnoDB 性能和数据安全性的最关键参数之一。

### 三种策略详解

```
innodb_flush_log_at_trx_commit = 0
─────────────────────────────────
  事务提交 → 写入 redo log buffer
  后台线程每秒 → 写入 OS cache → fsync 刷盘
  风险：崩溃可能丢失最多 1 秒的数据


innodb_flush_log_at_trx_commit = 1（默认，推荐）
─────────────────────────────────────────────
  事务提交 → 写入 redo log buffer → 写入 OS cache → fsync 到磁盘
  风险：无（最安全）


innodb_flush_log_at_trx_commit = 2
─────────────────────────────────
  事务提交 → 写入 redo log buffer → 写入 OS cache
  后台线程每秒 → fsync 到磁盘
  风险：OS 层面崩溃（如断电）可能丢失最多 1 秒的数据
  操作系统崩溃（如 kernel panic）才丢数据
```

```sql
-- 查看当前设置
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';

-- 生产环境必须为 1（金融、电商等对数据安全要求高的场景）
SET GLOBAL innodb_flush_log_at_trx_commit = 1;

-- 如果可以容忍少量数据丢失（如日志分析系统），可以设为 2
-- 写入性能提升显著（减少 fsync 调用次数）
```

| 值 | 事务提交时 | 每秒后台线程 | 安全性 | 性能 |
|----|-----------|-------------|--------|------|
| **0** | 写入 buffer | buffer → OS cache → fsync | 最差（丢失 1s） | 最高 |
| **1** | buffer → OS cache → fsync | 无 | 最好 | 最低 |
| **2** | 写入 OS cache | OS cache → fsync | 中等（OS 崩溃丢失 1s） | 中等 |

::: danger 生产环境配置
```ini
# my.cnf
[mysqld]
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1
```
这两个参数配合使用，确保事务提交后 redo log 和 binlog 都已持久化到磁盘。这是保证数据不丢失的**最低配置**。
:::

## Log Sequence Number (LSN)

LSN 是一个全局递增的数字，标记 redo log 的写入位置。InnoDB 通过 LSN 来判断数据页是否需要应用 redo log。

```sql
-- 查看当前 LSN
SHOW ENGINE INNODB STATUS\G

-- "LOG" 部分：
-- Log sequence number          1234567890  -- 当前写入位置
-- Log buffer assigned up to    1234567800
-- Log buffer completed up to   1234567700
-- Log written up to            1234567600  -- 已写入磁盘的位置
-- Log flushed up to            1234567500  -- 已刷盘的位置
-- Last checkpoint at           1234567000  -- 最近的 checkpoint 位置
```

LSN 的几个关键概念：

| LSN 名称 | 含义 |
|----------|------|
| `Log sequence number` | 当前产生的 redo log 位置 |
| `Log flushed up to` | 已经 fsync 到磁盘的 redo log 位置 |
| `Last checkpoint at` | 脏页已经刷到的位置，此之前的 redo log 可以被覆盖 |

```
redo log 文件（循环写入）：

    checkpoint                                    write_pos
        ↓                                            ↓
  ┌─────┬────────────────────────────────────────────┬─────┐
  │     │         已 checkpoint（可覆盖）              │     │
  │     │←──────── 已持久化的脏页 ─────────→│           │     │
  │     │                                  │ 未写入区域 │     │
  └─────┴────────────────────────────────────────────┴─────┘

写指针追上 checkpoint 指针 → redo log 写满 → 必须先刷脏推进 checkpoint
```

## 两阶段提交 (Two-Phase Commit)

在事务需要同时写 redo log 和 binlog 的场景下，两阶段提交保证两者的一致性。

### 为什么需要两阶段提交

```
场景：UPDATE users SET name = 'Alice' WHERE id = 1;

如果没有两阶段提交：
情况 A：先写 redo log，后写 binlog，写完 redo log 后崩溃
  → redo log 有记录，binlog 没有 → 从库复制丢失这条数据

情况 B：先写 binlog，后写 redo log，写完 binlog 后崩溃
  → binlog 有记录，redo log 没有 → 主库数据丢失，从库却有这条数据

两种情况都会导致主从数据不一致。
```

### 两阶段提交流程

```
事务执行 UPDATE users SET name = 'Alice' WHERE id = 1:

阶段 1：Prepare
├── 修改 Buffer Pool 中的数据页
├── 写入 redo log（包含修改信息）
├── redo log 中标记为 PREPARE 状态
└── 事务状态变为 "prepared"

阶段 2：Commit
├── 写入 binlog
├── 在 redo log 中写入 commit 标记
└── 事务提交完成

崩溃恢复逻辑：
├── redo log 中有 PREPARE 且 binlog 中有对应记录 → 提交事务
├── redo log 中有 PREPARE 但 binlog 中没有对应记录 → 回滚事务
└── redo log 中有 COMMIT → 提交事务
```

```sql
-- 查看两阶段提交相关参数
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';  -- redo log 刷盘策略
SHOW VARIABLES LIKE 'sync_binlog';                       -- binlog 刷盘策略

-- 最安全配置（数据零丢失）
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
SET GLOBAL sync_binlog = 1;
```

::: tip 两阶段提交的性能影响
两阶段提交需要两次 fsync（redo log 一次，binlog 一次），是事务提交的主要开销。使用 Group Commit（MySQL 5.6+）可以将多个事务的 fsync 合并为一次，显著提升吞吐量。
:::

## Redo Log 空间管理

### 循环写入机制

Redo log 文件是固定大小的，以循环方式写入：

```
ib_logfile0 ──→ ib_logfile1 ──→ ib_logfile0 ──→ ib_logfile1 ──→ ...
                 ↑ 循环

写指针 (write_pos): 新的 redo log 写入位置
检查点 (checkpoint): 已完成刷脏的位置，之前的 redo log 可被覆盖

如果 write_pos 追上 checkpoint → redo log 空间不足 → 所有 DML 操作阻塞
→ 必须等待脏页刷盘推进 checkpoint
```

### 相关参数

```sql
-- MySQL 5.x
SHOW VARIABLES LIKE 'innodb_log_file_size';
-- 单个文件大小，默认 48MB
-- 生产环境建议 1GB-4GB

SHOW VARIABLES LIKE 'innodb_log_files_in_group';
-- 文件数量，默认 2
-- 总空间 = innodb_log_file_size × innodb_log_files_in_group

-- MySQL 8.0.30+ 新参数
SHOW VARIABLES LIKE 'innodb_redo_log_capacity';
-- 统一管理总容量，默认 100MB
-- 推荐值：高写入负载设为 4GB-8GB

-- 查看 redo log 使用情况
SELECT *
FROM performance_schema.global_status
WHERE VARIABLE_NAME LIKE '%redo%';

-- redo log 写入速率
-- SHOW ENGINE INNODB STATUS 中的 "LOG" 部分
-- Log sequence number 的增长速度就是 redo log 的写入速率
```

::: warning redo log 大小调优
- redo log 太小：频繁 checkpoint，导致抖动和随机 IO 增加
- redo log 太大：崩溃恢复时间变长
- 经验值：使 checkpoint 间隔时间在 30 分钟到 2 小时之间
- 可以通过 `Log sequence number` 和 `Last checkpoint at` 的差值判断
:::

```sql
-- 计算 checkpoint 间隔
-- Log sequence number - Last checkpoint at = 未完成的 redo log 数据量
-- 如果该值接近总 redo log 容量，说明刷脏速度不够

-- 监控 redo log 写入量
-- 开启 performance_schema
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE '%redo%';
```
