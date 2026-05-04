# DML 数据操作语言

DML（Data Manipulation Language）用于对表中的数据进行增、删、改操作。虽然 DML 语法相对简单，但在生产环境中，批量操作的性能优化、死锁预防、事务控制等方面有大量需要注意的细节。本文将深入讲解 INSERT、UPDATE、DELETE 的各种用法及最佳实践。

## INSERT 详解

### 单行插入

```sql
-- 标准语法：指定列名（推荐）
INSERT INTO users (username, email, age, status)
VALUES ('zhangsan', 'zhangsan@example.com', 25, 1);

-- 省略列名：必须提供所有列的值（不推荐，表结构变更会导致失败）
INSERT INTO users
VALUES (NULL, 'zhangsan', 'zhangsan@example.com', 25, 1, NOW(), NOW());

-- 使用 DEFAULT 关键字插入默认值
INSERT INTO users (username, email, age, status)
VALUES ('lisi', 'lisi@example.com', 30, DEFAULT);

-- 使用表达式作为值
INSERT INTO users (username, email, created_at)
VALUES ('wangwu', LOWER('WANGWU@EXAMPLE.COM'), NOW());
```

### 批量插入

批量插入是提升写入性能最直接的方式，它减少了网络往返次数和事务开销。

```sql
-- 多值 INSERT：一次插入多行
INSERT INTO users (username, email, age) VALUES
    ('user1', 'user1@example.com', 20),
    ('user2', 'user2@example.com', 21),
    ('user3', 'user3@example.com', 22),
    ('user4', 'user4@example.com', 23),
    ('user5', 'user5@example.com', 24);

-- 推荐单次批量插入的行数：1000 ~ 5000 行
-- 过大的批量可能导致 max_allowed_packet 超限或锁等待时间过长
```

### INSERT ... SELECT

从查询结果直接插入数据，常用于数据迁移、归档、报表生成。

```sql
-- 从查询结果插入
INSERT INTO users_archive (username, email, age, archived_at)
SELECT username, email, age, NOW()
FROM users
WHERE status = 0 AND updated_at < '2024-01-01';

-- 配合聚合函数
INSERT INTO daily_report (report_date, order_count, total_amount)
SELECT
    DATE(created_at),
    COUNT(*),
    SUM(amount)
FROM orders
WHERE created_at >= CURDATE() - INTERVAL 1 DAY
    AND created_at < CURDATE()
GROUP BY DATE(created_at);

-- 跨表插入（源表和目标表在同一数据库）
INSERT INTO db2.users_backup
SELECT * FROM db1.users WHERE status = 1;
```

### INSERT IGNORE

当插入数据违反唯一约束时，`INSERT IGNORE` 会静默忽略该行而不是报错。同时，它还会将错误转换为警告。

```sql
-- username 有唯一索引
INSERT IGNORE INTO users (username, email, age)
VALUES ('zhangsan', 'new_email@example.com', 30);
-- 如果 'zhangsan' 已存在，此语句不会报错，而是静默跳过

-- 查看被忽略的警告
SHOW WARNINGS;

-- 使用场景：批量导入数据时跳过重复记录
INSERT IGNORE INTO products (sku, name, price)
SELECT sku, name, price FROM external_products;
```

::: warning INSERT IGNORE 的陷阱
`INSERT IGNORE` 会将**所有**错误转换为警告，不仅仅是唯一键冲突。例如数据截断（字符串过长）、类型转换错误等也会被静默忽略。这可能掩盖真正的问题。如果只想处理唯一键冲突，推荐使用 `INSERT ... ON DUPLICATE KEY UPDATE`。
:::

### INSERT ON DUPLICATE KEY UPDATE

当插入的数据导致唯一键冲突时，改为执行更新操作。这是 MySQL 特有的语法，非常适合"存在则更新，不存在则插入"（Upsert）的场景。

