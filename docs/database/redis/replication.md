# 主从复制

Redis 主从复制（Replication）允许从节点（replica）复制主节点（master）的数据，提供数据冗余和读扩展能力。主节点处理写操作，从节点异步同步数据并处理读请求。

## 复制原理

```
客户端 → Master → 写命令 → 执行 + 写入 repl_backlog
                    ↓
              异步发送命令流
                    ↓
              Replica 接收 → 执行写命令 → 数据同步

复制方式：
  全量同步（Full Resync）：RDB 快照 + 增量命令
  增量同步（Partial Resync）：仅从 repl_backlog 补发
```

## 全量同步（Full Resync）

当从节点第一次连接主节点，或断线时间太长导致 repl_backlog 中的数据已被覆盖时，触发全量同步：

1. 从节点发送 `PSYNC ? -1`（首次连接不知道 master 的 replid）。
2. 主节点执行 `BGSAVE`，生成 RDB 快照。
3. 主节点将 RDB 文件发送给从节点，期间的新写命令缓存在**复制缓冲区**。
4. 从节点加载 RDB 文件。
5. 主节点将复制缓冲区中的增量命令发送给从节点。
6. 同步完成，进入命令传播阶段。

```
Replica                          Master
  |                                |
  |--- PSYNC ? -1 --------------->|
  |                                |--- fork() + BGSAVE
  |<-- FULLRESYNC replid offset --|
  |                                |--- 发送 RDB 文件
  |<-- RDB file ------------------|
  |--- 加载 RDB -----------------|
  |<-- 缓冲区中的增量命令 ---------|
  |--- 执行增量命令 --------------|
  |                                |
  |<===== 命令传播阶段 ==========>|
```

## 增量同步（Partial Resync）

断线重连时，如果 repl_backlog 中还有从节点断线前的数据，主节点只需补发增量部分：

1. 从节点发送 `PSYNC replid offset`。
2. 主节点检查 replid 是否匹配（是否是同一台主节点）。
3. 主节点检查 offset 是否在 repl_backlog 范围内。
4. 如果满足条件，直接从 offset 位置开始补发增量命令。

### repl_backlog

repl_backlog 是一个**环形缓冲区**（默认 1MB），存储主节点最近执行的写命令：

```conf
# redis.conf
repl-backlog-size 1mb        # 环形缓冲区大小
repl-backlog-ttl 3600        # 无从节点连接时，1 小时后释放
```

::: tip repl_backlog 大小计算
如果主节点写入量为 10MB/s，从节点最多断线 10 秒，则 repl_backlog 需要至少 100MB。可以根据 `info replication` 中的 `master_repl_offset` 变化速度和最大容忍断线时间来计算。
:::

## PSYNC 协议

Redis 2.8+ 使用 PSYNC 替代旧的 SYNC 命令：

```bash
# 从节点发送（首次）
PSYNC ? -1

# 从节点发送（断线重连）
PSYNC 8b3e2c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c 123456

# 主节点响应
# 情况 1：全量同步
FULLRESYNC <replid> <offset>

# 情况 2：增量同步
+CONTINUE
```

### replid

每个 Redis 实例有两个 replid：
- `replid`：第一个主节点的复制 ID，从未变过。
- `replid2`：上一个主节点的复制 ID（用于切换后部分重连）。

```bash
127.0.0.1:6379> INFO replication
role:master
connected_slaves:2
master_replid:8b3e2c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:12345
```

## 配置方法

### 命令方式（运行时）

```bash
# 在从节点上执行
127.0.0.1:6380> REPLICAOF 127.0.0.1 6379
OK

# 或连接时指定
redis-cli -p 6380 --replicaof 127.0.0.1 6379
```

### 配置文件方式

```conf
# replica.conf
replicaof 127.0.0.1 6379
masterauth "master_password"

# 从节点只读（默认 yes）
replica-read-only yes

# 无盘复制（Redis 2.8.18+）
repl-diskless-sync yes
repl-diskless-sync-delay 5     # 等待更多从节点连接后一起传输

# 复制积压缓冲区
repl-backlog-size 64mb
```

## 无盘复制

传统的全量同步需要先将 RDB 写入磁盘，再发送给从节点。无盘复制（diskless replication）直接通过网络发送 RDB：

```
传统方式：Master → BGSAVE → 写磁盘 → 读磁盘 → 发送给 Replica
无盘方式：Master → BGSAVE → 管道直接 → 发送给 Replica
```

::: tip 无盘复制优势
- 减少磁盘 I/O（不用写 + 读 RDB 文件）。
- SSD 环境下尤其明显。
- 缺点：如果传输过程中断，需要重新 fork。
:::

## 过期 Key 传播

主节点使用**惰性删除 + 定期删除**策略处理过期 key。从节点不会主动删除过期 key，而是等待主节点的 `DEL` 命令：

```bash
# 主节点 key 过期
# 主节点惰性删除或定期删除触发 → 向从节点发送 DEL 命令
# 从节点收到 DEL 后删除本地副本
```

::: warning 从节点读到过期数据
在主节点删除过期 key 和从节点收到 DEL 命令之间，从节点可能返回已过期的数据。Redis 3.2+ 在从节点上做了优化：读取时检查 key 是否已过期（惰性删除），但不保证完全一致。
:::

## 读写分离

利用主从复制实现读写分离，将读请求路由到从节点：

```
                  ┌── Replica 1 (读)
Client → Proxy → ├── Replica 2 (读)
                  └── Master (写)
```

**常见问题：**

1. **复制延迟**：从节点数据可能滞后于主节点。解决方案：关键读走主节点。
2. **过期数据**：从节点可能读到已过期但未删除的 key。
3. **从节点故障**：读请求需要自动切换到其他从节点或主节点。
