# 表设计最佳实践

## 主键选择：自增 ID vs UUID vs 雪花 ID

主键的选择直接影响存储效率、索引性能和系统扩展性。这是表设计中最基础也最重要的决策之一。

### 自增 ID (AUTO_INCREMENT)

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**优点：**
- 存储空间小（BIGINT 8 字节）
- 顺序写入，B+ 树不会产生页分裂
- 索引碎片率极低
- 范围查询高效

**缺点：**
- 分布式环境下 ID 冲突（需要设置 `auto_increment_offset` 和 `auto_increment_increment`）
- ID 可预测，存在安全隐患（遍历攻击）
- 不适合数据迁移和合并

### UUID

```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL
);

-- 或者用 BINARY(16) 存储，节省空间
CREATE TABLE users_bin (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    username VARCHAR(50) NOT NULL
);

-- 查询时转换
SELECT BIN_TO_UUID(id) AS uuid, username FROM users_bin;
```

**优点：**
- 全局唯一，天然适合分布式
- 无中心化 ID 生成依赖
- 可在客户端生成

**缺点：**
- CHAR(36) 占 36 字节，BINARY(16) 占 16 字节，都比 BIGINT 大
- **随机写入，导致严重的 B+ 树页分裂和索引碎片**
- 不可排序（时间维度查询需要提取时间部分）

::: danger UUID 的索引性能问题
UUID 是无序的，每次 INSERT 都可能插入到 B+ 树中间位置，导致：
1. **页分裂**：InnoDB 默认页大小 16KB，当页满时需要分裂，产生随机 IO
2. **索引碎片**：频繁页分裂导致页内空间利用率低，可能只有 50-60%
3. **写入放大**：页分裂涉及数据搬迁，写入性能比自增 ID 低 3-5 倍

MySQL 8.0 的 `UUID_TO_BIN(UUID(), 1)` 可以将时间部分前置，部分缓解随机性，但仍然不如自增 ID。
:::

### 雪花 ID (Snowflake ID)

```sql
-- 雪花 ID 是 BIGINT，但不是自增的，而是按时间有序生成
CREATE TABLE orders (
    id BIGINT UNSIGNED PRIMARY KEY,  -- 由应用层雪花算法生成
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

雪花 ID 结构（64 位）：

```
0 | 00000000 00000000 00000000 00000000 00000000 0 | 00000 | 00000 | 000000000000
  |           41 位时间戳（毫秒）                   | 5位DC | 5位机器 | 12位序列号
```

**优点：**
- 全局唯一，分布式友好
- 趋势递增（同毫秒内序列号递增），对 B+ 树友好
- 存储空间和自增 ID 一样（8 字节）
- 可从 ID 中提取时间信息

**缺点：**
- 依赖时钟同步，时钟回拨会产生重复 ID
- 需要额外的 ID 生成服务或客户端库
- 机器 ID 需要手动分配或通过注册中心获取

### 性能对比

| 指标 | 自增 ID | UUID (CHAR36) | UUID (BIN16) | 雪花 ID |
|------|--------|---------------|-------------|---------|
| 存储空间 | 8 字节 | 36 字节 | 16 字节 | 8 字节 |
| 写入性能 | 最快 | 最慢 | 较慢 | 快 |
| 索引碎片 | 极低 | 严重 | 中等 | 低 |
| 分布式支持 | 差 | 好 | 好 | 好 |
| 可读性 | 好 | 差 | 极差 | 差 |

::: tip 实际选型建议
- **单机 / 简单主从**：自增 ID，简单可靠
- **分布式系统**：雪花 ID，兼顾性能和唯一性
- **微服务 / 多数据源合并**：UUID（用 BINARY(16) + UUID_TO_BIN 有序模式）
- **不要用 UUID 做主键**，除非你确实需要在无网络环境中生成全局唯一 ID
:::

---

## 软删除 vs 硬删除

### 硬删除

```sql
DELETE FROM users WHERE id = 123;
```

数据彻底消失，无法恢复。适合：
- 日志表、临时数据
- 确定不需要恢复的场景
- 数据量大，需要释放存储空间

### 软删除

```sql
ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) DEFAULT 0;
ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- 软删除
UPDATE users SET is_deleted = 1, deleted_at = NOW() WHERE id = 123;

-- 查询时过滤
SELECT * FROM users WHERE is_deleted = 0 AND username = 'alice';
```

**更推荐的设计**：直接用 `deleted_at` 做判断，不用 `is_deleted`：

```sql
ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- 软删除
UPDATE users SET deleted_at = NOW() WHERE id = 123;

