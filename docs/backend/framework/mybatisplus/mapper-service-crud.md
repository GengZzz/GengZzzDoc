---
title: "Mapper、Service 与通用 CRUD"
description: "MyBatis-Plus 的 BaseMapper 会为实体自动注入常见 CRUD 方法。Service 层的 IService 和 ServiceImpl 又在 Mapper 基础上提供批量保存、链式查询等能力。"
---

<script setup>
import MyBatisPlusCrudInjectorDemo from '../../../.vitepress/theme/components/MyBatisPlusCrudInjectorDemo.vue'
</script>

# Mapper、Service 与通用 CRUD

MyBatis-Plus 的 BaseMapper 会为实体自动注入常见 CRUD 方法。Service 层的 `IService` 和 `ServiceImpl` 又在 Mapper 基础上提供批量保存、链式查询等能力。难点是知道这些方法从哪里来，以及什么时候应该停止使用通用方法改写自定义 SQL。

<MyBatisPlusCrudInjectorDemo />

## BaseMapper

定义 Mapper：

```java
public interface UserMapper extends BaseMapper<UserDO> {
}
```

即可获得：

- `insert`
- `deleteById`
- `updateById`
- `selectById`
- `selectBatchIds`
- `selectList`
- `selectPage`

这些方法不是接口里手写的实现，而是 MyBatis-Plus 启动时根据实体元数据、表名、字段、主键策略注入 MappedStatement。最终仍然走 MyBatis Executor。

## Service 层

常见写法：

```java
public interface UserService extends IService<UserDO> {
}

@Service
public class UserServiceImpl
    extends ServiceImpl<UserMapper, UserDO>
    implements UserService {
}
```

Service 层提供：

- `save`
- `saveBatch`
- `updateById`
- `removeById`
- `getById`
- `list`
- `page`

但业务 Service 不应该只是 BaseMapper 的转发层。如果一个 Service 只有 `saveUser -> mapper.insert` 这种无意义包装，可以直接使用通用 Service；如果涉及状态流转、权限、事务、事件，就应该写清楚业务方法。

## 批量操作

`saveBatch` 会分批执行，但要注意：

- 批大小不是越大越好，常见 500 或 1000 需要结合数据库和字段量测试。
- 批量插入前要做好数据校验，避免中途失败难以定位。
- 需要强一致的批量流程加事务。
- 极大数据量导入要考虑分片、失败重试和进度记录。

## 什么时候写自定义 SQL

以下场景建议写 XML 或注解 SQL：

1. 多表 join 并需要精确控制 select 字段。
2. 复杂 group by、having、窗口函数。
3. 批量 update 需要 case when。
4. 数据库特定语法，如 JSON 函数、全文索引。
5. Wrapper 写法已经长到难以阅读。

通用 CRUD 用于普通数据访问，自定义 SQL 用于表达复杂查询。两者并不冲突。
