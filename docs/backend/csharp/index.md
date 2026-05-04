# C# 技术文档

C# 是一门面向对象的静态类型语言，运行在 .NET 运行时之上。它拥有自动内存管理（GC）、泛型、LINQ、async/await 等现代语言特性，广泛应用于 Web 后端（ASP.NET Core）、桌面应用、游戏开发（Unity）和云原生服务。

<CSharpGCDemo />

## 学习路径

### 入门

| 章节 | 内容 |
| --- | --- |
| [C# 简介与环境搭建](./introduction-setup) | .NET 生态、CLR 与 JIT 编译、开发环境、dotnet CLI |
| [基本语法](./basic-syntax) | 变量与类型系统、值类型 vs 引用类型、类型转换、字符串插值 |

### 核心语法

| 章节 | 内容 |
| --- | --- |
| [控制流与方法](./control-flow-methods) | if/switch、循环、异常处理、方法参数（ref/out/in）、本地函数 |
| [类与结构体](./classes-structs) | class vs struct、record 类型、属性、索引器、静态构造函数 |
| [继承与接口](./inheritance-interfaces) | virtual/override/sealed、接口默认实现、抽象类 vs 接口、模式匹配 |

### 面向对象进阶

| 章节 | 内容 |
| --- | --- |
| [泛型](./generics) | 泛型类/方法/接口、约束、协变逆变、避免装箱 |
| [委托、事件与 Lambda](./delegates-events-lambda) | Action/Func/Predicate、多播委托、事件、表达式树 |

### 集合与 LINQ

| 章节 | 内容 |
| --- | --- |
| [集合](./collections) | List\<T\> 内部实现、Dictionary 哈希表、Span\<T\>、不可变集合 |
| [LINQ](./linq) | 查询语法 vs 方法语法、延迟执行、IQueryable vs IEnumerable、N+1 问题 |

### 异步编程

| 章节 | 内容 |
| --- | --- |
| [async/await](./async-await) | 状态机原理、Task vs ValueTask、ConfigureAwait、取消令牌 |
| [并行与并发](./parallel-concurrent) | Task.WhenAll、Parallel.For、线程安全集合、锁机制、Channel\<T\> |

### .NET 生态

| 章节 | 内容 |
| --- | --- |
| [ASP.NET Core](./aspnet-core) | 中间件管道、路由与控制器、Minimal API、SignalR |
| [Entity Framework Core](./ef-core) | DbContext 生命周期、关系映射、迁移、查询优化、N+1 问题 |
| [依赖注入](./dependency-injection) | IoC 容器、服务生命周期、Options 模式、单元测试 Mock |

<CSharpAsyncDemo />

<CSharpLINQDemo />
