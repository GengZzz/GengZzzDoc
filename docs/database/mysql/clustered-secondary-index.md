# 聚簇索引与二级索引

## 聚簇索引 (Clustered Index)

### 什么是聚簇索引

聚簇索引的叶子节点存储**完整的行数据**。在 InnoDB 中，**主键索引就是聚簇索引**，表数据按照主键顺序物理存储。

```
聚簇索引（主键索引）的结构：

非叶子节点：
┌────────────────────────────────────────┐
│  [10]    [50]    [100]    [200]        │
└────────────────────────────────────────┘
   ↓        ↓        ↓        ↓
叶子节点（存储完整行数据）：
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ id=1         │  │ id=50        │  │ id=100       │  │ id=200       │
│ name='张三'  │  │ name='李四'  │  │ name='王五'  │  │ name='赵六'  │
│ age=25       │  │ age=30       │  │ age=28       │  │ age=35       │
│ ...完整行数据│  │ ...完整行数据│  │ ...完整行数据│  │ ...完整行数据│
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
     ← 双向链表 →      ← 双向链表 →      ← 双向链表 →
```

### 聚簇索引的特点

1. **表数据按主键排序存储**：数据文件本身就是按主键组织的 B+ 树
2. **一个表只有一个聚簇索引**：数据只能按一种顺序物理存储
3. **叶子节点包含完整行数据**：通过主键查找不需要额外 IO
4. **如果没有定义主键**：InnoDB 会选择第一个非空唯一索引；如果也没有，InnoDB 会生成一个 6 字节的隐藏 `row_id` 作为聚簇索引

```sql
-- InnoDB 的行结构
-- 每行除了用户定义的列，还包含：
-- 1. DB_TRX_ID (6 字节)：最后修改该行的事务 ID
-- 2. DB_ROLL_PTR (7 字节)：回滚指针，指向 undo log 中的旧版本
-- 3. DB_ROW_ID (6 字节)：如果没有主键且没有唯一索引，InnoDB 自动生成

-- 查看表的聚簇索引信息
SHOW INDEX FROM users WHERE Key_name = 'PRIMARY';
```

---

## 二级索引 (Secondary Index)

### 什么是二级索引

二级索引的叶子节点不存储行数据，而是存储**主键值**。通过二级索引查找时，需要先拿到主键值，再回到聚簇索引查找完整数据，这个过程叫**回表**。

```
二级索引（假设在 name 列上）：

非叶子节点：
┌──────────────────────────────────────────┐
│  ['D']      ['L']      ['S']      ['Z']  │
└──────────────────────────────────────────┘
   ↓           ↓           ↓           ↓
叶子节点（存 索引列值 + 主键值）：
┌────────────────────┐  ┌────────────────────┐
│ name='李四', id=50  │  │ name='王五', id=100 │
│ name='刘六', id=120 │  │ name='张三', id=1   │
└────────────────────┘  └────────────────────┘
      ← 双向链表 →            ← 双向链表 →
```

### 回表的过程

```sql
-- 查询：SELECT * FROM users WHERE name = '张三';

-- 第一步：在二级索引中查找 '张三'
--        → 找到 id=1
-- 第二步：用 id=1 回到聚簇索引查找
--        → 在聚簇索引中定位 id=1 的叶子节点
--        → 返回完整行数据
```

```
                        二级索引                  聚簇索引
                     ┌──────────┐             ┌──────────┐
                     │          │             │          │
                     │  name    │    回表     │    id    │
查询 WHERE name='张三' │  ↓       │ ─────────→ │    ↓     │
                     │  张三,id=1│             │  1,完整行│
                     │          │             │          │
                     └──────────┘             └──────────┘
```

::: danger 回表的代价
回表意味着**每找到一条匹配记录，就需要一次随机 IO** 去聚簇索引取数据。

```sql
-- 如果 name 列有 1000 条 name='张三' 的记录
SELECT * FROM users WHERE name = '张三';
-- 需要回表 1000 次，每次都是随机 IO！

-- 优化方案：覆盖索引（后面详述）
SELECT id, name FROM users WHERE name = '张三';
-- 如果 name 列上有索引 (name)，则不需要回表
```
:::

---

## 主键选择对聚簇索引的影响

主键的选择直接影响聚簇索引的物理存储布局，进而影响所有写入操作的性能。

### 自增主键：顺序写入

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2)
);

-- 每次 INSERT 都是追加到最后
INSERT INTO orders (user_id, amount) VALUES (1, 100);  -- id=1
INSERT INTO orders (user_id, amount) VALUES (2, 200);  -- id=2
INSERT INTO orders (user_id, amount) VALUES (3, 300);  -- id=3
```

```
页 1: [id=1] [id=2] [id=3] ...  ← 新记录追加到这里
页 2: [id=100] [id=101] ...
页 3: [id=200] [id=201] ...
```

**优点：**
- 顺序写入，几乎没有页分裂
- 写入性能最优
- 索引页空间利用率高（接近 100%）
- 缓存友好（最近写入的数据大概率在 Buffer Pool 中）

### UUID 主键：随机写入

```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50)
);
```

```
INSERT: id='a3f1...' → 可能插入到页 1 的中间
INSERT: id='7b2c...' → 可能插入到页 3 的中间
INSERT: id='e5d8...' → 可能插入到页 2 的中间
```

**后果：**
- 每次 INSERT 都可能插入到 B+ 树的中间位置
- 页满时发生页分裂，需要分配新页、移动数据
- 索引碎片率高（页内空间利用率可能只有 50-70%）
- 随机 IO 导致写入性能下降

```sql
-- 查看索引碎片
SELECT
    table_name,
    ROUND(data_length / 1024 / 1024, 2) AS data_mb,
    ROUND(index_length / 1024 / 1024, 2) AS index_mb,
    ROUND(data_free / 1024 / 1024, 2) AS fragmented_mb
