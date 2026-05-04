# 实战场景

ES 的价值在于解决实际业务问题。这一章覆盖最常见的三个实战场景：日志检索、商品搜索和监控告警。

## 日志检索方案（ELK Stack）

ELK 是 Elasticsearch + Logstash + Kibana 的缩写，是业界最流行的日志收集和检索方案。现在通常扩展为 Elastic Stack，加入 Beats 作为轻量采集器。

### 架构

```
应用服务器 → Filebeat → Logstash（可选）→ Elasticsearch → Kibana
               │              │
               │              ├── 解析日志格式
               │              ├── 提取字段（Grok）
               │              └── 数据清洗
               └── 轻量级日志采集器，每台服务器部署
```

### Filebeat 配置

```yaml
filebeat.inputs:
  - type: log
    paths:
      - /var/log/myapp/*.log
    multiline.pattern: '^\d{4}-\d{2}-\d{2}'
    multiline.negate: true
    multiline.match: after

output.elasticsearch:
  hosts: ["http://es01:9200", "http://es02:9200"]
  index: "logs-myapp-%{+yyyy.MM.dd}"
```

### 日志索引设计

```json
PUT _index_template/logs_template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "refresh_interval": "30s",
      "index.lifecycle.name": "logs_policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "message": { "type": "text", "analyzer": "standard" },
        "service": { "type": "keyword" },
        "host": { "type": "keyword" },
        "trace_id": { "type": "keyword" }
      }
    }
  }
}
```

### 日志查询示例

```bash
# 按服务和日志级别过滤
GET /logs-*/_search
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "service": "order-service" } },
        { "term": { "level": "ERROR" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ],
      "must": [
        { "match": { "message": "timeout" } }
      ]
    }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 50
}

# 按 Trace ID 查询全链路日志
GET /logs-*/_search
{
  "query": { "term": { "trace_id": "abc123def456" } },
  "sort": [{ "@timestamp": "asc" }]
}
```

### 日志性能优化

| 优化项 | 做法 |
|--------|------|
| 索引生命周期 | Hot（7天）→ Warm（30天）→ Cold（90天）→ Delete |
| 分片规划 | 每天一个索引，每天 3-5 个 Primary Shard |
| Mapping | 精确字段用 keyword，message 用 text；关闭不需要的 `_all` |
| 写入 | Filebeat → Kafka → Logstash → ES，削峰填谷 |
| 查询 | 使用 `filter` 代替 `must` 做精确过滤 |

## 商品搜索方案

电商搜索是 ES 最复杂的应用场景之一，涉及中文分词、相关性排序、拼写纠错、同义词、自动补全、高亮等。

### 商品索引设计

```json
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "analysis": {
      "analyzer": {
        "product_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": ["lowercase", "synonym_filter", "pinyin_filter"]
        },
        "product_search_analyzer": {
          "type": "custom",
          "tokenizer": "ik_smart",
          "filter": ["lowercase"]
        }
      },
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms_path": "analysis/synonyms.txt"
        },
        "pinyin_filter": {
          "type": "pinyin",
          "keep_full_pinyin": false,
          "keep_joined_full_pinyin": true
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "product_analyzer",
        "search_analyzer": "product_search_analyzer",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "brand": { "type": "keyword" },
      "category": { "type": "keyword" },
      "price": { "type": "scaled_float", "scaling_factor": 100 },
      "sales": { "type": "integer" },
      "rating": { "type": "float" },
      "created_at": { "type": "date" },
      "tags": { "type": "keyword" },
      "description": {
        "type": "text",
        "analyzer": "ik_max_word"
      }
    }
  }
}
```

### 商品搜索查询

