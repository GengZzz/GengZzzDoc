---
title: "常见启动和配置问题"
description: "现象：启动失败，日志出现 Port 8080 was already in use。"
---

# 常见启动和配置问题

## 端口被占用

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
