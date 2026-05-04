# MySQL 备份与恢复

## 备份分类

### 逻辑备份 vs 物理备份

| 对比维度 | 逻辑备份 | 物理备份 |
|---------|---------|---------|
| 原理 | 导出 SQL 语句或 CSV | 拷贝数据文件 |
| 工具 | mysqldump, mysqlpump, SELECT INTO OUTFILE | XtraBackup, 文件系统快照 |
| 备份粒度 | 可精确到表级别 | 通常是实例级别 |
| 恢复速度 | 慢（需要执行 SQL） | 快（直接替换文件） |
| 跨平台性 | 好（SQL 是文本） | 差（与存储引擎和 OS 绑定） |
| 适用场景 | 小数据量、跨版本迁移、数据导出 | 大数据量、生产环境、快速恢复 |

### 全量备份 vs 增量备份

- **全量备份**：备份所有数据，每次都是完整拷贝。备份文件大，但恢复简单。
- **增量备份**：只备份自上次备份以来发生变化的数据。备份文件小，但恢复需要先还原全量再逐个应用增量。

### 热备份 vs 温备份 vs 冷备份

- **热备份（Hot Backup）**：备份期间数据库完全正常读写，不影响业务。XtraBackup 属于此类。
- **温备份（Warm Backup）**：备份期间数据库可读但不可写，或性能受到明显影响。
- **冷备份（Cold Backup）**：备份期间需要停止数据库服务。最简单但对业务影响最大。

::: warning 生产环境备份要求
生产环境应优先选择热备份方案，确保备份过程对线上业务零影响。定期在非高峰时段执行全量备份，增量备份和 binlog 实时归档保证 RPO（恢复点目标）尽可能小。
:::

## mysqldump（逻辑备份）

mysqldump 是 MySQL 最常用的逻辑备份工具，生成的文件是标准 SQL 语句，可以跨版本、跨平台恢复。

### 基本用法

```bash
# 备份单个数据库
mysqldump -u root -p --databases mydb > mydb_backup.sql

# 备份多个数据库
mysqldump -u root -p --databases db1 db2 db3 > multi_db_backup.sql

# 备份所有数据库
mysqldump -u root -p --all-databases > all_backup.sql

# 备份指定表
mysqldump -u root -p mydb table1 table2 > tables_backup.sql

# 只备份表结构，不备份数据
mysqldump -u root -p --no-data mydb > schema_only.sql

# 只备份数据，不备份表结构
mysqldump -u root -p --no-create-info mydb > data_only.sql
```

### 关键参数详解

```bash
mysqldump -u root -p \
  --single-transaction \      # InnoDB 一致性读（不锁表）
  --master-data=2 \           # 记录 binlog 位点，用于增量恢复
  --routines \                # 备份存储过程和函数
  --triggers \                # 备份触发器
  --events \                  # 备份事件调度器
  --set-gtid-purged=ON \      # 记录 GTID 信息（GTID 模式下）
  --hex-blob \                # BLOB 字段用十六进制导出
  --quick \                   # 逐行读取，减少内存占用（大表必须）
  --compress \                # 客户端与服务端之间压缩传输
  --result-file=backup.sql \  # 指定输出文件
  mydb > backup.sql
```

**参数解释：**

- `--single-transaction`：开启事务获取一致性快照，备份期间 InnoDB 表不加锁，业务可正常读写。**这是 InnoDB 备份最重要的参数。**
- `--master-data=2`：在备份文件中以注释形式记录备份时的 binlog 文件名和位置点。值为 `1` 则不注释，值为 `2` 则注释。恢复时可以利用这个位点做基于 binlog 的增量恢复。
- `--quick`：逐行从服务器读取数据，而不是一次性加载整个结果集到内存。对大表备份至关重要，避免 OOM。
- `--routines / --triggers / --events`：默认不备份这些对象，必须显式指定。

::: danger MyISAM 表不能使用 --single-transaction
`--single-transaction` 只对 InnoDB 有效。如果数据库中包含 MyISAM 表，需要改用 `--lock-tables`（锁定正在备份的表）或 `--lock-all-tables`（锁定所有表）。混合引擎的库建议同时使用 `--single-transaction --lock-tables`。
:::

### 恢复

