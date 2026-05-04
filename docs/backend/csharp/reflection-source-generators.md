# 反射与源生成器

反射是 .NET 运行时类型自省的基础，但其性能开销显著。源生成器（Source Generator）在编译时生成代码，避免了运行时反射的开销。

## 反射 API

### Type

```csharp
// 获取 Type 的多种方式
Type t1 = typeof(string);                    // 编译时常量
Type t2 = "hello".GetType();                 // 运行时获取
Type t3 = Type.GetType("System.String");     // 通过名称获取（需完全限定名）

// Type 的信息
Console.WriteLine(t1.Name);              // String
Console.WriteLine(t1.Namespace);         // System
Console.WriteLine(t1.BaseType);          // Object
Console.WriteLine(t1.IsClass);           // true
Console.WriteLine(t1.IsValueType);       // false
Console.WriteLine(t1.GetInterfaces());   // IEnumerable<char>, IComparable, ...
```

### MethodInfo / PropertyInfo / FieldInfo

```csharp
var type = typeof(Person);

// 获取方法
MethodInfo method = type.GetMethod("SayHello");
method.Invoke(person, new object[] { "World" });

// 获取属性
PropertyInfo prop = type.GetProperty("Name");
string name = (string)prop.GetValue(person);
prop.SetValue(person, "Bob");

// 获取所有公共属性
PropertyInfo[] props = type.GetProperties();
foreach (var p in props)
{
    Console.WriteLine($"{p.Name}: {p.GetValue(person)}");
}

// 获取字段（包括私有）
FieldInfo field = type.GetField("_age", BindingFlags.NonPublic | BindingFlags.Instance);
```

### 构造函数调用

```csharp
// 通过反射创建实例
var type = typeof(Person);

// 无参构造
var person1 = Activator.CreateInstance<Person>();
var person2 = (Person)Activator.CreateInstance(type);

// 有参构造
var person3 = (Person)Activator.CreateInstance(type, "Alice", 25);

// 更快的方式：缓存构造函数委托
var ctor = type.GetConstructor(new[] { typeof(string), typeof(int) });
var createFunc = (Func<string, int, Person>)ctor.CreateDelegate(
    typeof(Func<string, int, Person>));
var person4 = createFunc("Alice", 25);  // 比 Activator 快很多
```

## Attribute 自定义与读取

```csharp
// 定义 Attribute
[AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
public class DisplayAttribute : Attribute
{
    public string Name { get; }
    public int Order { get; set; }

    public DisplayAttribute(string name)
    {
        Name = name;
    }
}

// 使用
public class Product
{
    [Display("产品名称", Order = 1)]
    public string Name { get; set; }

    [Display("价格", Order = 2)]
    public decimal Price { get; set; }
}

// 读取 Attribute
var props = typeof(Product).GetProperties();
foreach (var prop in props)
{
    var attr = prop.GetCustomAttribute<DisplayAttribute>();
    if (attr != null)
    {
        Console.WriteLine($"[{attr.Order}] {attr.Name}: {prop.Name}");
    }
}
```

## 动态代码生成（Emit）

`System.Reflection.Emit` 可以在运行时动态生成 IL 代码并编译为方法：

```csharp
// 动态创建一个加法方法
var method = new DynamicMethod(
    "Add",
    typeof(int),
    new[] { typeof(int), typeof(int) },
    typeof(Program).Module);

var il = method.GetILGenerator();
il.Emit(OpCodes.Ldarg_0);    // 加载第一个参数
il.Emit(OpCodes.Ldarg_1);    // 加载第二个参数
il.Emit(OpCodes.Add);         // 相加
il.Emit(OpCodes.Ret);         // 返回

// 编译为委托
var add = (Func<int, int, int>)method.CreateDelegate(typeof(Func<int, int, int>));
Console.WriteLine(add(3, 4));  // 7
```

::: warning Emit 的限制
- Native AOT 不支持 `System.Reflection.Emit`
- 需要完全信任环境
- 调试困难（生成的 IL 很难追踪）
- 在现代 .NET 中，用 Source Generator 替代
:::

## Source Generator 原理

Source Generator 是编译器插件，在编译期间分析源代码并生成新的源代码：

```
编译流程（无 Source Generator）：
源代码 → Roslyn → IL → 程序集

编译流程（有 Source Generator）：
源代码 → Roslyn（语法树） → Source Generator → 生成新代码 → 合并 → IL → 程序集
```

### Source Generator 实战：JSON 序列化源生成

System.Text.Json 的 Source Generator 避免了运行时反射的开销：

```csharp
// 定义 JsonSerializable 上下文
[JsonSerializable(typeof(Person))]
[JsonSerializable(typeof(List<Order>))]
public partial class AppJsonContext : JsonSerializerContext { }

// 使用源生成的序列化器
string json = JsonSerializer.Serialize(person, AppJsonContext.Default.Person);
Person p = JsonSerializer.Deserialize(json, AppJsonContext.Default.Person);

// 性能对比：
// 反射序列化：~500 ns
// 源生成序列化：~200 ns（2.5 倍快）
```

### 自定义 Source Generator

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Text;
using System.Text;

[Generator]
public class AutoNotifyGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        // 注册源代码输出
        context.RegisterPostInitializationOutput(ctx =>
        {
            ctx.AddSource("AutoNotifyAttribute.g.cs", SourceText.From(@"
namespace MyApp
{
    [System.AttributeUsage(System.AttributeTargets.Field)]
    public class AutoNotifyAttribute : System.Attribute { }
}", Encoding.UTF8));
        });

        // 注册语法提供者
        var fields = context.SyntaxProvider
            .CreateSyntaxProvider(
                predicate: (node, _) => node is FieldDeclarationSyntax fds,
                transform: (ctx, _) => GetFieldInfo(ctx))
            .Where(f => f != null);

        // 生成源代码
        context.RegisterSourceOutput(fields, (spc, field) =>
        {
            var source = GenerateProperty(field!);
            spc.AddSource($"{field!.ClassName}.g.cs", SourceText.From(source, Encoding.UTF8));
        });
    }
}
```

## 性能对比

| 方式 | 首次调用 | 后续调用 | AOT 兼容 |
| --- | --- | --- | --- |
| 直接访问 | ~1 ns | ~1 ns | 是 |
| 缓存 MethodInfo | ~100 ns | ~50 ns | 受限 |
| 未缓存反射 | ~500 ns | ~500 ns | 受限 |
| Expression 编译 | ~10,000 ns | ~5 ns | 否 |
| Source Generator | ~1 ns | ~1 ns | 是 |

::: tip 选择建议
- **直接代码**：首选，性能最佳
- **Source Generator**：编译时生成代码，运行时零开销
- **表达式树**：需要动态构建逻辑时
- **缓存反射**：需要完全动态的场景
- **未缓存反射**：仅用于一次性初始化场景（如配置加载）
:::
