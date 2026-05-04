# Hash、Set 与 ZSet

Hash、Set、ZSet 三种类型在底层共享 hashtable 和 listpack/ziplist 两种编码方式。理解它们的底层实现对优化内存使用和查询性能至关重要。

## Hash 类型

Hash 是字段-值映射，适合存储对象。底层编码为 listpack（小数据量）或 hashtable（大数据量）。

### 底层结构

**listpack 编码**：字段和值交替存储，遍历查找 O(n) 但数据量小，内存紧凑。

**hashtable 编码**：标准的字典结构，每个字段通过哈希定位，查找 O(1)。

```c
// dict.h 中的哈希表结构
typedef struct dict {
    dictType *type;
    void *privdata;
    dictht ht[2];      // 两个哈希表，第二个用于 rehash
    long rehashidx;     // rehash 进度，-1 表示未在 rehash
    int16_t pauserehash;
} dict;

typedef struct dictht {
    dictEntry **table;  // 桶数组
    unsigned long size;  // 桶数量（2^n）
    unsigned long sizemask; // size - 1，用于取模
    unsigned long used;  // 已使用桶数
} dictht;
```

### 渐进式 Rehash

当哈希表需要扩容或缩容时，Redis 不会一次性完成所有数据迁移（避免阻塞），而是采用**渐进式 rehash**：

1. 分配新的哈希表（`ht[1]`），大小为 `ht[0]` 的 2 倍（扩容）或 1/2（缩容）。
2. 将 `rehashidx` 设为 0，标记开始 rehash。
3. **每次增删改查操作**时，顺带将 `ht[0]` 中 `rehashidx` 位置的所有桶迁移到 `ht[1]`，然后 `rehashidx++`。
4. 当 `ht[0]` 全部迁移完毕，释放 `ht[0]`，将 `ht[1]` 设为 `ht[0]`，新建空的 `ht[1]`。

```
rehash 过程中，查找操作会同时查 ht[0] 和 ht[1]：

  ht[0]                        ht[1]
+--------+                   +--------+
| bucket0| --迁移-->         | bucket0|
| bucket1|                   | bucket1|
| bucket2| ← rehashidx=2     | bucket2|
| bucket3|                   | bucket3|
+--------+                   +--------+
```

::: tip Rehash 的触发条件
- **扩容**：负载因子 = `used / size >= 1`，且没有在执行 BGSAVE/BGREWRITEAOF（此时阈值为 5，避免 fork 过程中频繁 rehash）。
- **缩容**：负载因子 < 0.1（10%）。
:::

### 编码转换阈值

```conf
# Hash 类型的编码转换阈值
hash-max-listpack-entries 128    # 字段数超过 128 转 hashtable
hash-max-listpack-value 64       # 任一值超过 64 字节转 hashtable
```

```bash
127.0.0.1:6379> HSET user:1 name "Tom" age "25" city "Beijing"
(integer) 3
127.0.0.1:6379> OBJECT ENCODING user:1
"listpack"

# 批量添加超过 128 个字段
127.0.0.1:6379> EVAL "for i=1,129 do redis.call('HSET', KEYS[1], 'f'..i, 'v'..i) end" 1 user:1
(nil)
127.0.0.1:6379> OBJECT ENCODING user:1
"hashtable"
```

## Set 类型

Set 是无序的字符串集合，支持交集、并集、差集运算。

### intset 编码

当 Set 中所有元素都是整数值且数量不超过 512 时，使用 intset（有序整数数组）：

```c
typedef struct intset {
    uint32_t encoding;  // 编码：int16, int32, int64
    uint32_t length;    // 元素数量
    int8_t contents[];  // 柔性数组，存储有序整数
} intset;
```

intset 使用二分查找定位元素，时间复杂度 O(log n)。当插入的整数超出当前编码范围时（如 int16 数组中插入 int32 值），会触发**升级**：将整个数组提升到更大的编码，且**不可降级**。

