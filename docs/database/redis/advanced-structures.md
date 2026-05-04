# 高级数据结构

Redis 除了 5 种基本类型外，还提供了 HyperLogLog、GEO、Stream 三种高级数据结构，各自解决特定的业务场景。

## HyperLogLog

HyperLogLog（HLL）是一种概率性数据结构，用于**基数估计**（统计不重复元素的数量）。它用极小的内存（固定 12KB）估算百万甚至十亿级别的基数，误差约 0.81%。

### 原理直觉

HLL 的核心思想基于概率论：如果一组随机整数中，所有数的二进制表示中前导零的最大位数是 k，那么基数大约是 2^k。

```
观察到的数（二进制）  |  前导零个数
-------------------|----------
0010 1101          |  2
0001 0010          |  3  ← 最大
1100 0100          |  0
```

Redis 将 16384（2^14）个桶的结果取调和平均数，得到最终的基数估计。

### 使用方法

```bash
# 添加元素（不影响内存大小，始终 12KB）
PFADD uv:20240115 "user:1001" "user:1002" "user:1003"
(integer) 1

# 估算基数
PFCOUNT uv:20240115
(integer) 3

# 合并多个 HLL
PFMERGE uv:week uv:day1 uv:day2 uv:day3 uv:day4 uv:day5 uv:day6 uv:day7
OK

PFCOUNT uv:week
(integer) 156723
```

::: tip 典型场景：UV 统计
统计网站的独立访客数。传统方案用 Set 存储所有 user_id，1 亿用户需要约 5GB 内存。HyperLogLog 只需要 12KB，误差 0.81%，对于 UV 统计完全可接受。
:::

::: warning HLL 不适合的场景
- 需要精确计数（如订单数、库存）
- 需要知道具体包含哪些元素
- 数据量很小（< 10000），直接用 Set 更好
:::

## GEO

GEO 用于存储地理位置坐标并计算距离、范围查询。底层使用 **ZSet** 实现，score 是 Geohash 编码值。

### Geohash 编码

Geohash 将二维经纬度编码为一维字符串/整数。编码越长精度越高，前缀相同的编码在地理上邻近。

```
经度范围 [-180, 180]，纬度范围 [-90, 90]

编码过程（交替取经度和纬度的二进制位）：
纬度  39.9042° → 01101001...
经度 116.4074° → 11010010...

合并后：01 10 10 01 10 01 00 10...
转 Base32：wx4g（约 20km 精度）
```

Redis 使用 52 位整数的 Geohash 编码作为 ZSet 的 score，精度约 0.6m。

### 使用方法

```bash
# 添加地理位置
GEOADD stores 116.4074 39.9042 "store:A"    # 北京
GEOADD stores 121.4737 31.2304 "store:B"    # 上海
GEOADD stores 113.2644 23.1291 "store:C"    # 广州

# 计算两点距离（单位：km）
GEODIST stores "store:A" "store:B" km
"1068.23"

# 获取坐标
GEOPOS stores "store:A"
1) 1) "116.40739530324935913"
   2) "39.90420028805806033"

# 附近搜索：以北京为中心，半径 500km
GEORADIUS stores 116.4074 39.9042 500 km WITHDIST COUNT 10

# 以某个成员为中心搜索
GEOSEARCH stores FROMMEMBER "store:A" BYRADIUS 500 km WITHDIST
```

### 底层命令

由于 GEO 底层是 ZSet，可以用 ZSet 命令查看原始数据：

```bash
127.0.0.1:6379> ZRANGE stores 0 -1 WITHSCORES
1) "store:C"
2) "4046435788524412"
3) "store:B"
4) "4054805525820942"
5) "store:A"
6) "4069885364426436"
```

## Stream

Stream 是 Redis 5.0 引入的数据结构，专为消息队列设计，支持消费者组、消息确认、消息回溯，弥补了 List 作为消息队列的不足。

### 消息结构

每条消息有一个唯一的 ID（`时间戳-序列号` 格式），以及一组字段-值：

```bash
# 添加消息（* 表示自动生成 ID）
XADD orders * action "create" order_id "1001" amount "99.9"
"1705286400000-0"

# 指定 ID
XADD orders 1705286400000-0 action "create" order_id "1001" amount "99.9"
```

### 消费消息

```bash
# 非阻塞读取
XREAD COUNT 10 STREAMS orders 0-0  # 从头读取

# 阻塞读取（类似 BRPOP）
XREAD BLOCK 30000 COUNT 10 STREAMS orders $  # $ 表示只读新消息
```

### 消费者组

消费者组是 Stream 的核心特性，多个消费者共享一条 Stream，每条消息只被组内的一个消费者处理：

```bash
# 创建消费者组
XGROUP CREATE orders order-group 0  # 0 表示从头开始
XGROUP CREATE orders order-group $  # $ 表示只消费新消息

# 消费者读取（自动分配消息）
XREADGROUP GROUP order-group consumer-1 COUNT 5 STREAMS orders >

# 确认消息处理完成
XACK orders order-group "1705286400000-0"
```

消费者组保证：
- **负载均衡**：消息自动分配给组内不同消费者。
- **消息持久**：已发送但未确认的消息会进入 Pending Entries List（PEL）。
- **故障恢复**：崩溃的消费者重启后可以重新读取未确认的消息。

### 消息确认与 PEL

```
消息生命周期：

XADD → Stream → XREADGROUP → 消费者处理 → XACK
                      ↓
                   PEL（未确认列表）
                      ↓
                消费者崩溃 → XPENDING 查看 → XCLAIM 转移
```

```bash
# 查看待确认消息
XPENDING orders order-group - + 10

# 将长时间未确认的消息转移给其他消费者
XCLAIM orders order-group consumer-2 60000 "1705286400000-0"
```

### Stream vs List

| 特性 | List + BRPOP | Stream |
|------|-------------|--------|
| 消费者组 | 不支持 | 支持 |
| 消息确认 | 无（弹出即丢） | XACK 确认 |
| 消息回溯 | 无法查看已消费消息 | 通过 ID 回溯 |
| 消息 ID | 无 | 自动生成时间戳 ID |
| 阻塞读取 | BRPOP | XREAD BLOCK |
| 内存效率 | 较高（listpack） | 略高开销 |
| 最大长度 | 无限制 | MAXLEN 可裁剪 |

::: tip 生产环境选择
简单任务队列、工作分发用 List 即可。如果需要消费者组语义、消息确认、消息回溯，必须使用 Stream。Kafka 用户会发现 Stream 的消费者组模型非常熟悉。
:::

### Stream 内存管理

```bash
# 限制 Stream 最大长度（近似裁剪，效率更高）
XADD orders MAXLEN ~ 10000 * action "pay" order_id "1002"

# 精确裁剪
XTRIM orders MAXLEN 10000

# 按最小 ID 裁剪
XADD orders MINID ~ 1705286400000 * action "pay"
```
