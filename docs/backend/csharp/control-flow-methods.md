# 控制流与方法

C# 的控制流语法除了基本的 if/switch/loop 外，还提供了强大的模式匹配和异常过滤机制。方法参数的 ref/in/out 在 IL 层面有不同的含义。

## 条件语句

### if / else if / else

```csharp
int score = 85;

if (score >= 90)
{
    Console.WriteLine("A");
}
else if (score >= 80)
{
    Console.WriteLine("B");
}
else if (score >= 60)
{
    Console.WriteLine("C");
}
else
{
    Console.WriteLine("F");
}
```

## switch 模式匹配完整语法

switch 在 C# 7+ 已经演进为强大的模式匹配工具，远超传统的"值匹配"。

### switch 表达式（C# 8+）

```csharp
// 关系模式
string result = score switch
{
    >= 90 => "A",
    >= 80 => "B",
    >= 60 => "C",
    _ => "F"
};

// 元组模式
string Describe(int x, int y) => (x, y) switch
{
    (0, 0) => "原点",
    (_, 0) => "在 X 轴上",
    (0, _) => "在 Y 轴上",
    _ when x == y => "对角线",
    _ => "其他位置"
};
```

### 属性模式（C# 9+）

```csharp
string greeting = person switch
{
    { Age: < 13 } => "小朋友你好",
    { Age: < 18 } => "同学你好",
    { Name: "Admin" } => "管理员你好",
    _ => "你好"
};

// 嵌套属性模式
string status = order switch
{
    { Status: "Pending", Total: > 10000 } => "大额待处理",
    { Status: "Pending" } => "待处理",
    { Status: "Shipped", Shipping.Delivered: true } => "已送达",
    { Status: "Shipped" } => "运输中",
    _ => "未知状态"
};
```

### 列表模式（C# 11）

```csharp
// 匹配数组/列表的模式
int[] numbers = { 1, 2, 3 };

string pattern = numbers switch
{
    [] => "空数组",
    [var single] => $"单个元素: {single}",
    [1, .. var rest] => $"以 1 开头，剩余 {rest.Length} 个元素",
    [var first, .., var last] => $"首尾: {first}, {last}",
    [1, 2, 3] => "正好是 1, 2, 3",
    _ => "其他"
};
```

### 递归模式

```csharp
// 属性模式中嵌套其他模式
bool IsImportantMessage(Message msg) => msg is
{
    Priority: >= MessagePriority.High,
    Recipients: [_, _, ..]  // 至少 2 个收件人
};
```

::: warning switch 与 null
switch 表达式在遇到 null 时不会抛异常，而是匹配失败。如果需要处理 null，显式添加 `{ } => ...` 或 `null => ...` 分支。
:::

## 循环

### for

```csharp
for (int i = 0; i < 10; i++)
{
    if (i == 5) continue;  // 跳过本次
    if (i == 8) break;     // 退出循环
    Console.Write($"{i} ");  // 0 1 2 3 4 6 7
}
```

### foreach

```csharp
var fruits = new[] { "apple", "banana", "cherry" };

foreach (var fruit in fruits)
{
    Console.WriteLine(fruit);
}

// 使用索引（C# 9+ 的 foreach + Index）
foreach (var (fruit, index) in fruits.Index())
{
    Console.WriteLine($"{index}: {fruit}");
}
```

::: warning foreach 与修改
对集合执行 `foreach` 时不能修改集合本身（添加/删除元素），否则抛出 `InvalidOperationException`。需要修改时用 `for` 循环倒序遍历，或先 `.ToList()` 复制一份。
:::

### while / do-while

```csharp
// while：先判断后执行
int n = 0;
while (n < 5)
{
    Console.Write($"{n} ");  // 0 1 2 3 4
    n++;
}

// do-while：先执行后判断（至少执行一次）
int m = 10;
do
{
    Console.Write($"{m} ");  // 10
    m++;
} while (m < 5);
```

