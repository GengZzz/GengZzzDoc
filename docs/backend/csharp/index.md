# C# 技术文档

C# 是一门面向对象的静态类型语言，运行在 .NET 运行时之上。它拥有自动内存管理（GC）、泛型、LINQ、async/await 等现代语言特性，广泛应用于 Web 后端（ASP.NET Core）、桌面应用、游戏开发（Unity）和云原生服务。

<CSharpGCDemo />

## 学习路径

### 入门

| 章节 | 内容 |
| --- | --- |
| [C# 简介与环境搭建](./introduction-setup) | CLR 内部架构（MethodTable/EEClass/Stub）、JIT 编译详细流程、Tiered Compilation、Dynamic PGO、AOT vs JIT 权衡 |
| [基本语法](./basic-syntax) | 值类型 vs 引用类型的精确内存分配规则、装箱拆箱 IL 分析、struct 字段对齐、string 驻留池、Span\<T\> 零拷贝 |

### 核心语法

| 章节 | 内容 |
| --- | --- |
| [控制流与方法](./control-flow-methods) | switch 模式匹配完整语法、异常过滤器 when、ref/in/out 参数的 IL 差异、方法内联条件 |
| [类与结构体](./classes-structs) | class 对象头（SyncBlockIndex + MethodTablePointer）、struct 选择指南（6 个判定条件）、record 编译器生成代码、init vs set vs required |
| [继承与接口](./inheritance-interfaces) | 虚方法表 vtable、接口调度性能、默认接口方法的菱形继承、sealed override、模式匹配完整指南 |
| [模式匹配](./pattern-matching) | is 模式、switch 表达式完整语法、属性模式（嵌套）、列表模式（C# 11）、关系模式、编译优化 |

### 面向对象进阶

| 章节 | 内容 |
| --- | --- |
| [泛型](./generics) | CLR 泛型共享机制（引用类型共享、值类型特化）、泛型约束完整列表、协变逆变的类型安全证明 |
| [委托、事件与 Lambda](./delegates-events-lambda) | 多播委托链内部实现、事件线程安全模式、Lambda 表达式树遍历与修改、表达式树编译为 SQL |
| [Record 与不可变设计](./records-immutability) | record class vs record struct 编译器生成代码、with 表达式浅拷贝陷阱、不可变集合内部实现 |

### 集合与 LINQ

| 章节 | 内容 |
| --- | --- |
| [集合](./collections) | List\<T\> 扩容策略、Dictionary .NET 8 开放寻址法、ConcurrentDictionary 分段锁、FrozenDictionary（.NET 8） |
| [LINQ](./linq) | yield return 状态机编译产物、延迟执行原理、IEnumerable vs IQueryable、N+1 查询、过度 ToList 的内存问题 |
| [LINQ 高级](./linq-advanced) | 自定义 LINQ Provider 实现要点、表达式树访问者模式、表达式树修改与编译、EF Core 表达式树翻译为 SQL |

### 内存与异常

| 章节 | 内容 |
| --- | --- |
| [GC 与内存管理](./gc-memory-management) | 三代回收详细流程、LOH 碎片化、GC 模式（Workstation/Server/Background）、IDisposable 完整模式、内存泄漏排查 |
| [异常处理](./exception-handling) | 异常层次结构、异常性能开销、异常过滤器 when 的执行时机、AggregateException 解包、ExceptionDispatchInfo 保留堆栈 |

### 异步编程

| 章节 | 内容 |
| --- | --- |
| [async/await](./async-await) | AsyncTaskMethodBuilder 内部实现、SynchronizationContext 演进、ValueTask + IValueTaskSource 复用、异步死锁案例、ConfigureAwaitOptions（.NET 8+） |
| [并行与并发](./parallel-concurrent) | TaskScheduler 工作原理、ThreadPool Hill Climbing 算法、ReaderWriterLockSlim 实现原理、Channel\<T\> 完整生产者消费者模式 |

<CSharpAsyncDemo />

### .NET 生态

| 章节 | 内容 |
| --- | --- |
| [ASP.NET Core](./aspnet-core) | 中间件管道 RequestDelegate 委托链、Kestrel 连接处理流程、Filters 执行顺序图解、Options 模式绑定、Rate Limiting（.NET 7+） |
| [Entity Framework Core](./ef-core) | Change Tracker 状态机详解、查询编译缓存、并发控制（RowVersion）、Shadow Property、拦截器、ExecuteUpdate/Delete |
| [依赖注入](./dependency-injection) | IServiceProvider 解析流程、Scoped 陷阱（Captive Dependency）、Keyed Services（.NET 8）、工厂注册、装饰器模式 |
| [反射与源生成器](./reflection-source-generators) | 反射 API（Type/MethodInfo/PropertyInfo）、Attribute 自定义与读取、Emit 动态代码生成、Source Generator 原理与实战 |
| [性能调优](./performance-tuning) | BenchmarkDotNet 使用、对象池（ObjectPool/ArrayPool\<T\>）、字符串处理优化、缓存行（False Sharing）、SIMD（Vector\<T\>） |

<CSharpLINQDemo />
