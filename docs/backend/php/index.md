---
title: "PHP 技术文档"
description: "PHP 是一门面向 Web 后端的服务端语言。现代 PHP 不只是模板脚本，它已经形成了以 Composer、PSR 规范、PHP-FPM、OPcache、PDO、Laravel/Symfony、队列和容器化部署为核心的…"
---

# PHP 技术文档

PHP 是一门面向 Web 后端的服务端语言。现代 PHP 不只是模板脚本，它已经形成了以 Composer、PSR 规范、PHP-FPM、OPcache、PDO、Laravel/Symfony、队列和容器化部署为核心的完整工程体系。

这组文档按日常开发路径组织：先能写接口和业务代码，再理解数组、zval、闭包、对象模型、数据库事务、HTTP 生命周期、Laravel 架构，最后落到安全、性能、部署和生产排查。

## 学习路径

### 1. 入门与运行环境

| 章节 | 日常开发关注点 |
| --- | --- |
| [PHP 简介与环境搭建](./introduction-setup) | PHP 版本选择、Composer、php.ini、CLI、内置 Web Server、运行模式 |
| [语言基础](./language-basics) | 变量、控制流、函数、字符串、超全局变量和请求输入 |

这一阶段的目标不是背所有函数，而是能独立跑起项目、理解 `composer install`、`php -S`、`php-fpm` 分别解决什么问题。

### 2. 类型、函数与内存语义

| 章节 | 日常开发关注点 |
| --- | --- |
| [类型系统](./type-system) | `strict_types`、联合类型、枚举、`mixed/never/void`、类型转换陷阱 |
| [函数与闭包](./functions-closures) | 回调、闭包捕获、箭头函数、高阶函数、`__invoke` |

PHP 的坑常常出现在“看起来能自动转换”的地方。后端项目建议尽量开启 `declare(strict_types=1)`，把边界输入先验证、再进入业务函数。

### 3. 对象模型与可维护代码

| 章节 | 日常开发关注点 |
| --- | --- |
| [类与对象](./classes-objects) | 类型化属性、构造器属性提升、`readonly`、trait 冲突处理 |
| [继承与接口](./inheritance-interfaces) | 抽象类、接口、后期静态绑定、trait / interface / abstract class 的取舍 |
| [魔术方法与属性](./magic-methods-attributes) | `__get/__set`、`ArrayAccess`、Attributes、ReflectionAttribute |

日常业务里，不要把 magic method 当成常规接口。它适合框架扩展点和兼容层，普通业务模型优先使用明确方法和类型声明。

### 4. 数据处理与数据库

| 章节 | 日常开发关注点 |
| --- | --- |
| [数组与数据结构](./arrays-data) | HashTable、packed array、Copy-on-Write、SPL、生成器 |
| [文件 I/O 与流](./file-io-stream) | 大文件读取、stream context、上传处理、临时文件 |
| [PDO 数据库操作](./database-pdo) | 连接参数、预处理语句、事务、读写分离、批量插入 |
| [Eloquent 模型](./eloquent-models) | 关系建模、N+1、模型事件、Accessor/Mutator、Query Builder 取舍 |

这是 PHP 后端最常用的一组能力。重点是把“数据规模”和“事务边界”想清楚：大文件不要一次读进内存，批量写入不要逐条 SQL，事务里不要做外部 HTTP 请求。

### 5. Web 请求、框架与异步

| 章节 | 日常开发关注点 |
| --- | --- |
| [HTTP 与 Session](./http-sessions) | 请求处理、Cookie、Session 后端、CSRF、文件上传安全 |
| [Laravel 架构](./laravel-architecture) | 请求生命周期、服务容器、服务提供者、Facade、中间件管道 |
| [Laravel 进阶](./laravel-advanced) | 队列、事件监听、任务调度、通知、API Resource、Form Request |
| [异步与并发](./async-concurrency) | Fibers、Swoole、RoadRunner、长生命周期 Worker 状态管理 |

Laravel 项目排查问题时，可以沿着“路由 -> 中间件 -> 控制器 -> 服务层 -> 模型/数据库 -> 响应”这条链路找，不要只盯控制器。

### 6. 扩展、安全、部署与调优

| 章节 | 日常开发关注点 |
| --- | --- |
| [扩展与 FFI](./extensions-ffi) | 常用扩展、OPcache、FFI、扩展编译基本流程 |
| [Web 安全](./security) | SQL 注入、XSS、CSRF、密码哈希、Composer 审计 |
| [部署](./deployment) | Nginx + PHP-FPM、FPM 进程池、Docker 多阶段构建、环境变量 |
| [性能与调试](./performance-debugging) | OPcache、JIT、Xdebug、Blackfire、502/504、内存泄漏、慢请求 |

生产环境优先关注四件事：PHP-FPM 进程池是否耗尽、OPcache 是否命中、数据库慢查询是否拖住请求、错误日志是否能定位到具体请求。

## 重难点动画

| 动画 | 对应章节 | 解决的问题 |
| --- | --- | --- |
| Zval 写时复制 | [类型系统](./type-system) / [语言基础](./language-basics) | 理解变量赋值、引用、COW 和循环引用 |
| PHP 数组 HashTable | [数组与数据结构](./arrays-data) | 理解 list/map 混用、稀疏键、`array_values()` 和内存开销 |
| PDO 事务流程 | [PDO 数据库操作](./database-pdo) | 理解转账、库存扣减这类强一致写入该如何提交或回滚 |
| Laravel 请求生命周期 | [Laravel 架构](./laravel-architecture) | 理解请求从 Nginx/FPM 到中间件、控制器、响应的完整路径 |
| PHP-FPM 进程池 | [部署](./deployment) | 理解 `pm.max_children`、请求排队、502/504 和内存预算 |
| OPcache 缓存机制 | [性能与调试](./performance-debugging) | 理解源码编译、Opcodes 缓存、preload 和 JIT 的适用边界 |

## 学习建议

1. 写业务接口时，优先练 `strict_types`、DTO/Form Request、PDO/Eloquent 事务、统一异常处理。
2. 做数据处理时，重点看数组、生成器、文件流、批量写入，不要把所有数据一次性塞进内存。
3. 上生产前，重点检查 `.env`、FPM 进程池、OPcache、日志、慢查询、队列失败重试和 Composer 安全审计。
4. 排查线上问题时，先看 Nginx/PHP-FPM 错误日志，再看应用日志和数据库慢查询，最后再进入性能分析器。
