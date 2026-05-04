# 委托、事件与 Lambda

委托是 C# 中函数作为一等公民的基础，其内部的多播委托链机制、事件的线程安全模式、以及表达式树的可分析数据结构是理解 LINQ 和 async/await 的关键。

## 委托类型

委托是类型安全的函数指针，编译器为每个委托类型生成一个继承自 `System.MulticastDelegate` 的类。

### 内部结构

```
┌──────────────────────────────────────────────────┐
│  System.MulticastDelegate                        │
├──────────────────────────────────────────────────┤
│  _target（object）：实例方法的目标对象，静态方法为 null │
│  _methodPtr（IntPtr）：方法的函数指针               │
│  _invocationList（object）：多播委托链（数组）       │
└──────────────────────────────────────────────────┘
```

```csharp
// 声明委托类型
public delegate int MathOperation(int a, int b);

// 匹配签名的方法
int Add(int a, int b) => a + b;

// 创建委托实例
MathOperation op = Add;
int result = op(3, 4);  // 7
```

### 内置委托类型

```csharp
// Action：无返回值（最多 16 个参数）
Action greet = () => Console.WriteLine("Hello");
Action<string> log = msg => Console.WriteLine(msg);
Action<string, int, bool> complex = (a, b, c) => { };

// Func：有返回值（最后一个类型参数是返回值，最多 17 个参数）
Func<int> getRandom = () => Random.Shared.Next();
Func<int, int, int> add = (a, b) => a + b;

// Predicate：返回 bool，用于条件判断
Predicate<int> isEven = x => x % 2 == 0;
List<int> numbers = new() { 1, 2, 3, 4, 5 };
List<int> evens = numbers.FindAll(isEven);  // { 2, 4 }
```

## 多播委托链内部实现

委托使用 `+=` 组合多个方法时，CLR 维护一个 `_invocationList` 数组：

```csharp
Action<string> logger = null;

logger += msg => Console.WriteLine($"[控制台] {msg}");
logger += msg => Debug.WriteLine($"[调试] {msg}");
logger += msg => File.AppendAllText("log.txt", $"{DateTime.Now}: {msg}\n");

// 内部 _invocationList:
// [0] => Console.WriteLine lambda
// [1] => Debug.WriteLine lambda
// [2] => File.AppendAllText lambda

logger("系统启动");  // 依次调用三个方法
```

`logger -= secondHandler` 时，CLR 会从 `_invocationList` 中搜索匹配的方法引用并移除。如果委托链只剩一个方法，`_invocationList` 被置为 null，回到单播状态。

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

### 事件的线程安全模式

```csharp
public class OrderService
{
    // 线程安全的事件触发
    public event EventHandler<OrderEventArgs> OrderCreated;

    public void CreateOrder(Order order)
    {
        // 业务逻辑...

        // 线程安全写法：先复制到局部变量，再判空调用
        // 防止在判空和调用之间被其他线程取消订阅
        var handler = OrderCreated;
        handler?.Invoke(this, new OrderEventArgs(order));
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

::: warning 事件的内存泄漏
事件订阅是委托引用，如果事件发布者生命周期长于订阅者，会导致订阅者无法被 GC 回收。解决方案：

```csharp
// 订阅者中实现 IDisposable，Dispose 时取消订阅
public class OrderNotifier : IDisposable
{
    private readonly OrderService _service;

    public OrderNotifier(OrderService service)
    {
        _service = service;
        _service.OrderCreated += OnOrderCreated;
    }

    public void Dispose()
    {
        _service.OrderCreated -= OnOrderCreated;  // 必须取消订阅
    }

    private void OnOrderCreated(object sender, OrderEventArgs e) { }
}
```
:::

## Lambda 表达式

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
```

### 闭包的陷阱

闭包捕获的是**变量引用**，不是值。在循环中捕获迭代变量时需要注意：

```csharp
// 经典陷阱：所有 lambda 捕获同一个 i
var actions = new List<Action>();
for (int i = 0; i < 5; i++)
{
    actions.Add(() => Console.WriteLine(i));
}
foreach (var action in actions) action();  // 全部输出 5（不是 0-4）

// 修复：使用局部变量（每次循环创建新变量）
for (int i = 0; i < 5; i++)
{
    int local = i;
    actions.Add(() => Console.WriteLine(local));  // 输出 0, 1, 2, 3, 4
}
```

::: tip C# 5.0+ 的 foreach 修复
C# 5.0+ 中 `foreach` 的迭代变量已经修复了这个问题——每次迭代都创建新的变量。但 `for` 循环中的变量仍然共享。
:::

## 表达式树（Expression\<T\>）

表达式树将 Lambda 转换为可分析的数据结构（树形结构），而不是直接编译为 IL。这是 EF Core 能将 C# 查询翻译为 SQL 的基础。

```csharp
using System.Linq.Expressions;

// 委托：直接编译执行，无法分析结构
Func<int, bool> isEven = x => x % 2 == 0;

// 表达式树：可分析、可翻译、可修改
Expression<Func<int, bool>> expr = x => x % 2 == 0;

// 查看表达式树结构
Console.WriteLine(expr.Body);          // (x % 2) == 0
Console.WriteLine(expr.Parameters[0]); // x
Console.WriteLine(expr.Body.NodeType); // Equal
```

### 表达式树的树形结构

```
Expression<Func<int, bool>> expr = x => x % 2 == 0;

         BinaryExpression (Equal)
          /              \
  BinaryExpression     ConstantExpression (0)
    (Modulo)
     /      \
ParameterExpression  ConstantExpression (2)
  (x)
```

### 手动构建表达式树

```csharp
// 等价于 Expression<Func<int, bool>> expr = x => x % 2 == 0
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

### 表达式树访问者模式

通过继承 `ExpressionVisitor` 可以遍历和修改表达式树：

```csharp
public class TableNameReplacer : ExpressionVisitor
{
    protected override Expression VisitMember(MemberExpression node)
    {
        // 将属性访问翻译为数据库列名
        if (node.Member.Name == "Name")
            return Expression.Constant("column_name");
        return base.VisitMember(node);
    }
}
```

::: tip 表达式树的实际用途
EF Core 的 `Where(x => x.Age > 18)` 中，`x => x.Age > 18` 是 `Expression<Func<User, bool>>`。EF Core 分析这个表达式树的结构，将其翻译为 SQL：`WHERE Age > 18`。如果用 `Func<User, bool>`，就变成了内存过滤，数据库会返回全部数据再在内存中过滤——这就是 IQueryable 和 IEnumerable 的核心区别。
:::

## 委托与事件的性能

| 操作 | 耗时 |
| --- | --- |
| 直接方法调用 | ~0.5 ns |
| 单播委托调用 | ~2 ns |
| 多播委托调用（10 个处理器） | ~20 ns |
| 虚方法调用 | ~2 ns |

单播委托调用几乎与虚方法调用一样快。多播委托的性能与调用链长度成正比。
