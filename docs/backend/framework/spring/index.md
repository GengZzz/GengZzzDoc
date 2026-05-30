---
title: "Spring Framework"
description: "Spring 是 Java 后端开发的基础框架，核心是 IoC 容器、依赖注入、AOP 代理和声明式事务。原来的长文已经拆成多个学习章节，建议按左侧顺序阅读。"
---

# Spring Framework

Spring 是 Java 后端开发的基础框架，核心是 IoC 容器、依赖注入、AOP 代理和声明式事务。原来的长文已经拆成多个学习章节，建议按左侧顺序阅读。

## 学习顺序

| 顺序 | 章节 | 学习重点 |
| --- | --- | --- |
| 1 | [概览与定位](./overview) | Spring 解决什么问题，为什么它是基础设施框架 |
| 2 | [IoC 容器与 Bean 生命周期](./ioc-bean-lifecycle) | BeanDefinition、refresh 流程、实例化、初始化、单例池 |
| 3 | [依赖注入与循环依赖](./dependency-injection) | 构造器注入、Setter 注入、三级缓存循环依赖 |
| 4 | [AOP 与事务](./aop-transaction) | 代理对象、事务拦截器、传播行为、失效场景 |
| 5 | [事件、资源与环境](./events-resources-profile) | ApplicationEvent、Resource、Profile、Environment |
| 6 | [测试与日常排查](./testing-practice) | Spring Test、事务测试、常见排查心智模型 |

## 动画重点

- IoC 容器生命周期动画放在“[IoC 容器与 Bean 生命周期](./ioc-bean-lifecycle)”。
- AOP / 事务代理链路动画放在“[AOP 与事务](./aop-transaction)”。
