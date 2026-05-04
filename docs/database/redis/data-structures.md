# 数据结构与编码

Redis 提供 5 种基本数据类型：String、List、Hash、Set、ZSet。每种类型在底层可能使用不同的编码方式，Redis 会根据数据特征自动选择最优编码，以平衡内存使用和性能。

## 5 种基本类型

| 类型 | 常用命令 | 典型场景 |
|------|----------|----------|
| String | SET/GET/INCR/APPEND | 计数器、缓存、分布式锁 |
| List | LPUSH/RPOP/LRANGE/BRPOP | 消息队列、最新列表 |
| Hash | HSET/HGET/HMSET/HGETALL | 对象存储、用户信息 |
| Set | SADD/SREM/SINTER/SMEMBERS | 标签、共同好友 |
| ZSet | ZADD/ZRANGE/ZRANGEBYSCORE | 排行榜、延迟队列 |

## 底层编码

Redis 使用 `object encoding` 命令查看 key 的底层编码。每种数据类型有 2-3 种编码实现，Redis 在合适的时机自动转换。

### String 的 3 种编码

| 编码 | 条件 | 内存布局 |
|------|------|----------|
| int | 值是整数且在 long 范围内 | 直接存整数，无额外对象开销 |
| embstr | 字符串长度 <= 44 字节 | redisObject 和 sdshdr 在同一块连续内存 |
| raw | 字符串长度 > 44 字节 | redisObject 和 sdshdr 分开分配 |

```bash
127.0.0.1:6379> SET num 100
OK
127.0.0.1:6379> OBJECT ENCODING num
"int"

127.0.0.1:6379> SET msg "hello"
OK
127.0.0.1:6379> OBJECT ENCODING msg
"embstr"

127.0.0.1:6379> SET longstr "a very long string that exceeds 44 bytes threshold value test"
OK
127.0.0.1:6379> OBJECT ENCODING longstr
"raw"
```

::: tip 44 字节的来源
embstr 编码将 redisObject 和 sdshdr 放在同一块 64 字节的内存中（CPU 缓存行大小）。redisObject 占 16 字节，sdshdr8 头部占 3 字节，SDS 结尾的 `\0` 占 1 字节，加上 jemalloc 分配器的最小分配粒度，实际可用约 44 字节。
:::

### Hash 的 2 种编码

| 编码 | 条件（默认阈值） | 特点 |
|------|------------------|------|
| listpack（7.0+）/ ziplist（7.0 前） | 字段数 <= 128 且每个值 <= 64 字节 | 紧凑内存布局，遍历 O(n) |
| hashtable | 超过任一阈值 | 标准哈希表，O(1) 查找 |

### Set 的 2 种编码

| 编码 | 条件 | 特点 |
|------|------|------|
| intset | 全部元素是整数且数量 <= 512 | 有序数组，二分查找 |
| hashtable | 超过任一条件 | 值为 NULL 的哈希表 |

### ZSet 的 2 种编码

| 编码 | 条件 | 特点 |
|------|------|------|
| listpack / ziplist | 元素数 <= 128 且每个值 <= 64 字节 | 紧凑布局，score 相邻存储 |
| skiplist + hashtable | 超过任一阈值 | skiplist 支持范围查询，hashtable 支持 O(1) 查分 |

::: warning ZSet 的双编码
当 ZSet 使用 skiplist 编码时，底层同时维护一个 skiplist 和一个 hashtable。skiplist 用于 ZRANGE 等范围查询，hashtable 用于 ZSCORE 的 O(1) 查找。两个结构通过指针共享元素对象，不会浪费额外内存。
:::

### List 的编码演进

Redis 7.0 之后 List 统一使用 **quicklist**（双端链表 + listpack 节点）。Redis 3.2 之前是 ziplist + linkedlist 双编码，3.2 引入 quicklist 统一了这两种编码。

## 编码转换规则

编码转换是**不可逆**的（大部分情况）：

- String：int 编码执行 APPEND 后变为 embstr/raw；embstr 只读，修改后变为 raw。
- Hash/Set/ZSet：元素数或元素大小超过阈值后从 listpack/ziplist 转为 hashtable/skiplist，即使后续元素减少也不会自动转回。

```bash
# 演示 Hash 编码转换
127.0.0.1:6379> HSET user name "Tom"
(integer) 1
127.0.0.1:6379> OBJECT ENCODING user
"listpack"

# 添加超过 128 个字段
127.0.0.1:6379> EVAL "for i=1,129 do redis.call('HSET', KEYS[1], 'field'..i, 'v'..i) end" 1 user
(nil)
127.0.0.1:6379> OBJECT ENCODING user
"hashtable"
```

## 全局 Key 结构

Redis 使用全局哈希表（dict）存储所有 key。每个 dictEntry 包含 key 指针、val 指针和 next 指针（解决哈希冲突的链表法）。当负载因子（used/size）超过 1 时触发扩容，Redis 采用**渐进式 rehash** 避免一次性 rehash 导致的阻塞。

<RedisDataStructureDemo />
