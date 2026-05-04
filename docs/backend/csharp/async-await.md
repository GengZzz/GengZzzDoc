# async/await

async/await 是 C# 异步编程的核心，其底层基于编译器生成的状态机结构体。理解 SynchronizationContext、ConfigureAwait、ValueTask 的正确使用模式，以及异步死锁的成因，是写出健壮异步代码的关键。

## 状态机内部实现

### 结构体 vs 类

编译器将 `async` 方法转换为一个实现了 `IAsyncStateMachine` 的类型：

| .NET 版本 | 状态机类型 | 原因 |
| --- | --- | --- |
| .NET Framework | class（堆分配） | 需要在堆上存活以供回调 |
| .NET 6+ | struct（栈分配） | 通过 `AsyncTaskMethodBuilder` 管理生命周期，减少堆分配 |

```csharp
// 你写的代码
async Task<int> ComputeAsync()
{
    Console.WriteLine("开始");
    var a = await Step1Async();    // 状态 0 → 1
    var b = await Step2Async(a);   // 状态 1 → 2
    return a + b;
}

// 编译器生成的状态机（.NET 6+ 简化版）
struct ComputeAsyncStateMachine : IAsyncStateMachine
{
    public int _state;                        // -1: 初始, 0, 1: 等待中, -2: 完成
    public AsyncTaskMethodBuilder<int> _builder;
    private int _a, _b;
    private TaskAwaiter<int> _awaiter;

    public void MoveNext()
    {
        try
        {
            TaskAwaiter<int> awaiter;
            switch (_state)
            {
                case -1:  // 首次进入
                    Console.WriteLine("开始");
                    awaiter = Step1Async().GetAwaiter();
                    if (awaiter.IsCompleted)
                        goto case 0;  // 同步完成，直接继续
                    _state = 0;
                    _awaiter = awaiter;
                    _builder.AwaitUnsafeOnCompleted(ref awaiter, ref this);
                    return;
                case 0:  // Step1Async 完成
                    awaiter = _awaiter;
                    _a = awaiter.GetResult();
                    awaiter = Step2Async(_a).GetAwaiter();
                    if (awaiter.IsCompleted)
                        goto case 1;
                    _state = 1;
                    _awaiter = awaiter;
                    _builder.AwaitUnsafeOnCompleted(ref awaiter, ref this);
                    return;
                case 1:  // Step2Async 完成
                    awaiter = _awaiter;
                    _b = awaiter.GetResult();
                    _builder.SetResult(_a + _b);
                    return;
            }
        }
        catch (Exception ex)
        {
            _state = -2;
            _builder.SetException(ex);
        }
    }

    public void SetStateMachine(IAsyncStateMachine stateMachine) { ... }
}
```

### AsyncTaskMethodBuilder

`AsyncTaskMethodBuilder` 是状态机的核心协调者：

```
AsyncTaskMethodBuilder<T>
  │
  ├── Task 属性：返回关联的 Task 对象
  ├── AwaitUnsafeOnCompleted：注册回调（await 完成后调用 MoveNext）
  ├── SetResult：设置 Task 的结果
  ├── SetException：设置 Task 的异常
  └── SetStateMachine：管理状态机的装箱（struct → heap）
```

## SynchronizationContext

`SynchronizationContext` 决定了 `await` 之后的代码在哪个上下文中执行：

| 上下文 | 行为 |
| --- | --- |
| UI 线程（WPF/WinForms） | 回调在 UI 线程执行（通过消息循环） |
| ASP.NET（旧版） | 每个请求有自己的上下文，回调在请求上下文执行 |
| ThreadPool（默认） | `Post` 方法直接调用 `ThreadPool.QueueUserWorkItem` |

```csharp
// UI 线程示例（WPF）
async void Button_Click(object sender, EventArgs e)
{
    var result = await GetDataAsync();  // 暂停，UI 线程不阻塞
    // 这里在 UI 线程上执行（SynchronizationContext 恢复）
    label.Text = result;  // 安全访问 UI 控件
}
```

