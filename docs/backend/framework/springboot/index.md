---
title: "Spring Boot"
description: "Spring Boot 用约定、starter、自动配置和生产可观测能力，把 Spring 应用的启动、配置、运行和部署流程整理成一条更短的工程路径。原来的长文已经拆分为多章节，建议按左侧顺序学习。"
---

# Spring Boot

Spring Boot 用约定、starter、自动配置和生产可观测能力，把 Spring 应用的启动、配置、运行和部署流程整理成一条更短的工程路径。原来的长文已经拆分为多章节，建议按左侧顺序学习。

## 学习顺序

| 顺序 | 章节 | 学习重点 |
| --- | --- | --- |
| 1 | [概览与 Starter](./overview-starter) | Spring Boot 定位、适用场景、starter 依赖收敛 |
| 2 | [自动配置与条件注解](./auto-configuration) | AutoConfiguration.imports、条件匹配、默认 Bean 与覆盖 |
| 3 | [配置绑定与多环境](./configuration-profile) | ConfigurationProperties、配置优先级、Profile |
| 4 | [Web 容器与启动流程](./web-startup) | 内嵌容器、启动阶段、运行入口 |
| 5 | [请求处理与 Actuator](./request-actuator) | DispatcherServlet、健康检查、指标、运行可观测 |
| 6 | [日志、测试与部署](./testing-deployment) | 日志、测试分层、可执行 Jar、容器化部署 |
| 7 | [常见问题与实践](./troubleshooting-practice) | 端口、Bean 冲突、配置不生效、自动配置排查 |

## 动画重点

- 自动配置条件匹配动画放在“[自动配置与条件注解](./auto-configuration)”。
- 请求处理与运行监控链路动画放在“[请求处理与 Actuator](./request-actuator)”。
