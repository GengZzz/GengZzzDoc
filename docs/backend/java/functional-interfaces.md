# 函数式接口

函数式接口是只有一个抽象方法的接口，是 Lambda 表达式和方法引用的类型基础。Java 8 在 `java.util.function` 包中提供了一组标准函数式接口，覆盖了绝大多数常见场景。

## @FunctionalInterface 注解

`@FunctionalInterface` 是一个可选但推荐的注解，标记一个接口为函数式接口。编译器会检查该接口是否恰好只有一个抽象方法，如果有多个则报错。

```java
@FunctionalInterface
interface Greeting {
    String greet(String name);
}

// 编译错误：Multiple non-overriding abstract methods
// @FunctionalInterface
// interface BadInterface {
//     void methodA();
//     void methodB();
// }

public class FunctionalInterfaceCheck {
    public static void main(String[] args) {
        // Lambda 实现函数式接口
        Greeting hello = name -> "Hello, " + name + "!";
        System.out.println(hello.greet("Java")); // Hello, Java!
    }
}
```

::: tip default 方法不影响
函数式接口可以有任意数量的 `default` 方法和 `static` 方法，只要**抽象方法只有一个**即可。`@FunctionalInterface` 的作用是让编译器帮你守住这条底线。
:::

## 核心函数式接口

`java.util.function` 包提供了以下标准接口：

### Function\<T, R\>

接收一个参数 T，返回结果 R。用于类型转换、数据映射。

```java
import java.util.function.*;

public class FunctionDemo {
    public static void main(String[] args) {
        // String -> Integer：取长度
        Function<String, Integer> length = String::length;
        System.out.println(length.apply("Hello")); // 5

        // Integer -> String：转字符串
        Function<Integer, String> toString = Object::toString;
        System.out.println(toString.apply(42)); // "42"

        // 链式组合：先取长度，再转字符串
        Function<String, String> pipeline = length.andThen(toString);
        System.out.println(pipeline.apply("Hello")); // "5"

        // compose：先执行参数，再执行自身
        Function<String, Integer> composed = toString.andThen(length).andThen(toString);
        System.out.println(composed.apply("Hi")); // "2"
    }
}
```

### Predicate\<T\>

接收一个参数 T，返回 boolean。用于条件判断、过滤。

```java
import java.util.function.*;

public class PredicateDemo {
    public static void main(String[] args) {
        Predicate<String> notEmpty = s -> !s.isEmpty();
        System.out.println(notEmpty.test(""));    // false
        System.out.println(notEmpty.test("Hi"));  // true

        Predicate<Integer> isEven = n -> n % 2 == 0;
        Predicate<Integer> isPositive = n -> n > 0;

        // and：同时满足两个条件
        Predicate<Integer> isEvenAndPositive = isEven.and(isPositive);
        System.out.println(isEvenAndPositive.test(4));   // true
        System.out.println(isEvenAndPositive.test(-2));  // false

        // or：满足任一条件
        Predicate<Integer> isEvenOrPositive = isEven.or(isPositive);
        System.out.println(isEvenOrPositive.test(-2)); // true（是偶数）

        // negate：取反
        Predicate<Integer> isOdd = isEven.negate();
        System.out.println(isOdd.test(3)); // true
    }
}
```

### Consumer\<T\>

接收一个参数 T，不返回结果。用于执行副作用操作（打印、存储等）。

```java
import java.util.function.*;
import java.util.*;

public class ConsumerDemo {
    public static void main(String[] args) {
        Consumer<String> print = System.out::println;
        print.accept("Hello Consumer"); // Hello Consumer

        // andThen：链式执行多个 Consumer
        Consumer<String> upperThenPrint = s -> System.out.println(s.toUpperCase());
        Consumer<String> pipeline = print.andThen(upperThenPrint);
        pipeline.accept("hello");
        // 输出：
        // hello
        // HELLO

        // 批量处理
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
        names.forEach(name -> System.out.println("Hi, " + name));
    }
}
```

### Supplier\<T\>

不接收参数，返回结果 T。用于延迟计算、工厂模式。

```java
import java.util.function.*;
import java.time.*;

public class SupplierDemo {
    public static void main(String[] args) {
        // 提供当前时间
        Supplier<LocalDateTime> now = LocalDateTime::now;
        System.out.println(now.get());  // 2026-05-04T...
        System.out.println(now.get());  // 时间稍有变化

        // 工厂方法
        Supplier<StringBuilder> sbFactory = StringBuilder::new;
        StringBuilder sb = sbFactory.get();
        sb.append("Built by supplier");
        System.out.println(sb); // Built by supplier
    }
}
```