::: tip .NET Core / .NET 5+ 的 SynchronizationContext 变化
ASP.NET Core **不再设置** `SynchronizationContext`。这意味着：
- `ConfigureAwait(false)` 在 ASP.NET Core 中效果有限（本来就没有上下文需要捕获）
- 但库代码仍然应该使用 `ConfigureAwait(false)` 以兼容所有调用者
- Console 应用也没有 `SynchronizationContext`
:::

## ConfigureAwait 详解

```csharp
// ConfigureAwait(true)（默认）：捕获当前上下文，await 后在上下文中执行
await GetDataAsync();  // await 后的代码在原始上下文执行

// ConfigureAwait(false)：不捕获上下文，await 后在线程池中执行
await GetDataAsync().ConfigureAwait(false);  // await 后的代码在任意线程池线程执行
```

### ConfigureAwaitOptions（.NET 8+）

.NET 8 引入了更细粒度的配置：

```csharp
using System.Runtime.CompilerServices;

// ContinueOnCapturedContext：是否回到原始上下文（相当于 ConfigureAwait 的参数）
await GetDataAsync()
    .ConfigureAwait(ConfigureAwaitOptions.ContinueOnCapturedContext);

// SuppressThrowing：不抛出异常（Task 的异常不会被重新抛出）
await GetDataAsync()
    .ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
// 如果 Task 失败，不会抛出异常，需要手动检查 task.Status

// ForceYielding：强制让出当前线程（即使 await 的任务已完成）
await GetDataAsync()
    .ConfigureAwait(ConfigureAwaitOptions.ForceYielding);
// 保证 await 后的代码一定在新线程上执行
```

::: warning 何时使用 ConfigureAwait(false)
- **库代码**：应该用 `ConfigureAwait(false)`，因为库不知道调用者的上下文
- **应用层代码**（如 ASP.NET Controller、WPF 事件处理）：通常不需要
- **关键规则**：如果一个方法中有的 await 需要上下文，有的不需要，那么 `ConfigureAwait(false)` 之后的代码不能访问需要上下文的资源
:::

## ValueTask 与 IValueTaskSource 复用

`ValueTask<T>` 是值类型的 Task，避免在异步操作经常同步完成时的堆分配。

```csharp
// 场景：缓存命中时同步返回，缓存未命中时异步加载
private readonly Dictionary<string, byte[]> _cache = new();

public async ValueTask<byte[]> GetDataAsync(string key)
{
    if (_cache.TryGetValue(key, out var data))
    {
        return data;  // 同步返回，无堆分配
    }

    data = await LoadFromDiskAsync(key);  // 异步路径
    _cache[key] = data;
    return data;
}
```

### IValueTaskSource 复用模式

对于高频调用的异步方法，可以通过实现 `IValueTaskSource` 复用底层 Task 对象：

```csharp
public class AsyncCache<T> : IValueTaskSource<T>
{
    private ManualResetValueTaskSourceCore<T> _core;

    public ValueTask<T> GetAsync()
    {
        if (TryGetCached(out var value))
            return new ValueTask<T>(value);  // 同步完成，无分配
        return new ValueTask<T>(this, _core.Version);  // 复用 this
    }

    // IValueTaskSource 实现
    public T GetResult(short token) => _core.GetResult(token);
    public ValueTaskSourceStatus GetStatus(short token) => _core.GetStatus(token);
    public void OnCompleted(Action<object?> continuation, object? state,
        short token, ValueTaskSourceOnCompletedFlags flags)
        => _core.OnCompleted(continuation, state, token, flags);
}
```

::: warning ValueTask 使用注意事项
- `ValueTask` 只能 **await 一次**，不能多次 await 或缓存后重复 await
- 不要对 `ValueTask` 使用 `Task.WhenAll`（需要先用 `.AsTask()` 转换）
- 适合「大多数时候同步完成」的场景
- 如果异步路径是主流，应该用 `Task` 而非 `ValueTask`
:::

