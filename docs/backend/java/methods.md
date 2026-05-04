# 方法详解

方法是类中定义的行为。掌握方法的签名规则、参数传递机制和重载机制，是编写 Java 程序的基础。

## 方法签名

一个方法由以下部分组成：

```
访问修饰符  返回类型  方法名(参数列表) { 方法体 }
```

```java
public class Calculator {
    // 返回 int，接受两个 int 参数
    public int add(int a, int b) {
        return a + b;
    }

    // 无返回值
    public void printSum(int a, int b) {
        System.out.println("Sum = " + (a + b));
    }
}
```

## 参数传递

Java 中**所有参数都是按值传递**（pass by value），但对对象类型来说，传递的是引用的副本——也就是拷贝了一份地址，而非拷贝整个对象。

```java
public class ParamDemo {

    // 基本类型：传的是值的拷贝，修改不影响原变量
    static void changeInt(int x) {
        x = 100;
    }

    // 对象类型：传的是引用的拷贝，可以通过它修改对象内容
    static void changeName(Person p) {
        p.name = "Changed";  // 影响原对象
    }

    // 但重新赋值引用，不会影响调用者
    static void replacePerson(Person p) {
        p = new Person("New", 0);  // 只改变了局部副本
    }

    public static void main(String[] args) {
        int a = 10;
        changeInt(a);
        System.out.println(a);          // 输出 10，未被修改

        Person alice = new Person("Alice", 25);
        changeName(alice);
        System.out.println(alice.name);  // 输出 "Changed"

        replacePerson(alice);
        System.out.println(alice.name);  // 输出 "Changed"，未变成 "New"
    }
}
```

::: tip 记忆要点
基本类型传递的是**值的拷贝**，方法内修改不影响原值。对象类型传递的是**引用的拷贝**，方法内可以通过它修改对象，但不能让调用者的引用指向别的对象。
:::

## 返回值

方法可以返回一个值，也可以用 `void` 表示不返回任何值。

```java
public class MathUtils {
    // 返回 int
    public static int max(int a, int b) {
        return a > b ? a : b;
    }

    // void：不返回值，return 可省略或仅用于提前退出
    public static void printIfPositive(int n) {
        if (n <= 0) {
            return;  // 提前退出
        }
        System.out.println(n);
    }
}
```

## 方法重载

同一个类中可以定义多个**同名**方法，只要它们的**参数列表不同**（参数个数、类型或顺序不同）。这叫做方法重载（Overloading）。

```java
public class Printer {
    public void print(int value) {
        System.out.println("int: " + value);
    }

    public void print(double value) {
        System.out.println("double: " + value);
    }

    public void print(String value) {
        System.out.println("String: " + value);
    }

    public void print(int a, int b) {
        System.out.println("two ints: " + a + ", " + b);
    }

    public static void main(String[] args) {
        Printer p = new Printer();
        p.print(42);          // 调用 print(int)
        p.print(3.14);        // 调用 print(double)
        p.print("hello");     // 调用 print(String)
        p.print(1, 2);        // 调用 print(int, int)
    }
}
```

::: warning 注意
返回类型不同不构成重载。以下代码编译错误：
```java
int calc(int a) { return a; }
double calc(int a) { return a * 1.0; }  // 编译错误：参数列表相同
```
:::

## 可变参数

可变参数（varargs）允许方法接受不定数量的实参，语法为 `类型... 参数名`，其本质是一个数组。

```java
public class VarargsDemo {
    public static int sum(int... nums) {
        int total = 0;
        for (int n : nums) {
            total += n;
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum(1, 2, 3));        // 6
        System.out.println(sum(10, 20));          // 30
        System.out.println(sum());                // 0

        // 也可以传数组
        int[] arr = {4, 5, 6};
        System.out.println(sum(arr));             // 15
    }
}
```

::: tip
一个方法最多只能有一个可变参数，且必须放在参数列表的最后。
```java
// 合法
public void log(String prefix, int... values) { }

// 不合法
public void log(int... values, String suffix) { }  // 编译错误
```
:::

## 递归

方法调用自身就是递归。递归必须有**终止条件**，否则会无限调用直到栈溢出。

```java
public class RecursionDemo {

    // 阶乘：n! = n * (n-1)!
    public static long factorial(int n) {
        if (n <= 1) return 1;       // 终止条件
        return n * factorial(n - 1);
    }

    // 斐波那契：fib(n) = fib(n-1) + fib(n-2)
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    public static void main(String[] args) {
        System.out.println("5! = " + factorial(5));   // 120
        System.out.println("fib(10) = " + fibonacci(10)); // 55
    }
}
```

递归虽然写法简洁，但性能通常不如迭代。以阶乘为例：

```java
// 迭代版本，没有栈开销
public static long factorialIter(int n) {
    long result = 1;
    for (int i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
```

::: warning 栈溢出风险
过深的递归会导致 `StackOverflowError`。对于深度很大的问题，优先考虑迭代或尾递归优化。
:::

## static 方法

用 `static` 修饰的方法属于类本身，而非某个对象实例。可以直接通过 `类名.方法名()` 调用，不需要创建对象。

```java
public class StringUtils {
    public static boolean isEmpty(String s) {
        return s == null || s.length() == 0;
    }

    public static void main(String[] args) {
        // 直接通过类名调用
        System.out.println(StringUtils.isEmpty(""));    // true
        System.out.println(StringUtils.isEmpty("hi"));  // false
    }
}
```

static 方法中**不能**直接访问实例字段或调用实例方法，因为它不属于任何对象：

```java
public class Demo {
    int x = 10;                    // 实例字段

    static void foo() {
        // System.out.println(x);  // 编译错误：无法访问实例字段
    }

    void bar() {
        System.out.println(x);     // 可以访问，这是实例方法
    }
}
```

## Javadoc 文档注释

Java 使用 `/** */` 作为文档注释，可以被 `javadoc` 工具提取生成 API 文档。

```java
/**
 * 计算两个整数的和。
 *
 * @param a 第一个加数
 * @param b 第二个加数
 * @return 两数之和
 */
public static int add(int a, int b) {
    return a + b;
}
```

常用标签：`@param` 描述参数，`@return` 描述返回值，`@throws` 描述可能抛出的异常。
