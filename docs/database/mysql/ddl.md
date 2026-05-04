# DDL 数据定义语言

DDL（Data Definition Language）用于定义和管理数据库的结构对象，包括表、索引、视图等。DDL 操作在 MySQL 中大多会触发表结构变更，直接影响数据字典和存储引擎的元数据。本文将深入讲解 CREATE TABLE 完整语法、约束体系、ALTER TABLE 的各种操作以及大表 DDL 的生产实践。

## CREATE TABLE 完整语法

### 完整语法结构

```sql
CREATE [TEMPORARY] TABLE [IF NOT EXISTS] table_name (
    -- 列定义
    col_name data_type
        [NOT NULL | NULL]
        [DEFAULT {literal | (expr)}]
        [AUTO_INCREMENT]
        [UNIQUE [KEY]] | [[PRIMARY] KEY]
        [COMMENT 'string']
        [COLLATE collation_name]
        [COLUMN_FORMAT {FIXED|DYNAMIC|DEFAULT}]
        [ENGINE_ATTRIBUTE [=] 'string']
        [SECONDARY_ENGINE_ATTRIBUTE [=] 'string']
        [GENERATED ALWAYS AS (expr) [VIRTUAL | STORED]]
        [reference_definition],

    -- 约束定义
    [PRIMARY KEY (col_list)],
    [KEY [index_name] (col_list)],
    [UNIQUE [KEY] [index_name] (col_list)],
    [FULLTEXT [KEY] [index_name] (col_list)],
    [SPATIAL [KEY] [index_name] (col_list)],
    [CONSTRAINT [symbol]] FOREIGN KEY (col_list) REFERENCES ...

) [table_options]
  [partition_options];
```

### 列定义示例

```sql
CREATE TABLE `employees` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT
        COMMENT '员工ID',

    `name`        VARCHAR(50) NOT NULL
        COMMENT '姓名',

    `email`       VARCHAR(100) NOT NULL
        COMMENT '邮箱',

    `phone`       CHAR(11) DEFAULT NULL
        COMMENT '手机号',

    `department`  VARCHAR(50) NOT NULL DEFAULT '未分配'
        COMMENT '部门',

    `salary`      DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT '月薪',

    `gender`      ENUM('M', 'F', 'O') NOT NULL DEFAULT 'O'
        COMMENT '性别',

    `hire_date`   DATE NOT NULL
        COMMENT '入职日期',

    `is_active`   TINYINT UNSIGNED NOT NULL DEFAULT 1
        COMMENT '是否在职',

    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        COMMENT '创建时间',

    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        COMMENT '更新时间',

    -- 虚拟列示例：从 email 中提取域名
    `email_domain` VARCHAR(50) GENERATED ALWAYS AS (
        SUBSTRING_INDEX(email, '@', -1)
    ) VIRTUAL COMMENT '邮箱域名',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_email` (`email`),
    KEY `idx_department` (`department`),
    KEY `idx_hire_date` (`hire_date`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  AUTO_INCREMENT=1000
  COMMENT='员工表';
```

### 表选项说明

| 选项 | 说明 | 推荐值 |
|------|------|--------|
| ENGINE | 存储引擎 | InnoDB（默认，支持事务） |
| DEFAULT CHARSET | 默认字符集 | utf8mb4 |
| COLLATE | 排序规则 | utf8mb4_unicode_ci（通用排序）或 utf8mb4_0900_ai_ci（MySQL 8.0 推荐） |
| AUTO_INCREMENT | 自增初始值 | 根据业务需要设置 |
| COMMENT | 表注释 | 必须填写，说明表的业务含义 |
| ROW_FORMAT | 行格式 | DYNAMIC（InnoDB 默认，支持大索引前缀） |

## 约束类型

约束是保证数据完整性的机制，MySQL 支持以下 6 种约束：

### PRIMARY KEY（主键约束）

主键唯一标识表中的每一行，每张表只能有一个主键。主键列自动为 `NOT NULL`，并创建聚集索引。

```sql
-- 单列主键
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL
);

