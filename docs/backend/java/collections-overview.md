# Java 集合体系概览

Java 集合框架（Collections Framework）提供了一套设计良好的接口和类，用于存储和操作一组对象。掌握集合体系是日常开发的基础。

## 为什么需要集合

数组的长度在创建时就固定了，无法动态增减元素。集合则可以自动扩容，还提供了查找、排序、去重等便捷操作。

```java
// 数组：大小固定
String[] arr = new String[3];
arr[0] = "A";
arr[1] = "B";
// arr 只能装 3 个，想加第 4 个就必须创建新数组并拷贝

// 集合：动态扩展
import java.util.ArrayList;
import java.util.List;

List<String> list = new ArrayList<>();
list.add("A");
list.add("B");
list.add("C");
list.add("D"); // 自动扩容，无需关心容量
System.out.println(list.size()); // 4
```

除了动态大小，集合框架还内置了迭代器、泛型类型安全、线程安全变体等能力，这些都是手动操作数组难以实现的。

## Collection 体系层次

集合框架的核心接口遵循 `Iterable → Collection → List / Set / Queue` 的继承链。

```
Iterable          （可迭代，支持 for-each）
  └── Collection  （集合根接口）
        ├── List    （有序、可重复）
        ├── Set     （无序、不重复）
        └── Queue   （队列，先进先出）
```

```java
import java.util.Collection;

// Collection 定义了所有集合的通用方法
public interface Collection<E> extends Iterable<E> {
    int size();
    boolean isEmpty();
    boolean contains(Object o);
    boolean add(E e);
    boolean remove(Object o);
    void clear();
    Iterator<E> iterator();
    Object[] toArray();
}
```

- **List**：元素有顺序，可以通过索引访问，允许重复元素。典型实现：`ArrayList`、`LinkedList`。
- **Set**：不允许重复元素，不保证顺序。典型实现：`HashSet`、`TreeSet`、`LinkedHashSet`。
- **Queue**：按特定规则排列元素，常用于任务调度。典型实现：`LinkedList`（也可作 Queue）、`PriorityQueue`。

## Map 独立体系

`Map` 存储键值对（key-value），它不继承 `Collection` 接口，而是独立的体系。

```
Map              （键值对根接口）
  ├── HashMap    （基于哈希表，无序）
  ├── LinkedHashMap （保持插入顺序）
  ├── TreeMap    （基于红黑树，按键排序）
  └── Hashtable  （线程安全，已过时）
```

```java
import java.util.HashMap;
import java.util.Map;

Map<String, Integer> map = new HashMap<>();
map.put("Alice", 90);
map.put("Bob", 85);
map.put("Carol", 92);

System.out.println(map.get("Bob")); // 85
System.out.println(map.containsKey("Alice")); // true
System.out.println(map.size()); // 3
```

:::: tip Map 和 Collection 的关系
虽然 `Map` 不继承 `Collection`，但它的 `keySet()`、`values()`、`entrySet()` 方法分别返回 `Set` 和 `Collection` 视图，因此仍然可以使用集合的操作方式来处理 Map 中的数据。
::::

## 如何选择容器

| 需求 | 选择 | 典型场景 |
|------|------|----------|
| 有序、可重复 | `List` | 保持插入顺序的数据列表 |
| 无序、不重复 | `Set` | 去重、判断存在性 |
| 键值对映射 | `Map` | 缓存、配置、索引 |
| 先进先出 | `Queue` | 任务队列、消息队列 |
| 自然排序 | `TreeSet` / `TreeMap` | 需要按特定顺序遍历 |
| 保持插入顺序 | `LinkedHashSet` / `LinkedHashMap` | 需要按添加顺序遍历 |
| 线程安全 | `ConcurrentHashMap` / `CopyOnWriteArrayList` | 多线程并发访问 |

