# MySQL 权限管理

## MySQL 权限体系

MySQL 的权限体系是一个多层级的访问控制系统，从粗到细分为四个层级：

```
全局权限 (Global)
  └── 数据库权限 (Database)
        └── 表权限 (Table)
              └── 列权限 (Column)
```

权限检查顺序：**列 → 表 → 数据库 → 全局**。如果在某一层找到了明确的授权或拒绝，就使用该层的设置；否则向上一层查找。

### 用户表 mysql.user

MySQL 将用户和权限信息存储在系统数据库 `mysql` 的几张表中：

| 表名 | 存储内容 |
|------|---------|
| `mysql.user` | 用户账号、全局权限、认证信息 |
| `mysql.db` | 数据库级别权限 |
| `mysql.tables_priv` | 表级别权限 |
| `mysql.columns_priv` | 列级别权限 |
| `mysql.procs_priv` | 存储过程和函数权限 |

```sql
-- 查看用户表结构
DESC mysql.user;

-- 查看所有用户
SELECT host, user, authentication_string, account_locked
FROM mysql.user;

-- 查看用户的全局权限
SELECT * FROM mysql.user WHERE user = 'app_user'\G
```

`mysql.user` 表中权限字段以 `Y`/`N` 表示，每一列对应一种全局权限：

```sql
-- 查看用户的全局权限明细
SELECT host, user,
  Select_priv, Insert_priv, Update_priv, Delete_priv,
  Create_priv, Drop_priv, Alter_priv, Index_priv,
  Super_priv, Process_priv, Grant_priv, Reload_priv
FROM mysql.user
WHERE user = 'app_user';
```

## 用户管理

### 创建用户

```sql
-- 基本语法
CREATE USER '用户名'@'主机' IDENTIFIED BY '密码';

-- 创建允许任意主机连接的用户
CREATE USER 'app_user'@'%' IDENTIFIED BY 'StrongPass123!';

-- 创建只允许本地连接的用户
CREATE USER 'local_user'@'localhost' IDENTIFIED BY 'LocalPass456!';

-- 创建只允许特定 IP 段连接的用户
CREATE USER 'dev_user'@'10.0.0.%' IDENTIFIED BY 'DevPass789!';

-- 创建只允许特定 IP 连接的用户
CREATE USER 'admin'@'10.0.0.100' IDENTIFIED BY 'AdminPass!';

-- MySQL 8.0+ 使用 caching_sha2_password（默认）
CREATE USER 'app_user'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'StrongPass123!';

-- MySQL 5.7 使用 mysql_native_password
CREATE USER 'legacy_user'@'%'
  IDENTIFIED WITH mysql_native_password BY 'LegacyPass!';
```

**host 限制说明：**

| host 值 | 含义 | 安全等级 |
|---------|------|---------|
| `'localhost'` | 只允许本地 socket 连接 | 最高 |
| `'127.0.0.1'` | 只允许本地 TCP 连接 | 最高 |
| `'10.0.0.%'` | 允许 10.0.0.x 网段 | 中等 |
| `'%'` | 允许任意主机 | 最低 |

::: danger 生产环境禁止使用 '%' 主机
`'user'@'%'` 意味着任何 IP 都可以尝试连接你的数据库，这是极大的安全隐患。生产环境必须限制到具体的 IP 或 IP 段。如果应用有多个实例，用具体的 IP 段（如 `'10.0.1.%'`）代替 `%`。
:::

### 修改用户

```sql
-- 修改密码
ALTER USER 'app_user'@'%' IDENTIFIED BY 'NewStrongPass!';

-- 锁定用户（禁止登录）
ALTER USER 'app_user'@'%' ACCOUNT LOCK;

-- 解锁用户
ALTER USER 'app_user'@'%' ACCOUNT UNLOCK;

-- 修改认证插件
ALTER USER 'app_user'@'%'
  IDENTIFIED WITH mysql_native_password BY 'password';

-- 修改密码过期策略
ALTER USER 'app_user'@'%' PASSWORD EXPIRE INTERVAL 90 DAY;

-- 立即过期密码（用户下次登录必须修改）
ALTER USER 'app_user'@'%' PASSWORD EXPIRE;

-- 重命名用户（MySQL 8.0+ 不直接支持，需要手动操作）
-- 方法1：创建新用户 → 授权 → 删除旧用户
-- 方法2：直接修改 mysql.user 表（不推荐）
RENAME USER 'old_user'@'%' TO 'new_user'@'%';
```

### 删除用户

```sql
-- 删除用户
DROP USER 'app_user'@'%';

-- 先查看用户拥有的权限和对象
-- 确认删除不会影响业务后再执行

-- 批量清理无用用户
SELECT CONCAT('DROP USER \'', user, '\'@\'', host, '\';') AS drop_sql
FROM mysql.user
WHERE user NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema', 'root')
  AND account_locked = 'Y'
  AND (SELECT COUNT(*) FROM mysql.db WHERE mysql.db.user = mysql.user.user) = 0;
```

