---
title: "Laravel"
description: "Laravel 是 PHP 生态中偏工程化和全栈体验的 Web framework，适合构建后台管理、API 服务、任务队列、定时任务、文件上传、权限认证和中小型业务系统。"
---

# Laravel

Laravel 是 PHP 生态中偏工程化和全栈体验的 Web framework，适合构建后台管理、API 服务、任务队列、定时任务、文件上传、权限认证和中小型业务系统。学习 Laravel 不应该只背 Artisan 命令，而要理解一次请求如何经过路由、服务容器、中间件、控制器、模型、队列和事件。

## 学习顺序

| 顺序 | 章节 | 学习重点 |
| --- | --- | --- |
| 1 | [概览、目录与路由](./overview-routing) | 应用目录、入口文件、路由分组、控制器边界 |
| 2 | [服务容器与服务提供者](./container-service-provider) | 依赖注入、绑定、解析、Provider 启动阶段 |
| 3 | [请求生命周期与中间件](./request-middleware-controller) | Kernel、Middleware、Controller、Response |
| 4 | [Eloquent 与查询设计](./eloquent-query) | Model、关系、N+1、Scope、事务 |
| 5 | [校验、认证与测试](./validation-auth-testing) | FormRequest、Guard、Policy、Feature Test |
| 6 | [队列、任务与部署实践](./queue-deployment-practice) | Job、Event、Scheduler、缓存、配置、上线清单 |

## 动画重点

- 请求生命周期动画放在“[请求生命周期与中间件](./request-middleware-controller)”。
- Eloquent 关系加载与 N+1 优化动画放在“[Eloquent 与查询设计](./eloquent-query)”。
