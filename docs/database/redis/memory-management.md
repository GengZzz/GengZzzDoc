# 内存管理

Redis 作为内存数据库，内存管理直接影响性能和稳定性。本节涵盖淘汰策略、内存碎片、大 Key 和热 Key 等生产中常见的内存问题。

## 内存淘汰策略

当 Redis 内存达到 `maxmemory` 限制时，根据配置的策略淘汰（evict）部分 key。

### 8 种淘汰策略

| 策略 | 类别 | 说明 |
|------|------|------|
| noeviction | 不淘汰 | 内存满时拒绝写入（返回 OOM 错误） |
| allkeys-lru | 所有 key | 淘汰最近最少使用的 key |
| allkeys-lfu | 所有 key | 淘汰使用频率最低的 key（4.0+） |
| allkeys-random | 所有 key | 随机淘汰 |
| volatile-lru | 设置过期的 key | 淘汰最近最少使用的有过期时间的 key |
| volatile-lfu | 设置过期的 key | 淘汰使用频率最低的有过期时间的 key（4.0+） |
| volatile-random | 设置过期的 key | 随机淘汰有过期时间的 key |
| volatile-ttl | 设置过期的 key | 淘汰 TTL 最短的有过期时间的 key |

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

::: tip 如何选择策略？
- **缓存场景**：`allkeys-lru` 或 `allkeys-lfu`。LRU 适合访问模式随时间变化的场景，LFU 适合有突发流量但长期模式稳定的场景。
- **部分数据不能淘汰**：`volatile-lru`，只有设置过期时间的 key 才会被淘汰。
- **随机淘汰**：`allkeys-random` 适用于所有 key 访问频率均匀的场景。
- **不能丢数据**：`noeviction`，但需要确保内存足够。
:::

### LRU vs LFU

**LRU（Least Recently Used）**：Redis 使用近似 LRU（采样法），随机取 5 个 key（`maxmemory-samples`），淘汰其中最久未访问的。不是精确的 LRU，但效果接近且开销小。

```
精确 LRU：维护链表 → 每次访问移动节点 → O(1) 但指针开销大
近似 LRU：redisObject.lru 记录最后访问时间 → 采样比较 → 足够好
```

**LFU（Least Frequently Used）**：Redis 4.0 引入。redisObject 的 lru 字段的高 16 位存储访问计数（logarithmic counter），低 8 位存储上次递减时间。

```bash
# 查看 LFU 计数
127.0.0.1:6379> OBJECT FREQ mykey
(integer) 5

# LFU 衰减：计数会随时间衰减，冷 key 的计数会逐渐降低
# lfu-decay-time：每 N 分钟衰减 1（默认 1，设为 0 关闭衰减）
# lfu-log-factor：控制计数递增速度（默认 10）
```

## 内存碎片率

内存碎片率 = `used_memory_rss / used_memory`。Redis 通过 jemalloc 分配器管理内存，频繁的分配和释放会产生碎片。

```bash
127.0.0.1:6379> INFO memory
used_memory:1073741824         # Redis 分配的内存
used_memory_rss:1342177280     # 操作系统分配的物理内存
mem_fragmentation_ratio:1.25   # 碎片率
```

| 碎片率 | 含义 | 处理 |
|--------|------|------|
| < 1.0 | 使用了 swap（危险！） | 增加物理内存或减少 maxmemory |
| 1.0 - 1.5 | 正常范围 | 不需要处理 |
| > 1.5 | 碎片较多 | 开启 activedefrag 或重启 |

```conf
# 开启主动碎片整理（Redis 4.0+）
activedefrag yes
active-defrag-ignore-bytes 100mb       # 碎片超过 100MB 开始整理
active-defrag-threshold-lower 10       # 碎片率超过 10% 开始整理
active-defrag-threshold-upper 100      # 碎片率超过 100% 全速整理
active-defrag-cycle-min 5              # 最小 CPU 占用 5%
active-defrag-cycle-max 75             # 最大 CPU 占用 75%
```

## 大 Key 发现与处理

### 什么是大 Key