## 权限管理

### GRANT 授权

```sql
-- 授予全局权限
GRANT SELECT, INSERT, UPDATE ON *.* TO 'app_user'@'%';

-- 授予数据库级别权限
GRANT ALL PRIVILEGES ON mydb.* TO 'db_admin'@'%';

-- 授予表级别权限
GRANT SELECT, INSERT, UPDATE ON mydb.orders TO 'analyst'@'%';

-- 授予列级别权限（精细控制）
GRANT SELECT (id, name, email), UPDATE (email)
  ON mydb.users TO 'limited_user'@'%';

-- 授予存储过程执行权限
GRANT EXECUTE ON PROCEDURE mydb.sp_generate_report TO 'report_user'@'%';

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION mydb.fn_calculate_score TO 'app_user'@'%';

-- 授权同时允许该用户将权限转授给其他用户
GRANT SELECT ON mydb.* TO 'team_lead'@'%' WITH GRANT OPTION;

-- 创建用户并授权一步完成（已废弃但仍可用）
GRANT SELECT, INSERT ON mydb.* TO 'new_user'@'%' IDENTIFIED BY 'password';
-- MySQL 8.0+ 推荐先 CREATE USER 再 GRANT
```

### REVOKE 撤销权限

```sql
-- 撤销特定权限
REVOKE INSERT, UPDATE ON mydb.* FROM 'app_user'@'%';

-- 撤销所有权限（用户仍然存在，只是没有权限）
REVOKE ALL PRIVILEGES ON mydb.* FROM 'app_user'@'%';

-- 撤销全局权限
REVOKE SUPER ON *.* FROM 'app_user'@'%';

-- 撤销 GRANT OPTION
REVOKE GRANT OPTION ON mydb.* FROM 'team_lead'@'%';
```

### FLUSH PRIVILEGES

```sql
-- 重新加载权限表到内存
FLUSH PRIVILEGES;
```

::: tip FLUSH PRIVILEGES 什么时候需要？
使用 `CREATE USER`、`GRANT`、`REVOKE`、`DROP USER` 等 SQL 命令时，MySQL 会自动更新内存中的权限缓存，**不需要**手动执行 `FLUSH PRIVILEGES`。只有当直接修改了 `mysql.user` 等系统表（不推荐这么做）后，才需要手动执行此命令。
:::

### 常用权限速查

| 权限 | 说明 | 典型场景 |
|------|------|---------|
| `SELECT` | 查询 | 只读用户、分析人员 |
| `INSERT` | 插入 | 应用写入 |
| `UPDATE` | 更新 | 应用写入 |
| `DELETE` | 删除 | 应用写入 |
| `CREATE` | 创建数据库/表 | 开发环境 |
| `DROP` | 删除数据库/表 | DBA |
| `ALTER` | 修改表结构 | DBA、应用迁移 |
| `INDEX` | 创建/删除索引 | DBA |
| `CREATE TEMPORARY TABLES` | 创建临时表 | 复杂查询 |
| `EXECUTE` | 执行存储过程/函数 | 应用调用 |
| `LOCK TABLES` | 锁定表 | 数据导出 |
| `REPLICATION SLAVE` | 从库复制权限 | 复制账号 |
| `REPLICATION CLIENT` | 查看复制状态 | 监控账号 |
| `PROCESS` | 查看所有连接 | 监控、DBA |
| `SUPER` | 超级权限（kill连接等） | DBA |
| `ALL PRIVILEGES` | 所有权限 | DBA |
| `FILE` | 读写文件 | LOAD DATA（安全风险） |
| `RELOAD` | 执行 FLUSH 操作 | 备份、监控 |
| `SHOW DATABASES` | 列出所有数据库 | 开发者 |

::: danger FILE 权限的安全风险
`FILE` 权限允许用户读写服务器上的文件（通过 `LOAD_FILE()`、`SELECT INTO OUTFILE` 等），可能泄露 `/etc/passwd`、MySQL 配置文件等敏感内容。除非确实需要，否则不要授予此权限。
:::

## 角色管理（MySQL 8.0+）

角色（Role）是一组权限的集合，可以将角色授予用户，简化权限管理。

