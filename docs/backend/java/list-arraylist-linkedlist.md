# List 接口：ArrayList 与 LinkedList

List 是最常用的集合类型，它保证元素按插入顺序排列，允许重复元素，支持通过索引访问。

## List 接口特征

List 继承自 `Collection`，在保持集合通用操作的基础上，增加了基于索引的随机访问能力。

```java
import java.util.List;
import java.util.ArrayList;

List<String> list = new ArrayList<>();
list.add("Java");
list.add("Python");
list.add("Java");  // 允许重复

System.out.println(list.get(0));    // Java — 按索引访问
System.out.println(list.size());    // 3
System.out.println(list.contains("Python")); // true
System.out.println(list.indexOf("Java"));    // 0（第一次出现的位置）
```

List 的三个核心特征：
- **有序**：元素按照添加顺序排列。
- **可重复**：同一个元素可以出现多次。
- **索引访问**：通过整数下标获取、设置元素，下标从 0 开始。

## ArrayList

`ArrayList` 基于动态数组实现，是日常开发中使用频率最高的 List 实现。

### 基本操作

```java
import java.util.ArrayList;
import java.util.List;

public class ArrayListDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();

        // 添加
        list.add("Apple");
        list.add("Banana");
        list.add("Cherry");

        // 获取
        String first = list.get(0);
        System.out.println(first); // Apple

        // 修改（替换指定位置的元素）
        list.set(1, "Blueberry");
        System.out.println(list); // [Apple, Blueberry, Cherry]

        // 删除
        list.remove(0);              // 按索引删除
        list.remove("Cherry");       // 按元素删除
        System.out.println(list);    // [Blueberry]

        // 查询
        System.out.println(list.size());      // 1
        System.out.println(list.contains("Blueberry")); // true
        System.out.println(list.isEmpty());   // false

        // 清空
        list.clear();
        System.out.println(list.size()); // 0
    }
}
```

### 遍历方式

ArrayList 支持三种遍历方式，各有适用场景。

```java
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class ArrayListTraversal {
    public static void main(String[] args) {
        List<String> fruits = new ArrayList<>(List.of("Apple", "Banana", "Cherry", "Date"));

        // 方式一：传统 for 循环（需要索引时使用）
        for (int i = 0; i < fruits.size(); i++) {
            System.out.println(i + ": " + fruits.get(i));
        }

        // 方式二：for-each（最简洁，推荐日常使用）
        for (String fruit : fruits) {
            System.out.println(fruit);
        }

        // 方式三：Iterator（需要在遍历时删除元素时使用）
        Iterator<String> it = fruits.iterator();
        while (it.hasNext()) {
            String fruit = it.next();
            if (fruit.startsWith("B")) {
                it.remove(); // 安全删除当前元素
            }
        }
        System.out.println(fruits); // [Apple, Cherry, Date]
    }
}
```

:::: tip 遍历时删除元素
在 for-each 循环中直接调用 `list.remove()` 会抛出 `ConcurrentModificationException`。如果需要边遍历边删除，请使用 `Iterator.remove()`，或者在 Java 8+ 中使用 `list.removeIf()`：

```java
fruits.removeIf(f -> f.startsWith("B"));
```
::::

### 初始容量与扩容机制

`ArrayList` 内部使用数组存储元素。当数组满了需要添加新元素时，会创建一个更大的数组并将旧数据拷贝过去。

```java
import java.util.ArrayList;

public class ArrayListCapacity {
    public static void main(String[] args) {
        // 指定初始容量为 100，避免频繁扩容
        ArrayList<String> list = new ArrayList<>(100);

        // 默认初始容量是 10
        ArrayList<String> defaultList = new ArrayList<>();

        // 也可以从已有集合构造
        ArrayList<String> copy = new ArrayList<>(list);
    }
}
```

扩容逻辑（以 JDK 17 为例）：

1. 默认初始容量为 10。
2. 当容量不足时，新容量 = 旧容量 + (旧容量 >> 1)，即大约 1.5 倍。
3. 如果 1.5 倍仍不够，直接使用所需最小容量。
4. 扩容涉及数组拷贝（`Arrays.copyOf`），是 O(n) 操作。

:::: warning 频繁扩容的性能问题
如果事先知道大概的元素数量，建议在构造时指定初始容量，避免多次扩容导致的数组拷贝开销：

```java
// 预计存储 1000 个元素
List<String> list = new ArrayList<>(1000);
```
::::

## LinkedList

`LinkedList` 基于双向链表实现，每个节点保存对前驱和后继节点的引用。

### 与 ArrayList 的区别

```java
import java.util.LinkedList;
import java.util.List;

public class LinkedListDemo {
    public static void main(String[] args) {
        List<String> list = new LinkedList<>();

        list.add("First");
        list.add("Second");
        list.add("Third");

        // List 接口的方法同样适用
        System.out.println(list.get(0));   // First
        System.out.println(list.size());   // 3

        // 在头部插入：LinkedList O(1)，ArrayList O(n)
        list.add(0, "Zero");
        System.out.println(list); // [Zero, First, Second, Third]
    }
}
```

