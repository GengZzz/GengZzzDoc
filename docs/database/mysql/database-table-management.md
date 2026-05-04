# 数据库与表管理

MySQL 中，数据库是表、视图、存储过程等对象的逻辑容器，而表是数据存储的核心单元。理解数据库和表的创建、修改、删除操作，以及临时表、复制表等高级用法，是数据库管理员和开发者的基本功。本文将系统讲解数据库与表的全生命周期管理。

## 数据库操作

### 创建数据库

```sql
-- 基本语法
CREATE DATABASE mydb;

-- 指定字符集和排序规则
CREATE DATABASE mydb
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 如果不存在则创建（幂等操作，脚本中常用）
CREATE DATABASE IF NOT EXISTS mydb
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

### 查看数据库

```sql
-- 查看所有数据库
SHOW DATABASES;

-- 使用通配符过滤
SHOW DATABASES LIKE 'my%';

-- 查看数据库的创建语句（确认字符集、排序规则等配置）
SHOW CREATE DATABASE mydb;
```

### 选择数据库

```sql
-- 切换当前数据库
USE mydb;

-- 查看当前所在数据库
SELECT DATABASE();
```

### 修改数据库

```sql
-- 修改数据库字符集（不影响已有表和列，只影响新创建的对象）
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- MySQL 8.0.4+ 支持修改数据库名称（通过 ALTER DATABASE ... MODIFY NAME）
-- 但更安全的方式是：创建新数据库 → 导出导入数据 → 删除旧数据库
```

### 删除数据库

```sql
-- 删除数据库（不可恢复！）
DROP DATABASE mydb;