FROM information_schema.TABLES
WHERE table_schema = 'mydb';
```

::: tip 碎片整理
如果已经使用 UUID 做主键导致碎片严重，可以通过重建表来整理：

```sql
-- 方式一：OPTIMIZE TABLE（会锁表）
OPTIMIZE TABLE users;

-- 方式二：ALTER TABLE（重建表）
ALTER TABLE users ENGINE=InnoDB;

-- 方式三：在线 DDL 工具
-- pt-online-schema-change 或 gh-ost
```
:::

---

## 索引覆盖 (Covering Index)

如果一个查询所需的所有列都包含在二级索引中，就不需要回表，这叫**索引覆盖**。

```sql
-- 假设有联合索引 (name, age)

-- 不覆盖：需要回表获取 email 列
SELECT id, name, age, email FROM users WHERE name = '张三';
-- Extra 中没有 "Using index"

-- 覆盖：name 和 age 都在索引中，id 是主键（二级索引自带主键）
SELECT id, name, age FROM users WHERE name = '张三';
-- Extra 中显示 "Using index"（表示覆盖索引）
```

```
EXPLAIN 输出：

id | select_type | table  | type | key              | Extra
---|-------------|--------|------|------------------|------------------
1  | SIMPLE      | users  | ref  | idx_name_age     | Using index
                                          ↑                 ↑
                                    使用了二级索引    所有列都在索引中，无需回表
```

::: tip 索引覆盖的性能提升
覆盖索引消除了回表的随机 IO，将查询从"索引查找 + N 次回表"变为"仅索引查找"，性能提升巨大。对于无法避免回表的大量记录查询，可考虑将高频查询的列加入索引以实现覆盖。
:::

---

## SHOW INDEX FROM 的输出解读

```sql
SHOW INDEX FROM orders\G
```

输出示例：

```
*************************** 1. row ***************************
        Table: orders
   Non_unique: 0                          -- 0=唯一索引, 1=非唯一索引
     Key_name: PRIMARY                    -- 索引名，PRIMARY 是主键索引
 Seq_in_index: 1                          -- 列在索引中的位置（从 1 开始）
  Column_name: id                         -- 列名
    Collation: A                          -- A=升序, NULL=未排序
  Cardinality: 1000000                    -- 索引的区分度估算（唯一值数量）
     Sub_part: NULL                       -- 前缀索引的长度，NULL 表示全列索引
       Packed: NULL                       -- 压缩方式
         Null:                            -- 是否允许 NULL
   Index_type: BTREE                      -- 索引类型（BTREE, HASH, FULLTEXT）
      Comment:
Index_comment:
*************************** 2. row ***************************
        Table: orders
   Non_unique: 1
     Key_name: idx_user_id
 Seq_in_index: 1
  Column_name: user_id
    Collation: A
  Cardinality: 50000                      -- 5 万个不同用户
     Sub_part: NULL
   Index_type: BTREE
*************************** 3. row ***************************
        Table: orders
   Non_unique: 1
     Key_name: idx_user_created
 Seq_in_index: 1                          -- 联合索引的第一列
  Column_name: user_id
    Collation: A
  Cardinality: 50000
*************************** 4. row ***************************
        Table: orders
   Non_unique: 1
     Key_name: idx_user_created
 Seq_in_index: 2                          -- 联合索引的第二列
  Column_name: created_at
    Collation: A
  Cardinality: 980000
```

### 关键字段解读

| 字段 | 含义 | 实际用途 |
|------|------|---------|
| `Non_unique` | 是否允许重复值 | 0=唯一索引，用于判断是否唯一约束 |
| `Key_name` | 索引名称 | PRIMARY=主键，其他为命名索引 |
| `Seq_in_index` | 列在索引中的顺序 | 判断联合索引的列顺序 |
| `Cardinality` | 基数（唯一值估算） | **关键指标**，值越大区分度越高 |
| `Sub_part` | 前缀索引长度 | NULL=全列索引，非空=只索引前 N 字符 |
| `Index_type` | 索引类型 | BTREE / HASH / FULLTEXT |

### Cardinality 的使用

Cardinality 是估算值，用于优化器判断索引的选择性：

```sql
-- 选择性 = Cardinality / 总行数
-- user_id 的选择性 = 50000 / 1000000 = 5%（不太好）
-- 如果只有 5 个不同值，选择性 = 5 / 1000000 ≈ 0（几乎没用）
-- 如果 Cardinality ≈ 总行数，选择性 ≈ 1（非常好，如主键）
```

```sql
-- 手动更新 Cardinality 统计信息（数据大量变更后）
ANALYZE TABLE orders;

-- 如果 Cardinality 不准确，优化器可能选错索引
SHOW INDEX FROM orders;  -- 查看 Cardinality 是否合理
```

::: warning Cardinality 不准确的后果
InnoDB 通过采样（默认 8 个页）来估算 Cardinality，不是精确值。如果数据分布极不均匀（如一个值占 90% 的数据），Cardinality 可能严重偏离真实值，导致优化器选错索引。

解决：`ANALYZE TABLE` 重新收集统计信息。
:::
