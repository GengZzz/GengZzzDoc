# C++

这组笔记以浙江大学翁恺教授《面向对象程序设计 - C++》的课程主线为参考，重新组织为一条更适合自学复习的路径：先建立对象视角，再理解 C++ 如何用类、构造、继承、多态、拷贝、运算符重载、模板、异常、流和 STL 表达这种视角。

这不是把课时逐字搬运，而是把课程里反复强调的思路整理成可查、可练、可继续扩展的文档。

## 学习顺序

### 1. 先让程序跑起来

- [起步认识 C++](./getting-started.md)：知道 C++ 的定位、编译过程和学习边界。
- [开发环境](./development-environment.md)：准备编译器和编辑器。
- [输入与输出](./input-output.md)：用 `cin`、`cout` 写出可交互的小程序。

### 2. 从对象开始，而不是从语法清单开始

- [类与对象](./classes-objects.md)：第一个程序、对象、类、成员变量、成员函数。
- [结构体](./structs.md)：理解数据聚合，再过渡到类。
- [函数](./functions-modular.md)：把动作拆出来，让对象的行为更清楚。

### 3. 掌握对象生命周期

- [类与对象](./classes-objects.md#构造函数)：构造函数、析构函数、初始化列表、对象组合。
- [构造与析构](./constructors-destructors.md)：构造函数类型、三/五法则、explicit、构造函数异常。
- [指针与引用](./pointers-references-resources.md)：理解对象地址、引用传参和资源归属。
- [栈与堆](./stack-heap-memory.md)：分清自动对象和动态对象，写出能正确释放资源的程序。
- [智能指针](./smart-pointers.md)：unique_ptr/shared_ptr/weak_ptr、自定义删除器、循环引用。

### 4. 进入面向对象的核心

- [继承与多态](./inheritance-polymorphism.md)：继承、向上造型、虚函数、动态绑定。
- [运算符重载](./operator-overloading.md)：算术/比较/流运算符、仿函数、类型转换运算符。
- [高级面向对象](./advanced-oop.md)：多继承与虚继承、RTTI、CRTP 模式。
- [现代 C++](./modern-cpp.md)：`const`、引用再研究、拷贝构造、静态成员、C++17/20/23 新特性总览。
- [模板基础](./templates-generic.md)：用类型参数写可复用代码。

### 5. 接上标准库和工程实践

- [STL 容器](./stl-templates.md)：`vector`、`map`、`set` 等常用容器。
- [常用算法](./common-algorithms.md)：让算法作用在范围上，而不是只盯着某个数组。
- [移动语义](./move-semantics.md)：左值/右值、std::move、完美转发、引用折叠。
- [Lambda 表达式](./lambda-expressions.md)：捕获列表、泛型 Lambda、constexpr Lambda。
- [文件与异常](./io-files-exceptions.md)：流、文件读写、异常抛出和捕获。

### 6. 进阶专题

- [高级模板](./advanced-templates.md)：特化、SFINAE、变参模板、折叠表达式、Concepts。
- [并发编程](./concurrency.md)：线程、mutex、内存模型、死锁避免。
- [现代并发](./modern-concurrency.md)：async/future/promise、原子操作、内存顺序、线程池。
- [设计模式](./design-patterns-cpp.md)：Singleton、Factory、Observer、RAII 等 C++ 实现。
- [构建系统](./build-systems.md)：CMake 基础与最佳实践、FetchContent、vcpkg/Conan。
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
