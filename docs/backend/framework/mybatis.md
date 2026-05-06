<script setup>
import MyBatisExecutorFlowDemo from '../../.vitepress/theme/components/MyBatisExecutorFlowDemo.vue'
import MyBatisCacheKeyDemo from '../../.vitepress/theme/components/MyBatisCacheKeyDemo.vue'
</script>

# MyBatis

MyBatis 3 当前版本线为 3.5.19。它的定位不是完整 ORM，而是 SQL mapper framework：开发者仍然掌握 SQL，MyBatis 负责把 Java 方法、参数、SQL、结果集和对象映射连接起来。日常 Java 后端项目里，MyBatis 最适合以下场景：

- SQL 复杂、需要明确控制索引、JOIN、分页、锁、Hint、批量写入。
- 表结构和查询模型不完全等同于领域对象，不能只靠实体关系自动推导。
- 团队希望 SQL 可读、可审查、可压测，线上问题能快速从 Mapper 定位到具体语句。

它不擅长替你设计领域模型，也不会自动消除慢 SQL。MyBatis 的价值在于把 JDBC 的样板代码、参数设置、结果映射和资源管理收起来，同时保留 SQL 的透明度。

## 一条 Mapper 调用如何跑完

先看整体链路。业务代码调用的是一个接口方法，但运行时真正进入的是 MyBatis 为 Mapper 接口创建的代理对象。

<MyBatisExecutorFlowDemo />

核心对象分工如下：

| 对象 | 日常理解 | 关键职责 |
| --- | --- | --- |
| `SqlSessionFactory` | 会话工厂，应用级单例 | 读取配置、构建 `Configuration`、创建 `SqlSession` |
| `SqlSession` | 一次数据库工作单元 | 对外提供 `selectOne`、`selectList`、`insert` 等 API，持有 Executor |
| `MapperProxy` | Mapper 接口代理 | 把接口方法转换成 `MappedStatement` 调用 |
| `MappedStatement` | 一条 SQL 声明 | 保存 SQL id、参数映射、结果映射、缓存、超时、语句类型 |
| `Executor` | 执行策略入口 | 管理一级缓存、事务、批处理，调度 StatementHandler |
| `StatementHandler` | JDBC 语句处理器 | 创建 `Statement` / `PreparedStatement`，执行 SQL |
| `ParameterHandler` | 参数设置器 | 把 Java 参数设置到 `?` 占位符 |
| `ResultSetHandler` | 结果映射器 | 把 `ResultSet` 转换成对象、集合、嵌套对象 |

最重要的 id 规则是：`namespace + "." + methodName`。例如：

```java
package com.example.user;

public interface UserMapper {
    UserDO selectById(Long id);
}
```

```xml
<mapper namespace="com.example.user.UserMapper">
  <select id="selectById" resultType="com.example.user.UserDO">
    select id, username, status, created_at
    from user
    where id = #{id}
  </select>
</mapper>
```

接口全限定名和 XML 的 `namespace` 要一致，方法名和 SQL 的 `id` 要一致。启动时 MyBatis 会把 XML 解析成 `MappedStatement`；调用 `selectById` 时，`MapperProxy` 根据方法定位这条语句，然后交给 `SqlSession` 和 `Executor`。

## SqlSessionFactory、SqlSession 与线程安全

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

## 参数绑定

MyBatis 参数绑定围绕两个符号：`#{}` 和 `${}`。

`#{}` 会生成 JDBC `?` 占位符，由 `PreparedStatement` 设置参数，能避免 SQL 注入，是日常默认选择：

```xml
where id = #{id}
```

`${}` 是字符串拼接，直接把内容拼进 SQL，只能用于无法参数化的位置，例如列名、排序方向、表名后缀。它必须配合白名单：

```java
String sortColumn = switch (request.sortBy()) {
    case "createdAt" -> "created_at";
    case "username" -> "username";
    default -> "id";
};
```

```xml
order by ${sortColumn} desc
```

多参数方法要注意命名。没有 `@Param` 时，MyBatis 可能以 `param1`、`param2` 或编译参数名识别参数，长期维护不稳定。推荐显式写：

