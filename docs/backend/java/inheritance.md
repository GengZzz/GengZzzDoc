# Java 继承

继承是面向对象编程的核心机制之一。通过继承，子类可以复用父类的属性和方法，并在此基础上扩展自己的行为。Java 采用**单继承**模型——每个类最多只能有一个直接父类，形成一条清晰的继承链。

## extends 关键字

使用 `extends` 关键字声明一个类继承另一个类。子类自动获得父类中所有非私有的字段和方法。

```java
public class Animal {
    protected String name;
    protected int age;

    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public void eat() {
        System.out.println(name + " is eating");
    }

    public void sleep() {
        System.out.println(name + " is sleeping");
    }
}

public class Dog extends Animal {
    private String breed;

    public Dog(String name, int age, String breed) {
        super(name, age);  // 调用父类构造器
        this.breed = breed;
    }

    public void fetch() {
        System.out.println(name + " is fetching the ball");
    }
}
```

`Dog` 继承了 `Animal`，所以 `Dog` 对象可以直接调用 `eat()` 和 `sleep()`，同时拥有自己独有的 `breed` 字段和 `fetch()` 方法。

```java
Dog dog = new Dog("Buddy", 3, "Golden Retriever");
dog.eat();   // 继承自 Animal
dog.fetch(); // Dog 自己的方法
```

## super 关键字

`super` 用于在子类中访问父类的成员。

**调用父类构造器**：必须放在子类构造器的第一行。如果父类有无参构造器，编译器会自动插入 `super()`；如果父类只有有参构造器，子类必须显式调用。

```java
public class Cat extends Animal {
    private boolean indoor;

    public Cat(String name, int age, boolean indoor) {
        super(name, age);  // 必须是第一行
        this.indoor = indoor;
    }
}
```

**调用父类方法**：当子类重写了父类方法，仍可以在子类中通过 `super.methodName()` 调用父类版本。

```java
public class Dog extends Animal {
    public Dog(String name, int age) {
        super(name, age);
    }

    @Override
    public void eat() {
        super.eat();  // 先执行父类的 eat 逻辑
        System.out.println(name + " wags tail while eating");
    }
}
```

## 方法重写

子类可以重新定义从父类继承的方法，这称为**方法重写**（Method Overriding）。重写必须遵守以下规则：

1. 方法签名（名称、参数列表）必须与父类方法一致。
2. 返回类型必须相同或是父类返回类型的子类型（协变返回）。
3. 访问权限不能比父类方法更严格（父类 `public`，子类不能改为 `private`）。
4. 不能重写 `final` 方法。
5. 不能重写 `static` 方法（那是隐藏，不是重写）。

使用 `@Override` 注解让编译器帮你检查是否满足重写条件：

```java
public class Animal {
    public String speak() {
        return "...";
    }
}

public class Dog extends Animal {
    @Override
    public String speak() {  // 编译器确认父类确实有此方法
        return "Woof!";
    }
}

public class Cat extends Animal {
    @Override
    public String speak() {
        return "Meow!";
    }
}
```

## final 修饰符

`final` 在继承体系中有三个用途：

- **`final class`**：该类不能被继承。`String`、`Integer` 等核心类都是 `final` 的。
- **`final method`**：该方法不能被子类重写。
- **`final field`**：该字段一旦赋值后不可修改（这是关于不可变性的，不在此章节展开）。

```java
public final class ImmutablePoint {
    private final int x;
    private final int y;

    public ImmutablePoint(int x, int y) {
        this.x = x;
        this.y = y;
    }

    // 这个类不能被继承
}

public class Base {
    public final void criticalOperation() {
        // 子类不能重写此方法
        System.out.println("performing critical operation");
    }
}
```

::: warning 注意
过度使用 `final class` 会限制代码的可扩展性。只在确实不希望被继承的场景下使用，例如值对象、工具类。
:::

## Object 类——所有类的根类

