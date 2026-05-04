# Java 泛型

泛型（Generics）允许类、接口和方法在定义时使用类型参数，在使用时再指定具体类型。它是 Java 5 引入的核心特性，解决了类型安全和代码复用的问题。

## 为什么需要泛型

没有泛型之前，集合可以存放任意类型的对象，取出时必须强制转换，既繁琐又容易出错。

```java
import java.util.ArrayList;
import java.util.List;

// 没有泛型：需要强制转换，运行时可能出错
List list = new ArrayList();
list.add("hello");
list.add(123); // 编译通过，但语义上不一致
String s = (String) list.get(0); // 必须强转
// String bad = (String) list.get(1); // 运行时 ClassCastException

// 使用泛型：编译时就能发现类型错误
List<String> safeList = new ArrayList<>();
safeList.add("hello");
// safeList.add(123); // 编译错误，类型不匹配
String item = safeList.get(0); // 无需强转
```

泛型的核心价值：
- **类型安全**：编译器在编译阶段就能捕获类型错误。
- **消除强制转换**：取出元素时无需手动转换。
- **代码复用**：一套逻辑可以处理多种类型。

## 泛型类

在类名后声明类型参数，类内部可以把类型参数当作实际类型使用。

```java
public class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T getValue() {
        return value;
    }

    public void setValue(T value) {
        this.value = value;
    }

    @Override
    public String toString() {
        return "Box[" + value + "]";
    }
}
```

```java
public class BoxDemo {
    public static void main(String[] args) {
        Box<String> strBox = new Box<>("Hello");
        System.out.println(strBox.getValue()); // Hello

        Box<Integer> intBox = new Box<>(42);
        System.out.println(intBox.getValue()); // 42

        // 编译器自动知道类型，无需转换
        String s = strBox.getValue(); // 直接是 String，无需 (String) 强转
        Integer n = intBox.getValue();
    }
}
```

一个类可以声明多个类型参数：

```java
public class Pair<K, V> {
    private K key;
    private V value;

    public Pair(K key, V value) {
        this.key = key;
        this.value = value;
    }

    public K getKey() { return key; }
    public V getValue() { return value; }

    @Override
    public String toString() {
        return "(" + key + ", " + value + ")";
    }
}
```

```java
Pair<String, Integer> pair = new Pair<>("age", 25);
System.out.println(pair); // (age, 25)
```

## 泛型方法

方法可以独立于类拥有自己的类型参数。类型参数声明在返回值之前。

```java
public class Util {

    // 泛型方法：<T> 声明类型参数
    public static <T> void print(T item) {
        System.out.println(item);
    }

    // 返回类型也可以是泛型参数
    public static <T> T getFirst(T[] array) {
        if (array == null || array.length == 0) {
            return null;
        }
        return array[0];
    }

    // 多个类型参数
    public static <K, V> Pair<K, V> of(K key, V value) {
        return new Pair<>(key, value);
    }
}
```

```java
public class GenericMethodDemo {
    public static void main(String[] args) {
        Util.print("Hello");     // T 推断为 String
        Util.print(42);          // T 推断为 Integer
        Util.print(3.14);        // T 推断为 Double

        Integer[] nums = {1, 2, 3};
        Integer first = Util.getFirst(nums); // T 推断为 Integer

        Pair<String, Double> p = Util.of("pi", 3.14159);
        System.out.println(p); // (pi, 3.14159)
    }
}
```

:::: tip 类型推断
Java 7+ 支持菱形操作符 `<>`，编译器能自动推断类型参数，无需重复书写：

```java
// Java 7+
Box<String> box = new Box<>("hello");

// 更早版本需要写两遍
Box<String> box = new Box<String>("hello");
```
::::

## 泛型接口

接口也可以声明类型参数，实现类在实现时指定具体类型。

```java
public interface Converter<F, T> {
    T convert(F from);
}
```

```java
public class StringToIntegerConverter implements Converter<String, Integer> {
    @Override
    public Integer convert(String from) {
        return Integer.parseInt(from);
    }
}
```

```java
public class GenericInterfaceDemo {
    public static void main(String[] args) {
        Converter<String, Integer> converter = new StringToIntegerConverter();
        Integer result = converter.convert("123");
        System.out.println(result); // 123
    }
}
```

## 有界类型参数

可以用 `extends` 关键字限制类型参数必须是某个类或实现了某个接口的类型。

```java
public class MathUtil {

    // T 必须是 Number 的子类
    public static <T extends Number> double sum(T a, T b) {
        return a.doubleValue() + b.doubleValue();
    }

    // T 必须实现 Comparable 接口
    public static <T extends Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }
}
```

```java
public class BoundedDemo {
    public static void main(String[] args) {
        System.out.println(MathUtil.sum(3, 4.5));     // 7.5
        System.out.println(MathUtil.max(10, 20));      // 20
        System.out.println(MathUtil.max("abc", "xyz")); // xyz

        // MathUtil.sum("a", "b"); // 编译错误：String 不是 Number 的子类
    }
}
```

有界类型参数让泛型方法能安全地调用特定类型的方法（如上面的 `doubleValue()` 和 `compareTo()`）。

## 通配符

通配符（Wildcard）用 `?` 表示未知类型，用于更灵活地接收泛型参数。

### 上界通配符 `? extends T`

表示"某种类型，它是 T 或 T 的子类"。只能读取（生产者），不能安全地写入。

