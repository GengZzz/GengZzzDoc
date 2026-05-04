# Java 多态

多态是面向对象编程的三大支柱之一。它的核心思想是：**同一个引用类型，指向不同的实际对象时，调用同一个方法会产生不同的行为**。多态让程序在不修改已有代码的前提下，通过新增子类来扩展功能。

## 动态分派

Java 中的实例方法调用采用**动态分派**（Dynamic Dispatch）机制。编译时根据引用的类型检查方法是否存在，运行时根据对象的实际类型决定调用哪个版本的方法。

```java
public class Animal {
    public String speak() {
        return "...";
    }
}

public class Dog extends Animal {
    @Override
    public String speak() {
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

```java
Animal a = new Dog();
System.out.println(a.speak());  // 输出 "Woof!"，不是 "..."
```

变量 `a` 的静态类型是 `Animal`，但实际指向一个 `Dog` 对象。调用 `a.speak()` 时，JVM 在运行时查找 `Dog` 类的实现并执行，这就是动态分派。

::: tip 编译时 vs 运行时
- **编译时**：编译器根据引用类型检查方法签名是否合法。`a` 的类型是 `Animal`，所以编译器确认 `Animal` 上有 `speak()` 方法。
- **运行时**：JVM 根据对象的实际类型（`Dog`）查找并调用对应的 `speak()` 方法。
:::

## 向上转型

将子类对象赋值给父类引用，称为**向上转型**（Upcasting）。这是自动发生的，不需要显式转换，本质上是安全的——狗一定是动物。

```java
Dog dog = new Dog("Buddy");
Animal animal = dog;  // 自动向上转型
```

向上转型后，通过 `animal` 引用只能调用 `Animal` 类中定义的方法。即使 `Dog` 有 `fetch()` 方法，也不能通过 `animal` 调用。

```java
Animal animal = new Dog("Buddy");
animal.speak();    // 可以，Animal 有 speak()
// animal.fetch(); // 编译错误，Animal 没有 fetch()
```

向上转型的典型应用场景：方法参数声明为父类类型，传入子类对象。

```java
public static void makeSound(Animal animal) {
    System.out.println(animal.speak());
}

makeSound(new Dog("Buddy"));  // 输出 "Woof!"
makeSound(new Cat("Kitty"));  // 输出 "Meow!"
```

## 向下转型

将父类引用强制转换回子类类型，称为**向下转型**（Downcasting）。向下转型需要显式强制转换，并且可能在运行时抛出 `ClassCastException`。

```java
Animal animal = new Dog("Buddy");

// 安全的向下转型——animal 实际指向 Dog
Dog dog = (Dog) animal;
dog.fetch();  // 可以了

// 危险的向下转型——animal 实际指向 Cat
Animal animal2 = new Cat("Kitty");
Dog dog2 = (Dog) animal2;  // 运行时抛出 ClassCastException!
```

::: warning 向下转型的风险
向下转型在编译时无法完全保证安全，只有在运行时才能确定是否合法。如果实际类型与目标类型不兼容，JVM 会抛出 `ClassCastException`。务必先用 `instanceof` 检查再转型。
:::

## instanceof 运算符

`instanceof` 用于在运行时检查对象是否属于某个类型，返回 `boolean`。

```java
Animal animal = new Dog("Buddy");

if (animal instanceof Dog) {
    Dog dog = (Dog) animal;
    dog.fetch();
} else if (animal instanceof Cat) {
    Cat cat = (Cat) animal;
    cat.purr();
}
```

如果引用为 `null`，`instanceof` 始终返回 `false`，不会抛异常。

```java
Animal animal = null;
System.out.println(animal instanceof Dog);  // false
```

### Pattern Matching for instanceof (Java 16+)

Java 16 引入了 `instanceof` 的模式匹配，可以在判断类型的同时自动完成转换，省去手动强制转换的样板代码。

```java
// 传统写法
if (animal instanceof Dog) {
    Dog dog = (Dog) animal;
    dog.fetch();
}

