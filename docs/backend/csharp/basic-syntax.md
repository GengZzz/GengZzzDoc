# 基本语法

C# 的类型系统建立在值类型与引用类型的精确区分之上，理解内存分配规则是写出高效 C# 代码的基础。

## 变量与类型系统

C# 是强类型语言，每个变量都有编译时确定的类型。

```csharp
// 隐式类型推断（编译器根据右侧推断类型）
var name = "Alice";        // string
var age = 25;              // int
var price = 9.99m;         // decimal（m 后缀）
var isActive = true;       // bool

// 显式声明
int count = 10;
double temperature = 36.5;
char grade = 'A';
string message = "Hello";

// 常量与只读
const double Pi = 3.14159;         // 编译时常量，嵌入 IL，不可修改
readonly string ConnectionString;  // 运行时常量，只能在构造函数中赋值
```

### 内置类型一览

| 类别 | 类型 | 大小 | 范围 |
| --- | --- | --- | --- |
| 整数 | `sbyte` | 1 字节 | -128 ~ 127 |
| 整数 | `byte` | 1 字节 | 0 ~ 255 |
| 整数 | `short` | 2 字节 | -32768 ~ 32767 |
| 整数 | `ushort` | 2 字节 | 0 ~ 65535 |
| 整数 | `int` | 4 字节 | -2^31 ~ 2^31-1 |
| 整数 | `uint` | 4 字节 | 0 ~ 2^32-1 |
| 整数 | `long` | 8 字节 | -2^63 ~ 2^63-1 |
| 浮点 | `float` | 4 字节 | ~6-7 位精度（f 后缀） |
| 浮点 | `double` | 8 字节 | ~15-16 位精度（默认） |
| 浮点 | `decimal` | 16 字节 | ~28-29 位精度（财务计算） |
| 文本 | `char` | 2 字节 | UTF-16 单个字符 |
| 文本 | `string` | 引用类型 | UTF-16 字符序列 |
| 布尔 | `bool` | 1 字节 | true / false |

## 值类型 vs 引用类型深入

这是 C# 类型系统最核心的区分，直接影响内存布局、赋值行为和性能特征。

### 精确的内存分配规则

值类型的分配位置取决于**上下文**，而非"值类型总在栈上"：

| 上下文 | 分配位置 | 原因 |
| --- | --- | --- |
| 局部变量 | 栈 | 生命周期与方法一致 |
| 方法参数（非 ref/in/out） | 栈 | 按值复制到栈帧 |
| 方法参数（ref/in/out） | 原始位置 | 传递引用（指针） |
| 类的字段（field） | 堆 | 随对象在堆上分配 |
| struct 的字段 | 跟随 struct | struct 在哪，字段就在哪 |
| 数组元素 | 堆 | 数组是引用类型 |
| 装箱后 | 堆 | 值被复制到堆上的包装对象 |

```csharp
public class MyClass
{
    private int _value;       // 在堆上（随 MyClass 实例）
    private Point _location;  // 在堆上（随 MyClass 实例）
}

public struct Point
{
    public int X;  // 跟随 Point——Point 在栈则 X 在栈，Point 在堆则 X 在堆
    public int Y;
}
```

### 装箱与拆箱的 IL 分析

装箱不仅仅是"性能开销"，它在 IL 层面是一个完整的操作：

```csharp
int num = 42;
object boxed = num;           // 装箱
int unboxed = (int)boxed;    // 拆箱
```

对应的 IL 代码：

```il
// 装箱 (Boxing)
IL_0001: ldloc.0          // 将局部变量 num 压栈
IL_0002: box [mscorlib]System.Int32  // 在堆上分配 Object + 复制值 + 返回引用

// 拆箱 (Unboxing)
IL_0007: unbox.any [mscorlib]System.Int32  // 检查类型 + 获取指针 + 复制值
```

装箱的完整成本：
1. 在堆上分配 12/24 字节（对象头 + 类型句柄 + 值）
2. 将值复制到堆上对象
3. 返回引用

