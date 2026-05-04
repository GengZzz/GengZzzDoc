# 搜索与查询

Query DSL 是 ES 的核心查询语言。深入理解 Query DSL、评分机制和调试工具，是构建高质量搜索系统的基础。

## Query DSL 基础

所有查询通过 `_search` API 发送：

```bash
GET /my-index/_search
{
  "query": {
    "查询类型": {
      "字段名": "查询值"
    }
  }
}
```

## 核心查询类型

### Match 查询

Match 是最常用的全文搜索查询。查询文本会被 Analyzer 分词后，与文档中的 Term 进行匹配。

```json
{
  "query": {
    "match": {
      "title": "Elasticsearch 入门教程"
    }
  }
}
```

查询文本被分词为 `["elasticsearch", "入门", "教程"]`，然后分别在倒排索引中查找。默认使用 `OR` 操作符，即匹配任一 Term 即可。

```json
{
  "query": {
    "match": {
      "title": {
        "query": "Elasticsearch 入门教程",
        "operator": "and"    // 必须匹配所有 Term
      }
    }
  }
}
```

### Term 查询

Term 查询不对查询文本做分词，直接精确匹配。适合 keyword、数值、日期等精确值字段。

```json
{
  "query": {
    "term": {
      "status": "published"
    }
  }
}
```

::: warning Term 查询 vs Match 查询
`term` 查询用于精确值（keyword、数字、日期），`match` 查询用于全文搜索（text 字段）。用 `term` 查询 text 字段会导致意外结果——因为 text 字段存储的是分词后的 Term，而非原始文本。
:::

### Multi-Match 查询

在多个字段上执行相同的查询：

```json
{
  "query": {
    "multi_match": {
      "query": "Elasticsearch 教程",
      "fields": ["title^3", "content", "tags"],
      "type": "best_fields"
    }
  }
}
```

`title^3` 表示 title 字段的权重为 3 倍。`type` 参数控制多字段结果的合并策略：

| type | 策略 |
|------|------|
| `best_fields` | 取得分最高的字段（默认） |
| `most_fields` | 合并所有字段的得分 |
| `cross_fields` | 将查询词跨字段匹配（适合人名、地址） |

### Range 查询

```json
{
  "query": {
    "range": {
      "price": {
        "gte": 100,
        "lte": 500
      },
      "created_at": {
        "gte": "2026-01-01",
        "lte": "2026-12-31",
        "format": "yyyy-MM-dd"
      }
    }
  }
}
```

### Bool 查询

Bool 查询是最强大的复合查询，通过 `must`、`filter`、`should`、`must_not` 组合多个条件：

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "Elasticsearch" } }
      ],
      "filter": [
        { "term": { "status": "published" } },
        { "range": { "price": { "lte": 100 } } }
      ],
      "should": [
        { "match": { "tags": "教程" } },
        { "match": { "tags": "入门" } }
      ],
      "must_not": [
        { "term": { "author": "张三" } }
      ]
    }
  }
}
```

| 子句 | 作用 | 影响评分 | 缓存 |
|------|------|---------|------|
| `must` | 必须匹配 | 是 | 否 |
| `filter` | 必须匹配（过滤） | 否 | 是 |
| `should` | 可选匹配（提升相关性） | 是 | 否 |
| `must_not` | 必须不匹配 | 否 | 是 |

## Query Context vs Filter Context

这是 ES 搜索中最核心的概念区分。

### Query Context

在 Query Context 中，ES 不仅判断文档是否匹配，还计算相关性评分（`_score`）。评分越高，排名越靠前。

适用场景：全文搜索、相关性排序。

### Filter Context

在 Filter Context 中，ES 只判断"是/否"，不计算评分。结果可以被缓存（因为只有匹配和不匹配两种状态）。

适用场景：精确匹配、范围过滤、布尔条件。

::: tip 性能关键：能用 Filter 就用 Filter
Filter 不计算评分，可以利用 Bitset 缓存结果。将确定性的过滤条件放在 `filter` 中，将需要评分的搜索条件放在 `must` / `should` 中，是 Query DSL 编写的基本原则。
:::

## 相关性评分原理

ES 通过评分算法对搜索结果排序。理解评分原理有助于调试搜索结果和优化查询。

### TF-IDF

早期版本（5.0 之前）使用 TF-IDF 算法：

```
TF（词频）：Term 在当前文档中出现的次数。出现越多，文档与该 Term 越相关。
IDF（逆文档频率）：包含该 Term 的文档越少，该 Term 的区分度越高。
```

```
score = TF × IDF
```

### BM25

ES 5.0+ 默认使用 BM25（Best Matching 25）算法，是 TF-IDF 的改进版：

```
BM25(doc, term) = IDF × (TF × (k1 + 1)) / (TF + k1 × (1 - b + b × dl / avgdl))
```

关键改进：

| 参数 | 作用 | 默认值 |
|------|------|--------|
| `k1` | 控制 TF 的饱和度。避免单个 Term 出现太多导致分数爆炸 | 1.2 |
| `b` | 控制文档长度的惩罚。长文档天然包含更多词，需要降低优势 | 0.75 |

实际效果：一篇文档中 "Elasticsearch" 出现 100 次，不比出现 10 次高 10 倍分。长文档不会因为词多而碾压短文档。

### Explain API 调试评分

`explain` 参数会输出每个文档的详细评分过程：

```bash
GET /my-index/_search
{
  "query": {
    "match": { "title": "Elasticsearch 教程" }
  },
  "explain": true
}
```

返回中每个文档会包含 `explanation` 字段，展示评分的完整计算树：

```json
{
  "_explanation": {
    "value": 2.1456,
    "description": "weight(title:elasticsearch in 0) [BM25]",
    "details": [
      {
        "value": 1.7534,
        "description": "idf, computed as log(1 + (N - n + 0.5) / (n + 0.5))"
      },
      {
        "value": 0.3922,
        "description": "tf, computed as freq / (freq + k1 * (1 - b + b * dl / avgdl))"
      }
    ]
  }
}
```

::: tip Explain 实战技巧
1. 只对单个文档使用 `explain`（用 `_explain` API 指定文档 ID），避免全量 explain 性能问题。
2. 关注 `description` 字段，它解释了每一步的计算逻辑。
3. 对比两个文档的 explain 结果，找出得分差异的原因。
:::

```bash
# 对单个文档 explain
GET /my-index/_explain/1
{
  "query": {
    "match": { "title": "Elasticsearch" }
  }
}
```

## Function Score

当默认的 BM25 评分不满足需求时（如需要按时间衰减、按热度加权），使用 Function Score 自定义评分逻辑。

```json
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "Elasticsearch" } },
      "functions": [
        {
          "gauss": {
            "created_at": {
              "origin": "now",
              "scale": "7d",
              "decay": 0.5
            }
          },
          "weight": 2
        },
        {
          "field_value_factor": {
            "field": "view_count",
            "modifier": "log1p",
            "factor": 0.1
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  }
}
```

这个查询组合了：
1. **时间衰减**：7 天前发布的文章权重衰减到 0.5，越旧越低。
2. **浏览量加权**：浏览量越高分数越高（取对数避免极端值主导）。

`score_mode` 控制多个函数得分如何合并，`boost_mode` 控制函数得分如何与原始评分合并。

::: tip 实战场景：搜索结果排序
电商搜索通常需要综合考虑：文本相关性 + 销量 + 好评率 + 价格区间 + 新品权重。Function Score 是实现这种"相关性 + 业务规则"排序的核心工具。
:::
