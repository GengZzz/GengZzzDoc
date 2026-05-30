---
title: "插件、分页与多租户"
description: "MyBatis-Plus 插件通过 MyBatis 拦截器改写或增强 SQL。分页、乐观锁、多租户、数据权限、非法 SQL 检查等都属于这一类。难点是插件顺序和 SQL 改写边界。"
---

<script setup>
import MyBatisPlusWrapperInterceptorDemo from '../../../.vitepress/theme/components/MyBatisPlusWrapperInterceptorDemo.vue'
</script>

# 插件、分页与多租户

MyBatis-Plus 插件通过 MyBatis 拦截器改写或增强 SQL。分页、乐观锁、多租户、数据权限、非法 SQL 检查等都属于这一类。难点是插件顺序和 SQL 改写边界。

<MyBatisPlusWrapperInterceptorDemo />

## MybatisPlusInterceptor

常见配置：

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
    return interceptor;
}
```

插件会参与 MyBatis 执行链路，在 SQL 执行前改写语句或参数。它很强，但也意味着生成 SQL 必须可预期。

## 分页插件

分页查询：

```java
Page<UserDO> page = new Page<>(req.getPageNo(), req.getPageSize());
IPage<UserDO> result = userMapper.selectPage(page, wrapper);
```

注意：

- 页码和页大小要有上限，避免一次查太多。
- count SQL 复杂时可能很慢，可以单独优化 count。
- join 查询分页容易重复或丢数据，要确认排序和主键唯一性。
- 深分页性能差时，用基于游标或 id 的翻页。

## 乐观锁

实体字段：

```java
@Version
private Integer version;
```

更新时会追加 version 条件，并让 version 自增。适合库存、余额、状态流转等并发更新场景。业务代码要处理更新失败：不是简单返回系统错误，而是提示用户刷新或重试。

## 多租户

多租户插件会自动追加租户条件：

```sql
select * from orders where tenant_id = ? and deleted = 0
```

难点：

- 租户上下文从哪里来，通常来自 token、域名、header 或登录用户。
- 哪些表需要租户隔离，字典表、系统表可能要忽略。
- 自定义 SQL、子查询、join 是否正确追加租户条件。
- `or` 条件和括号是否会绕开租户过滤。

## 数据权限

数据权限比多租户更细，可能按部门、角色、负责人过滤。不要把所有规则硬塞进一个巨大拦截器。常见做法：

- 通用租户隔离用插件。
- 复杂业务数据权限在 Service 查询条件中显式表达。
- 报表和特殊查询使用独立 Mapper SQL，并做权限测试。

## 插件排查

1. 打开 SQL 日志，看最终 SQL。
2. 确认插件注册顺序。
3. 检查自定义 SQL 是否被插件处理。
4. 对包含 `or`、join、子查询的 SQL 写测试。
5. 插件无法正确处理时，考虑显式写权限条件，而不是盲目依赖自动改写。
