# 基本语法

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
const double Pi = 3.14159;         // 编译时常量，不可修改
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

## 值类型 vs 引用类型

这是 C# 类型系统最核心的区分，直接影响内存布局和赋值行为。

### 值类型（Value Type）

值类型包括：所有数值类型（int, double, ...）、bool、char、struct、enum。

```csharp
int a = 10;
int b = a;    // b 是 a 的完整副本
b = 20;
Console.WriteLine(a);  // 10，a 不受影响
```

**内存布局**：值类型的变量直接存储数据本身。局部变量和方法参数存储在**栈（Stack）**上；作为类的字段时，随对象存储在**堆（Heap）**上。

```
栈 (Stack)
┌──────────┐
│  a = 10  │  ← int 直接存储值
└──────────┘
┌──────────┐
│  b = 10  │  ← 赋值时复制完整数据
└──────────┘
```

### 引用类型（Reference Type）

引用类型包括：class、string、array、delegate、interface。

```csharp
var list1 = new List<int> { 1, 2, 3 };
var list2 = list1;    // list2 和 list1 指向同一个对象
list2.Add(4);
Console.WriteLine(list1.Count);  // 4，两个变量共享同一对象
```

**内存布局**：引用类型的变量存储的是指向堆上对象的**引用（地址）**。

```
栈 (Stack)                    堆 (Heap)
┌──────────────┐
│ list1 → ──────────────→  ┌──────────────────┐
└──────────────┘            │ List<int> 对象    │
┌──────────────┐            │ { 1, 2, 3 }      │
│ list2 → ──────────────→  └──────────────────┘
└──────────────┘            （两个引用指向同一对象）
```

### struct vs class 的关键差异

```csharp
// struct：值类型
public struct Point
{
    public double X;
    public double Y;
}

// class：引用类型
public class PointRef
{
    public double X;
    public double Y;
}

// 使用对比
var p1 = new Point { X = 1, Y = 2 };
var p2 = p1;         // 完整复制
p2.X = 10;
Console.WriteLine(p1.X);  // 1，p1 不受影响

var r1 = new PointRef { X = 1, Y = 2 };
var r2 = r1;         // 复制引用
r2.X = 10;
Console.WriteLine(r1.X);  // 10，r1 和 r2 指向同一对象
```

::: warning 装箱与拆箱
值类型赋值给 `object`（或任何接口类型）时发生**装箱（Boxing）**——在堆上分配新对象并复制数据。反向操作是**拆箱（Unboxing）**。这两个操作都有性能开销，热路径中应避免。

```csharp
int num = 42;
object boxed = num;           // 装箱：堆上分配，复制值
int unboxed = (int)boxed;    // 拆箱：类型检查 + 复制值
```
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

### Convert 类与 Parse

```csharp
// Convert：处理 null，支持多种类型
int a = Convert.ToInt32("42");
int b = Convert.ToInt32(null);  // 0，不会抛异常
bool c = Convert.ToBoolean(1);  // true

// int.Parse：遇到 null 或格式错误会抛异常
int d = int.Parse("42");
// int e = int.Parse("abc");  // FormatException

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
string sql = @"SELECT *
FROM Users
WHERE Name = 'Alice'";

// 原始字符串字面量（C# 11+，三个引号）
string json = """
{
    "name": "Alice",
    "age": 25
}
""";
```

### 字符串不可变性

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
```

::: tip 为什么 string 是引用类型但表现像值类型？
`string` 是 class（引用类型），但它是**不可变的（immutable）**。任何修改操作都返回新对象，因此赋值和传参时行为上类似值类型——不会出现意外的共享修改。`string.Intern()` 还会利用字符串驻留池复用相同内容的对象。
:::

## 命名空间

命名空间用于组织代码、避免命名冲突。

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

var obj = Json.Deserialize<MyClass>(jsonString);
```