```java
List<UserDO> listByStatus(
    @Param("status") Integer status,
    @Param("limit") int limit
);
```

```xml
where status = #{status}
limit #{limit}
```

常见参数形态：

| 方法参数 | XML 访问方式 | 说明 |
| --- | --- | --- |
| 单个简单类型 | `#{value}` 或 `#{id}` | 推荐仍使用 `@Param("id")` 保持清楚 |
| JavaBean / DTO | `#{username}`、`#{query.status}` | 通过 getter 取值 |
| `Map` | `#{key}` | 适合临时参数，不适合核心接口长期使用 |
| 多参数 | `#{param1}` 或 `@Param` 名 | 推荐 `@Param` |
| 集合 | `collection="list"` 或 `@Param("ids")` | 常配合 `<foreach>` |

## 动态 SQL

动态 SQL 解决的是“条件可选但 SQL 仍要合法”。日常最常用的标签是 `where`、`set`、`if`、`choose`、`foreach`、`trim`。

条件查询：

```xml
<select id="searchUsers" resultType="UserDO">
  select id, username, status, created_at
  from user
  <where>
    <if test="status != null">
      and status = #{status}
    </if>
    <if test="keyword != null and keyword != ''">
      and username like concat('%', #{keyword}, '%')
    </if>
    <if test="createdFrom != null">
      and created_at &gt;= #{createdFrom}
    </if>
  </where>
  order by id desc
</select>
```

`<where>` 会在内部有条件时自动补 `where`，并处理开头多余的 `and` / `or`。更新语句优先用 `<set>`：

```xml
<update id="updateSelective">
  update user
  <set>
    <if test="username != null">username = #{username},</if>
    <if test="status != null">status = #{status},</if>
    <if test="updatedAt != null">updated_at = #{updatedAt},</if>
  </set>
  where id = #{id}
</update>
```

`<foreach>` 常用于 `in` 和批量插入：

```xml
<select id="selectByIds" resultType="UserDO">
  select id, username, status
  from user
  where id in
  <foreach collection="ids" item="id" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>
```

注意空集合。`where id in ()` 在多数数据库中是非法 SQL。业务层可以直接返回空列表，或者在 SQL 中显式兜底：

```xml
<choose>
  <when test="ids != null and ids.size() > 0">
    id in
    <foreach collection="ids" item="id" open="(" separator="," close=")">
      #{id}
    </foreach>
  </when>
  <otherwise>
    1 = 0
  </otherwise>
</choose>
```

## ResultType 与 ResultMap

`resultType` 适合列名与属性名简单对应的场景：

```xml
<select id="selectById" resultType="UserDO">
  select id, username, status, created_at as createdAt
  from user
  where id = #{id}
</select>
```

`ResultMap` 适合以下情况：

- 数据库列名和 Java 属性名差异较多。
- 需要映射枚举、类型处理器、构造器参数。
- 一对一、一对多嵌套对象。
- 多表 JOIN 后要去重合并成对象图。

```xml
<resultMap id="UserResultMap" type="UserDO">
  <id property="id" column="id"/>
  <result property="username" column="username"/>
  <result property="status" column="status"/>
  <result property="createdAt" column="created_at"/>
</resultMap>
```

`<id>` 很关键。它不只是语义上的主键，MyBatis 在处理嵌套结果映射时会用它识别同一个父对象，避免 JOIN 后重复创建对象。复杂 `ResultMap` 里父子对象都应该尽量声明 `<id>`。

## N+1 与嵌套映射

MyBatis 的嵌套映射有两种写法：嵌套查询和嵌套结果。

嵌套查询：

```xml
<resultMap id="OrderMap" type="OrderDO">
  <id property="id" column="id"/>
  <result property="orderNo" column="order_no"/>
  <collection property="items"
              column="id"
              select="selectItemsByOrderId"/>
</resultMap>
```

它容易读，但会触发 N+1：先查订单列表，再对每个订单查一次明细。订单 100 条时，可能变成 101 次 SQL。一级缓存只能缓解“相同参数重复查询”，不能解决每个父 id 都不同的 N+1。

