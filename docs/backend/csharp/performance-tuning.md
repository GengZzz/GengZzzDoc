# 性能调优

C# 性能调优需要基于数据而非猜测。BenchmarkDotNet 是 .NET 生态的标准基准测试工具，配合对象池、Span 零拷贝、以及 SIMD 向量化，可以显著提升热路径性能。

## BenchmarkDotNet

### 基本用法

```bash
dotnet add package BenchmarkDotNet
```

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

[MemoryDiagnoser]          // 显示内存分配
[SimpleJob(RuntimeMoniker.Net80)]
public class StringBenchmarks
{
    private readonly string _text = "Hello, World! This is a benchmark test.";

    [Benchmark(Baseline = true)]
    public string StringConcat()
    {
        string result = "";
        for (int i = 0; i < 100; i++)
            result += _text;
        return result;
    }

    [Benchmark]
    public string StringBuilder()
    {
        var sb = new StringBuilder();
        for (int i = 0; i < 100; i++)
            sb.Append(_text);
        return sb.ToString();
    }

    [Benchmark]
    public string StringCreate()
    {
        return string.Create(_text.Length * 100, _text, (span, state) =>
        {
            for (int i = 0; i < 100; i++)
                state.AsSpan().CopyTo(span.Slice(i * state.Length));
        });
    }
}

// 运行
BenchmarkRunner.Run<StringBenchmarks>();
```

典型输出：
```
|        Method |     Mean |   Error |  StdDev | Ratio | Allocated |
|-------------- |---------:|--------:|--------:|------:|----------:|
|  StringConcat | 45.23 us | 0.89 us | 0.83 us |  1.00 |  786432 B |
| StringBuilder |  1.23 us | 0.02 us | 0.02 us |  0.03 |     512 B |
|  StringCreate |  0.89 us | 0.01 us | 0.01 us |  0.02 |     256 B |
```

::: tip BenchmarkDotNet 最佳实践
1. 使用 `[MemoryDiagnoser]` 追踪分配
2. 使用 `[Params]` 测试不同输入大小
3. 使用 `[Benchmark(Baseline = true)]` 标记基准方法
4. 运行 Release 配置（`dotnet run -c Release`）
5. 关闭其他应用以减少噪声
:::

## 对象池

### ObjectPool\<T\>

`Microsoft.Extensions.ObjectPool` 提供对象池实现：

```csharp
using Microsoft.Extensions.ObjectPool;

// 自定义对象池策略
public class StringBuilderPoolPolicy : IPooledObjectPolicy<StringBuilder>
{
    public StringBuilder Create() => new();

    public bool Return(StringBuilder obj)
    {
        obj.Clear();  // 清理状态
        return true;
    }
}

// 使用
var pool = new DefaultObjectPool<StringBuilder>(new StringBuilderPoolPolicy());
var sb = pool.Get();
try
{
    sb.Append("Hello");
    sb.Append(" World");
    return sb.ToString();
}
finally
{
    pool.Return(sb);  // 归还到池中
}
```

### ArrayPool\<T\>

`System.Buffers.ArrayPool<T>` 是高性能数组池：

```csharp
using System.Buffers;

// 租用数组（可能比请求的大）
byte[] buffer = ArrayPool<byte>.Shared.Rent(1024);
try
{
    // 使用 buffer
    ProcessBuffer(buffer.AsSpan(0, 1024));
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);  // 归还
}

// 注意：归还后 buffer 长度可能大于使用长度
// 用 AsSpan(0, originalLength) 限制访问范围
```

::: warning ArrayPool 的注意事项
- 归还的数组内容不会被清零，注意信息泄露
- `Return` 的 `clearArray` 参数控制是否清零（安全敏感场景设为 true）
- 租用的数组可能比请求的大，不要假设长度
:::

## 字符串处理优化

```csharp
// StringBuilder：中等规模拼接
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
    sb.Append("item").Append(i).Append(' ');
string result = sb.ToString();

// string.Create：固定大小的字符串构建（零中间分配）
string result2 = string.Create(10, 42, (span, state) =>
{
    var numStr = state.ToString();
    span.Fill('X');
    numStr.AsSpan().CopyTo(span.Slice(0, numStr.Length));
});

