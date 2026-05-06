# SqlSessionFactory、SqlSession 与线程安全

`SqlSessionFactory` 构建成本高，但线程安全，通常整个应用一个即可。`SqlSession` 不是线程安全对象，它代表一次会话和一组数据库操作，不应该放进单例字段，也不应该跨线程复用。

原生 MyBatis 写法通常是：

```java
try (SqlSession session = sqlSessionFactory.openSession()) {
    UserMapper mapper = session.getMapper(UserMapper.class);
    UserDO user = mapper.selectById(1L);
    session.commit();
}
```

Spring 项目里很少手写 `openSession()`。`mybatis-spring` 会用 `SqlSessionTemplate` 代理 `SqlSession`，把真实会话绑定到 Spring 事务上下文。你注入的 Mapper 看起来像单例 Bean，但每次方法调用会进入当前线程绑定的事务会话。

实践判断：

- 单次请求内多个 Mapper 方法在同一个 Spring 事务中，通常共享同一个底层 `SqlSession`。
- 没有事务时，`SqlSessionTemplate` 会按调用获取和关闭会话，一级缓存命中空间更小。
- 不要在业务代码里缓存 `SqlSession` 或手动关闭 Spring 注入的 Mapper。

## XML 与注解如何选择

MyBatis 支持 XML 和注解两种 SQL 写法。它们不是谁更高级，而是适合不同复杂度。

注解适合短 SQL：

```java
@Select("""
    select id, username, status
    from user
    where id = #{id}
    """)
UserDO selectById(Long id);
```

XML 适合动态 SQL、复杂映射和需要长期维护的查询：

```xml
<select id="search" resultMap="UserResultMap">
  select id, username, status, created_at
  from user
  <where>
    <if test="keyword != null and keyword != ''">
      and username like concat('%', #{keyword}, '%')
    </if>
    <if test="status != null">
      and status = #{status}
    </if>
  </where>
  order by id desc
</select>
```

建议：

- 简单 CRUD、内部工具查询可以用注解。
- 生产核心查询、动态条件、嵌套映射、批量写入优先 XML。
- 同一个 Mapper 方法不要同时在注解和 XML 中定义同名 SQL，避免重复声明。
- XML 的 SQL 更容易被 DBA、代码评审和压测脚本复用。
