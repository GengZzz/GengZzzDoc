# 数据建模

ES 的数据建模直接影响查询性能、写入效率和存储空间。与关系型数据库的规范化设计不同，ES 推崇反规范化（Denormalization）和嵌套设计。

## 嵌套对象 vs 父子文档 vs 宽表

这三种方式是 ES 数据建模的核心选择。

### 嵌套对象（Nested Object）

嵌套对象将关联数据存储在同一个文档内，使用 `nested` 类型保持字段关联性。

```json
PUT /articles
{
  "mappings": {
    "properties": {
      "title": { "type": "text" },
      "comments": {
        "type": "nested",
        "properties": {
          "author": { "type": "keyword" },
          "content": { "type": "text" },
          "created_at": { "type": "date" }
        }
      }
    }
  }
}
```

**特点**：
- 所有数据在同一文档，查询高效（单次 IO）。
- 更新嵌套字段需要重新索引整个文档。
- 嵌套文档数量不宜过多（每个嵌套对象都是一个隐藏的 Lucene 文档）。

**适用场景**：关联数据变更不频繁，查询时需要保持字段关联。比如商品的 SKU 列表、文章的评论。

### 父子文档（Join）

父子文档将关联数据存储为独立文档，通过 Join 字段建立父子关系。

```json
PUT /my_index
{
  "mappings": {
    "properties": {
      "my_join_field": {
        "type": "join",
        "relations": {
          "question": "answer"
        }
      },
      "content": { "type": "text" }
    }
  }
}
```

写入父文档和子文档：

```bash
# 父文档
PUT /my_index/_doc/1
{
  "content": "ES 如何做分页？",
  "my_join_field": "question"
}

# 子文档（必须指定 routing 与父文档相同）
PUT /my_index/_doc/2?routing=1
{
  "content": "使用 Search After + PIT",
  "my_join_field": {
    "name": "answer",
    "parent": "1"
  }
}
```

查询子文档关联父文档：

```json
{
  "query": {
    "has_parent": {
      "parent_type": "question",
      "query": { "match": { "content": "分页" } }
    }
  }
}
```

**特点**：
- 父子文档独立存储，可以独立更新（不需要重新索引）。
- 查询时需要 Join 操作（通过 `has_child`/`has_parent`），性能低于嵌套对象。
- 父子文档必须在同一 Shard（通过 routing 保证）。

**适用场景**：父子数据需要独立更新，且数量差异大。比如问答系统（问题少、回答多且频繁新增）。

### 宽表（Denormalization）

将所有关联数据平铺为扁平结构，完全反规范化。

```json
{
  "order_id": "ORD001",
  "order_date": "2026-01-15",
  "user_id": "U001",
  "user_name": "张三",
  "user_city": "上海",
  "product_id": "P001",
  "product_name": "MacBook Pro",
  "product_category": "电脑",
  "quantity": 1,
  "price": 14999,
  "total_amount": 14999
}
```

**特点**：
- 查询最快（单文档查询，无 Join）。
- 存储冗余最大。
- 更新最困难（关联数据变更需要更新所有冗余文档）。

**适用场景**：数据以读为主，变更频率低。日志、分析场景。

### 对比总结

| 维度 | 嵌套对象 | 父子文档 | 宽表 |
|------|---------|---------|------|
| 查询性能 | 高 | 中 | 最高 |
| 写入性能 | 中（整体重写） | 高（独立更新） | 高（单文档写入） |
| 更新灵活度 | 低 | 高 | 低 |
| 存储开销 | 中 | 中 | 最大 |
| 适用场景 | 评论、SKU | 问答、订单+明细 | 日志、分析 |

::: tip 选择原则
1. 默认使用嵌套对象（简单高效）。
2. 子文档需要独立更新时使用父子文档。
3. 日志和分析场景使用宽表。
4. 避免在父子文档上做深度聚合（性能差）。
:::

## Denormalization 设计原则

反规范化是 ES 数据建模的核心哲学。

### 原则 1：查询优先

ES 的数据模型应该围绕查询需求设计，而不是围绕写入规范化。问自己："查询时需要哪些数据？"，然后将这些数据放在同一个文档中。

```
错误思路：MySQL 有 3 张表，所以 ES 也建 3 个索引
正确思路：用户搜索时需要看到什么，就放在一个文档里
```

### 原则 2：冗余是可以接受的

关系型数据库追求消除冗余（范式化），ES 则接受冗余以换取查询性能。磁盘空间是便宜的，查询延迟是昂贵的。

### 原则 3：用空间换时间

```
规范化设计（3 个索引）：
  products 索引 + categories 索引 + brands 索引
  → 查询时需要 3 次查询 + 应用层 JOIN
  
反规范化设计（1 个索引）：
  products 索引（内含 category_name、brand_name 等冗余字段）
  → 查询时 1 次查询即可
```

### 原则 4：预计算复杂逻辑

如果查询时需要计算的值可以预先算好，就在写入时计算并存储：

```json
// 写入时预计算
{
  "price": 199.99,
  "discount_price": 159.99,
  "discount_rate": 0.8,            // 预计算折扣率
  "price_range": "100-200",        // 预计算价格区间标签
  "is_on_sale": true               // 预计算是否在促销
}
```

这样查询时不需要脚本计算，直接使用 `term` 或 `range` 过滤。

## `_source` 与 Stored Fields 的存储权衡

### `_source`

`_source` 存储文档的完整原始 JSON。它是 ES 中最重要的字段之一。

**开启 `_source`（默认）的代价**：
- 存储空间：每个文档存储完整的 JSON，可能比索引数据还大。
- 优势：支持 Update API、Reindex、高亮、获取原始数据。

**禁用 `_source` 的场景**：
- 只做日志检索，不需要获取原始数据。
- 数据来源稳定，不需要 Reindex。
- 存储空间极其紧张。

### Stored Fields

除了 `_source`，可以指定某些字段为 `store: true`，单独存储：

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "store": true    // 单独存储，可不读 _source 直接获取
      }
    }
  }
}
```

使用 `stored_fields` 参数只获取特定字段（不需要解析 `_source`）：

```bash
GET /my-index/_search
{
  "stored_fields": ["title", "author"],
  "query": { "match_all": {} }
}
```

### 权衡决策

| 方案 | 存储 | 性能 | 灵活性 | 适用场景 |
|------|------|------|--------|---------|
| `_source` 开启 | 大 | 中 | 最高 | 通用场景 |
| `_source` includes/excludes | 中 | 中 | 高 | 部分字段可节省空间 |
| `_source` 禁用 + store 特定字段 | 小 | 高（少读取） | 低 | 日志检索、只读场景 |
| `_source` 禁用 + 无 store | 最小 | 最高 | 最低 | 纯搜索评分场景 |

::: tip 实践建议
大多数场景保持 `_source` 开启。如果文档包含大字段（如长文本、Base64 图片），使用 `_source` 的 `includes`/`excludes` 过滤：
```json
{
  "_source": {
    "includes": ["title", "price", "category"],
    "excludes": ["large_text_field", "image_data"]
  }
}
```
如果这些大字段仍需搜索，使用 `store: true` 单独存储。
:::
