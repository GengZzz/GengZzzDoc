<script setup>
import SpringBootAutoConfigDemo from '../../.vitepress/theme/components/SpringBootAutoConfigDemo.vue'
import SpringBootRequestOpsDemo from '../../.vitepress/theme/components/SpringBootRequestOpsDemo.vue'
</script>

# Spring Boot

Spring Boot 是 Spring 生态里用于快速构建应用的工程化框架。它的目标不是替代 Spring Framework，而是把企业开发里反复出现的非功能能力整理成一套默认约定：内嵌 Web 容器、自动配置、外部化配置、健康检查、指标、日志、测试支持和可执行包。

日常后端开发中，可以把 Spring Boot 理解成三层：

1. **Spring Framework** 负责 IoC、AOP、事务、MVC、数据访问等核心能力。
2. **Spring Boot** 负责把常用能力按约定组装好，并允许开发者用配置或 Bean 覆盖默认行为。
3. **Spring Boot Starter / Actuator / Maven Plugin** 等周边模块负责依赖收敛、生产可观测和打包运行。

当前稳定线包含 4.0.x，也有 3.5、3.4 等维护线。项目选型时更重要的是看团队的 Java 版本、Spring Cloud 兼容矩阵、三方库兼容性和公司的长期维护策略。

## 适合解决什么问题

传统 Spring 项目常见痛点是 XML 或 Java Config 过多、依赖版本难统一、部署依赖外部 Servlet 容器、生产监控需要额外集成。Spring Boot 通过“约定优于配置”降低这些成本：

- 创建 stand-alone 应用，`java -jar app.jar` 即可启动。
- 内嵌 Tomcat、Jetty 或 Undertow，不强依赖外部容器。
- 自动配置 MVC、JSON、数据源、事务、缓存、消息队列等常用设施。
- 使用 `application.yml`、环境变量、命令行参数等外部化配置。
- 通过 Actuator 暴露 health、metrics、info、loggers 等生产端点。

它适合微服务、单体后端、管理后台、定时任务、网关、批处理入口等场景。它不负责直接替你设计领域模型、数据库边界或分布式一致性，这些仍然需要工程设计。

## 起步依赖 starter

starter 是一组“场景依赖”的集合。你引入的是一个入口依赖，背后带入一组常用库和默认版本。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

`spring-boot-starter-web` 通常会带入：

- Spring MVC：`DispatcherServlet`、Controller、参数绑定、异常处理。
- Jackson：JSON 序列化和反序列化。
- Bean Validation：参数校验能力。
- 内嵌 Tomcat：默认 Web 容器。
- logging starter：默认 Logback 日志实现。

常用 starter：

| starter | 典型用途 |
|---|---|
| `spring-boot-starter-web` | 同步 Servlet Web 应用、REST API |
| `spring-boot-starter-webflux` | 响应式 Web 应用、Reactive 客户端 |
| `spring-boot-starter-validation` | `@Valid`、`@NotNull` 等参数校验 |
| `spring-boot-starter-data-jpa` | JPA、Hibernate、Repository |
| `spring-boot-starter-jdbc` | JDBC、`JdbcTemplate`、事务基础设施 |
| `spring-boot-starter-test` | JUnit、AssertJ、Mockito、Spring Test |
| `spring-boot-starter-actuator` | 健康检查、指标、运行时端点 |

::: tip 依赖选择建议
只引入真正需要的 starter。比如只写 REST API 用 `starter-web` 即可，不要同时引入 `web` 和 `webflux`，除非明确知道谁作为主 Web 栈。数据访问层也尽量避免同时把 JPA、MyBatis、JDBC starter 混在一个小服务里，否则自动配置和事务边界会更难判断。
:::

## 自动配置原理

Spring Boot 的自动配置不是“魔法”，而是启动时批量导入一组配置类，再通过条件注解决定是否生效。

<SpringBootAutoConfigDemo />

核心链路：

1. `@SpringBootApplication` 包含 `@EnableAutoConfiguration`。
2. Boot 从依赖包中的 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 读取候选自动配置类。
3. 每个自动配置类上有大量条件注解，例如类路径中是否存在某个类、配置项是否开启、容器中是否缺少某个 Bean。
4. 条件匹配后，自动配置类通过 `@Bean` 创建默认基础设施。
5. 如果用户已经声明了同类型 Bean，常见自动配置会因为 `@ConditionalOnMissingBean` 退让。

简化示例：

```java
@AutoConfiguration
@ConditionalOnClass(ObjectMapper.class)
public class JacksonAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
```