### LinkedList 独有方法

`LinkedList` 实现了 `Deque` 接口，提供了头尾操作的方法。使用时需要将变量声明为 `LinkedList` 类型（或 `Deque` 接口），而不能用 `List` 接口。

```java
import java.util.LinkedList;

public class LinkedListExtra {
    public static void main(String[] args) {
        LinkedList<String> list = new LinkedList<>();

        // 头部操作
        list.addFirst("A");
        list.addFirst("B");
        System.out.println(list);       // [B, A]
        System.out.println(list.getFirst()); // B

        // 尾部操作
        list.addLast("C");
        System.out.println(list.getLast());  // C
        System.out.println(list);       // [B, A, C]

        // 头尾删除
        String head = list.removeFirst(); // B
        String tail = list.removeLast();  // C
        System.out.println(list);         // [A]
    }
}
```

### 作为 Queue / Deque 使用

```java
import java.util.LinkedList;
import java.util.Queue;
import java.util.Deque;

public class LinkedListAsQueue {
    public static void main(String[] args) {
        // 作为 Queue（先进先出）
        Queue<String> queue = new LinkedList<>();
        queue.offer("任务1");
        queue.offer("任务2");
        queue.offer("任务3");
        System.out.println(queue.poll()); // 任务1
        System.out.println(queue.peek()); // 任务2

        // 作为 Deque（双端队列，也可作栈）
        Deque<String> stack = new LinkedList<>();
        stack.push("底部");
        stack.push("中间");
        stack.push("顶部");
        System.out.println(stack.pop()); // 顶部
        System.out.println(stack.pop()); // 中间
    }
}
```

:::: warning LinkedList 的随机访问陷阱
虽然 `LinkedList.get(index)` 可以按索引访问元素，但每次调用都需要从头或尾遍历链表，时间复杂度为 O(n)。以下代码的性能会非常差：

```java
// 反模式：对 LinkedList 用 for-i 循环
LinkedList<Integer> list = new LinkedList<>();
for (int i = 0; i < 100000; i++) {
    list.add(i);
}
for (int i = 0; i < list.size(); i++) {
    list.get(i); // 每次 get 都是 O(n)，总复杂度 O(n²)
}
```

需要遍历 LinkedList 时，应使用 for-each 或 Iterator。
::::

## 选择建议

| 场景 | 推荐 | 原因 |
|------|------|------|
| 大多数场景 | `ArrayList` | 随机访问快，内存紧凑，CPU 缓存友好 |
| 频繁在头部插入删除 | `LinkedList` | 头尾操作 O(1) |
| 需要当作队列/栈使用 | `LinkedList` | 实现了 Deque 接口 |
| 已知大致容量 | `ArrayList(初始容量)` | 避免频繁扩容 |
| 只读列表 | `List.of(...)` | 不可变，线程安全，零开销 |

实际开发中，`ArrayList` 几乎总是首选。除非有明确的头尾频繁插入删除需求，否则不需要使用 `LinkedList`。

## subList 与不可变列表

### subList

`subList(fromIndex, toIndex)` 返回原列表的一个视图（非拷贝），对子列表的修改会影响原列表。

```java
import java.util.ArrayList;
import java.util.List;

public class SubListDemo {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4, 5));
        List<Integer> sub = list.subList(1, 4); // [2, 3, 4]

        sub.set(0, 20);  // 修改子列表
        System.out.println(list); // [1, 20, 3, 4, 5] — 原列表也被修改

        sub.clear(); // 清空子列表
        System.out.println(list); // [1, 5] — 原列表对应部分也被删除
    }
}
```

:::: warning subList 的边界
`subList` 返回的是原列表的视图。在对子列表操作期间，不要对原列表进行结构性修改（添加或删除元素），否则会抛出 `ConcurrentModificationException`。
::::

### List.of（Java 9+）

`List.of()` 创建不可变列表，适用于常量数据、方法返回值等不需要修改的场景。

```java
import java.util.List;

public class ImmutableList {
    public static void main(String[] args) {
        List<String> days = List.of("Mon", "Tue", "Wed", "Thu", "Fri");

        System.out.println(days.get(0)); // Mon
        System.out.println(days.size()); // 5

        // days.add("Sat");    // UnsupportedOperationException
        // days.set(0, "X");   // UnsupportedOperationException
        // days.remove(0);     // UnsupportedOperationException
    }

    // 适合用作方法返回不可变结果
    public static List<String> getSupportedLanguages() {
        return List.of("Java", "Python", "Go");
    }
}
```

:::: tip 不可变列表的用途
`List.of()` 返回的列表不可修改、不允许 null 元素、线程安全。适合用于配置项、枚举值、测试数据等固定不变的集合。如果需要可修改的列表，用 `new ArrayList<>(List.of(...))` 包装即可。
::::
