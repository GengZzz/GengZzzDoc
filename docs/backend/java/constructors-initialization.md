# 构造器与初始化

构造器（Constructor）是创建对象时调用的特殊方法，负责对新对象进行初始化。Java 还提供了初始化块和 `final` 字段等机制，共同决定对象的初始化过程。

## 默认构造器

如果一个类没有定义任何构造器，编译器会自动提供一个无参的默认构造器（Default Constructor）。它不做任何事，等价于 `public ClassName() {}`。

```java
public class Dog {
    String name;
}

// 等价于编译器生成：
// public class Dog {
//     String name;
//     public Dog() { }  // 默认构造器
// }
```

::: warning 注意
一旦你定义了任何构造器（哪怕只有一个带参数的），编译器就**不再**提供默认构造器。此时如果还需要无参构造器，必须显式写出。
:::

```java
public class Dog {
    String name;

    public Dog(String name) {
        this.name = name;
    }

    // 如果还需要无参构造器，必须自己写
    public Dog() {
        this.name = "Unknown";
    }
}
```

## 自定义构造器

构造方法与类同名，没有返回类型（连 `void` 都没有），用于在 `new` 时初始化对象。

```java
public class Student {
    private String name;
    private int age;
    private String studentId;

    public Student(String name, int age, String studentId) {
        this.name = name;
        this.age = age;
        this.studentId = studentId;
    }

    @Override
    public String toString() {
        return name + " (age=" + age + ", id=" + studentId + ")";
    }

    public static void main(String[] args) {
        Student s = new Student("Alice", 20, "S2024001");
        System.out.println(s);  // Alice (age=20, id=S2024001)
    }
}
```

## 构造器重载

一个类可以有多个构造器，参数列表必须不同。多个构造器之间可以用 `this(...)` 互相调用，避免重复代码。

```java
public class Rectangle {
    private double width;
    private double height;
    private String color;

    public Rectangle(double width, double height, String color) {
        this.width = width;
        this.height = height;
        this.color = color;
    }

    // 调用上面的构造器，默认颜色 white
    public Rectangle(double width, double height) {
        this(width, height, "white");
    }

    // 调用上面的构造器，默认正方形
    public Rectangle(double side) {
        this(side, side);
    }

    // 调用上面的构造器，默认 1x1 白色正方形
    public Rectangle() {
        this(1.0);
    }

    @Override
    public String toString() {
        return width + "x" + height + " " + color;
    }

    public static void main(String[] args) {
        System.out.println(new Rectangle());             // 1.0x1.0 white
        System.out.println(new Rectangle(5));            // 5.0x5.0 white
        System.out.println(new Rectangle(3, 4));         // 3.0x4.0 white
        System.out.println(new Rectangle(3, 4, "red")); // 3.0x4.0 red
    }
}
```

::: tip
`this(...)` 必须是构造器中的**第一条语句**。一个构造器不能同时调用 `this(...)` 和 `super(...)`。
:::

## super() 调用父类构造器

子类构造器中可以使用 `super(...)` 调用父类的构造器。如果没有显式调用，编译器会自动在第一行插入 `super()`（无参版本）。

```java
public class Animal {
    private String name;

    public Animal(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}

public class Cat extends Animal {
    private boolean indoor;

    public Cat(String name, boolean indoor) {
        super(name);          // 必须先调用父类构造器
        this.indoor = indoor;
    }
}
```

::: tip
继承和 `super()` 的详细内容将在 [继承](./inheritance) 章节展开。
:::

## 实例初始化块

用 `{ }` 包裹的代码块（不带任何关键字）叫做实例初始化块（Instance Initializer Block）。它在**每个构造器执行之前**运行。

```java
public class InitDemo {
    private int x;

    // 实例初始化块
    {
        x = 10;
        System.out.println("实例初始化块执行，x = " + x);
    }

    public InitDemo() {
        System.out.println("无参构造器执行");
    }

    public InitDemo(int x) {
        this.x = x;
        System.out.println("带参构造器执行，x = " + x);
    }

    public static void main(String[] args) {
        new InitDemo();
        // 输出：
        // 实例初始化块执行，x = 10
        // 无参构造器执行

        System.out.println("---");

        new InitDemo(42);
        // 输出：
        // 实例初始化块执行，x = 10
        // 带参构造器执行，x = 42
    }
}
```