如果项目没有声明 `ObjectMapper`，Boot 创建默认 Bean。如果你声明了自己的 Bean，默认 Bean 不再创建：

```java
@Configuration
public class JsonConfig {

    @Bean
    ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .findAndAddModules()
                .defaultTimeZone(TimeZone.getTimeZone("Asia/Shanghai"))
                .build();
    }
}
```

这就是“默认够用、显式优先”的设计。

## 条件注解

条件注解决定自动配置或业务配置是否加载。常见注解如下：

| 注解 | 含义 | 常见场景 |
|---|---|---|
| `@ConditionalOnClass` | classpath 中存在指定类才生效 | 引入 JDBC 驱动后才配置 DataSource |
| `@ConditionalOnMissingClass` | classpath 中不存在指定类才生效 | 排除某个实现时启用备用方案 |
| `@ConditionalOnBean` | 容器中已有指定 Bean 才生效 | 有 DataSource 才创建事务管理器 |
| `@ConditionalOnMissingBean` | 容器中没有指定 Bean 才生效 | 默认 Bean 允许用户覆盖 |
| `@ConditionalOnProperty` | 配置项匹配才生效 | `feature.sms.enabled=true` 才开启短信 |
| `@ConditionalOnWebApplication` | 当前是 Web 应用才生效 | MVC、Servlet、Filter 配置 |

业务代码里也可以使用条件注解，但要保持克制。条件过多会让 Bean 是否存在变得难以推断。对于业务开关，优先用清晰的配置项和启动日志说明。

```java
@Configuration
@ConditionalOnProperty(prefix = "app.sms", name = "enabled", havingValue = "true")
public class SmsConfig {

    @Bean
    SmsClient smsClient(SmsProperties properties) {
        return new SmsClient(properties.accessKey(), properties.secretKey());
    }
}
```

## 配置绑定

Spring Boot 推荐使用 `@ConfigurationProperties` 绑定结构化配置，而不是在业务类里散落大量 `@Value`。

```yaml
app:
  upload:
    base-dir: /data/uploads
    max-size: 20MB
    allowed-types:
      - image/png
      - image/jpeg
```

```java
@ConfigurationProperties(prefix = "app.upload")
public record UploadProperties(
        Path baseDir,
        DataSize maxSize,
        List<String> allowedTypes
) {
}
```

然后在配置类或启动类上启用扫描：

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

日常建议：

- 用 record 或不可变类承载配置，启动时尽早失败。
- 给配置加校验，例如 `@NotBlank`、`@Min`，避免线上运行到一半才发现配置缺失。
- 配置类只保存配置，不掺业务逻辑。
- 敏感信息不要写入仓库，使用环境变量、配置中心或密钥管理服务。

## 配置优先级

Spring Boot 支持外部化配置，来源很多。排障时最重要的是知道“最后谁覆盖了谁”。常见优先级从高到低可粗略理解为：

1. 命令行参数：`--server.port=9090`。
2. Java 系统属性：`-Dserver.port=9090`。
3. 操作系统环境变量：`SERVER_PORT=9090`。
4. 当前目录或部署目录下的 `application.yml` / `application.properties`。
5. classpath 内的 `application.yml` / `application.properties`。
6. 代码中的默认值。

实际项目还可能引入配置中心、测试注解、`SPRING_APPLICATION_JSON` 等来源。遇到配置不生效时，可以打开 Actuator 的 `/actuator/env` 查看属性来源，或在启动日志中加上 `--debug` 观察条件匹配报告。

环境变量的宽松绑定很常用：

```bash
SERVER_PORT=8081
SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/order
APP_UPLOAD_MAX_SIZE=20MB
```

它们可以绑定到 `server.port`、`spring.datasource.url`、`app.upload.max-size`。

## Profile 与多环境配置

Profile 用来表达运行环境或一组配置变体。常见文件拆分：

```text
application.yml
application-dev.yml
application-test.yml
application-prod.yml
```

基础配置放在 `application.yml`：

```yaml
spring:
  application:
    name: order-service

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

开发环境配置放在 `application-dev.yml`：

```yaml
server:
  port: 8080

logging:
  level:
    com.example.order: debug
```

生产环境通过启动参数或环境变量激活：

```bash
java -jar order-service.jar --spring.profiles.active=prod
```

实践上，不建议把数据库密码、云密钥直接放进 `application-prod.yml` 并提交。生产配置应由部署平台注入。Profile 适合表达“连接哪个环境、打开哪些功能、日志级别如何”，不适合变成权限系统或复杂业务规则引擎。

## 内嵌 Web 容器

Boot Web 应用默认使用内嵌 Tomcat。启动后，应用本身就是一个进程，容器对象也在这个进程内创建和管理。

常见配置：

```yaml
server:
  port: 8080
  servlet:
    context-path: /api
  tomcat:
    threads:
      max: 200
    connection-timeout: 5s