-- 查询（NULL 表示未删除）
SELECT * FROM users WHERE deleted_at IS NULL AND username = 'alice';
```

### 软删除的坑：唯一索引冲突

这是软删除最常见的问题：

```sql
-- 用户表有唯一索引
ALTER TABLE users ADD UNIQUE INDEX idx_username (username);

-- 用户 alice 注册后被软删除
UPDATE users SET deleted_at = NOW() WHERE username = 'alice';

-- alice 想重新注册，报错！
INSERT INTO users (username) VALUES ('alice');
-- ERROR 1062: Duplicate entry 'alice' for key 'idx_username'
```

**解决方案：**

```sql
-- 方案一：唯一索引包含 deleted_at（推荐）
ALTER TABLE users DROP INDEX idx_username;
ALTER TABLE users ADD UNIQUE INDEX idx_username_active (username, deleted_at);

-- 首次注册：deleted_at = NULL，唯一
-- 软删除后：deleted_at = '2024-01-01 00:00:00'，允许新记录
-- 再次注册：新记录 deleted_at = NULL，唯一
```

```sql
-- 方案二：软删除时修改 username（保留历史记录）
UPDATE users
SET deleted_at = NOW(),
    username = CONCAT(username, '_deleted_', id)
WHERE id = 123;
```

```sql
-- 方案三：归档表（适合数据量大的场景）
-- 软删除的数据移到归档表
INSERT INTO users_archive SELECT * FROM users WHERE id = 123;
DELETE FROM users WHERE id = 123;
```

::: warning 软删除对查询性能的影响
1. **索引膨胀**：软删除的数据仍然占索引空间，降低索引效率
2. **每次查询都需要条件过滤**：`WHERE deleted_at IS NULL` 必须加上，否则查出已删除数据
3. **定时清理**：软删除不是万能的，超过保留期的数据应该物理删除

建议：对软删除的数据定期归档和清理，保持主表数据量可控。
:::

---

## 时间字段设计

### 标准时间字段

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    status TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_user_created (user_id, created_at)
);
```

`ON UPDATE CURRENT_TIMESTAMP` 让 MySQL 在每次 UPDATE 时自动更新 `updated_at`，不需要应用层处理。

### DATETIME vs TIMESTAMP

| 特性 | DATETIME | TIMESTAMP |
|------|----------|-----------|
| 范围 | 1000-01-01 ~ 9999-12-31 | 1970-01-01 ~ 2038-01-19 |
| 存储空间 | 8 字节（5.6.4+ 微秒） | 4 字节 |
| 时区 | 不受时区影响 | 存储 UTC，查询时按 session 时区转换 |
| 自动更新 | 支持 ON UPDATE | 支持 |
| NULL 值 | 允许 NULL | 允许 NULL |

::: tip 实际项目建议
- **用 DATETIME**：不受时区影响，可读性好，范围大
- **TIMESTAMP 的 2038 问题**：如果系统需要运行到 2038 年以后，必须用 DATETIME
- **时间统一用 UTC**：在应用层处理时区转换，数据库层统一存储 UTC
- **精度**：`DATETIME(3)` 保留毫秒，`DATETIME(6)` 保留微秒，根据业务需求选择
:::

---

## 枚举 vs 字典表

### ENUM 类型

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'
);
```

**适用场景：**
- 状态值固定、极少变化（如性别：男/女/未知）
- 只需要存储和简单查询，不需要额外属性
- 表数据量不大，枚举值不超过 10 个

**限制：**
- 添加新枚举值需要 `ALTER TABLE`，大表操作可能锁表
- ENUM 内部存储为整数（1, 2, 3...），`ORDER BY` 按定义顺序排序而非字母顺序
- 无法存储额外属性（如状态描述、颜色代码等）

### 字典表

```sql
-- 字典表
CREATE TABLE order_status (
    id TINYINT UNSIGNED PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    description VARCHAR(100),
    color VARCHAR(10),        -- 前端显示用
    sort_order INT DEFAULT 0, -- 排序权重
    is_active TINYINT DEFAULT 1
);

INSERT INTO order_status VALUES
(0, 'pending', '待支付', '#FFA500', 1, 1),
(1, 'paid', '已支付', '#008000', 2, 1),
(2, 'shipped', '已发货', '#0000FF', 3, 1),
(3, 'completed', '已完成', '#808080', 4, 1),
(4, 'cancelled', '已取消', '#FF0000', 5, 1);

