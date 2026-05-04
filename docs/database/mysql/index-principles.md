# 索引原理

## 为什么需要索引

在没有索引的情况下，数据库查找一条记录需要**全表扫描**——从第一行开始逐行比较，直到找到目标行。

### 全表扫描 vs 索引查找的代价

假设一张用户表有 1000 万行数据，每行 1KB，总数据量约 10GB。

```sql
-- 无索引：全表扫描
SELECT * FROM users WHERE phone = '13800000000';
-- 需要扫描 1000 万行，读取约 10GB 数据

-- 有索引：B+ 树查找
-- 只需要 3-4 次磁盘 IO（树高度），每次 IO 读取一个 16KB 的页
```

| 操作 | 全表扫描 | B+ 树索引查找 |
|------|---------|-------------|
| IO 次数 | 数千次（取决于数据量） | 3-4 次 |
| 读取数据量 | 10GB | 约 64KB |
| 耗时 | 几十秒 | 几毫秒 |

::: tip 索引的本质
索引是一种**空间换时间**的数据结构。通过维护额外的数据结构（通常是树），将 O(n) 的查找降到 O(log n)。
:::

---

## 索引的数据结构演进

为什么数据库选择了 B+ 树？让我们看看从二叉树到 B+ 树的演进过程。

### 二叉搜索树 (BST)

```
        50
       /  \
     30    70
    /  \   /  \
   20  40 60   80
```

**问题**：如果数据有序插入（1, 2, 3, 4, 5...），树退化成链表：

```
1
 \
  2
   \
    3
     \
      4
       \
        5
```

查找复杂度从 O(log n) 退化为 O(n)。

### AVL 树（平衡二叉搜索树）

通过旋转操作保持左右子树高度差不超过 1：

```
        50
       /  \
     30    70
    /  \      \
   20  40      80
```

**问题**：
- 每个节点只存一个键值，树高度大
- 磁盘 IO 次数 = 树高度，高度越大 IO 越多
- 对 1000 万数据，AVL 树高度约 23（log₂(10000000)），需要 23 次磁盘 IO

### 红黑树

放宽平衡条件（最长路径不超过最短路径的 2 倍），减少旋转频率。

**问题**：和 AVL 树一样，每个节点只存一个键，高度仍然偏大。实际场景中红黑树常用于内存数据结构（如 Java 的 TreeMap），不适合磁盘存储。

### B 树（B-Tree）

**关键改进**：每个节点存储多个键值，大幅降低树高度。

```
B 树节点（度数 d=3，每个节点最多 5 个键）：
┌─────────────────────────────────┐
│  P0  |  K1  |  P1  |  K2  |  P2  │
└─────────────────────────────────┘
```

- 每个节点可以存储多个 key 和 data
- 1000 万数据的 B 树，高度约 3-4 层
- 但 B 树的非叶子节点也存储 data，导致扇出（fan-out）受限

### B+ 树：MySQL InnoDB 的选择

B+ 树在 B 树的基础上做了两个关键优化：

```
            非叶子节点（只存 key + 指针）
        ┌──────────────────────────────┐
        │  [10] [20] [30] [40] [50]    │
        └──────────────────────────────┘
           ↓     ↓     ↓     ↓     ↓
     ┌─────┴──┬──┴──┬──┴──┬──┴──┬──┴──┐
     │  叶子节点（存 key + data）       │
     │  [1,数据][2,数据][5,数据]        │  ←── 双向链表 ──→
     │  [10,数据][12,数据][15,数据]     │
     │  [20,数据][22,数据][25,数据]     │
     └────────────────────────────────┘
```

#### 特性一：非叶子节点只存 key

非叶子节点不存储行数据，只存储 key 和指向子节点的指针。这让每个节点能容纳更多的 key，扇出更高，树更矮。

一个 InnoDB 页（16KB）能存储多少 key？

```
假设主键是 BIGINT（8 字节），指针 6 字节
每条索引记录约 14 字节（不考虑页头和页尾开销）
每页可存 ≈ 16384 / 14 ≈ 1170 个 key

高度 2：1170 个叶子节点
高度 3：1170 × 1170 ≈ 136 万个叶子节点
高度 4：1170 × 1170 × 1170 ≈ 16 亿个叶子节点
```

::: tip 三层 B+ 树可以存储 136 万条记录，四层可以存储 16 亿条
这就是为什么绝大多数表的 B+ 树高度是 3-4 层，每次查找只需要 3-4 次磁盘 IO。
:::

#### 特性二：叶子节点形成双向链表

所有叶子节点通过指针串联成有序链表，支持高效的范围查询和顺序遍历：

```sql
-- 范围查询：找到起点后沿链表扫描
SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-06-30';
-- 先在 B+ 树中定位 '2024-01-01'（3 次 IO）
-- 然后沿链表顺序读取直到 '2024-06-30'

-- 排序：链表本身就是有序的
SELECT * FROM orders ORDER BY created_at;
-- 不需要额外排序，直接沿链表读取
```