```sql
-- 创建角色
CREATE ROLE 'readonly_role', 'developer_role', 'dba_role';

-- 为角色授权
-- 只读角色
GRANT SELECT ON *.* TO 'readonly_role';

-- 开发者角色
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'developer_role';
GRANT CREATE, ALTER, DROP ON mydb_dev.* TO 'developer_role';

-- DBA 角色
GRANT ALL PRIVILEGES ON *.* TO 'dba_role';

-- 将角色授予用户
GRANT 'readonly_role' TO 'analyst_user'@'%';
GRANT 'developer_role' TO 'dev_user'@'%';
GRANT 'dba_role' TO 'admin_user'@'%';

-- 查看用户拥有的角色
SHOW GRANTS FOR 'dev_user'@'%';

-- 激活角色（MySQL 默认不自动激活授予的角色）
-- 方式1：当前会话激活
SET DEFAULT ROLE ALL TO 'dev_user'@'%';

-- 方式2：设为默认角色（用户每次登录自动激活）
ALTER USER 'dev_user'@'%' DEFAULT ROLE 'developer_role';

-- 方式3：全局设置所有角色自动激活
SET GLOBAL activate_all_roles_on_login = ON;
```

### 角色管理实际场景

```sql
-- 场景：项目组有 10 个开发者，都需要相同的权限
-- 没有角色：需要给 10 个用户分别 GRANT 10 次
-- 有角色：只需要管理角色，用户关联角色即可

-- 1. 创建项目角色
CREATE ROLE 'project_alpha_read', 'project_alpha_write';

GRANT SELECT ON alpha_db.* TO 'project_alpha_read';
GRANT SELECT, INSERT, UPDATE, DELETE ON alpha_db.* TO 'project_alpha_write';

-- 2. 给新开发者分配角色
CREATE USER 'zhangsan'@'10.0.0.%' IDENTIFIED BY 'Pass123!';
GRANT 'project_alpha_write' TO 'zhangsan'@'10.0.0.%';

-- 3. 如果需要修改所有开发者的权限，只需修改角色
GRANT DELETE ON alpha_db.* TO 'project_alpha_write';  -- 所有拥有该角色的用户自动获得

-- 4. 人员调整时，只需 revoke 角色
REVOKE 'project_alpha_write' FROM 'zhangsan'@'10.0.0.%';
GRANT 'project_alpha_read' TO 'zhangsan'@'10.0.0.%';  -- 降级为只读
```

## 密码策略

### validate_password 组件（MySQL 8.0+）

```sql
-- 安装密码验证组件
INSTALL COMPONENT 'file://component_validate_password';

-- 查看当前密码策略
SHOW VARIABLES LIKE 'validate_password%';

-- 设置密码策略
SET GLOBAL validate_password.length = 12;           -- 最短长度 12 位
SET GLOBAL validate_password.mixed_case_count = 1;  -- 至少 1 个大写 + 1 个小写
SET GLOBAL validate_password.number_count = 1;      -- 至少 1 个数字
SET GLOBAL validate_password.special_char_count = 1; -- 至少 1 个特殊字符
SET GLOBAL validate_password.policy = 'MEDIUM';     -- LOW/MEDIUM/STRONG

-- policy 级别说明：
-- LOW:  只检查长度
-- MEDIUM: 长度 + 大小写 + 数字 + 特殊字符
-- STRONG: MEDIUM + 字典文件检查
```

### 密码过期策略

```sql
-- 设置全局默认密码过期时间
SET GLOBAL default_password_lifetime = 90;  -- 90 天过期

-- 单独设置用户的密码过期策略
ALTER USER 'app_user'@'%' PASSWORD EXPIRE INTERVAL 60 DAY;

-- 永不过期
ALTER USER 'admin'@'%' PASSWORD EXPIRE NEVER;

-- 查看密码过期状态
SELECT user, host, password_expired, password_lifetime
FROM mysql.user;
```

::: warning 密码过期的影响
密码过期后用户仍然可以连接数据库，但只能执行 `SET PASSWORD` 或 `ALTER USER` 修改密码。如果应用使用过期密码连接，连接会被拒绝，导致业务中断。建议对服务账号设置 `PASSWORD EXPIRE NEVER`，只对人用账号实施密码过期策略。
:::

## 最小权限原则

最小权限原则是数据库安全的核心：**只授予用户完成工作所需的最小权限集，不要多给一分**。

### 不同角色的推荐权限