嵌套结果用 JOIN 一次查出：

```xml
<select id="selectOrdersWithItems" resultMap="OrderWithItemsMap">
  select
    o.id as order_id,
    o.order_no,
    i.id as item_id,
    i.sku,
    i.quantity
  from orders o
  left join order_item i on i.order_id = o.id
  where o.buyer_id = #{buyerId}
</select>

<resultMap id="OrderWithItemsMap" type="OrderDO">
  <id property="id" column="order_id"/>
  <result property="orderNo" column="order_no"/>
  <collection property="items" ofType="OrderItemDO">
    <id property="id" column="item_id"/>
    <result property="sku" column="sku"/>
    <result property="quantity" column="quantity"/>
  </collection>
</resultMap>
```

选择建议：

- 少量详情页、一对一或数据量确定很小：嵌套查询可以接受。
- 列表页展示一对多摘要：优先 JOIN + 嵌套结果，或分两次批量查询后在业务层组装。
- 一对多分页要谨慎。直接 JOIN 后分页可能分页的是展开行，不是父表行。常见做法是先分页查父 id，再按 id 批量查子表。

## 一级缓存、二级缓存与 CacheKey

缓存是 MyBatis 面试常问、线上也常踩坑的部分。先用动画看边界。

<MyBatisCacheKeyDemo />

一级缓存默认开启，作用域是 `SqlSession`。同一个 `SqlSession` 中，相同 `MappedStatement`、分页信息、最终 SQL、参数和环境生成的 `CacheKey` 一致时，第二次查询会直接命中本地缓存。

`CacheKey` 通常由这些信息参与计算：

- `MappedStatement` id，例如 `UserMapper.selectById`。
- `RowBounds` 的 offset 和 limit。
- 最终 SQL 文本，动态 SQL 条件不同则不同。
- 参数值，`id=1` 和 `id=2` 是不同 key。
- 环境 id，区分不同数据源环境。

一级缓存失效或清空的典型时机：

- 同一个 `SqlSession` 执行 `insert`、`update`、`delete`，默认会清空本地缓存。
- 手动调用 `clearCache()`。
- 会话关闭。
- `localCacheScope=STATEMENT` 时，每条语句后缓存即失效。

二级缓存是 namespace 级别缓存，需要显式开启并在 Mapper XML 中声明：

```xml
<mapper namespace="com.example.user.UserMapper">
  <cache eviction="LRU" flushInterval="60000" size="512" readOnly="false"/>
</mapper>
```

二级缓存不是“业务缓存”的替代品。它的边界是 Mapper namespace，失效粒度也偏粗：同 namespace 下写操作通常会刷新该 namespace 的缓存。跨 Mapper、跨表 JOIN、权限相关数据、强一致读，一般不建议依赖二级缓存。生产项目里更常见的是关闭二级缓存，用 Redis / Caffeine 等业务缓存承接明确的缓存需求。

## Executor 类型

`Executor` 决定语句如何被执行，常见三种类型：

| 类型 | 行为 | 适用场景 | 注意点 |
| --- | --- | --- | --- |
| `SIMPLE` | 每次执行都创建新的 Statement | 默认、最通用 | 简单可靠 |
| `REUSE` | 复用相同 SQL 的 Statement | 同会话内重复执行相同 SQL | 注意连接和 Statement 生命周期 |
| `BATCH` | 批量缓存写操作，统一 flush | 大量 insert/update | 需要处理返回值、异常定位和事务提交 |

Spring Boot 中可配置：

```yaml
mybatis:
  executor-type: batch
```

但不建议全局轻易切到 `BATCH`。批处理语义会影响所有 Mapper 写操作，更常见的做法是在专门的批量导入服务中使用批量会话或框架提供的批量能力。

## 插件拦截器

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

## 与 Spring / Spring Boot 集成

典型依赖是 `mybatis-spring-boot-starter`。启动时自动配置会做几件事：

