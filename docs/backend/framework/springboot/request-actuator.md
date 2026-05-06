<script setup>
import SpringBootAutoConfigDemo from '../../../.vitepress/theme/components/SpringBootAutoConfigDemo.vue'
import SpringBootRequestOpsDemo from '../../../.vitepress/theme/components/SpringBootRequestOpsDemo.vue'
</script>

# 请求处理与可观测链路

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
