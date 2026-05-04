# 监控与调优

生产环境中的 Redis 需要持续监控关键指标、分析慢查询、进行压力测试，以确保稳定性和性能。

## INFO 命令关键指标

`INFO` 命令返回 Redis 实例的详细状态，是监控的基础。

### Server

```bash
127.0.0.1:6379> INFO server
redis_version:7.2.4
redis_mode:standalone              # standalone / cluster / sentinel
tcp_port:6379
uptime_in_seconds:86400            # 运行时长（秒）
uptime_in_days:1                   # 运行天数
hz:10                              # 定时任务频率
executable:/usr/bin/redis-server
config_file:/etc/redis/redis.conf
```

### Memory

```bash
127.0.0.1:6379> INFO memory
used_memory:1073741824             # Redis 分配的内存（bytes）
used_memory_human:1.00G            # 人类可读格式
used_memory_rss:1342177280         # 操作系统分配的 RSS
used_memory_peak:1610612736        # 历史峰值内存
mem_fragmentation_ratio:1.25       # 碎片率
mem_clients_normal:1048576         # 客户端连接占用内存
maxmemory:2147483648               # maxmemory 配置
maxmemory_human:2.00G
maxmemory_policy:allkeys-lru       # 淘汰策略
```

**关键告警规则：**

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| `used_memory / maxmemory` | > 85% | 接近触发淘汰 |
| `mem_fragmentation_ratio` | > 1.5 或 < 1.0 | 碎片过多或 swap |
| `used_memory_rss` | > 物理内存 80% | 防止 OOM |

### Stats

```bash
127.0.0.1:6379> INFO stats
total_connections_received:10000   # 历史总连接数
instantaneous_ops_per_sec:15234    # 当前 QPS
total_commands_processed:50000000  # 历史总命令数
rejected_connections:0             # 因 maxclients 拒绝的连接数
keyspace_hits:8000000              # 缓存命中数
keyspace_misses:2000000            # 缓存未命中数
expired_keys:150000                # 过期删除的 key 数
evicted_keys:5000                  # 淘汰删除的 key 数
latest_fork_usec:1250              # 最近一次 fork 耗时（微秒）
```

**关键告警规则：**

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| 缓存命中率 `hits/(hits+misses)` | < 90% | 缓存效率低 |
| `evicted_keys` | 持续 > 0 | 内存不足在淘汰 |
| `rejected_connections` | > 0 | 连接数超限 |
| `latest_fork_usec` | > 10000（10ms）| fork 过慢 |

### Clients

```bash
127.0.0.1:6379> INFO clients
connected_clients:150              # 当前连接数
client_longest_output_list:0       # 输出缓冲区最长列表
client_biggest_input_buf:0         # 输入缓冲区最大字节数
blocked_clients:2                  # 被阻塞命令阻塞的客户端数
```

::: tip 连接池配置
每个 Redis 客户端连接约占用 10-20KB 内存。1000 个连接约 10-20MB。如果连接数持续增长，检查：
1. 客户端连接池是否正确配置（maxTotal、maxIdle）。
2. 是否有连接泄漏（获取连接后没有归还）。
3. `maxclients` 配置是否合理（默认 10000）。
:::

### Replication

```bash
127.0.0.1:6379> INFO replication
role:master
connected_slaves:2
slave0:ip=192.168.1.2,port=6379,state=online,offset=123456,lag=0
slave1:ip=192.168.1.3,port=6379,state=online,offset=123450,lag=1
master_repl_offset:123456
repl_backlog_active:1
repl_backlog_size:67108864         # 64MB
repl_backlog_histlen:123456
```

**关键指标：**
- `lag`：从节点落后主节点的秒数。`lag > 10` 需要关注。
- `slave_repl_offset` 与 `master_repl_offset` 的差距：差距持续增大说明从节点跟不上。

### Persistence

```bash
127.0.0.1:6379> INFO persistence
rdb_bgsave_in_progress:0
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:3         # 最近一次 BGSAVE 耗时
rdb_last_save_time:1705286400      # 最近一次保存的 Unix 时间戳
aof_enabled:1
aof_rewrite_in_progress:0
aof_last_rewrite_status:ok
aof_last_rewrite_time_sec:5
```