```

如果要换 Jetty，可以排除 Tomcat 并引入 Jetty starter：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

内嵌容器的好处是部署一致、运维简单、便于容器化。需要注意的是线程池、连接数、反向代理超时和应用自身接口耗时要一起调，否则只改 `server.tomcat.threads.max` 往往解决不了吞吐问题。

## 启动流程

一个最小启动类：

```java
@SpringBootApplication
public class OrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
```

启动过程可以拆成几步理解：

1. 创建 `SpringApplication`，推断应用类型是 Servlet、Reactive 还是普通应用。
2. 准备 Environment，加载配置文件、环境变量、命令行参数。
3. 创建 ApplicationContext。
4. 执行 BeanDefinition 加载，包括组件扫描、手写配置、自动配置。
5. 刷新容器，实例化单例 Bean，完成依赖注入、生命周期回调、AOP 代理。
6. 如果是 Web 应用，启动内嵌容器并注册 Servlet、Filter、Listener。
7. 执行 `ApplicationRunner`、`CommandLineRunner`。
8. 应用进入可服务状态。

启动慢时，不要只盯着 Boot 本身。常见耗时来自数据库连接池初始化、远程配置中心、缓存预热、类路径扫描过大、Bean 初始化里做了网络调用。

## 请求处理与可观测链路

Web 请求进入 Boot 应用后，不是直接到 Controller，而是先经过内嵌容器和 Spring MVC 的前端控制器。

<SpringBootRequestOpsDemo />

典型 Servlet MVC 链路：

1. Tomcat 或 Jetty 接收 TCP 连接并解析 HTTP。
2. 请求进入 Filter 链，例如日志、鉴权、跨域、Trace。
3. `DispatcherServlet` 根据 `HandlerMapping` 找到 Controller 方法。
4. `HandlerAdapter` 完成参数绑定、校验、类型转换。
5. Controller 调用 Service，Service 处理事务、领域逻辑和数据访问。
6. 返回值交给 `HttpMessageConverter` 写成 JSON。
7. 异常由 `HandlerExceptionResolver` 或 `@ControllerAdvice` 统一处理。
8. Micrometer 和 Actuator 记录请求耗时、状态码、异常、健康状态。

这条链路决定了很多排障入口：404 先看路径和 HandlerMapping，400 看参数绑定和校验，500 看业务异常，慢请求看 Controller 内部耗时和下游依赖，连接打满看容器线程池和数据库连接池。

## Actuator

Actuator 是生产可观测入口。引入依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

常用配置：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers
  endpoint:
    health:
      show-details: when_authorized
```

常用端点：

| 端点 | 用途 |
|---|---|
| `/actuator/health` | 存活、就绪、数据库、缓存等健康信息 |
| `/actuator/info` | 应用版本、构建信息、Git 信息 |
| `/actuator/metrics` | JVM、HTTP、线程池、连接池等指标 |
| `/actuator/prometheus` | Prometheus 抓取格式 |
| `/actuator/loggers` | 查看和调整日志级别 |
| `/actuator/env` | 查看配置属性及来源，排查配置覆盖 |
| `/actuator/beans` | 查看 Bean 列表，排查自动配置结果 |

生产环境不要无脑暴露全部端点。`env`、`beans`、`loggers` 等端点可能泄露内部结构或允许运行时变更，应该放在内网、加认证，或仅在排障窗口开启。

## 日志

Spring Boot 默认使用 SLF4J + Logback。业务代码只依赖日志门面：

```java
private static final Logger log = LoggerFactory.getLogger(OrderService.class);
```

配置示例：

```yaml
logging:
  level:
    root: info
    com.example.order: debug
    org.springframework.web: info
  file:
    name: logs/order-service.log
```

实践建议：

- Controller 记录请求关键字段时注意脱敏，不记录密码、token、身份证号。
- 业务日志写“发生了什么、关联哪个订单、结果如何”，不要只写 `error happened`。
- 异常日志保留堆栈，避免 `log.error(e.getMessage())` 丢失上下文。
- 分布式系统要接入 traceId，并在日志 pattern 中输出。
- 生产临时调试优先使用 `/actuator/loggers` 调整包级别，排查完恢复。

## 测试

