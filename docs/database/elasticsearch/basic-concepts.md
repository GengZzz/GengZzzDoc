# 核心概念

理解 Elasticsearch 的核心概念需要从两个维度入手：分布式系统维度和搜索引擎维度。

## 分布式系统层级

ES 的分布式架构从大到小分为以下几个层级：

```
Cluster（集群）
  └── Node（节点）
       └── Index（索引，逻辑概念）
            └── Shard（分片，物理存储单元）
                 └── Segment（段，不可变的数据文件）
```

### Cluster

集群是 ES 最顶层的抽象，由一个或多个 Node 组成。集群内所有节点共同维护一份完整的数据。集群通过 `cluster.name` 标识，同名的节点会自动组成集群。

### Node

一个运行中的 ES 实例就是一个 Node。每个节点都有一个唯一名称，默认随机分配（如 `node-1`）。节点的角色决定了它在集群中的职责：

| 角色 | 配置 | 职责 |
|------|------|------|
| Master-eligible | `node.roles: [master]` | 参与 Master 选举，维护 Cluster State |
| Data | `node.roles: [data]` | 存储数据、执行搜索/聚合 |
| Ingest | `node.roles: [ingest]` | 执行 Pipeline 预处理（如字段提取、格式转换） |
| Coordinating | 默认所有节点都是 | 接收客户端请求、路由、汇总结果 |

::: tip 实际部署
小集群（<20 节点）通常让节点承担多个角色。大集群（上百节点）建议角色分离：3 个专用 Master 节点 + 多个 Data 节点。专用 Master 节点不存储数据，只做集群管理，稳定性更高。
:::

### Index

Index 是逻辑上的数据集合，类似于关系型数据库中的"表"。它定义了数据的 Mapping（字段类型和分析规则）和 Settings（分片数、副本数等）。

```bash
# 查看索引元信息
GET /my-index/_settings
GET /my-index/_mapping
```

### Shard

每个 Index 由多个 Shard 组成。Shard 是 ES 中最小的数据存储和处理单元：

- **Primary Shard**：主分片，文档存储的第一个位置。创建索引后 Primary Shard 数量不可修改（除非 Reindex）。
- **Replica Shard**：副本分片，是 Primary Shard 的完整拷贝。提供高可用和读扩展。数量可以动态调整。

文档通过 `shard = hash(_id) % number_of_primary_shards` 路由到对应的 Primary Shard。

::: warning Primary Shard 数量规划
创建索引后无法修改 Primary Shard 数量（路由公式依赖这个值）。一般建议单个 Shard 大小控制在 10-50GB 之间。日志场景可以更大（50GB），搜索场景建议更小（10-20GB）。
:::

### Segment

每个 Shard 内部由多个不可变的 Segment 文件组成。Segment 是 Lucene 的底层存储单元，一个 Shard 对应一个 Lucene Index。新写入的数据先在内存中构建，Refresh 后生成新的 Segment 文件。

## 文档与字段

文档（Document）是 ES 中的基本数据单元，本质上就是一个 JSON 对象。

```json
{
  "_index": "products",
  "_id": "1001",
  "_source": {
    "name": "MacBook Pro",
    "brand": "Apple",
    "price": 14999,
    "tags": ["laptop", "developer"],
    "specs": {
      "cpu": "M3 Pro",
      "ram_gb": 18
    },
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

每个字段（Field）都有对应的类型，决定了数据如何被索引和存储。

## 倒排索引的核心思想

传统的关系型数据库使用 B+ 树索引，适合精确查找和范围查询。ES 使用倒排索引（Inverted Index），专为全文搜索设计。

### 正排 vs 倒排

**正排索引（Forward Index）**：文档 ID → 文档内容

```
Doc1: "Elasticsearch 是搜索引擎"
Doc2: "MySQL 是关系型数据库"
Doc3: "Elasticsearch 基于 Lucene"
```

**倒排索引（Inverted Index）**：Term → 文档列表（Posting List）

```
"Elasticsearch" → [Doc1, Doc3]
"搜索引擎"     → [Doc1]
"MySQL"        → [Doc2]
"关系型数据库"  → [Doc2]
"Lucene"       → [Doc3]
```

查询 "Elasticsearch" 时，直接在倒排索引中定位到 Term，就能立即得到包含该词的所有文档，而不需要逐行扫描。这就是全文搜索高效的根本原因。

::: tip 分词是关键
倒排索引的前提是对文本进行分词（Tokenization）。中文需要专门的分词器（如 IK），英文则按空格和标点切分。分词质量直接决定搜索质量。
:::

## 与关系型数据库的类比

| 关系型数据库 | Elasticsearch | 说明 |
|-------------|---------------|------|
| Database | Cluster | 最高层级 |
| Table | Index | 数据集合 |
| Row | Document | 一条数据 |
| Column | Field | 数据字段 |
| Schema | Mapping | 字段定义和类型 |
| SQL | Query DSL | 查询语言 |
| Primary Key | `_id` | 文档唯一标识 |
| INSERT | `POST /_doc` | 写入 |
| SELECT | `GET /_search` | 查询 |
| WHERE | `query` / `filter` | 过滤条件 |
| GROUP BY | Aggregation | 聚合统计 |
| UPDATE | `POST /_update` | 部分更新 |
| DELETE | `DELETE /_doc` | 删除 |

::: warning 重要区别
ES 不是关系型数据库。它没有 JOIN 支持（需要在应用层处理或使用 denormalization），没有严格的 schema（Dynamic Mapping 可能导致字段类型推断错误），事务支持有限。ES 的强项是搜索和分析，不适合替代关系型数据库做事务处理。
:::

## REST API 与 JSON

ES 通过 HTTP + JSON 对外提供服务。这使得任何语言都能轻松对接，不需要专用的客户端驱动。

基本请求模式：

```
HTTP 方法   URI                    用途
PUT/POST    /<index>/_doc/<id>     创建/更新文档
GET         /<index>/_doc/<id>     获取文档
DELETE      /<index>/_doc/<id>     删除文档
POST        /<index>/_search       搜索
GET         /_cluster/health       集群状态
PUT         /<index>               创建索引
DELETE      /<index>               删除索引
```
