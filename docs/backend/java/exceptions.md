# Java 异常处理

异常处理是 Java 程序应对运行时错误的核心机制。合理使用异常可以让错误处理逻辑与正常业务逻辑分离，使代码更加清晰和健壮。

## 异常层次结构

Java 中所有异常和错误的根类是 `Throwable`，它有两个直接子类：

```
Throwable
├── Error（系统级错误）
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── ...
└── Exception（程序可处理的异常）
    ├── RuntimeException（非受检异常）
    │   ├── NullPointerException
    │   ├── ArrayIndexOutOfBoundsException
    │   ├── ClassCastException
    │   ├── IllegalArgumentException
    │   ├── NumberFormatException
    │   └── ...
    └── 其他 Exception（受检异常）
        ├── IOException
        ├── SQLException
        ├── FileNotFoundException
        └── ...
```

- **Error**：JVM 层面的严重错误，如内存溢出、栈溢出。程序通常无法恢复，不应该捕获。
- **RuntimeException**：通常是编程错误导致的，编译器不强制处理，称为非受检（unchecked）异常。
- **其他 Exception**：外部因素导致的可预见问题，如文件不存在、网络中断。编译器强制处理，称为受检（checked）异常。

## try-catch-finally

`try-catch` 捕获并处理异常。`finally` 块中的代码无论是否发生异常都会执行，常用于资源清理。

```java
public class TryCatchDemo {
    public static void main(String[] args) {
        try {
            System.out.println("try: 开始执行");
            int result = 10 / 0;
            System.out.println("try: 结果 = " + result); // 不会执行
        } catch (ArithmeticException e) {
            System.out.println("catch: 捕获到异常 - " + e.getMessage());
        } finally {
            System.out.println("finally: 总是执行");
        }
        System.out.println("程序继续运行");
    }
}
```

输出：
```
try: 开始执行
catch: 捕获到异常 - / by zero
finally: 总是执行
程序继续运行
```

::: tip 执行顺序
1. `try` 块中的代码执行到异常抛出点
2. 异常类型匹配后，跳转到对应的 `catch` 块
3. `finally` 块总是执行（即使 `try` 或 `catch` 中有 `return`）
4. `try` 块中异常抛出点之后的代码不再执行
:::

`finally` 即使在 `return` 之后也会执行：

```java
public static int getValue() {
    try {
        return 1;
    } finally {
        System.out.println("finally 仍然执行");
    }
}
```

## 多重 catch

可以为一个 `try` 块提供多个 `catch` 块，分别处理不同类型的异常。子类异常必须写在父类异常前面，否则编译报错。

```java
public class MultiCatchDemo {
    public static void parseAndAccess(String[] args, String path) {
        try {
            String data = Files.readString(Path.of(path));
            int index = Integer.parseInt(args[0]);
            System.out.println(args[index]);
        } catch (FileNotFoundException e) {
            System.out.println("文件不存在: " + e.getMessage());
        } catch (IOException e) {
            System.out.println("IO 错误: " + e.getMessage());
        } catch (NumberFormatException e) {
            System.out.println("数字格式错误: " + e.getMessage());
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("数组越界: " + e.getMessage());
        }
    }
}
```

::: warning 子类异常在前
`FileNotFoundException` 是 `IOException` 的子类，必须放在 `IOException` 之前。如果反过来写，编译器会报错：`FileNotFoundException` 已经被前面的 `IOException` 捕获。
:::

## multi-catch

Java 7 引入了多异常捕获语法，当多个异常需要相同的处理逻辑时，可以用 `|` 合并：

```java
public class MultiCatchSingleBlock {
    public static void handleInput(String input) {
        try {
            int value = Integer.parseInt(input);
            String[] arr = new String[1];
            arr[value] = "data";
        } catch (NumberFormatException | ArrayIndexOutOfBoundsException e) {
            // 同一个 catch 块处理多种异常
            System.out.println("输入错误: " + e.getClass().getSimpleName()
                + " - " + e.getMessage());
        }
    }
}
```

multi-catch 中的异常变量 `e` 是隐式 final 的，不能在 catch 块内重新赋值。

## try-with-resources

对于实现了 `AutoCloseable` 接口的资源，Java 7 引入了 `try-with-resources` 语法，自动在块结束时调用 `close()` 方法。

```java
public class TryWithResourcesDemo {
    public static void copyFile(Path source, Path target) throws IOException {
        try (
            InputStream in = Files.newInputStream(source);
            OutputStream out = Files.newOutputStream(target)
        ) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
        // in 和 out 在这里已经自动关闭
    }
}
```

