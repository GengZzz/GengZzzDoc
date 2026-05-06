<script setup>
import SpringBootAutoConfigDemo from '../../../.vitepress/theme/components/SpringBootAutoConfigDemo.vue'
import SpringBootRequestOpsDemo from '../../../.vitepress/theme/components/SpringBootRequestOpsDemo.vue'
</script>

# 自动配置原理

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
