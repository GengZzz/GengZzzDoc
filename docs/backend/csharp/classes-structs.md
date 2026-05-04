# 类与结构体

class 和 struct 在内存布局上有本质区别，record 类型的编译器生成代码揭示了 C# 语法糖背后的机制。

## class：引用类型

### 对象内存布局

每个 class 实例在堆上的内存布局包含对象头：

```
┌─────────────────────────────────────────────┐
│  SyncBlockIndex（4/8 字节）                  │  ← 对象头：用于 lock 语句的同步
├─────────────────────────────────────────────┤
│  MethodTable Pointer（4/8 字节）             │  ← 指向类型的 MethodTable
├─────────────────────────────────────────────┤
│  字段数据                                    │  ← 实例字段的值
│  （按对齐规则排列）                           │
└─────────────────────────────────────────────┘
```

- **SyncBlockIndex**：`lock` 语句使用，指向 SyncBlock 表的索引
- **MethodTable Pointer**：所有对象的第一个字段（不在 C# 层面可见），指向类型的运行时信息

最小对象大小：在 64 位系统上为 **24 字节**（8 字节对象头 + 8 字节 MethodTable + 8 字节对齐）。

### 属性与自动属性

```csharp
public class Person
{
    // 自动属性（编译器生成私有字段 + get/set 方法）
    public string Name { get; set; }
    public int Age { get; set; }

    // 带初始化器的自动属性
    public List<string> Hobbies { get; set; } = new();

    // 只读自动属性（只能在构造函数中赋值）
    public string Id { get; }

    // 必须初始化的属性（C# 11+）
    public required string Email { get; init; }

    // 计算属性，每次访问时计算
    public double BMI => Weight / (Height * Height);

    public Person(string name, int age)
    {
        Name = name;
        Age = age;
        Id = Guid.NewGuid().ToString();
    }
}
```

### init vs set vs required

```csharp
public class Config
{
    // set：任何时间可修改
    public string Name { get; set; }

    // init：只能在对象初始化时修改
    public string Version { get; init; }

    // required：必须在初始化时提供（C# 11+）
    public required string ConnectionString { get; init; }

    // 只读（只提供 getter）
    public DateTime CreatedAt { get; } = DateTime.UtcNow;
}

// 使用
var config = new Config
{
    Name = "App",
    Version = "1.0",
    ConnectionString = "Server=..."  // 必须提供
};

// config.Version = "2.0";  // 编译错误：init 属性只能初始化时赋值
// config.ConnectionString = "...";  // 编译错误
// new Config { Name = "App" };  // 编译错误：缺少 required 属性
```

### 索引器

```csharp
public class Matrix
{
    private readonly double[,] _data;

    public int Rows { get; }
    public int Cols { get; }

    public Matrix(int rows, int cols)
    {
        _data = new double[rows, cols];
        Rows = rows;
        Cols = cols;
    }

    // 索引器：允许像数组一样访问
    public double this[int row, int col]
    {
        get => _data[row, col];
        set => _data[row, col] = value;
    }
}

var m = new Matrix(3, 3);
m[0, 0] = 1.0;
Console.WriteLine(m[0, 0]);  // 1.0
```

### 静态构造函数

```csharp
public class AppConfig
{
    public static string ConnectionString { get; }

    // 静态构造函数：在类型首次使用前执行一次（线程安全）
    static AppConfig()
    {
        ConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION")
            ?? "DefaultConnection";
    }
}
```

## struct：值类型

### struct 选择指南（6 个判定条件）

使用 struct 而非 class 的完整判定条件：

| 条件 | 理由 |
| --- | --- |
| 1. 逻辑上表示单个值 | 如坐标、金额、颜色、向量 |
| 2. 实例大小 ≤ 16 字节 | 超过 16 字节的复制开销可能超过 GC 压力 |
| 3. 不可变 | 可变 struct 在赋值/传参时容易出错 |
| 4. 不需要继承 | struct 不能继承或被继承 |
| 5. 频繁创建和销毁 | struct 无 GC 压力 |
| 6. 主要通过值传递 | 不需要引用语义 |

```csharp
// 好的 struct 设计：小、不可变、值语义
public readonly struct Point2D(double X, double Y)
{
    public double DistanceTo(Point2D other) =>
        Math.Sqrt((X - other.X) * (X - other.X) + (Y - other.Y) * (Y - other.Y));
}

// 不好的 struct 设计：太大（24+ 字节）、可变
public struct BadStruct
{
    public string Name;      // 引用，8 字节
    public double X, Y, Z;   // 24 字节
    public List<int> Items;  // 引用，8 字节
    // 总体：40+ 字节，赋值复制开销大
}
```

::: warning struct 的 Defensive Copy 问题
当 readonly struct 调用非 readonly 方法时，编译器会创建**防御性复制**以保证不可变性：