```bash
127.0.0.1:6379> SADD numbers 1 2 3 4 5
(integer) 5
127.0.0.1:6379> OBJECT ENCODING numbers
"intset"

# 添加字符串后转为 hashtable
127.0.0.1:6379> SADD numbers "hello"
(integer) 1
127.0.0.1:6379> OBJECT ENCODING numbers
"hashtable"
```

::: tip set-max-intset-entries
配置 `set-max-intset-entries 512` 控制 intset 编码的最大元素数量。如果 Set 存储的都是整数且数量不多，保持 intset 编码可以显著节省内存。
:::

## ZSet 类型

ZSet（有序集合）是 Redis 中最复杂的数据结构，每个元素关联一个 score，按 score 排序。常用于排行榜、延迟队列等场景。

### skiplist + hashtable 双编码

当元素数量超过 128 或单个元素值超过 64 字节时，ZSet 使用 skiplist 和 hashtable **同时**维护数据：

```c
typedef struct zset {
    dict *dict;       // field -> score 的映射，O(1) 查分
    zskiplist *zsl;   // 跳表，支持范围查询 O(log n)
} zset;
```

- **skiplist**：用于 `ZRANGE`、`ZRANGEBYSCORE` 等范围查询，时间复杂度 O(log n)。
- **dict**：用于 `ZSCORE` 的 O(1) 查找。两个结构通过指针共享同一个 sds 对象，不会浪费额外存储空间。

### skiplist 结构

跳表（Skip List）是一种基于概率的有序数据结构，通过多层索引加速查找：

```
Level 4:  HEAD ----------------------------------------> 50 --------> NULL
Level 3:  HEAD --------> 10 --------> 30 -------> 50 --------> NULL
Level 2:  HEAD --> 5 --> 10 --> 20 --> 30 --> 40 -> 50 --> 60 --> NULL
Level 1:  HEAD -> 3 -> 5 -> 10 -> 15 -> 20 -> 25 -> 30 -> 40 -> 50 -> 60 -> NULL
```

每个节点随机决定自己的层数（概率 p = 0.25），层数越高概率越低：

```c
typedef struct zskiplistNode {
    sds ele;                          // 元素值
    double score;                     // 分数
    struct zskiplistNode *backward;   // 后退指针（只有第 1 层有）
    struct zskiplistLevel {
        struct zskiplistNode *forward; // 前进指针
        unsigned long span;           // 跨度（到 forward 节点经过几个节点）
    } level[];                        // 柔性数组，层数随机
} zskiplistNode;
```

::: tip skiplist 为什么不用红黑树？
1. skiplist 实现更简单，代码量少。
2. skiplist 的范围查询更自然（沿着第 1 层链表遍历），红黑树需要中序遍历。
3. skiplist 通过调整 p 值可以灵活平衡查询性能和内存消耗。
:::

### 排行榜实现

```bash
# 更新玩家积分
ZADD leaderboard 5800 "player:1001"
ZADD leaderboard 7200 "player:1002"
ZADD leaderboard 3500 "player:1003"
ZADD leaderboard 9100 "player:1004"

# Top 10（从高到低）
ZREVRANGE leaderboard 0 9 WITHSCORES

# 获取某玩家排名（从高到低）
ZREVRANK leaderboard "player:1001"
# 返回排名（0-based）

# 获取某玩家积分
ZSCORE leaderboard "player:1001"

# 积分区间查询：积分在 5000-8000 之间的玩家
ZRANGEBYSCORE leaderboard 5000 8000 WITHSCORES

# 原子增加积分
ZINCRBY leaderboard 100 "player:1001"

# 统计积分区间人数
ZCOUNT leaderboard 5000 10000
```

### 跳表与 ZRANK

skiplist 的 `span` 字段记录了每个 forward 指针跨越的节点数。ZRANK 命令利用这个字段计算排名：

```
查找 score=30 的节点时，累加路径上的 span 值：
Level 4: HEAD -> 50, span=5（跳过了 5 个节点）
Level 3: HEAD -> 10, span=2
Level 2: HEAD -> 5, span=1 -> 10, span=1 -> 20, span=1 -> 30, span=1
累加：2 + 1 + 1 + 1 + 1 = 6，所以 rank = 6 - 1 = 5（0-based）
```
