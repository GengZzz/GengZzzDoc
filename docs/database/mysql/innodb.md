# InnoDB 存储引擎

InnoDB 是 MySQL 的默认存储引擎，支持事务、行级锁、MVCC、外键约束，是 OLTP 场景的首选引擎。

## InnoDB 架构概览

InnoDB 的架构分为**内存结构**和**磁盘结构**两大部分。

```
┌─────────────────────────────────────────────┐
│                  InnoDB                      │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │   内存结构   │    │      磁盘结构        │ │
│  │             │    │                     │ │
│  │ Buffer Pool │    │ System Tablespace   │ │
│  │ Change Buf  │    │ File-Per-Table      │ │
│  │ Log Buffer  │    │ Undo Tablespace     │ │
│  │ Adaptive HI │    │ Redo Log            │ │
│  │             │    │ Temporary Tablespace│ │
│  └─────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────┘
```

## 内存结构

### Buffer Pool

Buffer Pool 是 InnoDB 最核心的内存区域，用于缓存从磁盘读取的数据页和索引页。

```sql
-- 查看 Buffer Pool 大小
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
-- 推荐设置为物理内存的 60%-80%（专用数据库服务器）

-- 查看 Buffer Pool 实例数
SHOW VARIABLES LIKE 'innodb_buffer_pool_instances';
-- 多实例可减少并发竞争，通常设为 1-16
```

Buffer Pool 中的页类型包括：
- 数据页（Index Page）
- 索引页
- undo 页
- 插入缓冲（Change Buffer）
- 自适应哈希索引
- 锁信息
- 数据字典

Buffer Pool 使用改进的 LRU 算法管理页的淘汰（详见 `buffer-pool.md`）。

### Change Buffer

Change Buffer（也叫 Insert Buffer）用于缓存对**非唯一二级索引**的修改操作。

```sql
-- 当修改二级索引页时，如果该页不在 Buffer Pool 中：
-- 1. 将修改操作记录到 Change Buffer
-- 2. 后续当该页被读入 Buffer Pool 时，合并 Change Buffer 中的操作

-- 查看 Change Buffer 配置
SHOW VARIABLES LIKE 'innodb_change_buffer_max_size';
-- 默认 25，表示最多占 Buffer Pool 的 25%

SHOW VARIABLES LIKE 'innodb_change_buffering';
-- 默认 all（insert/delete-mark/purge 操作都缓冲）
-- 可选值: none, inserts, deletes, changes, purges, all
```

::: tip Change Buffer 适用场景
- 写多读少的场景（写操作不会立即触发读取对应索引页）
- 非唯一二级索引（唯一索引需要检查唯一性，必须读取磁盘，无法使用 Change Buffer）
:::

### Adaptive Hash Index (AHI)

InnoDB 自动监测对某些索引页的访问模式，对热点页在内存中建立哈希索引，加速等值查询。

```sql
-- 查看 AHI 状态
SHOW ENGINE INNODB STATUS\G
-- 找到 "INSERT BUFFER AND ADAPTIVE HASH INDEX" 部分
-- Hash table size, node heap, # searches, # successful, # non-successful

-- 启用/禁用 AHI
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index';
SET GLOBAL innodb_adaptive_hash_index = OFF;  -- 高并发写入时关闭可能更稳定
```

::: warning AHI 的问题
AHI 在高并发写入场景下可能导致 latch 争用（因为对 B+ 树页加 latch 的同时也要保护哈希表）。如果 `SHOW ENGINE INNODB STATUS` 显示 AHI 的搜索命中率很低，考虑关闭它。
:::

### Log Buffer

Log Buffer 是 redo log 在内存中的缓冲区。

```sql
-- Log Buffer 大小
SHOW VARIABLES LIKE 'innodb_log_buffer_size';
-- 默认 16MB
-- 大事务多时适当增大（如 64MB-128MB）
```

日志写入流程：事务修改数据 → 写入 Log Buffer → 根据 `innodb_flush_log_at_trx_commit` 的策略刷盘。

## 磁盘结构

### 系统表空间 (System Tablespace)

文件名：`ibdata1`（可配置多个）。

包含内容：
- InnoDB 数据字典（Data Dictionary）
- 双写缓冲区（Doublewrite Buffer）
- Change Buffer
- Undo Log（如果不使用独立 undo 表空间）
- 临时表的回滚段

```sql
-- 查看系统表空间文件
SHOW VARIABLES LIKE 'innodb_data_file_path';
-- 默认值: ibdata1:12M:autoextend

-- 可以配置多个系统表空间文件
-- innodb_data_file_path=ibdata1:1G;ibdata2:1G:autoextend
```

### 独立表空间 (File-Per-Table Tablespace)

每个表一个 `.ibd` 文件，MySQL 5.6+ 默认启用。

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
-- 默认 ON

