# 抽象类与接口

抽象类和接口是 Java 中实现"契约编程"的两种机制。它们定义了"应该做什么"，而把"怎么做"留给具体的子类或实现类。

## 抽象类

使用 `abstract` 修饰的类称为抽象类。抽象类不能被直接实例化，但可以包含抽象方法（没有方法体）和具体方法（有完整实现）。

```java
public abstract class Shape {
    private String color;

    public Shape(String color) {
        this.color = color;
    }

    // 抽象方法——子类必须实现
    public abstract double area();

    // 具体方法——子类可以直接继承
    public String getColor() {
        return color;
    }

    public void describe() {
        System.out.println("A " + color + " shape with area " + area());
    }
}
```

```java
public class Circle extends Shape {
    private double radius;

    public Circle(String color, double radius) {
        super(color);
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}

public class Rectangle extends Shape {
    private double width;
    private double height;

    public Rectangle(String color, double width, double height) {
        super(color);
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() {
        return width * height;
    }
}
```

```java
// Shape shape = new Shape("red");  // 编译错误，抽象类不能实例化

Shape circle = new Circle("red", 5.0);
Shape rect = new Rectangle("blue", 3.0, 4.0);
circle.describe();  // A red shape with area 78.5398...
rect.describe();    // A blue shape with area 12.0
```

::: tip 抽象类的定位
抽象类适合表达"模板"或"骨架"的概念。它既能定义抽象契约（子类必须实现的方法），又能提供共享的默认实现（子类可以直接继承的代码）。
:::

## 抽象方法

抽象方法只有声明，没有方法体，使用 `abstract` 关键字修饰。子类必须实现父类中所有的抽象方法，否则子类也必须声明为抽象类。

```java
public abstract class Vehicle {
    // 抽象方法：子类必须实现
    public abstract int getMaxSpeed();

    // 抽象方法：子类必须实现
    public abstract String getFuelType();

    // 具体方法：共享实现
    public void printInfo() {
        System.out.println("Max speed: " + getMaxSpeed() + " km/h");
        System.out.println("Fuel: " + getFuelType());
    }
}
```

```java
public class ElectricCar extends Vehicle {
    @Override
    public int getMaxSpeed() {
        return 200;
    }

    @Override
    public String getFuelType() {
        return "Electric";
    }
}
```

## 接口

接口是一种纯粹的行为契约，只声明"能做什么"，不提供字段（常量除外）和构造器。

```java
public interface Drawable {
    void draw();           // 隐式 public abstract
}

public interface Resizable {
    void resize(double factor);
    double getSize();
}
```

类通过 `implements` 关键字实现接口，一个类可以实现多个接口：

```java
public class Circle implements Drawable, Resizable {
    private double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public void draw() {
        System.out.println("Drawing circle with radius " + radius);
    }

    @Override
    public void resize(double factor) {
        radius *= factor;
    }

    @Override
    public double getSize() {
        return Math.PI * radius * radius;
    }
}
```

### 接口中的常量

接口中定义的字段默认是 `public static final`，即全局常量。

```java
public interface MathConstants {
    double PI = 3.14159265358979;       // 隐式 public static final
    double E = 2.718281828459045;       // 隐式 public static final
}

System.out.println(MathConstants.PI);  // 通过接口名直接访问
```

### default 方法 (Java 8+)

Java 8 允许在接口中用 `default` 关键字定义带有默认实现的方法。实现类可以选择覆盖，也可以直接使用默认实现。

```java
public interface Logger {
    void log(String message);

    // 默认实现：带时间戳的日志
    default void logWithTimestamp(String message) {
        System.out.println("[" + System.currentTimeMillis() + "] " + message);
    }
}

public class ConsoleLogger implements Logger {
    @Override
    public void log(String message) {
        System.out.println("[LOG] " + message);
    }
    // logWithTimestamp 使用默认实现，无需重写
}
```

::: tip default 方法解决了什么问题？
在 Java 8 之前，如果需要给接口新增方法，所有实现类都必须修改。`default` 方法允许在不破坏已有实现的前提下扩展接口，这在演进公共 API 时非常有用。`java.util.Collection` 接口在 Java 8 中新增的 `stream()` 和 `forEach()` 就是 `default` 方法。
:::

