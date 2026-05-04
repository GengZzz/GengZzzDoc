# List 与阻塞队列

Redis 的 List 是有序的字符串列表，支持从头部和尾部插入/弹出，常用作消息队列和最新列表。Redis 7.0 中 List 统一使用 quicklist 作为底层实现。

## quicklist 架构

quicklist 是一个双向链表，每个节点是一个 listpack（Redis 7.0+）或 ziplist（7.0 之前）。这种设计结合了链表的灵活增删和紧凑内存布局的优势。

```
quicklist
+--------+     +------------------+     +------------------+
| head   |---->| listpack [a,b,c] |---->| listpack [d,e,f] |----> NULL
| tail   |<----|       prev next  |<----|       prev next  |
| count  |     +------------------+     +------------------+
| length |
+--------+
```

### quicklistNode 结构

```c
typedef struct quicklistNode {
    struct quicklistNode *prev;
    struct quicklistNode *next;
    unsigned char *entry;        // 指向 listpack/ziplist
    unsigned int sz;             // entry 占用字节数
    unsigned int count : 16;     // 元素数量
    unsigned int encoding : 2;   // 编码方式：RAW 或 LZF 压缩
    unsigned int container : 2;  // 容器类型：PLAIN 或 PACKED
    unsigned int recompress : 1; // 是否被解压过
    unsigned int attempt_compress : 1;
    unsigned int dont_merge : 1;
} quicklistNode;
```

### 配置参数

```conf
# 每个 listpack/listpack 节点的最大字节数（默认 8KB）
list-max-listpack-size 8192

# 节点超过此大小时启用 LZF 压缩（默认不压缩）
list-compress-depth 0
```

`list-max-listpack-size` 可以设为负数表示更精细的控制：
- `-1`: 每个节点最多 4KB
- `-2`: 每个节点最多 8KB（默认）
- `-3`: 每个节点最多 16KB
- `-4`: 每个节点最多 32KB
- `-5`: 每个节点最多 64KB

## listpack 详解

listpack 是 Redis 7.0 引入的新紧凑编码格式，用于替代 ziplist。相比 ziplist，listpack 解决了**级联更新**问题：

```
ziplist 节点：  [prevlen][encoding][data]
listpack 节点： [encoding][data][len]
```

ziplist 每个节点记录前一个节点的长度，当某个节点长度变化时，后续所有节点的 prevlen 都可能需要更新（级联更新），最坏情况 O(n^2)。listpack 在每个节点末尾记录自身长度，通过前向遍历计算前一个节点的位置，彻底避免了级联更新。

## 阻塞弹出

Redis 的 BLPOP、BRPOP 是实现简易消息队列的基础：

```bash
# 客户端 A：阻塞等待，超时 30 秒
127.0.0.1:6379> BRPOP task_queue 30
1) "task_queue"
2) "task_001"

# 客户端 B：推送消息
127.0.0.1:6379> LPUSH task_queue "task_001"
(integer) 1
```

::: tip 阻塞机制
当 list 为空时，BLPOP/BRPOP 会将客户端放入阻塞队列（按 key 分组），不占用 CPU。当有新元素推入或超时时，Redis 唤醒阻塞客户端。可以同时阻塞多个 key，按 key 顺序依次检查。
:::

## 消息队列场景

### 基本队列

```bash
# 生产者
LPUSH queue:order '{"id":1,"amount":99.9}'
LPUSH queue:order '{"id":2,"amount":199.9}'

# 消费者
BRPOP queue:order 0  # 0 表示无限等待
```

### 延迟队列

结合 ZSet 实现延迟队列：

```bash
# 入队：score 为执行时间戳
ZADD delay:queue 1705286400 '{"action":"send_email","to":"user@test.com"}'

# 轮询：取出到期任务
ZRANGEBYSCORE delay:queue 0 <current_timestamp> LIMIT 0 10
```

### 问题与局限

List 作为消息队列存在以下不足：

1. **不支持消费者组**：多个消费者竞争同一个队列，消息只能被消费一次。
2. **没有消息确认机制**：BRPOP 弹出即消费，消费者崩溃则消息丢失。
3. **没有消息持久化跟踪**：无法查看已消费/未消费的消息。

::: warning 生产环境消息队列
如果需要消费者组、消息确认、消息回溯等特性，应该使用 Redis 5.0 引入的 **Stream** 数据结构（见[高级数据结构](./advanced-structures.md)）。简单场景用 List 就够了。
:::

## 常用命令

```bash
# 头部操作
LPUSH key val1 [val2 ...]    # 头部插入
LPOP key [count]             # 头部弹出

# 尾部操作
RPUSH key val1 [val2 ...]    # 尾部插入
RPOP key [count]             # 尾部弹出

# 查询
LLEN key                     # 列表长度
LRANGE key start stop        # 范围查询（-1 表示末尾）
LINDEX key index             # 按索引获取

# 修改
LSET key index value         # 设置指定索引的值
LINSERT key BEFORE|AFTER pivot value  # 在指定元素前后插入
LTRIM key start stop         # 裁剪列表

# 阻塞
BLPOP key1 [key2 ...] timeout
BRPOP key1 [key2 ...] timeout
BRPOPLPUSH src dst timeout   # 弹出并推入另一个列表（原子操作）
```