可以声明多个资源，用分号分隔。资源按声明的逆序关闭。

自定义可关闭资源：

```java
public class DatabaseConnection implements AutoCloseable {
    private String url;

    public DatabaseConnection(String url) {
        this.url = url;
        System.out.println("连接数据库: " + url);
    }

    public void query(String sql) {
        System.out.println("执行查询: " + sql);
    }

    @Override
    public void close() {
        System.out.println("关闭数据库连接: " + url);
    }
}

// 使用
public class ResourceDemo {
    public static void main(String[] args) {
        try (DatabaseConnection conn = new DatabaseConnection("jdbc:mysql://localhost/test")) {
            conn.query("SELECT * FROM users");
        }
        // close() 被自动调用
    }
}
```

## checked 与 unchecked 异常

| | checked 异常 | unchecked 异常 |
| --- | --- | --- |
| 继承关系 | Exception 及其子类（不含 RuntimeException） | RuntimeException 及其子类 |
| 编译要求 | 必须 try-catch 或 throws 声明 | 不强制处理 |
| 典型场景 | 文件操作、网络请求、数据库访问 | 空指针、越界、类型转换 |
| 设计意图 | 让调用者处理可预见的外部失败 | 通常是编程错误，应修复代码 |

checked 异常的处理方式有两种：

```java
// 方式一：try-catch 处理
public void readConfig(Path path) {
    try {
        String content = Files.readString(path);
    } catch (IOException e) {
        System.out.println("读取配置失败: " + e.getMessage());
    }
}

// 方式二：throws 声明抛出，交给上层处理
public String readConfig(Path path) throws IOException {
    return Files.readString(path);
}
```

::: tip 使用原则
- **checked 异常**：调用者有可能并且应该从异常中恢复时使用。例如文件找不到时可以使用默认配置。
- **unchecked 异常**：通常是编程 bug，应该在测试阶段发现并修复。例如空指针说明代码缺少非空检查。
- 不要对所有异常都 catch 后打印了事，这会掩盖真正的问题。
:::

## 常见异常

以下是 Java 中最常见的运行时异常及其产生原因：

```java
// NullPointerException - 对 null 引用调用方法或访问字段
String s = null;
s.length(); // 抛出 NullPointerException

// ArrayIndexOutOfBoundsException - 数组下标越界
int[] arr = {1, 2, 3};
arr[5]; // 抛出 ArrayIndexOutOfBoundsException

// ClassCastException - 类型转换失败
Object obj = "hello";
Integer num = (Integer) obj; // 抛出 ClassCastException

// IllegalArgumentException - 方法收到不合法的参数
public void setAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("年龄不能为负数: " + age);
    }
}

// NumberFormatException - 字符串不能转换为数字
Integer.parseInt("abc"); // 抛出 NumberFormatException
```

## 读取 Stack Trace

当异常未被捕获时，JVM 会打印 Stack Trace（堆栈跟踪），它是调试异常最重要的工具。

以下面的代码为例：

```java
public class StackTraceDemo {
    public static void main(String[] args) {
        method1();
    }

    static void method1() {
        method2();
    }

    static void method2() {
        String s = null;
        s.length(); // NullPointerException
    }
}
```

产生的 Stack Trace：

```
Exception in thread "main" java.lang.NullPointerException
    at StackTraceDemo.method2(StackTraceDemo.java:10)   ← 异常发生的位置
    at StackTraceDemo.method1(StackTraceDemo.java:6)    ← 调用 method2 的位置
    at StackTraceDemo.main(StackTraceDemo.java:2)       ← 调用 method1 的位置
```

阅读 Stack Trace 的要点：

1. **从上往下读**：第一行是异常类型和消息，之后是调用链，最上面的帧是异常发生的位置。
2. **找到自己的代码**：通常前面几帧是 JDK 内部代码，往下找第一个出现在你项目中的类和行号。
3. **Caused by**：当使用异常链时，可能有多层 "Caused by"，表示原始原因。

在代码中打印 Stack Trace：

```java
try {
    method2();
} catch (NullPointerException e) {
    // 打印完整堆栈
    e.printStackTrace();

    // 或者获取堆栈字符串
    StringWriter sw = new StringWriter();
    e.printStackTrace(new PrintWriter(sw));
    String stackTrace = sw.toString();
}
```

::: warning 不要吞掉异常
`catch (Exception e) {}` 空 catch 块是最危险的写法之一。异常发生后程序继续运行，但状态已经不一致，后续可能出现更难定位的问题。至少应该记录日志：`logger.error("操作失败", e)`。
:::
