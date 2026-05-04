# RDB 持久化

RDB（Redis Database）持久化通过生成内存数据的快照（snapshot）保存到磁盘文件中。RDB 文件是一个紧凑的二进制文件，适合备份和灾难恢复，但在两次快照之间可能丢失数据。

## 工作原理

RDB 的核心是 `BGSAVE` 命令。Redis 通过 `fork()` 创建子进程，子进程将内存中的数据写入临时 RDB 文件，写完后替换旧的 RDB 文件。

```
Redis 主进程（父进程）
    |
    | fork()
    ↓
Redis 子进程                    客户端请求
    |                               |
    | 将内存数据写入              主进程继续
    | dump.rdb.tmp                 处理请求
    |                               |
    ↓                               ↓
写完后 rename 替换             修改数据（触发 COW）
    |                               |
    dump.rdb.tmp → dump.rdb     物理内存仍共享
```

## fork + COW 机制

### Copy-On-Write（写时复制）

fork() 之后，父进程和子进程共享同一份物理内存页。操作系统将这些页标记为**只读**。当父进程尝试修改某个内存页时，触发页错误（page fault），操作系统为父进程复制一份该页，子进程继续使用原始页。

```
fork 之前：
  进程内存 → [Page A] [Page B] [Page C]

fork 之后（共享）：
  父进程 → [Page A] [Page B] [Page C] ← 子进程（全部只读）

父进程修改 Page B 时（COW）：
  父进程 → [Page A] [Page B'] [Page C]  ← B' 是复制后的新页
  子进程 → [Page A] [Page B ] [Page C]  ← 子进程仍读旧的 B
```

::: warning COW 的风险
fork 期间父进程修改的数据越多，需要复制的内存页越多，实际内存占用可能翻倍。如果父进程在 BGSAVE 期间有大量写操作，可能消耗 2 倍内存。在内存紧张的服务器上可能导致 OOM。
:::

### fork 耗时因素

- **物理内存大小**：内存越大，fork 耗时越长（虽然 COW 不复制实际数据，但内核需要复制页表）。
- **Linux 版本**：2.6.38+ 支持 `THP`（Transparent Huge Pages），但会增大 fork 耗时。
- **虚拟机环境**：虚拟化层可能增加 fork 开销。

::: tip 生产建议
- 在内存 < 10GB 的机器上，fork 通常在毫秒级完成。
- 使用 `info stats` 中的 `latest_fork_usec` 监控 fork 耗时。
- 如果 fork 耗时 > 1 秒，考虑减少 Redis 实例的内存占用。
:::

## BGSAVE 触发策略

### 手动触发

```bash
# 后台保存（fork 子进程）
BGSAVE

# 前台保存（阻塞主进程，生产环境不要用）
SAVE

# 查看最后一次保存时间
LASTSAVE

# 停止正在进行的 BGSAVE
BGSAVE SCHEDULE  # Redis 7.0+ 可调度
```

### 自动触发

在 `redis.conf` 中配置：

```conf
# 900 秒内有 1 次修改 → 保存
save 900 1

# 300 秒内有 10 次修改 → 保存
save 300 10

# 60 秒内有 10000 次修改 → 保存
save 60 10000
```

Redis 在后台维护一个计数器，每秒检查一次是否满足条件。满足任一条件即触发 BGSAVE。

### 关闭 RDB

```conf
# 注释所有 save 行，或：
save ""
```

## RDB 文件格式

RDB 文件是二进制格式，结构如下：

```
+-------------------+
| REDIS0011         |  ← 魔数和版本号
+-------------------+
| FA $key $value    |  ← 辅助字段（redis-ver, redis-bits 等）
+-------------------+
| FE $db_index      |  ← 数据库编号
| FB $key_count     |  ← key 数量和过期 key 数量
| $type $key $val   |  ← 具体数据
| FC $expire_ms     |  ← 过期时间（毫秒）
| $type $key $val   |  ← 带过期的数据
+-------------------+
| FF                |  ← 结束标记
| $checksum         |  ← CRC64 校验和
+-------------------+
```

```bash
# 查看 RDB 文件内容（需要安装 redis-rdb-tools）
rdb --command json dump.rdb

# 或者使用 Redis 自带工具
redis-check-rdb dump.rdb
```

## RDB 优缺点

**优点：**
- RDB 文件紧凑，适合备份和远程传输。
- 恢复大数据集时，RDB 比 AOF 更快（直接加载二进制数据，无需重放命令）。
- 对主进程性能影响小（fork 后子进程处理）。

**缺点：**
- 可能丢失最后一次快照后的数据（取决于 save 配置间隔）。
- 数据集大时，fork 过程可能造成服务短暂卡顿（几十毫秒）。
- RDB 文件格式是二进制的，无法直接阅读或修改。

## BGSAVE 期间的写操作处理

BGSAVE 期间 Redis 继续服务客户端请求。修改操作触发 COW，不影响子进程的快照视图。但 Redis 不会在这个期间执行 AOF 重写（避免两个 fork 同时运行导致内存翻倍）。

```bash
# 查看是否正在执行 BGSAVE
127.0.0.1:6379> INFO persistence
rdb_bgsave_in_progress:0
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:0
rdb_current_bgsave_time_sec:-1
```
