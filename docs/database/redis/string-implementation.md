# String 与 SDS

Redis 没有直接使用 C 语言原生的 `char*` 字符串，而是设计了 SDS（Simple Dynamic String）作为默认的字符串实现。SDS 解决了 C 字符串在 Redis 场景下的多个痛点。

## C 字符串的局限性

C 语言的 `char*` 以 `\0` 结尾，存在以下问题：

1. **获取长度需要遍历**：`strlen()` 时间复杂度 O(n)，Redis 需要频繁获取字符串长度。
2. **不记录已分配空间**：无法判断是否需要扩容，容易导致缓冲区溢出。
3. **二进制不安全**：不能存储包含 `\0` 的数据（如图片、序列化对象）。
4. **每次修改都需重新分配**：没有预留空间的概念，拼接/截断都需要 realloc。

## SDS 数据结构

Redis 7.0 的 SDS 定义在 `sds.h` 中，根据字符串长度使用不同的头部结构：

```c
// sdshdr8（字符串长度 < 2^8 = 256）
struct __attribute__ ((__packed__)) sdshdr8 {
    uint8_t len;      // 已使用长度
    uint8_t alloc;    // 已分配长度（不含头部和'\0'）
    unsigned char flags; // 标志位（低 3 位表示类型）
    char buf[];       // 柔性数组，存储实际数据
};

// sdshdr16, sdshdr32, sdshdr64 类似，只是 len 和 alloc 的类型不同
```

SDS 的内存布局：

```
+--------+--------+-------+------------------+----+
|  len   |  alloc | flags |      buf         | \0 |
| 1 byte | 1 byte | 1 byte| len+alloc bytes  |1byte|
+--------+--------+-------+------------------+----+
                              ↑ buf 指针指向这里
```

## SDS vs C 字符串

| 特性 | C 字符串 | SDS |
|------|----------|-----|
| 获取长度 | O(n) 遍历 | O(1) 读 len 字段 |
| 二进制安全 | 否（遇 \0 截断） | 是（len 决定边界） |
| 缓冲区溢出 | 无保护 | 自动扩容检查 |
| 空间预分配 | 无 | 修改后分配 alloc = 2*len（< 1MB）或 +1MB |
| 惰性空间释放 | 无 | 缩短时只改 len，不立即释放 |
| 减少内存重分配 | 无 | 预分配 + 惰性释放 |

::: tip 空间预分配策略
当 SDS 需要扩容时：
- 修改后 `len` < 1MB：`alloc = len * 2`（翻倍预分配）
- 修改后 `len` >= 1MB：`alloc = len + 1MB`（固定追加 1MB）

这使得连续的追加操作（如 APPEND）不会每次都触发内存重分配。N 次追加操作最多触发 O(N) 次 realloc，均摊下来每次操作 O(1)。
:::

## String 的 3 种编码详解

Redis 中每个 value 都被包装为一个 `redisObject`（robj）：

```c
typedef struct redisObject {
    unsigned type:4;      // 类型：OBJ_STRING, OBJ_LIST, OBJ_HASH...
    unsigned encoding:4;  // 编码：OBJ_ENCODING_INT, OBJ_ENCODING_EMBSTR...
    unsigned lru:24;      // LRU 时钟或 LFU 数据
    int refcount;         // 引用计数
    void *ptr;            // 指向实际数据
} robj;
```

### int 编码

当值可以被解析为 `long` 类型的整数时，Redis 直接将整数值存储在 `ptr` 指针中（利用指针本身的空间，无需额外分配）：

```bash
127.0.0.1:6379> SET counter 100
OK
127.0.0.1:6379> OBJECT ENCODING counter
"int"
127.0.0.1:6379> INCR counter
(integer) 101
127.0.0.1:6379> GET counter
"101"
```

::: tip 共享对象池
Redis 启动时会预先创建 0-9999 的共享整数对象。当 SET 一个 0-9999 的整数值时，直接复用共享对象，无需创建新的 redisObject。可以通过 `redis.object-max-intset-entries` 调整。
:::

### embstr 编码

当字符串长度 <= 44 字节时，Redis 用一次 `malloc` 分配连续内存，同时存放 redisObject 和 sdshdr：

```
+------------------+---------------------------+
|    redisObject   |         sdshdr + buf      |
|     16 bytes     |    3 + len + 1 bytes      |
+------------------+---------------------------+
 ↑ ptr 指向 sdshdr
```

优势：一次 malloc/free、更好的 CPU 缓存局部性。embstr 是**只读**的，任何修改操作都会将编码转为 raw。

### raw 编码

字符串长度 > 44 字节时，redisObject 和 sdshdr 分开分配内存，需要两次 malloc。

```bash
127.0.0.1:6379> SET short "this is embstr encoding"
OK
127.0.0.1:6379> OBJECT ENCODING short
"embstr"

127.0.0.1:6379> APPEND short " with more text to exceed 44 byte limit here ok"
(integer) 62
127.0.0.1:6379> OBJECT ENCODING short
"raw"
```

## 编码转换时机

| 操作 | 原编码 | 新编码 | 原因 |
|------|--------|--------|------|
| APPEND int | int | embstr/raw | 附加文本后不再是整数 |
| INCR string | embstr | int | 转为整数运算 |
| APPEND embstr | embstr | raw | embstr 不可修改，需重新分配 |
| SETRANGE embstr | embstr | raw | 部分修改需要独立 SDS |

## Bitmap 位操作

Redis 的 String 类型支持位级别的操作，底层就是 SDS 字符串，每个 byte 8 个 bit：

```bash
# 用户签到场景：第 0 天和第 3 天签到
127.0.0.1:6379> SETBIT signin:202401 0 1
(integer) 0
127.0.0.1:6379> SETBIT signin:202401 3 1
(integer) 0

# 查询第 3 天是否签到
127.0.0.1:6379> GETBIT signin:202401 3
(integer) 1

# 统计本月签到天数
127.0.0.1:6379> BITCOUNT signin:202401
(integer) 2

# 连续签到 7 天（位运算 AND）
127.0.0.1:6379> BITOP AND result signin:w1 signin:w2
(integer) 1
```

::: tip Bitmap 内存计算
1 亿用户的签到状态只需要约 12MB 内存（10^8 / 8 / 1024 / 1024 ≈ 11.9MB）。Bitmap 的 SETBIT 和 GETBIT 都是 O(1) 操作。
:::

## 分布式 ID 生成

利用 String 的 INCR 原子操作生成全局唯一 ID：

```bash
127.0.0.1:6379> INCR global:id:order
(integer) 10001
127.0.0.1:6379> INCR global:id:order
(integer) 10002
```

结合时间戳和序列号，可以生成趋势递增的 ID：

```java
// Java 实现：日期 + Redis 自增
String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
long seq = jedis.incr("id:order:" + datePart);
String orderId = datePart + String.format("%06d", seq);
// 输出：20240115000001
```
