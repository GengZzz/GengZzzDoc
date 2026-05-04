# 类与结构体

## class：引用类型

```csharp
public class Person
{
    // 自动属性
    public string Name { get; set; }
    public int Age { get; set; }

    // 带初始化器的自动属性
    public List<string> Hobbies { get; set; } = new();

    // 只读自动属性（只能在构造函数中赋值）
    public string Id { get; }

    // 构造函数
    public Person(string name, int age)
    {
        Name = name;
        Age = age;
        Id = Guid.NewGuid().ToString();
    }

    // 析构函数（Finalizer），GC 回收前调用
    ~Person()
    {
        // 释放非托管资源（极少直接使用，优先用 IDisposable）
    }
}
```

### 计算属性

```csharp
public class Circle
{
    public double Radius { get; set; }

    // 计算属性，每次访问时计算
    public double Area => Math.PI * Radius * Radius;

    // 带 setter 的计算属性
    private double _diameter;
    public double Diameter
    {
        get => 2 * Radius;
        set => _diameter = value;
    }
}
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

// 使用
var m = new Matrix(3, 3);
m[0, 0] = 1.0;
m[1, 1] = 5.0;
Console.WriteLine(m[0, 0]);  // 1.0
```

### 静态构造函数

```csharp
public class AppConfig
{
    public static string ConnectionString { get; }

    // 静态构造函数：在类型首次使用前执行一次
    static AppConfig()
    {
        ConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION")
            ?? "DefaultConnection";
    }
}
```

## struct：值类型

struct 适合表示轻量级数据，存储在栈上（作为局部变量时），赋值时复制完整数据。

```csharp
public struct Point
{
    public double X { get; set; }
    public double Y { get; set; }

    public Point(double x, double y)
    {
        X = x;
        Y = y;
    }

    public double DistanceTo(Point other)
    {
        double dx = X - other.X;
        double dy = Y - other.Y;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    public override string ToString() => $"({X}, {Y})";
}
```

### readonly struct（C# 8+）

```csharp
// 所有成员都是只读的，编译器可做优化（避免防御性复制）
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
}
```

::: tip 什么时候用 struct？
- 数据小于 16 字节
- 逻辑上表示单个值（如坐标、金额、颜色）
- 不需要继承
- 频繁创建和销毁（避免 GC 压力）
- 不可变（readonly struct）

超过 16 字节的 struct，赋值时的复制开销可能超过 class 的 GC 开销。
:::

## record 类型（C# 9+）

record 是为不可变数据模型设计的引用类型，自动生成 `Equals`、`GetHashCode`、`ToString` 和 `with` 表达式支持。

```csharp
// 位置参数 record
public record OrderItem(string Product, int Quantity, decimal Price);

// 使用
var item = new OrderItem("Laptop", 1, 9999.99m);
Console.WriteLine(item);  // OrderItem { Product = Laptop, Quantity = 1, Price = 9999.99 }

// with 表达式：创建副本并修改部分属性
var discounted = item with { Price = 8999.99m };

// 值相等（不是引用相等）
var item2 = new OrderItem("Laptop", 1, 9999.99m);
Console.WriteLine(item == item2);       // true（值相等）
Console.WriteLine(ReferenceEquals(item, item2));  // false（不同对象）
```

### record struct（C# 10+）

```csharp
// 值类型的 record，兼具 struct 的内存效率和 record 的不可变性
public readonly record struct Money(decimal Amount, string Currency);

var price = new Money(99.99m, "CNY");
var usd = price with { Currency = "USD" };
```

### init 访问器

```csharp
public class Person
{
    // init：只能在对象初始化时赋值，之后不可修改
    public string Name { get; init; }
    public int Age { get; init; }
}

var p = new Person { Name = "Alice", Age = 25 };
// p.Name = "Bob";  // 编译错误：init 属性只能在初始化时赋值
```
