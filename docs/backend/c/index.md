---
title: "C 语言"
description: "C 语言是一门贴近硬件的系统编程语言，从 1972 年 Dennis Ritchie 在贝尔实验室创造至今，仍然是操作系统、嵌入式系统、高性能服务的基石。"
---

# C 语言

C 语言是一门贴近硬件的系统编程语言，从 1972 年 Dennis Ritchie 在贝尔实验室创造至今，仍然是操作系统、嵌入式系统、高性能服务的基石。Linux 内核、Redis、Nginx、SQLite 都用 C 编写。

这组文档从基础语法到系统编程、网络编程、多线程同步，覆盖 C 语言工程开发的核心知识。主线不是背语法，而是围绕日常开发最容易出问题的几条能力展开：编译调试、函数与数组、指针与内存、文件和系统调用、并发与网络。

## 学习路径

| 阶段 | 主题 | 文档入口 |
| --- | --- | --- |
| 入门 | 编译执行流程、Hello World 深入 | [程序设计与 C 语言](./getting-started) |
| 入门 | GCC/Clang、VS Code、CMake、GDB | [开发环境搭建](./development-setup) |
| 基础 | 整型宽度、浮点精度、类型转换 | [数据类型与表达式](./data-types-expressions) |
| 基础 | if/switch/for/while、goto 清理模式 | [判断与循环](./control-flow) |
| 基础 | 参数传递、递归、函数指针、回调、va_list | [函数深入](./functions) |
| 基础 | 多维数组、VLA、数组与指针等价性 | [数组深入](./arrays) |
| 基础 | '\0' 终止、安全函数、宽字符、UTF-8 | [字符串处理](./strings) |
| 基础 | enum、union、typedef、volatile | [高级类型](./advanced-types) |
| 核心难点 | 指针运算、多级指针、void 指针、restrict | [指针深入](./pointers) |
| 核心难点 | malloc/free、realloc、内存池、Valgrind | [动态内存管理](./dynamic-memory) |
| 核心难点 | 地址空间布局、栈帧、缓冲区溢出 | [内存布局](./memory-layout) |
| 复合类型 | 内存对齐、位域、柔性数组、链表 | [结构体与内存对齐](./structs-advanced) |
| 预处理 | 宏陷阱、条件编译、#pragma | [预处理器](./preprocessor) |
| 系统 | 标准 IO vs 系统 IO、错误处理 | [文件 I/O 与错误处理](./file-io-errors) |
| 系统 | fork/exec/wait、信号、管道 | [进程与信号](./processes-signals) |
| 系统 | pthread、互斥锁、条件变量、线程池 | [多线程与同步](./threads-sync) |
| 工程 | socket API、TCP/UDP、epoll | [网络编程](./network-programming) |
| 工程 | Makefile、静态/动态库、GDB、perf | [构建与调试工具](./engineering-tools) |

## 学习建议

如果目标是日常工程开发，建议按这个顺序走：

1. 先把编译、运行、GDB 调通，不要只在在线编译器里写 C。
2. 学完函数后立刻学数组和字符串，因为真实 C 代码大部分错误都出在“指针 + 长度 + 边界”上。
3. 指针、动态内存、内存布局要连续学，中间不要隔太久；这三篇是理解段错误、内存泄漏和越界写入的核心。
4. 系统编程部分先掌握文件 I/O 和错误处理，再进入进程、线程、网络。

## 适用读者

- 有至少一门编程语言基础（Python、Java 等），想系统学习 C 语言
- 学过 C 但对指针、内存管理理解不深，遇到段错误无从下手
- 需要进行系统编程、嵌入式开发或高性能服务开发的工程师