#### 为什么不用 B 树？

| 对比项 | B 树 | B+ 树 |
|--------|------|-------|
| 非叶子节点 | 存 key + data | 只存 key + 指针 |
| 扇出 | 低（data 占空间） | 高（同页存更多 key） |
| 范围查询 | 需要中序遍历 | 沿链表顺序扫描 |
| 叶子节点间关联 | 无 | 双向链表 |

B 树的非叶子节点存 data，导致单个节点能容纳的 key 数减少，树高度增加，磁盘 IO 次数增加。

#### 为什么不用 Hash？

```sql
-- Hash 索引能 O(1) 查找
-- 等值查询极快
SELECT * FROM users WHERE id = 12345;
-- Hash(12345) → 直接定位

-- 但范围查询不支持
SELECT * FROM orders WHERE created_at > '2024-01-01';
-- Hash 无法处理 > < BETWEEN 等范围条件

-- 排序也不支持
SELECT * FROM users ORDER BY created_at;
-- Hash 索引的存储是无序的，无法用于排序
```

| 特性 | Hash 索引 | B+ 树索引 |
|------|----------|----------|
| 等值查询 | O(1)，最快 | O(log n) |
| 范围查询 | 不支持 | 原生支持 |
| 排序 | 不支持 | 原生支持 |
| 最左前缀 | 不支持 | 支持 |
| 覆盖索引 | 不支持 | 支持 |

---

<MySQLBPlusTreeDemo />

---

## Hash 索引

### Memory 引擎的 Hash 索引

Memory 引擎默认使用 Hash 索引：

```sql
CREATE TABLE cache (
    key_str VARCHAR(100) PRIMARY KEY,
    value TEXT,
    expires_at DATETIME
) ENGINE=MEMORY;

-- 等值查询走 Hash 索引
SELECT * FROM cache WHERE key_str = 'session:abc123';
```

### InnoDB 的自适应 Hash 索引 (Adaptive Hash Index)

InnoDB 会**自动**检测热点页，为频繁访问的索引页在内存中构建 Hash 索引：

```sql
-- 查看自适应 Hash 索引状态
SHOW ENGINE INNODB STATUS\G
-- 找到 "INSERT BUFFER AND ADAPTIVE HASH INDEX" 部分

-- 查看是否开启
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index';
-- 默认 ON
```

::: tip 自适应 Hash 的工作原理
InnoDB 监控对 B+ 树索引页的访问。如果发现某个页被频繁通过等值查询访问，会自动为该页建立 Hash 索引，将等值查询从 O(log n) 提速到 O(1)。

这是一个自动优化过程，不需要手动干预。但在某些高并发写入场景下，自适应 Hash 的锁竞争可能成为瓶颈，可以关闭：

```sql
SET GLOBAL innodb_adaptive_hash_index = OFF;
```
:::

---

## Full-Text 全文索引

全文索引基于**倒排索引**（Inverted Index），适用于文本内容的搜索。

### 倒排索引原理

传统的索引是"文档 → 词"的关系，倒排索引是"词 → 文档列表"的关系：

```
文档 1: "MySQL is a database"
文档 2: "Redis is a cache database"
文档 3: "MySQL uses B+ tree index"

倒排索引：
  "mysql"   → [文档1, 文档3]
  "is"      → [文档1, 文档2, 文档3]   -- 停用词会被过滤
  "a"       → []                       -- 停用词
  "database" → [文档1, 文档2]
  "redis"   → [文档2]
  "cache"   → [文档2]
  "uses"    → [文档3]
  "b"       → [文档3]
  "tree"    → [文档3]
  "index"   → [文档3]
```

### 创建和使用全文索引

```sql
CREATE TABLE articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    FULLTEXT INDEX ft_title_content (title, content) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 中文搜索需要 ngram 分词器（MySQL 5.7.6+）
-- innodb_ft_min_token_size = 2（默认，最短分词长度）

-- 全文搜索语法
-- 自然语言模式（默认）
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('MySQL 索引' IN NATURAL LANGUAGE MODE);

-- 布尔模式（支持 + - 等操作符）
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('+MySQL -Redis' IN BOOLEAN MODE);

-- 查询相关度得分
SELECT id, title,
       MATCH(title, content) AGAINST('MySQL 索引') AS relevance
FROM articles
WHERE MATCH(title, content) AGAINST('MySQL 索引')
ORDER BY relevance DESC;
```

::: warning 全文索引的适用场景
全文索引适合**模糊搜索文本内容**，不适合精确匹配。对于中文，需要安装 ngram 分词插件。在高并发场景下，专业的搜索引擎（Elasticsearch / OpenSearch）性能远超 MySQL 全文索引。

MySQL 全文索引适用：
- 数据量不大（百万级以内）
- 搜索频率不高
- 不想引入额外的搜索引擎组件
:::