```sql
-- 基本用法
INSERT INTO user_stats (user_id, login_count, last_login)
VALUES (1001, 1, NOW())
ON DUPLICATE KEY UPDATE
    login_count = login_count + 1,
    last_login = NOW();

-- 批量 Upsert
INSERT INTO product_prices (product_id, price, updated_at) VALUES
    (1, 99.99, NOW()),
    (2, 199.99, NOW()),
    (3, 299.99, NOW())
ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    updated_at = VALUES(updated_at);

-- 使用新值（MySQL 8.0.20+ 推荐写法，VALUES() 已被弃用）
INSERT INTO product_prices (product_id, price, updated_at) VALUES
    (1, 99.99, NOW())
ON DUPLICATE KEY UPDATE
    price = NEW.price,       -- MySQL 8.0.19+ 的新语法别名
    updated_at = NEW.updated_at;
```

::: tip ON DUPLICATE KEY UPDATE 的返回值
- `affected_rows` 为 1：插入了新行
- `affected_rows` 为 2：更新了已有行（MySQL 返回 2 表示"先找到再更新"）
- `affected_rows` 为 0：更新了已有行但值没有变化

注意：如果表有多个唯一键，此语句会根据**第一个**触发冲突的唯一键来判断是插入还是更新。
:::

## UPDATE 详解

### 单表更新

```sql
-- 更新单列
UPDATE users SET status = 0 WHERE id = 1001;

-- 更新多列
UPDATE users
SET email = 'new@example.com',
    phone = '13800138000',
    updated_at = NOW()
WHERE id = 1001;

-- 使用表达式更新
UPDATE products
SET price = price * 0.8,
    stock = stock - 1
WHERE id = 500 AND stock > 0;

-- 使用 CASE WHEN 条件更新
UPDATE employees
SET salary = CASE
    WHEN department = 'Engineering' THEN salary * 1.15
    WHEN department = 'Sales' THEN salary * 1.10
    WHEN department = 'HR' THEN salary * 1.05
    ELSE salary * 1.03
END
WHERE is_active = 1;
```

### 多表关联更新

`UPDATE` 支持 JOIN 语法，可以根据其他表的数据批量更新。

```sql
-- 内连接更新
UPDATE orders o
JOIN users u ON o.user_id = u.id
SET o.user_level = u.vip_level
WHERE o.status = 'pending';

-- 左连接更新（将未匹配的数据标记为特殊状态）
UPDATE orders o
LEFT JOIN users u ON o.user_id = u.id
SET o.status = CASE
    WHEN u.id IS NULL THEN 'orphan'   -- 用户已删除
    ELSE o.status
END
WHERE o.created_at < '2024-01-01';

-- 使用子查询更新
UPDATE products p
SET p.avg_rating = (
    SELECT AVG(rating)
    FROM reviews r
    WHERE r.product_id = p.id
)
WHERE EXISTS (
    SELECT 1 FROM reviews r WHERE r.product_id = p.id
);
```

### UPDATE ... LIMIT

限制每次更新的行数，适合大批量数据分批更新，减少锁持有时间。

```sql
-- 每次最多更新 1000 行
UPDATE orders
SET status = 'expired'
WHERE status = 'pending' AND created_at < '2024-01-01'
LIMIT 1000;

-- 配合循环执行，直到影响行数为 0
-- （在应用层或存储过程中实现循环）
```

::: danger UPDATE 不带 WHERE 条件
`UPDATE table SET col = value` 会更新表中**每一行**。在执行 UPDATE 之前，先用相同条件的 SELECT 确认影响范围。在 MySQL 客户端中开启 `sql_safe_updates` 模式可以防止意外全表更新：

```sql
SET sql_safe_updates = 1;
-- 此模式下，UPDATE 必须带 WHERE 或 LIMIT，且 WHERE 条件的列必须有索引
```
:::

## DELETE 详解

### 单表删除

```sql
-- 条件删除
DELETE FROM users WHERE status = 3 AND deleted_at < '2023-01-01';

-- 带 LIMIT 的删除（防止锁持有时间过长）
DELETE FROM logs WHERE created_at < '2024-01-01' LIMIT 5000;

-- 删除所有数据
DELETE FROM temp_table;
-- 注意：这会逐行删除，对大表来说非常慢
```

