# 文档模型

MongoDB 的核心在于文档模型——以 BSON（Binary JSON）格式存储数据。理解文档模型与关系模型的本质差异，以及嵌入与引用的工程权衡，是 MongoDB 建模的第一步。

## 文档模型 vs 关系模型

关系模型将数据拆分为规范化的表，通过外键关联；文档模型将相关数据聚合为一个自包含的文档，减少 JOIN 操作。

```sql
-- 关系模型：用户 + 地址（两张表，需要 JOIN）
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(100)
);

CREATE TABLE addresses (
  id INT PRIMARY KEY,
  user_id INT,
  city VARCHAR(50),
  street VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

SELECT u.name, a.city
FROM users u
JOIN addresses a ON u.id = a.user_id
WHERE u.name = '张三';
```

```javascript
// 文档模型：用户文档嵌入地址（单文档查询，无需 JOIN）
{
  _id: ObjectId("6642a1b2c3d4e5f6a7b8c9d0"),
  name: "张三",
  email: "zhangsan@example.com",
  addresses: [
    { city: "北京", street: "中关村大街1号", zipCode: "100080" },
    { city: "上海", street: "南京西路1266号", zipCode: "200040" }
  ]
}
```

| 对比维度 | 关系模型 | 文档模型 |
|---------|---------|---------|
| 数据结构 | 固定 Schema（表 + 列） | 灵活 Schema（文档 + 字段） |
| 关联方式 | 外键 + JOIN | 嵌入 / 引用 |
| 扩展性 | 垂直扩展为主 | 天然水平扩展 |
| 一致性 | 强一致（ACID 事务） | 最终一致为主（4.0+ 支持事务） |
| 适用场景 | 关系复杂、强一致 | 数据多变、读写密集、水平扩展 |

## BSON 类型

BSON 在 JSON 基础上扩展了多种类型，常用类型如下：

| 类型 | 说明 | 示例 |
|------|------|------|
| String | UTF-8 字符串 | `"hello"` |
| Number | 双精度浮点（64 位） | `3.14` |
| Int32 / Int64 | 32/64 位整数 | `NumberInt(42)`、`NumberLong(100)` |
| Decimal128 | 128 位十进制（金融精度） | `NumberDecimal("99.99")` |
| Boolean | 布尔值 | `true` / `false` |
| Date | 64 位整数，毫秒时间戳 | `ISODate("2024-01-15")` |
| ObjectId | 12 字节唯一标识 | `ObjectId("6642a1b2c3d4e5f6a7b8c9d0")` |
| Array | 有序值集合 | `[1, 2, 3]` |
| Document | 嵌套文档 | `{ city: "北京" }` |
| Null | 空值 | `null` |
| Binary | 二进制数据 | `BinData(0, "base64data")` |
| Timestamp | 内部时间戳（副本集用） | `Timestamp(1625000000, 1)` |

::: tip Decimal128 的使用场景
涉及金额、利率等需要精确计算的场景，必须使用 `NumberDecimal` 而不是普通 Number。普通 Number 是 64 位浮点，`0.1 + 0.2 !== 0.3` 的问题在金融场景是致命的。
:::

## _id 设计

每个文档都有一个 `_id` 字段作为主键。如果插入时不指定，MongoDB 自动生成 `ObjectId`。

### ObjectId 结构

```
| 4 字节时间戳 | 5 字节随机值 | 3 字节递增计数器 |
```

- **时间戳**：文档创建的秒级 Unix 时间戳
- **随机值**：保证同一秒内不同机器生成的 ObjectId 不同
- **计数器**：同一进程同一秒内的自增，保证唯一性

ObjectId 具有天然的时间排序性，按 `_id` 排序等价于按创建时间排序。

### 自定义 _id

```javascript
// 使用 UUID 作为 _id
db.orders.insertOne({
  _id: UUID("550e8400-e29b-41d4-a716-446655440000"),
  items: [{ name: "手机", price: NumberDecimal("4999.00") }],
  createdAt: new Date()
})

// 使用业务字段组合做 _id（避免额外索引开销）
db.daily_stats.insertOne({
  _id: "2024-01-15:region:cn-east",
  date: ISODate("2024-01-15"),
  region: "cn-east",
  pv: 150000,
  uv: 42000
})
```

::: warning 不要在 _id 中放可变字段
`_id` 一旦创建不可修改。如果把可能变化的字段（如用户名、订单状态）放在 `_id` 中，后续变更将极其痛苦。
:::

## 嵌入与引用的权衡

这是 MongoDB 文档建模最核心的决策。嵌入（Embed）把相关数据放在同一文档中；引用（Reference）存储关联文档的 `_id`，查询时通过 `$lookup` 或应用层二次查询获取。

### 嵌入（Embed）

```javascript
// 订单嵌入所有订单项
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  status: "shipped",
  items: [
    { productId: ObjectId("..."), name: "iPhone 15", price: NumberDecimal("5999"), quantity: 1 },
    { productId: ObjectId("..."), name: "保护壳", price: NumberDecimal("99"), quantity: 2 }
  ],
  totalPrice: NumberDecimal("6197"),
  createdAt: ISODate("2024-01-15")
}
```

**适用场景：**
- 数据属于"一对少"关系（1:N，N 较小且有上限）
- 读多写少，需要一次性获取完整数据
- 数据具有天然的从属关系（订单-订单项、文章-评论）

**优点：** 单次查询获取所有数据，原子性写入，无 JOIN 开销。

**缺点：** 文档体积膨胀（BSON 上限 16MB），更新子文档需要重写整个文档。

### 引用（Reference）

```javascript
// 用户文档
{
  _id: ObjectId("user1"),
  name: "张三",
  email: "zhangsan@example.com"
}

// 订单文档（引用用户）
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),  // 引用
  status: "shipped",
  totalPrice: NumberDecimal("6197"),
  createdAt: ISODate("2024-01-15")
}
```

查询时通过 `$lookup` 关联：

```javascript
db.orders.aggregate([
  { $match: { _id: ObjectId("order1") } },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" }
])
```

**适用场景：**
- 数据属于"一对多"关系且 N 很大或无上限
- 多对多关系（用户-角色、文章-标签）
- 子文档频繁独立更新

### 决策流程

```
需要关联数据？
├── 读取时是否总是需要一起获取？
│   ├── 是 → 嵌入
│   └── 否 → 是否经常独立修改子文档？
│       ├── 是 → 引用
│       └── 否 → N 是否有上限？
│           ├── 是（N < 100）→ 嵌入
│           └── 否 → 引用
```

### 混合模式

实际项目中很少纯嵌入或纯引用，常用混合模式：

```javascript
// 用户文档：嵌入少量常用地址 + 引用订单
{
  _id: ObjectId("user1"),
  name: "张三",
  defaultAddress: {              // 嵌入：最常用的地址
    city: "北京",
    street: "中关村大街1号"
  },
  orderCount: 156                // 反范式：订单统计
}
```

::: tip 工程经验
不要追求"最优"建模方案，而应该基于实际查询模式来决定。先明确应用中最频繁的 3-5 个查询，围绕这些查询设计文档结构。Schema 设计是迭代的，可以随业务变化调整。
:::
