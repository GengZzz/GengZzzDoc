# 内部类与匿名类

Java 允许在一个类的内部定义另一个类，这种机制称为**内部类**（Inner Class）。内部类在不同场景下有不同的形式，各有其用途。匿名内部类则提供了一种快速创建一次性实现的方式。

## 成员内部类

成员内部类定义在另一个类的成员位置，就像字段和方法一样。它持有对外部类实例的隐式引用，可以直接访问外部类的所有成员（包括 `private`）。

```java
public class LinkedList {
    private Node head;

    // 成员内部类
    private class Node {
        int data;
        Node next;

        Node(int data) {
            this.data = data;
            this.next = null;
        }
    }

    public void addFirst(int data) {
        Node newNode = new Node(data);  // 直接创建内部类实例
        newNode.next = head;
        head = newNode;
    }

    public void printAll() {
        Node current = head;
        while (current != null) {
            System.out.print(current.data + " -> ");
            current = current.next;
        }
        System.out.println("null");
    }
}
```

```java
LinkedList list = new LinkedList();
list.addFirst(3);
list.addFirst(2);
list.addFirst(1);
list.printAll();  // 1 -> 2 -> 3 -> null
```

`Node` 是 `LinkedList` 的实现细节，对外部完全隐藏。外部代码无法直接创建 `Node` 实例，只能通过 `LinkedList` 的公开方法间接操作。

::: tip 内部类持有外部类引用
成员内部类的每个实例都隐式持有创建它的外部类实例的引用。这就是为什么内部类可以访问外部类的 `private` 成员。如果内部类不需要访问外部类实例，应使用静态嵌套类以避免不必要的引用开销。
:::

### 在外部类之外创建内部类实例

如果内部类是 `public` 的，外部代码可以这样创建实例：

```java
public class Outer {
    public class Inner {
        public void hello() {
            System.out.println("Hello from Inner");
        }
    }
}

Outer outer = new Outer();
Outer.Inner inner = outer.new Inner();  // 必须先有外部类实例
inner.hello();
```

## 静态嵌套类

静态嵌套类使用 `static` 修饰，它**不持有**外部类实例的引用。它本质上是一个定义在另一个类内部的顶级类，仅仅在命名空间上有所归属。

```java
public class Calculator {
    // 静态嵌套类：不持有 Calculator 实例的引用
    public static class Operation {
        private final String name;
        private final java.util.function.BinaryOperator<Double> function;

        public Operation(String name, java.util.function.BinaryOperator<Double> function) {
            this.name = name;
            this.function = function;
        }

        public double apply(double a, double b) {
            return function.apply(a, b);
        }

        public String getName() {
            return name;
        }
    }

    public static Operation addition() {
        return new Operation("Add", Double::sum);
    }

    public static Operation multiplication() {
        return new Operation("Multiply", (a, b) -> a * b);
    }
}
```

```java
// 不需要 Calculator 实例就能创建 Operation
Calculator.Operation op = Calculator.addition();
System.out.println(op.getName() + ": " + op.apply(3, 4));  // Add: 7.0
```

| 特性 | 成员内部类 | 静态嵌套类 |
|------|-----------|-----------|
| 持有外部类引用 | 是 | 否 |
| 访问外部类实例成员 | 可以 | 不可以 |
| 创建方式 | `outer.new Inner()` | `new Outer.StaticNested()` |
| 适用场景 | 与外部类实例紧密耦合 | 逻辑分组的辅助类 |

## 局部内部类

局部内部类定义在方法或代码块内部，作用域仅限于该方法或代码块。它可以访问所在方法的局部变量（前提是这些变量是 `final` 或 effectively final）。

```java
public class Button {
    private String label;

    public Button(String label) {
        this.label = label;
    }

    public void setOnClickListener(String handlerName) {
        // 局部内部类
        class ClickHandler {
            void onClick() {
                System.out.println(handlerName + " handled click on " + label);
            }
        }

        ClickHandler handler = new ClickHandler();
        handler.onClick();
    }
}
```

```java
Button btn = new Button("Submit");
btn.setOnClickListener("MainController");
// 输出: MainController handled click on Submit
```

::: tip effectively final
Java 8 起，局部内部类和 Lambda 表达式可以访问没有声明为 `final` 但从未被重新赋值的局部变量。这种变量称为 **effectively final**。
:::

