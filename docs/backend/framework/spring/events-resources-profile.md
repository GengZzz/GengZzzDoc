---
title: "事件机制"
description: "Spring 事件适合做应用内解耦，不适合替代可靠消息队列。"
---

# 事件机制

Spring 事件适合做应用内解耦，不适合替代可靠消息队列。

```java
public record OrderPaidEvent(Long orderId) {}

@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void pay(Long orderId) {
        // update order status
        publisher.publishEvent(new OrderPaidEvent(orderId));
    }
}

@Component
public class CouponListener {
    @EventListener
    public void onOrderPaid(OrderPaidEvent event) {
        // grant coupon
    }
}
```

事务相关事件可以使用 `@TransactionalEventListener`，例如在事务提交后再发通知：

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void afterCommit(OrderPaidEvent event) {
    // send notification after data commit
}
```

默认事件发布可以是同步的，监听器异常会影响发布线程。需要异步时可以结合 `@Async` 和线程池，但要明确失败重试、上下文传递和可观测性。

## 资源加载

Spring 的 `Resource` 抽象统一了 classpath、文件系统、URL、ServletContext 等资源访问方式：

```java
@Component
public class TemplateLoader {
    private final ResourceLoader resourceLoader;

    public TemplateLoader(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public String load() throws IOException {
        Resource resource = resourceLoader.getResource("classpath:/templates/mail.html");
        return resource.getContentAsString(StandardCharsets.UTF_8);
    }
}
```

常见前缀：

- `classpath:`：从类路径加载。
- `file:`：从文件系统加载。
- `http:` / `https:`：从 URL 加载。
- 无前缀：由具体 ApplicationContext 决定默认策略。

配置文件、SQL 初始化脚本、邮件模板、证书、静态资源都可以通过这一套模型处理。

## Profile 与环境配置

Profile 用来按环境启用不同 Bean 或配置。它适合表达“这个 Bean 是否参与当前环境”，不适合承载所有业务开关。

```java
@Configuration
@Profile("dev")
public class DevToolConfig {
    @Bean
    DemoDataInitializer demoDataInitializer() {
        return new DemoDataInitializer();
    }
}
```

也可以在方法上标注：

```java
@Bean
@Profile("prod")
SmsClient aliyunSmsClient() {
    return new AliyunSmsClient();
}
```

实践建议：

- 环境维度用 `dev`、`test`、`staging`、`prod` 等 Profile。
- 业务开关优先使用配置属性，如 `feature.xxx.enabled`。
- 用 `Environment` 或 `@Value` 读取简单值，用 `@ConfigurationProperties` 绑定结构化配置。
- 默认配置要能本地启动，敏感信息通过环境变量或密钥系统注入。