```sql
-- ============================================
-- 应用服务账号：只授予业务所需的表级别权限
-- ============================================
CREATE USER 'order_service'@'10.0.1.%' IDENTIFIED BY '...';
GRANT SELECT, INSERT, UPDATE ON shop.orders TO 'order_service'@'10.0.1.%';
GRANT SELECT, INSERT, UPDATE ON shop.order_items TO 'order_service'@'10.0.1.%';
GRANT SELECT ON shop.products TO 'order_service'@'10.0.1.%';
-- 不授予 DELETE、ALTER、DROP 等危险权限

-- ============================================
-- 只读分析账号
-- ============================================
CREATE USER 'analyst'@'10.0.2.%' IDENTIFIED BY '...';
GRANT SELECT ON shop.* TO 'analyst'@'10.0.2.%';
-- 只能查询，不能修改任何数据

-- ============================================
-- 备份账号：最小必要权限
-- ============================================
CREATE USER 'backup'@'localhost' IDENTIFIED BY '...';
GRANT SELECT, RELOAD, LOCK TABLES, REPLICATION CLIENT, SHOW VIEW,
      EVENT, TRIGGER, PROCESS ON *.* TO 'backup'@'localhost';
-- 备份需要 SELECT，RELOAD 用于 FLUSH TABLES，LOCK TABLES 用于锁定

-- ============================================
-- 复制账号：只能做复制
-- ============================================
CREATE USER 'repl'@'10.0.0.%' IDENTIFIED BY '...';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'10.0.0.%';

-- ============================================
-- 监控账号
-- ============================================
CREATE USER 'monitor'@'10.0.0.%' IDENTIFIED BY '...';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'monitor'@'10.0.0.%';
-- PROCESS 允许查看所有连接，REPLICATION CLIENT 允许查看复制状态

-- ============================================
-- DBA 账号（仍遵循最小权限，不用 root 远程登录）
-- ============================================
CREATE USER 'dba'@'10.0.0.100' IDENTIFIED BY '...';
GRANT ALL PRIVILEGES ON *.* TO 'dba'@'10.0.0.100' WITH GRANT OPTION;
-- 限制只能从堡垒机 IP 登录
```

::: danger 永远不要用 root 远程连接应用
`root` 用户拥有所有权限且默认不限制 host，如果密码泄露或存在漏洞，整个数据库将被完全控制。生产环境应禁用 root 远程登录，创建独立的服务账号，并严格限制 host。
:::

## 审计

### general_log

general_log 记录了数据库收到的每一条 SQL，是最简单的审计手段。

```sql
-- 开启 general_log（生产环境慎用，性能影响大）
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';  -- 输出到表（也可以输出到文件）

-- 查询日志
SELECT event_time, user_host, thread_id, argument
FROM mysql.general_log
WHERE user_host LIKE 'app_user%'
ORDER BY event_time DESC
LIMIT 100;

-- 关闭 general_log
SET GLOBAL general_log = 'OFF';

-- 清空日志表
TRUNCATE TABLE mysql.general_log;
```

::: warning general_log 对性能的影响
general_log 会记录所有 SQL，包括连接、断开、心跳等，在高并发场景下会严重影响性能并产生大量日志。生产环境只建议临时开启用于问题排查，排查完毕后立即关闭。长期审计应使用专门的审计插件。
:::

### 审计插件

对于需要合规审计（等保、PCI-DSS 等）的场景，推荐使用专业的审计插件。

**MySQL Enterprise Audit（官方商业插件）：**

```sql
-- 安装审计插件
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

-- 配置审计规则（记录哪些事件）
SELECT audit_log_filter_set_filter('log_all', '{
  "filter": {
    "class": { "name": "connection" }
  }
}');

-- 只记录特定用户的操作
SELECT audit_log_filter_set_filter('log_admin', '{
  "filter": {
    "class": [
      { "name": "connection" },
      { "name": "general", "event": { "name": "status" } }
    ]
  }
}');

-- 将规则关联到用户
SELECT audit_log_filter_set_user('%', 'log_all');
```

**Percona Audit Log Plugin（开源替代）：**

```ini
# my.cnf
[mysqld]
plugin-load-add = audit_log=audit_log.so
audit_log_format = JSON
audit_log_strategy = ASYNCHRONOUS     # 异步写入，减少对性能的影响
audit_log_include_commands = 'CONNECT,QUERY,DROP,ALTER,GRANT,REVOKE'
```

### 审计日志分析

```sql
-- 定期分析权限变更
SELECT event_time, user_host, argument
FROM mysql.general_log
WHERE argument LIKE '%GRANT%'
   OR argument LIKE '%REVOKE%'
   OR argument LIKE '%CREATE USER%'
   OR argument LIKE '%ALTER USER%'
   OR argument LIKE '%DROP USER%'
ORDER BY event_time DESC;
```

### 权限巡检脚本

```sql
-- 权限审计查询：找出拥有过高权限的用户
SELECT
  host, user,
  CASE
    WHEN Super_priv = 'Y' THEN 'Super'
    WHEN Grant_priv = 'Y' THEN 'Grant'
    WHEN File_priv = 'Y' THEN 'File'
    ELSE 'Normal'
  END AS risk_level,
  Select_priv, Insert_priv, Update_priv, Delete_priv,
  Create_priv, Drop_priv, Alter_priv, Index_priv,
  Super_priv, File_priv, Grant_priv, Process_priv,
  account_locked, password_expired
FROM mysql.user
WHERE user NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema', 'root')
ORDER BY
  FIELD(risk_level, 'Super', 'Grant', 'File', 'Normal'),
  user;
```