拆箱的成本：
1. 类型检查（确保是正确类型）
2. 获取值的指针
3. 复制值到栈上

::: warning 高频路径中的意外装箱
最常见的意外装箱来源：

```csharp
// 1. 接口调用导致的装箱
var list = new List<int> { 1, 2, 3 };
IList<int> iList = list;      // 没有装箱
IEnumerable enumerable = list; // 没有装箱
IComparable<int> comp = 42;   // 装箱！int 赋值给接口类型

// 2. Console.WriteLine 导致的装箱（参数是 object）
int value = 100;
Console.WriteLine(value);     // 装箱！string.Format 内部处理

// 3. 非泛型集合
var oldList = new ArrayList();
oldList.Add(42);              // 装箱！ArrayList 接受 object

// 4. string.Format 中的值类型
string msg = string.Format("Count: {0}", 42);  // 装箱

// 性能对比（BenchmarkDotNet 结果，仅供参考）：
// 不装箱的 List<int>.Count: ~0.5 ns
// 装箱后: ~25 ns（50 倍差距）
```
:::

### struct 字段对齐

CLR 对 struct 的字段进行内存对齐以优化 CPU 访问：

```csharp
// 字段按声明顺序排列，按最大字段大小对齐
public struct BadLayout
{
    byte a;    // 偏移 0，占用 1 字节
    // 3 字节填充
    int b;     // 偏移 4，占用 4 字节
    byte c;    // 偏移 8，占用 1 字节
    // 3 字节填充
    // 总大小：12 字节
}

// 更紧凑的布局
public struct GoodLayout
{
    int b;     // 偏移 0，占用 4 字节
    byte a;    // 偏移 4，占用 1 字节
    byte c;    // 偏移 5，占用 1 字节
    // 2 字节填充
    // 总大小：8 字节
}
```

可以使用 `StructLayout` 属性控制布局：

```csharp
[StructLayout(LayoutKind.Sequential, Pack = 1)]  // 按 1 字节对齐
public struct PackedStruct
{
    byte a;
    int b;
    byte c;
    // 总大小：6 字节（无填充）
    // 注意：CPU 访问未对齐的数据可能更慢
}
```

### string 驻留池

CLR 维护一个字符串驻留池（String Intern Pool），字面量字符串自动进入池中：

```csharp
string a = "hello";
string b = "hello";
Console.WriteLine(object.ReferenceEquals(a, b));  // true，同一个对象

string c = new string(new[] { 'h', 'e', 'l', 'l', 'o' });
Console.WriteLine(object.ReferenceEquals(a, c));  // false，不同对象

// 手动驻留
string d = string.Intern(c);
Console.WriteLine(object.ReferenceEquals(a, d));  // true

// 手动检查是否已驻留
bool isInterned = string.IsInterned(c) != null;
```

驻留池的内存不会被 GC 回收（字符串永久保留），因此只对高复用率的字符串有意义。

### Span\<T\> 与 Memory\<T\> 零拷贝切片

`Span<T>` 和 `Memory<T>` 是 .NET Core 2.1+ 引入的零拷贝切片类型，避免了 Substring 等操作的内存分配：

```csharp
// 传统方式：每次 Substring 分配新字符串
string text = "Hello, World!";
string sub = text.Substring(0, 5);  // 分配新字符串 "Hello"

// Span 方式：零拷贝，只记录指针和长度
ReadOnlySpan<char> span = text.AsSpan();
ReadOnlySpan<char> subSpan = span.Slice(0, 5);  // 无分配！指向原字符串

// 栈上分配的 Span
Span<int> numbers = stackalloc int[100];  // 栈上分配，无 GC 压力
numbers[0] = 42;
```

::: tip Span\<T\> 的限制
`Span<T>` 是 `ref struct`，只能存在于栈上：
- 不能作为类的字段
- 不能用于 async 方法
- 不能用于 lambda 捕获

`Memory<T>` 不是 ref struct，可以用在上述场景，但需要额外的 `MemoryMarshal` 操作。
:::