```java
import java.util.*;

// 去重
Set<String> uniqueNames = new HashSet<>(Arrays.asList("Alice", "Bob", "Alice"));
System.out.println(uniqueNames); // [Bob, Alice]（顺序不保证）

// 有序列表
List<String> ordered = new ArrayList<>(Arrays.asList("C", "A", "B"));
Collections.sort(ordered);
System.out.println(ordered); // [A, B, C]

// 先进先出队列
Queue<String> queue = new LinkedList<>();
queue.offer("first");
queue.offer("second");
System.out.println(queue.poll()); // first
```

## 各实现类性能对比

不同实现类在常见操作上的时间复杂度差异很大，选择合适的实现类直接影响程序性能。

### List 性能对比

| 操作 | ArrayList | LinkedList |
|------|-----------|------------|
| 随机访问 `get(i)` | O(1) | O(n) |
| 尾部添加 `add(e)` | O(1)* | O(1) |
| 指定位置插入 `add(i, e)` | O(n) | O(1)** |
| 删除 `remove(i)` | O(n) | O(1)** |
| 查找 `contains` | O(n) | O(n) |

\* 均摊时间复杂度。** 前提是已经定位到节点。

### Set 性能对比

| 操作 | HashSet | LinkedHashSet | TreeSet |
|------|---------|---------------|---------|
| 添加 `add` | O(1) | O(1) | O(log n) |
| 删除 `remove` | O(1) | O(1) | O(log n) |
| 查找 `contains` | O(1) | O(1) | O(log n) |
| 有序遍历 | 不支持 | 插入顺序 | 自然排序 |

### Map 性能对比

| 操作 | HashMap | LinkedHashMap | TreeMap |
|------|---------|---------------|---------|
| `put` | O(1) | O(1) | O(log n) |
| `get` | O(1) | O(1) | O(log n) |
| `remove` | O(1) | O(1) | O(log n) |
| 有序遍历 | 不支持 | 插入/访问顺序 | 键排序 |

:::: warning HashMap 不保证顺序
`HashMap` 的遍历顺序可能与插入顺序不同，且在不同版本的 JDK 中行为可能不一致。如果需要稳定的顺序，请使用 `LinkedHashMap`。
::::

## `java.util` 包概览

`java.util` 包是集合框架的核心包，提供了大部分容器类和工具类。

```java
// 常用集合类所在位置
import java.util.List;         // List 接口
import java.util.ArrayList;    // 动态数组实现
import java.util.LinkedList;   // 双向链表实现
import java.util.Set;          // Set 接口
import java.util.HashSet;      // 哈希集合
import java.util.TreeSet;      // 有序集合
import java.util.Map;          // Map 接口
import java.util.HashMap;      // 哈希映射
import java.util.TreeMap;      // 有序映射
import java.util.Queue;        // 队列接口
import java.util.PriorityQueue; // 优先队列
import java.util.Collections;  // 集合工具类
import java.util.Arrays;       // 数组工具类
import java.util.Iterator;     // 迭代器
import java.util.Comparator;   // 比较器
```

`Collections` 工具类提供了排序、查找、同步包装等静态方法：

```java
import java.util.*;

List<Integer> nums = new ArrayList<>(Arrays.asList(3, 1, 4, 1, 5));
Collections.sort(nums);           // [1, 1, 3, 4, 5]
System.out.println(Collections.frequency(nums, 1)); // 2
System.out.println(Collections.max(nums)); // 5

// 创建不可变集合
List<String> fixed = Collections.unmodifiableList(nums);
// fixed.add(6); // 抛出 UnsupportedOperationException
```

:::: tip Java 9+ 不可变集合
Java 9 引入了 `List.of()`、`Set.of()`、`Map.of()` 等工厂方法，可以直接创建不可变集合，比 `Collections.unmodifiableList()` 更简洁：

```java
List<String> list = List.of("A", "B", "C");
Set<Integer> set = Set.of(1, 2, 3);
Map<String, Integer> map = Map.of("a", 1, "b", 2);
```

这些集合创建后不能修改（add、remove 会抛异常），适合用于常量数据。
::::
