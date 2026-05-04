# MyISAM 与存储引擎对比

## MyISAM 特点

MyISAM 是 MySQL 5.5 之前的默认存储引擎，设计简单、读取速度快，但在现代应用中已被 InnoDB 全面超越。

### 不支持事务

MyISAM 不支持事务，每条 SQL 语句都是原子操作，无法回滚。

```sql
-- MyISAM 没有事务概念
CREATE TABLE myisam_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT
) ENGINE=MyISAM;

-- 即使不手动 COMMIT，数据也立即持久化
INSERT INTO myisam_log (message) VALUES ('写入即持久');

-- ROLLBACK 无效
BEGIN;
INSERT INTO myisam_log (message) VALUES ('这条无法回滚');
ROLLBACK;
-- SELECT * FROM myisam_log; -- 仍然能看到这条数据
```

### 表级锁

MyISAM 只支持表级锁（Table-Level Lock），不支持行级锁。

```sql
-- 会话 A：获取读锁
LOCK TABLES myisam_log READ;
-- 会话 A 可以读取
SELECT * FROM myisam_log;

-- 会话 B：可以读取（读锁共享）
SELECT * FROM myisam_log;  -- 立即返回

-- 会话 B：写入被阻塞（写锁互斥）
INSERT INTO myisam_log (message) VALUES ('blocked');  -- 等待

-- 会话 A：释放锁
UNLOCK TABLES;

-- 会话 B：写入成功
```

```sql
-- 写锁优先于读锁
-- 如果有写操作在等待，后续的读操作也会被阻塞
-- 这导致在高并发写入场景下读操作也可能被阻塞

-- 查看表锁争用情况
SHOW STATUS LIKE 'Table_locks%';
-- Table_locks_immediate: 立即获得锁的次数
-- Table_locks_waited: 需要等待锁的次数
```

::: tip 表级锁的优缺点
优点：开销小，加锁快，不会出现死锁。
缺点：并发写入性能极差，一个写操作会阻塞所有其他操作。这是 MyISAM 在 OLTP 场景被淘汰的核心原因。
:::

### 不支持外键

```sql
-- MyISAM 不支持外键约束
CREATE TABLE myisam_order (
    order_id INT PRIMARY KEY,
    user_id INT,
    -- 以下语法在 MyISAM 引擎下会被忽略或报错
    -- FOREIGN KEY (user_id) REFERENCES users(id)
    INDEX idx_user (user_id)
) ENGINE=MyISAM;
```

### 全文索引（MySQL 5.6 之前）

在 MySQL 5.6 之前，只有 MyISAM 支持全文索引。InnoDB 从 5.6 开始支持。

```sql
-- MyISAM 全文索引
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    body TEXT,
    FULLTEXT INDEX ft_title_body (title, body)
) ENGINE=MyISAM;

-- 自然语言搜索
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('MySQL 数据库');

-- 布尔模式搜索
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('+MySQL -PostgreSQL' IN BOOLEAN MODE);
```

### 压缩表（只读）

MyISAM 支持压缩表（Read-Only Compressed），适用于归档和静态数据。

```bash
# 使用 myisampack 工具压缩表
myisampack /var/lib/mysql/mydb/articles.MYI

# 压缩后需要重建索引
myisamchk --recover /var/lib/mysql/mydb/articles.MYI
```

压缩表特点：
- 压缩比通常为 50%-80%
- **只读**，不能执行 INSERT/UPDATE/DELETE
- 压缩后仍然可以正常查询
- 适用于历史数据、字典表等很少修改的场景

### 表级崩溃恢复

MyISAM 的崩溃恢复能力极弱：

```sql
-- 崩溃后需要执行修复
REPAIR TABLE myisam_log;

-- 或使用 myisamchk 工具
-- myisamchk --recover /var/lib/mysql/mydb/myisam_log.MYI
```

::: danger MyISAM 崩溃风险
MyISAM 在崩溃后可能导致：
1. 表损坏（需要 REPAIR TABLE）
2. 未写入的数据丢失
3. 索引损坏

MyISAM 没有 redo log，也没有 doublewrite buffer，写入操作直接修改磁盘文件。因此，MyISAM 不适合存储重要数据。
:::

## MyISAM 存储结构

MyISAM 表由三个文件组成：

```
/var/lib/mysql/mydb/
├── myisam_log.frm    # 表定义（所有引擎都有）
├── myisam_log.MYD    # 数据文件 (MyData)
└── myisam_log.MYI    # 索引文件 (MyIndex)
```

| 文件 | 扩展名 | 内容 |
|------|--------|------|
| 表定义 | `.frm` | 表结构定义（列、索引、字符集等） |
| 数据文件 | `.MYD` | 按插入顺序或定长格式存储的行数据 |
| 索引文件 | `.MYI` | 所有索引（B+ 树），索引的叶子节点存储数据文件的偏移量 |

