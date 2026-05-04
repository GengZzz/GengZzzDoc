# 数据类型

MySQL 的数据类型选择直接影响存储空间、查询性能、数据精度和索引效率。选错类型不仅浪费存储，还可能导致精度丢失、查询无法使用索引等严重问题。本文将深入剖析每种数据类型的内部存储机制、取值范围、适用场景及常见陷阱。

## 整型

整型用于存储整数值，MySQL 提供 5 种整型类型，区别在于存储空间和取值范围。

### 类型对比

| 类型 | 存储空间 | 有符号范围 | 无符号范围（UNSIGNED） |
|------|----------|-----------|----------------------|
| TINYINT | 1 字节 | -128 ~ 127 | 0 ~ 255 |
| SMALLINT | 2 字节 | -32768 ~ 32767 | 0 ~ 65535 |
| MEDIUMINT | 3 字节 | -8388608 ~ 8388607 | 0 ~ 16777215 |
| INT | 4 字节 | -2^31 ~ 2^31-1 | 0 ~ 2^32-1 (约 42 亿) |
| BIGINT | 8 字节 | -2^63 ~ 2^63-1 | 0 ~ 2^64-1 |

### 实际用法

```sql
CREATE TABLE product_types (
    -- 状态/枚举值：取值范围小，用 TINYINT
    status      TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0下架 1上架 2审核中',
    -- 排序权重：一般不会太大，SMALLINT 足够
    sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    -- 自增主键：用 BIGINT 避免用尽风险
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    -- 库存量：INT UNSIGNED 上限 42 亿，对大多数场景够用
    stock       INT UNSIGNED NOT NULL DEFAULT 0
);
```

### UNSIGNED 的意义

`UNSIGNED` 将整型的取值范围从"有符号"变为"无符号"（不允许负值），同时将上限翻倍。

```sql
-- 有符号：-2147483648 ~ 2147483647
column1 INT;

-- 无符号：0 ~ 4294967295（上限翻倍，但不能存负数）
column2 INT UNSIGNED;
```

::: tip 什么时候用 UNSIGNED
当列值永远不会为负数时（如自增主键、年龄、数量、状态码），使用 `UNSIGNED` 可以将上限翻倍。但要注意：两个 UNSIGNED 值相减，如果结果为负，会触发溢出错误（除非 `sql_mode` 中未启用 `NO_UNSIGNED_SUBTRACTION`）。

```sql
SET sql_mode = 'NO_UNSIGNED_SUBTRACTION';
SELECT CAST(5 AS UNSIGNED) - CAST(10 AS UNSIGNED);  -- 不设置 sql_mode 则报错
```
:::

::: warning 不要在整型上指定显示宽度
`INT(11)` 中的 `(11)` 不是存储限制，只是配合 `ZEROFILL` 使用时的显示宽度。MySQL 8.0.17 已弃用整型的显示宽度语法。如果需要限制值的范围，使用应用层校验或 `CHECK` 约束。
:::

## 浮点型

浮点型用于存储带小数点的数值。MySQL 提供三种类型：`FLOAT`、`DOUBLE`、`DECIMAL`，它们的精度特性完全不同。

### 类型对比

| 类型 | 存储空间 | 精度 | 适用场景 |
|------|----------|------|----------|
| FLOAT | 4 字节 | 单精度（约 7 位有效数字） | 科学计算、允许精度损失的场景 |
| DOUBLE | 8 字节 | 双精度（约 15 位有效数字） | 科学计算、统计数据 |
| DECIMAL(M,D) | 按需计算 | 精确到 M 位数字，其中 D 位小数 | 金额、利率、任何需要精确计算的场景 |

### DECIMAL 的存储机制

`DECIMAL(M, D)` 中 `M` 是总位数（最大 65），`D` 是小数位数（最大 30）。

```sql
-- DECIMAL(10, 2)：总共 10 位数字，其中 2 位小数
-- 可表示范围：-99999999.99 ~ 99999999.99
price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
```

DECIMAL 实际上将每个数字以二进制形式精确存储（每 9 个十进制数字占用 4 字节），不存在浮点型的精度问题。

```sql
-- DECIMAL 存储空间计算
DECIMAL(10, 2)  -- 整数部分 8 位 + 小数部分 2 位 = 10 位
                -- 10 位数字需要 ceil(10/9)*4 = 8 字节（含符号位）

DECIMAL(18, 4)  -- 18 位数字需要 ceil(18/9)*4 = 8 字节

DECIMAL(20, 6)  -- 20 位数字需要 ceil(20/9)*4 = 12 字节
```

### 浮点精度问题