// Java 16+ 模式匹配
if (animal instanceof Dog dog) {
    dog.fetch();  // dog 变量已经自动转换好了
}
```

模式匹配变量的作用域仅限于 `if` 块内部，编译器保证类型安全。

```java
if (animal instanceof Dog dog && dog.getBreed().equals("Husky")) {
    System.out.println("A Husky!");
}
```

::: tip Java 21 的模式匹配增强
Java 21 进一步支持了 `switch` 表达式中的模式匹配：
```java
String description = switch (animal) {
    case Dog d -> "A dog named " + d.getName();
    case Cat c -> "A cat named " + c.getName();
    case null  -> "null";
    default    -> "Some animal";
};
```
:::

## 多态的本质

多态的本质是：**父类或接口引用指向子类对象，调用方法时执行子类的具体实现**。

关键要素：
1. **继承或实现关系**：子类继承父类或实现接口。
2. **方法重写**：子类提供了父类方法的特定实现。
3. **向上转型**：通过父类引用持有子类对象。

三者缺一不可。没有继承就无法形成类型层次；没有重写就不存在行为差异；没有向上转型就无法统一引用类型。

### 完整示例：Animal 数组

```java
public class PolymorphismDemo {
    public static void main(String[] args) {
        Animal[] animals = {
            new Dog("Buddy"),
            new Cat("Kitty"),
            new Dog("Max"),
            new Cat("Luna")
        };

        for (Animal animal : animals) {
            System.out.println(animal + " says: " + animal.speak());
        }
    }
}
```

输出：

```
Dog{name='Buddy'} says: Woof!
Cat{name='Kitty'} says: Meow!
Dog{name='Max'} says: Woof!
Cat{name='Luna'} says: Meow!
```

`animals` 数组的类型是 `Animal[]`，每个元素的编译类型都是 `Animal`，但实际运行时分别指向 `Dog` 和 `Cat`。循环中调用 `speak()` 时，JVM 根据每个对象的实际类型执行对应的重写方法。

<JavaPolymorphismDemo />

## 多态的好处

**可扩展性**：新增子类时，使用父类引用的代码完全不需要修改。

```java
public class Bird extends Animal {
    public Bird(String name) {
        super(name);
    }

    @Override
    public String speak() {
        return "Tweet!";
    }
}
```

把 `Bird` 加入数组即可，`for` 循环和 `makeSound()` 方法不需要任何改动：

```java
animals = new Animal[] {
    new Dog("Buddy"),
    new Cat("Kitty"),
    new Bird("Tweety")  // 新增，无需修改调用方
};
```

**低耦合**：调用方只依赖父类或接口，不依赖具体实现。这意味着你可以替换实现而不影响调用方代码。

```java
public interface SortStrategy {
    void sort(int[] data);
}

public class QuickSort implements SortStrategy { /* ... */ }
public class MergeSort implements SortStrategy { /* ... */ }

public class Sorter {
    private SortStrategy strategy;

    public Sorter(SortStrategy strategy) {
        this.strategy = strategy;
    }

    public void executeSort(int[] data) {
        strategy.sort(data);
    }
}
```

::: tip 多态是"开闭原则"的基础
开闭原则要求软件实体对扩展开放、对修改关闭。多态使得你可以通过新增子类来扩展系统，而不需要修改已有的、经过测试的调用方代码。
:::

## 多态与字段、静态方法

多态只适用于**实例方法**。字段访问和静态方法调用在编译时就确定了，不参与动态分派。

```java
public class Parent {
    public String name = "Parent";
    public String getName() { return "Parent"; }
    public static String getType() { return "Parent type"; }
}

public class Child extends Parent {
    public String name = "Child";
    @Override
    public String getName() { return "Child"; }
    public static String getType() { return "Child type"; }
}
```

```java
Parent p = new Child();

System.out.println(p.name);       // "Parent" — 字段不参与多态
System.out.println(p.getName());  // "Child"  — 实例方法参与多态
System.out.println(p.getType());  // "Parent type" — 静态方法不参与多态
```

::: warning 避免通过子类实例访问父类字段
虽然 `p.name` 返回 `"Parent"` 在语法上是合法的，但这种写法很容易造成混淆。应始终通过方法（getter）来访问字段，保持多态行为的一致性。
:::