```java
import java.util.List;

public class UpperBound {

    // 接收 List<Integer>、List<Double>、List<Number> 等
    public static double sumOfList(List<? extends Number> list) {
        double sum = 0;
        for (Number n : list) {
            sum += n.doubleValue(); // 可以读取为 Number
        }
        return sum;
    }

    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3);
        List<Double> doubles = List.of(1.1, 2.2, 3.3);

        System.out.println(sumOfList(ints));    // 6.0
        System.out.println(sumOfList(doubles)); // 6.6
    }
}
```

:::: warning 上界通配符不能写入
使用 `? extends T` 时，编译器无法确定实际类型是什么，因此不允许写入（除了 null）：

```java
List<? extends Number> list = new ArrayList<Integer>();
// list.add(42);    // 编译错误
// list.add(3.14);  // 编译错误
Number n = list.get(0); // 可以读取
```
::::

### 下界通配符 `? super T`

表示"某种类型，它是 T 或 T 的父类"。只能写入（消费者），读取时只能当作 Object。

```java
import java.util.List;

public class LowerBound {

    // 可以向 List<Number> 或 List<Object> 中添加 Integer
    public static void addNumbers(List<? super Integer> list) {
        list.add(1);
        list.add(2);
        list.add(3);
    }

    public static void main(String[] args) {
        List<Number> numbers = new java.util.ArrayList<>();
        addNumbers(numbers);
        System.out.println(numbers); // [1, 2, 3]
    }
}
```

### 无界通配符 `?`

表示"任意类型"，等价于 `? extends Object`。当你不关心具体类型，只需要遍历或调用 Object 方法时使用。

```java
import java.util.List;

public static void printAll(List<?> list) {
    for (Object item : list) {
        System.out.println(item);
    }
}
```

## PECS 原则

PECS = Producer-Extends, Consumer-Super。这是选择通配符的经验法则：

- 如果一个泛型集合**产出**数据（你从中读取），用 `? extends T`。
- 如果一个泛型集合**消费**数据（你向其中写入），用 `? super T`。
- 如果既读又写，不要用通配符。

```java
import java.util.Comparator;
import java.util.List;

public class PECS {

    // source 是生产者（只读取），dest 是消费者（只写入）
    public static <T> void copy(List<? extends T> source, List<? super T> dest) {
        for (T item : source) {
            dest.add(item);
        }
    }

    public static void main(String[] args) {
        List<Integer> src = List.of(1, 2, 3);
        List<Number> dst = new java.util.ArrayList<>();
        copy(src, dst);
        System.out.println(dst); // [1, 2, 3]
    }
}
```

:::: tip Java 标准库中的 PECS
`Collections.copy()` 的签名就是经典的 PECS 应用：

```java
public static <T> void copy(List<? super T> dest, List<? extends T> src)
```

`src` 是生产者用 `extends`，`dest` 是消费者用 `super`。
::::

## 类型擦除

Java 泛型在编译后会进行类型擦除（Type Erasure）。泛型信息只存在于编译期，运行时 JVM 看不到泛型。

```java
// 编译前
List<String> list = new ArrayList<>();
list.add("hello");
String s = list.get(0);

// 编译后（等价于）
List list = new ArrayList();
list.add("hello");
String s = (String) list.get(0); // 编译器自动插入强制转换
```

类型擦除的影响：

```java
public class ErasureDemo {
    public static void main(String[] args) {
        List<String> strList = new ArrayList<>();
        List<Integer> intList = new ArrayList<>();

        // 运行时两个 List 的类型相同
        System.out.println(strList.getClass() == intList.getClass()); // true

        // 以下操作不可行
        // if (obj instanceof List<String>) {}  // 编译错误
        // new T();                              // 编译错误
        // T[] array = new T[10];                // 编译错误
    }
}
```

## 泛型限制

由于类型擦除，泛型有一些使用限制。

### 不能实例化类型参数

```java
public class Container<T> {
    private T value;

    public Container() {
        // this.value = new T(); // 编译错误：不知道 T 的具体类型
    }
}
```

解决办法：通过反射或传入 Class 对象。

```java
public class Container<T> {
    private T value;

    public Container(Class<T> clazz) throws Exception {
        this.value = clazz.getDeclaredConstructor().newInstance();
    }
}
```

### 不能使用基本类型

泛型参数不能是基本类型（`int`、`double` 等），必须使用对应的包装类。

```java
// List<int> list = new ArrayList<>(); // 编译错误
List<Integer> list = new ArrayList<>(); // 正确
list.add(42); // 自动装箱：int → Integer
int n = list.get(0); // 自动拆箱：Integer → int
```

### 不能创建泛型数组

```java
// T[] array = new T[10];        // 编译错误
// List<String>[] array = new List<String>[10]; // 编译错误

// 可以用 Object 数组然后强转（不推荐但可行）
@SuppressWarnings("unchecked")
T[] array = (T[]) new Object[10];
```

:::: warning 原始类型
不带类型参数使用泛型类（如直接用 `List` 而不是 `List<String>`）称为原始类型。原始类型会绕过泛型的类型检查，导致运行时类型转换异常。编译器会对此发出警告。

```java
// 不推荐：原始类型
List rawList = new ArrayList();
rawList.add("hello");
rawList.add(123); // 编译通过，但破坏了类型安全

// 推荐：参数化类型
List<String> list = new ArrayList<>();
list.add("hello");
// list.add(123); // 编译错误，类型安全
```

仅在与遗留代码交互时才使用原始类型，新代码中应始终指定类型参数。
::::
