# 委托、事件与 Lambda

委托是 C# 中函数作为一等公民的基础。理解委托是理解事件、LINQ、async/await 的前提。

## 委托类型

委托是类型安全的函数指针，可以引用一个或多个方法。

```csharp
// 声明委托类型
public delegate int MathOperation(int a, int b);

// 匹配签名的方法
int Add(int a, int b) => a + b;
int Multiply(int a, int b) => a * b;

// 创建委托实例
MathOperation op = Add;
int result = op(3, 4);  // 7

op = Multiply;
result = op(3, 4);      // 12
```

## 内置委托类型

实际开发中通常不用自定义委托，而用内置的三种：

```csharp
// Action：无返回值（最多 16 个参数）
Action greet = () => Console.WriteLine("Hello");
Action<string> log = msg => Console.WriteLine(msg);
Action<string, int, bool> complex = (a, b, c) => { };

// Func：有返回值（最后一个类型参数是返回值，最多 17 个参数）
Func<int> getRandom = () => Random.Shared.Next();
Func<int, int, int> add = (a, b) => a + b;
Func<string, int, bool> tryParse = (s, n) => int.TryParse(s, out _);

// Predicate：返回 bool，用于条件判断
Predicate<int> isEven = x => x % 2 == 0;
List<int> numbers = new() { 1, 2, 3, 4, 5 };
List<int> evens = numbers.FindAll(isEven);  // { 2, 4 }
```

## 多播委托

委托可以使用 `+=` 和 `-=` 组合多个方法，形成调用链。

```csharp
Action<string> logger = null;

logger += msg => Console.WriteLine($"[控制台] {msg}");
logger += msg => Debug.WriteLine($"[调试] {msg}");
logger += msg => File.AppendAllText("log.txt", $"{DateTime.Now}: {msg}\n");

logger("系统启动");  // 依次调用三个方法
```

::: warning 多播委托的异常处理
多播委托链中某个方法抛出异常时，后续方法不会被调用。需要手动遍历调用列表：

```csharp
foreach (var handler in logger.GetInvocationList())
{
    try
    {
        ((Action<string>)handler)("消息");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"处理器异常: {ex.Message}");
    }
}
```
:::

## 事件

事件是对委托的封装，限制外部只能 `+=` 和 `-=`，不能直接赋值或调用。

```csharp
public class OrderService
{
    // 事件声明
    public event EventHandler<OrderEventArgs> OrderCreated;

    public void CreateOrder(Order order)
    {
        // 业务逻辑...

        // 触发事件（线程安全写法）
        OrderCreated?.Invoke(this, new OrderEventArgs(order));
    }
}

public class OrderEventArgs : EventArgs
{
    public Order Order { get; }
    public OrderEventArgs(Order order) => Order = order;
}

// 订阅事件
var service = new OrderService();
service.OrderCreated += (sender, e) =>
{
    Console.WriteLine($"订单已创建: {e.Order.Id}");
};
```

### 标准 EventHandler 模式

```csharp
// EventHandler<TEventArgs> 是标准的泛型事件委托
public class Timer
{
    public event EventHandler<TimeSpan> Elapsed;

    public async Task StartAsync(TimeSpan interval)
    {
        while (true)
        {
            await Task.Delay(interval);
            Elapsed?.Invoke(this, interval);
        }
    }
}
```

## Lambda 表达式

Lambda 是创建委托实例的简洁语法。

```csharp
// 表达式 Lambda
Func<int, int> square = x => x * x;

// 语句 Lambda
Func<int, int, int> max = (a, b) =>
{
    if (a > b) return a;
    return b;
};

// 捕获外部变量（闭包）
int threshold = 10;
Predicate<int> isAbove = x => x > threshold;  // 捕获了 threshold

// 闭包的陷阱：捕获的是变量引用，不是值
var actions = new List<Action>();
for (int i = 0; i < 5; i++)
{
    actions.Add(() => Console.WriteLine(i));  // 所有 lambda 捕获同一个 i
}
foreach (var action in actions) action();  // 全部输出 5

// 修复：使用局部变量
for (int i = 0; i < 5; i++)
{
    int local = i;  // 每次循环创建新变量
    actions.Add(() => Console.WriteLine(local));
}
```

## 表达式树（Expression\<T\>）

表达式树将 Lambda 转换为可分析的数据结构，而不是直接编译为 IL。这是 LINQ to SQL / Entity Framework 能将 C# 查询翻译为 SQL 的基础。

```csharp
using System.Linq.Expressions;

// 这是委托：直接编译执行
Func<int, bool> isEven = x => x % 2 == 0;

// 这是表达式树：可分析、可翻译
Expression<Func<int, bool>> expr = x => x % 2 == 0;

// 查看表达式树结构
Console.WriteLine(expr.Body);          // (x % 2) == 0
Console.WriteLine(expr.Parameters[0]); // x

// 手动构建表达式树
var param = Expression.Parameter(typeof(int), "x");
var body = Expression.Equal(
    Expression.Modulo(param, Expression.Constant(2)),
    Expression.Constant(0)
);
var lambda = Expression.Lambda<Func<int, bool>>(body, param);

// 编译执行
Func<int, bool> compiled = lambda.Compile();
Console.WriteLine(compiled(4));  // true
```

::: tip 表达式树的实际用途
EF Core 的 `Where(x => x.Age > 18)` 中，`x => x.Age > 18` 是 `Expression<Func<User, bool>>`。EF Core 分析这个表达式树的结构，将其翻译为 SQL：`WHERE Age > 18`。如果用 `Func<User, bool>`，就变成了内存过滤，数据库会返回全部数据再在内存中过滤——这就是 IQueryable 和 IEnumerable 的核心区别。
:::
