# 缓存模式

缓存是 Redis 最常见的用途之一，但缓存的引入也带来了数据一致性、缓存失效、缓存击穿等问题。本节详解生产环境中常见的缓存问题及解决方案。

## 缓存穿透

**问题**：查询一个不存在的数据，缓存中没有，请求直接打到数据库。如果有人恶意构造大量不存在的 key，数据库会被压垮。

### 解决方案 1：缓存空值

```java
public String getUser(Long id) {
    String cacheKey = "user:" + id;
    String value = redis.get(cacheKey);
    
    if (value != null) {
        return "NULL".equals(value) ? null : value;
    }
    
    User user = userDao.findById(id);
    if (user == null) {
        // 缓存空值，过期时间短（如 5 分钟）
        redis.setex(cacheKey, 300, "NULL");
        return null;
    }
    
    redis.setex(cacheKey, 3600, JSON.toJSONString(user));
    return user;
}
```

### 解决方案 2：布隆过滤器

布隆过滤器（Bloom Filter）是一个概率性数据结构，用于快速判断元素是否**可能存在**或**一定不存在**。

```
布隆过滤器结构：

位数组：[0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0]

写入 key 时：用 k 个哈希函数计算 k 个位置，设为 1
查询 key 时：检查 k 个位置是否全为 1
  - 全为 1 → 可能存在（有误判率）
  - 有 0 → 一定不存在
```

Redis 4.0+ 提供了布隆过滤器模块（Redis Stack 默认包含）：

```bash
# 创建布隆过滤器（误判率 1%，预计 100 万条数据）
BF.RESERVE users:bloom 0.01 1000000

# 添加元素
BF.ADD users:bloom "user:1001"
BF.ADD users:bloom "user:1002"

# 查询
BF.EXISTS users:bloom "user:1001"  # 1（可能存在）
BF.EXISTS users:bloom "user:9999"  # 0（一定不存在）
```

::: tip 布隆过滤器的误判率
布隆过滤器的误判率取决于位数组大小、哈希函数数量和元素数量。典型配置：
- 100 万数据、1% 误判率：约 1.14MB 位数组、7 个哈希函数
- 100 万数据、0.1% 误判率：约 1.71MB 位数组、10 个哈希函数

布隆过滤器**不支持删除**（删除可能影响其他元素的判断）。如需删除，可使用 Counting Bloom Filter。
:::

## 缓存击穿

**问题**：某个热点 key 过期的瞬间，大量并发请求同时发现缓存失效，全部打到数据库。

### 解决方案 1：互斥锁

第一个请求发现缓存失效时，获取分布式锁，只有一个请求去查数据库并重建缓存，其他请求等待：

```java
public String getHotProduct(Long id) {
    String cacheKey = "product:" + id;
    String value = redis.get(cacheKey);
    
    if (value != null) {
        return value;
    }
    
    // 尝试获取分布式锁
    String lockKey = "lock:product:" + id;
    boolean locked = redis.set(lockKey, "1", "NX", "EX", 10);
    
    if (locked) {
        // 获取锁成功，查数据库并重建缓存
        try {
            Product product = productDao.findById(id);
            if (product != null) {
                redis.setex(cacheKey, 3600, JSON.toJSONString(product));
                return product;
            }
            redis.setex(cacheKey, 300, "NULL"); // 缓存空值
            return null;
        } finally {
            redis.del(lockKey);
        }
    } else {
        // 获取锁失败，短暂等待后重试
        Thread.sleep(50);
        return getHotProduct(id);  // 递归重试
    }
}
```

### 解决方案 2：逻辑过期

不设置物理过期时间，而是在 value 中存储逻辑过期时间。读取时检查是否逻辑过期，过期则异步更新：

