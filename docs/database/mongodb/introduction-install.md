# MongoDB 简介与安装

MongoDB 是面向文档的分布式数据库，由 10gen（现 MongoDB Inc.）于 2009 年发布。它以 BSON（Binary JSON）格式存储数据，放弃传统关系模型的固定表结构，转而采用灵活的文档模型，天然支持半结构化数据和水平扩展。

## 版本演进

MongoDB 的版本采用奇数为开发版、偶数为稳定版的命名规则（4.x、5.x、6.x、7.x），从 3.2 版本起默认存储引擎切换为 WiredTiger，替代了早期的 MMAPv1。

| 版本 | 关键变化 |
|------|----------|
| 3.2 | 默认 WiredTiger，支持文档验证（Validation） |
| 3.6 | Change Streams、Retryable Writes、JSON Schema |
| 4.0 | 多文档事务（副本集）、Zstd 压缩 |
| 4.2 | 分布式事务（分片集群）、通配符索引 |
| 4.4 | 隐藏索引、Union with $unionWith |
| 5.0 | 时间序列集合、Versioned API |
| 6.0 | 查询分析器、聚合窗口函数、Clustered Collection |
| 7.0 | 可序列化快照、分片均衡优化 |

::: tip 选版本建议
生产环境建议使用最新的 LTS 版本（当前 7.x）。不要在生产环境使用旧版本，WiredTiger 的持续优化和安全补丁非常关键。
:::

## 单机安装

### Linux（Ubuntu/Debian）

```bash
# 导入 MongoDB GPG 公钥
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# 添加官方源
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 安装
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动服务
sudo systemctl start mongod
sudo systemctl enable mongod
```

### macOS（Homebrew）

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

### Windows

从 [MongoDB Download Center](https://www.mongodb.com/try/download/community) 下载 MSI 安装包，安装时选择 "Complete" 并勾选 "Install MongoDB as a Service"。

安装完成后将 `C:\Program Files\MongoDB\Server\7.0\bin` 添加到 PATH 环境变量。

## Docker 安装

```bash
# 拉取并运行
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret \
  -v mongodb_data:/data/db \
  mongo:7.0

# 连接
docker exec -it mongodb mongosh -u admin -p secret --authenticationDatabase admin
```

Docker Compose 配置示例：

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    container_name: mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret
    volumes:
      - mongodb_data:/data/db
    command: mongod --wiredTigerCacheSizeGB 1

volumes:
  mongodb_data:
```

## mongosh 基础操作

`mongosh` 是 MongoDB 的现代 Shell（替代旧版 `mongo`），基于 Node.js，支持语法高亮和自动补全。

### 连接

```bash
# 连接本地
mongosh

# 连接远程（带认证）
mongosh "mongodb://admin:secret@192.168.1.100:27017/mydb?authSource=admin"

# 连接字符串 URI 格式
# mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[defaultauthdb][?options]]
```

### 数据库操作

```javascript
// 查看所有数据库
show dbs

// 切换/创建数据库（插入数据时才真正创建）
use myapp

// 查看当前数据库
db

// 查看当前数据库的所有集合
show collections
```

### 集合与文档操作

```javascript
// 插入文档（集合不存在则自动创建）
db.users.insertOne({ name: "张三", age: 28, city: "北京" })

// 查询文档
db.users.find({ city: "北京" })

// 更新文档
db.users.updateOne({ name: "张三" }, { $set: { age: 29 } })

// 删除文档
db.users.deleteOne({ name: "张三" })
```

### 常用管理命令

```javascript
// 查看数据库统计
db.stats()

// 查看集合统计
db.users.stats()

// 查看当前操作
db.currentOp()

// 查看慢查询配置
db.getProfilingStatus()
```

## 配置文件

MongoDB 的配置文件默认位于 `/etc/mongod.conf`（Linux），使用 YAML 格式：

```yaml
# /etc/mongod.conf
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2          # WiredTiger Cache 大小，默认为可用内存的 50%
      journalCompressor: snappy

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1          # 生产环境不要绑 0.0.0.0

security:
  authorization: enabled      # 生产环境必须开启认证

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100     # 慢查询阈值 100ms
```

::: warning 生产环境检查清单
1. 开启认证（`security.authorization: enabled`）
2. 不要绑定到 `0.0.0.0`，使用内网 IP
3. 合理设置 `wiredTigerCacheSizeGB`（通常为可用内存的 50%-60%）
4. 配置日志轮转避免磁盘占满
5. 使用 XFS 文件系统（比 ext4 在 WiredTiger 下性能更好）
:::
