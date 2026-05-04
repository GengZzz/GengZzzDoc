# 运算符与表达式

运算符是对操作数执行运算的符号。Java 提供了丰富的运算符，覆盖算术、比较、逻辑、位操作、赋值等场景。理解运算符的行为和优先级是编写正确表达式的基础。

## 算术运算符

| 运算符 | 含义 | 示例 |
|--------|------|------|
| `+` | 加法 | `3 + 2 → 5` |
| `-` | 减法 | `3 - 2 → 1` |
| `*` | 乘法 | `3 * 2 → 6` |
| `/` | 除法 | `7 / 2 → 3`（整数除法截断） |
| `%` | 取余 | `7 % 2 → 1` |

::: warning 整数除法截断
两个整数相除时，结果的小数部分被直接丢弃，不做四舍五入。如果需要小数结果，至少有一个操作数必须是浮点类型。
:::

```java
public class ArithmeticDemo {
    public static void main(String[] args) {
        int a = 7, b = 2;

        System.out.println("a + b = " + (a + b));   // 9
        System.out.println("a - b = " + (a - b));   // 5
        System.out.println("a * b = " + (a * b));   // 14
        System.out.println("a / b = " + (a / b));   // 3（截断）
        System.out.println("a % b = " + (a % b));   // 1

        // 浮点除法保留小数
        System.out.println("7.0 / 2 = " + (7.0 / 2));  // 3.5

        // 取余在浮点数上也能用
        System.out.println("7.5 % 2 = " + (7.5 % 2));  // 1.5

        // 负数取余的符号与被除数一致
        System.out.println("-7 % 3 = " + (-7 % 3));     // -1
        System.out.println("7 % -3 = " + (7 % -3));     // 1
    }
}
```

## 比较运算符

比较运算符的结果总是 `boolean` 类型。

| 运算符 | 含义 |
|--------|------|
| `==` | 等于 |
| `!=` | 不等于 |
| `>` | 大于 |
| `<` | 小于 |
| `>=` | 大于等于 |
| `<=` | 小于等于 |

```java
public class ComparisonDemo {
    public static void main(String[] args) {
        int x = 10, y = 20;

        System.out.println("x == y : " + (x == y));  // false
        System.out.println("x != y : " + (x != y));  // true
        System.out.println("x > y  : " + (x > y));   // false
        System.out.println("x < y  : " + (x < y));   // true
        System.out.println("x >= 10: " + (x >= 10));  // true
        System.out.println("y <= 20: " + (y <= 20));  // true

        // 浮点数比较需谨慎
        double d1 = 0.1 + 0.2;
        double d2 = 0.3;
        System.out.println("0.1+0.2 == 0.3: " + (d1 == d2));  // 可能是 false

        // 引用类型用 equals() 比较内容
        String s1 = new String("hello");
        String s2 = new String("hello");
        System.out.println("s1 == s2:      " + (s1 == s2));       // false（不同对象）
        System.out.println("s1.equals(s2): " + s1.equals(s2));   // true（内容相同）
    }
}
```

::: tip == 与 equals()
- 对基本类型，`==` 比较值。
- 对引用类型，`==` 比较是否为同一个对象（地址），`equals()` 比较内容是否相同（前提是类正确重写了 `equals()`）。
- 字符串比较永远使用 `equals()`，不要用 `==`。
:::

## 逻辑运算符

| 运算符 | 含义 | 短路 |
|--------|------|------|
| `&&` | 逻辑与 | 是：左侧为 `false` 时右侧不求值 |
| `\|\|` | 逻辑或 | 是：左侧为 `true` 时右侧不求值 |
| `!` | 逻辑非 | 否 |
| `&` | 逻辑与（不短路） | 否 |
| `\|` | 逻辑或（不短路） | 否 |

```java
public class LogicalDemo {
    public static void main(String[] args) {
        boolean a = true, b = false;

        System.out.println("a && b : " + (a && b));   // false
        System.out.println("a || b : " + (a || b));   // true
        System.out.println("!a     : " + (!a));        // false
        System.out.println("!b     : " + (!b));        // true

        // 短路求值的实际意义
        String text = null;
        // 如果 text 为 null，text.length() 不会执行，避免 NullPointerException
        if (text != null && text.length() > 0) {
            System.out.println("非空字符串");
        } else {
            System.out.println("text 为 null 或空字符串");  // 输出这个
        }
    }
}
```

::: tip 短路求值的实际用途
短路求值不仅是性能优化，更是避免运行时错误的关键手段。当左侧条件可以保证右侧操作的安全性时（如空指针检查），短路求值是必不可少的模式。在绝大多数场景下应使用 `&&` 和 `||`，而不是 `&` 和 `|`。
:::

## 位运算符

