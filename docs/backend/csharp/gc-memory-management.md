# GC 与内存管理

.NET 的自动内存管理由 GC（Garbage Collector）负责，但"自动"不意味着"无须关注"。理解三代回收的触发机制、LOH 碎片化问题、以及 IDisposable 完整模式，是避免内存泄漏和 GC 停顿导致 P99 延迟飙升的关键。

## 三代回收

CLR 将托管堆分为三代（Generation），对象根据存活时间被分配到不同代：

```
┌───────────────────────────────────────────────────────┐
│  Gen0（256 KB - 4 MB，取决于工作集）                    │
│  新对象分配在这里，大多数对象在此代死亡                   │
│  回收频率最高，回收速度最快                              │
├───────────────────────────────────────────────────────┤
│  Gen1（Gen0 大小的 2 倍左右）                           │
│  Gen0 回收后存活的对象提升到这里                         │
│  作为 Gen0 和 Gen2 之间的缓冲                           │
├───────────────────────────────────────────────────────┤
│  Gen2（托管堆的剩余部分）                                │
│  Gen1 回收后存活的对象提升到这里                         │
│  长期存活的对象，回收频率最低，回收代价最高               │
├───────────────────────────────────────────────────────┤
│  LOH（Large Object Heap，>85,000 字节）                │
│  大对象直接分配在这里，随 Gen2 一起回收                   │
│  不压缩（默认），容易碎片化                               │
└───────────────────────────────────────────────────────┘
```

### 触发阈值与回收策略

| 代 | 默认阈值（大致） | 回收策略 |
| --- | --- | --- |
| Gen0 | 256 KB - 4 MB（动态调整） | 回收最频繁，暂停时间最短 |
| Gen1 | Gen0 大小的 ~2 倍 | 作为 Gen0 和 Gen2 之间的缓冲 |
| Gen2 | 托管堆的剩余部分 | 回收最不频繁，暂停时间最长 |

GC 触发的条件：
1. Gen0 预算耗尽（最常见）
2. 显式调用 `GC.Collect()`
3. 系统内存不足
4. LOH 预算耗尽

```csharp
// 查看当前 GC 信息
Console.WriteLine($"GC.MaxGeneration: {GC.MaxGeneration}");  // 2
Console.WriteLine($"Gen0 收集次数: {GC.CollectionCount(0)}");
Console.WriteLine($"Gen1 收集次数: {GC.CollectionCount(1)}");
Console.WriteLine($"Gen2 收集次数: {GC.CollectionCount(2)}");
Console.WriteLine($"已分配内存: {GC.GetTotalMemory(false) / 1024 / 1024} MB");
```

### 对象提升流程

```
程序运行，对象不断分配到 Gen0：
Gen0: [A] [B] [C] [D] [E] [F] [G] [H]
       ↑存活 ↑死  ↑存活 ↑死  ↑死  ↑存活 ↑死  ↑死

Gen0 GC 触发（只保留存活对象）：
Gen0: [I] [J] [K] ...（新分配）
Gen1: [A] [C] [F] ...（从 Gen0 提升）

Gen1 GC 触发：
Gen2: [A] [C] ...（从 Gen1 提升）
Gen1: [F] ...（仍然存活但在 Gen1）
```

## 大对象堆（LOH）

大于 **85,000 字节** 的对象直接分配到 LOH，LOH 随 Gen2 一起回收。

### LOH 碎片化问题

LOH 默认不压缩，频繁分配/释放大对象会导致碎片：

```
LOH 碎片化示例：
[  128KB 对象  ][ 空闲 64KB ][  200KB 对象  ][ 空闲 128KB ][  256KB 对象  ]
                                            ↑
                              需要 100KB 但找不到连续空间
                              尽管总空闲 > 100KB

LOH 碎片化的影响：
1. GC 需要更多时间扫描碎片空间
2. 新的大对象可能无法分配（OOM）
3. 内存使用率降低
```

**解决方案**：

```csharp
// .NET 4.5.1+：启用 LOH 压缩（需要 GC 设置）
GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce;
GC.Collect();  // 下一次 Gen2 GC 会压缩 LOH

// .NET 5+：LOH 自动压缩条件
// 当 LOH 碎片率超过阈值时自动压缩
```

### Pinned 对象导致的 Gen2 碎片