```sql
-- 经典精度丢失问题
CREATE TABLE test_float (
    f FLOAT,
    d DECIMAL(10, 2)
);

INSERT INTO test_float VALUES (0.1 + 0.2, 0.1 + 0.2);

SELECT f, d, f = 0.3 FROM test_float;
-- f 可能显示 0.30000001192092896，f = 0.3 的结果为 0（false）
-- d 精确显示 0.30
```

::: danger 金额必须用 DECIMAL
**永远不要用 FLOAT 或 DOUBLE 存储金额**。浮点型的二进制存储无法精确表示大多数十进制小数，多次计算后误差会累积。财务系统中哪怕 1 分钱的偏差都可能导致严重问题。

```sql
-- 正确
amount DECIMAL(10, 2);

-- 绝对不要这样做
amount FLOAT;
amount DOUBLE;
```
:::

## 字符串类型

### CHAR vs VARCHAR

这是 MySQL 中最常被误解的数据类型选择之一。

| 特性 | CHAR(N) | VARCHAR(N) |
|------|---------|------------|
| 最大长度 | 255 字符 | 65535 字节（行总长度限制） |
| 存储方式 | 固定长度，不足补空格 | 变长，使用 1-2 字节前缀记录实际长度 |
| 适用场景 | 长度固定或变化极小（MD5、SHA256、状态码） | 长度可变（用户名、地址、标题） |
| 尾部空格 | 插入时自动去除，查询时补回 | 保留尾部空格 |
| 存储效率 | 短字符串浪费空间 | 按实际长度存储，更节省空间 |
| 内存分配 | 预分配固定大小 | 按实际大小分配 |

```sql
-- CHAR 的存储（定长 10 字节）
-- 插入 'abc'，实际存储 'abc       '（补 7 个空格）
col CHAR(10);

-- VARCHAR 的存储
-- 插入 'abc'，实际存储：1 字节长度前缀 + 'abc' = 4 字节
-- 在 MySQL 8.0 utf8mb4 下，VARCHAR(10) 最多需要 1 + 10*4 = 41 字节
col VARCHAR(10);
```

::: tip CHAR 与 VARCHAR 的性能特点
- CHAR 因为定长，不需要长度前缀，随机读写性能略好，且不会产生行碎片
- VARCHAR 节省存储空间，但行数据变长可能导致行迁移（行扩展时原位置放不下）
- 对于长度固定的数据（如手机号 11 位、身份证号 18 位、UUID 36 位），CHAR 和 VARCHAR 性能差异极小，现代 MySQL 优化器处理得很好
- 实际选型中，VARCHAR 的适用面更广
:::

### TEXT 系列

TEXT 用于存储大文本数据，不计入行长度限制（存储在独立的溢出页中）。

| 类型 | 最大长度 | 存储空间 |
|------|----------|----------|
| TINYTEXT | 255 字节 | 1 字节长度前缀 + 实际数据 |
| TEXT | 65,535 字节（约 64 KB） | 2 字节长度前缀 + 实际数据 |
| MEDIUMTEXT | 16,777,215 字节（约 16 MB） | 3 字节长度前缀 + 实际数据 |
| LONGTEXT | 4,294,967,295 字节（约 4 GB） | 4 字节长度前缀 + 实际数据 |

### BLOB 系列

BLOB 用于存储二进制数据（图片、文件等），长度限制与 TEXT 系列对应：`TINYBLOB`、`BLOB`、`MEDIUMBLOB`、`LONGBLOB`。

::: warning 不建议在数据库中存储文件
虽然可以用 BLOB 存储图片和文件，但在数据库中存储大文件会严重增加数据库体积，影响备份和恢复速度。生产环境中应将文件存储在对象存储（如 MinIO、AWS S3、阿里云 OSS）中，数据库只保存文件路径或 URL。
:::

## 日期时间类型

MySQL 提供多种日期时间类型，选择错误可能导致时区问题、2038 年问题或精度损失。

### 类型对比

| 类型 | 存储空间 | 格式 | 范围 | 精度 |
|------|----------|------|------|------|
| DATE | 3 字节 | YYYY-MM-DD | 1000-01-01 ~ 9999-12-31 | 日 |
| TIME | 3 字节 | HH:MM:SS | -838:59:59 ~ 838:59:59 | 秒 |
| DATETIME | 8 字节 | YYYY-MM-DD HH:MM:SS | 1000-01-01 ~ 9999-12-31 | 微秒（MySQL 5.6.4+） |
| TIMESTAMP | 4 字节 | YYYY-MM-DD HH:MM:SS | 1970-01-01 ~ 2038-01-19 | 微秒（MySQL 5.6.4+） |
| YEAR | 1 字节 | YYYY | 1901 ~ 2155 | 年 |

### DATETIME vs TIMESTAMP

这是最常被混淆的两个类型，核心区别在于**时区处理**：

