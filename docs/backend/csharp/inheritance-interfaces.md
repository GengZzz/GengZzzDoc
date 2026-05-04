# 继承与接口

## 继承

C# 只支持单继承（一个类只能有一个父类），但可以实现多个接口。

```csharp
public class Animal
{
    public string Name { get; set; }

    // virtual：允许子类重写
    public virtual void Speak()
    {
        Console.WriteLine($"{Name} 发出了声音");
    }

    // 非虚方法：子类用 new 隐藏（不推荐）
    public void Eat()
    {
        Console.WriteLine($"{Name} 在吃东西");
    }
}

public class Dog : Animal
{
    // override：重写虚方法
    public override void Speak()
    {
        Console.WriteLine($"{Name} 汪汪叫");
    }

    // sealed override：禁止进一步重写
    public sealed override string ToString()
    {
        return $"Dog: {Name}";
    }
}

public class Puppy : Dog
{
    // 无法重写 sealed 的 ToString
    // public override string ToString() { }  // 编译错误

    public override void Speak()
    {
        Console.WriteLine($"{Name} 奶声奶气地叫");
    }
}
```

### 多态的本质

```csharp
Animal animal = new Dog { Name = "旺财" };
animal.Speak();  // "旺财 汪汪叫" —— 调用的是 Dog.Speak()

// 运行时根据实际类型调用对应的方法（虚方法表 vtable）
// 如果 Speak() 不是 virtual，则调用 Animal.Speak()
```

::: warning virtual 与性能
虚方法调用需要查虚方法表（vtable），比直接调用多一次间接寻址。在极高性能场景（如每帧循环百万次）可考虑用 `sealed class` 或非虚方法。编译器的去虚拟化优化（Devirtualization）在某些条件下可以消除这个开销。
:::

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

public class Rectangle : Shape
{
    public double Width { get; set; }
    public double Height { get; set; }

    public override double Area()
    {
        return Width * Height;
    }
}
```

## 接口

接口定义行为契约，不含实现（C# 8 之前）。

```csharp
public interface ILogger
{
    void Log(string message);
    void LogError(string message, Exception ex);
}

// 实现接口
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

// 一个类实现多个接口
public class FileLogger : ILogger, IDisposable
{
    private StreamWriter _writer;

    public FileLogger(string path)
    {
        _writer = new StreamWriter(path, append: true);
    }

    public void Log(string message)
    {
        _writer.WriteLine($"[INFO] {DateTime.Now}: {message}");
    }

    public void LogError(string message, Exception ex)
    {
        _writer.WriteLine($"[ERROR] {DateTime.Now}: {message}: {ex}");
    }

    public void Dispose()
    {
        _writer?.Dispose();
    }
}
```

### 接口默认实现（C# 8+）

```csharp
public interface INotifier
{
    void Send(string message);

    // 默认实现：提供一个便捷方法
    void SendToAll(IEnumerable<string> recipients, string message)
    {
        foreach (var r in recipients)
        {
            Send($"To {r}: {message}");
        }
    }
}
```

### 抽象类 vs 接口选择

| 维度 | 抽象类 | 接口 |
| --- | --- | --- |
| 继承数量 | 单继承 | 可实现多个 |
| 状态 | 可以有字段 | 不能有字段（C# 8+ 可有默认实现） |
| 构造函数 | 有 | 没有 |
| 适用场景 | "是什么"（is-a 关系） | "能做什么"（能力契约） |
| 性能 | 直接调用 | 接口调用略慢（但 JIT 可优化） |

## 模式匹配

模式匹配让类型检查和数据提取更简洁。

### 类型模式（C# 7+）

```csharp
if (shape is Circle c)
{
    Console.WriteLine($"圆的半径: {c.Radius}");
}
```

### 属性模式（C# 8+）

```csharp
bool IsPremium(User user) => user switch
{
    { Subscription: "Premium", IsActive: true } => true,
    _ => false
};
```

### 关系模式（C# 9+）

```csharp
string Classify(double temperature) => temperature switch
{
    < 0 => "冰冻",
    >= 0 and < 20 => "寒冷",
    >= 20 and < 30 => "舒适",
    >= 30 => "炎热"
};
```

### 列表模式（C# 11+）

```csharp
int[] numbers = { 1, 2, 3, 4, 5 };

if (numbers is [1, 2, ..])  // 以 1, 2 开头
{
    Console.WriteLine("以 1, 2 开头");
}

if (numbers is [_, _, var third, ..])  // 提取第三个元素
{
    Console.WriteLine($"第三个元素: {third}");  // 3
}
```
