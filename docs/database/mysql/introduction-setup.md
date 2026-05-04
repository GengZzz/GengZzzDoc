# MySQL 简介与安装配置

MySQL 是全球最流行的开源关系型数据库管理系统之一，由瑞典 MySQL AB 公司开发，现隶属于 Oracle 公司。它采用 C/S 架构，支持多种存储引擎，以高性能、高可靠性和易用性著称，广泛应用于 Web 应用、电商平台、SaaS 服务等场景。本文将深入梳理 MySQL 的版本演进、核心新特性、安装方式及初始配置要点。

## 版本演进与核心特性

MySQL 的发展经历了多个重要版本迭代，每个大版本都引入了改变使用方式的关键特性：

| 版本 | 发布时间 | 核心特性 |
|------|----------|----------|
| 5.5 | 2010 | InnoDB 成为默认存储引擎；半同步复制（semi-sync replication）；表分区改进 |
| 5.6 | 2013 | 全文索引（Full-Text Index）支持 InnoDB；在线 DDL（Online DDL）；GTID 复制；Performance Schema 增强 |
| 5.7 | 2015 | 原生 JSON 数据类型与函数；sys schema；多源复制；Generated Columns；查询优化器改进（基于代价的优化） |
| 8.0 | 2018 | 窗口函数；CTE（公用表表达式）；不可见索引；原子 DDL；角色管理；默认字符集改为 utf8mb4；InnoDB 资源组 |

::: tip 版本选择建议
新项目应直接使用 MySQL 8.0。5.7 已于 2023 年 10 月到达 EOL（End of Life），不再接收安全更新。从 5.7 升级到 8.0 需要注意认证插件变更（`mysql_native_password` → `caching_sha2_password`）和字符集默认值的变化。
:::

## MySQL 8.0 新特性详解

### 窗口函数

窗口函数允许在不折叠行的情况下执行聚合计算，是 8.0 最重要的分析功能之一。

```sql
-- 为每个部门的员工按薪资排名
SELECT
    department,
    employee_name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rnk
FROM employees;
```

### CTE（公用表表达式）

CTE 使用 `WITH ... AS` 语法定义临时结果集，提升复杂查询的可读性和可维护性，尤其适合递归查询。

```sql
-- 非递归 CTE
WITH dept_avg AS (
    SELECT department, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department
)
SELECT e.employee_name, e.salary, d.avg_salary
FROM employees e
JOIN dept_avg d ON e.department = d.department
WHERE e.salary > d.avg_salary;

-- 递归 CTE：生成组织层级
WITH RECURSIVE org_tree AS (
    -- 锚点：顶级管理者
    SELECT id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- 递归：查找下属
    SELECT e.id, e.name, e.manager_id, t.level + 1
    FROM employees e
    JOIN org_tree t ON e.manager_id = t.id
)
SELECT * FROM org_tree ORDER BY level, name;
```

### 不可见索引（Invisible Index）

不可见索引允许将索引对优化器"隐藏"，用于在不删除索引的情况下测试其必要性。如果查询性能没有退化，再安全删除。

```sql
-- 将索引设为不可见
ALTER TABLE orders ALTER INDEX idx_order_date INVISIBLE;

-- 观察性能变化后，确认无影响则删除
ALTER TABLE orders DROP INDEX idx_order_date;

-- 恢复索引可见性
ALTER TABLE orders ALTER INDEX idx_order_date VISIBLE;
```

::: tip 不可见索引的工作原理
不可见索引仍然会被存储引擎维护（INSERT/UPDATE 时会更新），只是优化器在生成执行计划时不会使用它。设置 `use_invisible_indexes = ON` 可以临时让会话使用不可见索引。
:::

### 原子 DDL

MySQL 8.0 将 DDL 操作改为原子操作，要么完全执行成功，要么完全回滚。这解决了早期版本中 DDL 部分成功导致数据字典与存储引擎不一致的问题。

### 角色管理

角色（Role）是一组权限的集合，可以简化权限管理。

```sql
-- 创建角色
CREATE ROLE 'app_read', 'app_write', 'app_admin';

-- 为角色授权
GRANT SELECT ON mydb.* TO 'app_read';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_write';
GRANT ALL PRIVILEGES ON mydb.* TO 'app_admin';

-- 将角色分配给用户
GRANT 'app_read' TO 'reader_user'@'%';
GRANT 'app_write', 'app_read' TO 'writer_user'@'%';

-- 用户激活角色
SET DEFAULT ROLE ALL TO 'writer_user'@'%';
```

## 安装方式

