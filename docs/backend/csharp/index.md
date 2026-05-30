---
title: "C# 技术文档"
description: "C# 是一门运行在 .NET 运行时之上的静态类型语言。日常开发里，它通常围绕 ASP.NET Core、EF Core、异步 IO、LINQ、依赖注入和运行时性能展开。"
---

# C# 技术文档

C# 是一门运行在 .NET 运行时之上的静态类型语言。日常开发里，它通常围绕 ASP.NET Core、EF Core、异步 IO、LINQ、依赖注入和运行时性能展开。

这组文档按“能写业务代码 -> 能读懂运行时行为 -> 能做工程取舍”的顺序组织。入口页只保留学习主线，GC、async/await、LINQ 等机制动画会放在对应正文页，避免一上来信息过载。

## 学习路径

### 1. 入门：建立 .NET 与 C# 的基本地图

| 章节 | 内容 |
| --- | --- |
| [C# 简介与环境搭建](./introduction-setup) | 认识 .NET SDK、项目结构、CLR/JIT/AOT 的基本分工 |
| [基本语法](./basic-syntax) | 变量、类型、表达式、值类型/引用类型、字符串和基础集合 |

### 2. 类型与对象：写清楚业务模型

| 章节 | 内容 |
| --- | --- |
| [控制流与方法](./control-flow-methods) | 分支、循环、方法参数、异常过滤器和常见控制结构 |
| [类与结构体](./classes-structs) | class / struct 的选择、对象初始化、封装和对象布局 |
| [继承与接口](./inheritance-interfaces) | 接口抽象、虚方法、多态和默认接口方法 |
| [模式匹配](./pattern-matching) | `is`、`switch` 表达式、属性模式、列表模式和业务分派 |
| [Record 与不可变设计](./records-immutability) | DTO、值对象、`with` 表达式、浅拷贝风险和不可变集合 |

### 3. 泛型、委托与 LINQ：把数据流写得可组合

| 章节 | 内容 |
| --- | --- |
| [泛型](./generics) | 类型参数、约束、协变逆变和 CLR 泛型实现 |
| [委托、事件与 Lambda](./delegates-events-lambda) | 多播委托链、事件发布订阅、闭包和表达式树 |
| [集合](./collections) | `List<T>`、`Dictionary<TKey,TValue>`、并发集合和只读集合 |
| [LINQ](./linq) | 延迟执行、`IEnumerable`、查询组合、过度 `ToList` 的代价 |
| [LINQ 高级](./linq-advanced) | `IQueryable`、表达式树、Provider 翻译和 EF Core 查询边界 |

### 4. 运行时与异步：理解线上问题从哪里来

| 章节 | 内容 |
| --- | --- |
| [GC 与内存管理](./gc-memory-management) | 三代回收、LOH、Pinned 对象、IDisposable 和泄漏排查 |
| [异常处理](./exception-handling) | 异常体系、过滤器、聚合异常和保留调用栈 |
| [async/await](./async-await) | 状态机、上下文恢复、`ConfigureAwait`、`ValueTask` 和死锁 |
| [并行与并发](./parallel-concurrent) | `TaskScheduler`、线程池、锁、Channel 和生产者消费者 |

### 5. .NET 工程实践：落到真实后端项目

| 章节 | 内容 |
| --- | --- |
| [ASP.NET Core](./aspnet-core) | 中间件管道、Kestrel、Filter、Options 和限流 |
| [Entity Framework Core](./ef-core) | Change Tracker、查询翻译、并发控制、拦截器和批量更新 |
| [依赖注入](./dependency-injection) | 生命周期、作用域陷阱、Keyed Services、工厂和装饰器 |
| [反射与源生成器](./reflection-source-generators) | 元数据读取、Attribute、Emit、Source Generator |
| [性能调优](./performance-tuning) | BenchmarkDotNet、对象池、字符串、缓存行和 SIMD |

## 学习建议

C# 的学习节奏可以按“业务可读性优先，运行时机制兜底”来推进：

1. 先能用类型、集合、LINQ 和 async/await 写出清楚的接口代码。
2. 再理解 GC、委托、表达式树、线程池这些背后的运行机制。
3. 最后把 ASP.NET Core、EF Core、DI 和性能调优放到完整项目里一起看。