-- 安全写法
DROP DATABASE IF EXISTS mydb;
```

::: danger DROP DATABASE 风险
`DROP DATABASE` 会删除该数据库下的所有表、视图、存储过程等对象，且**不可回滚**。即使在事务中执行，InnoDB 也会隐式提交。生产环境强烈建议禁用此命令，必须操作时先进行全量备份。
:::

## 表操作

### CREATE TABLE 基本语法

```sql
CREATE TABLE [IF NOT EXISTS] table_name (
    column_name data_type [NOT NULL] [DEFAULT value] [AUTO_INCREMENT]
        [PRIMARY KEY] [UNIQUE] [COMMENT '注释'],
    ...
    [PRIMARY KEY (col1, col2)],
    [UNIQUE KEY index_name (col1, col2)],
    [KEY index_name (col1, col2)],
    [CONSTRAINT fk_name FOREIGN KEY (col) REFERENCES other_table(col)]
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表注释';
```

完整示例：

```sql
CREATE TABLE IF NOT EXISTS `orders` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    `user_id`     BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    `order_no`    VARCHAR(32) NOT NULL COMMENT '订单编号',
    `amount`      DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '订单金额',
    `status`      TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0待支付 1已支付 2已取消',
    `remark`      VARCHAR(500) DEFAULT NULL COMMENT '备注',
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';
```

### 删除表

```sql
-- 删除单个表
DROP TABLE orders;

-- 安全写法
DROP TABLE IF EXISTS orders;

-- 同时删除多个表
DROP TABLE IF EXISTS orders, order_items, temp_reports;
```

### 清空表

```sql
-- TRUNCATE：清空表数据，重置 AUTO_INCREMENT
TRUNCATE TABLE orders;
```

`TRUNCATE` 与 `DELETE FROM table` 的本质区别：

| 特性 | TRUNCATE | DELETE（无 WHERE） |
|------|----------|---------------------|
| 类型 | DDL 操作 | DML 操作 |
| 事务回滚 | 不可回滚（隐式提交） | 可回滚 |
| AUTO_INCREMENT | 重置为初始值 | 不重置 |
| 触发器 | 不触发 DELETE 触发器 | 触发 |
| 删除方式 | 直接重建表（drop + create） | 逐行删除 |
| 速度 | 极快（与数据量无关） | 慢（与数据量成正比） |
| 返回值 | 不返回受影响行数 | 返回受影响行数 |

### 重命名表

```sql
-- 单个表重命名
RENAME TABLE old_name TO new_name;

-- 跨数据库移动表
RENAME TABLE db1.orders TO db2.orders;

-- 同时重命名多个表
RENAME TABLE
    old_orders TO orders_archive,
    old_users TO users_archive;
```

## 查看表结构

```sql
-- 方法 1：DESCRIBE（最常用）
DESCRIBE orders;
DESC orders;             -- 简写

-- 方法 2：SHOW COLUMNS（支持通配符过滤）
SHOW COLUMNS FROM orders;
SHOW FULL COLUMNS FROM orders;       -- 显示完整信息（包括 Collation、Privileges、Comment）
SHOW COLUMNS FROM orders LIKE '%id%';-- 过滤列名

-- 方法 3：SHOW CREATE TABLE（查看完整建表语句）
SHOW CREATE TABLE orders;
SHOW CREATE TABLE orders\G           -- 垂直显示，更适合阅读长语句

-- 方法 4：通过 INFORMATION_SCHEMA 查询（适合脚本化）
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mydb'
    AND TABLE_NAME = 'orders'
ORDER BY ORDINAL_POSITION;
```

```sql
-- 查看表的索引信息
SHOW INDEX FROM orders;

-- 查看表状态（行数估算、数据大小、索引大小等）
SHOW TABLE STATUS LIKE 'orders';

-- 通过 INFORMATION_SCHEMA 获取更详细的状态
SELECT
    TABLE_NAME,
    ENGINE,
    TABLE_ROWS,              -- 行数估算（InnoDB 中不精确）
    DATA_LENGTH / 1024 / 1024 AS data_mb,
    INDEX_LENGTH / 1024 / 1024 AS index_mb,
    CREATE_OPTIONS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY DATA_LENGTH DESC;
```

## 临时表

临时表仅在当前数据库会话中存在，会话结束时自动删除。它适合存放中间计算结果，避免污染正式表。

```sql
-- 创建临时表
CREATE TEMPORARY TABLE temp_user_stats (
    user_id BIGINT NOT NULL,
    order_count INT DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB;

-- 像普通表一样使用
INSERT INTO temp_user_stats
SELECT user_id, COUNT(*), SUM(amount)
FROM orders
WHERE status = 1
GROUP BY user_id;

-- 查询
SELECT u.username, t.order_count, t.total_amount
FROM users u
JOIN temp_user_stats t ON u.id = t.user_id
ORDER BY t.total_amount DESC
LIMIT 20;

-- 会话结束后临时表自动消失，也可手动删除
DROP TEMPORARY TABLE IF EXISTS temp_user_stats;
```

::: tip 临时表特性
- 临时表只对创建它的会话可见，不同会话可以创建同名临时表
- 临时表与普通表同名时，临时表优先（会屏蔽同名普通表）
- 临时表不支持外键、全文索引和分区
- `SHOW TABLES` 不会显示临时表
- 使用 `MEMORY` 引擎的临时表存储在内存中，适合小数据量高速访问
:::

## 复制表

MySQL 没有直接的 `COPY TABLE` 语法，但可以通过以下方式实现表复制。

### CREATE TABLE ... LIKE

复制表结构（包括索引、分区定义），但不复制数据。

```sql
-- 复制表结构
CREATE TABLE orders_backup LIKE orders;

-- 插入数据（复制数据）
INSERT INTO orders_backup SELECT * FROM orders;
```

::: tip LIKE 方式的特点
- 复制完整的表结构，包括所有索引、列定义
- **不复制**外键约束、AUTO_INCREMENT 值、分区数据
- 不复制数据，需手动 INSERT ... SELECT
- 源表和目标表的表结构完全独立，后续互不影响
:::

### CREATE TABLE ... SELECT

通过查询结果直接创建新表，同时复制结构和数据。

```sql
-- 复制结构和数据
CREATE TABLE orders_2024 AS
SELECT * FROM orders WHERE YEAR(created_at) = 2024;
```

::: warning CREATE TABLE ... SELECT 的坑
这种方式创建的表**会丢失**以下内容：
- 主键定义（如果没有在 SELECT 中明确包含）
- 索引（除了一些特殊情况）
- AUTO_INCREMENT 属性
- 外键约束
- 默认值（DEFAULT）

适合快速创建临时分析表，但不适合精确复制表结构。创建后需要手动补全索引和约束。
:::

```sql
-- 更安全的写法：使用 LIKE + INSERT 组合
CREATE TABLE orders_backup LIKE orders;
INSERT INTO orders_backup SELECT * FROM orders;
```

### 跨数据库复制

```sql
-- 在目标数据库创建表结构
CREATE TABLE target_db.orders LIKE source_db.orders;

-- 复制数据
INSERT INTO target_db.orders SELECT * FROM source_db.orders;
```

## AUTO_INCREMENT 机制

`AUTO_INCREMENT` 是 MySQL 自动为新行生成唯一递增整数值的机制，通常用于主键。

### 基本用法

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 插入时不需要指定 id
INSERT INTO users (username) VALUES ('zhangsan');
INSERT INTO users (username) VALUES ('lisi');

-- 查看自增值
SELECT LAST_INSERT_ID();         -- 当前会话最后一次插入生成的 ID
SELECT AUTO_INCREMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'users';  -- 下一个自增值
```

### 自增锁机制

MySQL 8.0 前后，AUTO_INCREMENT 的锁策略有显著区别：

| 版本 | 锁策略 | 并发性能 |
|------|--------|----------|
| MySQL 5.7 及以前 | 表级 `AUTO-INC` 锁（默认 `innodb_autoinc_lock_mode = 1`） | 批量插入时可能有锁竞争 |
| MySQL 8.0 | 轻量级互斥锁（`innodb_autoinc_lock_mode = 2`） | 高并发下性能更好 |

```sql
-- 查看当前锁模式
SHOW VARIABLES LIKE 'innodb_autoinc_lock_mode';

-- innodb_autoinc_lock_mode 值说明：
-- 0: 传统模式，所有 INSERT 都使用表级 AUTO-INC 锁
-- 1: 混合模式，简单插入用轻量锁，批量插入用表级锁（MySQL 5.7 默认）
-- 2: 交错模式，所有插入都用轻量锁（MySQL 8.0 默认，复制安全需配合 row 格式）
```

### 重置自增值

```sql
-- 将自增值重设为指定值
ALTER TABLE users AUTO_INCREMENT = 1000;

-- 注意：新值必须大于当前表中最大 ID 值
-- 如果表中最大 ID 是 5000，设置 AUTO_INCREMENT = 1000 无效，MySQL 会自动设为 5001
```

### AUTO_INCREMENT 注意事项

```sql
-- 删除最大 ID 的行后，自增 ID 不会回退
DELETE FROM users WHERE id = 100;
INSERT INTO users (username) VALUES ('new_user');  -- 这条的 ID 是 101，不是 100

-- 手动指定自增列的值（不推荐，可能导致自增冲突）
INSERT INTO users (id, username) VALUES (50, 'manual_id');

-- 如果手动插入的值大于当前自增值，自增值会自动调整
-- 当前自增 = 100，手动插入 id = 200，则下次自增从 201 开始
```

::: warning AUTO_INCREMENT 用尽问题
当自增列达到其数据类型上限时，再次插入会报 `Duplicate entry for key 'PRIMARY'` 错误。例如 `INT UNSIGNED` 的上限是 `4294967295`（约 42 亿）。对于高写入量的表，建议使用 `BIGINT UNSIGNED`（上限约 1844 亿亿）作为自增列类型。
:::
