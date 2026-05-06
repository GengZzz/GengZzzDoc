<script setup>
import MyBatisExecutorFlowDemo from '../../../.vitepress/theme/components/MyBatisExecutorFlowDemo.vue'
import MyBatisCacheKeyDemo from '../../../.vitepress/theme/components/MyBatisCacheKeyDemo.vue'
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
