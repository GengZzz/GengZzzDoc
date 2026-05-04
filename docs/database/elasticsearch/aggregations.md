# 聚合分析

聚合（Aggregation）是 ES 作为分析引擎的核心能力。它类似于 SQL 中的 GROUP BY + 聚合函数，但功能远超传统数据库的 OLAP 能力。

## 聚合分类

ES 的聚合分为三大类：

| 类别 | 类比 SQL | 用途 | 示例 |
|------|---------|------|------|
| Bucket Aggregation | GROUP BY | 将文档分桶 | 按日期、状态、地区分组 |
| Metric Aggregation | COUNT/SUM/AVG | 计算统计指标 | 平均值、最大值、百分位 |
| Pipeline Aggregation | 子查询 | 对其他聚合结果做二次计算 | 移动平均、累计求和 |

## Bucket Aggregation

### Terms Aggregation

按字段值分桶，类似 `GROUP BY field`：

```json
{
  "size": 0,
  "aggs": {
    "by_status": {
      "terms": {
        "field": "status",
        "size": 10
      }
    }
  }
}
```

返回每个 status 值及其文档数量。`size: 0` 表示不返回文档结果，只返回聚合结果。

::: warning Terms 聚合的精度问题
Terms 聚合是基于每个 Shard 上的数据先计算 Top N，再合并的。这可能导致结果不精确：
- Shard 上排名靠后的桶在全局可能排名靠前。
- `shard_size` 参数控制每个 Shard 返回的桶数量（默认 `size * 1.5 + 10`），增大可提升精度但增加开销。
:::

### Date Histogram Aggregation

按时间间隔分桶，最常用于时序数据分析：

```json
{
  "size": 0,
  "aggs": {
    "daily_orders": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "1d",
        "format": "yyyy-MM-dd",
        "min_doc_count": 0,
        "extended_bounds": {
          "min": "2026-01-01",
          "max": "2026-01-31"
        }
      }
    }
  }
}
```

支持两种间隔：
- `calendar_interval`：日历间隔（1 个月可能是 28/29/30/31 天）
- `fixed_interval`：固定间隔（精确的毫秒数）

### Nested Aggregation

对 `nested` 类型的字段做聚合：

```json
{
  "size": 0,
  "aggs": {
    "comments": {
      "nested": { "path": "comments" },
      "aggs": {
        "by_author": {
          "terms": { "field": "comments.author.keyword" }
        }
      }
    }
  }
}
```

### Filter Aggregation

在聚合内部加过滤条件：

```json
{
  "aggs": {
    "recent_orders": {
      "filter": { "range": { "created_at": { "gte": "2026-01-01" } } },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }
      }
    }
  }
}
```

## Metric Aggregation

### 数值型指标

```json
{
  "size": 0,
  "aggs": {
    "price_stats": {
      "stats": { "field": "price" }
    },
    "price_percentiles": {
      "percentiles": {
        "field": "price",
        "percents": [50, 95, 99]
      }
    },
    "unique_users": {
      "cardinality": { "field": "user_id" }
    }
  }
}
```

| 聚合 | 用途 |
|------|------|
| `min` / `max` / `avg` / `sum` | 基本统计 |
| `stats` | 一次性返回 count/min/max/avg/sum |
| `percentiles` | 百分位数（P50/P95/P99） |
| `cardinality` | 基数（去重计数），使用 HyperLogLog++ 算法，有误差 |

::: warning Cardinality 精度
Cardinality 聚合使用 HyperLogLog++ 算法，内存占用固定，但存在误差。默认精度配置为 `precision_threshold: 3000`，在此阈值内误差小于 5%。增大精度阈值会消耗更多内存。
:::

### 文本型指标

```json
{
  "aggs": {
    "top_tags": {
      "terms": {
        "field": "tags.keyword",
        "size": 10
      }
    }
  }
}
```

文本字段（text）不能直接用于聚合，需要使用 keyword 子字段。

## Pipeline Aggregation

Pipeline Aggregation 对其他聚合的结果进行二次计算。

### Moving Average

计算滑动平均（适合时序数据平滑）：

```json
{
  "aggs": {
    "daily_sales": {
      "date_histogram": { "field": "created_at", "calendar_interval": "day" },
      "aggs": {
        "revenue": { "sum": { "field": "price" } }
      }
    },
    "moving_avg": {
      "moving_avg": {
        "buckets_path": "daily_sales>revenue",
        "window": 7,
        "model": "ewma"
      }
    }
  }
}
```

### Cumulative Sum

累计求和（计算累计销售额）：

```json
{
  "aggs": {
    "daily_revenue": {
      "date_histogram": { "field": "created_at", "calendar_interval": "day" },
      "aggs": {
        "revenue": { "sum": { "field": "price" } },
        "cumulative_revenue": {
          "cumulative_sum": { "buckets_path": "revenue" }
        }
      }
    }
  }
}
```

## 聚合的内存问题

聚合需要在内存中构建数据结构。对于高基数字段（大量唯一值），聚合可能消耗大量内存。

### 高基数字段聚合

一个有 1000 万唯一值的 `user_id` 字段做 Terms 聚合，默认返回 Top 10，但中间计算过程需要维护所有桶。解决方案：

1. **使用 `execution_ord`**：对于 keyword 字段，使用 `global_ordinals` 执行模式（默认），复用 FST 减少内存。
2. **限制 `size` 和 `shard_size`**：减少返回和中间计算的桶数量。
3. **预聚合**：在应用层或数据管道中预先计算。

```json
{
  "aggs": {
    "by_user": {
      "terms": {
        "field": "user_id.keyword",
        "size": 10,
        "shard_size": 50
      }
    }
  }
}
```

## 聚合与深度分页

聚合本身不支持深度分页。如果需要按聚合结果分页，使用 `composite` 聚合（支持 `after` 游标）：

```json
{
  "size": 0,
  "aggs": {
    "by_category_and_date": {
      "composite": {
        "sources": [
          { "category": { "terms": { "field": "category.keyword" } } },
          { "date": { "date_histogram": { "field": "created_at", "calendar_interval": "day" } } }
        ],
        "size": 10,
        "after": { "category": "electronics", "date": 1706227200000 }
      }
    }
  }
}
```

`composite` 聚合的优势：支持游标式遍历所有桶，不受 `search.max_buckets` 限制。

::: tip 聚合结果太多？
如果桶数量极多（比如按百万级 user_id 分桶），考虑：
1. 只关心 Top N：使用 Terms 聚合的 `size` 参数。
2. 需要全部桶：使用 Composite 聚合 + 游标分批获取。
3. 需要所有桶的统计值：考虑在应用层或 ETL 管道中处理。
:::
