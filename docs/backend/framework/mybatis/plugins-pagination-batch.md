---
title: "插件拦截器"
description: "MyBatis 插件通过拦截四类核心对象扩展执行链路："
---

# 插件拦截器

MyBatis 插件通过拦截四类核心对象扩展执行链路：

- `Executor`
- `StatementHandler`
- `ParameterHandler`
- `ResultSetHandler`

典型用途包括分页、SQL 日志、数据权限、审计字段、慢 SQL 采样。一个最小插件形态如下：

```java
@Intercepts({
    @Signature(
        type = StatementHandler.class,
        method = "prepare",
        args = {Connection.class, Integer.class}
    )
})
public class SqlTraceInterceptor implements Interceptor {
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        StatementHandler handler = (StatementHandler) invocation.getTarget();
        BoundSql boundSql = handler.getBoundSql();
        long start = System.currentTimeMillis();
        try {
            return invocation.proceed();
        } finally {
            long cost = System.currentTimeMillis() - start;
            log.debug("sql cost={}ms, sql={}", cost, boundSql.getSql());
        }
    }
}
```

插件很强，也很容易影响全局。写插件要注意：

- 只拦截必要方法，避免对所有 SQL 做昂贵解析。
- 多插件存在顺序问题，分页、租户、数据权限可能都改 SQL。
- 改写 SQL 时必须处理参数映射、缓存 key、count SQL、数据库方言。
- 插件里不要吞异常，否则事务回滚和调用方判断会失真。

## 分页

MyBatis 自带 `RowBounds`，但它偏逻辑分页：很多情况下仍然把较多数据查出来再截取，不适合大数据量接口。日常项目建议直接写数据库方言分页，或使用成熟分页插件。

直接 SQL 分页：

```xml
<select id="pageUsers" resultType="UserDO">
  select id, username, status, created_at
  from user
  <where>
    <if test="status != null">and status = #{status}</if>
  </where>
  order by id desc
  limit #{limit} offset #{offset}
</select>
```

大页码分页要警惕 `limit 100000, 20` 这类写法，数据库需要跳过大量行。常见优化是基于游标或上一页最后一条 id：

```xml
where id &lt; #{lastSeenId}
order by id desc
limit #{limit}
```

分页插件一般通过拦截 `StatementHandler` 改写 SQL。使用时要确认：

- 是否支持当前数据库方言。
- count SQL 在复杂 JOIN、group by、distinct 下是否准确。
- 是否会和多租户、数据权限插件互相影响。
- 是否允许无分页参数时全表查询。

## 批量写入

批量写入有两种常见路线。

第一种是单条 SQL 多 values：

```xml
<insert id="batchInsert">
  insert into user (username, status, created_at)
  values
  <foreach collection="users" item="user" separator=",">
    (#{user.username}, #{user.status}, #{user.createdAt})
  </foreach>
</insert>
```

优点是简单，一次网络往返；缺点是 SQL 太长可能触发数据库或驱动限制，单批数量要控制，例如每 500 或 1000 条切一批。

第二种是 `ExecutorType.BATCH`：

```java
try (SqlSession session = sqlSessionFactory.openSession(ExecutorType.BATCH)) {
    UserMapper mapper = session.getMapper(UserMapper.class);
    for (UserDO user : users) {
        mapper.insert(user);
    }
    session.flushStatements();
    session.commit();
}
```

Spring 项目中如果要混用普通会话和 batch 会话，需要格外注意事务边界。批量导入通常建议独立事务、分批提交、记录失败批次，并做好幂等键或唯一索引，避免重试时重复写入。
