# 条件语句

## if / else if / else

`if` 根据条件决定执行哪段代码。条件必须是 `boolean` 类型，不能像 C/C++ 那样用整数。

```java
public class IfElseDemo {
    public static void main(String[] args) {
        int score = 86;

        if (score >= 90) {
            System.out.println("优秀");
        } else if (score >= 80) {
            System.out.println("良好");
        } else if (score >= 60) {
            System.out.println("及格");
        } else {
            System.out.println("不及格");
        }
    }
}
```

条件从上到下依次判断，命中一个分支后其余分支全部跳过。

## 嵌套 if

`if` 内部可以再写 `if`，用于多层判断。

```java
public class NestedIfDemo {
    public static void main(String[] args) {
        int age = 25;
        boolean hasLicense = true;

        if (age >= 18) {
            if (hasLicense) {
                System.out.println("可以开车");
            } else {
                System.out.println("年龄达标但没有驾照");
            }
        } else {
            System.out.println("未成年，不能开车");
        }
    }
}
```

::: warning 注意嵌套深度
嵌套超过两层时可读性急剧下降。考虑提取为独立方法，或用 `&&` 合并条件：
:::

```java
// 等价的扁平写法
if (age >= 18 && hasLicense) {
    System.out.println("可以开车");
} else if (age >= 18) {
    System.out.println("年龄达标但没有驾照");
} else {
    System.out.println("未成年，不能开车");
}
```

## 浮点数比较的精度问题

浮点数运算存在舍入误差，直接用 `==` 比较可能得到意外结果。

```java
public class FloatCompareDemo {
    public static void main(String[] args) {
        double a = 0.1 + 0.2;
        double b = 0.3;

        System.out.println(a);          // 0.30000000000000004
        System.out.println(a == b);     // false
    }
}
```

正确做法是判断差值是否小于一个极小值（epsilon）：

```java
public class FloatEpsilonDemo {
    public static void main(String[] args) {
        double a = 0.1 + 0.2;
        double b = 0.3;
        double epsilon = 1e-10;

        if (Math.abs(a - b) < epsilon) {
            System.out.println("a 和 b 在精度范围内相等");
        }

        // 金额计算应使用 BigDecimal
        java.math.BigDecimal x = new java.math.BigDecimal("0.1")
                .add(new java.math.BigDecimal("0.2"));
        java.math.BigDecimal y = new java.math.BigDecimal("0.3");
        System.out.println(x.compareTo(y) == 0);  // true
    }
}
```

::: tip
涉及金额等需要精确计算的场景，一律使用 `BigDecimal`，不要用 `double` 或 `float`。
:::

## switch 语句：传统写法

传统 `switch` 使用 `case` / `break` / `default` 关键字。

```java
public class SwitchTraditionalDemo {
    public static void main(String[] args) {
        int day = 3;

        switch (day) {
            case 1:
                System.out.println("星期一");
                break;
            case 2:
                System.out.println("星期二");
                break;
            case 3:
                System.out.println("星期三");
                break;
            case 4:
                System.out.println("星期四");
                break;
            case 5:
                System.out.println("星期五");
                break;
            default:
                System.out.println("周末");
                break;
        }
    }
}
```

## fall-through 行为

如果某个 `case` 忘记写 `break`，程序会继续执行下一个 `case` 的代码，这就是 **fall-through**。

```java
public class FallThroughDemo {
    public static void main(String[] args) {
        int level = 1;

        switch (level) {
            case 1:
                System.out.println("开始新手教程");
                // 没有 break，会穿透到 case 2
            case 2:
                System.out.println("解锁基础功能");
                // 继续穿透到 case 3
            case 3:
                System.out.println("开放全部功能");
                break;
            default:
                System.out.println("未知等级");
        }
        // 输出:
        // 开始新手教程
        // 解锁基础功能
        // 开放全部功能
    }
}
```

