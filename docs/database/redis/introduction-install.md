# Redis 简介与安装

Redis 是一个基于内存的 Key-Value 存储系统，由 Salvatore Sanfilippo 开发，2009 年首次发布。它支持丰富的数据结构，提供亚毫秒级的响应速度，同时支持持久化和主从复制。

## Redis 核心特性

- **基于内存**：所有数据存储在内存中，读写速度极快（单机 10 万+ QPS）。
- **丰富的数据结构**：不只是简单的 Key-Value，还支持 List、Hash、Set、ZSet、Stream 等。
- **单线程事件驱动**：使用 epoll/kqueue 实现 I/O 多路复用，避免多线程上下文切换开销。
- **持久化**：支持 RDB 快照和 AOF 日志两种持久化方式。
- **高可用**：支持主从复制、Sentinel 哨兵、Cluster 集群等方案。
- **原子操作**：所有操作都是原子性的，支持 Lua 脚本实现复杂原子逻辑。

::: tip Redis 6.0 多线程
Redis 6.0 引入了 I/O 多线程，但命令执行仍然是单线程的。多线程仅用于网络 I/O 的读写，可以提升高并发场景下的吞吐量。
:::

## 单机安装

### Linux 编译安装

```bash
# 下载源码
wget https://download.redis.io/releases/redis-7.2.4.tar.gz
tar -xzf redis-7.2.4.tar.gz
cd redis-7.2.4

# 编译安装
make
make install PREFIX=/usr/local/redis

# 启动
/usr/local/redis/bin/redis-server /path/to/redis.conf
```

### 常用配置项

```conf
# redis.conf 关键配置

# 绑定地址，生产环境绑定内网 IP
bind 127.0.0.1

# 端口
port 6379

# 后台运行
daemonize yes

# 日志文件路径
logfile /var/log/redis/redis.log

# 数据库数量
databases 16

# RDB 持久化配置
save 900 1
save 300 10
save 60 10000

# AOF 持久化
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# 最大内存限制
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Docker 安装

```bash
# 单机运行
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v /data/redis:/data \
  redis:7.2 redis-server --appendonly yes

# 进入 redis-cli
docker exec -it redis redis-cli
```

### Docker Compose 集群

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis-master:
    image: redis:7.2
    command: redis-server --appendonly yes --requirepass mypassword
    ports:
      - "6379:6379"

  redis-replica-1:
    image: redis:7.2
    command: redis-server --replicaof redis-master 6379 --masterauth mypassword
    depends_on:
      - redis-master

  redis-replica-2:
    image: redis:7.2
    command: redis-server --replicaof redis-master 6379 --masterauth mypassword
    depends_on:
      - redis-master
```

## redis-cli 基础操作

```bash
# 连接
redis-cli -h 127.0.0.1 -p 6379

# 带密码连接
redis-cli -a yourpassword

# 基本读写
127.0.0.1:6379> SET name "hello"
OK
127.0.0.1:6379> GET name
"hello"

# 查看 key 类型
127.0.0.1:6379> TYPE name
string

# 查看 key 过期时间
127.0.0.1:6379> TTL name
(integer) -1

# 设置过期时间
127.0.0.1:6379> EXPIRE name 60
(integer) 1

# 查看所有 key（生产环境慎用 KEYS *）
127.0.0.1:6379> SCAN 0
1) "0"
2) 1) "name"

# 查看服务器信息
127.0.0.1:6379> INFO server
# Server
redis_version:7.2.4
...
```

::: warning 生产环境不要用 KEYS
`KEYS *` 会遍历所有 key，在数据量大的时候会阻塞 Redis，导致服务不可用。应使用 `SCAN` 命令替代。
:::

## 客户端连接

大多数编程语言都有 Redis 客户端库：

```java
// Java (Jedis)
Jedis jedis = new Jedis("localhost", 6379);
jedis.set("key", "value");
String value = jedis.get("key");
```

```python
# Python (redis-py)
import redis
r = redis.Redis(host='localhost', port=6379, decode_responses=True)
r.set('key', 'value')
value = r.get('key')
```

```go
// Go (go-redis)
rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
rdb.Set(ctx, "key", "value", 0)
val := rdb.Get(ctx, "key").Val()
```