```bash
# 从 mysqldump 文件恢复
mysql -u root -p < backup.sql

# 恢复指定数据库（如果备份时用了 --databases）
mysql -u root -p < mydb_backup.sql

# 恢复到指定数据库（如果备份时没有 --databases）
mysql -u root -p target_db < mydb_backup.sql

# 恢复时先创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mydb;"
mysql -u root -p mydb < mydb_backup.sql
```

大文件恢复优化：

```bash
# 关闭 binlog（恢复期间不需要记录 binlog，减少 IO）
mysql -u root -p -e "SET sql_log_bin=0; SOURCE /path/to/backup.sql;"

# 或者在 my.cnf 中临时禁用 binlog
# [mysqld]
# skip-log-bin

# 关闭外键检查（加速恢复）
mysql -u root -p -e "SET FOREIGN_KEY_CHECKS=0;"
mysql -u root -p < backup.sql
mysql -u root -p -e "SET FOREIGN_KEY_CHECKS=1;"
```

### 生产环境备份脚本示例

```bash
#!/bin/bash
# daily_backup.sh - 生产环境每日备份脚本

BACKUP_DIR="/data/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
MYSQL_USER="backup_user"
MYSQL_PASS="backup_password"
DATABASES="mydb"

# 创建备份目录
mkdir -p ${BACKUP_DIR}/${DATE}

# 全量备份
mysqldump -u ${MYSQL_USER} -p${MYSQL_PASS} \
  --single-transaction \
  --master-data=2 \
  --routines \
  --triggers \
  --events \
  --quick \
  --set-gtid-purged=ON \
  --databases ${DATABASES} \
  | gzip > ${BACKUP_DIR}/${DATE}/${DATABASES}_full.sql.gz

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "[${DATE}] 备份成功: ${BACKUP_DIR}/${DATE}/${DATABASES}_full.sql.gz"
else
    echo "[${DATE}] 备份失败!" | mail -s "MySQL Backup Failed" dba@example.com
    exit 1
fi

# 清理 30 天前的备份
find ${BACKUP_DIR} -type d -mtime +30 -exec rm -rf {} \;

echo "[${DATE}] 备份完成，文件大小: $(du -sh ${BACKUP_DIR}/${DATE}/${DATABASES}_full.sql.gz | cut -f1)"
```

## mysqlpump（MySQL 5.7+）

mysqlpump 是 MySQL 5.7 引入的新工具，支持**并行导出**，在多核服务器上备份速度显著快于 mysqldump。

```bash
# 并行备份（4 个线程）
mysqlpump -u root -p --default-parallelism=4 --databases mydb > backup.sql

# 指定每个数据库使用不同线程数
mysqlpump -u root -p \
  --default-parallelism=4 \
  --databases mydb \
  --compress-output=NONE \    # 不压缩（压缩会降低并行效率）
  > backup.sql

# 只备份指定表，排除日志表
mysqlpump -u root -p \
  --default-parallelism=4 \
  --databases mydb \
  --exclude-tables=mydb.access_log,mydb.audit_log \
  > backup.sql
```

::: tip mysqlpump vs mysqldump
mysqlpump 的并行备份在大库场景下速度优势明显，但有已知限制：不支持 `--single-transaction` 与并行的组合使用（并行备份时无法保证全局一致性快照）。因此在需要事务一致性的场景下，仍然推荐使用 mysqldump。MySQL 8.0 中 mysqlpump 已被标记为不推荐使用，官方推荐使用 MySQL Shell 的 `util.dumpInstance()`。
:::

## 物理备份：XtraBackup（Percona）

Percona XtraBackup 是目前最主流的 MySQL 热备份工具，支持 InnoDB 和 XtraDB 存储引擎的在线备份。

### 原理

XtraBackup 的核心原理：

1. 备份开始时，记录当前 LSN（Log Sequence Number）
2. 拷贝 InnoDB 数据文件（.ibd 文件）
3. 同时持续监控并拷贝 redo log（记录备份期间的数据变更）
4. 备份结束时，使用 redo log 将数据文件恢复到一致状态（prepare 阶段）

```
备份开始 LSN=1000 ──────────────────── 备份结束 LSN=1500
     │                                        │
     ├─ 拷贝数据文件（从磁盘）                    │
     ├─ 同时监控 redo log                       │
     └─ 拷贝 redo log (LSN 1000~1500) ─────────┘
                                           │
                                    prepare 阶段：
                                    应用 redo log
                                    将数据恢复到 LSN=1500 的一致状态
```

