# Iterator 与 Comparator

遍历集合和排序集合元素是日常开发中最常见的操作。Java 提供了 Iterator 用于遍历、Comparable 和 Comparator 用于排序。

## Iterator 接口

`Iterator` 是集合遍历的统一抽象，提供了三个核心方法。

```java
public interface Iterator<E> {
    boolean hasNext();  // 是否还有下一个元素
    E next();           // 返回下一个元素
    void remove();      // 删除上一次 next() 返回的元素
}
```

```java
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class IteratorDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("A", "B", "C", "D", "E"));

        Iterator<String> it = list.iterator();
        while (it.hasNext()) {
            String item = it.next();
            System.out.println(item);
            if (item.equals("C")) {
                it.remove(); // 安全删除当前元素
            }
        }

        System.out.println(list); // [A, B, D, E]
    }
}
```

`Iterator.remove()` 是遍历过程中唯一安全的删除方式。直接调用 `list.remove()` 会导致 `ConcurrentModificationException`。

## Iterable 接口

实现 `Iterable` 接口的类可以使用 for-each 循环。for-each 的本质就是调用 `iterator()` 方法。

```java
public interface Iterable<T> {
    Iterator<T> iterator();
}
```

所有集合类（`List`、`Set`、`Queue`）都实现了 `Iterable`，因此它们都能用 for-each 遍历。

自定义类实现 `Iterable` 后也能用 for-each：

```java
import java.util.Iterator;
import java.util.NoSuchElementException;

public class Range implements Iterable<Integer> {
    private final int start;
    private final int end;

    public Range(int start, int end) {
        this.start = start;
        this.end = end;
    }

    @Override
    public Iterator<Integer> iterator() {
        return new Iterator<>() {
            private int current = start;

            @Override
            public boolean hasNext() {
                return current < end;
            }

            @Override
            public Integer next() {
                if (!hasNext()) {
                    throw new NoSuchElementException();
                }
                return current++;
            }
        };
    }
}
```

```java
public class RangeDemo {
    public static void main(String[] args) {
        // Range 实现了 Iterable，可以直接用 for-each
        for (int i : new Range(1, 6)) {
            System.out.print(i + " "); // 1 2 3 4 5
        }
    }
}
```

## ListIterator

`ListIterator` 是 `Iterator` 的增强版，支持双向遍历和在遍历过程中添加、修改元素。

```java
import java.util.ArrayList;
import java.util.List;
import java.util.ListIterator;

public class ListIteratorDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("A", "B", "C"));

        // 正向遍历
        ListIterator<String> it = list.listIterator();
        while (it.hasNext()) {
            int index = it.nextIndex();
            String value = it.next();
            System.out.println(index + ": " + value);
        }
        // 0: A
        // 1: B
        // 2: C

        // 反向遍历（必须先正向遍历到末尾）
        while (it.hasPrevious()) {
            int index = it.previousIndex();
            String value = it.previous();
            System.out.println(index + ": " + value);
        }
        // 2: C
        // 1: B
        // 0: A

        // 在遍历中添加和修改
        ListIterator<String> it2 = list.listIterator();
        while (it2.hasNext()) {
            String val = it2.next();
            if (val.equals("B")) {
                it2.set("B+");   // 将 B 替换为 B+
                it2.add("B++");  // 在 B+ 后面插入 B++
            }
        }
        System.out.println(list); // [A, B+, B++, C]
    }
}
```

## ConcurrentModificationException

在使用 for-each 或 Iterator 遍历集合时，如果直接通过集合自身的 `add()`、`remove()` 等方法修改集合结构，就会抛出 `ConcurrentModificationException`。

```java
import java.util.ArrayList;
import java.util.List;

public class ConcurrentModProblem {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("A", "B", "C", "D"));

        // 错误：在 for-each 中直接删除
        try {
            for (String s : list) {
                if (s.equals("B")) {
                    list.remove(s); // 抛出 ConcurrentModificationException
                }
            }
        } catch (java.util.ConcurrentModificationException e) {
            System.out.println("捕获到异常：" + e.getMessage());
        }
    }
}
```

### 正确做法一：Iterator.remove()

