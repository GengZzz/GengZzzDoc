# 模式匹配

C# 的模式匹配从 C# 7 开始逐步增强，从简单的类型检查演进为强大的数据解构工具。理解模式匹配的编译优化和完整语法，可以写出更简洁的条件逻辑。

## 模式匹配演进

| 版本 | 模式类型 |
| --- | --- |
| C# 7 | 类型模式、常量模式 |
| C# 8 | switch 表达式、属性模式、元组模式 |
| C# 9 | 关系模式、逻辑模式 |
| C# 10 | 扩展属性模式 |
| C# 11 | 列表模式、切片模式 |

## is 模式

```csharp
// 类型模式
if (obj is string s)
{
    Console.WriteLine(s.Length);
}

// 常量模式
if (obj is null) { }
if (obj is not null) { }

// var 模式（匹配任何值）
if (obj is var value)
{
    // value 始终有值（包括 null）
}
```

## switch 表达式

```csharp
// 基本 switch 表达式
string result = score switch
{
    >= 90 => "A",
    >= 80 => "B",
    >= 60 => "C",
    _ => "F"
};

// 元组模式
string point = (x, y) switch
{
    (0, 0) => "原点",
    (_, 0) => "在 X 轴上",
    (0, _) => "在 Y 轴上",
    _ when x == y => "对角线",
    _ => "其他位置"
};
```

## 属性模式

```csharp
// 基本属性模式
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
    { Status: "Shipped" } => "运输中",
    _ => "未知"
};

// 提取属性值
string info = person switch
{
    { Name: var name, Age: var age } => $"{name} ({age}岁)"
};

// 扩展属性模式（C# 10+）
bool IsImportant(Notification n) => n is { User.IsAdmin: true, Priority: >= 5 };
```

## 关系模式与逻辑模式

```csharp
// 关系模式
string level = temperature switch
{
    < 0 => "冰冻",
    >= 0 and < 10 => "寒冷",
    >= 10 and < 20 => "凉爽",
    >= 20 and < 30 => "舒适",
    >= 30 => "炎热"
};

// 逻辑模式：and, or, not
bool IsInRange(int value) => value is >= 1 and <= 100;
bool IsNotSpecial(char c) => c is not (' ' or '\t' or '\n');
bool IsLetterOrDigit(char c) => c is (>= 'a' and <= 'z') or (>= 'A' and <= 'Z') or (>= '0' and <= '9');
```

## 列表模式（C# 11）

```csharp
int[] numbers = { 1, 2, 3, 4, 5 };

string pattern = numbers switch
{
    [] => "空数组",
    [var single] => $"单个元素: {single}",
    [1, 2, 3] => "正好是 1, 2, 3",
    [1, .. var rest] => $"以 1 开头，剩余 {rest.Length} 个",
    [var first, .., var last] => $"首尾: {first}, {last}",
    _ => "其他"
};

// 匹配条件
bool StartsWithEven(int[] arr) => arr is [var first, ..] and { Length: > 0 } when first % 2 == 0;

// 切片模式（.. var name 捕获子列表）
if (numbers is [var head, .. var tail])
{
    Console.WriteLine($"头: {head}, 尾: {string.Join(", ", tail)}");
}
```

## 模式匹配的编译优化

C# 编译器对 switch 表达式做了多种优化：

### 跳转表优化

当模式是密集的常量值时，编译器生成跳转表（类似 C 的 switch）：

```csharp
// 编译器生成跳转表，O(1) 查找
string result = dayOfWeek switch
{
    0 => "Sunday",
    1 => "Monday",
    2 => "Tuesday",
    3 => "Wednesday",
    4 => "Thursday",
    5 => "Friday",
    6 => "Saturday",
    _ => "Invalid"
};
```

### 字符串哈希优化

字符串模式匹配使用哈希表，避免逐字符比较。

### 类型检查优化

编译器对类型模式做了 `is` + `cast` 合并优化，避免重复类型检查。

::: warning 模式匹配的顺序
模式匹配按声明顺序检查，第一个匹配的分支被执行。把更具体的模式放在前面：

```csharp
// ❌ 错误顺序：子类型在后面，永远不会匹配
string result = animal switch
{
    Animal => "动物",       // 匹配所有 Animal
    Dog => "狗",           // 永远不会到达
    _ => "未知"
};

// ✅ 正确顺序：子类型在前面
string result = animal switch
{
    Dog => "狗",
    Cat => "猫",
    Animal => "其他动物",
    _ => "未知"
};
```
:::
