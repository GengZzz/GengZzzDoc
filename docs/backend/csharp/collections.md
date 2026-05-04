# 集合

C# 集合类型的内部实现直接影响性能特征。理解 List 的扩容策略、Dictionary 的哈希表实现、以及 .NET 8 的改进，是写出高效代码的基础。

## List\<T\>

### 内部实现与扩容策略

`List<T>` 内部维护一个数组，容量不足时自动扩容：

```csharp
var list = new List<int>();

// 内部扩容过程：
// 1. 初始容量为 0（或传入的 capacity）
// 2. 第一次 Add 时分配容量 4
// 3. 容量满时，新建 2x 大小的数组，复制旧数据
//    容量变化：0 → 4 → 8 → 16 → 32 → 64 ...

for (int i = 0; i < 20; i++)
{
    list.Add(i);
}

// 预分配容量避免频繁扩容
var largeList = new List<int>(10000);
```

扩容策略细节：
- 默认倍增因子为 **2x**
- 最大容量为 `Array.MaxArrayLength`（约 2GB）
- 扩容时分配新数组 + `Array.Copy` 复制旧数据 + GC 回收旧数组

```csharp
// 常用操作的时间复杂度
list.Insert(0, -1);       // O(n)，插入到头部需要移动所有元素
list.Remove(5);           // O(n)，查找 + 移动
list.RemoveAt(0);         // O(n)，移动元素
list.Contains(10);        // O(n)，线性查找
list.Sort();              // O(n log n)，IntroSort
list.BinarySearch(10);    // O(log n)，前提是已排序
```

::: tip 性能提示
如果已知元素数量，构造时传入 capacity 避免多次扩容复制：
```csharp
var list = new List<int>(expectedCount);
```
如果需要频繁在头部插入，考虑 `LinkedList<T>`。如果需要查找，考虑 `Dictionary` 或 `HashSet`。
:::

## Dictionary\<TKey, TValue\>

### .NET 8 内部实现：开放寻址法

.NET 8 对 Dictionary 的实现做了重大重构，从链地址法改为**开放寻址法的变体**：

```
.NET 7 及之前（链地址法）：
┌───────┐
│  [0]  │ → Node("apple", 5) → Node("grape", 3) → null
│  [1]  │ → Node("banana", 8) → null
│  [2]  │ → null
└───────┘

.NET 8（开放寻址法）：
┌───────┐
│  [0]  │  Entry("grape", 3)   ← 与 apple 哈希冲突，探测到位置 0
│  [1]  │  Entry("banana", 8)
│  [2]  │  Entry("apple", 5)   ← 原始位置
└───────┘
```

优势：
- 减少了一次指针间接寻址（Node → Entry 变为直接 Entry）
- 数据连续存储，缓存友好
- 内存占用更小（无链表节点分配）

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

::: warning Dictionary 的容量管理
Dictionary 的扩容也是倍增策略，且扩容时需要重新计算所有键的哈希位置。预设容量可以避免频繁扩容：

```csharp
var dict = new Dictionary<string, int>(expectedCount);
```
:::

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

## SortedList / SortedDictionary / SortedSet

```csharp
// SortedList：基于数组 + 二分查找，内存紧凑但插入慢 O(n)
var sortedList = new SortedList<int, string>
{
    { 3, "three" }, { 1, "one" }, { 2, "two" }
};
// 遍历时按 key 有序：1, 2, 3

// SortedDictionary：基于红黑树，插入快 O(log n) 但内存开销更大
var sortedDict = new SortedDictionary<int, string>();

// SortedSet：有序不重复集合
var sortedSet = new SortedSet<int> { 3, 1, 2, 1 };
// 遍历时有序：1, 2, 3
```

## ConcurrentDictionary

分段锁（Striped Lock）实现的线程安全字典：

