# 备份与恢复

数据备份是运维的生命线。MongoDB 提供了逻辑备份（mongodump）、文件快照和时间点恢复等多种方案，适用于不同规模和恢复时间要求的场景。

## mongodump / mongorestore

### mongodump（逻辑备份）

```bash
# 备份整个数据库
mongodump --uri="mongodb://admin:secret@localhost:27017" --out=/backup/2024-01-15

# 备份指定数据库
mongodump --db myapp --out=/backup/2024-01-15

# 备份指定集合
mongodump --db myapp --collection orders --out=/backup/2024-01-15

# 备份并压缩
mongodump --db myapp --gzip --out=/backup/2024-01-15

# 备份为单个归档文件（适合管道传输到远程存储）
mongodump --archive=/backup/myapp-2024-01-15.archive --gzip

# 只备份符合条件的文档
mongodump --db myapp --collection orders \
  --query='{ "status": "completed" }' \
  --out=/backup/2024-01-15
```

### mongorestore（逻辑恢复）

```bash
# 恢复整个数据库
mongorestore --uri="mongodb://admin:secret@localhost:27017" /backup/2024-01-15

# 恢复指定数据库
mongorestore --db myapp --drop /backup/2024-01-15/myapp
# --drop：恢复前先删除已存在的集合

# 从归档文件恢复
mongorestore --archive=/backup/myapp-2024-01-15.archive --gzip

# 恢复时忽略索引（加速恢复，之后重建索引）
mongorestore --noIndexRestore --db myapp /backup/2024-01-15/myapp

# 恢复并保留插入顺序
mongorestore --maintainInsertionOrder --db myapp /backup/2024-01-15/myapp
```

### 增量备份策略

mongodump 本身不支持增量备份，但可以结合 Oplog 实现：

```bash
# 1. 全量备份 + 记录 Oplog 时间点
mongodump --oplog --archive=/backup/full-2024-01-15.archive --gzip

# 2. 定期备份 Oplog（每小时）
mongodump --db local --collection oplog.rs \
  --query='{ "ts": { "$gte": { "$timestamp": { "t": 1705276800, "i": 1 } } } }' \
  --archive=/backup/oplog-2024-01-15-10:00.archive --gzip

# 3. 恢复：先恢复全量，再重放 Oplog
mongorestore --archive=/backup/full-2024-01-15.archive --gzip --oplogReplay
```

::: warning mongodump 的性能影响
mongodump 在运行时会对数据库产生读压力。在大型数据集上（> 100GB），备份可能持续数小时。建议：
- 在 Secondary 节点上执行备份
- 使用 `--readPreference=secondary` 自动路由到 Secondary
- 使用 `--numParallelCollections` 控制并行度
:::

## 文件快照备份

对于 WiredTiger 引擎，文件系统快照是最快、对服务影响最小的备份方式。

### LVM 快照（Linux）

```bash
# 前提：数据目录在 LVM 卷上
# 1. 锁定写入（确保数据一致性）
mongosh --eval "db.fsyncLock()"

# 2. 创建 LVM 快照
lvcreate --size 10G --snapshot --name mongodb_snap /dev/vg0/mongodb_lv

# 3. 解锁写入
mongosh --eval "db.fsyncUnlock()"

# 4. 挂载快照并复制
mkdir /mnt/mongodb_snap
mount /dev/vg0/mongodb_snap /mnt/mongodb_snap
tar czf /backup/mongodb-2024-01-15.tar.gz -C /mnt/mongodb_snap .

# 5. 清理
umount /mnt/mongodb_snap
lvremove /dev/vg0/mongodb_snap
```

### AWS EBS 快照

```bash
# 1. 锁定写入
mongosh --eval "db.fsyncLock()"

# 2. 创建 EBS 快照
aws ec2 create-snapshot \
  --volume-id vol-0123456789abcdef0 \
  --description "MongoDB backup 2024-01-15"

# 3. 解锁
mongosh --eval "db.fsyncUnlock()"
```

