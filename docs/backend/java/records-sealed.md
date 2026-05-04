# 记录类与密封类

Java 14 引入 Record（记录类），Java 17 正式引入 Sealed Class（密封类）。这两个特性让 Java 的数据建模更加简洁和安全，配合 pattern matching 可以写出清晰的数据处理代码。

## Record 类

Record 是一种不可变数据载体，编译器自动为其生成构造器、getter、`equals()`、`hashCode()` 和 `toString()`。

### 基本语法

```java
// 传统写法：大量样板代码
class PointClassic {
    private final int x;
    private final int y;

    public PointClassic(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() { return x; }
    public int getY() { return y; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PointClassic)) return false;
        PointClassic p = (PointClassic) o;
        return x == p.x && y == p.y;
    }

    @Override
    public int hashCode() {
        return 31 * x + y;
    }

    @Override
    public String toString() {
        return "PointClassic[x=" + x + ", y=" + y + "]";
    }
}

// Record 写法：一行搞定
record Point(int x, int y) {}

public class RecordBasic {
    public static void main(String[] args) {
        Point p = new Point(3, 4);
        System.out.println(p.x());     // 3  (自动生成的访问器)
        System.out.println(p.y());     // 4
        System.out.println(p);          // Point[x=3, y=4]

        // Record 默认不可变
        // p.x = 5; // 编译错误：cannot assign a value to final variable

        // equals 基于所有组件
        Point q = new Point(3, 4);
        System.out.println(p.equals(q)); // true
        System.out.println(p.hashCode() == q.hashCode()); // true
    }
}
```

::: tip Record 的访问器方法名
Record 的访问器方法名就是组件名本身（`x()`、`y()`），不是 `getX()` / `getY()`。这与传统的 getter 命名不同，设计上强调 Record 是纯粹的数据，不是封装了行为的对象。
:::

### 紧凑构造器

当需要对组件进行验证或转换时，可以使用紧凑构造器——省略参数列表，直接写逻辑：

```java
record Range(int start, int end) {
    // 紧凑构造器：没有参数列表，参数由 Record 自动提供
    Range {
        if (start > end) {
            throw new IllegalArgumentException(
                "start (" + start + ") 不能大于 end (" + end + ")"
            );
        }
        // 这里可以对参数进行转换
        // 赋值是自动的，不需要写 this.start = start
    }
}

public class CompactConstructor {
    public static void main(String[] args) {
        Range r = new Range(1, 10);
        System.out.println(r); // Range[start=1, end=10]

        // Range bad = new Range(10, 1);
        // 抛出 IllegalArgumentException
    }
}
```

### 自定义方法

Record 可以定义任意实例方法和静态方法：

```java
record Circle(double radius) {
    // 自定义方法
    double area() {
        return Math.PI * radius * radius;
    }

    double circumference() {
        return 2 * Math.PI * radius;
    }

    // 重写 toString
    @Override
    public String toString() {
        return String.format("Circle(r=%.2f, area=%.2f)", radius, area());
    }
}

public class RecordMethods {
    public static void main(String[] args) {
        Circle c = new Circle(5.0);
        System.out.println(c);                          // Circle(r=5.00, area=78.54)
        System.out.printf("周长: %.2f%n", c.circumference()); // 周长: 31.42
    }
}
```

### 实现接口

Record 可以实现接口，使其成为一种轻量级的数据对象：

```java
interface Printable {
    String format();
}

record Student(String name, int score) implements Printable {
    @Override
    public String format() {
        return name + " (score: " + score + ")";
    }

    boolean passed() {
        return score >= 60;
    }
}

public class RecordInterface {
    public static void main(String[] args) {
        Student s = new Student("Alice", 85);
        System.out.println(s.format()); // Alice (score: 85)
        System.out.println("及格: " + s.passed()); // 及格: true

        // 可以作为接口类型使用
        Printable p = s;
        System.out.println(p.format()); // Alice (score: 85)
    }
}
```

## Sealed 类

Sealed 类限制哪些类可以继承它，在编译时就能穷举所有子类型。这与 `switch` 模式匹配配合使用，让编译器检查分支是否完整。

### 基本语法

```java
// sealed 类指定允许的子类
sealed class Shape permits Circle, Rectangle, Triangle {}

final class Circle extends Shape {
    double radius;
    Circle(double radius) { this.radius = radius; }
}

final class Rectangle extends Shape {
    double width, height;
    Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
}

final class Triangle extends Shape {
    double base, height;
    Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }
}

public class SealedBasic {
    static double area(Shape shape) {
        if (shape instanceof Circle c) {
            return Math.PI * c.radius * c.radius;
        } else if (shape instanceof Rectangle r) {
            return r.width * r.height;
        } else if (shape instanceof Triangle t) {
            return 0.5 * t.base * t.height;
        }
        throw new IllegalArgumentException("未知形状");
    }

    public static void main(String[] args) {
        Shape[] shapes = {
            new Circle(5),
            new Rectangle(3, 4),
            new Triangle(6, 2)
        };

        for (Shape s : shapes) {
            System.out.printf("%s 的面积: %.2f%n", s.getClass().getSimpleName(), area(s));
        }
    }
}
```

### 子类的限制

Sealed 类的直接子类必须是以下三种之一：

