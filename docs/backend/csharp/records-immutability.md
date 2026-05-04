# Record 与不可变设计

record 类型是 C# 9 引入的为不可变数据模型设计的语法糖，其编译器生成的代码揭示了值相等性、with 表达式、以及解构方法的内部机制。不可变设计是编写线程安全和可维护代码的基础。

## record class

### 编译器生成的代码

```csharp
public record OrderItem(string Product, int Quantity, decimal Price);
```

编译器生成的等效代码：

```csharp
public class OrderItem : IEquatable<OrderItem>
{
    public string Product { get; init; }
    public int Quantity { get; init; }
    public decimal Price { get; init; }

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
    public override int GetHashCode() => HashCode.Combine(Product, Quantity, Price);

    // ToString 输出所有属性
    public override string ToString() =>
        $"OrderItem {{ Product = {Product}, Quantity = {Quantity}, Price = {Price} }}";

    // Clone 方法（with 表达式的底层支持）
    protected virtual OrderItem <Clone>$() => new OrderItem(this);

    // 解构方法
    public void Deconstruct(out string Product, out int Quantity, out decimal Price)
    {
        Product = this.Product;
        Quantity = this.Quantity;
        Price = this.Price;
    }
}
```

### 使用 record

```csharp
var item = new OrderItem("Laptop", 1, 9999.99m);
Console.WriteLine(item);  // OrderItem { Product = Laptop, Quantity = 1, Price = 9999.99 }

// with 表达式：创建副本并修改部分属性
var discounted = item with { Price = 8999.99m };

// 基于值的相等性
var item2 = new OrderItem("Laptop", 1, 9999.99m);
Console.WriteLine(item == item2);                // true（值相等）
Console.WriteLine(ReferenceEquals(item, item2));  // false（不同对象）

// 解构
var (product, quantity, price) = item;
Console.WriteLine($"{product}: {quantity} x {price}");
```

### with 表达式的性能

`with` 表达式内部调用 `<Clone>$()` 方法创建浅拷贝，再设置修改的属性。每次 `with` 都创建新对象。

::: warning record 的浅拷贝陷阱
`with` 表达式是浅拷贝。如果 record 包含引用类型属性，修改副本的集合会影响原始对象：

```csharp
public record Order(string Id, List<string> Items);

var original = new Order("A", new List<string> { "item1" });
var copy = original with { Id = "B" };

copy.Items.Add("item2");
Console.WriteLine(original.Items.Count);  // 2！原始也被修改了
```

**解决方案**：使用不可变集合或深拷贝：
```csharp
public record Order(string Id, ImmutableList<string> Items);
```
:::

## record struct（C# 10+）

```csharp
// 值类型的 record，兼具 struct 的内存效率和 record 的不可变性
public readonly record struct Money(decimal Amount, string Currency);

var price = new Money(99.99m, "CNY");
var usd = price with { Currency = "USD" };
Console.WriteLine(price == new Money(99.99m, "CNY"));  // true
```

## init-only 属性

```csharp
public class Person
{
    public string Name { get; init; }
    public int Age { get; init; }
}

var p = new Person { Name = "Alice", Age = 25 };
// p.Name = "Bob";  // 编译错误：init 属性只能在初始化时赋值
```

## required 属性（C# 11+）

```csharp
public class Config
{
    public required string ConnectionString { get; init; }
    public required string ApiKey { get; init; }
    public int Timeout { get; init; } = 30;  // 可选，有默认值
}

// 必须提供 required 属性
var config = new Config
{
    ConnectionString = "Server=...",
    ApiKey = "key123"
};
// new Config { Timeout = 30 };  // 编译错误：缺少 required 属性
```

## 不可变集合

### ImmutableArray vs ImmutableList

| 特性 | ImmutableArray\<T\> | ImmutableList\<T\> |
| --- | --- | --- |
| 底层结构 | 数组 | AVL 树 |
| 索引访问 | O(1) | O(log n) |
| Add/Remove | O(n)（复制数组） | O(log n) |
| 内存布局 | 连续 | 树节点分散 |
| 适用场景 | 构建后只读 | 频繁修改 |

```csharp
using System.Collections.Immutable;

// ImmutableArray：基于数组，构建后只读适合
var array = ImmutableArray.Create(1, 2, 3);
var newArray = array.Add(4);  // O(n)：复制整个数组

// ImmutableList：基于平衡树，频繁修改适合
var list = ImmutableList<int>.Empty;
list = list.Add(1);    // O(log n)
list = list.Add(2);
list = list.Add(3);

// Builder 模式：批量修改避免频繁创建新对象
var builder = ImmutableList.CreateBuilder<int>();
for (int i = 0; i < 1000; i++)
    builder.Add(i);
ImmutableList<int> final = builder.ToImmutable();
```

### ImmutableDictionary

```csharp
var dict = ImmutableDictionary<string, int>.Empty
    .Add("apple", 5)
    .Add("banana", 3);

var updated = dict.SetItem("apple", 10);  // 返回新字典
Console.WriteLine(dict["apple"]);  // 5（原始不变）
Console.WriteLine(updated["apple"]);  // 10
```

## 不可变设计模式

### Builder 模式构建不可变对象

```csharp
public class Configuration
{
    public string Host { get; }
    public int Port { get; }
    public bool UseSsl { get; }

    private Configuration(string host, int port, bool useSsl)
    {
        Host = host;
        Port = port;
        UseSsl = useSsl;
    }

    public class Builder
    {
        private string _host = "localhost";
        private int _port = 8080;
        private bool _useSsl = false;

        public Builder WithHost(string host) { _host = host; return this; }
        public Builder WithPort(int port) { _port = port; return this; }
        public Builder WithSsl(bool useSsl) { _useSsl = useSsl; return this; }
        public Configuration Build() => new(_host, _port, _useSsl);
    }
}

var config = new Configuration.Builder()
    .WithHost("api.example.com")
    .WithPort(443)
    .WithSsl(true)
    .Build();
```

### 不可变对象的线程安全优势

不可变对象天然线程安全——没有 setter，就没有竞态条件：

```csharp
// 不可变配置，多线程安全共享
public record AppSettings(string DbConnection, int MaxRetries, TimeSpan Timeout);

// 线程安全：所有线程读取同一实例，无需锁
private static AppSettings _settings = new("Server=...", 3, TimeSpan.FromSeconds(30));

// 更新时创建新实例
public static void UpdateSettings(AppSettings newSettings)
{
    _settings = newSettings;  // 引用赋值是原子操作
}
```
