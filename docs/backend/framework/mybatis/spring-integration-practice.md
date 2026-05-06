# 与 Spring / Spring Boot 集成

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