### 包管理器安装（推荐生产环境）

**Ubuntu / Debian：**

```bash
# 添加 MySQL APT 仓库
wget https://dev.mysql.com/get/mysql-apt-config_0.8.29-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.29-1_all.deb
sudo apt update

# 安装 MySQL 8.0
sudo apt install mysql-server

# 安全配置向导
sudo mysql_secure_installation
```

**CentOS / RHEL：**

```bash
# 添加 MySQL YUM 仓库
sudo rpm -Uvh https://dev.mysql.com/get/mysql80-community-release-el8-1.noarch.rpm

# 安装
sudo yum install mysql-server

# 启动服务
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取初始临时密码
sudo grep 'temporary password' /var/log/mysqld.log
```

### Docker 安装（推荐开发环境）

```bash
# 拉取镜像
docker pull mysql:8.0

# 运行容器
docker run -d \
  --name mysql8 \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=your_strong_password \
  -e MYSQL_DATABASE=mydb \
  -e MYSQL_CHARSET=utf8mb4 \
  -v mysql_data:/var/lib/mysql \
  --restart unless-stopped \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci \
  --default-authentication-plugin=caching_sha2_password
```

### 源码编译安装

源码编译适合需要定制功能或使用非标准编译选项的场景，但耗时较长且依赖管理复杂。

```bash
# 安装依赖
sudo apt install cmake gcc g++ libssl-dev libncurses5-dev bison pkg-config

# 下载源码
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-boost-8.0.xx.tar.gz
tar -xzf mysql-boost-8.0.xx.tar.gz
cd mysql-8.0.xx

# 配置编译选项
cmake . \
  -DCMAKE_INSTALL_PREFIX=/usr/local/mysql \
  -DMYSQL_DATADIR=/usr/local/mysql/data \
  -DWITH_BOOST=boost \
  -DWITH_INNOBASE_STORAGE_ENGINE=1 \
  -DDEFAULT_CHARSET=utf8mb4 \
  -DDEFAULT_COLLATION=utf8mb4_unicode_ci \
  -DENABLED_LOCAL_INFILE=1

# 编译与安装
make -j$(nproc)
sudo make install
```

## 目录结构

MySQL 安装后的目录布局因安装方式而异，以下是关键路径：

| 路径 | 说明 | 包管理器默认位置 |
|------|------|------------------|
| 数据目录 | 存放数据库文件、表数据、日志 | `/var/lib/mysql` |
| 配置文件 | 主配置文件 | `/etc/mysql/my.cnf` 或 `/etc/my.cnf` |
| 错误日志 | 服务启动与运行错误 | `/var/log/mysql/error.log` |
| 二进制日志 | 数据变更记录（用于复制和恢复） | 数据目录下 `binlog.00000x` |
| Socket 文件 | 本地连接使用 | `/var/run/mysqld/mysqld.sock` |
| PID 文件 | 进程 ID 文件 | `/var/run/mysqld/mysqld.pid` |

::: warning 配置文件加载顺序
MySQL 按以下顺序加载配置文件，后加载的覆盖前面的：

1. `/etc/my.cnf`
2. `/etc/mysql/my.cnf`
3. `SYSCONFDIR/my.cnf`（编译时指定）
4. `~/.my.cnf`（用户级配置）

使用 `mysqld --verbose --help | grep -A 1 "Default options"` 查看实际加载顺序。
:::

### 核心配置示例

```ini
# /etc/mysql/my.cnf
[mysqld]
# 基础配置
port            = 3306
socket          = /var/run/mysqld/mysqld.sock
datadir         = /var/lib/mysql
pid-file        = /var/run/mysqld/mysqld.pid

# 字符集
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci

# InnoDB 配置
innodb_buffer_pool_size = 1G          # 通常设为物理内存的 50%-75%
innodb_log_file_size    = 256M
innodb_flush_log_at_trx_commit = 1    # 1=每次事务刷盘（最安全）

# 连接配置
max_connections         = 200
wait_timeout            = 28800
interactive_timeout     = 28800

# 日志配置
log-error       = /var/log/mysql/error.log
slow_query_log  = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1                   # 超过 1 秒的查询记录慢日志

[client]
default-character-set = utf8mb4
```

## 客户端连接

### mysql 命令行工具

```bash
# 基本连接
mysql -u root -p

# 完整参数连接
mysql -h 127.0.0.1 -P 3306 -u root -p mydb

# 指定字符集
mysql -u root -p --default-character-set=utf8mb4

# 执行 SQL 文件
mysql -u root -p mydb < backup.sql

# 执行单条 SQL
mysql -u root -p -e "SHOW DATABASES;"

# 垂直显示结果（适合宽表）
mysql -u root -p -e "SELECT * FROM users LIMIT 1\G"
```