Pinned 对象（被 `fixed` 或 P/Invoke 固定的对象）在 GC 回收时不能被移动，导致其周围的内存无法压缩：

```
Gen2 内存布局（有 Pinned 对象）：
[ 对象A ][ Pinned B ][ 对象C ][ 对象D ][ 对象E ]
           ↑ 固定不动    ↑ GC 想压缩但 B 挡住了

结果：
[ 对象A ][ 空洞 ][ Pinned B ][ 对象C+D+E 合并 ]
         ↑ 这块空间无法被利用
```

```csharp
// 避免不必要的 Pinned 对象
// ❌ 长时间 pinned
fixed (byte* ptr = largeArray)
{
    // 长时间操作...
}

// ✅ 尽量缩短 pinned 时间
// ✅ 使用 ArrayPool 避免大数组的 pinned
// ✅ 使用 NativeMemory 代替 pinned 托管数组
```

## GC 模式

### Workstation GC vs Server GC

| 特性 | Workstation GC | Server GC |
| --- | --- | --- |
| 线程数 | 1 个 GC 线程 | 每个 CPU 核心 1 个 GC 线程 |
| 堆数量 | 1 个托管堆 | 每个 CPU 核心 1 个堆 |
| 内存占用 | 较低 | 较高（多堆） |
| 吞吐量 | 较低 | 较高 |
| 停顿时间 | 较长 | 较短（并行回收） |
| 适用场景 | 桌面应用 | 服务器应用 |

```csharp
// 配置 GC 模式（.csproj 或 runtimeconfig.json）
// Workstation GC（默认）
<ServerGarbageCollection>false</ServerGarbageCollection>

// Server GC
<ServerGarbageCollection>true</ServerGarbageCollection>
```

### Background GC vs Foreground GC

| 特性 | Background GC | Foreground GC |
| --- | --- | --- |
| 工作线程 | 不阻塞（与应用并发） | 阻塞所有工作线程 |
| 适用代 | Gen2（最耗时的回收） | Gen0/Gen1（短暂暂停） |
| .NET 版本 | .NET 4.0+ 默认 | 所有版本 |

Background GC 允许应用程序在 Gen2 回收期间继续分配对象（在 Gen0 中），减少应用停顿。

## GC 调优参数

```csharp
// GC 通知机制（.NET Framework / .NET Core 3.0+）
GC.RegisterForFullGCNotification(
    maxPercentGenerationExpand: 10,  // Gen2 扩展超过 10% 时通知
    maxLargeObjectHeapCompaction: 10  // LOH 压缩超过 10% 时通知
);

// 监听 GC 通知
Task.Run(() =>
{
    while (true)
    {
        var status = GC.WaitForFullGCApproach();
        if (status == GCNotificationStatus.Succeeded)
        {
            Console.WriteLine("Full GC 即将到来！");
            // 可以在此暂停新请求处理
        }

        status = GC.WaitForFullGCComplete();
        if (status == GCNotificationStatus.Succeeded)
        {
            Console.WriteLine("Full GC 完成");
        }
    }
});
```

## Finalizer 与 IDisposable

### Finalizer 队列

Finalizer 由 GC 在回收对象前调用，但有额外开销：

```
没有 Finalizer 的对象：
  GC 直接回收 → 立即释放内存

有 Finalizer 的对象：
  1. GC 发现有 Finalizer，放入 Finalizer 队列
  2. Finalizer 线程异步执行 Finalizer
  3. 下一次 GC 时才真正释放内存
  → 内存释放延迟至少一个 GC 周期
```

::: warning Finalizer 的性能影响
每个带 Finalizer 的对象至少需要两次 GC 才能被回收。频繁创建/销毁带 Finalizer 的对象会导致 Gen1/Gen2 压力增大。
:::

### IDisposable 完整模式

标准的 Dispose 模式包含 Dispose 方法、Finalizer、和 SuppressFinalize：

```csharp
public class FileHandler : IDisposable
{
    private FileStream _stream;
    private bool _disposed = false;

    // 公开的 Dispose 方法
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);  // 告诉 GC 不需要调用 Finalizer
    }

    // 受保护的 Dispose 方法
    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;

        if (disposing)
        {
            // 释放托管资源
            _stream?.Dispose();
        }

        // 释放非托管资源（如果有）
        // CloseHandle(_handle);

        _disposed = true;
    }

    // Finalizer：安全网，防止忘记调用 Dispose
    ~FileHandler()
    {
        Dispose(false);  // 只释放非托管资源
    }
}

// 使用
using (var handler = new FileHandler())
{
    // 使用 handler
}  // 自动调用 Dispose

// C# 8+ using 声明
using var handler = new FileHandler();
// 作用域结束时自动调用 Dispose
```