-- 关闭后新表数据存储在系统表空间
SET GLOBAL innodb_file_per_table = OFF;
```

::: tip 独立表空间优势
- 可以通过 `DROP TABLE` 或 `TRUNCATE TABLE` 回收磁盘空间
- 可以将单个表迁移到其他实例
- 可以使用表压缩（Transparent Compression）
- 单表损坏不影响其他表
:::

### Undo 表空间

MySQL 8.0+ 支持独立的 undo 表空间，将 undo log 从系统表空间中分离。

```sql
-- 查看 undo 表空间配置
SHOW VARIABLES LIKE 'innodb_undo_tablespaces';
-- 默认 2（0 表示使用系统表空间）

SHOW VARIABLES LIKE 'innodb_undo_directory';
-- undo 文件存储路径

-- MySQL 8.0.14+ 可以在线截断 undo 表空间，回收磁盘空间
SHOW VARIABLES LIKE 'innodb_undo_log_truncate';
-- 默认 ON
```

### 临时表空间

非压缩的用户临时表和磁盘内部临时表使用共享临时表空间。

```sql
SHOW VARIABLES LIKE 'innodb_temp_data_file_path';
-- 默认: ibtmp1:12M:autoextend
-- 注意：该文件只增不减，需要重启 MySQL 才能回收

-- 查看当前临时表空间大小
SELECT FILE_NAME, TABLESPACE_NAME, TOTAL_EXTENTS * EXTENT_SIZE / 1024 / 1024 AS size_mb
FROM information_schema.FILES
WHERE TABLESPACE_NAME = 'innodb_temporary';
```

## 行格式 (Row Format)

InnoDB 支持四种行格式，决定了数据在磁盘上的物理存储方式。

### 行格式概览

| 行格式 | 紧凑存储 | 压缩支持 | 大字段页外存储 | 引入版本 |
|--------|----------|----------|---------------|----------|
| **REDUNDANT** | 否 | 否 | 是（前 768 字节行内） | 最早 |
| **COMPACT** | 是 | 否 | 是（前 768 字节行内） | 5.0 |
| **DYNAMIC** | 是 | 否 | 是（仅 20 字节指针行内） | 5.7 |
| **COMPRESSED** | 是 | 是 | 是（仅 20 字节指针行内） | 5.0 |

```sql
-- 创建表时指定行格式
CREATE TABLE t1 (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    bio TEXT
) ROW_FORMAT=DYNAMIC;

-- 修改行格式
ALTER TABLE t1 ROW_FORMAT=COMPRESSED;

-- 查看当前默认行格式
SHOW VARIABLES LIKE 'innodb_default_row_format';
-- MySQL 8.0 默认 DYNAMIC
```

### COMPACT 格式详解

COMPACT 是理解 InnoDB 行存储的基础，结构如下：

```
┌──────────────────────────────────────────────────────────┐
│ 变长字段长度列表 │ NULL 标志位 │ 记录头信息 │ 列数据... │
└──────────────────────────────────────────────────────────┘
```

**变长字段长度列表**：逆序记录每个变长字段（VARCHAR、VARBINARY、TEXT、BLOB）的实际长度。如果最大长度不超过 255 字节，用 1 字节记录；超过 255 字节且实际长度大于 127 字节时，用 2 字节记录。

**NULL 标志位**：用位图标记哪些列值为 NULL，每列占 1 位。如果表中没有允许 NULL 的列，则不占用空间。

**记录头信息**（5 字节）：
- `deleted_flag`：是否被删除（标记删除）
- `min_rec_flag`：B+ 树非叶子节点的最小记录标记
- `n_owned`：当前记录拥有的记录数（用于页内分组）
- `heap_no`：记录在页中的堆位置
- `record_type`：记录类型（0=普通，1=B+树非叶节点，2=Infimum，3=Supremum）
- `next_record`：下一条记录的相对位置

**隐藏列**：InnoDB 自动为每行添加三列：

| 隐藏列 | 说明 |
|--------|------|
| `DB_ROW_ID` | 6 字节，没有显式主键且没有非 NULL 唯一索引时自动创建聚簇索引 |
| `DB_TRX_ID` | 6 字节，最后修改该行的事务 ID |
| `DB_ROLL_PTR` | 7 字节，回滚指针，指向 undo log 中该行的上一个版本 |

### 行溢出 (Row Overflow)

当一行数据过大，无法存储在一个 B+ 树页中（默认 16KB）时，会发生行溢出。

```sql
-- COMPACT 格式：大字段前 768 字节存储在行内，其余存储在溢出页
-- DYNAMIC 格式：大字段仅存储 20 字节指针在行内，全部数据存储在溢出页
-- COMPRESSED 格式：与 DYNAMIC 相同，但溢出页使用压缩

-- 查看溢出页情况（需要开启 innodb_monitor）
CREATE TABLE overflow_demo (
    id INT PRIMARY KEY,
    large_text VARCHAR(16384)  -- 接近一页大小
) ROW_FORMAT=COMPACT;
```

::: tip DYNAMIC 是推荐格式
MySQL 8.0 默认使用 DYNAMIC 行格式。它将大字段完全存储在溢出页中，使得行内只保留 20 字节的指针，从而在 16KB 的页中容纳更多行，提高缓存命中率和查询效率。
:::

## Change Buffer 详解

```sql
-- 监控 Change Buffer 的使用情况
SHOW ENGINE INNODB STATUS\G
-- "INSERT BUFFER AND ADAPTIVE HASH INDEX" 部分