## 异常处理

### 异常层次结构

```
System.Object
  └── System.Exception
        ├── System.SystemException
        │     ├── System.ArgumentException
        │     │     ├── System.ArgumentNullException
        │     │     └── System.ArgumentOutOfRangeException
        │     ├── System.InvalidOperationException
        │     ├── System.NotSupportedException
        │     ├── System.NullReferenceException
        │     ├── System.IndexOutOfRangeException
        │     ├── System.OutOfMemoryException
        │     └── System.FormatException
        └── System.ApplicationException（不推荐使用，自定义异常直接继承 Exception）
```

### try / catch / finally

```csharp
try
{
    var text = File.ReadAllText("config.json");
    var config = JsonSerializer.Deserialize<Config>(text);
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"配置文件不存在: {ex.FileName}");
}
catch (JsonException ex)
{
    Console.WriteLine($"JSON 格式错误: {ex.Message}");
}
catch (Exception ex)
{
    Console.WriteLine($"未知错误: {ex.Message}");
    throw;  // 重新抛出，保留原始堆栈
}
finally
{
    Console.WriteLine("清理完成");
}
```

### 异常过滤器（when 关键字，C# 6+）

异常过滤器在 **catch 块选择之前**执行，如果过滤器返回 false，继续寻找下一个匹配的 catch：

```csharp
try
{
    await httpClient.GetAsync(url);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    Console.WriteLine("资源不存在");
}
catch (HttpRequestException ex) when (ex.StatusCode >= HttpStatusCode.InternalServerError)
{
    Console.WriteLine("服务器错误，稍后重试");
}
```

::: tip when 的执行时机
`when` 过滤器在堆栈展开之前执行。这意味着如果过滤器返回 false，**finally 块不会执行**，调试器仍停留在抛出异常的行。这对于记录异常但不处理它非常有用：

```csharp
try { DangerousOperation(); }
catch (Exception ex) when (LogAndReturnFalse(ex)) { }
// 如果 LogAndReturnFalse 返回 false，异常继续向上传播
// 而且调试器的调用栈没有被破坏

static bool LogAndReturnFalse(Exception ex)
{
    Logger.LogError(ex, "操作失败");
    return false;  // 不处理，继续传播
}
```
:::

### 异常的性能开销

| 操作 | 耗时 |
| --- | --- |
| 正常返回 | ~1 ns |
| 首次抛出异常 | ~10,000 - 50,000 ns（10-50 μs） |
| 重新抛出（throw;） | ~5,000 - 10,000 ns |

异常不应作为控制流使用。热路径中避免异常，使用 `TryParse`、`TryGetValue` 等模式代替。

### 自定义异常设计原则

```csharp
[Serializable]
public class BusinessException : Exception
{
    public int ErrorCode { get; }

    public BusinessException(int code, string message)
        : base(message)
    {
        ErrorCode = code;
    }

    public BusinessException(int code, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = code;
    }

    // 支持序列化（跨 AppDomain 场景需要）
    protected BusinessException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
        ErrorCode = info.GetInt32(nameof(ErrorCode));
    }
}
```

::: warning 异常设计原则
- 异常类名以 `Exception` 结尾
- 提供无参构造、带 message 构造、带 message+inner 构造
- 标记 `[Serializable]` 并提供序列化构造函数
- 不要捕获所有异常 `catch (Exception)` 后不做任何处理（吞噬异常）
- 不要用异常做控制流（`try { int.Parse(s); } catch { }` 应改为 `int.TryParse(s, out _)`）
:::

## 方法参数

### ref / out / in 的 IL 差异

这三个参数修饰符在 IL 层面都传递**托管指针（managed pointer）**，但语义不同：

