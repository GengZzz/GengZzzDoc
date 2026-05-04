# 集合

## List\<T\>

`List<T>` 内部维护一个数组，容量不足时自动扩容为原来的 2 倍。

```csharp
var list = new List<int>();

// 内部过程：
// 1. 初始容量为 0（或传入的 capacity）
// 2. 第一次 Add 时分配容量 4
// 3. 容量满时，新建 2x 大小的数组，复制旧数据

for (int i = 0; i < 20; i++)
{
    list.Add(i);
    // 容量变化：0 → 4 → 8 → 16 → 32
}

// 预分配容量避免频繁扩容
var largeList = new List<int>(10000);

// 常用操作
list.Insert(0, -1);       // O(n)，插入到头部
list.Remove(5);           // O(n)，查找 + 移动
list.RemoveAt(0);         // O(n)，移动元素
list.Contains(10);        // O(n)，线性查找
list.Sort();              // O(n log n)
list.ForEach(x => Console.WriteLine(x));
```

::: tip 性能提示
如果已知元素数量，构造时传入 capacity 避免多次扩容复制：
```csharp
var list = new List<int>(expectedCount);
```
如果需要频繁在头部插入，考虑 `LinkedList<T>`。
:::

## Dictionary\<TKey, TValue\>

内部使用哈希表实现，平均 O(1) 的查找/插入/删除。

```csharp
var dict = new Dictionary<string, int>
{
    ["apple"] = 5,
    ["banana"] = 3
};

// 添加与更新
dict["cherry"] = 8;               // 键不存在则添加，存在则更新
dict.TryAdd("date", 2);           // 只在键不存在时添加

// 安全访问
if (dict.TryGetValue("apple", out int count))
{
    Console.WriteLine($"apple: {count}");
}

// 遍历（无序）
foreach (var (key, value) in dict)
{
    Console.WriteLine($"{key}: {value}");
}

// 哈希冲突处理：链地址法（.NET 8+ 改为开放寻址法的变体）
// 如果大量键产生哈希冲突，查找退化为 O(n)
```

### 自定义键类型

```csharp
// 作为字典键的类型需要重写 GetHashCode 和 Equals
public record CacheKey(string UserId, string ResourceId)
{
    public override int GetHashCode()
    {
        return HashCode.Combine(UserId, ResourceId);
    }
}

var cache = new Dictionary<CacheKey, object>();
cache[new CacheKey("u1", "r1")] = "data";
```

## HashSet\<T\>

基于哈希表的集合，存储不重复元素，O(1) 的包含检查。

```csharp
var set = new HashSet<int> { 1, 2, 3 };
set.Add(2);   // false，已存在
set.Add(4);   // true

// 集合运算
var other = new HashSet<int> { 2, 3, 4, 5 };
set.UnionWith(other);              // { 1, 2, 3, 4, 5 }
set.IntersectWith(other);          // { 2, 3, 4 }
set.ExceptWith(other);             // 从 set 中移除 other 的元素
bool isSubset = set.IsSubsetOf(other);
```

## Queue\<T\> 与 Stack\<T\>

```csharp
// Queue：先进先出
var queue = new Queue<string>();
queue.Enqueue("first");
queue.Enqueue("second");
string head = queue.Dequeue();   // "first"

// Stack：后进先出
var stack = new Stack<string>();
stack.Push("bottom");
stack.Push("top");
string top = stack.Pop();       // "top"
```

## Span\<T\> 与 Memory\<T\>

`Span<T>` 是栈上分配的轻量视图，可以指向数组片段、栈内存或非托管内存，零拷贝切片。

```csharp
// Span<T>：只能在栈上使用（不能装箱、不能作为字段、不能在 async 方法中使用）
int[] array = { 1, 2, 3, 4, 5 };
Span<int> span = array.AsSpan();
Span<int> slice = span.Slice(1, 3);  // { 2, 3, 4 }，零拷贝，指向同一内存

slice[0] = 20;  // 修改 slice 也修改了原数组
Console.WriteLine(array[1]);  // 20

// 高性能字符串处理
ReadOnlySpan<char> text = "Hello, World!".AsSpan();
ReadOnlySpan<char> word = text.Slice(7, 5);  // "World"

// Memory<T>：可在堆上存储，可用于 async 方法
Memory<byte> buffer = new byte[1024];
await stream.ReadAsync(buffer);
```

## 不可变集合

`System.Collections.Immutable` 提供不可变集合，每次修改返回新实例，线程安全。

```csharp
using System.Collections.Immutable;

var list = ImmutableList<int>.Empty;
list = list.Add(1);
list = list.Add(2);
list = list.Add(3);
// 原 list 不变，返回新实例

// Builder 模式：批量修改时避免频繁创建新对象
var builder = ImmutableList.CreateBuilder<int>();
for (int i = 0; i < 1000; i++)
{
    builder.Add(i);
}
ImmutableList<int> final = builder.ToImmutable();
```

::: tip 不可变集合的内部实现
不可变集合使用**平衡树**（如 AVL 树或 B 树）实现，修改时只复制受影响的节点，共享未修改的子树。这使得 `Add` 和 `Remove` 的时间复杂度为 O(log n)，同时保证了修改操作的线程安全，无需加锁。
:::