// Span<char>：栈上处理字符串
ReadOnlySpan<char> text = "Hello, World!".AsSpan();
ReadOnlySpan<char> word = text.Slice(7, 5);  // "World"，零拷贝
```

### 字符串格式化性能对比

| 方式 | 耗时 | 分配 |
| --- | --- | --- |
| `string.Concat(a, b)` | 最快 | 最少 |
| `$"{a}{b}"` | 快 | 少 |
| `StringBuilder` | 中等 | 中等 |
| `string.Format` | 慢 | 多 |
| `a + " " + b`（循环） | 最慢 | 最多 |

## 缓存行（False Sharing）

现代 CPU 以缓存行（通常 64 字节）为单位从主存加载数据。如果两个线程频繁修改同一个缓存行中的不同变量，会产生 **False Sharing**：

```csharp
// ❌ False Sharing：两个计数器在同一个缓存行中
public class BadCounter
{
    public long CounterA;  // 偏移 0
    public long CounterB;  // 偏移 8
    // 两个变量很可能在同一缓存行（64 字节）中
    // 线程 A 修改 CounterA → 线程 B 的 CounterB 缓存失效
}

// ✅ 解决方案：填充到 64 字节
[StructLayout(LayoutKind.Explicit, Size = 64)]
public struct PaddedCounter
{
    [FieldOffset(0)] public long Value;
    // 其余 56 字节作为填充
}
```

```csharp
// .NET 8+ 的 FieldOffset 方式
public class GoodCounter
{
    [FieldOffset(0)]
    public long CounterA;

    [FieldOffset(64)]  // 放在不同的缓存行
    public long CounterB;
}
```

## SIMD（Vector\<T\>）

`System.Numerics.Vector<T>` 利用 CPU 的 SIMD 指令并行处理多个数据：

```csharp
using System.Numerics;

// 向量化的数组求和（比逐元素循环快 4-8 倍）
public static float SumVectorized(float[] array)
{
    int vectorSize = Vector<float>.Count;  // 通常为 8（AVX2）或 4（SSE）
    var sumVector = Vector<float>.Zero;

    int i = 0;
    // 向量化处理
    for (; i <= array.Length - vectorSize; i += vectorSize)
    {
        var v = new Vector<float>(array, i);
        sumVector += v;
    }

    // 求和向量中的元素
    float sum = Vector.Dot(sumVector, Vector<float>.One);

    // 处理剩余元素
    for (; i < array.Length; i++)
        sum += array[i];

    return sum;
}
```

::: tip SIMD 的适用条件
- 数据是连续的数组
- 操作是独立的（每个元素的操作不依赖其他元素）
- 数据量足够大（SIMD 启动有开销）
- 适合：数值计算、图像处理、信号处理
:::

## Stackalloc

`stackalloc` 在栈上分配内存，避免堆分配和 GC 压力：

```csharp
// 栈上分配小数组
Span<int> numbers = stackalloc int[100];
for (int i = 0; i < 100; i++)
    numbers[i] = i * i;

// 搭配 Span 使用，避免 string.Split 的分配
ReadOnlySpan<char> text = "a,b,c,d,e".AsSpan();
int commaCount = 0;
foreach (var c in text)
    if (c == ',') commaCount++;

Span<Range> ranges = stackalloc Range[commaCount + 1];
// ... 使用 ranges
```

::: warning Stackalloc 的限制
- 只适合小数据量（默认栈大小 1 MB）
- 大量 stackalloc 会导致栈溢出（StackOverflowException）
- 不能在 async 方法中使用（栈帧可能在 await 后改变）
- 谨慎用于循环中（每次迭代都分配）
:::

## 性能优化清单

1. **测量先于优化**：用 BenchmarkDotNet 找到瓶颈
2. **减少分配**：Span、ArrayPool、对象池
3. **避免装箱**：泛型代替接口
4. **利用缓存**：Spatial Locality、False Sharing 避免
5. **并行化**：SIMD、Parallel.For、Task.WhenAll
6. **减少锁竞争**：ConcurrentDictionary、无锁数据结构
7. **选择正确的数据结构**：Dictionary vs SortedList vs FrozenDictionary
8. **内联热路径**：`[AggressiveInlining]`