::: warning
fall-through 大多数情况是 bug 而非有意为之。如果确实需要穿透，应加上注释说明意图：
:::

```java
case 1:
case 2:
    // 1 和 2 执行相同逻辑
    System.out.println("低优先级");
    break;
```

## 增强 switch 表达式（Java 14+）

Java 14 引入了使用 `->` 箭头语法的 switch 表达式，不需要 `break`，不会 fall-through。

```java
public class SwitchArrowDemo {
    public static void main(String[] args) {
        String level = "A";

        // switch 作为表达式直接返回值
        String result = switch (level) {
            case "A" -> "优秀";
            case "B" -> "良好";
            case "C" -> "及格";
            default -> "不及格";
        };

        System.out.println(result);  // 优秀
    }
}
```

### 用 yield 返回值

当 `case` 分支需要多条语句时，用 `{ yield value; }` 返回结果。

```java
public class SwitchYieldDemo {
    public static void main(String[] args) {
        String op = "+";
        int a = 10, b = 3;

        int result = switch (op) {
            case "+" -> {
                int sum = a + b;
                yield sum;
            }
            case "-" -> {
                yield a - b;
            }
            case "*", "x" -> a * b;  // 多个值匹配同一分支
            default -> {
                System.out.println("未知运算符");
                yield 0;
            }
        };

        System.out.println(a + " " + op + " " + b + " = " + result);  // 10 + 3 = 13
    }
}
```

::: tip
增强 switch 表达式必须覆盖所有可能的值（穷举），否则编译报错。对于枚举类型尤其严格。
:::

## switch 匹配 String

`switch` 可以直接匹配 `String`，底层使用 `equals()` 比较，区分大小写。

```java
public class SwitchStringDemo {
    public static void main(String[] args) {
        String command = "start";

        switch (command.toLowerCase()) {
            case "start" -> System.out.println("启动服务");
            case "stop" -> System.out.println("停止服务");
            case "restart" -> System.out.println("重启服务");
            default -> System.out.println("未知命令: " + command);
        }
    }
}
```

## switch 匹配 enum

枚举是 `switch` 的最佳搭档，编译器能检查是否覆盖了所有枚举值。

```java
public class SwitchEnumDemo {

    enum Season { SPRING, SUMMER, AUTUMN, WINTER }

    public static void main(String[] args) {
        Season current = Season.SUMMER;

        String description = switch (current) {
            case SPRING -> "万物复苏";
            case SUMMER -> "烈日炎炎";
            case AUTUMN -> "秋高气爽";
            case WINTER -> "银装素裹";
        };

        System.out.println("当前季节: " + description);  // 当前季节: 烈日炎炎
    }
}
```

因为 `Season` 只有四个值，上面四个 `case` 已经穷举，不需要 `default` 分支。

## Pattern Matching for switch（Java 17+）

Java 17 正式引入了 switch 的模式匹配（预览功能在 Java 18 正式转正），可以在 `case` 中直接进行类型判断和变量绑定。

```java
public class PatternMatchSwitchDemo {

    static String describe(Object obj) {
        return switch (obj) {
            case Integer i when i > 0  -> "正整数: " + i;
            case Integer i             -> "非正整数: " + i;
            case String s              -> "字符串, 长度=" + s.length();
            case double[] arr          -> "double 数组, 长度=" + arr.length;
            case null                   -> "null";
            default                    -> obj.getClass().getSimpleName();
        };
    }

    public static void main(String[] args) {
        System.out.println(describe(42));           // 正整数: 42
        System.out.println(describe(-3));           // 非正整数: -3
        System.out.println(describe("hello"));      // 字符串, 长度=5
        System.out.println(describe(new double[]{1.0, 2.0}));  // double 数组, 长度=2
    }
}
```

::: tip
`when` 子句称为 **guard**，用于在类型匹配之上增加额外条件。`case null` 可以单独处理空值。
:::
