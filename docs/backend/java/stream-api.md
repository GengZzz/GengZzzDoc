# Stream API

Stream 是 Java 8 引入的数据处理流水线。它不存储数据，而是对数据源（集合、数组、I/O 通道等）进行函数式操作，支持链式调用、惰性求值和并行处理。

## 什么是 Stream

Stream 是数据的**视图**，不是容器。它将数据处理分为三个阶段：创建数据源、执行中间操作（惰性）、触发终端操作（求值）。

```java
import java.util.*;
import java.util.stream.*;

public class WhatIsStream {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David", "Eve");

        // 传统方式：找长度大于 3 的名字，转大写，排序
        List<String> result1 = new ArrayList<>();
        for (String name : names) {
            if (name.length() > 3) {
                result1.add(name.toUpperCase());
            }
        }
        Collections.sort(result1);

        // Stream 方式：同样的逻辑，声明式表达
        List<String> result2 = names.stream()
            .filter(name -> name.length() > 3)
            .map(String::toUpperCase)
            .sorted()
            .collect(Collectors.toList());

        System.out.println(result2); // [ALICE, CHARLIE, DAVID]
    }
}
```

## 创建 Stream

有多种方式创建 Stream 对象：

```java
import java.util.*;
import java.util.stream.*;

public class CreateStream {
    public static void main(String[] args) {
        // 1. 从集合创建
        List<String> list = Arrays.asList("a", "b", "c");
        Stream<String> s1 = list.stream();

        // 2. Stream.of()
        Stream<String> s2 = Stream.of("x", "y", "z");

        // 3. Arrays.stream()
        int[] arr = {1, 2, 3, 4, 5};
        IntStream s3 = Arrays.stream(arr);

        // 4. Stream.generate()：无限流，需 limit 截断
        Stream<Double> randoms = Stream.generate(Math::random).limit(5);
        randoms.forEach(r -> System.out.printf("%.2f ", r));
        System.out.println();

        // 5. Stream.iterate()：基于种子的无限流
        Stream<Integer> powers = Stream.iterate(1, n -> n * 2).limit(10);
        powers.forEach(n -> System.out.print(n + " ")); // 1 2 4 8 16 32 64 128 256 512
        System.out.println();

        // 6. IntStream.range()
        IntStream.range(0, 5).forEach(i -> System.out.print(i + " ")); // 0 1 2 3 4
        System.out.println();
        IntStream.rangeClosed(1, 5).forEach(i -> System.out.print(i + " ")); // 1 2 3 4 5
    }
}
```

## 中间操作

中间操作返回新的 Stream，是**惰性的**——不会立即执行，只记录操作步骤。多个中间操作组成管道。

```java
import java.util.*;
import java.util.stream.*;

public class IntermediateOps {
    public static void main(String[] args) {
        List<String> words = Arrays.asList("java", "stream", "java", "lambda", "api", "stream");

        // filter：保留满足条件的元素
        List<String> longWords = words.stream()
            .filter(w -> w.length() > 3)
            .collect(Collectors.toList());
        System.out.println(longWords); // [java, stream, java, lambda, stream]

        // map：将每个元素转换为另一种形式
        List<Integer> lengths = words.stream()
            .map(String::length)
            .collect(Collectors.toList());
        System.out.println(lengths); // [4, 6, 4, 6, 3, 6]

        // flatMap：一对多映射，展平嵌套结构
        List<List<String>> nested = Arrays.asList(
            Arrays.asList("a", "b"),
            Arrays.asList("c", "d")
        );
        List<String> flat = nested.stream()
            .flatMap(Collection::stream)
            .collect(Collectors.toList());
        System.out.println(flat); // [a, b, c, d]

        // distinct：去重
        List<String> unique = words.stream()
            .distinct()
            .collect(Collectors.toList());
        System.out.println(unique); // [java, stream, lambda, api]

        // sorted：排序
        List<String> sorted = words.stream()
            .distinct()
            .sorted()
            .collect(Collectors.toList());
        System.out.println(sorted); // [api, java, lambda, stream]

        // peek：调试用，查看中间结果
        long count = words.stream()
            .filter(w -> w.length() > 3)
            .peek(w -> System.out.println("peek: " + w))
            .count();
        System.out.println("count: " + count);

        // limit 和 skip
        List<String> limited = Stream.of("a", "b", "c", "d", "e")
            .skip(1)
            .limit(3)
            .collect(Collectors.toList());
        System.out.println(limited); // [b, c, d]
    }
}
```

## 终端操作

终端操作触发整个管道执行，产生结果或副作用。Stream 被消费后不可复用。

