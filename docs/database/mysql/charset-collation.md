# 字符集与排序规则

## 字符集概览

字符集（Character Set）定义了字符与字节之间的映射关系。不同字符集支持不同的字符范围和编码方式。

| 字符集 | 单字符最大字节 | 支持字符范围 | 适用场景 |
|--------|-------------|-------------|---------|
| ASCII | 1 字节 | 英文、数字、控制字符 | 纯英文环境 |
| Latin1 | 1 字节 | 西欧语言字符 | 旧系统兼容 |
| GBK | 2 字节 | 中文简体 | 旧中文系统 |
| UTF-8 | 3 字节 | 大部分 Unicode 字符 | 通用场景（但 MySQL 中不完整） |
| UTF-8MB4 | 4 字节 | 完整 Unicode 字符 | **MySQL 推荐默认选择** |

---

## utf8 vs utf8mb4：MySQL 的历史遗留问题

这是 MySQL 中最容易踩的坑之一。

**标准的 UTF-8 编码**：每个字符使用 1-4 个字节，能表示所有 Unicode 字符。

**MySQL 的 `utf8`**：每个字符最多只用 3 个字节，实际上是 **UTF-8MB3**，无法表示 4 字节的 Unicode 字符。

这意味着 MySQL 的 `utf8` 字符集**无法存储以下字符**：
- Emoji 表情（如 😀🎉💯）
- 部分生僻汉字（如 𠀀 𠮷）
- 一些数学符号和特殊符号

```sql
-- 测试：utf8 字符集存储 emoji
CREATE TABLE test_utf8 (
    id INT PRIMARY KEY,
    content VARCHAR(100)
) DEFAULT CHARSET=utf8;

INSERT INTO test_utf8 VALUES (1, 'Hello 😀');
-- ERROR 1366: Incorrect string value: '\xF0\x9F\x98\x80' for column 'content' at row 1

-- 测试：utf8mb4 字符集存储 emoji
CREATE TABLE test_utf8mb4 (
    id INT PRIMARY KEY,
    content VARCHAR(100)
) DEFAULT CHARSET=utf8mb4;

INSERT INTO test_utf8mb4 VALUES (1, 'Hello 😀');
-- Query OK
```

::: danger 一律使用 utf8mb4
在 MySQL 8.0 中，`utf8mb4` 已经是默认字符集。但在 MySQL 5.x 中，默认可能是 `latin1` 或 `utf8`。

**建库时必须显式指定：**

