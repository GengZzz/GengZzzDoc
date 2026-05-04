# Set 与 Map

Set 用于存储不重复的元素，Map 用于存储键值对映射。两者是 Java 集合框架中最常用的数据结构之一。

## Set 接口

Set 继承自 `Collection`，不允许包含重复元素。判断重复的依据是 `equals()` 方法（实际中先比较 `hashCode()`，再比较 `equals()`）。

```java
import java.util.HashSet;
import java.util.Set;

Set<String> set = new HashSet<>();
set.add("Java");
set.add("Python");
set.add("Java"); // 重复，添加失败

System.out.println(set.size());         // 2
System.out.println(set.contains("Java")); // true
```

### HashSet

`HashSet` 基于 `HashMap` 实现，是最常用的 Set 实现。元素无序，查找、添加、删除的平均时间复杂度为 O(1)。

```java
import java.util.HashSet;
import java.util.Set;

public class HashSetDemo {
    public static void main(String[] args) {
        Set<String> languages = new HashSet<>();

        languages.add("Java");
        languages.add("Python");
        languages.add("Go");
        languages.add("Rust");
        languages.add("Java"); // 重复，忽略

        System.out.println(languages.size()); // 4
        System.out.println(languages); // 顺序不保证

        // 遍历
        for (String lang : languages) {
            System.out.println(lang);
        }

        // 删除
        languages.remove("Go");
        System.out.println(languages.contains("Go")); // false
    }
}
```

### LinkedHashSet

`LinkedHashSet` 继承自 `HashSet`，内部使用双向链表维护元素的插入顺序。性能与 `HashSet` 接近，但遍历时会按添加顺序输出。

```java
import java.util.LinkedHashSet;
import java.util.Set;

public class LinkedHashSetDemo {
    public static void main(String[] args) {
        Set<String> ordered = new LinkedHashSet<>();
        ordered.add("Banana");
        ordered.add("Apple");
        ordered.add("Cherry");

        System.out.println(ordered); // [Banana, Apple, Cherry] — 保持插入顺序
    }
}
```

### TreeSet

`TreeSet` 基于红黑树实现，元素按自然顺序（或自定义 Comparator）排序。添加、删除、查找的时间复杂度为 O(log n)。

```java
import java.util.TreeSet;
import java.util.Set;

public class TreeSetDemo {
    public static void main(String[] args) {
        Set<Integer> numbers = new TreeSet<>();
        numbers.add(30);
        numbers.add(10);
        numbers.add(20);
        numbers.add(5);

        System.out.println(numbers); // [5, 10, 20, 30] — 自动排序

        // TreeSet 额外的方法
        TreeSet<Integer> treeSet = (TreeSet<Integer>) numbers;
        System.out.println(treeSet.first()); // 5（最小元素）
        System.out.println(treeSet.last());  // 30（最大元素）
    }
}
```

:::: tip 如何选择 Set

| 需求 | 选择 |
|------|------|
| 只需去重，不关心顺序 | `HashSet` |
| 需要保持插入顺序 | `LinkedHashSet` |
| 需要元素自动排序 | `TreeSet` |
| 多线程环境 | `ConcurrentHashMap.newKeySet()` 或 `Collections.newSetFromMap()` |

::::

## Map 接口

Map 存储键值对（key-value），每个键最多映射到一个值。键不能重复，值可以重复。

```java
import java.util.HashMap;
import java.util.Map;

Map<String, Integer> scores = new HashMap<>();
scores.put("Alice", 90);
scores.put("Bob", 85);
scores.put("Carol", 92);

System.out.println(scores.get("Alice"));     // 90
System.out.println(scores.getOrDefault("Dave", 0)); // 0
System.out.println(scores.containsKey("Bob")); // true
System.out.println(scores.containsValue(92));  // true
```

### HashMap

`HashMap` 是最常用的 Map 实现，基于哈希表，允许 null 键和 null 值。查找、插入、删除的平均时间复杂度为 O(1)。

```java
import java.util.HashMap;
import java.util.Map;

public class HashMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> wordCount = new HashMap<>();

        String[] words = {"apple", "banana", "apple", "cherry", "banana", "apple"};

        for (String word : words) {
            wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
        }

        System.out.println(wordCount);
        // {apple=3, banana=2, cherry=1}

        // putIfAbsent：仅当键不存在时才放入
        wordCount.putIfAbsent("date", 0);
        System.out.println(wordCount.get("date")); // 0

        // computeIfAbsent：键不存在时计算并放入
        wordCount.computeIfAbsent("elderberry", k -> 0);
    }
}
```

### LinkedHashMap

`LinkedHashMap` 保持插入顺序（默认）或访问顺序（`accessOrder=true` 时）。遍历时顺序可预测。

```java
import java.util.LinkedHashMap;
import java.util.Map;

public class LinkedHashMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> ordered = new LinkedHashMap<>();
        ordered.put("Banana", 2);
        ordered.put("Apple", 5);
        ordered.put("Cherry", 3);

        System.out.println(ordered);
        // {Banana=2, Apple=5, Cherry=3} — 保持插入顺序
    }
}
```

:::: tip 用 LinkedHashMap 实现 LRU 缓存
通过重写 `removeEldestEntry` 并设置 `accessOrder=true`，可以用 `LinkedHashMap` 实现简单的 LRU（最近最少使用）缓存：