```java
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class IteratorRemove {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("A", "B", "C", "D"));

        Iterator<String> it = list.iterator();
        while (it.hasNext()) {
            String s = it.next();
            if (s.equals("B")) {
                it.remove(); // 安全删除
            }
        }

        System.out.println(list); // [A, C, D]
    }
}
```

### 正确做法二：removeIf（Java 8+）

```java
import java.util.ArrayList;
import java.util.List;

public class RemoveIf {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("A", "B", "C", "D"));

        list.removeIf(s -> s.equals("B"));

        System.out.println(list); // [A, C, D]
    }
}
```

### 正确做法三：收集后批量删除

```java
import java.util.ArrayList;
import java.util.List;

public class BatchRemove {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(List.of("A", "B", "C", "D"));

        List<String> toRemove = new ArrayList<>();
        for (String s : list) {
            if (s.equals("B") || s.equals("D")) {
                toRemove.add(s);
            }
        }
        list.removeAll(toRemove);

        System.out.println(list); // [A, C]
    }
}
```

:::: warning 单线程也会抛异常
`ConcurrentModificationException` 不仅在多线程场景下出现，在单线程中，只要在 for-each 循环期间通过集合自身方法修改结构，就会触发此异常。这是因为 for-each 内部使用 Iterator，Iterator 检测到集合结构被外部修改就会抛异常。
::::

## Comparable 接口

`Comparable` 定义了类的"自然排序"规则。实现此接口的类可以用 `Collections.sort()` 或 `Arrays.sort()` 直接排序。

```java
public interface Comparable<T> {
    int compareTo(T other);
}
```

`compareTo` 返回值含义：
- 负数：当前对象小于 other
- 零：当前对象等于 other
- 正数：当前对象大于 other

```java
public class Student implements Comparable<Student> {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    public String getName() { return name; }
    public int getScore() { return score; }

    @Override
    public int compareTo(Student other) {
        // 按分数升序排列
        return Integer.compare(this.score, other.score);
    }

    @Override
    public String toString() {
        return name + "(" + score + ")";
    }
}
```

```java
import java.util.Arrays;

public class ComparableDemo {
    public static void main(String[] args) {
        Student[] students = {
            new Student("Alice", 92),
            new Student("Bob", 78),
            new Student("Carol", 85)
        };

        Arrays.sort(students); // 使用 compareTo 排序

        for (Student s : students) {
            System.out.println(s);
        }
        // Bob(78)
        // Carol(85)
        // Alice(92)
    }
}
```

:::: tip Comparable 是"自然排序"
一个类只能有一个自然排序。比如 `String` 按字典序排列，`Integer` 按数值大小排列。如果需要多种排序方式（如按姓名排序、按分数排序），就需要使用 `Comparator`。
::::

## Comparator 接口

`Comparator` 定义了自定义排序规则，可以在不修改原始类的情况下定义多种排序策略。

```java
public interface Comparator<T> {
    int compare(T o1, T o2);
}
```

```java
import java.util.Arrays;
import java.util.Comparator;

public class ComparatorDemo {
    public static void main(String[] args) {
        Student[] students = {
            new Student("Alice", 92),
            new Student("Bob", 78),
            new Student("Carol", 85)
        };

        // 按姓名排序
        Comparator<Student> byName = new Comparator<>() {
            @Override
            public int compare(Student a, Student b) {
                return a.getName().compareTo(b.getName());
            }
        };
        Arrays.sort(students, byName);

        // 匿名类写法比较啰嗦，Java 8+ 可以用 lambda
        Arrays.sort(students, (a, b) -> a.getName().compareTo(b.getName()));

        // 更简洁的方法引用
        Arrays.sort(students, Comparator.comparing(Student::getName));
    }
}
```

## Comparator 工具方法（Java 8+）

Java 8 为 `Comparator` 接口引入了一系列静态方法和默认方法，使排序代码更加简洁和链式化。

