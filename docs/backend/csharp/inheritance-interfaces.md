# 继承与接口

C# 的继承体系基于虚方法表（vtable）实现方法调度，接口调度有其独立的机制。理解这些底层原理对编写高性能多态代码至关重要。

## 虚方法表（vtable）

CLR 通过虚方法表实现多态调用。每个类型有一个 vtable，虚方法调用时通过 vtable 查找实际实现：

```
┌─────────────────────────────────────────┐
│  Animal 的 MethodTable                   │
├─────────────────────────────────────────┤
│  TypeHandle → EEClass                   │
│  vtable:                                │
│    [0] → Animal.Speak()                 │
│    [1] → Animal.Eat()                   │
│    [2] → Object.ToString()              │
│    ...                                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Dog 的 MethodTable                      │
├─────────────────────────────────────────┤
│  TypeHandle → EEClass                   │
│  vtable:                                │
│    [0] → Dog.Speak()    （重写）          │
│    [1] → Animal.Eat()   （继承）          │
│    [2] → Object.ToString()              │
│    ...                                  │
└─────────────────────────────────────────┘
```

虚方法调用（`animal.Speak()`）的 IL：

```il
// 虚方法调用：通过 vtable 查找
IL_0001: ldloc.0             // 加载 animal 引用
IL_0002: callvirt instance void Animal::Speak()  // 通过 vtable 调用
```

`callvirt` 指令会：
1. 检查引用是否为 null（null 检查）
2. 获取对象的 MethodTable
3. 从 vtable 中按槽位索引获取方法地址
4. 调用该方法

::: warning callvirt 与 null 检查
即使是非虚方法，C# 编译器也会用 `callvirt` 调用实例方法（而非 `call`），因为 `callvirt` 会做 null 检查。只有静态方法和 base 调用才用 `call`。
:::

## 继承基础

### virtual / override / sealed

```csharp
public class Animal
{
    public virtual void Speak()
    {
        Console.WriteLine("...");
    }

    public void Eat()  // 非虚方法，不能被 override
    {
        Console.WriteLine("吃东西");
    }
}

public class Dog : Animal
{
    public override void Speak()
    {
        Console.WriteLine("汪汪");
    }

    // sealed override 阻止进一步重写
    public sealed override void Eat()
    {
        Console.WriteLine("啃骨头");
    }
}

public class Husky : Dog
{
    // 不能重写 Eat，因为 Dog sealed 了
    // override void Eat() { }  // 编译错误
}
```

### new 关键字：方法隐藏

```csharp
public class Base
{
    public void Show() => Console.WriteLine("Base");
}

public class Derived : Base
{
    public new void Show() => Console.WriteLine("Derived");
}

Base b = new Derived();
b.Show();  // "Base"（调用 Base.Show，非虚方法按引用类型分派）

Derived d = new Derived();
d.Show();  // "Derived"
```

::: warning new 与 override 的区别
- `override`：修改 vtable 中的槽位，虚方法调用时派生类的实现会被调用
- `new`：不修改 vtable，创建新方法。通过基类引用调用时仍然调用基类方法

在大多数情况下，应该使用 `override` 而非 `new`。
:::

### 多态的本质

```csharp
Animal animal = new Dog { Name = "旺财" };
animal.Speak();  // "旺财 汪汪叫" —— 运行时根据实际类型调用 Dog.Speak()

// 编译时类型是 Animal，运行时类型是 Dog
// Speak() 是 virtual，所以运行时查 vtable 获取 Dog.Speak()
// 如果 Speak() 不是 virtual，则调用 Animal.Speak()
```

## 抽象类

```csharp
public abstract class Shape
{
    // 抽象方法：子类必须实现
    public abstract double Area();

    // 普通方法：子类可以继承
    public string Describe()
    {
        return $"{GetType().Name} 的面积是 {Area():F2}";
    }
}

public class Circle : Shape
{
    public double Radius { get; set; }

    public override double Area()
    {
        return Math.PI * Radius * Radius;
    }
}
```

## 接口

### 接口调度（Interface Dispatch）

