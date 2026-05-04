# String 与 StringBuilder

## String 不可变性

Java 中 `String` 对象一旦创建，其内容不可修改。任何看似"修改"的操作（拼接、替换、截取等）都会返回一个**全新的 `String` 对象**，原始对象不变。

```java
public class StringImmutability {
    public static void main(String[] args) {
        String s = "Hello";
        String s2 = s.concat(" World");

        System.out.println(s);   // Hello（原对象不变）
        System.out.println(s2);  // Hello World（新对象）

        // 每次拼接都产生新对象 → 频繁拼接时性能差
        String result = "";
        for (int i = 0; i < 5; i++) {
            result = result + i + " ";  // 循环中产生 5 个临时对象
        }
        System.out.println(result); // 0 1 2 3 4
    }
}
```

::: warning 性能陷阱
在循环中用 `+` 拼接字符串会导致大量临时对象，应改用 `StringBuilder`。
:::

---

## 字符串池 (String Pool)

JVM 维护一块**字符串池**，字面量 `"abc"` 会放入池中复用。相同内容的字面量指向同一个对象。

```java
public class StringPool {
    public static void main(String[] args) {
        String a = "abc";
        String b = "abc";
        System.out.println(a == b);      // true — 池中同一对象

        String c = new String("abc");
        System.out.println(a == c);      // false — 堆上新对象
        System.out.println(a.equals(c)); // true — 内容相同

        // intern() 手动入池
        String d = c.intern();
        System.out.println(a == d);      // true
    }
}
```

::: tip 记忆要点
- 字面量赋值 → 走字符串池，`==` 比较为 `true`
- `new String(...)` → 堆上新对象，`==` 比较为 `false`
- 要比较内容始终用 `equals()`
:::

---

## equals() vs ==

- `==`：比较**引用地址**（是否同一对象）
- `equals()`：比较**字符内容**

```java
public class EqualsVsRef {
    public static void main(String[] args) {
        String s1 = "Java";
        String s2 = new String("Java");

        System.out.println(s1 == s2);       // false
        System.out.println(s1.equals(s2));  // true

        // equals() 有 null 安全版本（Java 11+）
        String s3 = null;
        System.out.println("Java".equals(s3));  // false，不会抛异常
        // System.out.println(s3.equals("Java")); // NullPointerException!
    }
}
```

::: warning 永远用 equals() 比较字符串内容
将已知非 null 的字符串放在 `equals` 左侧，可避免空指针异常：`"固定值".equals(变量)`。
:::

---

## 常用方法速查

```java
public class StringMethods {
    public static void main(String[] args) {
        String s = "Hello, World!";

        // 基本信息
        System.out.println(s.length());          // 13
        System.out.println(s.charAt(0));         // H
        System.out.println(s.isEmpty());         // false
        System.out.println(s.isBlank());         // false（Java 11+，空格也算 blank）

        // 截取
        System.out.println(s.substring(0, 5));   // Hello
        System.out.println(s.substring(7));      // World!

        // 查找
        System.out.println(s.indexOf('l'));       // 2（首次出现）
        System.out.println(s.lastIndexOf('l'));   // 10（最后出现）
        System.out.println(s.indexOf("World"));   // 7
        System.out.println(s.contains("World"));  // true

        // 替换
        System.out.println(s.replace('l', 'L'));          // HeLLo, WorLd!
        System.out.println(s.replace("World", "Java"));   // Hello, Java!
        System.out.println(s.replaceAll("[aeiou]", "*")); // H*ll*, W*rld!（正则）
        System.out.println(s.replaceFirst("l", "L"));     // HeLlo, World!

        // 大小写
        System.out.println(s.toUpperCase());  // HELLO, WORLD!
        System.out.println(s.toLowerCase());  // hello, world!

        // 去除首尾空白
        String padded = "  text  ";
        System.out.println(padded.trim());    // "text"
        System.out.println(padded.strip());   // "text"（Java 11+，Unicode 安全）

        // 开头/结尾判断
        System.out.println(s.startsWith("Hello"));  // true
        System.out.println(s.endsWith("!"));         // true

        // 分割
        String csv = "apple,banana,cherry";
        String[] fruits = csv.split(",");
        for (String fruit : fruits) {
            System.out.println(fruit);
        }
        // apple
        // banana
        // cherry

        // 转为字符数组
        char[] chars = "ABC".toCharArray();
        System.out.println(chars[1]);  // B

        // 与基本类型互转
        int num = Integer.parseInt("123");
        String numStr = String.valueOf(456);
        double d = Double.parseDouble("3.14");
    }
}
```

