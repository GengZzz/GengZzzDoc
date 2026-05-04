# 基本输入输出

Java 的标准输入输出通过 `System.out`（输出）和 `Scanner`（输入）实现。

## 标准输出

`System.out` 提供三个常用的输出方法：

```java
System.out.println("Hello");   // 输出并换行
System.out.print("Hello");     // 输出不换行
System.out.printf("x = %d", 42);  // 格式化输出，不换行
```

### println 与 print

```java
System.out.print("A");
System.out.print("B");
System.out.println("C");
System.out.println("D");
```

```text
ABC
D
```

`print` 不会在末尾加换行符，`println` 会。

### printf 格式化输出

`printf` 使用格式化字符串，语法与 C 语言的 `printf` 类似：

```java
String name = "Alice";
int age = 25;
double score = 95.5;

System.out.printf("姓名: %s, 年龄: %d, 成绩: %.1f%n", name, age, score);
```

```text
姓名: Alice, 年龄: 25, 成绩: 95.5
```

常用格式说明符：

| 说明符 | 类型 | 示例 |
| --- | --- | --- |
| `%d` | 整数 | `printf("%d", 42)` → `42` |
| `%f` | 浮点数 | `printf("%.2f", 3.1415)` → `3.14` |
| `%s` | 字符串 | `printf("%s", "hi")` → `hi` |
| `%c` | 字符 | `printf("%c", 'A')` → `A` |
| `%b` | 布尔 | `printf("%b", true)` → `true` |
| `%n` | 换行 | 平台无关的换行符 |
| `%%` | 百分号 | `printf("100%%")` → `100%` |

::: tip printf 与 println 的选择
简单输出用 `println`，需要对齐或拼接多个值时用 `printf`。`%n` 比 `\n` 更安全，因为它会自动适配不同操作系统的换行符。
:::

## 标准输入

使用 `Scanner` 类从键盘读取输入：

```java
import java.util.Scanner;

public class InputDemo {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("请输入姓名: ");
        String name = scanner.nextLine();

        System.out.print("请输入年龄: ");
        int age = scanner.nextInt();

        System.out.printf("%s 今年 %d 岁%n", name, age);
        scanner.close();
    }
}
```

```text
请输入姓名: Alice
请输入年龄: 25
Alice 今年 25 岁
```

### Scanner 常用方法

| 方法 | 返回类型 | 说明 |
| --- | --- | --- |
| `nextLine()` | `String` | 读取一整行（含空格） |
| `next()` | `String` | 读取一个单词（遇空格停止） |
| `nextInt()` | `int` | 读取整数 |
| `nextDouble()` | `double` | 读取浮点数 |
| `nextBoolean()` | `boolean` | 读取布尔值 |

::: warning 常见陷阱
`nextInt()` 后调用 `nextLine()` 时，`nextLine()` 会读到 `nextInt()` 遗留的换行符，导致跳过输入。解决方法是在 `nextInt()` 后加一个额外的 `scanner.nextLine()` 消耗掉换行符。
:::

```java
int age = scanner.nextInt();
scanner.nextLine();  // 消耗残留的换行符
String name = scanner.nextLine();  // 现在可以正常读取
```

## 格式化字符串（不输出）

`String.format()` 使用与 `printf` 相同的格式化语法，但返回字符串而不输出：

```java
String msg = String.format("坐标: (%d, %d)", x, y);
```

这在需要构建格式化字符串但不立即输出时很有用。