Boot 测试分层写，速度和覆盖面要平衡。

### 单元测试

纯业务逻辑不需要启动 Spring 容器：

```java
class PriceServiceTest {

    @Test
    void shouldApplyVipDiscount() {
        PriceService service = new PriceService();

        BigDecimal price = service.calculate(new Customer("vip"), new BigDecimal("100"));

        assertThat(price).isEqualByComparingTo("90");
    }
}
```

### Web 层测试

只测 Controller、参数校验、异常映射：

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    OrderService orderService;

    @Test
    void shouldReturnOrder() throws Exception {
        given(orderService.getById(1001L)).willReturn(new OrderResponse(1001L, "PAID"));

        mockMvc.perform(get("/orders/{id}", 1001L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));
    }
}
```

### 集成测试

需要验证真实 Bean 组装、事务、配置绑定时使用：

```java
@SpringBootTest
@ActiveProfiles("test")
class OrderApplicationTest {

    @Test
    void contextLoads() {
    }
}
```

测试建议：

- 能不用 `@SpringBootTest` 就不用，容器启动会拖慢反馈。
- 数据库相关测试优先使用 Testcontainers 或专门测试库，不和开发库混用。
- 用 `@ActiveProfiles("test")` 隔离测试配置。
- 对外部 HTTP、MQ、缓存调用使用 mock、fake 或容器化依赖，避免测试依赖共享环境。

## 打包与部署

使用 Maven 插件可以打出可执行 jar：

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
</plugin>
```

常见命令：

```bash
mvn clean package
java -jar target/order-service.jar --spring.profiles.active=prod
```

容器化时常见 Dockerfile：

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/order-service.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

部署时要关注：

- Java 版本和 Boot 版本匹配。
- 启动参数、时区、字符集、堆内存、GC 日志。
- `/actuator/health` 用于健康检查，必要时区分 liveness 和 readiness。
- 数据库迁移工具如 Flyway、Liquibase 的执行时机。
- 优雅停机，避免发布时中断正在处理的请求。

优雅停机配置示例：

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

## 常见启动和配置问题

### 端口被占用

现象：启动失败，日志出现 `Port 8080 was already in use`。

处理：

- 本地换端口：`--server.port=8081`。
- 查找占用进程并停止。
- 多服务本地联调时给每个服务固定端口，避免随机冲突。

### Bean 冲突

现象：`NoUniqueBeanDefinitionException` 或 Bean 名称重复。

处理：

- 同类型多个实现时用 `@Qualifier` 或 `@Primary`。
- 检查是否同时引入了多个 starter 导致重复自动配置。
- 避免在不同配置类里声明同名 Bean。

### 配置没有生效

排查顺序：

1. 配置 key 是否写错，尤其是层级和缩进。
2. profile 是否真的激活。
3. 是否被命令行、环境变量、配置中心覆盖。
4. `@ConfigurationProperties` 是否被扫描或启用。
5. 类型是否能转换，例如 `20MB` 能绑定到 `DataSize`，但不能绑定到普通 `Integer`。

### 自动配置没有生效

处理：

- 启动加 `--debug` 查看 conditions report。
- 看 classpath 是否缺少 starter 或驱动。
- 看是否声明了用户 Bean 导致 `@ConditionalOnMissingBean` 退让。
- 看配置项是否关闭了某个能力。

### 循环依赖

现象：A 依赖 B，B 又依赖 A，启动失败。

处理：

- 优先重构职责，把共同逻辑抽到第三个服务。
- 避免字段注入，使用构造器注入可以更早暴露循环。
- 不建议长期依赖允许循环引用的配置开关。

### 数据源启动失败

常见原因：

- 缺少 JDBC 驱动。
- URL、用户名、密码错误。
- 网络不通或数据库未授权。
- 本地 profile 误用了生产配置。

排查时先确认 `spring.datasource.url` 的最终值，再用数据库客户端验证连接。

## 日常开发建议

- Controller 只做协议适配：参数、状态码、DTO、异常映射。
- Service 承载业务流程和事务边界。
- Repository / Mapper 负责数据访问，不把 HTTP、Session、权限对象传进数据层。
- 配置类集中管理基础设施 Bean，避免业务类里到处 `new RestTemplate()` 或 `new ObjectMapper()`。
- 异常统一处理，给前端稳定错误码和可读消息，日志中保留内部原因。
- 自动配置优先用默认，真正需要差异时再定制 Bean 或配置项。
- 生产端点、日志、指标和健康检查从项目第一天就接入，不要等出问题后再补。
