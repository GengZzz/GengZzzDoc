# 集群运维

集群的日常运维包括节点管理、滚动升级、扩缩容、架构设计和备份恢复。这些操作直接影响集群的可用性和数据安全。

## 滚动重启

更新 ES 版本或调整配置时，需要逐个重启节点，避免集群不可用。

### 标准流程

```
① 禁用分片分配（避免重启期间不必要的 Shard 迁移）
② 同步刷新（加速重启后的恢复）
③ 停止节点，执行更新
④ 启动节点，等待加入集群
⑤ 等待分片恢复（Shard recovery）
⑥ 重新启用分片分配
⑦ 对下一个节点重复
```

具体操作：

```bash
# ① 禁用分片分配
PUT _cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.enable": "none"
  }
}

# ② 同步刷新（7.x+ 已弃用，8.x 无此 API，但 concept 仍在）
POST /_flush

# ③ 停止节点（systemctl stop elasticsearch 或 docker stop）

# ④ 更新并启动节点

# ⑤ 等待节点加入集群后，恢复分配
GET _cluster/health?wait_for_status=green

# ⑥ 重新启用分配
PUT _cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.enable": null
  }
}
```

::: tip 滚动升级版本兼容性
- 小版本升级（如 8.12 → 8.13）：支持滚动重启。
- 大版本升级（如 7.x → 8.x）：需要先查阅官方兼容性矩阵。7.17+ 可以直接滚动升级到 8.x。
- 跨多个大版本（如 6.x → 8.x）：必须先升级到 7.x 最新版本。
:::

## 节点扩容

添加新节点是提升集群容量最直接的方式。ES 的自动分片分配使扩容非常简单。

### 扩容流程

```
① 部署新节点，配置与现有集群相同的 cluster.name
② 新节点自动发现并加入集群
③ Master 自动触发 Rebalance，将部分 Shard 迁移到新节点
④ 等待集群状态变为 green
```

### 扩容注意事项

- 新节点的 `node.roles` 配置需要与预期一致。
- 如果使用 Hot-Warm 架构，新节点需要设置正确的节点属性（`node.attr.data: hot`）。
- 扩容后观察 Rebalance 是否完成，避免在 Rebalance 期间执行大量写入。

## 节点缩容（优雅下线）

直接关机会导致该节点上的 Shard 变为 unassigned，集群状态变为 yellow 或 red。

### 优雅下线流程

```bash
# 1. 禁止新 Shard 分配到该节点
PUT _cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.exclude._name": "node-to-remove"
  }
}

# 2. 等待该节点上的 Shard 全部迁出
GET _cat/shards?v&h=index,shard,prirep,node&s=node
# 确认 node-to-remove 上没有 Shard

# 3. 停止节点
# 节点停止后集群自动从 Cluster State 中移除它

# 4. 清理排除设置
PUT _cluster/settings
{
  "persistent": {
    "cluster.routing.allocation.exclude._name": null
  }
}
```

## Rebalance（再平衡）

当集群状态变化（节点加入/离开、索引创建/删除）导致 Shard 分布不均时，Master 自动触发 Rebalance。

### Rebalance 策略

```yaml
# 控制 Rebalance 并发数
cluster.routing.allocation.cluster_concurrent_rebalance: 2

# 控制每个节点的恢复并发数
cluster.routing.allocation.node_concurrent_recoveries: 2

# 恢复速度限制
indices.recovery.max_bytes_per_sec: "40mb"
```

::: tip Rebalance 对性能的影响
Rebalance 会消耗网络带宽和磁盘 I/O。在业务高峰期，可以通过调低 `max_bytes_per_sec` 和 `cluster_concurrent_rebalance` 减少影响。必要时可以临时禁用 Rebalance：
```json
PUT _cluster/settings
{ "persistent": { "cluster.routing.allocation.cluster_concurrent_rebalance": 0 } }
```
:::

## Hot-Warm-Cold 架构

根据数据的访问频率将数据分层存储，是 ES 降本增效的核心方案。

```
Hot 节点（SSD）          Warm 节点（HDD）         Cold 节点（大容量 HDD）
├── 最近 7 天数据         ├── 7-30 天数据           ├── 30-90 天数据
├── 高频写入 + 查询       ├── 低频查询              ├── 偶尔查询
└── node.attr.data: hot  └── node.attr.data: warm  └── node.attr.data: cold
```

### 配置节点角色

```yaml
# Hot 节点
node.roles: [data_hot, ingest]

# Warm 节点
node.roles: [data_warm]

# Cold 节点
node.roles: [data_cold]

# 专用 Master 节点
node.roles: [master]
```

### ILM 驱动分层

配合 ILM 策略自动迁移数据：

```json
PUT _ilm/policy/tiered_policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_primary_shard_size": "50gb" }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "allocate": { "require": { "data": "warm" } },
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": { "require": { "data": "cold" }, "number_of_replicas": 0 }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

## 跨集群复制（CCR）

CCR（Cross-Cluster Replication）将一个集群的数据实时复制到另一个集群，用于灾备和就近读取。

```
Leader 集群（主）  ──实时同步──→  Follower 集群（从）
（生产环境）                         （灾备/异地读取）
```

```bash
# 在 Follower 集群上配置
PUT /follower_index/_ccr/follow
{
  "remote_cluster": "leader_cluster",
  "leader_index": "leader_index"
}
```

CCR 需要 Platinum 或 Enterprise 许可证。

## Snapshot/Restore

Snapshot 是集群级别的备份，支持增量备份和远程存储（S3、HDFS、Azure Blob 等）。

### 注册仓库

```bash
PUT _snapshot/my_backup
{
  "type": "fs",
  "settings": {
    "location": "/mount/backups/my_backup",
    "compress": true
  }
}
```

### 创建快照

```bash
# 全量快照
PUT _snapshot/my_backup/snapshot_20260115?wait_for_completion=true

# 增量快照（只备份新增/变更的 Segment）
PUT _snapshot/my_backup/snapshot_20260116?wait_for_completion=true
```

### 恢复

```bash
# 恢复整个快照
POST _snapshot/my_backup/snapshot_20260115/_restore

# 恢复指定索引
POST _snapshot/my_backup/snapshot_20260115/_restore
{
  "indices": "my-index",
  "rename_pattern": "my-index",
  "rename_replacement": "my-index-restored"
}
```

::: tip 备份策略建议
1. 每日执行增量 Snapshot。
2. Snapshot 仓库使用远程存储（如 S3），避免与 ES 数据在同一磁盘。
3. 定期验证恢复流程（每月执行一次恢复测试）。
4. Snapshot 不影响集群性能（Lucene 的 Segment 文件不可变，Snapshot 就是拷贝 Segment）。
:::
