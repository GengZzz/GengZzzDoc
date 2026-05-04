# JVM 基础

Java 虚拟机（JVM）是 Java 程序的运行平台。Java 源码编译为 `.class` 字节码后，由 JVM 加载、验证并执行。理解 JVM 的工作原理有助于编写更高效的代码和排查性能问题。

## 类加载过程

类加载是 JVM 将 `.class` 文件读入内存并转化为 `java.lang.Class` 对象的过程，分为五个阶段：

```
加载 → 验证 → 准备 → 解析 → 初始化
```

| 阶段 | 说明 |
|------|------|
| **加载** | 通过类的全限定名找到 `.class` 文件，读取字节流，创建 `Class` 对象 |
| **验证** | 检查字节码的格式正确性、安全性（魔数 `0xCAFEBABE`、版本号等） |
| **准备** | 为类的静态变量分配内存并赋零值（`int` → 0，`boolean` → false，引用 → null） |
| **解析** | 将符号引用（字符串形式的类名、方法名）替换为直接引用（内存地址） |
| **初始化** | 执行静态变量赋值和静态代码块 |

```java
public class LoadingExample {
    // 准备阶段: count 被初始化为 0
    // 初始化阶段: count 被赋值为 42
    static int count = 42;

    // 初始化阶段执行
    static {
        System.out.println("静态代码块执行");
    }
}
```

::: tip 类加载的触发时机
类在第一次被使用时加载：创建对象（`new`）、访问静态成员、反射调用（`Class.forName()`）、子类加载时触发父类加载。
:::

## 类加载器

Java 使用三层类加载器，遵循**双亲委派模型**：

```
Bootstrap ClassLoader     ← 启动类加载器（加载 rt.jar，C++ 实现）
        ↓
Extension ClassLoader     ← 扩展类加载器（加载 jre/lib/ext/*.jar）
        ↓
Application ClassLoader   ← 应用类加载器（加载 classpath 下的类）
        ↓
    Custom ClassLoader    ← 自定义类加载器（可选）
```

双亲委派的工作方式：收到加载请求时，先委托父加载器处理，父加载器无法完成时才自己加载。

```java
public class ClassLoaderExample {
    public static void main(String[] args) {
        // String 由 Bootstrap ClassLoader 加载（返回 null，因为是 C++ 实现）
        System.out.println(String.class.getClassLoader()); // null

        // 当前类由 Application ClassLoader 加载
        System.out.println(
            ClassLoaderExample.class.getClassLoader().getName() // AppClassLoader
        );

        // 查看类加载器的层级关系
        ClassLoader loader = ClassLoaderExample.class.getClassLoader();
        while (loader != null) {
            System.out.println(loader);
            loader = loader.getParent();
        }
    }
}
```

::: tip 双亲委派的作用
防止核心类被篡改。如果用户自定义了 `java.lang.String`，双亲委派会优先加载 JDK 自带的版本，避免安全问题。需要打破双亲委派的场景（如 SPI、热部署）需自定义类加载器。
:::

## 运行时数据区

JVM 在运行时将内存划分为多个区域：

```
┌──────────────────────────────────────────────┐
│                  JVM 进程                      │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ 方法区    │  │   堆     │  │  直接内存    │ │
│  │(Metaspace)│  │  (Heap)  │  │(Direct Mem) │ │
│  │ 线程共享  │  │ 线程共享  │  │             │ │
│  └──────────┘  └──────────┘  └─────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │           线程私有区域                    │  │
│  │  ┌──────────┬──────────┬─────────────┐  │  │
│  │  │虚拟机栈   │本地方法栈  │程序计数器    │  │  │
│  │  │(per thread)│         │  (PC)       │  │  │
│  │  └──────────┴──────────┴─────────────┘  │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 方法区（Metaspace）

存储类的元信息：类名、方法信息、字段信息、常量池、静态变量、即时编译后的代码。

- Java 7 及之前称为永久代（PermGen），在 JVM 堆中
- Java 8+ 改为元空间（Metaspace），使用本地内存，仅受操作系统可用内存限制
- 可通过 `-XX:MetaspaceSize` 和 `-XX:MaxMetaspaceSize` 控制

### 堆（Heap）

所有对象实例和数组都在堆上分配（JIT 逃逸分析可能做栈上分配优化）。堆是垃圾回收（GC）的主要区域。

- 新生代（Young Generation）：存放新创建的对象
- 老年代（Old Generation）：存放长期存活的对象
- 通过 `-Xms`（初始大小）和 `-Xmx`（最大大小）设置

### 虚拟机栈（JVM Stack）

每个线程有自己的虚拟机栈。方法调用时创建**栈帧**（Stack Frame），方法返回时销毁。栈帧包含：

- **局部变量表**：方法参数和局部变量
- **操作数栈**：计算过程中的临时数据
- **动态链接**：指向运行时常量池的方法引用
- **方法返回地址**：方法执行完后返回的位置

递归调用过深会抛出 `StackOverflowError`，可通过 `-Xss` 调整栈大小。

### 本地方法栈

为 `native` 方法（C/C++ 编写的方法）服务。`Thread.start0()` 等底层方法使用本地方法栈。

### 程序计数器（PC Register）

每个线程有一个程序计数器，记录当前线程正在执行的字节码指令地址。执行 `native` 方法时，程序计数器值为 `undefined`。这是 JVM 中唯一不会抛出 `OutOfMemoryError` 的区域。

各区域对比：

| 区域 | 线程 | 存储内容 | 异常 |
|------|------|---------|------|
| 方法区 | 共享 | 类信息、常量池、静态变量 | `OutOfMemoryError` |
| 堆 | 共享 | 对象实例、数组 | `OutOfMemoryError` |
| 虚拟机栈 | 私有 | 栈帧（局部变量、操作数栈） | `StackOverflowError` |
| 本地方法栈 | 私有 | Native 方法调用信息 | `StackOverflowError` |
| 程序计数器 | 私有 | 当前指令地址 | 无 |

## 垃圾回收

Java 通过垃圾回收（GC）自动管理内存，开发者无需手动 `free`。GC 的核心问题是：哪些对象可以回收？

### 可达性分析

从 **GC Roots** 出发，沿着引用链遍历。无法到达的对象判定为可回收。

```
GC Roots:
  ├── 虚拟机栈中引用的对象（局部变量）
  ├── 方法区中静态变量引用的对象
  ├── 方法区中常量引用的对象
  ├── 本地方法栈中 native 方法引用的对象
  └── 活跃的线程对象

        GC Root ──► 对象A ──► 对象B (可达，存活)
                          ──► 对象C ──► 对象D (可达，存活)

        对象E ──► 对象F (不可达，可回收)
