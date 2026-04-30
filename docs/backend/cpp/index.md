# C++

这套 C++ 文档按“先能写小程序，再理解数据组织，再进入内存、对象、标准库和工程实践”的顺序编排。目录尽量拆细：一个页面只解决一组紧密相关的问题，避免把数组、字符串、内存和类都挤在同一篇里。

## 学习路径

::: details 1. 入门准备
- [起步认识 C++](./getting-started.md)：了解 C++ 适合做什么，以及源码如何变成可执行程序。
- [开发环境安装](./development-environment.md)：安装编译器和编辑器，完成 Hello World。
- [输入与输出](./input-output.md)：学习 `cin`、`cout`、`getline` 和格式化输出。
:::

::: details 2. 语法基础
- [语法、数据与表达式](./syntax-data-expressions.md)：理解程序骨架、变量、常量和表达式。
- [类型转换](./type-conversion.md)：处理整数、小数、字符和字符串之间的转换。
- [控制流与程序逻辑](./control-flow.md)：掌握条件判断和循环。
- [函数与模块化](./functions-modular.md)：把重复逻辑拆成函数。
:::

::: details 3. 数据组织
- [复合类型与内存基础](./compound-types-memory.md)：作为数组、字符串和内存章节的导读。
- [一维数组](./arrays.md)：学习数组声明、遍历、求和和越界问题。
- [二维数组](./multidimensional-arrays.md)：用行列结构表达表格、棋盘和矩阵。
- [C++ 字符串](./strings.md)：掌握 `std::string` 的长度、拼接、查找和截取。
- [字符数组与常用函数](./c-strings.md)：理解 C 风格字符串和 `<cstring>` 常用函数。
:::

::: details 4. 内存与资源
- [指针、引用与资源管理](./pointers-references-resources.md)：理解地址、指针、引用和智能指针。
- [栈、堆与内存模型](./stack-heap-memory.md)：用动画理解函数调用、栈帧和堆资源。
:::

::: details 5. 面向对象
- [类与对象](./classes-objects.md)：学习成员变量、成员函数、构造函数和封装。
- [继承与多态](./inheritance-polymorphism.md)：理解复用、虚函数和运行时多态。
:::

::: details 6. 泛型、标准库与算法
- [模板与泛型编程](./templates-generic.md)：用模板编写适配多种类型的代码。
- [STL 与模板](./stl-templates.md)：学习 `vector`、`map`、`set`、`queue`、`stack` 等容器。
- [常用算法](./common-algorithms.md)：掌握 `sort`、`find`、`count`、`max_element` 等算法。
:::

::: details 7. 进阶与工程
- [输入输出、文件与异常](./io-files-exceptions.md)：学习文件读写和异常处理。
- [现代 C++](./modern-cpp.md)：认识 `auto`、范围 for、`nullptr` 和智能指针。
- [并发编程](./concurrency.md)：理解线程、`join` 和互斥锁。
- [数据结构与算法实践](./algorithms-data-structures.md)：完成查找、排序和综合练习。
- [工程实践](./engineering-practice.md)：学习多文件组织、编译、调试和测试习惯。
:::

## 建议节奏

初学时不要急着跳到指针、类和并发。比较稳的节奏是：

1. 先写通输入、输出、变量、条件和循环。
2. 再掌握数组、字符串和函数。
3. 然后学习指针、引用、栈和堆。
4. 最后进入类、模板、STL、算法和工程实践。

每学完一个章节，至少把文末练习手写一遍。C++ 的理解通常不是“看懂了就会”，而是“敲过、错过、修过”以后才真正稳。
