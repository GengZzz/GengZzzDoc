---
title: "日志"
description: "Spring Boot 默认使用 SLF4J + Logback。业务代码只依赖日志门面："
---

# 日志

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