::: tip 快照备份的优势
- 备份时间短（秒级创建快照）
- 锁定写入的时间极短（`fsyncLock` + `fsyncUnlock` 之间）
- 恢复速度快（直接还原文件系统）
- 适合 TB 级数据集
:::

## 时间点恢复（Point-in-Time Recovery）

时间点恢复允许将数据库恢复到任意时刻，需要全量备份 + Oplog 连续备份。

### 实现步骤

```bash
# 1. 全量备份（记录 Oplog 时间点）
mongodump --oplog --archive=/backup/full.archive --gzip
# 输出中会记录 Oplog 最后的时间点

# 2. 持续备份 Oplog（每 5-15 分钟）
# 脚本化
while true; do
  mongodump --db local --collection oplog.rs \
    --archive=/backup/oplog-$(date +%Y%m%d%H%M%S).archive --gzip
  sleep 300
done

# 3. 恢复到指定时间点
# 先恢复全量备份
mongorestore --archive=/backup/full.archive --gzip

# 再重放 Oplog 到指定时间
mongorestore --oplogFile=/backup/oplog-*.archive \
  --oplogLimit="1705276800:1"   # Timestamp(t, i)
```

### Oplog 备份策略

```bash
# 每小时备份 Oplog 到 S3
#!/bin/bash
LAST_TS=$(cat /var/log/mongo/last_oplog_ts)
ARCHIVE="/tmp/oplog-$(date +%Y%m%d%H%M).archive"

mongodump --host rs0/mongo1:27017 --db local --collection oplog.rs \
  --query="{ \"ts\": { \"\$gt\": { \"\$timestamp\": { \"t\": ${LAST_TS}, \"i\": 1 } } } }" \
  --archive="${ARCHIVE}" --gzip

aws s3 cp "${ARCHIVE}" s3://backup-bucket/mongodb/oplog/
rm "${ARCHIVE}"

# 更新时间戳
NEW_TS=$(date +%s)
echo $NEW_TS > /var/log/mongo/last_oplog_ts
```

::: tip 时间点恢复的关键
Oplog 必须连续备份，中间不能有断档。如果 Oplog 备份有一小时的缺口，就无法恢复到那一小时内的任意时间点。设置 Oplog 足够大（至少覆盖备份间隔），确保即使备份失败也不会丢失 Oplog。
:::

## 备份验证

备份不做恢复验证等于没备份。定期执行恢复测试：

```bash
# 1. 在测试环境恢复备份
mongorestore --uri="mongodb://localhost:27018" \
  --archive=/backup/latest.archive --gzip

# 2. 验证文档数量
mongosh --port 27018 --eval "
  db = db.getSiblingDB('myapp')
  print('users:', db.users.countDocuments())
  print('orders:', db.orders.countDocuments())
"

# 3. 验证数据完整性（抽样检查）
mongosh --port 27018 --eval "
  db = db.getSiblingDB('myapp')
  // 检查最新订单是否存在
  const latest = db.orders.findOne({}, { sort: { createdAt: -1 } })
  print('Latest order:', latest ? latest._id : 'MISSING')
"
```

## 备份方案对比

| 方案 | 备份速度 | 恢复速度 | 数据量限制 | RPO | RTO |
|------|---------|---------|-----------|-----|-----|
| mongodump | 慢 | 慢 | < 500GB | 小时级 | 小时级 |
| 文件快照 | 快 | 快 | TB 级 | 分钟级 | 分钟级 |
| 副本集 Secondary | 实时 | 快（直接提升） | 无限制 | 0 | 分钟级 |

::: warning 备份不是可选项
无论 MongoDB 部署模式如何（单机、副本集、分片集群），都必须有备份。副本集的 Secondary 不是备份——误操作 `drop()` 会在几秒内同步到所有 Secondary。备份 + 定期恢复测试是唯一的兜底手段。
:::