- String 类型的 value > 5MB
- Hash、List、Set、ZSet 的元素数量 > 5000 或整体大小 > 50MB

### 大 Key 的危害

| 危害 | 说明 |
|------|------|
| 阻塞主线程 | DEL 一个大 Key 可能阻塞几十毫秒到几秒 |
| 网络拥塞 | GET 一个 10MB 的 Key 瞬间占满带宽 |
| 内存倾斜 | Cluster 模式下某个节点内存远高于其他节点 |
| 迁移阻塞 | 槽位迁移时 MIGRATE 大 Key 耗时很长 |

### 发现大 Key

```bash
# redis-cli --bigkeys（采样扫描）
redis-cli --bigkeys -i 0.1

# 输出示例：
# Biggest string found so far '"user:cache:1001"' with 20480 bytes
# Biggest hash found so far '"products"' with 15000 fields
```

```bash
# MEMORY USAGE 命令（精确计算）
127.0.0.1:6379> MEMORY USAGE mykey
(integer) 5242880

# DEBUG OBJECT（查看编码和序列化长度）
127.0.0.1:6379> DEBUG OBJECT mykey
Value at:0x7f8b1a001230 refcount:1 encoding:raw serializedlength:5242880...
```

### 大 Key 拆分

```bash
# 将一个大 Hash 拆分为多个小 Hash（按用户 ID 哈希分片）
# 原始：HSET user:all field1 v1 field2 v2 ...（10000 个字段）

# 拆分：按 CRC16(key) % 16 分到 16 个桶
HSET user:all:0 field1 v1 field17 v17
HSET user:all:1 field2 v2 field18 v18
...
```

```java
// Java 拆分示例
String shardKey = "user:all:" + (field.hashCode() & 15);
jedis.hset(shardKey, field, value);
```

::: tip 渐进式删除
如果需要删除一个大 Key，不要直接 DEL（会阻塞）。使用 UNLINK（Redis 4.0+）：它在另一个线程中异步回收内存，不阻塞主线程。

```bash
UNLINK bigkey  # 异步删除
```

对于 4.0 之前的版本，使用 SCAN + HDEL 分批删除。
:::

## 热 Key 问题

热 Key 是短时间内被大量访问的 key（如秒杀商品、热点新闻）。即使 Redis 单机能承受 10 万 QPS，热 Key 可能占到几万 QPS，成为瓶颈。

### 热 Key 发现

1. **业务层统计**：在客户端统计每个 key 的访问频率。
2. **monitor 命令**：`redis-cli monitor | head -n 10000`（生产环境慎用）。
3. **Redis 4.0+ OBJECT FREQ**：配合 LFU 统计。
4. **代理层统计**：如果使用了代理（如 Twemproxy、Codis），代理可以统计热 Key。

### 热 Key 解决方案

#### 1. 本地缓存

在应用层加一级本地缓存（Caffeine/Guava），热 Key 优先从本地缓存获取：

```java
// 两级缓存
LoadingCache<String, String> localCache = Caffeine.newBuilder()
    .maximumSize(10000)
    .expireAfterWrite(10, TimeUnit.SECONDS)  // 短过期
    .build(key -> redis.get(key));

String value = localCache.get("hot:key");
```

#### 2. 读写分离

将读请求路由到从节点，主节点只处理写请求：

```
写请求 → Master
读请求 → Replica 1 / Replica 2 / Replica 3
```

#### 3. Key 分片

将热 Key 复制多份，分散到不同的 slot/节点：

```bash
# 秒杀库存：将 10000 份库存分到 100 个 key
SET stock:item:1:0 100
SET stock:item:1:1 100
...
SET stock:item:1:99 100

# 随机选取一个 key 扣减
int shard = ThreadLocalRandom.current().nextInt(100);
String key = "stock:item:1:" + shard;
// 扣减逻辑...
```

#### 4. Redis 自带热 Key 重定向（7.0+）

Redis 7.0 引入了 `hot keys` 功能，可以在 server 端检测热 Key 并重定向读请求到 replica 节点。
