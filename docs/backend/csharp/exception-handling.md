# 异常处理

C# 的异常处理机制虽然简单易用，但理解异常的性能开销、异常过滤器 `when` 的精确执行时机、以及 `ExceptionDispatchInfo` 的堆栈保留，是编写健壮代码的基础。

## 异常层次结构

```
System.Object
  └── System.Exception
        ├── System.SystemException（CLR 异常）
        │     ├── System.ArgumentException
        │     │     ├── System.ArgumentNullException
        │     │     └── System.ArgumentOutOfRangeException
        │     ├── System.InvalidOperationException
        │     ├── System.NotSupportedException
        │     ├── System.NullReferenceException
        │     ├── System.IndexOutOfRangeException
        │     ├── System.OutOfMemoryException
        │     ├── System.StackOverflowException
        │     └── System.FormatException
        └── System.ApplicationException（不推荐继承此类）
```

::: tip 自定义异常设计
自定义异常直接继承 `Exception`，不需要继承 `ApplicationException`（.NET 设计团队已承认 `ApplicationException` 是个设计失误）。
:::

## 异常的性能开销

| 操作 | 典型耗时 |
| --- | --- |
| 正常方法返回 | ~1 ns |
| 首次抛出异常 | 10,000 - 50,000 ns（10-50 μs） |
| 重新抛出（throw;） | 5,000 - 10,000 ns |
| 异常过滤器（when） | ~1,000 ns（不抛出时） |

异常的开销主要来自：
1. 收集堆栈跟踪信息（需要遍历调用栈）
2. 创建异常对象
3. 展开调用栈（Stack Unwinding）

::: warning 不要用异常做控制流
```csharp
// ❌ 用异常做控制流：慢 10000 倍
try
{
    int result = int.Parse(input);
}
catch (FormatException)
{
    // 处理无效输入
}

// ✅ 使用 TryParse：无异常开销
if (int.TryParse(input, out int result))
{
    // 有效输入
}
else
{
    // 处理无效输入
}
```
:::

## 异常过滤器 when

异常过滤器（`when` 关键字，C# 6+）在 **catch 块选择之前**执行。如果过滤器返回 false，继续寻找下一个匹配的 catch，**不会执行 finally 块**。

### when 的精确执行时机

```
方法抛出异常
  │
  ▼
[查找匹配的 catch 块]
  │
  ├── 找到带 when 的 catch
  │     │
  │     ▼
  │   [执行 when 过滤器表达式]
  │     │
  │     ├── 返回 true → 执行 catch 块
  │     │                 （此时才展开堆栈，执行 finally）
  │     │
  │     └── 返回 false → 继续查找下一个 catch
  │                       （不展开堆栈，不执行 finally）
  │
  └── 没有匹配的 catch → 异常向上传播
```

```csharp
try
{
    await httpClient.GetAsync(url);
}
catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    // 只处理 404
    Console.WriteLine("资源不存在");
}
catch (HttpRequestException ex) when (ex.StatusCode >= HttpStatusCode.InternalServerError)
{
    // 只处理 5xx
    Console.WriteLine("服务器错误");
}
// 其他 HttpRequestException 继续向上传播
```

### when 的实际应用：日志但不处理

```csharp
// when 可以记录异常但不捕获（堆栈不被破坏）
try
{
    DangerousOperation();
}
catch (Exception ex) when (LogAndReturnFalse(ex))
{
    // 这个 catch 永远不会执行
    // 因为 LogAndReturnFalse 总是返回 false
}

static bool LogAndReturnFalse(Exception ex)
{
    Logger.LogError(ex, "操作失败");
    return false;  // 不捕获，异常继续传播
}
// 调试器仍停留在 DangerousOperation 抛出异常的那一行
// 堆栈跟踪完整保留
```

## AggregateException 解包

`Task.WhenAll` 和 `Parallel` 等并行操作会将多个异常包装为 `AggregateException`：

```csharp
Task t1 = Task.Run(() => throw new Exception("错误1"));
Task t2 = Task.Run(() => throw new Exception("错误2"));

try
{
    await Task.WhenAll(t1, t2);
}
catch (Exception)
{
    // await 自动解包 AggregateException，只抛出第一个异常
    // 但其他异常仍然存在于 Task 的 Exception 属性中

    var allExceptions = new[] { t1, t2 }
        .Where(t => t.IsFaulted)
        .SelectMany(t => t.Exception!.InnerExceptions);

    foreach (var ex in allExceptions)
    {
        Console.WriteLine(ex.Message);
    }
}

// 如果不用 await，会得到 AggregateException
try
{
    Task.WhenAll(t1, t2).Wait();
}
catch (AggregateException ae)
{
    foreach (var ex in ae.InnerExceptions)
    {
        Console.WriteLine(ex.Message);
    }
}
```

## ExceptionDispatchInfo 保留堆栈

`ExceptionDispatchInfo` 可以捕获异常并在稍后重新抛出，同时保留原始堆栈跟踪：

```csharp
// 场景：在后台线程捕获异常，在主线程重新抛出
ExceptionDispatchInfo? capturedException = null;

var thread = new Thread(() =>
{
    try
    {
        throw new InvalidOperationException("后台错误");
    }
    catch (Exception ex)
    {
        capturedException = ExceptionDispatchInfo.Capture(ex);
    }
});

thread.Start();
thread.Join();

// 在主线程重新抛出，保留后台线程的堆栈
capturedException?.Throw();
// 堆栈跟踪显示原始抛出位置，不是 Throw() 的位置
```

::: tip throw; vs ExceptionDispatchInfo
- `throw;`：在同一个调用栈中重新抛出，保留原始堆栈
- `ExceptionDispatchInfo.Throw()`：跨线程/跨上下文保留堆栈
- `throw ex;`：**重置堆栈**，丢失原始抛出位置（几乎总是错误的做法）
:::

## 自定义异常设计原则

```csharp
[Serializable]
public class BusinessException : Exception
{
    public int ErrorCode { get; }

    public BusinessException(int code, string message)
        : base(message)
    {
        ErrorCode = code;
    }

    public BusinessException(int code, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = code;
    }

    // 支持序列化
    protected BusinessException(SerializationInfo info, StreamingContext context)
        : base(info, context)
    {
        ErrorCode = info.GetInt32(nameof(ErrorCode));
    }
}

// 业务异常层次结构
[Serializable]
public class NotFoundException : BusinessException
{
    public NotFoundException(string entityName, object id)
        : base(404, $"{entityName} [{id}] 不存在") { }
}

[Serializable]
public class ValidationException : BusinessException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base(400, "验证失败")
    {
        Errors = errors;
    }
}
```

::: warning 异常设计原则
- 异常类名以 `Exception` 结尾
- 提供无参构造、带 message 构造、带 message+inner 构造
- 标记 `[Serializable]` 并提供序列化构造函数
- 不要捕获所有异常 `catch (Exception)` 后不做任何处理
- 不要用异常做控制流
- 捕获尽可能具体的异常类型
:::

## 全局异常处理

```csharp
// ASP.NET Core 全局异常处理中间件
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var feature = context.Features.Get<IExceptionHandlerFeature>();
        if (feature != null)
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(feature.Error, "未处理的异常");

            await context.Response.WriteAsJsonAsync(new
            {
                error = "服务器内部错误",
                traceId = Activity.Current?.Id ?? context.TraceIdentifier
            });
        }
    });
});
```
