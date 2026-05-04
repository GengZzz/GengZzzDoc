# 映射与分词

Mapping 定义了索引中每个字段的类型和处理方式，是 ES 中最基础也最重要的配置。Analyzer 决定文本如何被切分为 Term，直接影响搜索质量。

## Field Type

ES 支持丰富的字段类型，选择正确的类型决定了数据如何被索引、存储和查询。

### 文本类型

| 类型 | 用途 | 是否分词 | 是否支持聚合 |
|------|------|----------|-------------|
| `text` | 全文搜索（文章标题、描述） | 是 | 否（需开启 Fielddata） |
| `keyword` | 精确匹配、排序、聚合（状态码、标签） | 否 | 是 |

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "status": {
        "type": "keyword"
      }
    }
  }
}
```

::: tip text + keyword 双字段
一个字段同时需要全文搜索和精确匹配时，使用 Multi-Field：
```json
{
  "name": {
    "type": "text",
    "analyzer": "ik_max_word",
    "fields": {
      "keyword": {
        "type": "keyword",
        "ignore_above": 256
      }
    }
  }
}
```
这样 `name` 可以做全文搜索，`name.keyword` 可以做聚合和排序。
:::

### 数值类型

| 类型 | 范围 |
|------|------|
| `integer` | 32 位整数 |
| `long` | 64 位整数 |
| `float` | 32 位浮点 |
| `double` | 64 位浮点 |
| `scaled_float` | 缩放浮点（适合金额，如 `scaling_factor: 100`） |

```json
{
  "price": {
    "type": "scaled_float",
    "scaling_factor": 100
  }
}
```

`scaled_float` 将浮点数乘以 scaling_factor 转为整数存储，节省空间的同时保持精度。`19.99` 以 `1999` 存储。

### 日期类型

ES 内部将日期存储为长整型（毫秒时间戳）。支持多种格式的日期字符串自动解析：

```json
{
  "created_at": {
    "type": "date",
    "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
  }
}
```

### 布尔类型

`boolean` 类型接受 `true/false`、`"true"/"false"`、`1/0`。内部以 `true`/`false` 存储。

### 对象与嵌套类型

**Object 类型**（默认扁平化处理）：

```json
{
  "author": {
    "name": "张三",
    "age": 30
  }
}
```

存储后被扁平化为 `author.name` 和 `author.age`。多值对象时会丢失字段间的关联关系：

```json
// 原始数据
{ "author": [{ "name": "张三", "age": 30 }, { "name": "李四", "age": 25 }] }

// 扁平化后（丢失关联）
{ "author.name": ["张三", "李四"], "author.age": [30, 25] }
```

查询 `name=张三 AND age=25` 会错误匹配到这条数据。

**Nested 类型**（保持关联）：

```json
{
  "author": {
    "type": "nested",
    "properties": {
      "name": { "type": "text" },
      "age": { "type": "integer" }
    }
  }
}
```

Nested 类型将每个对象作为独立的隐藏文档存储，保持字段关联性。查询时使用 `nested` 查询：

```json
{
  "query": {
    "nested": {
      "path": "author",
      "query": {
        "bool": {
          "must": [
            { "match": { "author.name": "张三" } },
            { "term": { "author.age": 25 } }
          ]
        }
      }
    }
  }
}
```

::: warning Nested 的代价
每次 Nested 查询实际上是在隐藏文档上做独立查询，性能比 Object 类型差。如果不需要保持字段关联，优先使用 Object 类型。
:::

## Dynamic Mapping

写入文档时，如果字段没有在 Mapping 中预先定义，ES 会根据字段值自动推断类型。这就是 Dynamic Mapping。

### 推断规则

| JSON 值 | 推断类型 |
|---------|----------|
| `"hello"` | `text` + `keyword` 子字段 |
| `true` / `false` | `boolean` |
| `123` | `long` |
| `12.3` | `float` |
| `"2026-01-15"` | `date`（如果匹配日期格式） |
| `{}` | `object` |
| `[1, 2, 3]` | 由第一个非 null 元素决定类型 |

### Dynamic 策略

```json
{
  "mappings": {
    "dynamic": "true"    // 自动映射新字段（默认）
  }
}
```

| 值 | 行为 |
|----|------|
| `true` | 自动映射新字段 |
| `false` | 忽略新字段，不索引但存储在 `_source` |
| `strict` | 遇到未知字段直接报错 |

::: tip 生产环境建议
生产环境建议使用 `"dynamic": "strict"` 或 `"dynamic": "false"`，避免 Dynamic Mapping 推断出意外的类型（比如 ID 字符串被推断为 `text` 而非 `keyword`）。如果需要灵活的动态映射，使用 Index Template 控制。
:::

## Analyzer

Analyzer 是文本处理的核心，决定了文本如何被切分为 Term。一个 Analyzer 由三个阶段组成：

```
原始文本 → [Character Filter] → [Tokenizer] → [Token Filter] → Term 列表
```

### 三个阶段

**Character Filter（字符过滤器）**：在分词之前对原始文本做预处理。例如：
- `html_strip`：去除 HTML 标签
- `mapping`：字符映射（如将 `&` 替换为 `and`）
- `pattern_replace`：正则替换

**Tokenizer（分词器）**：将文本切分为 Token。这是最关键的一步：
- `standard`：按空格和标点切分，去除标点
- `ik_max_word`：IK 中文细粒度分词
- `ik_smart`：IK 中文粗粒度分词
- `edge_ngram`：边缘 n-gram（用于自动补全）
- `keyword`：不切分，整个文本作为一个 Token

**Token Filter（词元过滤器）**：对 Token 做后续处理：
- `lowercase`：转小写
- `stop`：去除停用词（如 `the`、`is`、`的`）
- `synonym`：同义词替换
- `stemmer`：词干提取（如 `running` → `run`）

### 内置 Analyzer

```bash
# 测试 standard analyzer
POST _analyze
{
  "analyzer": "standard",
  "text": "The Quick Brown Foxes"
}
# 结果: [the, quick, brown, foxes]

