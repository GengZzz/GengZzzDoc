# 后端框架

后端框架这一组文档聚焦 Java 服务端日常开发中最常见的基础设施能力。

学习顺序建议是：

1. 先看 [Spring](./spring)：理解 IoC、AOP、事务这些底层能力。
2. 再看 [Spring Boot](./springboot)：理解自动配置、起步依赖、配置绑定、内嵌容器和生产可观测能力。
3. 最后看 [MyBatis](./mybatis)：理解 SQL 映射、执行链路、缓存、动态 SQL 和与 Spring 体系的集成。

这三者在日常项目中的关系可以简单理解为：Spring 提供核心容器和基础设施，Spring Boot 负责把工程启动和运行治理做顺，MyBatis 负责让 SQL 与 Java 对象之间的边界更清楚。

## 学习主线

| 技术 | 重点问题 | 日常开发落点 |
| --- | --- | --- |
| Spring | 对象如何创建、装配、代理和参与事务 | Bean 生命周期、依赖注入、AOP、声明式事务 |
| Spring Boot | 应用如何快速启动并获得生产能力 | starter、自动配置、配置绑定、Actuator、打包部署 |
| MyBatis | SQL 如何映射到 Java 方法和对象 | Mapper、动态 SQL、ResultMap、缓存、插件、批量写入 |

## 重难点动画

每个技术页都会把关键机制做成交互动画：

- Spring：IoC 容器生命周期、AOP/事务代理链路。
- Spring Boot：自动配置条件匹配、请求处理与运行监控链路。
- MyBatis：Mapper 执行链路、CacheKey 与缓存边界。
