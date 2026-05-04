# async/await

## 异步编程演进

C# 异步编程经历了三个模型：

| 模型 | 版本 | 模式 | 状态 |
| --- | --- | --- | --- |
| APM（Asynchronous Programming Model） | .NET 1.0 | `BeginXxx` / `EndXxx` + `IAsyncResult` | 已过时 |
| EAP（Event-based Asynchronous Pattern） | .NET 2.0 | `XxxAsync` + `XxxCompleted` 事件 | 已过时 |
| TAP（Task-based Asynchronous Pattern） | .NET 4.0+ | `async` / `await` + `Task` | **当前标准** |

## async/await 基本用法

```csharp
public class NewsService
{
    private readonly HttpClient _httpClient;

    public NewsService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    // async 方法返回 Task 或 Task<T>
    public async Task<List<Article>> GetArticlesAsync()
    {
        // await 暂停当前方法，释放调用线程
        var response = await _httpClient.GetAsync("https://api.example.com/articles");

        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();

        var articles = JsonSerializer.Deserialize<List<Article>>(json);

        return articles;
    }

    // 无返回值的异步方法
    public async Task LogAsync(string message)
    {
        await File.AppendAllTextAsync("log.txt", $"{DateTime.Now}: {message}\n");
    }
}
```

### 状态机原理

编译器将 `async` 方法转换为一个实现了 `IAsyncStateMachine` 的状态机类。每个 `await` 是一个状态转移点。

```csharp
// 你写的代码
async Task<int> ComputeAsync()
{
    Console.WriteLine("开始");
    var a = await Step1Async();    // 状态 0 → 1
    var b = await Step2Async(a);   // 状态 1 → 2
    return a + b;
}

// 编译器生成的状态机（简化示意）
class ComputeAsyncStateMachine : IAsyncStateMachine
{
    public int state;           // -1: 初始, 0, 1, 2: 完成
    public AsyncTaskMethodBuilder<int> builder;
    public int a, b;

    public void MoveNext()
    {
        switch (state)
        {
            case -1:
                Console.WriteLine("开始");
                // 启动 Step1Async
                state = 0;
                var awaiter1 = Step1Async().GetAwaiter();
                if (awaiter1.IsCompleted)
                    goto case 0;
                awaiter1.OnCompleted(MoveNext);  // 完成后回调
                return;
            case 0:
                a = awaiter1.GetResult();
                state = 1;
                var awaiter2 = Step2Async(a).GetAwaiter();
                if (awaiter2.IsCompleted)
                    goto case 1;
                awaiter2.OnCompleted(MoveNext);
                return;
            case 1:
                b = awaiter2.GetResult();
                builder.SetResult(a + b);  // 返回结果
                return;
        }
    }
}
```

## Task 与 Task\<T\>

```csharp
// 创建已完成的 Task
Task<int> completed = Task.FromResult(42);

// 创建失败的 Task
Task<int> failed = Task.FromException<int>(new InvalidOperationException("错误"));

// 创建已取消的 Task
Task<int> cancelled = Task.FromCanceled<int>(new CancellationToken(true));

// Task.Run：在线程池上执行 CPU 密集型工作
Task<int> cpuWork = Task.Run(() =>
{
    int sum = 0;
    for (int i = 0; i < 1000000; i++) sum += i;
    return sum;
});
```

### ConfigureAwait

默认情况下，`await` 之后的代码会在原始上下文（如 UI 线程或 ASP.NET 请求上下文）中执行。`ConfigureAwait(false)` 告诉运行时不需要恢复上下文。

```csharp
// 库代码：不需要回到原始上下文
public async Task<Data> LoadDataAsync()
{
    var response = await _http.GetAsync(url).ConfigureAwait(false);

    // 这里可能在线程池线程上执行，而不是原始上下文
    var json = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

    return JsonSerializer.Deserialize<Data>(json);
}
```

::: tip 何时使用 ConfigureAwait(false)
- **库代码**：应该用 `ConfigureAwait(false)`，因为库不知道调用者的上下文
- **应用层代码**（如 ASP.NET Controller、WPF 事件处理）：通常不需要，因为后续代码需要访问上下文
- **.NET Core / .NET 5+ 的 ASP.NET**：没有 `SynchronizationContext`，`ConfigureAwait(false)` 效果有限，但仍推荐在库中使用
:::

## 异常处理

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
catch (Exception)
{
    // WhenAll 包装所有异常为 AggregateException
    // 但 await 只重新抛出第一个异常
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

## ValueTask

`ValueTask<T>` 是值类型的 Task，避免在异步操作经常同步完成时的堆分配。

```csharp
// 场景：缓存命中时同步返回，缓存未命中时异步加载
private readonly Dictionary<string, byte[]> _cache = new();

public async ValueTask<byte[]> GetDataAsync(string key)
{
    if (_cache.TryGetValue(key, out var data))
    {
        return data;  // 同步返回，无堆分配（ValueTask 不分配对象）
    }

    data = await LoadFromDiskAsync(key);  // 异步路径
    _cache[key] = data;
    return data;
}
```

::: warning ValueTask 使用注意事项
- `ValueTask` 只能 await 一次，不能多次 await 或缓存后重复 await
- 不要对 `ValueTask` 使用 `Task.WhenAll`（需要先用 `.AsTask()` 转换）
- 适合「大多数时候同步完成」的场景（如缓存命中、预热数据）
:::

## 取消令牌（CancellationToken）

```csharp
public async Task DownloadFileAsync(
    string url,
    string savePath,
    CancellationToken cancellationToken = default)
{
    using var response = await _httpClient.GetAsync(url, cancellationToken);

    using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
    using var fileStream = File.Create(savePath);

    // 带进度报告和取消的复制
    var buffer = new byte[8192];
    long totalRead = 0;
    int bytesRead;

    while ((bytesRead = await stream.ReadAsync(buffer, cancellationToken)) > 0)
    {
        await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
        totalRead += bytesRead;
    }
}

// 调用方
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));  // 30 秒超时
try
{
    await DownloadFileAsync(url, path, cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("下载已取消");
}
```

### 链式取消令牌

```csharp
// 组合多个取消源
var userCts = new CancellationTokenSource();           // 用户手动取消
var timeoutCts = new CancellationTokenSource(5000);     // 5 秒超时
var combined = CancellationTokenSource.CreateLinkedTokenSource(
    userCts.Token,
    timeoutCts.Token
);

await DoWorkAsync(combined.Token);  // 任一源取消都会触发
```