## 类型转换

### 隐式转换（安全，无数据丢失）

```csharp
int a = 42;
long b = a;           // int → long，自动提升
double c = a;         // int → double，自动提升
```

### 显式转换（可能丢失数据）

```csharp
double d = 3.14;
int i = (int)d;       // 3，小数部分被截断

long big = 300;
byte b = (byte)big;   // 44，溢出（300 % 256）
```

### checked / unchecked 上下文

```csharp
// unchecked（默认）：溢出时静默截断
int x = int.MaxValue;
unchecked { x += 1; }  // x = -2147483648（最小值）

// checked：溢出时抛 OverflowException
checked { x += 1; }    // OverflowException
```

### Convert 类与 Parse

```csharp
// Convert：处理 null，支持多种类型
int a = Convert.ToInt32("42");
int b = Convert.ToInt32(null);  // 0，不会抛异常
bool c = Convert.ToBoolean(1);  // true

// int.Parse：遇到 null 或格式错误会抛异常
int d = int.Parse("42");

// int.TryParse：安全方式
if (int.TryParse("abc", out int result))
{
    Console.WriteLine(result);
}
else
{
    Console.WriteLine("解析失败");
}
```

### is 与 as 运算符

```csharp
object obj = "hello";

// is：类型检查（C# 7+ 支持模式匹配）
if (obj is string s)
{
    Console.WriteLine(s.Length);  // 直接使用转换后的变量
}

// as：引用转换，失败返回 null（不会抛异常）
string str = obj as string;     // "hello"
int? num = obj as int?;         // null
```

::: warning as 与值类型
`as` 不能用于值类型（int、struct 等），因为值类型没有 null 语义（Nullable 除外）。使用 `is` + 模式匹配代替。
:::

## 字符串

### 字符串插值（C# 6+）

```csharp
string name = "Alice";
int age = 25;

// 字符串插值
string msg = $"Hello, {name}! You are {age} years old.";

// 插值中支持表达式
string info = $"Next year you'll be {age + 1}.";

// 对齐与格式化
string price = $"Price: {99.9,10:F2}";  // 右对齐 10 字符，保留 2 位小数
```

### 逐字字符串与原始字符串

```csharp
// 逐字字符串（@ 前缀）：不转义，保留换行
string path = @"C:\Users\Alice\Documents";

// 原始字符串字面量（C# 11+，三个引号）
string json = """
{
    "name": "Alice",
    "age": 25
}
""";

// 插值原始字符串
string name = "Alice";
string msg = $"""
    Hello, {name}!
    Welcome to .NET.
    """;
```

### 字符串不可变性与 string.Create

```csharp
string s = "Hello";
s += " World";  // 不是修改原字符串，而是创建新字符串对象

// 频繁拼接用 StringBuilder
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
{
    sb.Append("item");
    sb.Append(i);
    sb.Append(' ');
}
string result = sb.ToString();

// string.Create：零分配构建字符串（栈上处理字符，一次性分配）
string created = string.Create(10, 42, (span, state) =>
{
    span.Fill('X');
    var numStr = state.ToString();
    numStr.AsSpan().CopyTo(span.Slice(0, numStr.Length));
});
```

::: tip 为什么 string 是引用类型但表现像值类型？
`string` 是 class（引用类型），但它是**不可变的（immutable）**。任何修改操作都返回新对象，因此赋值和传参时行为上类似值类型——不会出现意外的共享修改。
:::

## 命名空间

```csharp
// 定义命名空间
namespace MyApp.Services
{
    public class EmailService
    {
        public void Send(string to, string body) { }
    }
}

// using 引入命名空间
using MyApp.Services;

// 全局 using（C# 10+，放在一个文件中，整个项目生效）
// GlobalUsings.cs
global using System;
global using System.Collections.Generic;

// using 别名
using Json = System.Text.Json.JsonSerializer;
using Dict = System.Collections.Generic.Dictionary<string, int>;

var obj = Json.Deserialize<MyClass>(jsonString);
```
