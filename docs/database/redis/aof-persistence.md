# AOF 持久化

AOF（Append Only File）持久化记录每个写操作到日志文件中，重启时重放所有命令恢复数据。相比 RDB 的快照方式，AOF 能提供更好的数据安全性（durability）。

## 工作原理

```
客户端写命令 → Redis 执行 → 追加到 AOF 缓冲区 → 根据策略写入/刷盘 → AOF 文件

                                aof_buf
                                  ↓
                          appendfsync 策略
                                  ↓
                    +-------------+-------------+
                    |             |             |
                  always      everysec        no
                    |             |             |
                每次写命令    每秒一次     由 OS 决定
                立即 fsync    异步 fsync    (通常 30s)
```

## 写入策略

| 策略 | 同步时机 | 数据安全性 | 性能 |
|------|----------|-----------|------|
| always | 每次写命令后立即 fsync | 最高，最多丢 1 条命令 | 最低，机械硬盘约几百 QPS |
| everysec | 每秒一次后台线程 fsync | 较高，最多丢 1 秒数据 | 较高，推荐生产使用 |
| no | 由操作系统决定（通常 30 秒） | 最低 | 最高 |

```conf
# redis.conf
appendonly yes
appendfsync everysec
```

::: tip always 真的安全吗？
即使使用 always，理论上在写入 AOF 缓冲区到 fsync 之间的极短时间窗口内（微秒级），如果 Redis 进程崩溃，仍可能丢失一条命令。但这个窗口极小，实际中几乎不会发生。everysec 是数据安全性和性能之间的最佳平衡点。
:::

## AOF 文件格式

AOF 文件是纯文本格式，记录 RESP 协议格式的命令：

```
*2
$6
SELECT
$1
0
*3
$3
SET
$4
name
$5
hello
*2
$6
EXPIRE
$4
name
$2
60
```

```bash
# 查看 AOF 文件内容
cat appendonly.aof

# 验证 AOF 文件完整性
redis-check-aof appendonly.aof
```

## AOF 重写

AOF 文件会随着运行时间不断增大。AOF 重写通过分析当前内存状态，生成等价的命令序列来压缩文件大小。

### 重写原理

AOF 重写**不是**读取旧的 AOF 文件，而是直接读取当前内存中的数据，为每个 key 生成一条写入命令：

```
旧 AOF 文件中：
  RPUSH list 1
  RPUSH list 2
  RPUSH list 3
  ...
  RPUSH list 1000

重写后：
  RPUSH list 1 2 3 ... 1000  （一条命令代替 1000 条）
```

```bash
# 手动触发 AOF 重写
BGREWRITEAOF
```

### 重写过程

```
Redis 主进程
    |
    | fork()
    ↓
子进程                         主进程
    |                              |
    | 读取内存数据              继续处理请求
    | 生成新 AOF 文件              |
    | (临时文件)                   |
    |                         写命令同时追加到：
    |                         1. 旧 AOF 文件（aof_buf）
    |                         2. AOF 重写缓冲区（aof_rewrite_buf）
    |                              |
    ↓                              ↓
子进程写完 → 发信号给父进程    父进程将重写缓冲区
    |                          的内容追加到新 AOF 文件
    |                              |
    ↓                              ↓
                         rename 新 AOF → appendonly.aof
```

::: warning AOF 重写期间的双写
重写期间，父进程的写操作需要同时写入旧 AOF 和重写缓冲区，保证数据不丢失。这会增加一些内存和 CPU 开销。如果重写期间写入量很大，重写缓冲区可能增长很快。
:::

## 配置参数

```conf
# 开启 AOF
appendonly yes

# AOF 文件名
appendfilename "appendonly.aof"

# 写入策略
appendfsync everysec

# AOF 重写触发条件
auto-aof-rewrite-percentage 100   # 文件增长 100% 时触发
auto-aof-rewrite-min-size 64mb    # 最小 64MB 才触发

# 重写期间是否使用 fsync
no-appendfsync-on-rewrite no      # 默认 no，重写期间也 fsync
```

::: tip no-appendfsync-on-rewrite
设为 yes 时，AOF 重写期间主进程不做 fsync，可以减少 I/O 竞争。但风险是如果此时 Redis 崩溃 + 机器宕机，可能丢失更多数据。生产环境建议设为 no。
:::

## RDB-AOF 混合持久化

Redis 4.0 引入了混合持久化模式（`aof-use-rdb-preamble yes`），AOF 重写时以 RDB 格式写入当前数据，再追加增量 AOF 命令：

```
+-------------------+
| RDB 格式数据      |  ← 重写时的全量数据（紧凑、加载快）
+-------------------+
| AOF 格式命令      |  ← 重写后的增量命令（*2, $6, SELECT...）
+-------------------+
```

### 配置

```conf
# 开启混合持久化（Redis 4.0+）
aof-use-rdb-preamble yes
```

### 混合持久化的优势

| 方面 | 纯 RDB | 纯 AOF | 混合持久化 |
|------|--------|--------|-----------|
| 数据丢失量 | 可能丢大量数据 | everysec 丢 1 秒 | everysec 丢 1 秒 |
| 文件大小 | 最小 | 最大 | 接近 RDB |
| 恢复速度 | 最快 | 最慢（重放命令） | 快（加载 RDB 部分） |
| 文件可读性 | 不可读 | 可读 | 前半部分不可读 |

::: tip 生产环境推荐
开启混合持久化是目前最佳实践。RDB 部分提供快速恢复能力，AOF 部分保证数据安全性。大多数云服务商的 Redis 托管服务默认使用混合持久化。
:::

## 持久化策略选择

| 场景 | 推荐方案 |
|------|---------|
| 缓存（丢失可接受） | 仅 RDB，或关闭持久化 |
| 会话存储（少量丢失可接受） | 混合持久化 + everysec |
| 金融交易（不能丢数据） | 混合持久化 + always + 主从复制 |
| 大数据集、快速恢复 | 混合持久化 + everysec |

```bash
# 查看当前持久化配置
127.0.0.1:6379> CONFIG GET appendonly
1) "appendonly"
2) "yes"

127.0.0.1:6379> CONFIG GET aof-use-rdb-preamble
1) "aof-use-rdb-preamble"
2) "yes"
```