```java
public class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxSize;

    public LRUCache(int maxSize) {
        super(maxSize, 0.75f, true); // accessOrder=true
        this.maxSize = maxSize;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxSize;
    }
}

// 使用
LRUCache<String, Integer> cache = new LRUCache<>(3);
cache.put("A", 1);
cache.put("B", 2);
cache.put("C", 3);
cache.put("D", 4); // A 被自动淘汰
System.out.println(cache); // {B=2, C=3, D=4}
```
::::

### TreeMap

`TreeMap` 基于红黑树，按键的自然顺序（或自定义 Comparator）排序。提供了 `firstKey()`、`lastKey()`、`headMap()`、`tailMap()` 等范围操作方法。

```java
import java.util.TreeMap;
import java.util.Map;

public class TreeMapDemo {
    public static void main(String[] args) {
        Map<String, Integer> sorted = new TreeMap<>();
        sorted.put("Charlie", 70);
        sorted.put("Alice", 90);
        sorted.put("Bob", 85);

        System.out.println(sorted);
        // {Alice=90, Bob=85, Charlie=70} — 按键排序

        TreeMap<String, Integer> treeMap = new TreeMap<>(sorted);
        System.out.println(treeMap.firstKey()); // Alice
        System.out.println(treeMap.lastKey());  // Charlie
    }
}
```

### Hashtable（已过时）

`Hashtable` 是早期的线程安全 Map 实现，但已被 `ConcurrentHashMap` 取代。不推荐在新代码中使用。

```java
// 不推荐
Hashtable<String, Integer> old = new Hashtable<>();

// 推荐的线程安全替代
import java.util.concurrent.ConcurrentHashMap;
ConcurrentHashMap<String, Integer> safe = new ConcurrentHashMap<>();
```

:::: warning Hashtable 的问题
`Hashtable` 的所有方法都用 `synchronized` 修饰，导致整个表被锁住，并发性能差。`ConcurrentHashMap` 使用分段锁（Java 7）或 CAS + synchronized（Java 8+），并发性能远优于 `Hashtable`。此外，`Hashtable` 不允许 null 键和 null 值，而 `HashMap` 允许。
::::

## 哈希冲突与链表转红黑树

当两个不同的 key 经过哈希运算后映射到同一个桶（bucket）位置时，就发生了哈希冲突。`HashMap` 使用拉链法处理冲突：同一个桶中的元素以链表形式存储。

Java 8 对 `HashMap` 做了重要优化：当链表长度超过 8 且桶的总数 >= 64 时，链表会转换为红黑树，将查找时间从 O(n) 优化到 O(log n)。

```
桶 0:  → [key1, val1] → null
桶 1:  → null
桶 2:  → [key2, val2] → [key3, val3] → null
桶 3:  → null
...

当桶 2 中元素超过 8 个且总桶数 >= 64 时：
桶 2:  → 红黑树结构（O(log n) 查找）
```

:::: tip 影响 HashMap 性能的因素
- **哈希函数质量**：好的哈希函数能让元素均匀分布在各个桶中。
- **初始容量**：容量越大，冲突概率越低，但占用内存越多。
- **负载因子**：默认 0.75，即元素数量超过 容量 * 0.75 时触发扩容。负载因子越小，冲突越少，但空间利用率越低。
::::

## equals() 与 hashCode() 契约

用自定义对象作为 HashMap 的 key 或 HashSet 的元素时，必须正确重写 `equals()` 和 `hashCode()`。

```java
import java.util.Objects;

public class Student {
    private String name;
    private int id;

    public Student(String name, int id) {
        this.name = name;
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Student student = (Student) o;
        return id == student.id && Objects.equals(name, student.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, id);
    }

    @Override
    public String toString() {
        return name + "(" + id + ")";
    }
}
```

```java
import java.util.HashMap;
import java.util.Map;

public class EqualsHashDemo {
    public static void main(String[] args) {
        Map<Student, String> map = new HashMap<>();
        Student s1 = new Student("Alice", 1001);
        Student s2 = new Student("Alice", 1001);

        map.put(s1, "Computer Science");
        System.out.println(map.get(s2)); // Computer Science
        // 因为 s1.equals(s2) == true 且 hashCode 相同
    }
}
```

:::: warning 只重写 equals 不重写 hashCode 的后果
如果只重写 `equals()` 而不重写 `hashCode()`，两个 `equals()` 为 true 的对象可能有不同的哈希值，导致它们被放入不同的桶中。结果是 `map.get()` 返回 null，`set.add()` 产生重复元素，HashMap 和 HashSet 的行为完全不符合预期。**重写 equals 必须同时重写 hashCode，这是铁律。**
::::

## 遍历 Map

Map 提供了多种遍历方式，适用于不同的场景。

```java
import java.util.HashMap;
import java.util.Map;

public class MapTraversal {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        map.put("Alice", 90);
        map.put("Bob", 85);
        map.put("Carol", 92);

        // 方式一：entrySet — 同时获取键和值（推荐）
        for (Map.Entry<String, Integer> entry : map.entrySet()) {
            System.out.println(entry.getKey() + " => " + entry.getValue());
        }

        // 方式二：keySet — 只需要键时使用
        for (String key : map.keySet()) {
            System.out.println(key + ": " + map.get(key));
        }

        // 方式三：values — 只需要值时使用
        for (Integer value : map.values()) {
            System.out.println(value);
        }

        // 方式四：forEach（Java 8+）
        map.forEach((key, value) ->
            System.out.println(key + " -> " + value)
        );
    }
}
```

:::: tip 遍历性能
使用 `entrySet()` 遍历比 `keySet()` 更高效。`keySet()` 在循环内通过 `map.get(key)` 获取值时会额外做一次哈希查找，而 `entrySet()` 直接持有键值对引用，无需二次查找。
::::