1. 找到 `DataSource`。
2. 创建 `SqlSessionFactory`。
3. 创建线程安全的 `SqlSessionTemplate`。
4. 扫描 `@Mapper` 或 `@MapperScan` 指定的接口。
5. 为 Mapper 接口创建可注入的代理 Bean。

配置示例：

```yaml
mybatis:
  mapper-locations: classpath*:mapper/**/*.xml
  type-aliases-package: com.example.domain
  configuration:
    map-underscore-to-camel-case: true
    default-fetch-size: 100
    default-statement-timeout: 5
```

启动类：

```java
@SpringBootApplication
@MapperScan("com.example.mapper")
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

事务交给 Spring 管理：

```java
@Service
public class UserService {
    private final UserMapper userMapper;

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Transactional
    public void disableUser(Long userId) {
        userMapper.updateStatus(userId, 0);
        userMapper.insertStatusLog(userId, "DISABLED");
    }
}
```

`@Transactional` 决定的是同一线程内数据库连接、事务提交回滚和底层 `SqlSession` 同步。不要在同一个事务方法里开新线程调用 Mapper；新线程拿不到原事务上下文。

## 常见坑

| 问题 | 现象 | 处理方式 |
| --- | --- | --- |
| `namespace` 写错 | `Invalid bound statement` | XML namespace 必须等于 Mapper 接口全限定名 |
| XML 没被加载 | 本地能跑，打包后找不到 SQL | 检查 `mapper-locations`、资源目录、Maven/Gradle 打包配置 |
| 参数名找不到 | `Parameter 'xxx' not found` | 多参数方法使用 `@Param` |
| 滥用 `${}` | SQL 注入、排序字段被拼接攻击 | 只对白名单后的列名/表名使用 `${}` |
| `like '%#{keyword}%'` | SQL 参数不生效 | 用 `concat('%', #{keyword}, '%')` 或在 Java 中拼接参数值 |
| `foreach` 空集合 | 生成 `in ()` 报错 | 业务层短路或 `<choose>` 兜底 `1 = 0` |
| JOIN 分页重复/漏数据 | 一对多 JOIN 后分页不准 | 先分页父表 id，再批量查子表 |
| 嵌套查询 N+1 | 列表页 SQL 数暴涨 | JOIN 嵌套结果，或批量查子表后组装 |
| 二级缓存脏读 | 写后读不一致或跨 Mapper 不刷新 | 谨慎开启，核心业务优先用显式业务缓存 |
| 批量写入内存涨 | 大批次 pending statement 太多 | 分批 flush/commit，控制批次大小 |
| 插件顺序冲突 | 分页、租户、权限 SQL 改写互相覆盖 | 明确插件顺序，补集成测试 |
| 枚举映射异常 | 数据库存的是 code，Java 是 enum | 自定义 `TypeHandler` |
| 时间类型混乱 | 时区偏移、毫秒丢失 | 统一 JDBC 驱动、数据库时区、Java 时间类型 |

## 日常落地建议

1. Mapper 方法名表达业务查询意图，例如 `selectEnabledByTenantId`，不要只叫 `queryList`。
2. XML 中所有复杂 SQL 保持可复制到数据库客户端执行，必要时用注释标明索引依赖。
3. 查询列表页时先确认是否会触发 N+1，再决定 JOIN、两段查询或冗余字段。
4. 更新语句默认带明确 `where`，批量更新必须有调用方可审计的条件。
5. 分页接口设置最大 `pageSize`，避免一次拉爆内存。
6. 慢 SQL 优化优先看执行计划和索引，不要指望 MyBatis 配置解决数据库问题。
7. 插件、二级缓存、全局 batch executor 都属于全局影响能力，上线前要有集成测试和回滚方案。

把 MyBatis 学扎实，重点不是背标签，而是能在“接口方法、最终 SQL、参数、结果映射、事务会话、缓存边界”之间快速定位问题。日常排查时沿着执行链路看：Mapper 方法是否绑定到正确 `MappedStatement`，动态 SQL 是否生成预期文本，参数是否进入 `PreparedStatement`，数据库是否按预期执行，结果集是否被正确映射成对象。
