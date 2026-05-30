---
title: "Spring Boot"
description: "Spring Boot 是 Spring 生态里用于快速构建应用的工程化框架。它的目标不是替代 Spring Framework。"
---

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
