# 类与对象

Java 是一门面向对象的语言，程序的基本构建单元是类（class）和对象（object）。类是对象的模板，描述了一类事物共有的属性和行为；对象是类的具体实例，在运行时占据内存空间。

## 类的定义

类由**字段**（成员变量）和**方法**（成员函数）组成。字段描述对象的状态，方法描述对象的行为。

```java
public class Person {
    // 字段（成员变量）
    String name;
    int age;

    // 方法（成员函数）
    public void introduce() {
        System.out.println("I'm " + name + ", " + age + " years old.");
    }
}
```

一个 `.java` 文件中可以有多个类，但最多只能有一个 `public` 类，且文件名必须与该 `public` 类名一致。

## 创建对象

使用 `new` 关键字创建对象。`new` 会在堆内存中分配空间并返回该对象的引用。

```java
public class Main {
    public static void main(String[] args) {
        // 创建 Person 对象
        Person alice = new Person();
        alice.name = "Alice";
        alice.age = 25;
        alice.introduce();
    }
}
```

上述代码做了两件事：
1. `new Person()` —— 在堆上创建一个 `Person` 实例
2. `alice` —— 一个引用变量，保存该实例的地址（类似指针）

## 构造方法

构造方法用于在创建对象时完成初始化。它的名字与类名相同，没有返回类型。

```java
public class Person {
    String name;
    int age;

    // 构造方法
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public void introduce() {
        System.out.println("I'm " + name + ", " + age + " years old.");
    }

    public static void main(String[] args) {
        Person alice = new Person("Alice", 25);
        alice.introduce();
    }
}
```

`this` 关键字指向当前对象，用于区分同名的参数和字段。关于构造方法的更多细节（重载、`this()` 调用链、初始化顺序）参见 [构造器与初始化](./constructors-initialization)。

## 引用变量

`Person p = new Person("Alice", 25)` 中，`p` 不是对象本身，而是一个**引用**（reference），它指向堆上的对象。引用的本质就是指针，只是 Java 不暴露指针语法（没有 `*`、`&`、`->` 运算符）。

```java
Person a = new Person("Alice", 25);
Person b = a;          // b 和 a 指向同一个对象

b.name = "Bob";
System.out.println(a.name);  // 输出 "Bob"，因为 a 和 b 是同一个对象
```

多个引用可以指向同一个对象，修改其中一个引用所指向的对象，其他引用看到的数据也会变化。

## null 引用

引用变量可以赋值为 `null`，表示不指向任何对象。

```java
Person p = new Person("Alice", 25);
p = null;  // p 不再指向任何对象，原先的对象如果没有其他引用指向它，会被垃圾回收
```

访问 `null` 引用的字段或方法会抛出 `NullPointerException`：

```java
Person p = null;
p.introduce();  // 运行时抛出 NullPointerException
```

::: warning 防御空指针
在实际开发中，`NullPointerException` 是最常见的运行时异常之一。调用方法前应确认引用不为 `null`，或使用 `Objects.requireNonNull()` 做显式检查。
:::

## 内存模型：栈与堆

理解对象在内存中的分布，有助于理解引用、参数传递和垃圾回收等行为。

- **栈（Stack）**：存储局部变量和方法调用帧。每个线程有自己的栈。
- **堆（Heap）**：存储所有对象实例。所有线程共享同一个堆。

当执行 `Person p = new Person("Alice", 25)` 时：
1. 栈上分配局部变量 `p`
2. 堆上分配 `Person` 对象的空间，包含 `name` 和 `age` 字段
3. `p` 保存堆上对象的地址

<JavaObjectMemoryDemo />

## 完整示例

下面是一个完整的、可编译运行的示例：

```java
public class Person {
    String name;
    int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public void introduce() {
        System.out.println("I'm " + name + ", " + age + " years old.");
    }

    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }

    public static void main(String[] args) {
        Person alice = new Person("Alice", 25);
        Person bob = new Person("Bob", 30);

        alice.introduce();
        bob.introduce();

        // 多个引用指向同一对象
        Person ref = alice;
        ref.name = "Alicia";
        System.out.println(alice.getName());  // 输出 "Alicia"

        // null 引用
        bob = null;
        // bob.introduce();  // 会抛出 NullPointerException
    }
}
```

::: tip
`getName()` 和 `getAge()` 是简单的 getter 方法。在实际项目中，字段通常声明为 `private`，通过 getter/setter 访问，详见 [封装与访问控制](./encapsulation-access)。
:::