## 慢查询日志

Redis 慢查询日志记录执行时间超过阈值的命令。

### 配置

```conf
# 记录执行时间超过 10000 微秒（10ms）的命令
slowlog-log-slower-than 10000

# 最多保留 128 条慢查询记录
slowlog-max-len 128
```

### 查看慢查询

```bash
# 获取所有慢查询
SLOWLOG GET 10

# 输出示例：
# 1) 1) (integer) 14        # 慢查询 ID
#    2) (integer) 1705286400 # 时间戳
#    3) (integer) 15234      # 执行时间（微秒）
#    4) 1) "KEYS"            # 命令
#       2) "*user*"
#    5) "127.0.0.1:54321"    # 客户端地址
#    6) ""                   # 客户端名称

# 获取慢查询数量
SLOWLOG LEN

# 清空慢查询日志
SLOWLOG RESET
```

::: tip 常见慢查询原因
1. **KEYS \***：遍历所有 key，数据量大时极慢。
2. **HGETALL**：大 Hash 的全量获取。
3. **LRANGE 0 -1**：大 List 的全量获取。
4. **SORT**：复杂排序操作。
5. **Lua 脚本**：脚本逻辑复杂或循环过多。
6. **大 Key 操作**：单个大 Key 的读写。
:::

## Benchmark 压测

Redis 自带 `redis-benchmark` 工具：

```bash
# 基本压测（100 并发，10 万请求）
redis-benchmark -h 127.0.0.1 -p 6379 -c 100 -n 100000

# 只测试 SET
redis-benchmark -t set -n 100000 -c 50

# Pipeline 模式（每次 10 条命令）
redis-benchmark -t set -n 100000 -c 50 -P 10

# 指定 key 长度和 value 长度
redis-benchmark -t set -d 256 -n 100000

# 测试多个命令组合
redis-benchmark -t set,get,lpush,lpop,sadd,hset -n 100000 -q
```

### 输出解读

```
====== SET ======
  100000 requests completed in 1.23 seconds
  100 parallel clients
  3 bytes payload
  keep alive: 1

  0.00% <= 1 milliseconds
  99.99% <= 2 milliseconds
  100.00% <= 2 milliseconds
  81300.81 requests per second    ← QPS
```

## 生产环境配置建议

### 内存相关

```conf
# 最大内存（不超过物理内存的 70%）
maxmemory 14gb

# 淘汰策略
maxmemory-policy allkeys-lru

# 关闭 THP（Transparent Huge Pages）——在操作系统层面
# echo never > /sys/kernel/mm/transparent_hugepage/enabled

# 设置客户端输出缓冲区限制（防止大 key 占满内存）
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
```

### 持久化相关

```conf
# 混合持久化
aof-use-rdb-preamble yes
appendfsync everysec

# RDB 保存条件
save 900 1
save 300 10
save 60 10000

# AOF 重写
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### 网络与连接

```conf
# 最大客户端连接数
maxclients 10000

# TCP keepalive（秒）
tcp-keepalive 300

# 超时（秒，0 表示不超时）
timeout 0
```

### 安全

```conf
# 密码认证
requirepass "strong_password_here"

# 禁用危险命令（或重命名为空字符串）
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command DEBUG ""
rename-command KEYS ""
```

### 监控建议

| 工具 | 说明 |
|------|------|
| Prometheus + Grafana | 使用 redis_exporter 采集指标，Grafana 可视化 |
| Redis Insight | Redis 官方的可视化管理工具 |
| Datadog / New Relic | 商业 APM，内置 Redis 监控 |
| 自定义监控脚本 | 定时执行 INFO 解析关键指标，告警通知 |

```bash
# 一个简单的监控脚本示例
#!/bin/bash
INFO=$(redis-cli INFO memory)
USED=$(echo "$INFO" | grep used_memory_human | cut -d: -f2)
FRAG=$(echo "$INFO" | grep mem_fragmentation_ratio | cut -d: -f2)
echo "Memory: $USED, Fragmentation: $FRAG"

if (( $(echo "$FRAG > 1.5" | bc -l) )); then
    echo "WARNING: High memory fragmentation!"
fi
```