```sql
-- 假设服务器时区为 UTC+8
SET time_zone = '+08:00';

CREATE TABLE time_test (
    dt DATETIME,
    ts TIMESTAMP
);

INSERT INTO time_test VALUES ('2024-06-15 10:00:00', '2024-06-15 10:00:00');

-- 查看数据
SELECT dt, ts FROM time_test;
-- dt: 2024-06-15 10:00:00
-- ts: 2024-06-15 10:00:00

-- 切换时区
SET time_zone = '+00:00';

SELECT dt, ts FROM time_test;
-- dt: 2024-06-15 10:00:00  （不变，存什么就显示什么）
-- ts: 2024-06-15 02:00:00  （自动转换为 UTC 显示）
```

| 特性 | DATETIME | TIMESTAMP |
|------|----------|-----------|
| 时区感知 | 否（存什么就是什么） | 是（存入时转 UTC，读出时转当前时区） |
| 存储空间 | 8 字节 | 4 字节 |
| 范围 | 1000 ~ 9999 年 | 1970 ~ 2038 年 |
| 默认值 | 需手动设置 `DEFAULT CURRENT_TIMESTAMP` | 同左，且可自动更新 |
| 适用场景 | 不需要时区转换的数据（生日、合同到期日） | 需要全球统一时间戳的数据（创建时间、更新时间） |

### 自动更新时间戳

```sql
CREATE TABLE articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### TIMESTAMP 2038 问题

`TIMESTAMP` 底层存储的是 Unix 时间戳（从 1970-01-01 00:00:00 UTC 起的秒数），使用 4 字节有符号整数存储，最大值为 `2147483647`，对应 `2038-01-19 03:14:07 UTC`。超过这个时间点将溢出。

::: warning 2038 年问题应对
如果业务涉及 2038 年之后的时间，必须使用 `DATETIME` 而非 `TIMESTAMP`。例如合同到期日、保险到期日、长期会员有效期等。MySQL 社区正在讨论扩展 TIMESTAMP 范围，但截至 MySQL 8.0，此限制仍然存在。
:::

## ENUM 和 SET

### ENUM

`ENUM` 是字符串对象，列值只能是预定义列表中的一个。内部使用整数索引存储（1-2 字节），比直接存储字符串更节省空间。

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled')
        NOT NULL DEFAULT 'pending'
);

-- 插入：可以用字符串值或整数索引
INSERT INTO orders (status) VALUES ('paid');      -- 字符串方式
INSERT INTO orders (status) VALUES (3);           -- 索引方式（'shipped'，从 1 开始）

-- 查询：按定义顺序排序
SELECT * FROM orders ORDER BY status;  -- pending < paid < shipped < completed < cancelled
```

**ENUM 的优缺点：**

| 优点 | 缺点 |
|------|------|
| 存储高效（1-2 字节 vs VARCHAR 的可变长度） | 修改枚举值需要 ALTER TABLE（大表锁表） |
| 值域可控，防止非法值 | 只能存储字符串，不能存储复杂数据 |
| 按定义顺序自然排序 | 增加新值可能导致线上问题（索引位置变更） |

::: warning ENUM 的坑
ENUM 的值按定义顺序编号（从 1 开始），`ALTER TABLE` 追加新值是安全的（在末尾加），但在中间插入新值会导致后续值的编号变化。如果应用代码中使用了整数索引操作 ENUM（如 `status = 2`），在中间插入新值后会导致数据错乱。**强烈建议只用字符串值操作 ENUM，不要用整数索引。**
:::

### SET

`SET` 与 `ENUM` 类似，但允许多选（最多 64 个选项），内部使用位图存储。

```sql
CREATE TABLE user_permissions (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    permissions SET('read', 'write', 'delete', 'admin', 'export') NOT NULL DEFAULT ''
);

-- 插入多个权限（逗号分隔）
INSERT INTO user_permissions VALUES (1, 'read,write,export');

-- 使用 FIND_IN_SET 查询
SELECT * FROM user_permissions WHERE FIND_IN_SET('admin', permissions);

-- 使用位运算查询
SELECT * FROM user_permissions WHERE permissions & 4;  -- 4 = 'delete' 的位值
```

## JSON 类型

MySQL 5.7 引入原生 `JSON` 数据类型，提供对半结构化数据的存储和查询支持。JSON 列内部以二进制格式存储（不是纯文本），支持高效的键值查找和部分更新。

### 基本操作