::: tip MyISAM 与 InnoDB 的索引差异
MyISAM 的索引是非聚簇的——主键索引和二级索引的叶子节点都存储数据行在 `.MYD` 文件中的偏移量。而 InnoDB 的主键索引是聚簇的，叶子节点直接存储行数据。
:::

## InnoDB vs MyISAM 对比

| 特性 | InnoDB | MyISAM |
|------|--------|--------|
| **事务** | 支持（ACID） | 不支持 |
| **锁粒度** | 行级锁 | 表级锁 |
| **外键** | 支持 | 不支持 |
| **崩溃恢复** | 通过 redo log 自动恢复 | 需要手动 REPAIR TABLE |
| **全文索引** | MySQL 5.6+ 支持 | 原生支持（5.6 前唯一选择） |
| **压缩** | Transparent Compression（8.0.20+） | myisampack（只读压缩） |
| **聚簇索引** | 是（主键索引叶子节点存数据） | 否（所有索引存偏移量） |
| **MVCC** | 支持 | 不支持 |
| **缓存** | Buffer Pool（数据+索引） | 仅缓存索引（OS 缓存数据） |
| **空间占用** | 较大（undo log、doublewrite 等） | 较小 |
| **COUNT(*)** | 全表扫描（不加 WHERE） | 直接读取元数据（极快） |
| **适用场景** | OLTP、事务、高并发 | 只读/极少写入的查询场景 |

```sql
-- InnoDB COUNT(*) 需要全表扫描
SELECT COUNT(*) FROM innodb_table;  -- 全表扫描

-- MyISAM COUNT(*) 直接返回
SELECT COUNT(*) FROM myisam_table;  -- 瞬间返回

-- 但带 WHERE 条件时两者都需要扫描
SELECT COUNT(*) FROM myisam_table WHERE id > 100;  -- 也需要扫描
```

## 其他存储引擎

### Memory (HEAP)

数据存储在内存中，重启后丢失。

```sql
CREATE TABLE session_cache (
    session_id VARCHAR(64) PRIMARY KEY,
    user_id INT,
    data JSON,
    expires_at TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=MEMORY;

-- 特点：
-- 1. 默认使用 Hash 索引（等值查询快，范围查询慢）
-- 2. 可以显式指定 B-Tree 索引
-- 3. 受 max_heap_table_size 和 tmp_table_size 限制
-- 4. 不支持 TEXT/BLOB 类型
-- 5. 表级锁

-- 设置 B-Tree 索引
CREATE TABLE tmp_sorted (
    id INT PRIMARY KEY,
    val INT,
    INDEX idx_val USING BTREE (val)
) ENGINE=MEMORY;
```

::: warning Memory 引擎注意事项
- 数据库重启后数据全部丢失
- 写操作使用表级锁，并发写入性能差
- 如果表大小超过 `max_heap_table_size`，会转为 MyISAM 临时表
- 适合临时表、会话缓存、不重要的中间结果存储
:::

### Archive

高压比的存储引擎，仅支持 INSERT 和 SELECT。

```sql
CREATE TABLE access_log (
    id BIGINT AUTO_INCREMENT,
    ip VARCHAR(45),
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) ENGINE=ARCHIVE;

-- 特点：
-- 1. 使用 zlib 压缩，压缩比很高
-- 2. 不支持 UPDATE、DELETE
-- 3. 不支持索引
-- 4. 适合日志归档场景
-- 5. SELECT 需要全表扫描
```

### CSV

以 CSV 格式存储数据，可以用 Excel 等工具直接打开。

```sql
CREATE TABLE csv_export (
    id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(200)
) ENGINE=CSV;

-- 数据文件可以直接用文本编辑器查看
-- 不支持索引
-- 不支持 NULL 值（所有列必须 NOT NULL）
-- 适合数据交换场景
```

### NDB (Cluster)

分布式存储引擎，用于 MySQL Cluster。

```sql
-- NDB 特点：
-- 1. 数据自动在多个节点间复制
-- 2. 支持行级锁和事务
-- 3. 内存存储，可配置磁盘持久化
-- 4. 高可用，单节点故障不影响服务
-- 5. 适合电信级应用
-- 6. 不支持外键、全文索引、空间索引
```

## 存储引擎选择指南

```
需要事务？
  ├── 是 → InnoDB（唯一选择）
  └── 否 →
        ├── 高并发写入？ → InnoDB
        ├── 只读归档？ → Archive 或 MyISAM
        ├── 数据交换？ → CSV
        ├── 临时缓存？ → Memory
        └── 其他 → InnoDB（默认引擎，最安全的选择）
```

::: danger MyISAM 在 2026 年的实际地位
MyISAM 几乎已完全被淘汰。MySQL 8.0 的系统表从 MyISAM 全部迁移到 InnoDB。除非你有一个只读的历史归档表且极度在意存储空间，否则**没有任何理由使用 MyISAM**。
:::