# 测试 simple analyzer
POST _analyze
{
  "analyzer": "simple",
  "text": "The Quick Brown Foxes"
}
# 结果: [the, quick, brown, foxes] — 仅按非字母字符切分并转小写
```

### 自定义 Analyzer

```json
PUT /my-index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "char_filter": ["html_strip"],
          "tokenizer": "ik_max_word",
          "filter": ["lowercase", "my_stop", "my_synonym"]
        }
      },
      "filter": {
        "my_stop": {
          "type": "stop",
          "stopwords": ["的", "了", "是"]
        },
        "my_synonym": {
          "type": "synonym",
          "synonyms": [
            "番茄, 西红柿",
            "土豆, 马铃薯"
          ]
        }
      }
    }
  }
}
```

::: tip 测试 Analyzer
创建 Analyzer 后，使用 `_analyze` API 验证分词效果：
```bash
POST /my-index/_analyze
{
  "analyzer": "my_analyzer",
  "text": "番茄是一种蔬菜"
}
```
:::

## IK 中文分词

ES 默认的 `standard` Analyzer 对中文按单字切分，无法满足中文搜索需求。IK Analyzer 是最流行的中文分词插件。

### 安装 IK

```bash
# 版本需与 ES 版本一致
./bin/elasticsearch-plugin install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v8.13.0/elasticsearch-analysis-ik-8.13.0.zip
```

安装后重启 ES，IK 提供两种分词模式：

| 模式 | 特点 | 适用场景 |
|------|------|---------|
| `ik_max_word` | 最细粒度，尽可能多切分 | 索引时（Index） |
| `ik_smart` | 粗粒度，智能切分 | 搜索时（Query） |

```bash
# ik_max_word — 细粒度
POST _analyze
{ "analyzer": "ik_max_word", "text": "中华人民共和国国歌" }
# [中华人民共和国, 中华人民, 中华, 华人, 人民共和国, 人民, 共和国, 共和, 国歌]

# ik_smart — 粗粒度
POST _analyze
{ "analyzer": "ik_smart", "text": "中华人民共和国国歌" }
# [中华人民共和国, 国歌]
```

::: tip 索引与搜索使用不同 Analyzer
索引时用 `ik_max_word` 尽可能多地产生 Term，搜索时用 `ik_smart` 避免查询词被过度切分。这样既能提高召回率，又能减少误匹配。
:::

### 扩展词典

IK 支持自定义词典，解决专有名词被错误切分的问题。比如 "王者荣耀" 可能被切分为 "王者" + "荣耀"，通过自定义词典保持完整。

在 IK 插件目录的 `config/` 下创建自定义词典文件：

```text
# my_dict.dic
王者荣耀
元神
原神
```

修改 `IKAnalyzer.cfg.xml`：

```xml
<entry key="ext_dict">my_dict.dic</entry>
```

热更新方式：IK 支持远程词典，配置一个 HTTP URL，定期拉取最新词典，无需重启。

```xml
<entry key="remote_ext_dict">http://my-server/dict</entry>
```