```sql
CREATE TABLE user_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    profile JSON NOT NULL DEFAULT '{}'
);

-- 插入 JSON 数据
INSERT INTO user_profiles (username, profile) VALUES (
    'zhangsan',
    JSON_OBJECT(
        'age', 28,
        'city', 'Beijing',
        'skills', JSON_ARRAY('Java', 'Python', 'MySQL'),
        'address', JSON_OBJECT('street', 'Zhongguancun', 'zip', '100080')
    )
);

-- 使用 JSON 函数查询
SELECT
    username,
    JSON_EXTRACT(profile, '$.age') AS age,
    JSON_EXTRACT(profile, '$.city') AS city,
    profile->'$.skills[0]' AS first_skill,       -- -> 是 JSON_EXTRACT 的简写
    profile->>'$.address.street' AS street        -- ->> 是 JSON_UNQUOTE(JSON_EXTRACT(...)) 的简写
FROM user_profiles;

-- WHERE 条件中使用 JSON
SELECT * FROM user_profiles WHERE profile->>'$.city' = 'Beijing';

-- JSON_CONTAINS：检查 JSON 数组是否包含指定值
SELECT * FROM user_profiles WHERE JSON_CONTAINS(profile->'$.skills', '"MySQL"');

-- JSON_SEARCH：在 JSON 中搜索值
SELECT JSON_SEARCH(profile, 'one', 'Python') FROM user_profiles;
```

### 修改 JSON 数据

```sql
-- 设置单个键值
UPDATE user_profiles
SET profile = JSON_SET(profile, '$.age', 29, '$.email', 'zs@example.com')
WHERE username = 'zhangsan';

-- 移除键
UPDATE user_profiles
SET profile = JSON_REMOVE(profile, '$.email')
WHERE username = 'zhangsan';

-- 数组操作：追加元素
UPDATE user_profiles
SET profile = JSON_ARRAY_APPEND(profile, '$.skills', 'Go')
WHERE username = 'zhangsan';

-- 替换值（仅在键已存在时生效）
UPDATE user_profiles
SET profile = JSON_REPLACE(profile, '$.city', 'Shanghai')
WHERE username = 'zhangsan';
```

### JSON 索引

JSON 列不能直接创建索引，但可以通过**虚拟列（Generated Column）+ 索引**间接实现：

```sql
-- 添加虚拟列，提取 JSON 中的 city 字段
ALTER TABLE user_profiles
ADD COLUMN city VARCHAR(50) GENERATED ALWAYS AS (profile->>'$.city') VIRTUAL;

-- 在虚拟列上创建索引
ALTER TABLE user_profiles ADD INDEX idx_city (city);

-- 查询现在可以使用索引
SELECT * FROM user_profiles WHERE city = 'Beijing';
```

::: tip JSON 的适用场景
JSON 类型适合存储半结构化数据（用户配置、表单动态字段、API 响应缓存），但不适合替代关系模型。如果数据有固定的结构和查询模式，使用规范化表设计（列存储）性能更优。JSON 更多用于存储不频繁查询的辅助数据。
:::

## 类型选择最佳实践

### 选择原则

1. **尽量选择最小够用的类型**：`TINYINT` 够用就不要用 `INT`，节省存储和内存
2. **尽量声明 `NOT NULL`**：NULL 值需要额外存储空间，且使索引和比较逻辑更复杂
3. **金额用 `DECIMAL`**：永不使用 `FLOAT`/`DOUBLE` 存储金额
4. **时间选型明确**：需要时区转换用 `TIMESTAMP`，不需要用 `DATETIME`，注意 2038 限制
5. **字符串按需选择**：固定长度用 `CHAR`，可变长度用 `VARCHAR`，大文本用 `TEXT`
6. **避免过度使用 ENUM**：值域经常变化的字段不适合用 ENUM，改用关联表

### 常见踩坑记录

| 坑 | 说明 | 正确做法 |
|----|------|----------|
| 用 VARCHAR 存储日期 | 无法使用日期函数，无法用日期索引范围扫描 | 使用 DATE / DATETIME |
| 用 VARCHAR 存储 IP 地址 | 浪费空间，无法进行 IP 范围查询 | 使用 `INET_ATON()`/`INET_NTOA()` + INT UNSIGNED |
| 用 FLOAT 存储金额 | 精度丢失，计算误差累积 | 使用 DECIMAL |
| 用 INT 存储布尔值 | 浪费 3 字节 | 使用 TINYINT(1) 或 BIT(1) |
| VARCHAR(5000) 不分表 | 单行长度接近 65535 字节限制时，无法再添加列 | 合理规划列长度，大字段拆分到扩展表 |

```sql
-- IP 地址的正确存储方式
CREATE TABLE access_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_int INT UNSIGNED NOT NULL,    -- 存储为整数
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入时转换
INSERT INTO access_log (ip_int) VALUES (INET_ATON('192.168.1.100'));

-- 查询时转换回可读格式
SELECT INET_NTOA(ip_int) AS ip_address FROM access_log;

-- 范围查询（查找某个网段）
SELECT INET_NTOA(ip_int) AS ip_address
FROM access_log
WHERE ip_int BETWEEN INET_ATON('192.168.1.0') AND INET_ATON('192.168.1.255');
```
