# 泛型

泛型是 C# 类型系统的核心特性。CLR 对泛型的实现方式直接影响运行时性能和内存使用——引用类型和值类型在泛型实例化时有本质区别。

## 泛型基础

### 泛型类与方法

```csharp
// 泛型类
public class Stack<T>
{
    private T[] _items = new T[10];
    private int _count;

    public void Push(T item)
    {
        if (_count == _items.Length) Array.Resize(ref _items, _count * 2);
        _items[_count++] = item;
    }

    public T Pop() => _items[--_count];
}

// 泛型方法
public T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) >= 0 ? a : b;
}

// 使用
var intStack = new Stack<int>();
intStack.Push(42);
int value = intStack.Pop();  // 42
```

### 泛型约束完整列表

| 约束 | 含义 |
| --- | --- |
| `where T : class` | T 必须是引用类型 |
| `where T : class?` | T 必须是引用类型（可为 null） |
| `where T : struct` | T 必须是值类型（非 Nullable） |
| `where T : notnull` | T 必须是非 null 类型 |
| `where T : unmanaged` | T 必须是非托管类型（无引用类型字段） |
| `where T : new()` | T 必须有无参构造函数 |
| `where T : BaseClass` | T 必须继承自 BaseClass |
| `where T : IInterface` | T 必须实现 IInterface |
| `where T : U` | T 必须是 U 或 U 的派生类 |
| `where T : default` | 解决约束冲突（用于 override 场景） |
| `where T : Enum` | T 必须是枚举类型（C# 7.3+） |
| `where T : Delegate` | T 必须是委托类型（C# 10+） |

```csharp
// 多约束示例
public TEntity Create<TEntity>(string name)
    where TEntity : IEntity, new()
    where TEntity : class, notnull
{
    var entity = new TEntity();
    entity.Name = name;
    return entity;
}
```

### 泛型递归约束

```csharp
// 经典的自引用泛型模式：接口约束自身
public interface IEntity<TSelf> where TSelf : IEntity<TSelf>
{
    TSelf Clone();
    bool Equals(TSelf other);
}

public class Order : IEntity<Order>
{
    public Order Clone() => new Order { Id = Id, Total = Total };
    public bool Equals(Order other) => Id == other.Id;
    public int Id { get; set; }
    public decimal Total { get; set; }
}
```

## CLR 泛型实现原理

### 引用类型共享 vs 值类型特化

CLR 对泛型有两种不同的代码生成策略：

| 类型参数 | 策略 | 原因 |
| --- | --- | --- |
| 引用类型 | 共享一份 JIT 编译代码 | 所有引用类型在内存中都是指针，操作方式相同 |
| 值类型 | 每种类型特化一份代码 | 值类型大小不同，需要不同的 IL 代码 |

```
List<string>   ──→ 共享代码（string 是引用类型）
List<object>   ──→ 共享代码（与 List<string> 用同一份机器码）
List<int>      ──→ 特化代码（int 是值类型，4 字节）
List<double>   ──→ 特化代码（与 List<int> 不同，8 字节）
List<MyStruct> ──→ 特化代码（每个 struct 都有一份）
```

这意味着：
- `List<string>`、`List<object>`、`List<Dog>` 共享同一份机器码，节省内存
- `List<int>`、`List<double>`、`List<MyStruct>` 各有一份，值类型泛型太多会增加内存

::: tip 泛型与 GC
引用类型的共享泛型代码不涉及 GC 特殊处理。值类型的特化代码中，GC 知道值类型字段的精确布局，可以正确追踪引用类型字段。
:::

## 协变与逆变

### 协变（out）：输出位置

```csharp
// IEnumerable<out T> 是协变的
IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings;  // 安全：string 是 object 的子类型

// 为什么安全？
// 因为 IEnumerable<string> 只产出 string
// 每个 string 都是 object，所以赋值给 IEnumerable<object> 安全
```

### 逆变（in）：输入位置

```csharp
// Action<in T> 是逆变的
Action<object> actObj = obj => Console.WriteLine(obj);
Action<string> actStr = actObj;  // 安全：期望处理 string 的地方给了能处理 object 的

// 为什么安全？
// actObj 能处理任何 object，当然也能处理 string
```

### 类型安全证明

协变和逆变的类型安全基于里氏替换原则：

- **协变（out）**：如果 `Dog : Animal`，则 `IEnumerable<Dog> : IEnumerable<Animal>`（输出类型可以收窄）
- **逆变（in）**：如果 `Dog : Animal`，则 `Action<Animal> : Action<Dog>`（输入类型可以放宽）

```csharp
// 协变只允许在输出位置（返回值、get 属性）
public interface IEnumerable<out T>  // out T：只能作为返回值
{
    IEnumerator<T> GetEnumerator();
}

// 逆变只允许在输入位置（方法参数、set 属性）
public interface IComparer<in T>  // in T：只能作为参数
{
    int Compare(T x, T y);
}
```

::: warning 协变逆变的限制
- 只能用于接口和委托，不能用于类和结构体
- 只能用于引用类型（`IEnumerable<int>` 不协变，因为 int 是值类型）
- 只影响引用转换，不创建新集合
:::

## 泛型的性能特征

### 装箱消除

泛型最大的性能优势之一是消除值类型的装箱：

```csharp
// 非泛型集合：每次 Add 装箱
var list = new ArrayList();
list.Add(42);  // int 装箱为 object
int val = (int)list[0];  // 拆箱

// 泛型集合：无装箱
var genericList = new List<int>();
genericList.Add(42);  // 直接存储 int，无装箱
int val2 = genericList[0];  // 无拆箱
```

### JIT 编译开销

首次使用新的泛型实例化时有 JIT 编译开销：

| 场景 | JIT 编译次数 |
| --- | --- |
| `List<string>` | 1 次（首次使用引用类型泛型时） |
| `List<Dog>` | 0 次（共享 `List<string>` 的代码） |
| `List<int>` | 1 次（值类型特化） |
| `List<double>` | 1 次（值类型特化） |

::: warning 泛型与 Native AOT
AOT 编译时需要预先知道所有泛型实例化。引用类型的共享策略大幅减少了需要特化的代码量。值类型泛型仍然需要为每种类型生成代码，这会增加 AOT 产物的大小。

AOT 不支持某些运行时泛型实例化场景，如通过反射创建 `List<T>`（T 运行时确定）。
:::

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

## default 关键字

```csharp
// 泛型中的 default：获取类型的默认值
T CreateDefault<T>()
{
    return default(T);  // 引用类型 → null，值类型 → 0/false
}

// C# 7.1+ 可以省略类型
T result = default;
```

## typeof 与泛型

```csharp
// typeof 用于泛型类型
Type listType = typeof(List<>);  // 开放泛型类型
Type intListType = typeof(List<int>);  // 封闭泛型类型

// 泛型类型参数的类型信息
public void PrintType<T>()
{
    Console.WriteLine(typeof(T).Name);
    Console.WriteLine(typeof(T).IsValueType);  // 是否值类型
    Console.WriteLine(typeof(T).IsClass);      // 是否引用类型
}
```
