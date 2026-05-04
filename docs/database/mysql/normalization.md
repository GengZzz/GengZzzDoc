# 数据库范式与反范式化

## 第一范式 (1NF)：原子性

第一范式要求表中的每个字段都是**不可再分的原子值**。这是关系型数据库的最基本要求。

### 违反 1NF 的例子

```sql
-- 反例：一个字段存储多个值
CREATE TABLE student_bad (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    phones VARCHAR(200)  -- '13800000000,13900000000,13700000000'
);
```

这种设计存在严重问题：
- 无法对单个手机号做查询（`WHERE phones = '13800000000'` 走不了索引）
- 无法对手机号做唯一约束
- 拆分需要应用层处理，增加了复杂度

### 符合 1NF 的设计

```sql
-- 方案一：拆成子表（推荐）
CREATE TABLE student (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE student_phone (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES student(id)
);
```

::: tip 关于 JSON 字段的争议
MySQL 5.7+ 支持 JSON 类型，表面上"一个字段存多个值"违反了 1NF，但在某些场景下是合理的选择：
- 字段内容不需要独立查询和索引
- 结构不确定或频繁变化
- 读多写少，不需要事务保证

JSON 字段可以通过 `JSON_EXTRACT` 和虚拟列实现部分查询能力，但性能不如拆表。
:::

---

## 第二范式 (2NF)：消除部分依赖

在满足 1NF 的基础上，2NF 要求**所有非主键字段完全依赖于整个主键**，而不是只依赖于主键的一部分。这主要针对联合主键。

### 违反 2NF 的例子

```sql
-- 订单明细表，主键是 (order_id, product_id)
CREATE TABLE order_item_bad (
    order_id INT,
    product_id INT,
    product_name VARCHAR(100),   -- 只依赖 product_id，不依赖 order_id
    product_price DECIMAL(10,2), -- 只依赖 product_id，不依赖 order_id
    quantity INT,                -- 同时依赖 order_id 和 product_id
    PRIMARY KEY (order_id, product_id)
);
```

`product_name` 和 `product_price` 只依赖于 `product_id`（主键的一部分），这就是**部分依赖**。导致的问题：
- 同一商品在不同订单中重复存储商品名和价格，浪费空间
- 商品改名需要更新所有相关订单记录

### 符合 2NF 的设计

```sql
-- 商品表
CREATE TABLE product (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2)
);

-- 订单明细表
CREATE TABLE order_item (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);
```

::: warning 单主键天然满足 2NF
如果表的主键是单列（不是联合主键），则不存在部分依赖的问题，天然满足 2NF。
:::

---

## 第三范式 (3NF)：消除传递依赖

在满足 2NF 的基础上，3NF 要求**所有非主键字段直接依赖于主键，不能存在传递依赖**（A → B → C）。

### 违反 3NF 的例子

```sql
CREATE TABLE employee_bad (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    dept_id INT,
    dept_name VARCHAR(50),    -- 依赖 dept_id，而非直接依赖 id
    dept_location VARCHAR(100) -- 依赖 dept_id，而非直接依赖 id
);
```

依赖链：`id → dept_id → dept_name, dept_location`

`dept_name` 和 `dept_location` 通过 `dept_id` 间接依赖于主键 `id`，这是**传递依赖**。

### 符合 3NF 的设计

```sql
CREATE TABLE department (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    location VARCHAR(100)
);

CREATE TABLE employee (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    dept_id INT,
    FOREIGN KEY (dept_id) REFERENCES department(id)
);
```

---

## BCNF (Boyce-Codd 范式)

BCNF 是比 3NF 更严格的范式。区别在于：**3NF 允许主属性对候选键的部分依赖或传递依赖，而 BCNF 不允许**。

### 判断标准

对于任何函数依赖 X → Y，**X 必须是超键**（包含候选键的属性集）。

### BCNF vs 3NF 的差异场景

```sql
-- 场景：一个老师只教一门课，一门课可以有多个老师
-- 候选键：(teacher, course) 和 (teacher, classroom)
CREATE TABLE teaching_bad (
    teacher VARCHAR(50),
    course VARCHAR(50),
    classroom VARCHAR(20),
    PRIMARY KEY (teacher, course)
);
```

函数依赖分析：
- `teacher → course`（一个老师只教一门课）
- `(teacher, course) → classroom`
- `(teacher, classroom) → course`

这里 `teacher → course` 中，`teacher` 不是超键，违反了 BCNF。但满足 3NF（因为 course 是主属性）。

::: tip 实际工作中 BCNF 不是硬性要求
大多数项目做到 3NF 就足够了。BCNF 分解可能反而降低查询效率，需要更多 JOIN。
:::

---

## 反范式化：为什么要违反范式

范式化的核心目标是**消除冗余、保证数据一致性**。但实际项目中，过度范式化会导致大量 JOIN，严重影响查询性能。

### 反范式的常见手段

#### 1. 冗余字段

在订单表中直接存储商品名和单价，而不是每次查商品表：

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT,
    product_id BIGINT,
    -- 反范式：冗余字段，避免查商品表
    product_name VARCHAR(200) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);