### UnaryOperator\<T\>

接收 T，返回 T。是 `Function<T, T>` 的特化版本，输入输出类型相同。

```java
import java.util.function.*;
import java.util.*;

public class UnaryOperatorDemo {
    public static void main(String[] args) {
        UnaryOperator<String> toUpper = String::toUpperCase;
        System.out.println(toUpper.apply("hello")); // HELLO

        UnaryOperator<Integer> doubleIt = n -> n * 2;
        System.out.println(doubleIt.apply(5)); // 10

        // 批量操作
        List<String> words = new ArrayList<>(Arrays.asList("java", "stream", "lambda"));
        words.replaceAll(String::toUpperCase);
        System.out.println(words); // [JAVA, STREAM, LAMBDA]
    }
}
```

### BinaryOperator\<T\>

接收两个 T，返回 T。是 `BiFunction<T, T, T>` 的特化版本。

```java
import java.util.function.*;
import java.util.*;

public class BinaryOperatorDemo {
    public static void main(String[] args) {
        BinaryOperator<Integer> sum = Integer::sum;
        System.out.println(sum.apply(3, 7)); // 10

        // 求较大值
        BinaryOperator<Integer> max = BinaryOperator.maxBy(Comparator.naturalOrder());
        System.out.println(max.apply(3, 7)); // 7

        // 求较小值
        BinaryOperator<Integer> min = BinaryOperator.minBy(Comparator.naturalOrder());
        System.out.println(min.apply(3, 7)); // 3

        // reduce 中使用
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
        int total = numbers.stream().reduce(0, Integer::sum);
        System.out.println(total); // 15
    }
}
```

### BiFunction\<T, U, R\>

接收两个参数 T 和 U，返回结果 R。

```java
import java.util.function.*;

public class BiFunctionDemo {
    public static void main(String[] args) {
        // 字符串 + 数字 -> 重复拼接
        BiFunction<String, Integer, String> repeat = (s, n) -> s.repeat(n);
        System.out.println(repeat.apply("Ha", 3)); // HaHaHa

        // andThen：将 BiFunction 的结果继续交给 Function 处理
        BiFunction<Integer, Integer, String> addThenFormat =
            (a, b) -> String.valueOf(a + b);
        Function<String, String> wrap = s -> "[" + s + "]";

        BiFunction<Integer, Integer, String> pipeline = addThenFormat.andThen(wrap);
        System.out.println(pipeline.apply(3, 5)); // [8]
    }
}
```

## 组合方法速查

标准函数式接口提供的组合方法：

| 接口 | 方法 | 说明 |
|------|------|------|
| `Function<T,R>` | `andThen(Function<R,V>)` | 先执行自身，再执行参数 |
| `Function<T,R>` | `compose(Function<V,T>)` | 先执行参数，再执行自身 |
| `Predicate<T>` | `and(Predicate<T>)` | 短路与 |
| `Predicate<T>` | `or(Predicate<T>)` | 短路或 |
| `Predicate<T>` | `negate()` | 取反 |
| `Consumer<T>` | `andThen(Consumer<T>)` | 依次执行 |
| `UnaryOperator<T>` | 继承自 `Function` | 组合方式同 Function |

## 自定义函数式接口

当标准接口不满足需求时，可以定义自己的函数式接口：

```java
@FunctionalInterface
interface Converter<F, T> {
    T convert(F from);
}

@FunctionalInterface
interface Validator<T> {
    boolean validate(T input);

    // default 方法不影响函数式接口
    default Validator<T> and(Validator<T> other) {
        return input -> this.validate(input) && other.validate(input);
    }
}

public class CustomFunctionalInterface {
    public static void main(String[] args) {
        // 自定义转换器
        Converter<String, Integer> toInt = Integer::parseInt;
        System.out.println(toInt.convert("123")); // 123

        // 自定义验证器
        Validator<String> notNull = s -> s != null;
        Validator<String> notEmpty = s -> !s.isEmpty();
        Validator<String> validInput = notNull.and(notEmpty);

        System.out.println(validInput.validate(null));  // false
        System.out.println(validInput.validate(""));     // false
        System.out.println(validInput.validate("Hello")); // true
    }
}
```

::: tip 设计原则
自定义函数式接口应标注 `@FunctionalInterface`，让编译器帮你检查约束。接口的抽象方法签名要语义明确，参数和返回值命名要能表达意图。默认只定义一个核心操作，通过 `default` 方法提供组合能力。
:::