```java
public String getProductWithLogicExpire(Long id) {
    String cacheKey = "product:" + id;
    String cached = redis.get(cacheKey);
    
    if (cached == null) return null;
    
    CacheData<Product> cacheData = JSON.parseObject(cached, new TypeReference<>() {});
    
    if (cacheData.getExpireTime().isAfter(LocalDateTime.now())) {
        // 未过期，直接返回
        return cacheData.getData();
    }
    
    // 已逻辑过期，尝试获取锁异步更新
    String lockKey = "lock:product:" + id;
    if (redis.set(lockKey, "1", "NX", "EX", 10)) {
        // 异步线程重建缓存
        CompletableFuture.runAsync(() -> {
            try {
                Product product = productDao.findById(id);
                CacheData<Product> newData = new CacheData<>(product, 
                    LocalDateTime.now().plusHours(1));
                redis.setex(cacheKey, 0, JSON.toJSONString(newData));
            } finally {
                redis.del(lockKey);
            }
        });
    }
    
    // 先返回旧数据（业务可接受的话）
    return cacheData.getData();
}
```

## 缓存雪崩

**问题**：大量 key 同时过期，或 Redis 实例宕机，导致大量请求直接打到数据库。

### 解决方案

```java
// 1. 过期时间加随机值，避免同时过期
int baseTTL = 3600;
int randomTTL = baseTTL + ThreadLocalRandom.current().nextInt(300);  // 3600-3900 秒
redis.setex(cacheKey, randomTTL, value);

// 2. Redis 高可用：Sentinel 或 Cluster
// 3. 多级缓存：本地缓存 + Redis + 数据库
// 4. 服务降级：Redis 不可用时直接返回默认值
```

::: warning 多级缓存的注意点
本地缓存（Caffeine/Guava）作为第一层，Redis 作为第二层。更新数据时需要同时清除本地缓存，否则会出现数据不一致。可以使用 Canal 监听 binlog 来清除本地缓存。
:::

## 缓存一致性

缓存和数据库之间的数据一致性是最棘手的问题。

### 方案 1：先更新数据库，再删除缓存（Cache-Aside）

这是最常用的方案：

```java
// 读操作：先读缓存，缓存没有读数据库，然后写入缓存
public User getUser(Long id) {
    User user = redis.get("user:" + id);
    if (user != null) return user;
    
    user = userDao.findById(id);
    redis.setex("user:" + id, 3600, user);
    return user;
}

// 写操作：先更新数据库，再删除缓存
public void updateUser(User user) {
    userDao.update(user);        // 1. 更新数据库
    redis.del("user:" + user.getId());  // 2. 删除缓存
}
```

**为什么是"删除缓存"而不是"更新缓存"？**
- 更新缓存的写入可能被其他并发请求覆盖。
- 更新缓存意味着每次都写 Redis，即使这个 key 很久没人读。
- 删除缓存更简单，下次读取时自动加载最新数据。

### 方案 2：延迟双删

先删缓存 → 更新数据库 → 延迟几百毫秒再删一次缓存（处理并发读的窗口）：

```java
public void updateUser(User user) {
    redis.del("user:" + user.getId());     // 1. 删缓存
    userDao.update(user);                  // 2. 更新数据库
    
    // 3. 延迟双删（处理并发读请求在步骤 1 和 2 之间回填旧数据）
    CompletableFuture.delayedExecutor(500, TimeUnit.MILLISECONDS)
        .execute(() -> redis.del("user:" + user.getId()));
}
```

### 方案 3：Canal 监听 binlog

使用阿里开源的 Canal 模拟 MySQL 从节点，监听 binlog 变更事件，异步删除缓存：

```
应用 → 更新 MySQL → binlog → Canal → 消息队列 → 消费者删除缓存
```

这种方式解耦了业务代码和缓存逻辑，但增加了架构复杂度。适合对一致性要求较高且不想在业务代码中处理缓存的场景。

## 缓存预热

系统上线前，将热点数据提前加载到缓存中，避免启动后大量请求打到数据库：

```java
// 系统启动时预热热点数据
@PostConstruct
public void warmUp() {
    List<Product> hotProducts = productDao.findHotProducts(1000);
    for (Product product : hotProducts) {
        redis.setex("product:" + product.getId(), 
            3600, JSON.toJSONString(product));
    }
}
```