### async Dispose（IAsyncDisposable）

```csharp
public class AsyncResource : IAsyncDisposable
{
    private HttpClient _client = new();

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await ValueTask.CompletedTask;
    }

    // 同时实现 IDisposable 和 IAsyncDisposable
    public void Dispose()
    {
        _client.Dispose();
    }
}

// 使用
await using var resource = new AsyncResource();
```

## WeakReference 弱引用

弱引用不阻止 GC 回收对象，适用于缓存和事件解耦场景：

```csharp
// 缓存场景：对象可以被 GC 回收，回收后缓存失效
var cache = new Dictionary<string, WeakReference<byte[]>>();

byte[] data = LoadLargeData();
cache["key"] = new WeakReference<byte[]>(data);

// 使用时检查是否还存活
if (cache["key"].TryGetTarget(out var cached))
{
    // 数据还在内存中
    UseData(cached);
}
else
{
    // 已被 GC 回收，重新加载
    data = LoadLargeData();
    cache["key"].TrySetTarget(data);
}
```

### ConditionalWeakTable

`ConditionalWeakTable<TKey, TValue>` 将值与键的生命周期绑定——键被回收时，值也被回收：

```csharp
// 为对象附加额外的元数据，对象回收时元数据自动清理
var metadata = new ConditionalWeakTable<object, ObjectMetadata>();

var myObj = new object();
metadata.Add(myObj, new ObjectMetadata { CreatedAt = DateTime.UtcNow });

// myObj 被 GC 回收后，对应的 ObjectMetadata 也被回收
```

## 内存泄漏排查

### 常见的内存泄漏原因

1. **事件未取消订阅**：发布者持有订阅者的引用
2. **静态集合持续增长**：`static Dictionary` 不清理
3. **Pinned 对象**：阻止 GC 压缩
4. **Finalizer 阻塞**：Finalizer 中有耗时操作
5. **Timer 未释放**：Timer 持有回调的引用

### 排查工具

```bash
# dotnet-dump：生成和分析 dump 文件
dotnet-dump collect --process-id <PID>
dotnet-dump analyze dump.dmp

# 在 dump 中查看 GC 堆
> dumpheap -stat          # 按类型统计堆上对象
> dumpheap -type MyClass   # 查看特定类型的所有实例
> gcroot <address>         # 查找对象的 GC Root（谁引用了它）
> objsize <address>        # 查看对象的保留大小

# dotnet-gcdump：专门收集 GC 堆信息（比 dump 更轻量）
dotnet-gcdump collect --process-id <PID> --output gc.gcdump

# PerfView：GUI 工具，分析 GC 事件和内存分配
```

::: warning 内存泄漏排查流程
1. 用 `dotnet-dump collect` 获取 dump
2. `dumpheap -stat` 查看哪些类型占用最多内存
3. 对可疑类型执行 `dumpheap -type` 获取实例地址
4. `gcroot` 查找引用链（谁在持有这些对象）
5. 常见根：静态字段、Timer、事件委托、ThreadLocal
:::

## GC 性能数据参考

| 操作 | 典型耗时 |
| --- | --- |
| Gen0 回收 | 0.1 - 1 ms |
| Gen1 回收 | 1 - 10 ms |
| Gen2 回收（Background） | 10 - 100 ms（不阻塞应用） |
| Gen2 回收（Foreground） | 50 - 500 ms（阻塞应用） |
| LOH 碎片压缩 | 100 - 1000 ms |
| GC.Collect() 显式调用 | 不推荐，让 GC 自行管理 |

::: tip 减少 GC 压力的原则
1. 避免在热路径中分配临时对象（缓存、池化）
2. 使用 `Span<T>`、`stackalloc` 减少堆分配
3. 使用 `ArrayPool<T>` 复用大数组
4. struct 代替小型 class（但注意复制开销）
5. 避免 Finalizer（除非确实需要释放非托管资源）
6. 使用 `StringBuilder` 代替字符串拼接
:::