### 全量备份

```bash
# 执行全量备份
xtrabackup --backup \
  --user=root \
  --password=master_pass \
  --target-dir=/data/backup/full_20240101 \
  --parallel=4               # 并行拷贝线程数

# 备份完成后的目录结构
# /data/backup/full_20240101/
# ├── xtrabackup_binlog_info    # binlog 位点
# ├── xtrabackup_checkpoints    # 备份检查点信息
# ├── xtrabackup_info           # 备份元数据
# ├── xtrabackup_logfile        # 备份期间的 redo log
# ├── ibdata1                   # 系统表空间
# ├── mydb/                     # 数据库目录
# │   ├── table1.ibd
# │   └── table2.ibd
# └── ...
```

### 增量备份

```bash
# 第一次全量备份
xtrabackup --backup \
  --user=root --password=pass \
  --target-dir=/data/backup/full

# 基于全量做增量备份（每次增量只备份变化的页）
xtrabackup --backup \
  --user=root --password=pass \
  --target-dir=/data/backup/inc1 \
  --incremental-basedir=/data/backup/full

# 基于上一次增量继续做增量
xtrabackup --backup \
  --user=root --password=pass \
  --target-dir=/data/backup/inc2 \
  --incremental-basedir=/data/backup/inc1
```

### 恢复流程

```bash
# 1. prepare 全量备份（应用 redo log，但不回滚未提交事务）
xtrabackup --prepare --apply-log-only --target-dir=/data/backup/full

# 2. 应用第一次增量到全量
xtrabackup --prepare --apply-log-only \
  --target-dir=/data/backup/full \
  --incremental-dir=/data/backup/inc1

# 3. 应用第二次增量到全量
xtrabackup --prepare --apply-log-only \
  --target-dir=/data/backup/full \
  --incremental-dir=/data/backup/inc2

# 4. 最终 prepare（回滚未提交事务，使数据达到完全一致）
xtrabackup --prepare --target-dir=/data/backup/full

# 5. 停止 MySQL 服务
systemctl stop mysqld

# 6. 清空数据目录并拷贝回去
rm -rf /var/lib/mysql/*
xtrabackup --copy-back --target-dir=/data/backup/full

# 7. 修正文件权限
chown -R mysql:mysql /var/lib/mysql

# 8. 启动 MySQL 服务
systemctl start mysqld
```

::: danger 恢复前必须确认
1. 恢复操作需要停止 MySQL 服务，必须提前通知业务方。
2. `--copy-back` 前确保数据目录已清空，否则会报错。
3. 恢复后第一件事是检查数据完整性，确认 binlog 位点信息，以便后续做 binlog 增量恢复。
4. 如果使用了 GTID，恢复后需要重置 GTID 信息：`RESET MASTER; SET GLOBAL gtid_purged='...'`。
:::

## 基于 Binlog 的增量恢复

binlog 是 MySQL 的二进制日志，记录了所有数据变更操作。利用 binlog 可以实现**精确到秒级**的增量恢复。

### 场景说明

```
时间线：
├─ 02:00 全量备份完成（备份记录的 binlog 位点: mysql-bin.000005:1234）
├─ 10:30 线上数据被误删
├─ 10:31 发现问题，立即停止相关写入
└─ 目标：恢复到 10:29:59 的状态
```

### 操作步骤

```bash
# 1. 恢复 02:00 的全量备份
mysql -u root -p < full_backup.sql

# 2. 找到包含 02:00~10:29:59 数据的 binlog 文件
# 从全量备份的 master-data 中获取起始位点
# 或查看 xtrabackup_binlog_info

# 3. 使用 mysqlbinlog 解析 binlog，按时间范围恢复
mysqlbinlog \
  --start-position=1234 \                         # 全量备份时的位点
  --stop-datetime="2024-01-01 10:29:59" \         # 误操作前一刻
  --database=mydb \                               # 只提取指定数据库
  /var/lib/mysql/mysql-bin.000005 \
  /var/lib/mysql/mysql-bin.000006 \
  /var/lib/mysql/mysql-bin.000007 \
  | mysql -u root -p

# 或者先导出为 SQL 文件，检查后再执行
mysqlbinlog \
  --start-position=1234 \
  --stop-datetime="2024-01-01 10:29:59" \
  /var/lib/mysql/mysql-bin.000005 \
  > increment.sql

# 检查 increment.sql 内容
less increment.sql

# 确认无误后执行恢复
mysql -u root -p < increment.sql
```