-- 关键指标：
-- IBUF_SIZE: free list len, seg size, size
-- IBUF_SEG_SIZE: 段大小
-- inserts, merged recs, discarded recs
```

Change Buffer 的合并（Merge）时机：
1. 对应的二级索引页被读入 Buffer Pool
2. Change Buffer 达到 `innodb_change_buffer_max_size` 限制
3. 后台线程定期合并
4. 数据库正常关闭时

```sql
-- 场景：批量写入大量非唯一二级索引
CREATE TABLE log_table (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),    -- 非唯一二级索引
    INDEX idx_created_at (created_at)
);

-- 大量 INSERT 时，如果 Buffer Pool 很大但写入页不在其中
-- Change Buffer 可以避免频繁的随机 IO
INSERT INTO log_table (user_id, action)
VALUES (1001, 'login'), (1002, 'purchase'), (1003, 'logout');
```

## 自适应 Hash 索引 (AHI) 详解

```sql
-- AHI 的监控指标
SHOW ENGINE INNODB STATUS\G
-- "INSERT BUFFER AND ADAPTIVE HASH INDEX" 部分

-- # searches: 总搜索次数
-- # successful: AHI 命中次数
-- # non-successful: AHI 未命中次数

-- AHI 自动建立的条件：
-- 1. 对某个页的访问模式高度重复
-- 2. 该页被访问了至少 17 次
-- 3. 该页的访问模式属于等值查询（= 或 IN）

-- 查看 AHI 使用率
SELECT
    COUNT(*) AS total_pages,
    SUM(IF(hash_index_enabled = 1, 1, 0)) AS ahi_pages,
    ROUND(SUM(IF(hash_index_enabled = 1, 1, 0)) / COUNT(*) * 100, 2) AS ahi_pct
FROM information_schema.INNODB_BUFFER_PAGE
WHERE PAGE_TYPE = 'INDEX';
```

## Doublewrite Buffer

Doublewrite Buffer 是 InnoDB 防止**部分写失效（Partial Page Write）**的关键机制。

### 问题背景

InnoDB 的页大小是 16KB，而操作系统的 IO 操作通常是 4KB 或 512 字节。如果在刷脏页（16KB）过程中发生崩溃，可能只写入了部分字节（如前 8KB），导致页数据不完整。redo log 记录的是对页的修改操作，无法恢复一个损坏的页。

### Doublewrite 工作流程

```
脏页刷盘流程：
1. 脏页 → Doublewrite Buffer（内存，2MB）
2. Doublewrite Buffer → 系统表空间（顺序写，2MB）
3. Doublewrite Buffer 清空
4. 脏页 → 独立表空间（随机写，16KB/页）

崩溃恢复流程：
如果步骤 4 中某页写坏，从系统表空间的 doublewrite 区域找到完整副本，
复制到独立表空间，然后用 redo log 恢复。
```

```sql
-- 查看 doublewrite 配置
SHOW VARIABLES LIKE 'innodb_doublewrite';
-- 默认 ON

-- 查看 doublewrite 统计
SHOW ENGINE INNODB STATUS\G
-- "BUFFER POOL AND MEMORY" 部分
-- Pages read ahead, evicted without access, Random read ahead
-- "FILE I/O" 部分
-- Pending normal aio reads, aio writes
```

::: tip Doublewrite 性能影响
Doublewrite 会增加大约 10% 的写入开销，但这笔开销是值得的——它保证了数据页的完整性。在 SSD 上这个开销更小，因为 doublewrite 是顺序写入。
:::

## innodb_file_per_table 详解

```sql
-- 查看当前表空间文件组织
SELECT
    TABLE_NAME,
    ENGINE,
    ROW_FORMAT,
    AVG_ROW_LENGTH,
    DATA_LENGTH / 1024 / 1024 AS data_mb,
    INDEX_LENGTH / 1024 / 1024 AS index_mb,
    DATA_FREE / 1024 / 1024 AS free_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'employees' AND ENGINE = 'InnoDB';

-- 查看 .ibd 文件的页分布
SELECT
    SPACE, PAGE_TYPE, COUNT(*) AS page_count
FROM information_schema.INNODB_BUFFER_PAGE
WHERE TABLE_NAME LIKE '%employees/salaries%'
GROUP BY SPACE, PAGE_TYPE;
```

::: danger 共享表空间的问题
如果使用共享表空间（`innodb_file_per_table=OFF`），即使执行 `DROP TABLE` 或 `TRUNCATE TABLE`，空间也不会被释放回操作系统。唯一的办法是 `mysqldump` 导出所有数据，删除 `ibdata1` 文件，重启后重新导入。因此，除非有特殊需求，**始终使用独立表空间**。
:::