### 多表关联删除

```sql
-- 删除有软删除用户的订单
DELETE o
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE u.status = 3;

-- 使用子查询删除
DELETE FROM order_items
WHERE order_id IN (
    SELECT id FROM orders WHERE status = 'cancelled' AND created_at < '2024-01-01'
);

-- 使用 LEFT JOIN 删除孤立记录
DELETE o
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;
```

### DELETE vs TRUNCATE vs DROP

这三个操作都可以清空或移除表数据，但机制和影响完全不同：

| 特性 | DELETE | TRUNCATE | DROP |
|------|--------|----------|------|
| 操作类型 | DML | DDL | DDL |
| 删除内容 | 行数据 | 全部数据（重建表） | 表结构 + 全部数据 |
| WHERE 条件 | 支持 | 不支持 | 不适用 |
| 事务回滚 | 可回滚 | 不可回滚 | 不可回滚 |
| AUTO_INCREMENT | 不重置 | 重置为初始值 | 不适用 |
| 触发器 | 触发 DELETE 触发器 | 不触发 | 不触发 |
| 返回行数 | 返回删除行数 | 不返回 | 不返回 |
| 空间释放 | 不释放磁盘空间（标记删除） | 释放磁盘空间 | 释放磁盘空间 |
| 速度（大表） | 慢 | 快 | 快 |

```sql
-- 场景选择：
-- 1. 需要条件删除 → DELETE
DELETE FROM orders WHERE status = 'cancelled';

-- 2. 需要清空整张表 → TRUNCATE
TRUNCATE TABLE temp_import;

-- 3. 需要完全移除表 → DROP
DROP TABLE obsolete_table;
```

## 批量操作优化

### 事务包裹

将多个 DML 操作包裹在一个事务中，减少 redo log 的刷盘次数和事务提交开销。

```sql
-- 不推荐：每条语句一个事务（1000 次提交 = 1000 次磁盘 IO）
INSERT INTO users (name) VALUES ('user1');
INSERT INTO users (name) VALUES ('user2');
-- ... 重复 1000 次

-- 推荐：批量操作包裹在一个事务中
START TRANSACTION;
INSERT INTO users (name) VALUES ('user1');
INSERT INTO users (name) VALUES ('user2');
-- ... 重复 1000 条
COMMIT;

-- 最佳实践：分批提交，每批 1000~5000 行
-- 应用层伪代码
while (hasMoreData) {
    START TRANSACTION;
    INSERT INTO users (name) VALUES ... ;  -- 1000 行
    COMMIT;
}
```

### LOAD DATA INFILE

`LOAD DATA INFILE` 是 MySQL 中批量导入数据最快的方式，比 INSERT 快 20 倍以上。

```sql
-- 从 CSV 文件导入
LOAD DATA INFILE '/tmp/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS           -- 跳过 CSV 标题行
(username, email, age, status);

-- 从远程文件导入（需要启用 local_infile）
LOAD DATA LOCAL INFILE '/path/to/local/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(username, email, age, status);

-- 导入时进行数据转换
LOAD DATA INFILE '/tmp/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
IGNORE 1 ROWS
(username, email, @age, @status)
SET
    age = IF(@age = '', NULL, @age),
    status = IF(@status = '', 0, @status),
    created_at = NOW();
```

::: tip LOAD DATA INFILE 前置条件
1. MySQL 服务端需要 `FILE` 权限：`GRANT FILE ON *.* TO 'user'@'host'`
2. `secure_file_priv` 变量需指向允许导入的目录（`SHOW VARIABLES LIKE 'secure_file_priv'`）
3. 使用 `LOCAL` 关键字时，客户端需要启用 `--local-infile=1`
4. 文件编码必须与表的字符集匹配
:::

### 性能优化技巧