| 修饰符 | IL 表示 | 语义 | 调用前初始化 | 方法内赋值 |
| --- | --- | --- | --- | --- |
| ref | `ref` | 读写引用 | 必须 | 可选 |
| out | `out` | 输出引用 | 不必 | 必须 |
| in | `ref readonly` | 只读引用 | 必须 | 禁止 |

```csharp
void Modify(ref int value)
{
    value += 10;  // 修改原始值
}

bool TryDivide(double a, double b, out double result)
{
    if (b == 0) { result = 0; return false; }
    result = a / b;
    return true;
}

double CalculateDistance(in Point a, in Point b)
{
    // a.X = 0;  // 编译错误：in 参数不可修改
    double dx = a.X - b.X;
    double dy = a.Y - b.Y;
    return Math.Sqrt(dx * dx + dy * dy);
}
```

::: warning in 参数的陷阱
`in` 参数虽然保证不被修改，但传递引用类型时只保证引用本身不变，引用指向的对象仍可修改。另外，`in` 参数可能导致**防御性复制**（Defensive Copy）——如果方法参数是 `in Point` 但 `Point` 没有标记 `readonly`，编译器会复制一份以防方法内部修改。
:::

### params：可变参数

```csharp
int Sum(params int[] numbers)
{
    return numbers.Sum();
}

int total = Sum(1, 2, 3, 4, 5);  // 15
```

::: warning params 的性能
`params` 每次调用都会分配一个新数组。热路径中考虑提供多个重载避免数组分配：

```csharp
int Sum(int a) => a;
int Sum(int a, int b) => a + b;
int Sum(int a, int b, int c) => a + b + c;
int Sum(params int[] numbers) => numbers.Sum();  // 只有参数超过 3 个时才用
```
:::

## 方法内联条件

JIT 编译器会自动内联（Inline）小方法以消除方法调用开销。内联的默认条件：

| 条件 | 阈值 |
| --- | --- |
| IL 代码大小 | < 16 字节（默认） |
| 包含异常处理 | 不内联 |
| 包含循环 | 不内联 |
| 虚方法 | 不内联（除非去虚拟化） |
| 构造函数 | 通常不内联 |

```csharp
// 会被内联的方法
int Square(int x) => x * x;  // IL 大小小

// 不会被内联
int Complex(int x)
{
    for (int i = 0; i < x; i++) { }  // 包含循环
    return x;
}

// 强制内联（Tier 1 编译器会更积极地处理）
[MethodImpl(MethodImplOptions.AggressiveInlining)]
int HotPath(int x) => x * x;
```

## 本地函数（C# 7+）

```csharp
IEnumerable<int> Fibonacci(int count)
{
    if (count <= 0) yield break;

    // 本地函数可以访问外部变量
    (int current, int next) NextPair(int a, int b) => (b, a + b);

    int a = 0, b = 1;
    for (int i = 0; i < count; i++)
    {
        yield return a;
        (a, b) = NextPair(a, b);
    }
}
```

本地函数相比 lambda 的优势：
- 不分配委托对象（除非捕获变量需要闭包）
- 可以是迭代器（`yield return`）或异步方法
- 可以访问外部方法的 `out` 变量和 `ref` 参数
- 编译器可能内联优化

## static 方法与扩展方法

```csharp
// 扩展方法：第一个参数用 this 修饰，定义在静态类中
public static class StringExtensions
{
    public static bool IsNullOrEmpty(this string str)
    {
        return string.IsNullOrEmpty(str);
    }

    public static string Truncate(this string str, int maxLength)
    {
        if (str.Length <= maxLength) return str;
        return str.Substring(0, maxLength) + "...";
    }
}

// 使用（像实例方法一样调用）
string name = "Alice";
bool empty = name.IsNullOrEmpty();
string truncated = name.Truncate(3);  // "Ali..."
```

::: tip 扩展方法的优先级
扩展方法的优先级低于实例方法。如果类本身有一个同名方法，实例方法会遮蔽扩展方法。扩展方法不能访问类的私有成员。
:::
