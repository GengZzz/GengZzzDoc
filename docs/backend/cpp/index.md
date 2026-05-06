# C++

这组笔记把 C++ 按日常开发会遇到的问题重新组织：先让程序跑起来，再把类型、对象、生命周期、资源管理、泛型标准库、并发和工程实践串成一条主线。

学习 C++ 最容易被语法细节淹没。这里的重点不是背每个关键字，而是持续理解三件事：对象在哪里、资源归谁管、接口如何避免误用。

## 学习顺序

### 1. 先让程序跑起来

- [起步认识 C++](./getting-started.md)：知道 C++ 的定位、编译过程和学习边界。
- [开发环境](./development-environment.md)：准备编译器和编辑器。
- [输入与输出](./input-output.md)：用 `cin`、`cout` 写出可交互的小程序。

### 2. 打好语言基础

- [语法与变量](./syntax-data-expressions.md)：类型、变量、表达式和基本运算。
- [类型转换](./type-conversion.md)：隐式转换、显式转换和类型安全边界。
- [条件与循环](./control-flow.md)：把分支和重复逻辑写清楚。
- [函数](./functions-modular.md)：参数传递、返回值和模块拆分。
- [数组](./arrays.md) 与 [字符串](./strings.md)：理解连续内存和常见数据处理方式。

### 3. 把对象生命周期吃透

- [结构体](./structs.md) 与 [类与对象](./classes-objects.md)：从数据聚合过渡到封装行为。
- [构造与析构](./constructors-destructors.md)：对象如何初始化、清理和应对异常。
- [指针与引用](./pointers-references-resources.md)：看清地址、别名和资源归属。
- [栈与堆](./stack-heap-memory.md)：分清自动生命周期和动态生命周期。
- [智能指针](./smart-pointers.md)：用 `unique_ptr`、`shared_ptr`、`weak_ptr` 表达所有权。
- [移动语义](./move-semantics.md)：在不深拷贝的情况下转移资源。

### 4. 建立面向对象设计感

- [继承与多态](./inheritance-polymorphism.md)：虚函数、动态绑定和接口替换。
- [运算符重载](./operator-overloading.md)：让自定义类型自然参与表达式。
- [高级面向对象](./advanced-oop.md)：多继承、RTTI、CRTP 等高级机制的取舍。

### 5. 接上泛型与标准库

- [模板基础](./templates-generic.md)：用类型参数写可复用代码。
- [高级模板](./advanced-templates.md)：特化、SFINAE、变参模板、折叠表达式、Concepts。
- [Lambda 表达式](./lambda-expressions.md)：捕获、闭包对象和泛型 Lambda。
- [STL 容器](./stl-templates.md)：`vector`、`map`、`set` 等常用容器。
- [常用算法](./common-algorithms.md)：让算法作用在范围上，而不是只盯着某个数组。

### 6. 进入工程实践

- [现代 C++](./modern-cpp.md)：`const`、引用、静态成员和 C++17/20/23 特性总览。
- [文件与异常](./io-files-exceptions.md)：流、文件读写、异常抛出和捕获。
- [并发编程](./concurrency.md) 与 [现代并发](./modern-concurrency.md)：线程、锁、原子操作和异步任务。
- [设计模式](./design-patterns-cpp.md)：用 C++ 实现常见设计模式，尤其关注 RAII。
- [构建系统](./build-systems.md)：CMake、依赖管理和跨平台构建。
- [工程实践](./engineering-practice.md)：多文件组织、命名、调试和练习节奏。

## 对应课程主线

| 阶段 | 课程主题 | 文档入口 |
| --- | --- | --- |
| 入门 | 第一个 C++ 程序、什么是对象、面向对象基本概念 | [类与对象](./classes-objects.md) |
| 类 | 头文件、时钟例子、成员变量、构造与析构、对象初始化 | [类与对象](./classes-objects.md) |
| 资源 | `new` / `delete`、访问限制、初始化列表、对象组合 | [类与对象](./classes-objects.md)、[栈与堆](./stack-heap-memory.md) |
| 继承 | 继承、子类父类关系、默认参数、内联函数 | [继承与多态](./inheritance-polymorphism.md)、[现代 C++](./modern-cpp.md) |
| 多态 | `const`、引用、向上造型、多态性、多态实现 | [继承与多态](./inheritance-polymorphism.md)、[现代 C++](./modern-cpp.md) |
| 深入 | 拷贝构造、静态对象、静态成员、运算符重载、类型转换 | [现代 C++](./modern-cpp.md)、[类型转换](./type-conversion.md) |
| 收束 | 模板、异常、流、STL 简述 | [模板基础](./templates-generic.md)、[文件与异常](./io-files-exceptions.md)、[STL 容器](./stl-templates.md) |

## 学习建议

学这门课时，重点不是背语法，而是持续问三个问题：

1. 这个对象保存什么状态？
2. 这个对象对外提供什么行为？
3. 对象创建、复制、销毁时，资源是否仍然清楚？

能把这三个问题说清楚，C++ 的很多难点就会从“语法很多”变成“生命周期和接口设计要想明白”。这也更接近翁恺老师课程里那种从对象关系出发、把程序写清楚的训练方式。