-- 复合主键（多列联合唯一）
CREATE TABLE order_items (
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    PRIMARY KEY (order_id, product_id)
);
```

::: tip 主键设计原则
- 推荐使用无业务含义的自增 BIGINT 作为主键（代理键），原因：InnoDB 聚集索引要求主键递增以减少页分裂
- 避免使用 UUID/随机值作为主键——随机值导致大量页分裂和碎片
- 复合主键适合多对多关系的中间表，但会使外键引用变复杂
:::

### FOREIGN KEY（外键约束）

外键用于维护表之间的引用完整性，确保子表的值在父表中存在。

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total DECIMAL(10, 2) NOT NULL,

    -- 外键约束
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT    -- 禁止删除被引用的用户
        ON UPDATE CASCADE     -- 用户 ID 更新时同步更新
);
```

**引用动作选项：**

| 动作 | 说明 |
|------|------|
| RESTRICT | 拒绝删除或更新父表记录（默认行为） |
| CASCADE | 父表删除/更新时，同步删除/更新子表记录 |
| SET NULL | 父表删除/更新时，子表外键列设为 NULL |
| SET DEFAULT | 父表删除/更新时，子表外键列设为默认值（InnoDB 不支持） |
| NO ACTION | 标准 SQL 中等同于 RESTRICT |

### UNIQUE（唯一约束）

唯一约束确保列（或列组合）的值不重复。与主键的区别：允许 NULL 值（多个 NULL 在 MySQL 中被视为不同值，除非列声明为 NOT NULL）。

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone CHAR(11) DEFAULT NULL,

    -- 单列唯一约束
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),

    -- 复合唯一约束：同一城市下昵称不能重复
    -- UNIQUE KEY uk_city_nickname (city, nickname)
);

-- 插入冲突时报错
INSERT INTO users (username, email) VALUES ('zhangsan', 'test@test.com');
INSERT INTO users (username, email) VALUES ('zhangsan', 'other@test.com');
-- Error 1062: Duplicate entry 'zhangsan' for key 'uk_username'
```

### NOT NULL（非空约束）

确保列值不能为 NULL。

```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,        -- 名称不允许为空
    price DECIMAL(10, 2) NOT NULL,     -- 价格不允许为空
    description TEXT DEFAULT NULL      -- 描述可以为空
);

-- 尝试插入 NULL 值
INSERT INTO products (name, price) VALUES (NULL, 99.99);
-- Error 1048: Column 'name' cannot be null
```

### DEFAULT（默认值）

当 INSERT 语句未指定某列的值时，使用默认值填充。

```sql
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    status TINYINT NOT NULL DEFAULT 0,           -- 默认值 0
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    remark VARCHAR(500) DEFAULT '无'             -- 默认值为 '无'
);

-- 不指定 status，使用默认值 0
INSERT INTO orders (id) VALUES (NULL);
SELECT * FROM orders;  -- status = 0, created_at = 当前时间
```

### CHECK（检查约束）

`CHECK` 约束限制列值必须满足指定条件。MySQL 8.0.16 开始真正支持（之前版本虽然语法不报错，但不生效）。

```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2) DEFAULT NULL,
    stock INT NOT NULL DEFAULT 0,

    -- 单列检查
    CONSTRAINT chk_price CHECK (price > 0),
    CONSTRAINT chk_stock CHECK (stock >= 0),

    -- 多列检查：折扣价必须小于原价
    CONSTRAINT chk_discount CHECK (
        discount_price IS NULL OR discount_price < price
    )
);

-- 违反 CHECK 约束
INSERT INTO products (name, price, stock) VALUES ('test', -10, 5);
-- Error 3819: Check constraint 'chk_price' is violated.
```

## ALTER TABLE

`ALTER TABLE` 用于修改已有表的结构，包括增删列、修改列定义、管理索引等。

### 列操作

```sql
-- 在指定位置添加列
ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL AFTER username;

