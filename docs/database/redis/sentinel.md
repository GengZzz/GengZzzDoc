# Sentinel 哨兵

Redis Sentinel 是 Redis 的高可用方案，在主从复制的基础上提供自动故障转移（failover）。Sentinel 监控主从节点的健康状态，在主节点故障时自动将一个从节点提升为新主节点。

## 架构

```
         +----------+  +----------+  +----------+
         |Sentinel 1|  |Sentinel 2|  |Sentinel 3|
         +----+-----+  +----+-----+  +----+-----+
              |              |              |
              +------+-------+------+
                     | Gossip     |
                     | Pub/Sub    |
              +------+-------+------+
              |              |              |
         +----+-----+  +----+-----+  +----+-----+
         |  Master  |  | Replica 1|  | Replica 2|
         +----------+  +----------+  +----------+
```

Sentinel 本身是一个特殊的 Redis 实例（不存储业务数据），通过以下机制工作：

- **定时监控**：每秒向主从节点发送 PING，检查是否在线。
- **主观下线**：一个 Sentinel 认为节点不可达（SDOWN）。
- **客观下线**：多数 Sentinel 都认为主节点不可达（ODOWN），触发故障转移。
- **领导者选举**：Sentinel 之间通过 Raft 算法选出领导者执行故障转移。
- **故障转移**：领导者选择一个从节点提升为新主节点，通知其他从节点和客户端。

## 主观下线与客观下线

### 主观下线（SDOWN）

单个 Sentinel 实例对某个节点的下线判断。如果在 `down-after-milliseconds` 内没有收到有效的 PING 回复，则标记为主观下线。

```conf
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 30000
```

### 客观下线（ODOWN）

当足够数量的 Sentinel（由 `quorum` 参数决定）都认为主节点主观下线时，标记为客观下线。只有主节点有客观下线的概念，从节点和 Sentinel 只有主观下线。

```
Sentinel 1: 主观下线 → 询问 Sentinel 2 和 3
Sentinel 2: 主观下线 → 也认为下线
Sentinel 3: 还在线

quorum=2：已有 2 个（Sentinel 1 + 2）→ 客观下线
```

::: tip quorum vs majority
`quorum` 是判断客观下线的阈值。但**执行故障转移需要 majority**（超过半数）的 Sentinel 同意。如果有 5 个 Sentinel，quorum=2 时，2 个 Sentinel 就能标记客观下线，但需要至少 3 个 Sentinel 投票才能选出领导者执行故障转移。
:::

## Raft 领导者选举

Sentinel 使用 Raft 协议选举领导者来执行故障转移：

1. 首先发现客观下线的 Sentinel 成为候选者，递增配置纪元（`configuration epoch`）。
2. 向其他 Sentinel 发送 `SENTINEL is-master-down-by-addr` 请求投票。
3. 每个 Sentinel 在一个配置纪元内只能投一票。
4. 获得多数票的候选者成为领导者。
5. 如果选举超时（2 倍故障转移超时），增加配置纪元重新选举。

```
纪元 1：
  Sentinel 1 → 请求投票 → Sentinel 2: ✓, Sentinel 3: ✓
  获得 2/3 票 → Sentinel 1 成为领导者

领导者执行故障转移：
  1. 选择新主节点（优先级最高、复制偏移量最大、runid 最小的从节点）
  2. SLAVEOF NO ONE 提升为新主节点
  3. 向其他从节点发送 SLAVEOF 新主节点
  4. 更新旧主节点为从节点（恢复后自动成为从节点）
```

## 故障转移流程

```
时间线：

T0: 主节点故障
T1: Sentinel 1 发现 PING 超时 → 主观下线
T2: Sentinel 2 也发现超时 → 主观下线
T3: 达到 quorum → 客观下线
T4: Sentinel 选举领导者
T5: 领导者选择从节点 A 作为新主节点
T6: 执行 SLAVEOF NO ONE（A 变为主节点）
T7: 通知从节点 B、C 复制新主节点
T8: 通知客户端（通过 Pub/Sub）新主节点地址
T9: 监控旧主节点，恢复后设为从节点
```

### 新主节点选择优先级

1. `replica-priority` 配置值（越小优先级越高，0 表示永不提升）。
2. 复制偏移量（`master_repl_offset`）最大的（数据最新）。
3. `runid` 最小的（启动最早的，更稳定）。

## 配置方法

### sentinel.conf

```conf
# 监控主节点（quorum=2 表示至少 2 个 Sentinel 确认下线）
sentinel monitor mymaster 192.168.1.100 6379 2

# 主节点密码
sentinel auth-pass mymaster "master_password"

# 主观下线判定时间（毫秒）
sentinel down-after-milliseconds mymaster 30000

# 故障转移超时（毫秒）
sentinel failover-timeout mymaster 180000

# 故障转移后，新主节点同时接受从节点同步的数量
sentinel parallel-syncs mymaster 1

# 通知脚本（可选）
sentinel notification-script mymaster /var/redis/notify.sh
```

### 启动 Sentinel

```bash
# 方式 1：使用 redis-sentinel
redis-sentinel /path/to/sentinel.conf

# 方式 2：使用 redis-server
redis-server /path/to/sentinel.conf --sentinel
```

::: warning Sentinel 部署要求
- 至少 3 个 Sentinel 实例，分布在不同的物理机器上。
- Sentinel 数量应该是奇数（3、5、7），避免选举平票。
- quorum 通常设为 `(N/2) + 1`，N 为 Sentinel 数量。
- `down-after-milliseconds` 不要设太小（< 5000），避免网络抖动导致误判。
:::

## 客户端集成

客户端需要支持 Sentinel 协议来自动发现主节点：

```java
// Jedis 连接 Sentinel
Set<String> sentinels = new HashSet<>();
sentinels.add("192.168.1.1:26379");
sentinels.add("192.168.1.2:26379");
sentinels.add("192.168.1.3:26379");

JedisSentinelPool pool = new JedisSentinelPool(
    "mymaster", sentinels, "password"
);
Jedis jedis = pool.getResource();
```

```python
# redis-py 连接 Sentinel
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('192.168.1.1', 26379),
    ('192.168.1.2', 26379),
    ('192.168.1.3', 26379),
], socket_timeout=0.5)

master = sentinel.master_for('mymaster', password='password')
slave = sentinel.slave_for('mymaster', password='password')
```

客户端的工作流程：
1. 连接任意 Sentinel 实例，通过 `SENTINEL get-master-addr-by-name mymaster` 获取当前主节点地址。
2. 连接主节点进行读写。
3. 订阅 `+switch-master` 频道，在故障转移时获取新主节点地址。
4. 连接断开时重新向 Sentinel 询问主节点地址。
