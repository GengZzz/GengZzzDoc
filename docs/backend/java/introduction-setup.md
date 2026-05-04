# Java 简介与环境搭建

Java 是一门面向对象的编程语言，由 Sun 公司（现 Oracle）于 1995 年发布。它的核心理念是 **"一次编写，到处运行"**（Write Once, Run Anywhere），通过 JVM 实现跨平台执行。

## JDK 与 JRE

- **JRE**（Java Runtime Environment）：Java 运行时环境，包含 JVM 和核心类库，只用来运行 Java 程序。
- **JDK**（Java Development Kit）：Java 开发工具包，包含 JRE + 编译器 `javac` + 调试工具等。开发 Java 程序需要安装 JDK。

```
JDK
├── jre/           ← 运行时
│   ├── lib/       ← 核心类库
│   └── bin/
│       └── java   ← JVM 启动器
├── bin/
│   ├── javac      ← 编译器
│   ├── jar        ← 打包工具
│   └── jdb        ← 调试器
└── include/       ← JNI 头文件
```

## 安装 JDK

推荐使用 [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 或 [Eclipse Temurin](https://adoptium.net/)（免费长期支持版）。

安装后验证：

```bash
java -version
javac -version
```

输出类似以下内容表示安装成功：

```text
java version "21.0.2" 2024-01-16 LTS
javac 21.0.2
```

::: tip 建议
初学者推荐安装 LTS 版本（Java 17 或 Java 21），有长期支持且特性足够丰富。
:::

## 环境变量

| 变量 | 作用 | 示例值 |
| --- | --- | --- |
| `JAVA_HOME` | JDK 安装目录 | `C:\Program Files\Java\jdk-21` |
| `PATH` | 命令行搜索路径 | 追加 `%JAVA_HOME%\bin` |

配置后在终端中 `java` 和 `javac` 命令应全局可用。

## IDE 选择

| IDE | 特点 |
| --- | --- |
| IntelliJ IDEA | JetBrains 出品，智能提示强大，社区版免费，Java 开发首选 |
| VS Code | 轻量，需安装 Java Extension Pack |
| Eclipse | 老牌 IDE，免费开源 |

推荐使用 **IntelliJ IDEA Community Edition**。

## Hello World

创建文件 `HelloWorld.java`：

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

编译并运行：

```bash
javac HelloWorld.java    # 编译，生成 HelloWorld.class
java HelloWorld          # 运行
```

```text
Hello, World!
```

::: warning 注意
文件名必须与 `public class` 的类名完全一致（包括大小写）。`HelloWorld.java` 中的 `public class` 必须叫 `HelloWorld`。
:::

## 编译与运行过程

```
HelloWorld.java  ──javac──▶  HelloWorld.class  ──java──▶  JVM 执行
  (源代码)                    (字节码)                   (解释/JIT编译)
```

1. `javac` 将 `.java` 源代码编译为 `.class` 字节码文件
2. `java` 命令启动 JVM，加载并执行字节码
3. JVM 可以在任何安装了 JRE 的平台上运行同一个 `.class` 文件

## 项目结构约定

一个典型的 Java 项目结构：

```
my-project/
├── src/                    ← 源代码
│   └── com/example/
│       └── Main.java
├── out/                    ← 编译输出
│   └── com/example/
│       └── Main.class
├── lib/                    ← 第三方库
└── build.gradle            ← 或 pom.xml（构建配置）
```

IDE 创建的项目会自动管理这个结构。
