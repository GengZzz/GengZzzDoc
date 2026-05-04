# Lambda 表达式

Java 8 引入 Lambda 表达式，让代码更简洁，尤其是需要传递行为（函数）作为参数的场景。Lambda 的本质是一个匿名函数，可以赋值给变量、作为参数传递、作为返回值返回。

## 为什么需要 Lambda

在 Java 8 之前，传递一段行为只能通过匿名内部类实现。以排序为例：

```java
import java.util.*;

public class WithoutLambda {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Charlie", "Alice", "Bob");

        // 使用匿名内部类实现自定义排序
        Collections.sort(names, new Comparator<String>() {
            @Override
            public int compare(String a, String b) {
                return a.length() - b.length();
            }
        });

        System.out.println(names); // [Bob, Alice, Charlie]
    }
}
```

匿名内部类每次都要写接口名、方法名、返回类型，真正有用的只有一行代码。Lambda 把这些噪音全部去掉：

```java
import java.util.*;

public class WithLambda {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Charlie", "Alice", "Bob");

        // Lambda 替代匿名内部类
        Collections.sort(names, (a, b) -> a.length() - b.length());

        System.out.println(names); // [Bob, Alice, Charlie]
    }
}
```

从 7 行缩减到 1 行，可读性大幅提升。

## Lambda 语法

Lambda 的基本语法有两种形式：

```text
(参数列表) -> 表达式
(参数列表) -> { 语句块 }
```

```java
import java.util.function.*;

public class LambdaSyntax {
    public static void main(String[] args) {
        // 无参数，表达式形式
        Runnable task = () -> System.out.println("Hello Lambda");
        task.run();

        // 单参数，表达式形式
        Consumer<String> printer = s -> System.out.println(s);
        printer.accept("Java");

        // 多参数，语句块形式
        BinaryOperator<Integer> add = (a, b) -> {
            int result = a + b;
            return result;
        };
        System.out.println(add.apply(3, 5)); // 8

        // 显式声明参数类型
        Comparator<String> byLength = (String a, String b) -> a.length() - b.length();
    }
}
```

## 目标类型

Lambda 没有独立的类型，它的类型由赋值目标或传入参数的类型决定，这叫做**目标类型（Target Typing）**。目标类型必须是**函数式接口**（只有一个抽象方法的接口）。

```java
import java.util.function.*;

public class TargetType {
    public static void main(String[] args) {
        // 同一个 Lambda，不同的目标类型
        Predicate<String> isEmpty = s -> s.isEmpty();
        Function<String, Boolean> isEmptyFunc = s -> s.isEmpty();

        // Lambda 签名相同 (String -> boolean)，但类型不同
        System.out.println(isEmpty.test(""));       // true
        System.out.println(isEmptyFunc.apply(""));   // true

        // Predicate<String> 和 Function<String, Boolean> 不能互换赋值
        // Predicate<String> p = isEmptyFunc; // 编译错误
    }
}
```

## 省略规则

编译器可以根据上下文推断并省略部分语法元素：

```java
import java.util.function.*;
import java.util.*;

public class ShorthandRules {
    public static void main(String[] args) {
        // 规则 1：单参数可省略括号
        Consumer<String> print = s -> System.out.println(s);

        // 规则 2：无参数必须保留空括号
        Runnable run = () -> System.out.println("go");

        // 规则 3：单条语句可省略大括号和 return
        BinaryOperator<Integer> multiply = (a, b) -> a * b;

        // 规则 4：多条语句必须加大括号，需要 return 时必须显式写
        BinaryOperator<Integer> compute = (a, b) -> {
            int sum = a + b;
            int product = a * b;
            return sum + product;
        };

        // 规则 5：参数类型可由编译器推断
        List<String> words = Arrays.asList("banana", "apple", "cherry");
        words.sort((a, b) -> a.compareTo(b)); // a, b 的类型推断为 String
        System.out.println(words); // [apple, banana, cherry]
    }
}
```

## 变量捕获

Lambda 可以访问外部作用域的局部变量，但该变量必须是 **effectively final**——即初始化后从未被重新赋值。

```java
import java.util.function.*;

public class VariableCapture {
    public static void main(String[] args) {
        String greeting = "Hello"; // effectively final
        int multiplier = 3;        // effectively final

        Consumer<String> say = name -> {
            // 可以读取外部变量
            System.out.println(greeting + ", " + name + "!");
            // greeting = "Hi"; // 编译错误：不能修改外部局部变量
        };
        say.accept("Java"); // Hello, Java!

        // 使用数组绕过 effectively final 限制（不推荐）
        int[] counter = {0};
        Runnable increment = () -> counter[0]++; // 引用不变，修改内容
        increment.run();
        increment.run();
        System.out.println(counter[0]); // 2
    }
}
```

