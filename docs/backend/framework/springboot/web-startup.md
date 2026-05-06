# 内嵌 Web 容器

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