位运算直接对整数的二进制位进行操作。

| 运算符 | 含义 | 说明 |
|--------|------|------|
| `&` | 按位与 | 两位都为 1 时结果为 1 |
| `\|` | 按位或 | 任一位为 1 时结果为 1 |
| `^` | 按位异或 | 两位不同时结果为 1 |
| `~` | 按位取反 | 0 变 1，1 变 0 |
| `<<` | 左移 | 低位补 0 |
| `>>` | 带符号右移 | 高位补符号位 |
| `>>>` | 无符号右移 | 高位补 0 |

```java
public class BitwiseDemo {
    public static void main(String[] args) {
        int a = 0b1010;  // 10
        int b = 0b1100;  // 12

        System.out.println("a & b  = " + (a & b));    // 0b1000 = 8
        System.out.println("a | b  = " + (a | b));    // 0b1110 = 14
        System.out.println("a ^ b  = " + (a ^ b));    // 0b0110 = 6
        System.out.println("~a     = " + (~a));       // -11（全部取反）

        // 移位
        int n = 1;
        System.out.println("1 << 3  = " + (n << 3));   // 8（左移 3 位 = 乘以 2^3）
        System.out.println("8 >> 2  = " + (8 >> 2));    // 2（右移 2 位 = 除以 2^2）
        System.out.println("-8 >> 2 = " + (-8 >> 2));   // -2（带符号右移，保留符号）
        System.out.println("-8 >>> 2= " + (-8 >>> 2));  // 1073741822（无符号右移）

        // 实际应用：权限标志位
        int READ    = 0b001;  // 1
        int WRITE   = 0b010;  // 2
        int EXECUTE = 0b100;  // 4

        int perm = READ | WRITE;  // 授予读写权限 = 0b011 = 3
        System.out.println("有读权限: " + ((perm & READ) != 0));     // true
        System.out.println("有执行权限: " + ((perm & EXECUTE) != 0)); // false

        perm = perm ^ READ;  // 撤销读权限
        System.out.println("撤销读后有读权限: " + ((perm & READ) != 0));  // false
    }
}
```

## 赋值运算符

| 运算符 | 等价于 |
|--------|--------|
| `=` | — |
| `+=` | `a = a + x` |
| `-=` | `a = a - x` |
| `*=` | `a = a * x` |
| `/=` | `a = a / x` |
| `%=` | `a = a % x` |

复合赋值运算符会自动进行窄化转换，不需要显式强制转换。

```java
public class AssignmentDemo {
    public static void main(String[] args) {
        int x = 10;
        x += 5;   // x = x + 5 → 15
        x -= 3;   // x = x - 3 → 12
        x *= 2;   // x = x * 2 → 24
        x /= 4;   // x = x / 4 → 6
        x %= 4;   // x = x % 4 → 2
        System.out.println("x = " + x);  // 2

        // 复合赋值的自动窄化
        byte b = 10;
        // b = b + 5;   // 编译错误：int 不能赋值给 byte
        b += 5;          // 正确：等价于 b = (byte)(b + 5)
        System.out.println("b = " + b);  // 15
    }
}
```

## 三目运算符

三目运算符 `condition ? valueIfTrue : valueIfFalse` 是 `if-else` 的表达式版本，可以用在需要值的地方。

```java
public class TernaryDemo {
    public static void main(String[] args) {
        int score = 85;
        String result = score >= 60 ? "及格" : "不及格";
        System.out.println(result);  // 及格

        // 嵌套三目（不推荐过度嵌套，降低可读性）
        String grade = score >= 90 ? "A"
                     : score >= 80 ? "B"
                     : score >= 60 ? "C"
                     : "D";
        System.out.println("grade = " + grade);  // B

        // 用三目求最大值
        int a = 10, b = 20;
        int max = a > b ? a : b;
        System.out.println("max = " + max);  // 20
    }
}
```

## 自增自减运算符

`++` 和 `--` 可以前置（`++x`）或后置（`x++`），区别在于表达式返回的值不同。

| 写法 | 行为 |
|------|------|
| `++x` | 先加 1，再使用新值 |
| `x++` | 先使用旧值，再加 1 |
| `--x` | 先减 1，再使用新值 |
| `x--` | 先使用旧值，再加 1 |

```java
public class IncrementDemo {
    public static void main(String[] args) {
        int a = 5;
        System.out.println("a++ = " + a++);  // 5（先返回旧值，然后 a 变成 6）
        System.out.println("a   = " + a);    // 6

        int b = 5;
        System.out.println("++b = " + (++b));  // 6（先加 1，再返回）
        System.out.println("b   = " + b);      // 6

        int c = 10;
        System.out.println("c-- = " + c--);  // 10（先返回旧值，然后 c 变成 9）
        System.out.println("c   = " + c);    // 9

        // 混合使用——合法但极度不推荐
        int d = 1;
        int e = d++ + ++d;
        // d++ 返回 1，d 变成 2；++d 先把 d 变成 3，返回 3
        System.out.println("e = " + e);  // 4
    }
}
```

