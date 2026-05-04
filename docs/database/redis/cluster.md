# Redis Cluster

Redis Cluster 是 Redis 3.0 引入的分布式方案，通过数据分片（sharding）将数据分布到多个节点上，支持水平扩展和自动故障转移。与 Sentinel 只提供高可用不同，Cluster 同时解决了**数据分片**和**高可用**两个问题。

## 16384 槽位

Redis Cluster 将所有数据划分为 **16384 个槽位**（slot），每个 key 通过 CRC16 算法映射到一个槽位：

```
slot = CRC16(key) % 16384
```

每个 master 节点负责一部分槽位，所有槽位必须被覆盖才能正常工作。

```
Master 1: slots 0    - 5460
Master 2: slots 5461 - 10922
Master 3: slots 10923 - 16383
```

::: tip 为什么是 16384 而不是 65536？
Redis 作者 antirez 的解释：16384 个槽位用 bitmap 存储只需 2KB（16384/8），65536 需要 8KB。在心跳包中携带 2KB 的槽位信息比 8KB 的开销小很多。实际中一个集群很少超过 1000 个节点，16384 个槽位足够分配。
:::

## Gossip 协议

Cluster 节点之间通过 Gossip 协议交换状态信息，不依赖中心化的元数据存储。每个节点定期向其他节点发送 PING 消息，交换集群拓扑和节点状态。

### Gossip 消息类型

| 消息 | 作用 |
|------|------|
| MEET | 邀请新节点加入集群 |
| PING | 定期探测，交换集群状态 |
| PONG | 对 MEET/PING 的回复 |
| FAIL | 广播节点下线通知 |
| PUBLISH | 集群内广播 Pub/Sub 消息 |

### 状态传播

```
节点 A 每隔 1 秒随机选择 5 个节点发送 PING：

  A → B (PING：携带 A 认知的集群状态)
  B → A (PONG：回复 B 认知的集群状态)
  
每个 PING 包含：
  - 发送者的信息（slots、IP、port、flags）
  - 随机选择的部分节点信息
  - 集群纪元（configEpoch）
  - 触发 PING 的原因
```

::: tip Gossip 的收敛速度
Gossip 协议是**最终一致**的，状态传播需要多个周期。100 个节点的集群通常几秒内收敛。但节点越多，Gossip 流量越大。Redis Cluster 实测在 1000+ 节点时可能出现明显的心跳包开销。
:::

## Smart Client

Redis Cluster 使用**去中心化**的客户端模式。客户端需要缓存槽位映射表，直接连接正确的节点，避免额外的代理跳转。

### 槽位映射

客户端启动时，从任意节点获取完整的槽位映射：

```bash
# 查看槽位分配
127.0.0.1:6379> CLUSTER SLOTS
1) 1) (integer) 0
   2) (integer) 5460
   3) 1) "192.168.1.1"
      2) (integer) 6379
   4) 1) "192.168.1.1"
      2) (integer) 6380  # 从节点
2) 1) (integer) 5461
   2) (integer) 10922
   3) 1) "192.168.1.2"
      2) (integer) 6379
   ...
```

### Key 哈希标签

默认一个 key 映射一个槽位。但某些场景需要多个 key 在同一个槽位（如事务、Lua 脚本），使用 `{tag}` 语法：

```bash
# 只对 {} 内的部分计算 CRC16
SET {user:1001}:name "Tom"
SET {user:1001}:age 25
SET {user:1001}:city "Beijing"

# 这 3 个 key 在同一个槽位，可以用 MGET 一起获取
MGET {user:1001}:name {user:1001}:age {user:1001}:city
```

## MOVED 重定向

客户端发送命令到错误的节点时，节点返回 MOVED 错误，告诉客户端正确的槽位和节点：

```
客户端 → 节点 A: GET mykey (slot 5798 在节点 B 上)
节点 A → 客户端: MOVED 5798 192.168.1.2:6379
客户端 → 节点 B: GET mykey
节点 B → 客户端: "value"
```