```java
import java.util.Comparator;
import java.util.List;
import java.util.ArrayList;

public class ComparatorUtils {
    public static void main(String[] args) {
        List<Student> students = new ArrayList<>(List.of(
            new Student("Alice", 92),
            new Student("Bob", 78),
            new Student("Carol", 85),
            new Student("Dave", 85)
        ));

        // comparing：按某个字段排序
        students.sort(Comparator.comparing(Student::getScore));
        System.out.println(students);
        // [Bob(78), Carol(85), Dave(85), Alice(92)]

        // reversed：逆序
        students.sort(Comparator.comparing(Student::getScore).reversed());
        System.out.println(students);
        // [Alice(92), Carol(85), Dave(85), Bob(78)]

        // thenComparing：次要排序条件
        students.sort(
            Comparator.comparing(Student::getScore)
                      .thenComparing(Student::getName)
        );
        System.out.println(students);
        // 分数相同时按姓名排序：[Bob(78), Carol(85), Dave(85), Alice(92)]

        // comparingInt / comparingLong / comparingDouble：避免装箱
        students.sort(Comparator.comparingInt(Student::getScore));
    }
}
```

| 方法 | 说明 |
|------|------|
| `Comparator.comparing(keyExtractor)` | 按提取的键排序 |
| `Comparator.comparingInt(keyExtractor)` | 按 int 键排序（避免装箱） |
| `Comparator.naturalOrder()` | 自然顺序 |
| `Comparator.reverseOrder()` | 自然顺序的逆序 |
| `thenComparing(other)` | 首选排序相等时，用此比较器二次排序 |
| `reversed()` | 反转当前比较器的顺序 |

## Collections.sort() 与 List.sort()

两种排序方式功能等效，`List.sort()` 是 Java 8 新增的更简洁的写法。

```java
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class SortComparison {
    public static void main(String[] args) {
        List<String> list1 = new ArrayList<>(List.of("Banana", "Apple", "Cherry"));
        List<String> list2 = new ArrayList<>(List.of("Banana", "Apple", "Cherry"));

        // 方式一：Collections.sort（Java 2 就有）
        Collections.sort(list1);

        // 方式二：List.sort（Java 8+，推荐）
        list2.sort(Comparator.naturalOrder());

        System.out.println(list1); // [Apple, Banana, Cherry]
        System.out.println(list2); // [Apple, Banana, Cherry]

        // 自定义排序
        list2.sort(Comparator.comparing(String::length));
        System.out.println(list2); // [Apple, Cherry, Banana]
    }
}
```

:::: tip 推荐使用 List.sort()
`List.sort()` 是实例方法，语义更清晰，而且默认就地排序（修改原列表）。`Collections.sort()` 内部也是调用 `list.sort()`。新代码建议统一使用 `list.sort()`。
::::

## Arrays.sort() 与 Comparator

`Arrays.sort()` 对数组排序，支持传入 `Comparator` 进行自定义排序。

```java
import java.util.Arrays;
import java.util.Comparator;

public class ArraysSort {
    public static void main(String[] args) {
        // 基本类型数组：使用自然排序
        int[] nums = {5, 2, 8, 1, 9};
        Arrays.sort(nums);
        System.out.println(Arrays.toString(nums)); // [1, 2, 5, 8, 9]

        // 对象数组：自然排序
        String[] names = {"Charlie", "Alice", "Bob"};
        Arrays.sort(names);
        System.out.println(Arrays.toString(names)); // [Alice, Bob, Charlie]

        // 对象数组：自定义 Comparator
        Arrays.sort(names, Comparator.comparing(String::length));
        System.out.println(Arrays.toString(names)); // [Bob, Alice, Charlie]

        // 逆序
        Arrays.sort(names, Comparator.reverseOrder());
        System.out.println(Arrays.toString(names)); // [Charlie, Bob, Alice]

        // 局部排序：只排索引 1 到 4（不包含 4）
        int[] arr = {5, 3, 1, 4, 2};
        Arrays.sort(arr, 1, 4); // 排序 [3, 1, 4]
        System.out.println(Arrays.toString(arr)); // [5, 1, 3, 4, 2]
    }
}
```

:::: warning Arrays.sort() 对基本类型与对象类型的不同策略
- 对基本类型数组（int[]、long[] 等），`Arrays.sort()` 使用双轴快速排序（Dual-Pivot Quicksort），时间复杂度 O(n log n)，但不是稳定排序。
- 对对象数组，`Arrays.sort()` 使用 TimSort，是稳定排序。

这是因为基本类型的值没有"相等但不同"的概念，稳定性无关紧要。而对象排序需要保持相等元素的相对顺序。
::::
