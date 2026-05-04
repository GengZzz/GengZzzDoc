# Optional 类

`Optional<T>` 是 Java 8 引入的容器类，用于表示一个值可能存在也可能不存在。它的设计目的是替代 `null`，让代码中的空值处理更加明确和安全。

## 为什么需要 Optional

`NullPointerException` 是 Java 中最常见的运行时异常。传统做法是在使用前检查 `null`，但这依赖程序员的自觉，容易遗漏。

```java
public class NullProblem {
    public static String getCity(User user) {
        // 每一层都可能为 null，层层检查非常繁琐
        if (user != null) {
            Address address = user.getAddress();
            if (address != null) {
                return address.getCity();
            }
        }
        return "Unknown";
    }

    public static void main(String[] args) {
        System.out.println(getCity(null));           // Unknown
        System.out.println(getCity(new User(null))); // Unknown
    }
}

class User {
    private Address address;
    public User(Address address) { this.address = address; }
    public Address getAddress() { return address; }
}

class Address {
    private String city;
    public Address(String city) { this.city = city; }
    public String getCity() { return city; }
}
```

Optional 将"可能为空"这个语义编码到类型系统中，编译器和 API 都能明确知道这个值可能不存在。

## 创建 Optional

```java
import java.util.*;

public class CreateOptional {
    public static void main(String[] args) {
        // of：值不能为 null，传入 null 会抛 NullPointerException
        Optional<String> opt1 = Optional.of("Hello");
        // Optional.of(null); // 抛出 NullPointerException

        // empty：空的 Optional
        Optional<String> opt2 = Optional.empty();

        // ofNullable：值可以为 null
        String name = null;
        Optional<String> opt3 = Optional.ofNullable(name); // 等价于 Optional.empty()
        Optional<String> opt4 = Optional.ofNullable("Java"); // 等价于 Optional.of("Java")

        System.out.println(opt1.isPresent()); // true
        System.out.println(opt2.isPresent()); // false
        System.out.println(opt3.isPresent()); // false
        System.out.println(opt4.isPresent()); // true
    }
}
```

## 提取值

从 Optional 中安全地提取值，有多种方式：

```java
import java.util.*;

public class ExtractValue {
    public static void main(String[] args) {
        Optional<String> present = Optional.of("Hello");
        Optional<String> absent = Optional.empty();

        // get()：直接获取值，为空时抛 NoSuchElementException（不推荐直接使用）
        System.out.println(present.get()); // Hello
        // absent.get(); // 抛出 NoSuchElementException

        // orElse：为空时返回默认值
        System.out.println(present.orElse("Default")); // Hello
        System.out.println(absent.orElse("Default"));   // Default

        // orElseGet：为空时通过 Supplier 提供默认值（惰性求值）
        String result = absent.orElseGet(() -> {
            System.out.println("计算默认值...");
            return "Computed";
        });
        System.out.println(result); // Computed

        // orElseThrow：为空时抛出指定异常
        String value = present.orElseThrow(() -> new RuntimeException("值不存在"));
        System.out.println(value); // Hello
    }
}
```

::: tip orElse vs orElseGet 的区别
`orElse` 的参数无论 Optional 是否为空都会被求值，而 `orElseGet` 的 Supplier 只在 Optional 为空时才执行。当默认值的计算成本较高时（如数据库查询），应使用 `orElseGet`。
:::

## 链式操作

`map`、`flatMap` 和 `filter` 允许以声明式风格安全地处理嵌套的可空值。

```java
import java.util.*;

public class ChainingOps {
    public static void main(String[] args) {
        Optional<String> name = Optional.of("  hello world  ");

        // map：对值进行转换，返回 Optional
        Optional<String> upper = name.map(String::trim).map(String::toUpperCase);
        upper.ifPresent(v -> System.out.println("map: " + v)); // map: HELLO WORLD

        // filter：保留满足条件的值
        Optional<String> longName = name.map(String::trim).filter(s -> s.length() > 5);
        longName.ifPresent(v -> System.out.println("filter: " + v)); // filter: hello world

        Optional<String> shortName = name.map(String::trim).filter(s -> s.length() > 100);
        System.out.println("filter 结果为空: " + shortName.isPresent()); // false

        // flatMap：当转换方法本身返回 Optional 时使用，避免 Optional<Optional<T>>
        Optional<User> user = Optional.of(new User(Optional.of("Alice")));

        // 错误写法：产生 Optional<Optional<String>>
        Optional<Optional<String>> wrong = user.map(User::getNickname);

        // 正确写法：flatMap 自动展平
        Optional<String> nickname = user.flatMap(User::getNickname);
        System.out.println("昵称: " + nickname.orElse("无昵称")); // 昵称: Alice

        // 链式处理嵌套对象
        Optional.ofNullable(getUser())
            .flatMap(User::getNickname)
            .map(String::toUpperCase)
            .ifPresent(n -> System.out.println("结果: " + n));
    }

    static User getUser() {
        return new User(Optional.of("Bob"));
    }
}

class User {
    private Optional<String> nickname;
    public User(Optional<String> nickname) { this.nickname = nickname; }
    public Optional<String> getNickname() { return nickname; }
}
```

## isPresent 和 ifPresent

`isPresent()` 检查值是否存在，`ifPresent(Consumer)` 在值存在时执行操作。

```java
import java.util.*;

public class PresentCheck {
    public static void main(String[] args) {
        Optional<Integer> number = Optional.of(42);
        Optional<Integer> empty = Optional.empty();

        // 传统方式
        if (number.isPresent()) {
            System.out.println("值: " + number.get());
        }

        // 函数式方式（推荐）
        number.ifPresent(n -> System.out.println("值: " + n));

        // ifPresentOrElse（Java 9+）
        number.ifPresentOrElse(
            n -> System.out.println("存在: " + n),
            () -> System.out.println("为空")
        );

        empty.ifPresentOrElse(
            n -> System.out.println("存在: " + n),
            () -> System.out.println("为空")
        );
    }
}
```

## 最佳实践

```java
import java.util.*;

public class BestPractices {

    // 正确：返回 Optional，而非返回 null
    public static Optional<String> findUser(String id) {
        if ("1".equals(id)) {
            return Optional.of("Alice");
        }
        return Optional.empty();
    }

    // 正确：用 orElse / orElseGet 处理缺失值
    public static String getDisplayName(String id) {
        return findUser(id).orElse("Anonymous");
    }

    // 正确：用 map + orElse 安全地访问嵌套属性
    public static String getCitySafe(Optional<User> user) {
        return user
            .flatMap(User::getAddress)
            .map(Address::getCity)
            .orElse("Unknown");
    }

    public static void main(String[] args) {
        // 链式处理
        String name = findUser("1")
            .map(String::toUpperCase)
            .orElse("NOT FOUND");
        System.out.println(name); // ALICE

        // 空值也能安全处理
        String unknown = findUser("999")
            .map(String::toUpperCase)
            .orElse("NOT FOUND");
        System.out.println(unknown); // NOT FOUND
    }
}

class User {
    private Address address;
    public Optional<Address> getAddress() { return Optional.ofNullable(address); }
}

class Address {
    private String city;
    public String getCity() { return city; }
}
```

::: warning Optional 使用规范
- **不要**将 Optional 用作方法参数——参数可能为空时直接用 `@Nullable` 注解。
- **不要**将 Optional 用作类字段——序列化和内存开销没有意义。
- **不要**对 Optional 调用 `get()` 而不先检查 `isPresent()`——这和直接使用 null 一样危险。
- **要**在方法返回值可能为空时返回 `Optional<T>`——这是 Optional 的核心用途。
:::