```csharp
var concurrentDict = new ConcurrentDictionary<string, int>();

// 原子操作
concurrentDict.AddOrUpdate("key", 1, (key, oldValue) => oldValue + 1);

// GetOrAdd：线程安全的懒加载模式
var expensive = concurrentDict.GetOrAdd("key", k => ExpensiveComputation(k));

// TryRemove + CompareExchange 的原子操作
```

::: tip ConcurrentDictionary 的内部实现
ConcurrentDictionary 将哈希空间分为多个段（默认为处理器数量的倍数），每个段独立加锁。读操作大部分情况下不需要加锁（volatile 读），写操作只锁定所在的段。这比全局锁的 Dictionary 并发性能好得多。
:::

## FrozenDictionary / FrozenSet（.NET 8+）

不可变字典/集合，构建后不可修改，查找性能极高：

```csharp
using System.Collections.Frozen;

// 从现有集合构建（有构建开销，构建后不可修改）
var frozen = new Dictionary<string, int>
{
    ["apple"] = 5, ["banana"] = 3
}.ToFrozenDictionary();

// 查找性能比 Dictionary 快 2-5 倍
// 适用于配置数据、查找表等"构建一次、查找多次"的场景
int count = frozen["apple"];  // 5
```

::: tip FrozenDictionary 的原理
FrozenDictionary 使用更激进的哈希策略（完美哈希或最小完美哈希），构建时计算最优哈希函数，使得查找几乎总是 O(1) 且无冲突。代价是构建时间较长且内存不可变。
:::

## Span\<T\> 与 Memory\<T\>

`Span<T>` 是栈上分配的轻量视图，零拷贝切片：

```csharp
// Span<T>：只能在栈上使用
int[] array = { 1, 2, 3, 4, 5 };
Span<int> span = array.AsSpan();
Span<int> slice = span.Slice(1, 3);  // { 2, 3, 4 }，零拷贝

slice[0] = 20;  // 修改 slice 也修改了原数组
Console.WriteLine(array[1]);  // 20

// 栈上分配的 Span
Span<byte> buffer = stackalloc byte[256];

// Memory<T>：可在堆上存储，可用于 async 方法
Memory<byte> heapBuffer = new byte[1024];
await stream.ReadAsync(heapBuffer);
```

::: tip Span\<T\> 的限制
`Span<T>` 是 `ref struct`，只能存在于栈上：
- 不能作为类的字段
- 不能用于 async 方法
- 不能装箱（不能赋值给 object 或接口）
:::

## 不可变集合

`System.Collections.Immutable` 提供不可变集合，每次修改返回新实例，线程安全。

### 内部实现：平衡树

不可变集合使用**平衡树**（如 AVL 树或 B+ 树）实现：

```
ImmutableList<int>:
              [4]
             /   \
          [2]     [6]
         /   \   /   \
       [1] [3] [5] [7]

Add(8) 后：
              [4]
             /   \
          [2]     [6]
         /   \   /   \
       [1] [3] [5] [7,8]  ← 只复制从根到叶子的路径
                            ← 其他节点共享（O(log n) 空间）
```

修改时只复制从根到修改位置的节点路径（O(log n) 个节点），未修改的子树被共享。这使得 Add/Remove 为 O(log n) 时间和空间。

```csharp
using System.Collections.Immutable;

var list = ImmutableList<int>.Empty;
list = list.Add(1);    // 返回新实例，原 list 不变
list = list.Add(2);
list = list.Add(3);

// Builder 模式：批量修改时避免频繁创建新对象
var builder = ImmutableList.CreateBuilder<int>();
for (int i = 0; i < 1000; i++)
{
    builder.Add(i);
}
ImmutableList<int> final = builder.ToImmutable();
```

```csharp
// ImmutableArray<T>：基于数组，比 ImmutableList 更紧凑但修改代价高
var array = ImmutableArray.Create(1, 2, 3);
var newArray = array.Add(4);  // 复制整个数组 O(n)

// 适用场景：ImmutableArray 适合构建后只读的场景
// ImmutableList 适合频繁修改的场景
```