-- 业务表
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status TINYINT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (status) REFERENCES order_status(id)
);

-- 查询
SELECT o.id, s.name AS status_name, s.color
FROM orders o
JOIN order_status s ON s.id = o.status;
```

**适用场景：**
- 状态可能频繁变化或新增
- 需要存储额外属性（描述、颜色、排序等）
- 多系统共享状态定义
- 需要前后端统一展示

::: tip 选型建议
- 稳定不变的分类 → ENUM（如性别、布尔状态）
- 可能扩展的业务状态 → 字典表
- 不确定 → 字典表（更灵活）
- **绝对不要用字符串字段存状态名**（如 `status VARCHAR(20)`），浪费空间且无法约束合法值）
:::

---

## 大字段拆分：TEXT/BLOB 放主表还是扩展表

### 问题

```sql
-- 大字段放在主表
CREATE TABLE articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200),
    content LONGTEXT,          -- 文章正文，可能几 MB
    cover_image BLOB,          -- 封面图片
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**问题：**
1. `SELECT *` 时会加载大字段，浪费内存和网络带宽
2. InnoDB 的 Buffer Pool 被大字段挤占，热数据被挤出
3. 查询只想要标题列表时，不需要加载正文

### 扩展表方案

```sql
-- 主表：存高频查询字段
CREATE TABLE articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500),
    author_id BIGINT UNSIGNED,
    status TINYINT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_author (author_id),
    INDEX idx_status_created (status, created_at)
);

-- 扩展表：存大字段
CREATE TABLE article_content (
    article_id BIGINT UNSIGNED PRIMARY KEY,
    content LONGTEXT,
    content_html LONGTEXT,    -- 渲染后的 HTML
    FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 封面图片用单独的字段或对象存储
CREATE TABLE article_media (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT UNSIGNED NOT NULL,
    media_type ENUM('image', 'video') NOT NULL,
    url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0,
    INDEX idx_article (article_id)
);
```

**查询文章列表（不需要正文）：**

```sql
SELECT id, title, summary, author_id, created_at
FROM articles
WHERE status = 1
ORDER BY created_at DESC
LIMIT 20;
```

**查询文章详情（需要正文）：**

```sql
SELECT a.*, ac.content_html
FROM articles a
JOIN article_content ac ON ac.article_id = a.id
WHERE a.id = 123;
```

::: tip 经验规则
- **VARCHAR(500) 以下**：放主表
- **TEXT / LONGTEXT**：拆到扩展表
- **BLOB（图片/文件）**：不要存数据库，用对象存储（OSS/S3），数据库只存 URL
- **JSON 大字段**：如果超过 1KB，考虑拆到扩展表
:::

---

## 字段命名规范

### 核心原则

1. **风格统一**：全项目使用同一种命名风格
2. **避免保留字**：不用 `order`, `group`, `select`, `key` 等 MySQL 关键字
3. **见名知意**：`user_id` 而不是 `uid`，`created_at` 而不是 `c_time`
4. **单数名词**：表名用单数还是复数全项目统一（推荐单数，如 `user` 而非 `users`）

### 常见规范参考

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL,          -- 业务编号用 _no 后缀
    user_id BIGINT UNSIGNED NOT NULL,       -- 外键用 表名_id
    total_amount DECIMAL(10,2) NOT NULL,    -- 金额用 DECIMAL
    status TINYINT NOT NULL DEFAULT 0,      -- 状态用 TINYINT
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    UNIQUE INDEX idx_order_no (order_no),
    INDEX idx_user_id (user_id)
);
```

### 保留字陷阱

```sql
-- 错误：order 是 MySQL 保留字
CREATE TABLE order (id INT, ...);

-- 正确：加反引号或者换名字
CREATE TABLE `order` (id INT, ...);   -- 能用但别扭
CREATE TABLE orders (id INT, ...);    -- 推荐

-- 其他常见保留字陷阱
-- key → 使用 key_name 或 key_type
-- index → 使用 idx_name 或索引编号
-- group → 使用 group_id 或 user_group
-- desc → 使用 description
-- range → 使用 range_start / range_end
```

::: warning 命名风格不统一的代价
一个项目中如果混用 `createTime`（驼峰）和 `created_at`（下划线），会导致：
- ORM 映射配置复杂
- 代码中频繁出现字段名拼写错误
- 新成员上手困难

**建议**：数据库字段统一使用 snake_case（下划线），由 ORM 映射到 Java/Go 的驼峰命名。
:::