Java 中所有类（除了基本类型）都隐式继承自 `java.lang.Object`。即使你没有写 `extends`，编译器也会自动加上 `extends Object`。

`Object` 提供了一系列基础方法，其中最常被重写的有三个：

| 方法 | 用途 |
|------|------|
| `toString()` | 返回对象的字符串表示，默认输出 `类名@哈希码` |
| `equals(Object obj)` | 判断两个对象是否"逻辑相等"，默认用 `==` 比较引用 |
| `hashCode()` | 返回对象的哈希值，`equals` 的对象必须有相同的 `hashCode` |

### 重写 toString()

```java
public class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    @Override
    public String toString() {
        return "Student{name='" + name + "', score=" + score + "}";
    }
}
```

```java
Student s = new Student("Alice", 95);
System.out.println(s);  // Student{name='Alice', score=95}
```

不重写 `toString()` 的话，`System.out.println(s)` 只会输出类似 `Student@1a2b3c4d` 这样的地址信息，毫无可读性。

### 重写 equals() 和 hashCode()

重写 `equals()` 时必须同时重写 `hashCode()`，这是 Java 的硬性约定。`HashMap`、`HashSet` 等集合依赖这两个方法正确协作。

```java
import java.util.Objects;

public class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Student student = (Student) o;
        return score == student.score && Objects.equals(name, student.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, score);
    }
}
```

::: tip equals() 的正确姿势
1. 先用 `==` 判断是否是同一个对象引用——直接返回 `true`。
2. 检查 `null` 和类型——类型不同或传入 `null` 返回 `false`。
3. 强制转换后逐字段比较。
4. `hashCode()` 用 `Objects.hash()` 工具方法即可。
:::

## 单继承

Java 只支持单继承——一个类只能 `extends` 一个父类。这是为了避免多继承带来的"菱形问题"（Diamond Problem）。

```java
// 编译错误：不能继承多个类
// public class Dog extends Animal, Pet { }
```

如果需要组合多种能力，使用接口（`interface`）。一个类可以实现多个接口。

```java
public class Dog extends Animal implements Pet, Trainable {
    // 单继承 + 多接口实现
}
```

::: tip 为什么 Java 不支持多继承？
C++ 支持多继承，但带来了菱形继承的歧义问题。Java 设计者选择了更简单的单继承模型，用接口来补充多态能力，降低了语言复杂度。
:::

## 继承链示例

下面展示一个完整的 `Animal` -> `Dog` / `Cat` 继承体系：

```java
public class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public String speak() {
        return "...";
    }

    @Override
    public String toString() {
        return getClass().getSimpleName() + "{name='" + name + "'}";
    }
}

public class Dog extends Animal {
    public Dog(String name) {
        super(name);
    }

    @Override
    public String speak() {
        return "Woof!";
    }

    public void fetch() {
        System.out.println(name + " fetches the ball");
    }
}

public class Cat extends Animal {
    public Cat(String name) {
        super(name);
    }

    @Override
    public String speak() {
        return "Meow!";
    }

    public void purr() {
        System.out.println(name + " purrs");
    }
}
```

<JavaInheritanceChainDemo />

## 构造器的调用顺序

在继承体系中，构造器的调用顺序是从最顶层的父类开始，逐层向下。每个构造器的第一行要么显式调用 `super(...)`，要么由编译器隐式插入 `super()`。

```java
public class Animal {
    public Animal() {
        System.out.println("Animal constructor");
    }
}

public class Dog extends Animal {
    public Dog() {
        // 编译器自动插入 super()
        System.out.println("Dog constructor");
    }
}

public class Puppy extends Dog {
    public Puppy() {
        System.out.println("Puppy constructor");
    }
}
```

```java
new Puppy();
// 输出：
// Animal constructor
// Dog constructor
// Puppy constructor
```

::: warning 注意
如果父类没有无参构造器，子类构造器必须显式调用 `super(参数)`，否则编译失败。
:::