如果有多个实例初始化块，按它们在源代码中出现的顺序执行。

## 静态初始化块

用 `static { }` 定义的代码块叫做静态初始化块（Static Initializer Block）。它在**类加载时执行一次**，通常用于初始化静态字段。

```java
public class Config {
    private static Map<String, String> settings;

    static {
        settings = new HashMap<>();
        settings.put("host", "localhost");
        settings.put("port", "8080");
        System.out.println("静态初始化块执行");
    }

    public static String get(String key) {
        return settings.get(key);
    }

    public static void main(String[] args) {
        // 静态初始化块在类加载时已执行
        System.out.println(Config.get("host"));  // localhost
    }
}
```

## 初始化顺序

当创建一个对象时，各部分的执行顺序如下：

1. **静态字段** 赋默认值 + **静态初始化块** —— 类加载时执行一次
2. **实例字段** 赋默认值（0, null, false 等）
3. **实例字段** 显式赋值 + **实例初始化块** —— 按代码顺序
4. **构造器** 方法体

```java
public class InitOrder {
    // 1. 静态字段
    static int staticField = staticMethod("静态字段赋值");

    // 2. 静态初始化块
    static {
        System.out.println("静态初始化块");
    }

    // 3. 实例字段显式赋值
    int instanceField = method("实例字段赋值");

    // 4. 实例初始化块
    {
        System.out.println("实例初始化块");
    }

    // 5. 构造器
    public InitOrder() {
        System.out.println("构造器执行");
    }

    static int staticMethod(String msg) {
        System.out.println(msg);
        return 1;
    }

    int method(String msg) {
        System.out.println(msg);
        return 1;
    }

    public static void main(String[] args) {
        System.out.println("=== 第一次 new ===");
        new InitOrder();
        System.out.println("=== 第二次 new ===");
        new InitOrder();
    }
}
```

输出：

```
静态字段赋值
静态初始化块
=== 第一次 new ===
实例字段赋值
实例初始化块
构造器执行
=== 第二次 new ===
实例字段赋值
实例初始化块
构造器执行
```

可以看到，静态部分只在第一次使用类时执行一次；实例相关的部分每次 `new` 都会执行。

## final 字段

被 `final` 修饰的字段**必须在构造器结束前完成赋值**，且之后不可修改。

```java
public class Circle {
    private final double radius;
    private final double area;

    public Circle(double radius) {
        this.radius = radius;
        this.area = Math.PI * radius * radius;
    }

    // public void setRadius(double r) { this.radius = r; }  // 编译错误

    public double getRadius() { return radius; }
    public double getArea() { return area; }

    public static void main(String[] args) {
        Circle c = new Circle(5);
        System.out.println("radius = " + c.getRadius());  // 5.0
        System.out.println("area = " + c.getArea());       // 78.5398...
    }
}
```

::: tip final 字段的使用场景
- 常量：`public static final double PI = 3.14159;`
- 不可变对象的字段：对象一旦创建，状态不可变，线程安全。
- 缓存值：计算一次后不再改变。
:::

## 综合示例

```java
public class Employee {
    private final String id;
    private String name;
    private double salary;
    private static int nextId = 1000;

    // 静态初始化块
    static {
        System.out.println("Employee 类加载，nextId 初始化为 " + nextId);
    }

    // 实例初始化块
    {
        this.id = "EMP-" + nextId++;
    }

    public Employee(String name, double salary) {
        this.name = name;
        this.salary = salary;
    }

    public Employee(String name) {
        this(name, 5000.0);  // 调用另一个构造器
    }

    @Override
    public String toString() {
        return id + " " + name + " salary=" + salary;
    }

    public static void main(String[] args) {
        Employee e1 = new Employee("Alice", 8000);
        Employee e2 = new Employee("Bob");
        System.out.println(e1);  // EMP-1000 Alice salary=8000.0
        System.out.println(e2);  // EMP-1001 Bob salary=5000.0
    }
}
```

在这个示例中：
- `id` 是 `final` 字段，在实例初始化块中赋值，之后不可修改
- `nextId` 是静态字段，类加载后持续存在，每次创建对象时自增
- 两个构造器通过 `this(...)` 复用，避免重复代码
