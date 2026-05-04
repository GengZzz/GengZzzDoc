# 分布式锁

分布式锁用于在分布式系统中控制对共享资源的互斥访问。Redis 凭借高性能和原子操作，是实现分布式锁的常用方案。

## 基础实现：SETNX + EXPIRE

最简单的方案是使用 `SETNX`（SET if Not eXists）加过期时间：

```bash
# 原子加锁（Redis 2.6.12+ 支持 NX + EX 组合）
SET lock:order NX EX 30

# 加锁成功返回 OK，失败返回 nil

# 释放锁（Lua 脚本保证原子性）
EVAL "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end" 1 lock:order <unique-value>
```

::: warning 必须使用唯一值
锁的 value 必须是每个客户端唯一的值（如 UUID + 线程 ID）。释放锁时先比较 value 再删除，否则可能误删其他客户端的锁：

```
客户端 A 获取锁 → 业务执行超时 → 锁自动过期
客户端 B 获取锁 → A 执行完毕 → A 删除了 B 的锁！
```

用 Lua 脚本保证"比较 + 删除"的原子性。
:::

## 锁续期（Watch Dog）

业务执行时间不确定，如果锁提前过期会导致并发问题。**看门狗（Watch Dog）**机制定期续期：

```
获取锁（30s 过期）
    │
    ├── 业务执行中...
    │       ↑
    │       │ 每 10s 检查一次
    │       │ 如果还持有锁 → EXPIRE 续期 30s
    │       │
    ├── 业务执行中...
    │
    └── 业务完成 → DEL 释放锁 → 停止续期
```

```java
// Redisson 看门狗机制（自动续期）
RLock lock = redisson.getLock("order:lock");
try {
    // 不指定 leaseTime 时，Redisson 默认 30s 过期
    // 后台线程每 10s 续期到 30s
    lock.lock();
    // 执行业务逻辑...
} finally {
    lock.unlock();  // 释放锁并停止续期
}
```

## Redlock 算法

单节点 Redis 锁存在单点故障问题。Redis 作者 antirez 提出了 Redlock（Redis Distributed Lock）算法，在多个独立 Redis 实例上加锁。

### 算法流程

假设有 5 个独立的 Redis 实例：

1. 记录当前时间 `T1`。
2. 依次向 5 个实例加锁，每个实例加锁超时时间很短（如 5-50ms）。
3. 如果**超过半数**（>= 3 个）加锁成功，且总耗时 < 锁的有效时间，则加锁成功。
4. 锁的有效时间 = 总过期时间 - 加锁耗时（`T2 - T1`）。
5. 如果加锁失败（不足半数），向所有实例发送解锁请求。

```
Client → Redis 1: SET lock NX EX 30  ✓
Client → Redis 2: SET lock NX EX 30  ✓
Client → Redis 3: SET lock NX EX 30  ✓
Client → Redis 4: SET lock NX EX 30  ✗（网络超时）
Client → Redis 5: SET lock NX EX 30  ✗（网络超时）

3/5 成功 → 加锁成功
有效时间 = 30s - (T2 - T1)
```

### Redlock 争议

Redlock 在分布式系统社区引发了激烈争论，主要争议来自 Martin Kleppmann 的批评：

1. **时钟漂移问题**：Redlock 依赖各节点的系统时钟。如果某个节点时钟跳跃，可能导致锁过期提前。
2. **GC 停顿**：客户端获取锁后发生长时间 GC 停顿，锁已过期但客户端认为自己持有锁。
3. **没有 Fencing Token**：Redlock 不提供递增的 token，无法防止旧锁持有者操作被新锁持有者覆盖。

::: tip Martin Kleppmann 的建议
如果业务需要强一致的分布式锁，应该使用专门的协调服务（如 ZooKeeper、etcd），它们基于共识算法（Raft/ZAB），提供更强的一致性保证。Redis 锁适用于"尽力而为"的互斥场景（如防止重复提交），不适合金融级别的临界区保护。
:::

## Fencing Token

Fencing Token 是一个单调递增的数字，每次获取锁时递增。存储服务在接受写操作时验证 token，拒绝过期 token 的请求：

```
Client 1 获取锁（token=33）→ GC 停顿 → 锁过期
Client 2 获取锁（token=34）→ 写入数据（token=34）→ 提交
Client 1 恢复 → 写入数据（token=33）→ 存储拒绝（33 < 34）
```

```bash
# Redis 实现 Fencing Token
INCR lock:counter
(integer) 33

# 获取锁时附带 token
SET lock:order NX EX 30
GET lock:counter  # 33

# 存储服务验证 token（需要存储服务支持）
```

## Redisson 实现

Redisson 是 Java 中最成熟的 Redis 客户端，提供了完善的分布式锁实现：

```java
// 可重入锁
RLock lock = redisson.getLock("myLock");
lock.lock();
try {
    // 业务逻辑
    lock.lock();  // 可重入，计数 +1
    try {
        // 嵌套逻辑
    } finally {
        lock.unlock();  // 计数 -1
    }
} finally {
    lock.unlock();  // 计数归零，释放锁
}

// 读写锁
RReadWriteLock rwLock = redisson.getReadWriteLock("myRWLock");
rwLock.readLock().lock();    // 读锁（共享）
rwLock.writeLock().lock();   // 写锁（排他）

// 公平锁（按请求顺序获取）
RLock fairLock = redisson.getFairLock("myFairLock");

// 联锁（同时获取多个锁，类似 Java 的 StampedLock）
RedissonMultiLock multiLock = new RedissonMultiLock(lock1, lock2, lock3);
multiLock.lock();

// 红锁（Redlock 实现）
RedissonRedLock redLock = new RedissonRedLock(lock1, lock2, lock3, lock4, lock5);
redLock.lock();
```

## 生产实践

### 避免的坑

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 锁过期业务没执行完 | 锁时间设短了 | 看门狗自动续期 |
| 误删其他客户端的锁 | 没用唯一 value | Lua 脚本先比较再删除 |
| 单节点故障 | 主节点宕机锁丢失 | Redlock 多节点加锁 |
| 主从切换丢锁 | 异步复制延迟 | Redlock + 多数派 |
| 业务代码异常未释放锁 | finally 块没写好 | try-finally + 看门狗 |

### 适用场景

- **适合**：防重复提交、定时任务互斥、分布式限流、缓存预热互斥。
- **不适合**：金融转账等需要强一致性的场景（建议用数据库分布式锁或 ZooKeeper）。