::: warning effectively final 约束
Lambda 不能对外部局部变量进行赋值操作。这是因为 Lambda 可能在另一个线程中执行，Java 选择不引入复杂的共享内存模型来处理 Lambda 内的变量。实例字段和静态变量不受此限制。
:::

## 方法引用

方法引用是 Lambda 的进一步简化。当 Lambda 体只是调用一个已有方法时，可以用 `::` 替代。

### 静态方法引用

`ClassName::staticMethod`，对应 `(args) -> ClassName.staticMethod(args)`。

```java
import java.util.function.*;
import java.util.*;

public class StaticMethodRef {
    public static void main(String[] args) {
        // Lambda 写法
        Function<String, Integer> parseLambda = s -> Integer.parseInt(s);

        // 方法引用写法
        Function<String, Integer> parseInt = Integer::parseInt;
        System.out.println(parseInt.apply("42")); // 42

        // 对列表中每个字符串转整数
        List<String> numbers = Arrays.asList("1", "2", "3");
        List<Integer> ints = new ArrayList<>();
        numbers.forEach(s -> ints.add(Integer.parseInt(s)));
        System.out.println(ints); // [1, 2, 3]
    }
}
```

### 实例方法引用

`instance::method`，对应 `(args) -> instance.method(args)`。

```java
import java.util.function.*;
import java.util.*;

public class InstanceMethodRef {
    public static void main(String[] args) {
        String prefix = "[INFO] ";

        // Lambda 写法
        Consumer<String> logLambda = msg -> System.out.println(prefix + msg);

        // 这里 prefix.concat 不是实例方法引用的典型场景
        // 但 println 是
        Consumer<String> print = System.out::println;
        print.accept("Hello from instance method ref");
    }
}
```

### 任意对象方法引用

`ClassName::method`，当方法属于参数本身时使用，对应 `(obj, args) -> obj.method(args)`。

```java
import java.util.*;

public class ArbitraryObjectMethodRef {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Charlie", "Alice", "Bob");

        // Lambda 写法：按字符串长度排序
        names.sort((a, b) -> a.compareToIgnoreCase(b));

        // 方法引用写法：String::compareToIgnoreCase 等价于 (a, b) -> a.compareToIgnoreCase(b)
        List<String> names2 = Arrays.asList("Charlie", "Alice", "Bob");
        names2.sort(String::compareToIgnoreCase);
        System.out.println(names2); // [Alice, Bob, Charlie]

        // 每个元素调用 toUpperCase
        List<String> upper = new ArrayList<>();
        names2.forEach(s -> upper.add(s.toUpperCase()));
        System.out.println(upper); // [ALICE, BOB, CHARLIE]

        // 用方法引用配合 map
        // names2.stream().map(String::toUpperCase).collect(Collectors.toList());
    }
}
```

### 构造器引用

`ClassName::new`，对应 `() -> new ClassName()`。

```java
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class ConstructorRef {
    public static void main(String[] args) {
        // 无参构造器
        Supplier<List<String>> listFactory = ArrayList::new;
        List<String> list = listFactory.get();
        list.add("Hello");
        System.out.println(list); // [Hello]

        // 带参构造器
        List<String> words = Arrays.asList("Hello", "World");

        // Lambda 写法
        List<StringBuilder> builders1 = words.stream()
            .map(s -> new StringBuilder(s))
            .collect(Collectors.toList());

        // 构造器引用写法
        List<StringBuilder> builders2 = words.stream()
            .map(StringBuilder::new)
            .collect(Collectors.toList());

        System.out.println(builders2); // [Hello, World]
    }
}
```

## Lambda vs 匿名内部类

Lambda 和匿名内部类都能实现函数式接口，但有本质区别：

```java
public class LambdaVsAnonymous {
    public static void main(String[] args) {
        // 匿名内部类：this 指向匿名类实例
        Runnable anon = new Runnable() {
            @Override
            public void run() {
                // this 指向当前匿名 Runnable 实例
                System.out.println(this.getClass().getName());
            }
        };

        // Lambda：this 指向外部类实例
        Runnable lambda = () -> {
            // this 指向 LambdaVsAnonymous 实例
            System.out.println(this.getClass().getName());
        };

        anon.run();
        lambda.run();
    }
}
```

主要区别：

| 特性 | Lambda | 匿名内部类 |
|------|--------|-----------|
| `this` 指向 | 外部类实例 | 匿名类自身实例 |
| 可实现的类型 | 只能是函数式接口 | 可以是类或接口 |
| 新的作用域 | 不创建新作用域 | 创建新的作用域 |
| 字节码 | `invokedynamic` + 方法句柄 | 独立的 `.class` 文件 |
| 可读性 | 更简洁 | 冗长但直观 |

::: tip 选择建议
能用 Lambda 就用 Lambda，更简洁高效。仅当需要实现抽象类、多个方法的接口、或需要访问 `this` 指向自身时，才使用匿名内部类。
:::