### static 方法 (Java 8+)

接口中也可以定义 `static` 方法，作为工具函数直接通过接口名调用。

```java
public interface Validator<T> {
    boolean validate(T item);

    static <T> Validator<T> notNull() {
        return item -> item != null;
    }
}

// 使用
Validator<String> v = Validator.notNull();
System.out.println(v.validate("hello"));  // true
System.out.println(v.validate(null));      // false
```

## 实现多个接口

Java 的单继承限制了一个类只能有一个父类，但接口没有这个限制。一个类可以实现任意数量的接口。

```java
public interface Swimmable {
    void swim();
}

public interface Flyable {
    void fly();
}

public class Duck extends Animal implements Swimmable, Flyable {
    public Duck(String name) {
        super(name);
    }

    @Override
    public String speak() {
        return "Quack!";
    }

    @Override
    public void swim() {
        System.out.println(name + " is swimming");
    }

    @Override
    public void fly() {
        System.out.println(name + " is flying");
    }
}
```

如果多个接口中有签名相同的 `default` 方法，实现类必须显式重写以解决冲突：

```java
public interface A {
    default void greet() {
        System.out.println("Hello from A");
    }
}

public interface B {
    default void greet() {
        System.out.println("Hello from B");
    }
}

public class C implements A, B {
    @Override
    public void greet() {
        A.super.greet();  // 选择调用 A 的实现
        // 或者 B.super.greet();
        // 或者提供全新实现
    }
}
```

## sealed 类和接口 (Java 17+)

`sealed` 关键字允许你精确控制哪些类可以继承或实现当前类型。这对建模有限的类型集合（类似枚举的增强版）非常有用。

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {
    double area();
}

public final class Circle implements Shape {
    private final double radius;
    public Circle(double radius) { this.radius = radius; }
    @Override
    public double area() { return Math.PI * radius * radius; }
}

public final class Rectangle implements Shape {
    private final double width, height;
    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }
    @Override
    public double area() { return width * height; }
}

public non-sealed class Triangle implements Shape {
    private final double base, height;
    public Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }
    @Override
    public double area() { return 0.5 * base * height; }
}
```

- `sealed`：只允许 `permits` 列出的类继承。
- `final`：完全阻止进一步继承。
- `non-sealed`：放弃密封限制，允许任意继承。

::: tip sealed 与 switch 模式匹配
`sealed` 类与 Java 17+ 的 switch 模式匹配配合使用，编译器可以检查是否覆盖了所有情况：
```java
String desc = switch (shape) {
    case Circle c    -> "Circle with radius";
    case Rectangle r -> "Rectangle";
    case Triangle t  -> "Triangle";
    // 不需要 default —— sealed 保证穷举
};
```
:::

## 抽象类 vs 接口：如何选择

| 特性 | 抽象类 | 接口 |
|------|--------|------|
| 继承数量 | 单继承 | 可实现多个 |
| 字段 | 可以有实例字段 | 只能有 `public static final` 常量 |
| 构造器 | 有 | 无 |
| 方法实现 | 可以有具体方法和抽象方法 | 默认 `public abstract`，可加 `default`/`static` |
| 访问修饰符 | 任意 | 方法默认 `public` |
| 设计意图 | 表达 `is-a` 关系 + 共享实现 | 表达 `can-do` 能力契约 |

**经验法则**：

- 如果多个类之间有明确的 `is-a` 关系，且需要共享代码（字段、构造器、具体方法），用**抽象类**。
- 如果只是想定义一组行为能力，且多个不同的类可能都需要这种能力，用**接口**。
- 如果不确定，优先选择接口——接口更灵活，不会占用唯一的继承名额。

```java
// 抽象类：所有动物共享 name、age 和 eat() 的实现
public abstract class Animal { ... }

// 接口：飞行是一种能力，不是所有动物都有
public interface Flyable { void fly(); }

// 继承 Animal 获取共享实现，实现 Flyable 表达飞行能力
public class Eagle extends Animal implements Flyable { ... }
```

<JavaInterfaceVsAbstractDemo />