```java
import java.util.*;
import java.util.stream.*;

public class TerminalOps {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(3, 1, 4, 1, 5, 9, 2, 6);

        // forEach：遍历
        numbers.stream().limit(3).forEach(n -> System.out.print(n + " "));
        System.out.println();

        // count：计数
        long count = numbers.stream().filter(n -> n > 3).count();
        System.out.println("大于 3 的个数: " + count);

        // min / max
        numbers.stream().min(Integer::compareTo).ifPresent(n -> System.out.println("最小: " + n));
        numbers.stream().max(Integer::compareTo).ifPresent(n -> System.out.println("最大: " + n));

        // reduce：归约
        int sum = numbers.stream().reduce(0, Integer::sum);
        System.out.println("总和: " + sum);

        Optional<Integer> product = numbers.stream().reduce((a, b) -> a * b);
        product.ifPresent(p -> System.out.println("乘积: " + p));

        // 匹配
        boolean allPositive = numbers.stream().allMatch(n -> n > 0);
        boolean anyLarge = numbers.stream().anyMatch(n -> n > 5);
        boolean noneZero = numbers.stream().noneMatch(n -> n == 0);
        System.out.println("全部正数: " + allPositive);   // true
        System.out.println("有大于 5: " + anyLarge);      // true
        System.out.println("没有 0: " + noneZero);        // true

        // findFirst / findAny
        numbers.stream().filter(n -> n > 4).findFirst()
            .ifPresent(n -> System.out.println("第一个大于 4: " + n));
    }
}
```

## 惰性求值

中间操作只记录不执行，直到终端操作触发才一次性求值。这个机制可以避免不必要的计算。

```java
import java.util.stream.*;

public class LazyEvaluation {
    public static void main(String[] args) {
        // 下面这些中间操作都不会打印任何东西
        Stream<String> pipeline = Stream.of("one", "two", "three", "four")
            .filter(s -> {
                System.out.println("filter: " + s);
                return s.length() > 3;
            })
            .map(s -> {
                System.out.println("map: " + s);
                return s.toUpperCase();
            });

        System.out.println("管道已构建，但 filter/map 尚未执行");

        // 终端操作触发执行
        long count = pipeline.count();
        System.out.println("结果: " + count);
        // 此时才会看到 filter 和 map 的打印输出
    }
}
```

## collect 与 Collectors

`collect()` 是最常用的终端操作之一，配合 `Collectors` 工具类可以将 Stream 结果收集为各种数据结构。

```java
import java.util.*;
import java.util.stream.*;

public class CollectorsDemo {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David", "Eve");

        // toList / toSet
        List<String> list = names.stream()
            .filter(n -> n.length() > 3)
            .collect(Collectors.toList());
        Set<String> set = names.stream().collect(Collectors.toSet());

        // toMap：指定 key 和 value
        Map<String, Integer> nameToLen = names.stream()
            .collect(Collectors.toMap(n -> n, String::length));
        System.out.println(nameToLen); // {Alice=5, Bob=3, Charlie=7, David=5, Eve=3}

        // joining：拼接字符串
        String joined = names.stream().collect(Collectors.joining(", "));
        System.out.println(joined); // Alice, Bob, Charlie, David, Eve

        String wrapped = names.stream().collect(Collectors.joining(", ", "[", "]"));
        System.out.println(wrapped); // [Alice, Bob, Charlie, David, Eve]

        // groupingBy：按条件分组
        Map<Integer, List<String>> byLength = names.stream()
            .collect(Collectors.groupingBy(String::length));
        System.out.println(byLength);
        // {3=[Bob, Eve], 5=[Alice, David], 7=[Charlie]}

        // groupingBy + counting：分组计数
        Map<Integer, Long> countByLength = names.stream()
            .collect(Collectors.groupingBy(String::length, Collectors.counting()));
        System.out.println(countByLength); // {3=2, 5=2, 7=1}

        // partitioningBy：按布尔条件分为两组
        Map<Boolean, List<String>> partition = names.stream()
            .collect(Collectors.partitioningBy(n -> n.length() > 4));
        System.out.println(partition);
        // {false=[Bob, Eve], true=[Alice, Charlie, David]}
    }
}
```

## 并行流

并行流利用多核 CPU 并行处理数据。通过 `parallelStream()` 或 `stream().parallel()` 创建。

```java
import java.util.*;
import java.util.stream.*;

public class ParallelStream {
    public static void main(String[] args) {
        List<Integer> numbers = IntStream.rangeClosed(1, 100).boxed().collect(Collectors.toList());

        // 并行求和
        int sum = numbers.parallelStream()
            .reduce(0, Integer::sum);
        System.out.println("并行求和: " + sum); // 5050

        // 并行处理时注意线程安全
        List<String> result = Collections.synchronizedList(new ArrayList<>());
        numbers.parallelStream()
            .filter(n -> n % 10 == 0)
            .forEach(result::add);
        System.out.println("10 的倍数: " + result.size()); // 10

        // 使用 collect 而非 forEach 更安全
        List<Integer> tens = numbers.parallelStream()
            .filter(n -> n % 10 == 0)
            .collect(Collectors.toList());
        System.out.println(tens); // [10, 20, 30, ..., 100]
    }
}
```

::: warning 并行流的注意事项
- 并行流使用公共的 `ForkJoinPool`，不要在并行流中执行阻塞操作（如 I/O）。
- 数据量较小时并行开销可能大于收益。
- 有状态的操作（如 `sorted`、`distinct`）在并行流中需要额外的同步。
- 使用 `forEachOrdered` 可以保证并行流中的遍历顺序。
:::

## Stream 管道演示

下面的交互式组件展示了 Stream 管道的数据流转过程：

<JavaStreamPipelineDemo />