```csharp
public readonly struct Vector3
{
    public double X { get; init; }
    public double Y { get; init; }
    public double Z { get; init; }

    public readonly double Length => Math.Sqrt(X * X + Y * Y + Z * Z);

    // 非 readonly 方法
    public Vector3 Normalize()
    {
        double len = Length;
        return new Vector3(X / len, Y / len, Z / len);
    }
}

// 当 readonly struct 调用非 readonly 方法时：
readonly Vector3 v = new(3, 4, 0);
var normalized = v.Normalize();  // 编译器创建 v 的副本再调用！
```

**解决方案**：将所有方法标记为 `readonly`，包括 `ToString()` 和运算符。
:::

### ref struct（C# 7.2+）

`ref struct` 强制只能存在于栈上，完全避免堆分配：

```csharp
// Span<T> 就是 ref struct 的典型应用
public ref struct StackOnlyBuffer
{
    private Span<byte> _span;

    public StackOnlyBuffer(int size)
    {
        // 使用 stackalloc 在栈上分配
        _span = stackalloc byte[size];
    }

    public void Write(byte value) => _span[0] = value;
}

// 限制：不能作为类的字段、不能装箱、不能用于 async 方法
```

### readonly struct（C# 8+）

```csharp
public readonly struct Vector3
{
    public double X { get; init; }
    public double Y { get; init; }
    public double Z { get; init; }

    public Vector3(double x, double y, double z)
    {
        X = x; Y = y; Z = z;
    }

    public readonly double Length => Math.Sqrt(X * X + Y * Y + Z * Z);

    public readonly Vector3 Normalize()
    {
        double len = Length;
        return new Vector3(X / len, Y / len, Z / len);
    }

    public override readonly string ToString() => $"({X}, {Y}, {Z})";
}
```

## record 类型（C# 9+）

record 是为不可变数据模型设计的类型，其"语法糖"背后有大量编译器生成的代码。

### record class 编译器生成的代码分析

```csharp
public record OrderItem(string Product, int Quantity, decimal Price);
```

编译器实际生成的代码：

```csharp
public class OrderItem : IEquatable<OrderItem>
{
    // 位置参数成为属性
    public string Product { get; init; }
    public int Quantity { get; init; }
    public decimal Price { get; init; }

    // 构造函数
    public OrderItem(string Product, int Quantity, decimal Price)
    {
        this.Product = Product;
        this.Quantity = Quantity;
        this.Price = Price;
    }

    // 基于值的 Equals
    public virtual bool Equals(OrderItem? other)
    {
        if (other is null) return false;
        if (ReferenceEquals(this, other)) return true;
        return EqualityComparer<string>.Default.Equals(Product, other.Product)
            && Quantity == other.Quantity
            && Price == other.Price;
    }

    // 基于值的 GetHashCode
    public override int GetHashCode()
    {
        return HashCode.Combine(Product, Quantity, Price);
    }

    // ToString 输出所有属性
    public override string ToString() =>
        $"OrderItem {{ Product = {Product}, Quantity = {Quantity}, {Price} }}";

    // PrintMembers：用于派生 record 的 ToString
    protected virtual bool PrintMembers(StringBuilder builder) { ... }

    // with 表达式的核心方法
    public virtual OrderItem <Clone>$() => new OrderItem(this);

    // 解构方法（如果有位置参数）
    public void Deconstruct(out string Product, out int Quantity, out decimal Price)
    {
        Product = this.Product;
        Quantity = this.Quantity;
        Price = this.Price;
    }
}
```

### with 表达式性能

```csharp
var item = new OrderItem("Laptop", 1, 9999.99m);
var discounted = item with { Price = 8999.99m };

// with 表达式内部调用 <Clone>$() 再设置属性
// 每次 with 都创建新对象（浅拷贝）
// 如果 record 包含引用类型字段，引用是共享的：
var original = new Order("A", new List<string> { "item1" });
var copy = original with { Id = "B" };
// copy.Items 和 original.Items 是同一个 List 对象！
```

::: warning record 的浅拷贝陷阱
`with` 表达式是浅拷贝。如果 record 包含引用类型的属性（如 `List<T>`、嵌套 record），修改副本的集合属性会影响原始对象。需要深拷贝时，自己实现 `Clone` 方法或使用不可变集合。
:::

### record struct（C# 10+）

```csharp
// 值类型的 record
public readonly record struct Money(decimal Amount, string Currency);

var price = new Money(99.99m, "CNY");
var usd = price with { Currency = "USD" };
Console.WriteLine(price == new Money(99.99m, "CNY"));  // true（值相等）
```

### init 访问器

```csharp
public class Person
{
    public string Name { get; init; }
    public int Age { get; init; }
}

var p = new Person { Name = "Alice", Age = 25 };
// p.Name = "Bob";  // 编译错误：init 属性只能在初始化时赋值
```

::: tip init 与 required
- `init`：可以不提供值（有默认值），但提供后不可修改
- `required`（C# 11+）：必须在初始化时提供值，否则编译错误
- 两者可组合使用：`required string Name { get; init; }`
:::