### 按位置点恢复（更精确）

```bash
# 如果知道误操作的确切位置点
mysqlbinlog \
  --start-position=1234 \
  --stop-position=9876 \          # 误操作前的最后一个位置点
  /var/lib/mysql/mysql-bin.000005 \
  | mysql -u root -p
```

::: tip 时间点 vs 位置点
时间点恢复（`--stop-datetime`）精度取决于事务执行时间，可能恢复到意外的状态。位置点恢复（`--stop-position`）精确到事件级别，但需要先在 binlog 中定位到准确位置。生产环境建议两者结合使用：先用时间点定位大致范围，再用位置点精确恢复。
:::

## 备份策略

### 推荐策略：全量 + 增量 + binlog

```
周日 02:00          周一 02:00          周二 02:00          周三 02:00
    │                   │                   │                   │
    ▼                   ▼                   ▼                   ▼
  全量备份            增量备份            增量备份            全量备份
    │                   │                   │                   │
    └───────────────────┴───────────────────┴───────────────────┘
                              │
                        binlog 实时归档
                   （持续同步到安全存储）
```

- **每周一次全量备份**：周日凌晨低峰期执行
- **每天一次增量备份**：凌晨执行，减少数据丢失窗口
- **binlog 实时归档**：binlog 实时同步到异地存储（NFS、OSS、S3）

### RPO 和 RTO 目标

| 级别 | RPO（数据丢失） | RTO（恢复时间） | 备份方案 |
|------|----------------|----------------|---------|
| 一般业务 | 24 小时 | 4 小时 | 每日全量 + binlog |
| 重要业务 | 1 小时 | 1 小时 | 全量 + 每小时增量 + binlog |
| 核心业务 | < 1 分钟 | 30 分钟 | 主从复制 + 全量 + 实时 binlog |

## 备份验证

::: danger 备份不做恢复测试等于没有备份
定期执行恢复测试是备份策略中最重要但最常被忽视的环节。建议至少每月一次在独立环境中恢复备份，验证数据完整性和可恢复性。
:::

### 恢复测试流程

```bash
# 1. 在测试服务器上恢复备份
mysql -u root -p < latest_backup.sql

# 2. 检查表数量和行数是否一致
# 在主库
mysql -u root -p -e "SELECT COUNT(*) FROM mydb.orders;"
# 在恢复后的测试库
mysql -u root -p -e "SELECT COUNT(*) FROM mydb.orders;"

# 3. 抽样检查数据完整性
mysql -u root -p -e "
  SELECT
    (SELECT COUNT(*) FROM production.mydb.orders) AS prod_count,
    (SELECT COUNT(*) FROM test.mydb.orders) AS test_count,
    (SELECT MAX(id) FROM production.mydb.orders) AS prod_max_id,
    (SELECT MAX(id) FROM test.mydb.orders) AS test_max_id;
"

# 4. 使用 checksum 验证
mysql -u root -p -e "CHECKSUM TABLE mydb.orders, mydb.users, mydb.products;"
```

## 异地备份

```bash
# 使用 rsync 同步备份文件到异地机房
rsync -avz --progress \
  /data/backup/mysql/ \
  backup-server:/data/remote-backup/mysql/

# 或使用 ossutil 上传到对象存储
ossutil cp -r /data/backup/mysql/ oss://my-bucket/mysql-backup/

# 加密后传输（敏感数据必须加密）
tar czf - /data/backup/mysql/ | \
  openssl enc -aes-256-cbc -salt -pass pass:my_secret_key | \
  ssh backup-server "cat > /data/backup/encrypted_backup.tar.gz.enc"
```

::: tip 备份文件也要备份
3-2-1 备份原则：至少 3 份副本，存放在 2 种不同介质上，其中 1 份在异地。主库本地一份、内网备份服务器一份、云端或异地机房一份。备份文件自身的安全性同样重要——加密存储、定期检查、控制访问权限。
:::