-- 在表的最前面添加列
ALTER TABLE users ADD COLUMN uuid CHAR(36) NOT NULL FIRST;

-- 删除列
ALTER TABLE users DROP COLUMN avatar;

-- 修改列类型（保留列名）
ALTER TABLE users MODIFY COLUMN username VARCHAR(100) NOT NULL;

-- 修改列名和类型
ALTER TABLE users CHANGE COLUMN username user_name VARCHAR(100) NOT NULL COMMENT '用户名';

-- 修改列的默认值
ALTER TABLE users ALTER COLUMN status SET DEFAULT 1;

-- 删除列的默认值
ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
```

### 索引操作

```sql
-- 添加索引
ALTER TABLE orders ADD INDEX idx_user_id (user_id);
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);

-- 添加唯一索引
ALTER TABLE users ADD UNIQUE INDEX uk_email (email);

-- 删除索引
ALTER TABLE orders DROP INDEX idx_user_id;

-- 重命名索引（MySQL 8.0+）
ALTER TABLE orders RENAME INDEX idx_old_name TO idx_new_name;

-- 添加全文索引
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
```

### 外键操作

```sql
-- 添加外键
ALTER TABLE orders
ADD CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 删除外键
ALTER TABLE orders DROP FOREIGN KEY fk_orders_user;

-- 查看表的外键
SELECT
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'mydb'
    AND TABLE_NAME = 'orders'
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 其他操作

```sql
-- 重命名表
ALTER TABLE users RENAME TO members;

-- 修改表的字符集（不改变已有列的字符集）
ALTER TABLE users CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修改表的存储引擎
ALTER TABLE users ENGINE = InnoDB;

-- 修改自增起始值
ALTER TABLE users AUTO_INCREMENT = 10000;

-- 添加分区（示例：按范围分区）
ALTER TABLE orders
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

## 大表 DDL 的挑战与解决方案

### 锁表问题

在 MySQL 5.6 之前，`ALTER TABLE` 对大表执行 DDL 时会锁住整张表，阻塞所有读写操作。一张千万级数据的表，ALTER 可能耗时数小时，导致服务完全不可用。

MySQL 5.6 引入了 **Online DDL**，部分 DDL 操作可以在不阻塞 DML 的情况下执行。但并非所有操作都支持 Online DDL。

**Online DDL 锁模式：**

| 锁模式 | 含义 | 支持的操作示例 |
|--------|------|---------------|
| None | 不需要元数据锁 | 创建/删除二级索引 |
| Shared (S) | 共享锁，阻塞写操作 | 添加外键约束 |
| Exclusive (X) | 排他锁，阻塞所有读写 | 删除列、修改列类型 |

::: warning 大表 DDL
千万级大表执行 `ALTER TABLE` 可能锁表数小时。生产环境推荐使用 `pt-online-schema-change` 或 `gh-ost` 进行无锁变更。
:::

### pt-online-schema-change

Percona Toolkit 提供的在线表结构变更工具，原理是：

1. 创建一张新结构的空表 `_tablename_new`
2. 在原表上创建触发器，实时同步新增的 DML 操作到新表
3. 按批次将原表数据 `INSERT INTO ... SELECT` 复制到新表
4. 数据同步完成后，原子性地重命名两张表（`RENAME TABLE`）

```bash
# 安装 Percona Toolkit
sudo apt install percona-toolkit

# 使用 pt-online-schema-change 添加列
pt-online-schema-change \
    --alter "ADD COLUMN avatar VARCHAR(255) DEFAULT NULL" \
    --host=127.0.0.1 \
    --port=3306 \
    --user=root \
    --ask-pass \
    D=mydb,t=users \
    --execute

# 修改列类型
pt-online-schema-change \
    --alter "MODIFY COLUMN username VARCHAR(100) NOT NULL" \
    D=mydb,t=users \
    --execute

# 添加索引
pt-online-schema-change \
    --alter "ADD INDEX idx_email (email)" \
    D=mydb,t=users \
    --execute