```

### 分代模型

基于"大部分对象很快死亡"的经验，堆被划分为新生代和老年代：

```
堆
├── 新生代 (Young Generation)    ── 约 1/3 堆空间
│   ├── Eden 区                  ── 新对象在此分配
│   ├── Survivor 0 (S0)         ── 存活对象
│   └── Survivor 1 (S1)         ── 存活对象（S0/S1 交替使用）
│
└── 老年代 (Old Generation)     ── 约 2/3 堆空间
    └── 长期存活的对象
```

对象的晋升过程：
1. 新对象在 Eden 区分配
2. Eden 区满时触发 Minor GC，存活对象复制到 S0
3. 下次 Minor GC，Eden 和 S0 中存活对象复制到 S1，年龄 +1
4. 年龄达到阈值（默认 15）后晋升到老年代
5. 老年代满时触发 Full GC

::: tip Minor GC vs Full GC
**Minor GC** 只回收新生代，速度快、频率高。**Full GC** 回收整个堆（包括老年代），速度慢、应尽量避免频繁触发。
:::

### GC 算法

| 算法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **标记-清除** | 标记存活对象，清除其余 | 实现简单 | 产生内存碎片 |
| **复制** | 将存活对象复制到另一区域 | 无碎片，适合新生代 | 需要额外空间 |
| **标记-整理** | 标记后将存活对象移到一端 | 无碎片 | 整理耗时 |

新生代一般用复制算法（Eden + 两个 Survivor），老年代一般用标记-清除或标记-整理。

### 常见 GC 实现

| GC | 特点 | 适用场景 |
|----|------|---------|
| **Serial** | 单线程，Stop-The-World | 小型应用、客户端模式 |
| **Parallel** | 多线程并行，关注吞吐量 | 后台批处理、科学计算 |
| **CMS** | 并发标记清除，关注延迟（Java 14 已废弃） | 历史项目 |
| **G1** | 分Region，默认 GC（Java 9+） | 大堆、低延迟 |
| **ZGC** | 亚毫秒级暂停（Java 15+ 生产可用） | 大堆、超低延迟 |

::: tip G1 是目前的默认选择
Java 9 起 G1 为默认 GC。它将堆划分为多个 Region，优先回收垃圾最多的 Region（Garbage-First）。适合 4GB 以上的堆。如果需要更低延迟（暂停 < 1ms），考虑 ZGC。
:::

<JavaGCProcessDemo />

## JVM 常用参数

```bash
# 堆内存
-Xms512m          # 初始堆大小
-Xmx2g            # 最大堆大小
-Xmn256m          # 新生代大小

# 元空间
-XX:MetaspaceSize=128m
-XX:MaxMetaspaceSize=256m

# GC 选择
-XX:+UseG1GC                    # 使用 G1（Java 9+ 默认）
-XX:+UseZGC                     # 使用 ZGC
-XX:+UseShenandoahGC            # 使用 Shenandoah GC

# GC 日志（Java 9+）
-Xlog:gc*:file=gc.log:time,uptime,level,tags

# 栈大小
-Xss256m          # 每个线程的栈大小

# OOM 时生成堆转储
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/tmp/heapdump.hprof
```

::: tip 调优建议
生产环境推荐设置 `-Xms` 等于 `-Xmx`，避免运行时频繁扩容。开启 GC 日志用于排查问题。堆大小一般设为物理内存的 1/4 到 1/2，留足空间给操作系统和其他进程。
:::
