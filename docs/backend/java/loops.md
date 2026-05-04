# 循环语句

## for 循环：经典三段式

`for` 循环由初始化、条件判断、迭代更新三部分组成，适合已知循环次数的场景。

```java
public class ForClassicDemo {
    public static void main(String[] args) {
        // 打印 1 到 5
        for (int i = 1; i <= 5; i++) {
            System.out.println("第 " + i + " 次");
        }

        // 倒序
        for (int i = 5; i >= 1; i--) {
            System.out.println("倒计时: " + i);
        }

        // 步长为 2
        for (int i = 0; i < 10; i += 2) {
            System.out.print(i + " ");  // 0 2 4 6 8
        }
        System.out.println();
    }
}
```

三段式的执行顺序：`初始化`（仅一次）→ `条件判断` → `循环体` → `迭代更新` → 回到条件判断。

## while 循环：先判断后执行

`while` 在每次执行前检查条件，条件为 `false` 时一次都不执行。

```java
public class WhileDemo {
    public static void main(String[] args) {
        // 计算 1+2+...+100
        int sum = 0;
        int i = 1;
        while (i <= 100) {
            sum += i;
            i++;
        }
        System.out.println("1 到 100 的和 = " + sum);  // 5050

        // 读取直到满足条件
        int num = 1024;
        int steps = 0;
        while (num > 1) {
            num /= 2;
            steps++;
        }
        System.out.println("1024 除以 2 的次数 = " + steps);  // 10
    }
}
```

::: tip
`while` 适用于循环次数不确定、需要在运行时根据条件决定是否继续的场景。
:::

## do-while 循环：先执行后判断

`do-while` 保证循环体至少执行一次，然后才检查条件。

```java
public class DoWhileDemo {
    public static void main(String[] args) {
        // 模拟至少执行一次操作
        int attempts = 0;
        boolean success;

        do {
            attempts++;
            // 模拟：第 3 次尝试才成功
            success = (attempts == 3);
            System.out.println("第 " + attempts + " 次尝试, 成功=" + success);
        } while (!success);

        System.out.println("共尝试 " + attempts + " 次");  // 共尝试 3 次
    }
}
```

典型场景包括：菜单交互（至少显示一次）、重试机制、输入校验。

```java
import java.util.Scanner;

public class InputValidationDemo {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int number;

        do {
            System.out.print("请输入 1-10 之间的数字: ");
            number = scanner.nextInt();
        } while (number < 1 || number > 10);

        System.out.println("你输入了: " + number);
        scanner.close();
    }
}
```

## 增强 for-each 循环

`for (元素类型 变量 : 数组或集合)` 语法简化了遍历，不需要手动管理索引。

```java
public class ForEachDemo {
    public static void main(String[] args) {
        // 遍历数组
        int[] scores = {88, 92, 76, 95, 68};

        int max = Integer.MIN_VALUE;
        for (int s : scores) {
            if (s > max) {
                max = s;
            }
        }
        System.out.println("最高分: " + max);  // 95

        // 遍历字符串数组
        String[] fruits = {"苹果", "香蕉", "橙子"};
        for (String fruit : fruits) {
            System.out.println("水果: " + fruit);
        }

        // 遍历字符串的字符
        for (char c : "Hello".toCharArray()) {
            System.out.print(c + " ");  // H e l l o
        }
        System.out.println();
    }
}
```

::: warning
for-each 循环中无法直接获取索引，也无法修改数组元素（基本类型）。需要修改元素或需要索引时，使用经典 `for` 循环。
:::

## 嵌套循环

循环体内可以再放循环，形成嵌套。外层每执行一次，内层完整执行一轮。

```java
public class NestedLoopDemo {
    public static void main(String[] args) {
        // 打印 5x5 的星号方块
        for (int i = 0; i < 5; i++) {
            for (int j = 0; j < 5; j++) {
                System.out.print("* ");
            }
            System.out.println();
        }
    }
}
```

输出：
```
* * * * *
* * * * *
* * * * *
* * * * *
* * * * *
```

### 打印乘法表

```java
public class MultiplicationTable {
    public static void main(String[] args) {
        for (int i = 1; i <= 9; i++) {
            for (int j = 1; j <= i; j++) {
                System.out.printf("%d×%d=%-4d", j, i, i * j);
            }
            System.out.println();
        }
    }
}
```

输出（前几行）：
```
1×1=1
1×2=2   2×2=4
1×3=3   2×3=6   3×3=9
1×4=4   2×4=8   3×4=12  4×4=16
```

`%-4d` 表示左对齐、占 4 个字符宽度。`printf` 用于格式化输出。

### 打印直角三角形

```java
public class TriangleDemo {
    public static void main(String[] args) {
        int rows = 6;

        for (int i = 1; i <= rows; i++) {
            // 打印前导空格
            for (int s = 0; s < rows - i; s++) {
                System.out.print(" ");
            }
            // 打印星号
            for (int j = 0; j < 2 * i - 1; j++) {
                System.out.print("*");
            }
            System.out.println();
        }
    }
}
```

输出：
```
     *
    ***
   *****
  *******
 *********
***********
```

## 选择合适的循环

| 循环类型 | 适用场景 | 特点 |
|---------|---------|------|
| `for` | 已知循环次数或有明确的索引变量 | 初始化、条件、更新集中在一行 |
| `while` | 循环次数不确定，依赖运行时条件 | 先判断，可能一次不执行 |
| `do-while` | 循环体至少执行一次 | 先执行，再判断 |
| `for-each` | 遍历数组或集合的所有元素 | 简洁，无法获取索引 |

::: tip
在没有特殊需求的情况下，优先选择 `for-each` 遍历集合；需要索引时用经典 `for`；条件驱动用 `while`。
:::

## 无限循环

`for(;;)` 和 `while(true)` 都表示无限循环，必须在循环体内部用 `break` 或 `return` 退出。

```java
public class InfiniteLoopDemo {
    public static void main(String[] args) {
        // for(;;) 写法
        int count = 0;
        for (;;) {
            count++;
            if (count >= 5) {
                System.out.println("for(;;) 循环了 " + count + " 次后退出");
                break;
            }
        }

        // while(true) 写法 —— 等价于 for(;;)
        int sum = 0;
        int n = 1;
        while (true) {
            sum += n;
            n++;
            if (sum > 100) {
                System.out.println("和首次超过 100 时, n=" + n + ", sum=" + sum);
                break;
            }
        }
    }
}
```

输出：
```
for(;;) 循环了 5 次后退出
和首次超过 100 时, n=15, sum=105
```

::: warning
无限循环必须有明确的退出条件，否则程序会永远运行。调试时如果遇到程序卡死，首先检查循环退出逻辑。
:::

常见用途包括：服务器事件循环、轮询任务、用户交互菜单等。

```java
import java.util.Scanner;

public class MenuLoopDemo {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        while (true) {
            System.out.println("=== 菜单 ===");
            System.out.println("1. 查看信息");
            System.out.println("2. 修改设置");
            System.out.println("0. 退出");
            System.out.print("请选择: ");

            int choice = scanner.nextInt();

            switch (choice) {
                case 1 -> System.out.println("显示信息...");
                case 2 -> System.out.println("打开设置...");
                case 0 -> {
                    System.out.println("再见!");
                    scanner.close();
                    return;  // 直接结束 main 方法
                }
                default -> System.out.println("无效选项");
            }
        }
    }
}
```