- `final`：不允许再被继承（最常见）
- `sealed`：继续限制继承链
- `non-sealed`：开放继承，恢复普通类的行为

```java
sealed class Expr permits BinaryExpr, UnaryExpr {}

// sealed 子类：继续限制
sealed class BinaryExpr extends Expr permits AddExpr, MulExpr {}

final class AddExpr extends BinaryExpr {}
final class MulExpr extends BinaryExpr {}

// non-sealed 子类：开放继承
non-sealed class UnaryExpr extends Expr {}
// 任何类都可以继承 UnaryExpr，不受 sealed 限制

public class SealedSubclasses {
    public static void main(String[] args) {
        Expr expr = new AddExpr();
        System.out.println(expr.getClass().getSimpleName()); // AddExpr

        // UnaryExpr 是 non-sealed 的，可以自由继承
        class NegateExpr extends UnaryExpr {}
        Expr neg = new NegateExpr();
        System.out.println(neg.getClass().getSimpleName()); // NegateExpr
    }
}
```

### Sealed 接口

接口也可以是 sealed 的，用于限制实现类：

```java
sealed interface JsonNode permits JsonString, JsonNumber, JsonBoolean {}

record JsonString(String value) implements JsonNode {}
record JsonNumber(double value) implements JsonNode {}
record JsonBoolean(boolean value) implements JsonNode {}

public class SealedInterface {
    static String toJson(JsonNode node) {
        if (node instanceof JsonString s) {
            return "\"" + s.value() + "\"";
        } else if (node instanceof JsonNumber n) {
            return String.valueOf(n.value());
        } else if (node instanceof JsonBoolean b) {
            return String.valueOf(b.value());
        }
        throw new AssertionError("不可能到达这里");
    }

    public static void main(String[] args) {
        System.out.println(toJson(new JsonString("hello"))); // "hello"
        System.out.println(toJson(new JsonNumber(42)));       // 42.0
        System.out.println(toJson(new JsonBoolean(true)));    // true
    }
}
```

## Pattern Matching

### instanceof 模式匹配（Java 16+）

传统 `instanceof` 需要先判断再强制转换，模式匹配将两步合并为一步：

```java
public class InstanceofPattern {
    // 传统写法
    static String describeOld(Object obj) {
        if (obj instanceof String) {
            String s = (String) obj;
            return "字符串，长度: " + s.length();
        }
        return "其他类型";
    }

    // 模式匹配写法（Java 16+）
    static String describe(Object obj) {
        if (obj instanceof String s) {
            // 变量 s 自动绑定，作用域限定在 if 块内
            return "字符串，长度: " + s.length();
        } else if (obj instanceof Integer i) {
            return "整数，值: " + i;
        }
        return "其他类型";
    }

    public static void main(String[] args) {
        System.out.println(describe("Hello")); // 字符串，长度: 5
        System.out.println(describe(42));      // 整数，值: 42
        System.out.println(describe(3.14));    // 其他类型
    }
}
```

### switch 模式匹配（Java 21+）

`switch` 支持模式匹配和 sealed 类穷举检查：

```java
sealed interface Shape permits Circle, Rectangle {}

record Circle(double radius) implements Shape {}
record Rectangle(double width, double height) implements Shape {}

public class SwitchPattern {
    static double area(Shape shape) {
        return switch (shape) {
            case Circle c    -> Math.PI * c.radius() * c.radius();
            case Rectangle r -> r.width() * r.height();
            // 因为 Shape 是 sealed 的且只有两个子类，
            // 编译器确认这里已经穷举，不需要 default
        };
    }

    static String classify(Shape shape) {
        return switch (shape) {
            case Circle c when c.radius() > 10 -> "大圆";
            case Circle c                      -> "小圆";
            case Rectangle r when r.width() == r.height() -> "正方形";
            case Rectangle r -> "长方形";
        };
    }

    public static void main(String[] args) {
        Shape[] shapes = { new Circle(5), new Circle(15), new Rectangle(3, 4), new Rectangle(5, 5) };

        for (Shape s : shapes) {
            System.out.printf("%-12s 面积: %.2f%n", classify(s), area(s));
        }
    }
}
```

::: tip sealed + switch 的威力
当 switch 的目标类型是 sealed 类或 sealed 接口时，编译器可以在编译时检查所有子类是否都被覆盖。如果漏掉一个子类，直接编译报错。这比 `default` 分支在运行时才发现问题要安全得多。
:::

## Record + Sealed 的组合

Record 和 Sealed 经常配合使用，构建完整的代数数据类型（ADT）：

```java
sealed interface Result<T> permits Success, Failure {}

record Success<T>(T value) implements Result<T> {}
record Failure<T>(String error) implements Result<T> {}

public class RecordSealedCombo {
    static Result<Integer> divide(int a, int b) {
        if (b == 0) {
            return new Failure<>("除数不能为零");
        }
        return new Success<>(a / b);
    }

    static <T> String format(Result<T> result) {
        return switch (result) {
            case Success(var value) -> "成功: " + value;
            case Failure(var error) -> "失败: " + error;
        };
    }

    public static void main(String[] args) {
        System.out.println(format(divide(10, 3))); // 成功: 3
        System.out.println(format(divide(10, 0))); // 失败: 除数不能为零
    }
}
```