```

### gh-ost

GitHub 开源的在线表结构变更工具，与 pt-online-schema-change 的核心区别是**不使用触发器**，而是通过解析 binlog 来同步增量数据变更。

```bash
# 使用 gh-ost 添加列
gh-ost \
    --host=127.0.0.1 \
    --port=3306 \
    --user=root \
    --password='xxx' \
    --database=mydb \
    --table=users \
    --alter="ADD COLUMN avatar VARCHAR(255) DEFAULT NULL" \
    --execute

# 先测试（不实际执行，只检查可行性）
gh-ost \
    --host=127.0.0.1 \
    --database=mydb \
    --table=users \
    --alter="MODIFY COLUMN email VARCHAR(200) NOT NULL" \
    --execute \
    --allow-on-master
```

**pt-osc vs gh-ost 对比：**

| 特性 | pt-online-schema-change | gh-ost |
|------|------------------------|--------|
| 增量同步机制 | 触发器（TRIGGER） | Binlog 解析 |
| 触发器影响 | 对原表有额外的写放大和锁开销 | 无触发器，不影响原表性能 |
| 可暂停 | 不支持 | 支持（通过 socket 控制） |
| 适用 MySQL 版本 | 5.1+ | 5.6+（需要 ROW 格式 binlog） |
| 主从切换支持 | 有限 | 原生支持，可自动在从库执行 |

## 索引创建

### CREATE INDEX

```sql
-- 普通索引
CREATE INDEX idx_username ON users (username);

-- 唯一索引
CREATE UNIQUE INDEX uk_email ON users (email);

-- 复合索引
CREATE INDEX idx_status_created ON orders (status, created_at);

-- 前缀索引（只索引列的前 N 个字符，适合长字符串）
CREATE INDEX idx_email_prefix ON users (email(20));

-- 降序索引（MySQL 8.0+）
CREATE INDEX idx_amount_desc ON orders (amount DESC);

-- 函数索引（MySQL 8.0.13+）
CREATE INDEX idx_lower_email ON users ((LOWER(email)));
```

::: tip 复合索引的列顺序
复合索引遵循最左前缀原则。索引 `(a, b, c)` 可以用于：`WHERE a = ?`、`WHERE a = ? AND b = ?`、`WHERE a = ? AND b = ? AND c = ?`，但**不能**用于 `WHERE b = ?` 或 `WHERE b = ? AND c = ?`（跳过了最左列 a）。因此，将选择性最高（区分度最大）的列放在最左边，或按查询频率最高的条件列排序。
:::

## 外键的争议

外键在数据库设计中是一个有争议的话题，尤其在互联网大厂的实践中。

### 支持使用外键的理由

- 数据完整性由数据库强制保证，应用层 bug 不会破坏引用完整性
- 级联操作（CASCADE DELETE/UPDATE）减少应用层代码
- 文档化了表之间的关系，新团队成员更容易理解数据模型

### 反对使用外键的理由

- 性能开销：每次 INSERT/UPDATE/DELETE 都需要检查外键约束
- 锁竞争：外键检查会在父表上加共享锁，高并发下加剧锁竞争
- DDL 困难：有外键依赖的表变更顺序受限，需要先删外键再改表
- 分库分表困难：外键要求数据在同一数据库实例中
- 数据库迁移困难：跨数据库类型迁移时外键语法不兼容

```sql
-- 如果决定不使用数据库外键，仍应在表中保留外键字段和注释
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '关联 users.id，应用层保证引用完整性',
    -- 不添加 FOREIGN KEY 约束
    KEY idx_user_id (user_id)
);
```

::: tip 实际选择建议
中小项目或数据一致性要求极高的场景（如金融系统），可以使用外键。高并发互联网场景（如电商、社交），通常不在数据库层使用外键，而是通过应用层逻辑和定时数据一致性检查来保证引用完整性。选择取决于团队的权衡：数据安全优先还是性能和灵活性优先。
:::