```

::: danger 冗余字段的维护成本
冗余字段意味着同一份数据存在多处。当商品改名或调价时，必须同步更新所有冗余副本。如果同步逻辑遗漏，就会出现数据不一致。实际项目中通常通过以下方式保证一致性：
- 事务中同步更新
- 定时任务校对修复
- 商品改名只影响新订单，历史订单保留快照（最常见）
:::

#### 2. 宽表设计

将频繁 JOIN 的表合并成一张宽表：

```sql
-- 范式化：用户、订单、商品三张表
-- 查询一个用户的订单详情需要 JOIN 三次

-- 反范式化：宽表
CREATE TABLE order_detail (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    user_name VARCHAR(50),
    user_phone VARCHAR(20),
    product_id BIGINT,
    product_name VARCHAR(200),
    product_category VARCHAR(50),
    unit_price DECIMAL(10,2),
    quantity INT,
    total_amount DECIMAL(10,2),
    order_status TINYINT,
    created_at DATETIME,
    paid_at DATETIME,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id)
);
```

#### 3. 汇总字段

在父表中维护子表的聚合值：

```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    total_amount DECIMAL(10,2) DEFAULT 0,  -- 汇总字段
    item_count INT DEFAULT 0,               -- 汇总字段
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入订单明细时触发更新
DELIMITER //
CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_item
FOR EACH ROW
BEGIN
    UPDATE orders
    SET total_amount = total_amount + NEW.total_price,
        item_count = item_count + NEW.quantity
    WHERE id = NEW.order_id;
END //
DELIMITER ;
```

---

## 电商订单表的反范式化案例

### 背景

一个日均 100 万订单的电商平台，核心查询场景：

1. **用户查看自己的订单列表**：查订单 + 订单明细 + 商品信息
2. **后台查询订单详情**：需要完整信息用于客服和对账
3. **商品销量排行**：按商品汇总销售量

### 范式化设计（初始版本）

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50),
    phone VARCHAR(20)
);

CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200),
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock INT
);

CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    status TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

CREATE TABLE order_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    INDEX idx_order_id (order_id)
);
```

用户的订单列表查询需要 3 表 JOIN：

```sql
-- 查询用户最近的订单列表，包含商品信息
SELECT o.id AS order_id, o.created_at, o.status,
       p.name AS product_name, p.price, oi.quantity,
       p.price * oi.quantity AS subtotal
FROM orders o
JOIN order_item oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.user_id = 12345
ORDER BY o.created_at DESC
LIMIT 20;
```

当数据量达到千万级时，这个 3 表 JOIN 在高并发下需要 200-500ms。

### 反范式化优化（实际方案）

```sql
CREATE TABLE order_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    -- 冗余：下单时的商品快照
    product_name VARCHAR(200) NOT NULL,
    product_category VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    INDEX idx_order_id (order_id)
);

CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    -- 冗余：用户信息快照
    user_name VARCHAR(50),
    user_phone VARCHAR(20),
    total_amount DECIMAL(10,2) DEFAULT 0,
    item_count INT DEFAULT 0,
    status TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

优化后的查询：

```sql
-- 查询用户订单列表，只需查两张表
SELECT o.id, o.order_no, o.total_amount, o.status, o.created_at,
       oi.product_name, oi.unit_price, oi.quantity, oi.total_price
FROM orders o
JOIN order_item oi ON oi.order_id = o.id
WHERE o.user_id = 12345
ORDER BY o.created_at DESC
LIMIT 20;
```

### 性能对比

| 指标 | 范式化设计 | 反范式化设计 |
|------|-----------|-------------|
| 订单列表查询 | 200-500ms (3表JOIN) | 10-30ms (2表JOIN) |
| 写入订单 | 快（只写必要字段） | 略慢（冗余字段多） |
| 商品改名 | 改一处即可 | 历史订单不受影响（快照机制） |
| 存储空间 | 较小 | 增加约 30-40% |

::: tip 反范式化的核心原则
1. **数据快照**：订单相关字段在下单时复制，后续变更不影响历史数据
2. **读写分离**：反范式化是为了优化读取，写入时通过事务保证数据完整性
3. **适度原则**：只对高频查询做反范式，低频报表查询可以接受多表 JOIN
4. **一致性兜底**：定时任务对账，发现不一致自动修复
:::

---

## 范式与反范式的决策框架

```
新项目启动
    │
    ├─ 默认按 3NF 设计
    │
    ├─ 上线后监控慢查询
    │
    ├─ 发现性能瓶颈
    │     │
    │     ├─ 原因是多表 JOIN？
    │     │     │
    │     │     ├─ 是 → 考虑反范式化（冗余字段/宽表）
    │     │     └─ 否 → 优先考虑索引优化
    │     │
    │     └─ 数据一致性要求高？
    │           │
    │           ├─ 是 → 慎用反范式，考虑缓存层
    │           └─ 否 → 可以更激进地反范式
    │
    └─ 定期审查：反范式带来的维护成本是否值得
```