```sql
-- 1. 导入前关闭索引和外键检查，导入后恢复
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
ALTER TABLE users DISABLE KEYS;

-- ... 执行批量导入 ...

ALTER TABLE users ENABLE KEYS;
SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. 对于 MyISAM 引擎（不推荐），可以锁定表加速导入
LOCK TABLES users WRITE;
-- ... 批量 INSERT ...
UNLOCK TABLES;

-- 3. 调整 redo log 大小和刷盘策略（仅在批量导入期间临时调整）
-- my.cnf 或 SET GLOBAL
SET GLOBAL innodb_flush_log_at_trx_commit = 2;  -- 批量导入时使用
-- 导入完成后务必改回 1
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
```

::: danger innodb_flush_log_at_trx_commit 的权衡
- 值为 `1`（默认）：每次事务提交都刷 redo log 到磁盘，最安全，但性能最低
- 值为 `2`：事务提交时写入 OS 缓冲区，每秒刷一次盘。宕机时可能丢失 1 秒数据
- 值为 `0`：每秒写入并刷盘。宕机时可能丢失 1 秒数据

**生产环境必须设为 `1`**。只在批量数据导入等特殊场景临时调整为 `2`。
:::

## 死锁风险

InnoDB 使用行级锁来支持并发事务，但多事务并发操作同一数据时容易发生死锁。

### 常见死锁场景

```sql
-- 场景 1：交叉更新（两个事务以不同顺序更新相同行）
-- 事务 A
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

-- 事务 B（同时执行）
START TRANSACTION;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;   -- 等待事务 A 释放 id=2 的锁
UPDATE accounts SET balance = balance + 50 WHERE id = 1;   -- 事务 A 等待 id=1 的锁 → 死锁！
COMMIT;
```

```sql
-- 场景 2：间隙锁冲突（Next-Key Lock）
-- 事务 A
START TRANSACTION;
UPDATE users SET status = 1 WHERE id BETWEEN 100 AND 200;
COMMIT;

-- 事务 B（同时执行，id 范围有重叠）
START TRANSACTION;
UPDATE users SET status = 2 WHERE id BETWEEN 150 AND 250;
-- 两个事务的间隙锁范围重叠 → 死锁
COMMIT;
```

### 死锁预防策略

1. **统一操作顺序**：所有事务按相同的顺序访问资源（如按 ID 升序更新）
2. **减少事务持锁时间**：事务内只放必要的 DML 操作，不要包含业务逻辑或外部 IO
3. **使用索引**：没有索引的 UPDATE 会升级为表锁（扫描全表时加锁范围扩大）
4. **控制批量大小**：大批量 DELETE/UPDATE 分批执行，每批不超过几千行

```sql
-- 查看最近一次死锁信息
SHOW ENGINE INNODB STATUS\G

-- 查看当前锁等待
SELECT
    r.trx_id AS waiting_trx,
    r.trx_mysql_thread_id AS waiting_thread,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx,
    b.trx_mysql_thread_id AS blocking_thread,
    b.trx_query AS blocking_query
FROM information_schema.innodb_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;
```

## 影响行数

DML 操作的"影响行数"在不同场景下有不同的含义：

```sql
-- SQL 层面：使用 ROW_COUNT() 函数
UPDATE users SET status = 0 WHERE id = 1001;
SELECT ROW_COUNT();  -- 返回 1（影响了 1 行）

-- 应用层（以 Python 为例）：
-- cursor.execute("UPDATE ...")
-- cursor.rowcount  -- 获取影响行数
```

`ROW_COUNT()` 的返回值含义：

| 场景 | ROW_COUNT() 返回值 |
|------|-------------------|
| UPDATE 实际修改了数据 | 实际修改的行数 |
| UPDATE 修改前后值相同 | 0（没有实际变化） |
| INSERT 成功 | 1 |
| INSERT ON DUPLICATE KEY UPDATE（插入新行） | 1 |
| INSERT ON DUPLICATE KEY UPDATE（更新已有行） | 2 |
| DELETE 成功 | 删除的行数 |
| TRUNCATE | 0 |
| SELECT | 结果行数（MySQL 特有，非标准行为） |