接口方法调用比虚方法调用更复杂，因为类可以实现多个接口，vtable 不能直接索引：

```
调用 obj.Method() （obj 实现了 IMyInterface）
  │
  ▼
[获取对象的 MethodTable]
  │
  ▼
[接口映射表：MethodTable → InterfaceMap]
  │
  ▼
[在 InterfaceMap 中查找 IMyInterface]
  │
  ▼
[获取 IMyInterface 的方法槽位]
  │
  ▼
[调用对应方法]
```

接口调度比虚方法调度多一次查找，性能略低。.NET 运行时通过 **Devirtualization**（去虚拟化）在 JIT 阶段优化此开销。

```csharp
public interface ILogger
{
    void Log(string message);
    void LogError(string message, Exception ex);
}

public class ConsoleLogger : ILogger
{
    public void Log(string message)
    {
        Console.WriteLine($"[INFO] {message}");
    }

    public void LogError(string message, Exception ex)
    {
        Console.WriteLine($"[ERROR] {message}: {ex.Message}");
    }
}
```

### 接口的默认实现（C# 8+）

```csharp
public interface INotifier
{
    void Send(string message);

    // 默认实现
    void SendToAll(IEnumerable<string> recipients, string message)
    {
        foreach (var r in recipients)
        {
            Send($"To {r}: {message}");
        }
    }
}
```

::: warning 菱形继承问题
接口默认实现带来了类似 C++ 的菱形继承问题：

```csharp
public interface IA { void Method() => Console.WriteLine("IA"); }
public interface IB { void Method() => Console.WriteLine("IB"); }
public class C : IA, IB { }  // C 必须显式解决歧义

// 用基接口指定优先级
public class C : IA, IB
{
    void IA.Method() => Console.WriteLine("IA 优先");
}
```
:::

### 显式接口实现

```csharp
public interface IReadable
{
    byte Read();
}

public interface IWritable
{
    void Write(byte data);
}

public class MyStream : IReadable, IWritable
{
    // 显式实现：只能通过接口引用调用
    byte IReadable.Read() => 0;
    void IWritable.Write(byte data) { }

    // 隐式实现：直接通过对象调用
    public void Flush() { }
}

var stream = new MyStream();
stream.Flush();              // OK
// stream.Read();            // 编译错误：Read 是显式实现
IReadable reader = stream;
reader.Read();               // OK
```

### sealed 类与方法

```csharp
// sealed 类：不能被继承（JIT 可去虚拟化优化性能）
public sealed class Singleton
{
    public static Singleton Instance { get; } = new Singleton();
    private Singleton() { }
}
```

::: tip sealed 的性能优势
sealed 类的虚方法调用可能被 JIT 去虚拟化为直接调用，避免 vtable 查找开销。
:::

## 抽象类 vs 接口

| 特性 | 抽象类 | 接口 |
| --- | --- | --- |
| 实例化 | 不能 | 不能 |
| 构造函数 | 可以有 | 不能有 |
| 字段 | 可以有 | 不能有（C# 8 后可有静态成员） |
| 方法实现 | 可以有 | C# 8+ 可以有默认实现 |
| 继承 | 单继承 | 多实现 |
| 访问修饰符 | 支持 | 所有成员默认 public |

::: tip 选择原则
- **抽象类**：有共享状态或实现逻辑，is-a 关系明确
- **接口**：定义能力/契约，can-do 关系，需要多实现
- .NET 8+ 趋势：更多使用接口 + 默认实现，减少抽象类的使用
:::

## 模式匹配与类型判断

### is 运算符

```csharp
// is 类型检查
if (animal is Dog dog)
{
    dog.Bark();  // 直接使用转换后的变量
}

// is null 检查（不触发 == 运算符重载）
if (obj is null) { }

// is not（C# 9+）
if (animal is not Dog) { }
```

### switch 模式匹配

```csharp
string Describe(Animal animal) => animal switch
{
    Dog { Name: var name } => $"一只叫{name}的狗",
    Cat { Age: < 2 } => "小猫",
    Cat => "大猫",
    null => "空",
    _ => "未知动物"
};
```