```sql
CREATE DATABASE mydb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
:::

---

## COLLATION（排序规则）

COLLATION 定义了字符的**比较和排序规则**。同一个字符集可以有多种 COLLATION。

### 三种常见后缀

```sql
-- 查看 utf8mb4 支持的所有 COLLATION
SHOW COLLATION WHERE Charset = 'utf8mb4';
```

| 后缀 | 含义 | 比较方式 | 示例 |
|------|------|---------|------|
| `_ci` | Case Insensitive | 大小写不敏感 | `'alice' = 'Alice'` → TRUE |
| `_cs` | Case Sensitive | 大小写敏感 | `'alice' = 'Alice'` → FALSE |
| `_bin` | Binary | 二进制逐字节比较 | `'alice' = 'Alice'` → FALSE，且区分编码差异 |

**MySQL 默认的 utf8mb4 COLLATION 是 `utf8mb4_0900_ai_ci`（MySQL 8.0）或 `utf8mb4_general_ci`（MySQL 5.7）。**

### COLLATION 对查询的影响

```sql
-- 使用 utf8mb4_unicode_ci（大小写不敏感）
CREATE TABLE users_ci (
    name VARCHAR(50)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users_ci VALUES ('Alice'), ('Bob'), ('alice');

SELECT * FROM users_ci WHERE name = 'alice';
-- 结果：'Alice', 'alice' 都会被匹配到
```

```sql
-- 使用 utf8mb4_bin（二进制比较，大小写敏感）
CREATE TABLE users_bin (
    name VARCHAR(50)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

INSERT INTO users_bin VALUES ('Alice'), ('Bob'), ('alice');

SELECT * FROM users_bin WHERE name = 'alice';
-- 结果：只匹配 'alice'
```

```sql
-- 强制指定 COLLATION（不修改表结构）
SELECT * FROM users_ci WHERE name COLLATE utf8mb4_bin = 'alice';
```

::: warning COLLATION 不一致导致 JOIN 问题
当 JOIN 的两张表字段 COLLATION 不同时，MySQL 无法使用索引，会报错或产生隐式转换：

```sql
-- 如果 user.name 和 profile.username 的 COLLATION 不同
SELECT * FROM user u
JOIN profile p ON p.username = u.name;
-- Error: Illegal mix of collations
```

解决：统一 COLLATION，或在 JOIN 时显式指定 COLLATE。
:::

### ci_cs_bin 选择建议

| 场景 | 推荐 COLLATION | 原因 |
|------|--------------|------|
| 用户名、昵称 | `utf8mb4_0900_ai_ci` | 用户不区分大小写搜索 |
| 邮箱 | `utf8mb4_0900_ai_ci` | 邮箱地址不区分大小写 |
| 密码哈希 | `utf8mb4_bin` | 二进制精确匹配 |
| 代码标识符 | `utf8mb4_bin` | 精确匹配 |
| 排序展示 | `utf8mb4_unicode_ci` | 中文按拼音排序更准确 |

---

## 字符集的三级继承

MySQL 的字符集可以在三个层级设置，形成**继承关系**：

```
数据库级别 → 表级别 → 列级别
```

每个层级如果没有显式指定，就继承上一级的设置。

```sql
-- 数据库级别
CREATE DATABASE mydb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 表级别（继承数据库的 utf8mb4）
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 列级别（继承表的 utf8mb4，但中文字段用 utf8mb4_unicode_ci）
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin  -- 产品编码用二进制比较
);
```

**查看各级别的字符集设置：**

```sql
-- 查看数据库
SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'mydb';

-- 查看表
SELECT TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';

-- 查看列
SELECT CHARACTER_SET_NAME, COLLATION_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'name';
```

---

## 连接字符集

客户端与 MySQL 服务器通信时，涉及三个关键的字符集变量：

```
客户端 → character_set_client → character_set_connection → 存储
存储 → character_set_results → 客户端
```

### 三个关键变量

```sql
-- 查看当前连接的字符集设置
SHOW VARIABLES LIKE 'character_set_%';
```

| 变量 | 作用 |
|------|------|
| `character_set_client` | 告诉服务器：客户端发送的 SQL 语句是什么编码 |
| `character_set_connection` | 服务器内部处理 SQL 时使用的字符集 |
| `character_set_results` | 告诉客户端：服务器返回的结果是什么编码 |

### 连接时设置

```sql
-- 方式一：逐个设置
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;

-- 方式二：一个命令搞定
SET NAMES utf8mb4;
-- 等价于上面三个 SET 的组合
```

::: tip 实际项目中的配置
在连接数据库时（如 JDBC URL、Go 的 DSN）中统一设置字符集：

```
# JDBC
jdbc:mysql://localhost:3306/mydb?useUnicode=true&characterEncoding=UTF-8

# Go DSN
user:pass@tcp(localhost:3306)/mydb?charset=utf8mb4&collation=utf8mb4_unicode_ci
```

**同时确保客户端、连接层、数据库层三者字符集一致**，避免编码转换。
:::

---

## 字符集转换导致的乱码问题

乱码的本质是**编码和解码使用了不同的字符集**。

### 乱码的常见场景

#### 场景一：客户端编码与 character_set_client 不一致

```
客户端（UTF-8编码）发送： '中文'
     ↓
character_set_client = latin1（服务器以为是 latin1）
     ↓
服务器用 latin1 解码 UTF-8 字节 → 乱码
```

```sql
-- 模拟乱码
SET character_set_client = latin1;
SET character_set_results = latin1;

-- 客户端用 UTF-8 编码发送 '中文'
INSERT INTO test_table (content) VALUES ('中文');
-- 存入数据库的就是乱码
```

#### 场景二：表字符集与连接字符集不一致

```sql
-- 表是 latin1
CREATE TABLE old_table (
    content VARCHAR(100)
) DEFAULT CHARSET=latin1;

INSERT INTO old_table VALUES ('中文数据');

-- 用 utf8mb4 连接读取
SET NAMES utf8mb4;
SELECT * FROM old_table;
-- 结果乱码：服务器把 latin1 的数据用 utf8mb4 解码返回
```

#### 场景三：跨字符集 JOIN

```sql
-- 表 A 是 latin1
CREATE TABLE old_users (
    name VARCHAR(50)
) DEFAULT CHARSET=latin1;

-- 表 B 是 utf8mb4
CREATE TABLE new_users (
    name VARCHAR(50)
) DEFAULT CHARSET=utf8mb4;

-- JOIN 时需要字符集转换
SELECT * FROM old_users o
JOIN new_users n ON n.name = o.name;
-- 会发生隐式转换，性能下降且可能结果不正确
```

### 乱码修复

```sql
-- 方案一：修改表字符集（需要重建表）
ALTER TABLE old_table CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 方案二：逐列修改
ALTER TABLE old_table
MODIFY content VARCHAR(100)
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 方案三：如果数据本身编码正确，只是字段声明错误
-- 先备份，然后修改字符集声明
ALTER TABLE old_table MODIFY content VARCHAR(100) CHARACTER SET utf8mb4;
```

::: danger 修复乱码的注意事项
1. **先备份数据**：修改字符集可能造成数据丢失
2. **确认数据实际编码**：如果数据本身就是乱码存储的，修改字符集声明不会修复数据
3. **CONVERT vs MODIFY**：
   - `CONVERT TO CHARACTER SET` 会进行编码转换（latin1 → utf8mb4，数据被重新编码）
   - `MODIFY ... CHARACTER SET` 只修改字段声明，不转换已有数据
4. **线上大表操作**：`ALTER TABLE` 会锁表，大表使用 `pt-online-schema-change` 或 `gh-ost` 在线DDL
:::

### 防止乱码的最佳实践

```sql
-- 1. 创建数据库时统一用 utf8mb4
CREATE DATABASE myapp DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 连接后立即执行
SET NAMES utf8mb4;

-- 3. 检查当前字符集状态
SHOW VARIABLES LIKE 'character_set_%';
/*
+--------------------------+---------+
| Variable_name            | Value   |
+--------------------------+---------+
| character_set_client     | utf8mb4 |
| character_set_connection | utf8mb4 |
| character_set_database   | utf8mb4 |
| character_set_results    | utf8mb4 |
| character_set_server     | utf8mb4 |
+--------------------------+---------+
*/
```
