# 泛型

泛型让代码在编译时确定类型，避免运行时类型转换和装箱开销。

## 泛型类

```csharp
public class Stack<T>
{
    private T[] _items;
    private int _count;

    public Stack(int capacity = 16)
    {
        _items = new T[capacity];
    }

    public void Push(T item)
    {
        if (_count == _items.Length)
        {
            Array.Resize(ref _items, _items.Length * 2);
        }
        _items[_count++] = item;
    }

    public T Pop()
    {
        if (_count == 0)
            throw new InvalidOperationException("栈为空");
        return _items[--_count];
    }

    public T Peek() => _count > 0 ? _items[_count - 1] : throw new InvalidOperationException("栈为空");
    public int Count => _count;
}

// 使用
var intStack = new Stack<int>();
intStack.Push(42);
int value = intStack.Pop();  // 无需类型转换

var strStack = new Stack<string>();
strStack.Push("hello");
```

## 泛型方法

```csharp
public static class ArrayHelper
{
    public static T[] Filter<T>(T[] source, Func<T, bool> predicate)
    {
        var result = new List<T>();
        foreach (var item in source)
        {
            if (predicate(item))
                result.Add(item);
        }
        return result.ToArray();
    }

    // 多个泛型参数
    public static TResult[] Transform<TSource, TResult>(
        TSource[] source,
        Func<TSource, TResult> selector)
    {
        var result = new TResult[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            result[i] = selector(source[i]);
        }
        return result;
    }
}

// 使用
int[] numbers = { 1, 2, 3, 4, 5, 6 };
int[] evens = ArrayHelper.Filter(numbers, x => x % 2 == 0);
string[] labels = ArrayHelper.Transform(numbers, n => $"#{n}");
```

## 泛型约束

约束限定泛型参数必须满足的条件，让编译器知道能对 T 做什么操作。

```csharp
// where T : class        —— T 必须是引用类型
// where T : struct       —— T 必须是值类型（不含 Nullable）
// where T : notnull      —— T 不能是可空类型（C# 8+）
// where T : new()        —— T 必须有无参构造函数
// where T : BaseClass    —— T 必须继承自 BaseClass
// where T : IComparable  —— T 必须实现 IComparable
// where T : unmanaged    —— T 必须是非托管类型（无引用类型字段）
// where T : default      —— 消除与非约束类型的重载歧义（C# 9+）

// 实际示例：通用排序
public static T Max<T>(T[] items) where T : IComparable<T>
{
    if (items.Length == 0)
        throw new ArgumentException("数组为空");

    T max = items[0];
    for (int i = 1; i < items.Length; i++)
    {
        if (items[i].CompareTo(max) > 0)
            max = items[i];
    }
    return max;
}

// 实例工厂
public static T CreateInstance<T>() where T : new()
{
    return new T();  // 有了 new() 约束才能调用 new T()
}

// 多重约束
public void Process<T>(T item)
    where T : class, IComparable<T>, new()
{
    // T 必须是引用类型、实现 IComparable<T>、有无参构造函数
}
```

## 泛型接口

```csharp
public interface IRepository<T> where T : class
{
    T GetById(int id);
    IEnumerable<T> GetAll();
    void Add(T entity);
    void Update(T entity);
    void Delete(int id);
}

public class UserRepository : IRepository<User>
{
    private readonly List<User> _users = new();

    public User GetById(int id) => _users.First(u => u.Id == id);
    public IEnumerable<User> GetAll() => _users;
    public void Add(User entity) => _users.Add(entity);
    public void Update(User entity) { /* ... */ }
    public void Delete(int id) { /* ... */ }
}
```

## 协变与逆变

协变和逆变让泛型类型的赋值更灵活。

### 协变（out T）—— 只读输出

```csharp
// IEnumerable<out T> 是协变的
IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings;  // string 是 object 的子类，OK

// 协变要求 T 只出现在输出位置（返回值）
public interface IEnumerable<out T>
{
    IEnumerator<T> GetEnumerator();
    // T 只作为返回值出现，所以可以协变
}
```

### 逆变（in T）—— 只写输入

```csharp
// IComparer<in T> 是逆变的
IComparer<object> objectComparer = /* ... */;
IComparer<string> stringComparer = objectComparer;  // 反向赋值

// 逆变要求 T 只出现在输入位置（参数）
public interface IComparer<in T>
{
    int Compare(T x, T y);
    // T 只作为参数出现，所以可以逆变
}
```

### 实际应用

```csharp
// Action<in T>：逆变
Action<object> logObj = obj => Console.WriteLine(obj);
Action<string> logStr = logObj;  // OK：任何处理 object 的函数也能处理 string

// Func<out TResult>：协变
Func<string> getName = () => "Alice";
Func<object> getObject = getName;  // OK：返回 string 的函数也可以视为返回 object
```

## 泛型与性能

泛型的核心优势是**避免装箱和类型转换**。

```csharp
// 非泛型 ArrayList：存储 object，值类型会装箱
var list1 = new ArrayList();
list1.Add(42);             // int 装箱为 object
int x = (int)list1[0];    // 拆箱 + 类型转换

// 泛型 List<T>：存储具体类型，无装箱
var list2 = new List<int>();
list2.Add(42);             // 无装箱，直接存储 int
int y = list2[0];          // 无拆箱，无类型转换
```

::: tip 泛型的运行时实现
CLR 为每个泛型类型维护一个内部表示。引用类型（如 `List<string>`、`List<object>`）共享同一份 JIT 编译代码（因为引用都是指针大小相同）。值类型（如 `List<int>`、`List<double>`）各自生成独立代码，因为内存布局不同。这比 C++ 模板的全展开实例化更节省空间。
:::
