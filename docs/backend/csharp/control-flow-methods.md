# 控制流与方法

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

### switch 语句

```csharp
string day = "Monday";

switch (day)
{
    case "Monday":
    case "Tuesday":
    case "Wednesday":
    case "Thursday":
    case "Friday":
        Console.WriteLine("工作日");
        break;
    case "Saturday":
    case "Sunday":
        Console.WriteLine("周末");
        break;
    default:
        Console.WriteLine("无效");
        break;
}
```

### switch 表达式（C# 8+）

```csharp
// 更简洁的写法，直接返回值
string result = score switch
{
    >= 90 => "A",
    >= 80 => "B",
    >= 60 => "C",
    _ => "F"              // _ 是默认分支
};

// 元组模式匹配
string Describe(int x, int y) => (x, y) switch
{
    (0, 0) => "原点",
    (_, 0) => "在 X 轴上",
    (0, _) => "在 Y 轴上",
    var (a, b) when a == b => "对角线",
    _ => "其他位置"
};

// 属性模式匹配（C# 9+）
string greeting = person switch
{
    { Age: < 13 } => "小朋友你好",
    { Age: < 18 } => "同学你好",
    { Name: "Admin" } => "管理员你好",
    _ => "你好"
};
```

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
    // 无论是否异常都会执行
    Console.WriteLine("清理完成");
}
```

### 异常过滤器（when 关键字，C# 6+）

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

::: tip 自定义异常
生产代码中应定义业务异常继承 `Exception`，并提供 `SerializationInfo` 构造函数以支持序列化：

```csharp
public class BusinessException : Exception
{
    public int ErrorCode { get; }

    public BusinessException(int code, string message) : base(message)
    {
        ErrorCode = code;
    }

    protected BusinessException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
        ErrorCode = info.GetInt32(nameof(ErrorCode));
    }
}
```
:::

## 方法参数

### ref：按引用传递（必须先初始化）

```csharp
void Double(ref int value)
{
    value *= 2;
}

int x = 5;
Double(ref x);
Console.WriteLine(x);  // 10
```

### out：输出参数（方法内必须赋值）

```csharp
bool TryDivide(double a, double b, out double result)
{
    if (b == 0)
    {
        result = 0;
        return false;
    }
    result = a / b;
    return true;
}

if (TryDivide(10, 3, out double ratio))
{
    Console.WriteLine($"{ratio:F2}");  // 3.33
}
```

### in：只读引用传递（C# 7.2+）

```csharp
// 传递大型结构体时避免复制，同时保证不被修改
double CalculateDistance(in Point a, in Point b)
{
    // a.X = 0;  // 编译错误：in 参数不可修改
    double dx = a.X - b.X;
    double dy = a.Y - b.Y;
    return Math.Sqrt(dx * dx + dy * dy);
}
```

### params：可变参数

```csharp
int Sum(params int[] numbers)
{
    return numbers.Sum();
}

int total = Sum(1, 2, 3, 4, 5);  // 15
int also = Sum(new[] { 1, 2 });  // 也可以传数组
```

## 本地函数（C# 7+）

在方法内部定义的辅助函数，可访问外部方法的参数和局部变量。

```csharp
IEnumerable<int> Fibonacci(int count)
{
    if (count <= 0) yield break;

    // 本地函数
    (int current, int next) NextPair(int a, int b) => (b, a + b);

    int a = 0, b = 1;
    for (int i = 0; i < count; i++)
    {
        yield return a;
        (a, b) = NextPair(a, b);
    }
}
```

本地函数相比私有方法的优势：

- 可以访问外部方法的 `out` 变量和 `ref` 参数
- 可以是迭代器（`yield return`）或异步方法
- 编译器可能内联优化