```json
GET /products/_search
{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": [
            {
              "multi_match": {
                "query": "苹果笔记本",
                "fields": ["name^5", "brand^3", "description"],
                "type": "best_fields"
              }
            }
          ],
          "filter": [
            { "term": { "category": "电脑" } },
            { "range": { "price": { "gte": 5000, "lte": 20000 } } }
          ]
        }
      },
      "functions": [
        {
          "field_value_factor": {
            "field": "sales",
            "modifier": "log1p",
            "factor": 0.01,
            "missing": 1
          }
        },
        {
          "field_value_factor": {
            "field": "rating",
            "modifier": "sqrt",
            "missing": 3
          }
        }
      ],
      "score_mode": "sum",
      "boost_mode": "multiply"
    }
  },
  "highlight": {
    "fields": {
      "name": { "pre_tags": ["<em>"], "post_tags": ["</em>"] }
    }
  },
  "aggs": {
    "by_brand": { "terms": { "field": "brand", "size": 10 } },
    "by_category": { "terms": { "field": "category", "size": 10 } },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "key": "0-5000", "to": 5000 },
          { "key": "5000-10000", "from": 5000, "to": 10000 },
          { "key": "10000+", "from": 10000 }
        ]
      }
    }
  }
}
```

### 拼写纠错

使用 `term` Suggester 实现拼写纠错：

```json
GET /products/_search
{
  "suggest": {
    "product_suggest": {
      "text": "mackbook",
      "term": {
        "field": "name",
        "suggest_mode": "popular",
        "max_edits": 2
      }
    }
  }
}
```

### 自动补全（Completion Suggester）

```json
{
  "mappings": {
    "properties": {
      "name_suggest": {
        "type": "completion",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      }
    }
  }
}
```

写入时提供补全数据：

```json
POST /products/_doc
{
  "name": "MacBook Pro",
  "name_suggest": [
    { "input": "MacBook Pro", "weight": 10 },
    { "input": "苹果笔记本", "weight": 8 }
  ]
}
```

查询自动补全：

```json
POST /products/_search?size=5
{
  "suggest": {
    "product-suggest": {
      "prefix": "mac",
      "completion": {
        "field": "name_suggest",
        "fuzzy": { "fuzziness": 1 }
      }
    }
  }
}
```

## 监控告警

### ElastAlert

ElastAlert 是 Yelp 开源的告警框架，支持多种告警规则：

```yaml
# 配置文件
rules_folder: rules
run_every:
  minutes: 1
buffer_time:
  minutes: 15
es_host: localhost
es_port: 9200
```

规则示例（频率告警：5 分钟内 ERROR 日志超过 100 条触发告警）：

```yaml
name: error_rate_spike
type: frequency
index: logs-*
num_events: 100
timeframe:
  minutes: 5
filter:
  - term:
      level: "ERROR"
alert:
  - "slack"
slack_webhook_url: "https://hooks.slack.com/services/xxx"
```

### Watcher（X-Pack 内置）

Watcher 是 ES 商业版内置的告警功能：

```json
PUT _watcher/watch/error_watch
{
  "trigger": {
    "schedule": { "interval": "5m" }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["logs-*"],
        "body": {
          "query": {
            "bool": {
              "filter": [
                { "term": { "level": "ERROR" } },
                { "range": { "@timestamp": { "gte": "now-5m" } } }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": { "ctx.payload.hits.total": { "gt": 100 } }
  },
  "actions": {
    "notify_slack": {
      "webhook": {
        "scheme": "https",
        "host": "hooks.slack.com",
        "port": 443,
        "path": "/services/xxx",
        "body": "{\"text\": \"ERROR 日志 5 分钟内超过 100 条\"}"
      }
    }
  }
}
```

## 安全（X-Pack / RBAC）

ES 8.x 默认启用安全特性。

### 用户与角色

```bash
# 创建角色
POST _security/role/log_reader
{
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["read"],
      "field_security": { "grant": ["@timestamp", "level", "message", "service"] }
    }
  ]
}

# 创建用户
POST _security/user/log_user
{
  "password": "changeme",
  "roles": ["log_reader"],
  "full_name": "日志查看员"
}
```

### TLS 加密

生产环境必须启用 TLS（传输层加密）：

```yaml
# elasticsearch.yml
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
```

::: tip 安全实践
1. 默认密码必须修改。
2. 使用 RBAC 限制用户权限（最小权限原则）。
3. 启用 TLS 加密节点间通信。
4. 启用审计日志追踪操作。
5. 不要将 9200 端口暴露到公网，使用 Nginx 反向代理 + 认证。
:::
