# Java

这组笔记从零开始学习 Java，覆盖语言基础、面向对象、集合框架、异常处理、设计原则、现代 Java 特性、并发编程和 JVM 原理。每篇文档独立可读，按主题分组组织。

## 学习路径

### 1. 让程序跑起来

- [Java 简介与环境搭建](./introduction-setup.md)：JDK/JRE 是什么，安装开发环境，写出第一个 Hello World。
- [基本输入输出](./basic-io.md)：`System.out.println`、`Scanner` 读取输入。

### 2. 掌握语言基础

- [数据类型与变量](./data-types-variables.md)：8 种基本类型、类型转换、`final` 常量。
- [运算符与表达式](./operators-expressions.md)：算术、比较、逻辑、位运算。
- [字符串](./strings.md)：`String` 不可变性、`equals()` vs `==`、`StringBuilder`。
- [数组](./arrays.md)：声明、初始化、多维数组、`Arrays` 工具类。

### 3. 控制程序流程

- [条件语句](./conditionals.md)：`if`/`else`、`switch`（含 Java 14+ 增强表达式）。
- [循环语句](./loops.md)：`for`、`while`、`do-while`、for-each。
- [跳转与分支](./jump-branch.md)：`break`、`continue`、`return`、标签循环。

### 4. 面向对象核心

- [类与对象](./classes-objects.md)：类定义、`new`、引用语义、栈与堆上的对象。
- [方法详解](./methods.md)：参数传递、重载、可变参数、递归、`static`。
- [封装与访问控制](./encapsulation-access.md)：`private`/default/`protected`/`public`、getter/setter。
- [构造器与初始化](./constructors-initialization.md)：构造方法、`this()`/`super()` 链、初始化块。
- [继承](./inheritance.md)：`extends`、`super`、`@Override`、`final`。
- [多态](./polymorphism.md)：动态分派、向上/向下转型、`instanceof`。
- [抽象类与接口](./abstraction-interfaces.md)：抽象方法、接口（含 `default`/`static`）、`sealed`。
- [内部类与匿名类](./inner-anonymous-classes.md)：成员内部类、静态嵌套类、匿名类。

### 5. 集合与泛型

- [集合框架概述](./collections-overview.md)：`Collection` 体系结构、如何选择容器。
- [List 与 ArrayList / LinkedList](./list-arraylist-linkedlist.md)：动态数组、链表、常用操作。
- [Set 与 Map](./set-map.md)：`HashSet`、`TreeSet`、`HashMap`、`TreeMap`、`equals`/`hashCode` 契约。
- [泛型详解](./generics.md)：泛型类/方法、通配符、PECS 原则、类型擦除。
- [迭代器与比较器](./iterators-comparators.md)：`Iterator`、`Comparable` vs `Comparator`。

### 6. 异常处理与 I/O

- [异常体系与处理](./exceptions.md)：`try`/`catch`/`finally`、checked vs unchecked、`try-with-resources`。
- [自定义异常](./custom-exceptions.md)：异常设计原则、异常链。
- [文件 I/O](./file-io.md)：字节流/字符流、`BufferedReader`、NIO.2 `Files` 工具类。

### 7. 设计原则与模式

- [代码复用与消除重复](./design-reuse.md)：DRY 原则、提取方法/类。
- [封装变化与可扩展性](./design-extensibility.md)：开闭原则、策略模式。
- [控制反转与 MVC](./ioc-mvc.md)：依赖注入、MVC 分层。
- [常用设计模式](./design-patterns.md)：Singleton、Factory、Observer、Strategy、Builder。

### 8. 现代 Java（Java 8+）

- [Lambda 表达式](./lambda.md)：Lambda 语法、方法引用 `::`。
- [函数式接口](./functional-interfaces.md)：`Function`、`Predicate`、`Consumer`、`Supplier`。
- [Stream API](./stream-api.md)：中间操作、终端操作、惰性求值、并行流。
- [Optional 类](./optional.md)：空值安全、链式操作。
- [记录类与密封类](./records-sealed.md)：`record`、`sealed class/interface`。

### 9. 并发编程

- [线程基础](./thread-basics.md)：`Thread`、`Runnable`、线程生命周期、`Callable`/`Future`。
- [线程同步](./thread-synchronization.md)：`synchronized`、`volatile`、`Lock`、死锁。
- [并发工具类](./concurrency-utils.md)：`ExecutorService`、`CompletableFuture`、并发集合。

### 10. JVM 与工程实践

- [JVM 基础](./jvm-basics.md)：类加载、运行时数据区、垃圾回收。
- [注解与反射](./annotations-reflection.md)：内置注解、自定义注解、反射 API。
- [工程实践](./engineering.md)：Maven 基础、项目结构、JUnit 5。
