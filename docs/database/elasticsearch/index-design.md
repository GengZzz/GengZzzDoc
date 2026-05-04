# 索引设计

良好的索引设计是 ES 系统稳定运行的前提。这包括索引模板的复用、日志场景的 Rollover 策略、别名管理、生命周期管理和分片数规划。

## 索引模板

索引模板（Index Template）在创建索引时自动应用预定义的 Settings 和 Mappings。它是管理大量索引的核心手段。

```json
PUT _index_template/logs_template
{
  "index_patterns": ["logs-*"],
  "priority": 100,
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "30s",
      "index.lifecycle.name": "logs_policy",
      "index.lifecycle.rollover_alias": "logs"
    },
    "mappings": {
      "dynamic": "false",
      "properties": {
        "@timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "message": { "type": "text", "analyzer": "standard" },
        "service": { "type": "keyword" },
        "host": { "type": "keyword" }
      }
    }
  }
}
```

匹配规则：索引名符合 `logs-*` 模式的索引会自动应用这个模板。多个模板匹配时，`priority` 值大的优先。

::: tip 模板版本管理
V2 模板（`_index_template`）比 V1 模板（`_template`）功能更强，支持组合多个模板。新版本请使用 V2 API。
:::

## Rollover 索引

日志场景下，单个索引会持续增长，最终导致性能下降和管理困难。Rollover 策略在满足条件时自动创建新索引。

### 手动 Rollover

```bash
POST /logs/_rollover
{
  "conditions": {
    "max_age": "7d",
    "max_docs": 10000000,
    "max_size": "50gb"
  }
}
```

当 `logs` 别名指向的当前索引满足任一条件时，自动创建新索引（如 `logs-000002`），并将别名切换到新索引。

### 配合 ILM 自动 Rollover

实际中通常将 Rollover 与 ILM（Index Lifecycle Management）配合使用，实现全自动管理。

## 别名管理

别名（Alias）是一个或多个索引的逻辑名称。它是实现零停机索引切换的关键。

```bash
# 创建别名
POST _aliases
{
  "actions": [
    { "add": { "index": "logs-000001", "alias": "logs" } },
    { "add": { "index": "logs-000001", "alias": "logs-write", "is_write_index": true } }
  ]
}
```

别名的典型用法：

- **读写分离**：`logs` 别名指向所有索引（只读），`logs-write` 指向当前写入索引。
- **索引切换**：零停机重建索引时，将别名从旧索引切到新索引。
- **多租户隔离**：每个租户一个索引，通过别名统一访问。

```bash
# 零停机切换（原子操作）
POST _aliases
{
  "actions": [
    { "remove": { "index": "logs-000001", "alias": "logs" } },
    { "add": { "index": "logs-000002", "alias": "logs" } }
  ]
}
```

::: tip 别名过滤器
别名可以带过滤条件，实现数据隔离：
```json
{ "add": { "index": "orders", "alias": "orders-shanghai", "filter": { "term": { "region": "shanghai" } } } }
```
查询 `orders-shanghai` 时自动带上 `region=shanghai` 过滤。
:::

## Index Lifecycle Management (ILM)

ILM 自动管理索引从创建到删除的完整生命周期，定义多个阶段和对应的操作。

```json
PUT _ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "7d",
            "max_primary_shard_size": "50gb"
          },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 },
          "allocate": { "number_of_replicas": 0 },
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "require": { "data": "cold" }
          },
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

各阶段的典型操作：

| 阶段 | 时间 | 操作 | 目的 |
|------|------|------|------|
| Hot | 0 ~ 7 天 | Rollover、频繁写入 | 承受写入压力 |
| Warm | 7 ~ 30 天 | Shrink、Force Merge、减少副本 | 减少资源消耗 |
| Cold | 30 ~ 90 天 | 迁移到冷节点、0 副本 | 进一步降本 |
| Delete | 90 天后 | 删除索引 | 清理过期数据 |

::: tip ILM + Rollover 的完整流程
1. 创建索引模板，指定 `index.lifecycle.name` 和 `index.lifecycle.rollover_alias`
2. 创建第一个索引（如 `logs-000001`）并关联别名 `logs`
3. 写入数据到 `logs` 别名
4. 满足 Rollover 条件后，ILM 自动创建 `logs-000002` 并切换别名
5. 旧索引按策略进入 Warm → Cold → Delete
:::

## 分片数规划

分片数是创建索引时最重要的决策之一。分片太少导致单个 Shard 过大、无法水平扩展；分片太多增加集群元数据负担和搜索合并开销。

### 经验公式

```
分片数 = 数据总量 / 目标单 Shard 大小
目标单 Shard 大小：10GB ~ 50GB（搜索场景偏小，日志场景偏大）
```

### 实际场景举例

| 场景 | 日增量 | 保留周期 | 总数据量 | 推荐策略 |
|------|--------|---------|---------|---------|
| 日志检索 | 50GB/天 | 30 天 | 1.5TB | 每天 1 个索引，3 个 Primary Shard，Rollover + ILM |
| 商品搜索 | 相对稳定 | 长期 | 20GB | 1-2 个 Primary Shard，1 个 Replica |
| 用户行为分析 | 100GB/天 | 90 天 | 9TB | 每天 1 个索引，5-10 个 Primary Shard |

### 关键原则

1. **单 Shard 控制在 10-50GB**：Lucene 对单个 Segment 的搜索效率在小数据量时更高。
2. **Primary Shard 数 = 节点数的倍数**：确保分片均匀分配。3 个节点时用 3/6/9 个 Shard。
3. **副本数 >= 1**：保证高可用。读多写少的场景可以增加副本提升读吞吐。
4. **预留扩展空间**：初始 Shard 数可以偏多，后续通过 `_shrink` 或 `_split` 调整（有前置条件）。

::: warning 避免过度分片
每个 Shard 都消耗文件句柄、内存和 CPU。集群的 Shard 总数不宜超过 `节点数 × 每节点 20 个 Shard`（经验值）。100 个 Shard 的索引创建 5 个副本 = 600 个 Shard，对小集群是巨大的负担。
:::