## 匿名内部类

匿名内部类没有名字，在创建实例的同时定义类体。它通常用于快速实现一个接口或继承一个类，适用于只需要使用一次的场景。

### 实现接口

```java
public interface Runnable {
    void run();
}

// 匿名内部类实现 Runnable
Runnable task = new Runnable() {
    @Override
    public void run() {
        System.out.println("Task is running");
    }
};

task.run();  // Task is running
```

### 继承类

```java
public abstract class Animal {
    private String name;

    public Animal(String name) {
        this.name = name;
    }

    public abstract String speak();

    public String getName() {
        return name;
    }
}

// 匿名内部类继承抽象类
Animal dog = new Animal("Buddy") {
    @Override
    public String speak() {
        return "Woof!";
    }
};

System.out.println(dog.getName() + " says " + dog.speak());
// Buddy says Woof!
```

### 实现 Comparator

排序是匿名内部类最常见的应用场景之一：

```java
import java.util.Arrays;
import java.util.Comparator;

public class SortDemo {
    public static void main(String[] args) {
        String[] names = {"Charlie", "Alice", "Bob", "David"};

        // 匿名内部类实现 Comparator
        Arrays.sort(names, new Comparator<String>() {
            @Override
            public int compare(String a, String b) {
                return a.length() - b.length();
            }
        });

        System.out.println(Arrays.toString(names));
        // [Bob, Alice, Charlie, David]
    }
}
```

### 实现事件监听器

在 Swing 等 GUI 框架中，匿名内部类被大量用于事件处理：

```java
import javax.swing.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class GuiDemo {
    public static void main(String[] args) {
        JFrame frame = new JFrame("Demo");
        JButton button = new JButton("Click Me");

        // 匿名内部类实现 ActionListener
        button.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                JOptionPane.showMessageDialog(frame, "Button clicked!");
            }
        });

        frame.add(button);
        frame.setSize(300, 200);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}
```

## 匿名内部类 vs Lambda 表达式

Java 8 引入了 Lambda 表达式，为函数式接口提供了更简洁的语法。对于只有一个抽象方法的接口（函数式接口），Lambda 通常可以替代匿名内部类。

```java
// 匿名内部类
Comparator<String> comp1 = new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.length() - b.length();
    }
};

// Lambda 等价写法
Comparator<String> comp2 = (a, b) -> a.length() - b.length();
```

```java
// 匿名内部类
Runnable task1 = new Runnable() {
    @Override
    public void run() {
        System.out.println("Hello");
    }
};

// Lambda 等价写法
Runnable task2 = () -> System.out.println("Hello");
```

但 Lambda 不能完全替代匿名内部类：

| 场景 | 匿名内部类 | Lambda |
|------|-----------|--------|
| 函数式接口（只有一个抽象方法） | 可以 | 可以，更简洁 |
| 抽象类 | 可以 | 不可以 |
| 多个抽象方法的接口 | 可以 | 不可以 |
| 需要 `this` 指向自身 | `this` 指向匿名类实例 | `this` 指向外部类实例 |
| 需要单独的类加载器标识 | 每个匿名类有自己的类名 | 共享外部类的类名 |

::: tip 选择建议
- 如果是函数式接口且逻辑简单，优先使用 **Lambda 表达式**。
- 如果需要继承抽象类、实现多个方法、或需要自己的 `this` 引用，使用**匿名内部类**。
- Lambda 的详细用法将在后续章节展开。
:::

## 综合示例：用匿名内部类实现 Runnable

```java
public class ThreadDemo {
    public static void main(String[] args) {
        // 方式一：匿名内部类
        Thread t1 = new Thread(new Runnable() {
            @Override
            public void run() {
                for (int i = 0; i < 5; i++) {
                    System.out.println("Thread-1: " + i);
                }
            }
        });

        // 方式二：Lambda（等价）
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 5; i++) {
                System.out.println("Thread-2: " + i);
            }
        });

        t1.start();
        t2.start();
    }
}
```

两种写法在功能上完全等价。编译器会把 Lambda 转换为等效的匿名内部类字节码（实际实现略有不同，Lambda 使用 `invokedynamic` 指令，但语义一致）。