## 异步死锁分析

### 死锁场景

在有 `SynchronizationContext` 的环境（如旧版 ASP.NET、WPF）中，在同步方法中调用 `.Result` 或 `.GetAwaiter().GetResult()` 会导致死锁：

```
主线程：                          await 后的回调：
  │                                 │
  ├─ 调用 GetDataAsync()           ├─ 等待 SynchronizationContext.Post
  ├─ await 暂停，保存上下文         │   （需要主线程空闲）
  ├─ .Result 阻塞主线程            │
  │   （等待 Task 完成）            │
  │                                 │
  └─ 死锁：主线程等 Task，          │
     Task 等主线程上下文             │
```

```csharp
// ❌ 死锁代码（WPF 按钮点击事件）
void Button_Click(object sender, EventArgs e)
{
    // 同步等待异步方法
    var result = GetDataAsync().Result;  // 死锁！
    label.Text = result;
}

// 正确做法：全链路 async
async void Button_Click(object sender, EventArgs e)
{
    var result = await GetDataAsync();  // 不阻塞
    label.Text = result;
}
```

::: warning 同步调用异步方法的正确方式
如果必须在同步代码中调用异步方法：

```csharp
// 方式 1：仅在没有 SynchronizationContext 时安全（如 Console 应用）
var result = GetDataAsync().GetAwaiter().GetResult();

// 方式 2：使用 Task.Run 绕开上下文（有开销）
var result = Task.Run(() => GetDataAsync()).Result;

// 方式 3：.NET Core / ASP.NET Core 中没有 SynchronizationContext
// 所以 .Result 和 .GetAwaiter().GetResult() 是安全的（但仍不推荐）
```
:::

## 异步异常处理

```csharp
try
{
    // 异步方法中的异常在 await 时重新抛出
    await DownloadAsync("invalid-url");
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"下载失败: {ex.Message}");
}

// 多个异步操作的异常聚合
Task t1 = Task.Run(() => throw new Exception("错误1"));
Task t2 = Task.Run(() => throw new Exception("错误2"));

try
{
    await Task.WhenAll(t1, t2);
}
catch
{
    // await 只重新抛出第一个异常
    // 需要检查所有 Task 的 Exception 属性
    var allErrors = new[] { t1, t2 }
        .Where(t => t.IsFaulted)
        .SelectMany(t => t.Exception!.InnerExceptions);
    foreach (var ex in allErrors)
    {
        Console.WriteLine(ex.Message);
    }
}
```

::: warning async void 的异常吞噬
`async void` 方法中抛出的异常会直接传播到 `SynchronizationContext`，如果没有上下文（如 Console 应用），异常会导致进程崩溃且无法捕获。

```csharp
// ❌ 永远不要这样做
async void Dangerous()
{
    throw new Exception("无法捕获");
}

// 正确：用 async Task 代替 async void
async Task Safe()
{
    throw new Exception("可以捕获");
}
```

唯一的例外：事件处理方法必须用 `async void`。
:::

## Task 与取消令牌

```csharp
// 创建已完成/失败/取消的 Task
Task<int> completed = Task.FromResult(42);
Task<int> failed = Task.FromException<int>(new InvalidOperationException());
Task<int> cancelled = Task.FromCanceled<int>(new CancellationToken(true));

// CancellationToken：协作式取消
public async Task DownloadAsync(string url, CancellationToken ct = default)
{
    using var response = await _http.GetAsync(url, ct);
    var stream = await response.Content.ReadAsStreamAsync(ct);
    // ...
}

// 调用方
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
try
{
    await DownloadAsync(url, cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("下载已取消");
}

// 链式取消令牌
var userCts = new CancellationTokenSource();
var timeoutCts = new CancellationTokenSource(5000);
var combined = CancellationTokenSource.CreateLinkedTokenSource(
    userCts.Token, timeoutCts.Token
);
await DoWorkAsync(combined.Token);  // 任一源取消都会触发
```