```bash
127.0.0.1:6379> GET mykey
(error) MOVED 5798 192.168.1.2:6379
```

::: tip MOVED 的含义
MOVED 表示**永久性重定向**——槽位的负责节点已经确定。客户端应该更新本地的槽位映射表。Smart Client 自动处理 MOVED 并更新缓存。
:::

## ASK 重定向

ASK 重定向发生在**槽位迁移过程中**。当槽位正在从节点 A 迁移到节点 B 时，部分 key 可能还在 A 上，部分已经到了 B 上：

```
客户端 → 节点 A: GET migrating_key
节点 A → 客户端: ASK 5798 192.168.1.2:6379
客户端 → 节点 B: ASKING + GET migrating_key
节点 B → 客户端: "value"
```

```
               槽位 5798 迁移中
                
节点 A（源）────────────────────→ 节点 B（目标）
  |                                    |
  | key 1, key 3                       | key 2, key 4
  | (还未迁移)                         | (已迁移)
  |                                    |
  +-- GET key1 → 直接返回              +-- GET key2 → 直接返回
  +-- GET key2 → ASK 重定向 ──────────→ +-- 需要 ASKING 命令
```

::: tip ASK vs MOVED
- **MOVED**：槽位已经确定归目标节点负责，永久重定向。
- **ASK**：槽位正在迁移中，临时重定向。客户端下次还应该先访问源节点。
- ASK 后必须发送 `ASKING` 命令，否则目标节点会因为槽位不属于自己而拒绝。
:::

## 槽位迁移

使用 `redis-cli --cluster` 工具进行槽位迁移：

```bash
# 将槽位 5798 从节点 A 迁移到节点 B
redis-cli --cluster reshard 192.168.1.1:6379 \
  --cluster-from <node-A-id> \
  --cluster-to <node-B-id> \
  --cluster-slots 1 \
  --cluster-yes
```

### 迁移步骤

```
1. CLUSTER SETSLOT 5798 MIGRATING <node-B-id>   # 源节点标记为迁出
2. CLUSTER SETSLOT 5798 IMPORTING <node-A-id>   # 目标节点标记为迁入
3. CLUSTER GETKEYSINSLOT 5798 100               # 获取槽位中的 key
4. MIGRATE <node-B-ip> <port> <key> 0 5000      # 迁移每个 key
5. CLUSTER SETSLOT 5798 NODE <node-B-id>         # 所有节点确认
```

MIGRATE 命令是原子性的：它将 key 从源节点序列化，通过 DUMP/RESTORE 协议传输到目标节点，然后从源节点删除。

## 集群搭建

```bash
# 创建 6 节点集群（3 主 3 从）
redis-cli --cluster create \
  192.168.1.1:7000 192.168.1.1:7001 \
  192.168.1.2:7000 192.168.1.2:7001 \
  192.168.1.3:7000 192.168.1.3:7001 \
  --cluster-replicas 1
```

### 节点配置

```conf
# 每个节点的 redis.conf
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
```

## 集群限制

1. **多 key 操作**：MGET、MSET、SUNION 等要求所有 key 在同一槽位（使用 `{tag}` 强制）。
2. **事务**：MULTI/EXEC 中的所有 key 必须在同一槽位。
3. **Lua 脚本**：所有操作的 key 必须在同一节点。
4. **数据库编号**：Cluster 模式只支持 db0，不支持 SELECT。
5. **复制**：只支持一层复制（master → replica），不支持链式复制。

::: warning 生产环境注意
- 每个主节点至少配一个从节点，避免单点故障。
- 节点分布在不同的物理机/可用区。
- 监控槽位分布是否均匀（避免数据倾斜）。
- 大 key 会阻塞槽位迁移，迁移前先扫描清理大 key。
:::

<RedisClusterDemo />