::: warning 谨慎使用自增自减在复杂表达式中
在同一个表达式中多次修改同一个变量（如 `d++ + ++d`）虽然语法合法，但会严重降低代码可读性。在实际项目中，应将自增自减作为独立语句使用，避免嵌入复杂表达式。
:::

## 字符串拼接运算符

当 `+` 的任一操作数是 `String` 类型时，`+` 执行字符串拼接而非算术加法。拼接是从左到右依次进行的。

```java
public class StringConcatDemo {
    public static void main(String[] args) {
        String name = "Java";
        int version = 21;

        // 字符串 + 任何类型 = 拼接
        String msg = "Hello " + name + " " + version;
        System.out.println(msg);  // Hello Java 21

        // 注意运算顺序
        System.out.println("1 + 2 = " + 1 + 2);    // "1 + 2 = 12"（拼接）
        System.out.println("1 + 2 = " + (1 + 2));   // "1 + 2 = 3"（先算加法）

        // 数字之间的 + 仍然是加法，直到遇到 String
        System.out.println(1 + 2 + " result");       // "3 result"
        System.out.println("result " + 1 + 2);       // "result 12"

        // 任何对象与 String 拼接都会调用 toString()
        int[] arr = {1, 2, 3};
        System.out.println("arr = " + arr);  // arr = [I@xxxxxx（数组的默认 toString）

        // 空字符串可用于类型转换
        String numStr = "" + 42;  // int → String
        System.out.println("numStr = " + numStr);  // "42"
    }
}
```

::: tip 字符串拼接性能
在循环中用 `+` 拼接字符串会创建大量临时对象。如果需要频繁拼接，请使用 `StringBuilder`。
:::

## instanceof 运算符

`instanceof` 用于在运行时检查对象是否是某个类或其子类的实例。

```java
public class InstanceofDemo {
    public static void main(String[] args) {
        Object obj = "Hello";

        if (obj instanceof String) {
            String s = (String) obj;
            System.out.println("是字符串，长度 = " + s.length());
        }

        // Java 16+ 模式匹配：检查并转换一步完成
        if (obj instanceof String s) {
            System.out.println("模式匹配，长度 = " + s.length());
        }
    }
}
```

::: tip instanceof 的更多内容
`instanceof` 在继承与多态章节中有更详细的讨论，包括与接口的关系、在 `equals()` 方法中的典型用法，以及使用多态替代 `instanceof` 判断的设计建议。
:::

## 运算符优先级

从高到低排列，同一行优先级相同。实际编码中建议用括号明确优先级，而不是依赖记忆。

| 优先级 | 运算符 | 结合方向 |
|--------|--------|----------|
| 1 | `()` `[]` `.` | 左→右 |
| 2 | `++` `--`（后置） | 左→右 |
| 3 | `++` `--`（前置） `+`（正） `-`（负） `~` `!` | 右→左 |
| 4 | `*` `/` `%` | 左→右 |
| 5 | `+` `-` | 左→右 |
| 6 | `<<` `>>` `>>>` | 左→右 |
| 7 | `<` `<=` `>` `>=` `instanceof` | 左→右 |
| 8 | `==` `!=` | 左→右 |
| 9 | `&` | 左→右 |
| 10 | `^` | 左→右 |
| 11 | `\|` | 左→右 |
| 12 | `&&` | 左→右 |
| 13 | `\|\|` | 左→右 |
| 14 | `?:` | 右→左 |
| 15 | `=` `+=` `-=` `*=` `/=` `%=` 等 | 右→左 |

```java
public class PrecedenceDemo {
    public static void main(String[] args) {
        // 乘除优先于加减
        int a = 2 + 3 * 4;     // 14，不是 20

        // 比较优先于逻辑
        boolean b = true || false && false;  // true（先算 &&，再算 ||）

        // 用括号消除歧义——推荐做法
        int c = (2 + 3) * 4;   // 20
        boolean d = (true || false) && false;  // false

        System.out.println("a = " + a);  // 14
        System.out.println("b = " + b);  // true
        System.out.println("c = " + c);  // 20
        System.out.println("d = " + d);  // false
    }
}
```

::: warning 用括号代替记忆
不要依赖运算符优先级来写出没有括号的复杂表达式。`a + b * c >> d == e ? f : g` 这样的代码即使是 Java 专家也难以一眼看懂。加几对括号不会影响性能，但能大幅提高可读性和正确性。
:::
