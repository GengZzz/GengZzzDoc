# 分布式架构

ES 的分布式架构决定了数据如何在节点间分布、集群如何选举 Master、以及故障时如何恢复。理解这些机制是做好集群规划和故障排查的前提。

## 集群发现（Discovery）

ES 节点启动后需要找到其他节点组成集群，这个过程叫 Discovery。

### Zen Discovery（7.x 之前）

早期版本使用 Zen Discovery，需要配置 `discovery.zen.ping.unicast.hosts` 指定种子节点。

### Zen2（7.x+）

7.x 版本引入 Zen2，基于 Raft 协议简化了集群发现和选举过程。使用 `discovery.seed_hosts` 配置种子节点：

```yaml
discovery.seed_hosts:
  - "10.0.0.1:9300"
  - "10.0.0.2:9300"
  - "10.0.0.3:9300"
```

节点间通过 9300 端口（TCP）通信（REST API 使用 9200 端口）。

## Master 选举

### 选举条件

集群中的 Master-eligible 节点参与选举。选举需要满足 quorum（多数派）：

```
quorum = (master_eligible_nodes / 2) + 1
```

| Master-eligible 节点数 | Quorum | 最多容忍故障节点 |
|-----------------------|--------|----------------|
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

::: tip 为什么推荐奇数个 Master 节点
3 个 Master 节点和 4 个 Master 节点的容错能力相同（都只能容忍 1 个故障）。奇数节点节省资源。
:::

### 选举流程

```
① 节点启动，发现种子节点
② 互相 Ping，交换节点信息
③ 投票选举 Master（优先选 cluster_state 版本号高的节点）
④ 得到 quorum 票数的节点成为 Master
⑤ Master 发布 Cluster State，其他节点加入
```

## 脑裂问题（Split Brain）

脑裂是指集群中出现多个 Master，各自认为自己是合法的 Master，导致数据不一致。

### 脑裂场景

```
正常状态（3 节点）：         网络分区后：
  Node1 ←→ Node2 ←→ Node3    Node1    Node2 ←→ Node3
  Master: Node2               Master: Node1    Master: Node2
```

Node1 与 Node2/3 之间的网络断开后，Node1 认为其他节点都挂了，自己选自己为 Master。同时 Node2/3 继续认为 Node2 是 Master。两个 Master 各自接受写入，导致数据分叉。

### 防止脑裂

Zen2 协议已经从机制上防止了脑裂（基于 Term + Majority），但正确配置仍然重要：

```yaml
# 设置最小 Master 节点数（Zen2 自动管理，但此配置仍有意义）
discovery.zen.minimum_master_nodes: 2  # 7.x 之前必须手动设置
```

::: tip 7.x+ 的改进
Zen2 使用基于 Term 的选举机制，类似 Raft，从协议层面解决了脑裂问题。但仍然建议：
1. 部署 3 个专用 Master 节点。
2. Master 节点不存储数据（只做集群管理）。
3. 不要让 Master 节点承担过重的 Coordinating 角色。
:::

## Cluster State

Cluster State 是集群的元数据，由 Master 维护并广播给所有节点。它包含：

```
Cluster State
├── Cluster Name
├── Cluster UUID
├── Nodes — 所有节点信息
├── Index Metadata — 索引的 Mapping、Settings、Aliases
├── Routing Table — Shard 分配信息（哪个 Shard 在哪个节点上）
└── Index Graveyard — 已删除索引的墓碑记录
```

Cluster State 变更流程：

```
① Master 收到变更请求（创建索引、节点加入/离开）
② Master 修改 Cluster State
③ Master 将新 Cluster State 发送给所有节点
④ 各节点确认接收
⑤ Master 收到 quorum 确认后，标记变更完成
```

::: warning Cluster State 过大
Cluster State 过大会导致广播延迟和节点同步问题。常见原因：
1. 过多的索引（每个索引的 Mapping 都记录在 Cluster State 中）。
2. 过多的别名。
3. 使用 Dynamic Mapping 产生大量字段。
解决方案：使用索引模板、避免过度分片、定期清理旧索引。
:::

## 分片分配策略

Master 负责决定每个 Shard 放在哪个节点上。分配过程受多种因素影响。

### 分配决策流程

```
① 新索引创建 → 需要分配 Primary Shard
② Master 遍历所有节点，应用分配规则
③ 过滤 → 排除不满足条件的节点
④ 排序 → 按优先级排序剩余节点
⑤ 选择 → 将 Shard 分配到最优节点
```

### 分配规则

**过滤规则**：

| 配置 | 作用 |
|------|------|
| `index.routing.allocation.require` | 必须满足的节点属性 |
| `index.routing.allocation.include` | 节点属性必须包含这些值之一 |
| `index.routing.allocation.exclude` | 排除具有这些属性的节点 |

```json
{
  "index": {
    "routing": {
      "allocation": {
        "require": { "data": "hot" },
        "exclude": { "name": "node-5" }
      }
    }
  }
}
```

**均衡规则**：
- 同一索引的 Primary 和 Replica 不放在同一节点。
- 尽量使每个节点上的 Shard 数量均衡。
- 考虑磁盘使用率（默认 85% 触发水位线，90% 禁止分配）。

### Shard Awareness（分片感知）

通过 `cluster.routing.allocation.awareness.attributes` 让 ES 感知节点的物理位置，避免同一数据的多个副本落在同一机架或可用区：

```yaml
node.attr.zone: us-east-1a

cluster.routing.allocation.awareness.attributes: zone
cluster.routing.allocation.awareness.force.zone.values: us-east-1a, us-east-1b
```

配置后，ES 会确保同一 Shard 的 Primary 和 Replica 分布在不同 Zone 中。

## 分片分配的水位线

ES 通过三层水位线控制磁盘空间：

| 水位线 | 阈值 | 行为 |
|--------|------|------|
| Low | 85% | 不再向该节点分配新 Shard |
| High | 90% | 尝试将该节点上的 Shard 迁移到其他节点 |
| Flood Stage | 95% | 强制设置索引为 `read_only_allow_delete` |

```yaml
# 自定义水位线
cluster.routing.allocation.disk.watermark.low: "80%"
cluster.routing.allocation.disk.watermark.high: "85%"
cluster.routing.allocation.disk.watermark.flood_stage: "90%"
```

::: tip 磁盘水位线触发后怎么办
如果索引被设置为 `read_only_allow_delete`，手动解除：
```bash
PUT /my-index/_settings
{
  "index.blocks.read_only_allow_delete": null
}
```
但前提是确保磁盘空间已经释放。
:::
