# Pipeline 与 Lua

Redis 是单线程处理命令的，每个命令都需要一次网络往返。Pipeline 和 Lua 脚本是提升 Redis 吞吐量和实现复杂原子操作的两大利器。

## Pipeline

Pipeline 将多个命令打包发送，服务端按顺序执行后一次性返回结果，将 N 次网络往返减少为 1 次。

### 原理对比

```
普通模式（4 次往返）：
Client → Server: SET k1 v1
Server → Client: OK
Client → Server: SET k2 v2
Server → Client: OK
Client → Server: GET k3
Server → Client: "v3"
Client → Server: INCR counter
Server → Client: 1

Pipeline 模式（1 次往返）：
Client → Server: SET k1 v1\nSET k2 v2\nGET k3\nINCR counter
Server → Client: OK\nOK\n"v3"\n1
```

### 使用方法

```java
// Jedis Pipeline
try (Jedis jedis = pool.getResource()) {
    Pipeline pipe = jedis.pipelined();
    
    for (int i = 0; i < 10000; i++) {
        pipe.set("key:" + i, "value:" + i);
    }
    
    // 同步发送并获取结果
    List<Object> results = pipe.syncAndReturnAll();
}
```

```python
# redis-py Pipeline
pipe = redis_client.pipeline()
for i in range(10000):
    pipe.set(f"key:{i}", f"value:{i}")
results = pipe.execute()  # 一次性发送
```

```bash
# redis-cli Pipeline
cat commands.txt | redis-cli --pipe

# commands.txt 内容（RESP 协议格式）：
*3\r\n$3\r\nSET\r\n$4\r\nkey1\r\n$6\r\nvalue1\r\n
*3\r\n$3\r\nSET\r\n$4\r\nkey2\r\n$6\r\nvalue2\r\n
```

::: tip Pipeline 性能提升
单条 Redis 命令的网络延迟约 0.1-1ms。10000 条命令普通模式需要 1-10 秒，Pipeline 只需要 1 次网络往返（几十毫秒）。Pipeline 的瓶颈从网络延迟变成了网络带宽和 Redis 的单线程执行速度。
:::

### Pipeline 注意事项

1. **Pipeline 不是原子操作**：命令之间可能穿插其他客户端的命令。
2. **结果顺序**：返回结果的顺序与命令发送顺序一致。
3. **内存消耗**：Pipeline 缓冲大量命令在客户端和服务端都消耗内存，建议分批（如每批 1000-5000 条）。
4. **不支持事务语义**：Pipeline 中的命令独立执行，失败不影响其他命令。

## Lua 脚本

Redis 从 2.6 开始内置 Lua 解释器，允许在服务端执行 Lua 脚本。Lua 脚本中的所有操作都是**原子**的，执行期间不会被其他命令打断。

### 基本语法

```bash
# EVAL 脚本 key数量 key1 key2 ... arg1 arg2 ...
EVAL "return redis.call('GET', KEYS[1])" 1 mykey

# 带参数的脚本
EVAL "
  redis.call('SET', KEYS[1], ARGV[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 1
" 1 user:1001 "Tom" 3600

# 先加载脚本获得 SHA1，再用 EVALSHA 调用（减少网络传输）
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# 返回 "6b1bf426..."

EVALSHA "6b1bf426..." 1 mykey
```

### 原子操作示例

#### 比较并删除（释放分布式锁）

```lua
-- KEYS[1]: 锁 key, ARGV[1]: 预期的 value
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
else
    return 0
end
```

#### 库存扣减（防止超卖）

```lua
-- KEYS[1]: 库存 key, ARGV[1]: 扣减数量
local stock = tonumber(redis.call('GET', KEYS[1]))
local amount = tonumber(ARGV[1])

if stock >= amount then
    redis.call('DECRBY', KEYS[1], amount)
    return stock - amount
else
    return -1  -- 库存不足
end
```

#### 限流器（滑动窗口）

```lua
-- KEYS[1]: 限流 key, ARGV[1]: 窗口大小(秒), ARGV[2]: 最大请求数
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 移除窗口外的旧数据
redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)

-- 统计窗口内的请求数
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now .. '-' .. math.random())
    redis.call('EXPIRE', key, window)
    return 1  -- 允许
else
    return 0  -- 拒绝
end
```

```bash
# 调用限流器（60 秒内最多 100 次）
EVAL <script> 1 rate:user:1001 60 100 <current_timestamp_ms>
```

::: tip Lua 脚本的原子性保证
Redis 在执行 Lua 脚本期间是**阻塞**的。脚本中的所有命令作为一个原子操作执行，期间不会插入其他客户端的命令。这意味着 Lua 脚本中的读-改-写操作天然线程安全。但脚本不能太长（默认 5 秒超时，`lua-time-limit` 配置），否则会阻塞整个 Redis。
:::

### Lua 脚本注意事项

1. **不要在 Lua 中做循环**：Redis 单线程，Lua 中的循环会阻塞所有客户端。
2. **变量作用域**：Lua 中 `local` 变量是局部的，不加 `local` 是全局的（污染全局环境）。
3. **返回值类型**：Lua 的 `nil` 会被转换为空批量回复（nil），数字会被转换为整数回复。
4. **集群模式**：Lua 脚本中的所有 key 必须在同一个 slot（使用 `{tag}` 保证）。
5. **脚本传播**：主节点执行的 Lua 脚本会通过 AOF 传播到从节点，确保一致性。

## Redis 事务（MULTI/EXEC）

Redis 的事务通过 `MULTI`、`EXEC`、`WATCH` 实现，但与关系型数据库的事务有本质区别。

### 基本用法

```bash
MULTI
SET name "Tom"
INCR counter
EXEC
# 所有命令一次性执行，返回数组结果

# 放弃事务
MULTI
SET name "Jerry"
DISCARD
```

### WATCH 乐观锁

`WATCH` 实现 CAS（Compare-And-Set），监控 key 是否被修改：

```bash
WATCH balance        # 监控余额
GET balance          # "100"
MULTI
DECRBY balance 50
EXEC                 # 如果 balance 被其他客户端修改，EXEC 返回 nil
```

::: warning MULTI/EXEC 的局限性
- 命令入队时不做语法检查（错误命令到 EXEC 时才报错）。
- 事务中的命令要么全执行，要么全不执行——但如果某个命令执行失败（如对字符串执行 INCR），**不会回滚**已执行的命令。
- 不支持条件分支。
- **大多数场景下，Lua 脚本是更好的选择**。
:::

### Pipeline vs Lua vs MULTI/EXEC

| 特性 | Pipeline | Lua | MULTI/EXEC |
|------|----------|-----|-----------|
| 原子性 | 否 | 是 | 部分（不回滚） |
| 减少网络往返 | 是 | 是 | 是 |
| 条件逻辑 | 否 | 是 | 否 |
| 读-改-写 | 否 | 是（原子） | WATCH + CAS |
| 复杂度 | 低 | 中 | 低 |
| 集群兼容 | 需 key 同 slot | 需 key 同 slot | 需 key 同 slot |
