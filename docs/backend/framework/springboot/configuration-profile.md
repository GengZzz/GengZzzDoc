# 配置绑定

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
