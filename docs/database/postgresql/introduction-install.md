# PostgreSQL 简介与安装

PostgreSQL 起源于 UC Berkeley 的 POSTGRES 项目（1986 年），1996 年正式更名为 PostgreSQL。它严格遵循 SQL 标准，同时提供了大量扩展能力——自定义类型、运算符、索引方法、扩展插件，这些设计让 PostgreSQL 成为"可编程的数据库"。

## 版本演进与核心特性

PostgreSQL 每年发布一个大版本，每个大版本维护 5 年。关键版本里程碑：

| 版本 | 年份 | 核心特性 |
|------|------|----------|
| 9.x | 2010-2016 | 流复制、JSON 类型、并行查询 |
| 10 | 2017 | 逻辑复制、声明式分区、SCRAM 认证 |
| 12 | 2019 | JSON 表达式索引、可插入存储引擎接口 |
| 14 | 2021 | 多列统计信息、管道模式查询 |
| 16 | 2023 | JSON 运算符、逻辑复制增强、IO 性能 |
| 17 | 2024 | 增量备份、JSON 表函数、vacuum 改进 |

PostgreSQL 的核心设计哲学：

- **一切都是扩展**：数据类型、索引方法、函数都可以通过扩展机制添加
- **MVCC 是内置的**：不像 MySQL 需要选择存储引擎，PostgreSQL 的 MVCC 内核不可替换
- **WAL 是一切持久化的基础**：复制、PITR、逻辑解码都基于 WAL

## 单机安装

### Linux (Ubuntu/Debian)

```bash
# 添加 PostgreSQL 官方源
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# 安装 PostgreSQL 16
sudo apt update
sudo apt install postgresql-16

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
sudo -u postgres psql -c "SELECT version();"
```

### Linux (CentOS/RHEL)

```bash
# 安装官方源 RPM
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# 安装
sudo dnf install -y postgresql16-server postgresql16

# 初始化数据库
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb
sudo systemctl enable postgresql-16
sudo systemctl start postgresql-16
```

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16

# 确保 PATH 中有 psql
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
```

## Docker 安装

Docker 是开发环境最推荐的方式，数据目录通过 volume 持久化。

```bash
# 启动 PostgreSQL 容器
docker run -d \
  --name pg16 \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# 连接测试
docker exec -it pg16 psql -U postgres -d mydb
```

::: tip 开发环境配置建议
PostgreSQL 默认只监听 localhost。如果需要远程连接（如容器网络外访问），需修改 `postgresql.conf` 中的 `listen_addresses = '*'`，并在 `pg_hba.conf` 中添加允许的来源地址。
:::

## psql 基础

psql 是 PostgreSQL 自带的命令行客户端，功能远超简单的 SQL 执行。

### 连接方式

```bash
# 本地连接
psql -U postgres -d mydb

# 远程连接
psql -h db.example.com -p 5432 -U postgres -d mydb

# 连接串格式
psql "postgresql://postgres:mypassword@localhost:5432/mydb?sslmode=require"
```

### 常用元命令

psql 的元命令以 `\` 开头，不需要分号结尾：

```sql
-- 查看所有数据库
\l

-- 切换数据库
\c mydb

-- 查看所有表
\dt

-- 查看表结构（含类型、约束、索引）
\d+ users

-- 查看所有索引
\di

-- 查看函数定义
\sf function_name

-- 导出查询结果到文件
\o /tmp/result.txt
SELECT * FROM users LIMIT 10;
\o

-- 执行 SQL 文件
\i /path/to/script.sql

-- 显示执行计时
\timing on

-- 显示查询结果的列标签和行计数
\x auto   -- 类似 MySQL 的 \G，自动切换纵横显示
```

### psql 变量与格式化

```sql
-- 设置输出格式
\pset format wrapped    -- aligned / asciidoc / csv / html / wrapped / ...

-- 设置字段分隔符
\pset fieldsep '|'

-- 设置 NULL 的显示
\pset null 'NULL'

-- 查看当前连接信息
\conninfo
```

## pgAdmin

pgAdmin 是 PostgreSQL 最常用的图形管理工具，提供 Web 界面。

### Docker 部署 pgAdmin

```bash
docker run -d \
  --name pgadmin \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  -p 5050:80 \
  dpage/pgadmin4
```

浏览器访问 `http://localhost:5050`，登录后添加服务器连接即可。

### pgAdmin 核心功能

- **Query Tool**：SQL 编辑器，支持执行计划可视化（Graphical EXPLAIN）
- **Dashboard**：实时活动监控、锁等待、慢查询
- **Maintenance**：VACUUM、ANALYZE、REINDEX 操作入口
- **Backup/Restore**：pg_dump/pg_restore 的图形封装

## 数据目录与配置文件

了解 PostgreSQL 的文件结构有助于排查问题：

```
/var/lib/postgresql/16/main/    -- 数据目录（PGDATA）
├── base/                       -- 数据库文件
│   ├── 1/                      -- 模板数据库
│   ├── 13333/                  -- 各数据库的 OID 目录
│   └── ...
├── pg_wal/                     -- WAL 日志文件
├── pg_stat/                    -- 统计信息
├── pg_stat_tmp/                -- 临时统计
├── pg_xact/                    -- 事务提交状态
├── postgresql.conf             -- 主配置文件
├── pg_hba.conf                 -- 认证配置
├── pg_ident.conf               -- 身份映射
└── postmaster.pid              -- 进程 PID 文件
```

关键配置参数：

```ini
# postgresql.conf
listen_addresses = 'localhost'    # 监听地址
port = 5432                       # 监听端口
max_connections = 100             # 最大连接数
shared_buffers = 128MB            # 共享缓冲区（通常设为内存的 25%）
effective_cache_size = 4GB        # OS 缓存估算值（通常设为内存的 50-75%）
work_mem = 4MB                    # 排序/哈希操作的内存
maintenance_work_mem = 64MB       # VACUUM/CREATE INDEX 的内存
wal_level = replica               # WAL 级别：minimal / replica / logical
max_wal_size = 1GB                # 触发 checkpoint 的 WAL 大小阈值
log_min_duration_statement = 1000 # 记录超过 1 秒的慢查询
```

::: warning shared_buffers 不宜过大
shared_buffers 过大会减少 OS 页面缓存可用内存。大多数场景下，设置为总内存的 25% 是合理起点，不宜超过 40%。
:::

## 创建用户与数据库

```sql
-- 创建专用业务数据库
CREATE DATABASE app_db
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;

-- 创建业务用户
CREATE USER app_user WITH PASSWORD 'strong_password';

-- 授予权限
GRANT CONNECT ON DATABASE app_db TO app_user;
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;

-- 连接到目标数据库后，授予 schema 权限
\c app_db
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO app_user;
```

::: tip 与 MySQL 的区别
PostgreSQL 没有 `GRANT ALL ON *.*` 这样的全局权限语法。权限需要逐级授予：数据库 → Schema → 表/序列/函数。`ALTER DEFAULT PRIVILEGES` 可以让未来创建的对象自动继承权限设置。
:::