---

## StringBuilder

`StringBuilder` 是**可变**字符序列，适合频繁拼接和修改。

```java
public class StringBuilderDemo {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("Hello");

        // 追加
        sb.append(" ");
        sb.append("World");
        System.out.println(sb);  // Hello World

        // 插入（index 位置之前）
        sb.insert(5, ",");
        System.out.println(sb);  // Hello, World

        // 删除：delete(start, end)，左闭右开
        sb.delete(5, 6);
        System.out.println(sb);  // Hello World

        // 删除单个字符
        sb.deleteCharAt(0);
        System.out.println(sb);  // ello World

        // 替换
        sb.replace(0, 4, "Hi");
        System.out.println(sb);  // Hi World

        // 翻转
        sb.reverse();
        System.out.println(sb);  // dlroW iH

        // 链式调用（所有修改方法返回 this）
        StringBuilder chain = new StringBuilder()
            .append("SELECT * FROM users")
            .append(" WHERE active = true")
            .append(" ORDER BY name");
        System.out.println(chain);

        // 转回 String
        String result = chain.toString();
    }
}
```

::: tip String vs StringBuilder
- 内容不需修改 → `String`
- 需要频繁拼接/修改 → `StringBuilder`
- 多线程共享可变字符串 → `StringBuffer`（同步，较慢）
:::

### 循环拼接对比

```java
public class ConcatPerf {
    public static void main(String[] args) {
        // 方式一：String +（慢，每次循环创建新对象）
        String bad = "";
        for (int i = 0; i < 10000; i++) {
            bad += "a";
        }

        // 方式二：StringBuilder（快，单个对象）
        StringBuilder good = new StringBuilder();
        for (int i = 0; i < 10000; i++) {
            good.append("a");
        }
        String result = good.toString();
    }
}
```

---

## String.join() 与格式化

```java
import java.util.List;
import java.util.Arrays;

public class JoinAndFormat {
    public static void main(String[] args) {
        // String.join() — 用分隔符拼接
        String[] parts = {"2026", "05", "04"};
        String date = String.join("-", parts);
        System.out.println(date);  // 2026-05-04

        List<String> words = List.of("Java", "is", "fun");
        System.out.println(String.join(" ", words));  // Java is fun

        // String.format() — 格式化输出
        String name = "张三";
        int age = 25;
        double score = 95.5;

        String info = String.format("姓名: %s, 年龄: %d, 成绩: %.1f", name, age, score);
        System.out.println(info);  // 姓名: 张三, 年龄: 25, 成绩: 95.5

        // formatted() 实例方法（Java 15+）
        String info2 = "姓名: %s, 年龄: %d".formatted("李四", 30);
        System.out.println(info2);  // 姓名: 李四, 年龄: 30

        // 常用格式符
        System.out.println(String.format("%10s", "hi"));      // "        hi"（右对齐，宽10）
        System.out.println(String.format("%-10s", "hi"));     // "hi        "（左对齐）
        System.out.println(String.format("%08d", 42));         // "00000042"
        System.out.println(String.format("%.2f", 3.14159));   // "3.14"
        System.out.println(String.format("%tY-%<tm-%<td", java.time.LocalDate.now())); // "2026-05-04"
    }
}
```

---

## null 安全

对 `null` 调用方法会抛出 `NullPointerException`。调用前应做空值检查。

```java
import java.util.Objects;

public class NullSafety {
    public static void main(String[] args) {
        String input = null;

        // 错误示范
        // System.out.println(input.length());    // NullPointerException
        // System.out.println(input.equals("x")); // NullPointerException

        // 正确方式一：手动判空
        if (input != null) {
            System.out.println(input.length());
        }

        // 正确方式二：把常量放 equals 左侧
        if ("default".equals(input)) {
            System.out.println("匹配");
        }

        // Java 9+：Objects.requireNonNullElse
        String safe = Objects.requireNonNullElse(input, "默认值");
        System.out.println(safe);  // 默认值

        // Java 11+：判空后执行
        if (input != null && !input.isBlank()) {
            System.out.println("非空且非空白");
        }
    }
}
```

::: warning 防御性编程
接受外部输入（用户输入、API 响应、数据库查询）的字符串变量，使用前必须判空。`"常量".equals(变量)` 是最简洁的 null 安全写法。
:::