### 常用命令行参数

| 参数 | 说明 |
|------|------|
| `-h, --host` | 服务器地址 |
| `-P, --port` | 端口号 |
| `-u, --user` | 用户名 |
| `-p, --password` | 密码（建议交互式输入，不在命令行明文写） |
| `-D, --database` | 连接后直接 USE 指定数据库 |
| `--default-character-set` | 设置客户端字符集 |
| `--batch, -B` | 批处理模式，结果以 Tab 分隔，不显示边框 |
| `--html, -H` | 输出 HTML 表格格式 |
| `--vertical, -E` | 垂直显示每行结果 |

## 字符集配置

MySQL 的字符集配置涉及多个层级：服务器级、数据库级、表级、列级、连接级。每一级可以独立指定，但理解优先级至关重要。

```sql
-- 查看字符集相关变量
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';

-- 各变量含义
-- character_set_server:     服务端默认字符集（建库/建表未指定时使用）
-- character_set_database:   当前数据库的字符集
-- character_set_client:     客户端发送 SQL 语句使用的字符集
-- character_set_connection: 服务端将客户端数据转换为此字符集处理
-- character_set_results:    服务端返回结果使用的字符集
```

推荐统一使用 `utf8mb4`（真正的 4 字节 UTF-8，支持 Emoji 和生僻字），而非 `utf8`（MySQL 中的 `utf8` 实际是 3 字节的 `utf8mb3`，无法表示完整的 Unicode 字符集）。

```sql
-- 修改数据库默认字符集
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修改表字符集
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 连接级设置（在 my.cnf 的 [client] 和 [mysql] 段）
-- default-character-set = utf8mb4
```

::: danger utf8 陷阱
MySQL 中的 `utf8` 字符集是 `utf8mb3` 的别名，最多只支持 3 字节编码，无法存储 Emoji 表情（如 "🎉"）和部分 CJK 扩展汉字。**所有新建项目必须使用 `utf8mb4`**。已有的 `utf8` 表迁移到 `utf8mb4` 需要注意索引长度限制——`utf8mb4` 下 `VARCHAR(255)` 的索引键可能超过 InnoDB 默认的 767 字节限制（`innodb_large_prefix` 在 5.7.7+ 和 8.0 中默认开启，不再有此问题）。
:::

## 常见安装问题

### 端口冲突

```bash
# 检查 3306 端口占用
sudo lsof -i :3306
# 或
sudo ss -tlnp | grep 3306

# 如果有旧的 MySQL 进程占用
sudo systemctl stop mysql_old
sudo systemctl disable mysql_old
```

### 权限问题

```bash
# MySQL 数据目录权限必须属于 mysql 用户
sudo chown -R mysql:mysql /var/lib/mysql
sudo chmod 750 /var/lib/mysql

# Socket 文件目录
sudo mkdir -p /var/run/mysqld
sudo chown mysql:mysql /var/run/mysqld
```

### 大小写敏感

MySQL 在 Linux 上默认表名大小写敏感（`lower_case_table_names = 0`），在 Windows 和 macOS 上默认不敏感（值为 `1` 或 `2`）。**该参数必须在初始化数据目录时设置，运行后无法更改**（MySQL 8.0 会拒绝启动并报错）。

```ini
# my.cnf —— 必须在初始化前设置
[mysqld]
lower_case_table_names = 1   # 0=区分大小写, 1=不区分, 2=存储区分但比较不区分
```

::: warning lower_case_table_names 限制
MySQL 8.0 中，如果数据目录已经用 `lower_case_table_names = 0` 初始化，再修改为 `1` 会导致数据库无法启动。必须重新初始化数据目录。迁移数据时务必先确认源库和目标库的此参数一致。
:::

### 认证插件问题

MySQL 8.0 默认使用 `caching_sha2_password`，部分旧版客户端驱动（如 PHP < 7.4 的 `mysqlnd`、旧版 Python `mysqlclient`）不支持此插件。

```sql
-- 查看用户当前的认证插件
SELECT user, host, plugin FROM mysql.user;

-- 将现有用户改为旧版认证插件（兼容旧客户端）
ALTER USER 'app_user'@'%' IDENTIFIED WITH mysql_native_password BY 'password';

-- 或修改默认认证插件（my.cnf）
-- [mysqld]
-- default_authentication_plugin=mysql_native_password
```
