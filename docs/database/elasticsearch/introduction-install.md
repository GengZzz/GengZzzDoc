# Elasticsearch 简介与安装

Elasticsearch 是一个分布式的 RESTful 风格搜索和数据分析引擎。它底层基于 Apache Lucene，对外暴露简洁的 HTTP JSON 接口，能够对海量数据进行近实时的全文搜索、结构化查询和聚合分析。

## Elasticsearch 的定位

ES 不仅仅是一个搜索引擎，它同时承担了三个角色：

- **搜索引擎**：全文检索、模糊匹配、相关性排序。典型场景：站内搜索、日志检索。
- **分析引擎**：聚合统计、指标计算、时序分析。典型场景：业务报表、监控大盘。
- **文档数据库**：JSON 文档存储、Schema-free、嵌套对象。典型场景：商品信息、用户画像。

::: tip 适用场景
日志与指标分析（ELK Stack）、全文搜索（商品搜索/文档检索）、应用性能监控（APM）、安全分析（SIEM）。
:::

::: warning 不适用场景
强事务（ACID）、复杂关联查询（JOIN）、高精度金融计算。这些场景应使用关系型数据库。
:::

## 版本演进

ES 的版本号经历了几个关键阶段：

| 版本 | 关键变化 |
|------|----------|
| 1.x | 初期开源版本 |
| 2.x | 引入 Pipeline Aggregation |
| 5.x | 统一版本号（与 Logstash/Kibana 对齐），引入 Keyword 类型 |
| 6.x | 移除 Type 概念，Index 单 Type |
| 7.x | 默认 `_doc` Type，引入新的集群协调层（Zen2），引入 NLP |
| 8.x | 安全特性默认启用、向量搜索增强、ESQL 查询语言 |

::: tip 版本选择
新项目建议直接使用 8.x。如果只是做日志分析，7.x 也完全够用。避免使用 6.x 以下版本。
:::

## 单机安装

### 直接安装

从官网下载对应平台的压缩包：

```bash
# 下载（以 8.13.0 为例）
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.13.0-linux-x86_64.tar.gz
tar -xzf elasticsearch-8.13.0-linux-x86_64.tar.gz
cd elasticsearch-8.13.0

# 启动（开发模式）
./bin/elasticsearch

# 启动时设置集群名和节点名
./bin/elasticsearch -E cluster.name=my-cluster -E node.name=node-1
```

启动后默认监听 `9200` 端口，访问验证：

```bash
curl http://localhost:9200
```

返回类似以下 JSON 表示启动成功：

```json
{
  "name" : "node-1",
  "cluster_name" : "my-cluster",
  "version" : {
    "number" : "8.13.0"
  }
}
```

### 关键配置

`config/elasticsearch.yml` 中的常用配置项：

```yaml
# 集群名称，同集群内所有节点必须一致
cluster.name: my-application

# 节点名称
node.name: node-1

# 数据与日志目录
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# 绑定地址（生产环境不要用 0.0.0.0，除非做好安全措施）
network.host: 127.0.0.1
http.port: 9200

# 集群发现（单机不需要配置）
# discovery.seed_hosts: ["host1", "host2"]
# cluster.initial_master_nodes: ["node-1", "node-2"]
```

::: warning JVM 内存
ES 运行在 JVM 上，默认使用 1GB 堆内存。生产环境建议设置为物理内存的 50%（不超过 31GB，避免指针压缩失效）。修改 `config/jvm.options` 中的 `-Xms` 和 `-Xmx`。
:::

## Docker 安装

Docker 是最便捷的部署方式，适合开发和测试环境。

### 单节点

```bash
# 拉取镜像
docker pull docker.elastic.co/elasticsearch/elasticsearch:8.13.0

# 启动单节点
docker run -d \
  --name es01 \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.0
```

### Docker Compose 多节点

```yaml
version: '3.8'
services:
  es01:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: es01
    environment:
      - node.name=es01
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es02
      - cluster.initial_master_nodes=es01,es02
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - 9200:9200
    volumes:
      - esdata01:/usr/share/elasticsearch/data

  es02:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: es02
    environment:
      - node.name=es02
      - cluster.name=es-docker-cluster
      - discovery.seed_hosts=es01
      - cluster.initial_master_nodes=es01,es02
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    volumes:
      - esdata02:/usr/share/elasticsearch/data

volumes:
  esdata01:
  esdata02:
```

### Kibana（配套可视化工具）

```bash
docker run -d \
  --name kib01 \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://es01:9200" \
  docker.elastic.co/kibana/kibana:8.13.0
```

Kibana 提供了 Dev Tools（REST API 交互界面）、Discover（日志浏览）、Dashboard（可视化大盘）等功能。

## Kubernetes 安装

生产环境推荐使用 Elastic Cloud on Kubernetes (ECK) Operator：

```bash
# 安装 ECK Operator
kubectl create -f https://download.elastic.co/downloads/eck/2.12.1/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.12.1/operator.yaml

# 部署 ES 集群
cat <<EOF | kubectl apply -f -
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: quickstart
spec:
  version: 8.13.0
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    podTemplate:
      spec:
        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 2Gi
            limits:
              memory: 2Gi
EOF
```

ECK 会自动处理：节点发现、证书管理、扩缩容、滚动升级。

## 基本 REST API

ES 对外暴露 RESTful API，所有操作通过 HTTP 方法 + JSON Body 完成。

### 集群健康

```bash
GET _cluster/health
```

返回 `status` 字段：`green`（所有分片正常）、`yellow`（主分片正常，副本缺失）、`red`（主分片缺失）。

### 索引操作

```bash
# 创建索引
PUT /my-index
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}

# 查看索引信息
GET /my-index

# 删除索引
DELETE /my-index
```

### 文档 CRUD

```bash
# 写入文档（自动生成 _id）
POST /my-index/_doc
{
  "title": "Elasticsearch 入门",
  "author": "张三",
  "created_at": "2026-01-15"
}

# 写入文档（指定 _id）
PUT /my-index/_doc/1
{
  "title": "Elasticsearch 实战",
  "author": "李四",
  "created_at": "2026-02-20"
}

# 获取文档
GET /my-index/_doc/1

# 更新文档（部分更新）
POST /my-index/_update/1
{
  "doc": {
    "author": "李四四"
  }
}

# 删除文档
DELETE /my-index/_doc/1
```

### 搜索

```bash
# 全文搜索
GET /my-index/_search
{
  "query": {
    "match": {
      "title": "Elasticsearch"
    }
  }
}

# 带过滤条件的搜索
GET /my-index/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "Elasticsearch" } }
      ],
      "filter": [
        { "range": { "created_at": { "gte": "2026-01-01" } } }
      ]
    }
  }
}
```

### 批量操作（Bulk API）

Bulk API 是高效写入大量数据的标准方式，每行一个 action + data，换行分隔：

```bash
POST /_bulk
{ "index": { "_index": "my-index", "_id": "1" } }
{ "title": "ES 入门", "author": "张三" }
{ "index": { "_index": "my-index", "_id": "2" } }
{ "title": "ES 实战", "author": "李四" }
{ "update": { "_index": "my-index", "_id": "1" } }
{ "doc": { "author": "张三三" } }
{ "delete": { "_index": "my-index", "_id": "2" } }
```

::: tip Bulk API 最佳实践
每个 Bulk 请求建议控制在 5-15MB 之间。太小浪费 HTTP 开销，太大会占用过多内存导致 GC。可以通过 `_bulk?refresh=wait_for` 让写入后立即可搜索。
:::
