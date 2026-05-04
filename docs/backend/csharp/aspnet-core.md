# ASP.NET Core

ASP.NET Core 的中间件管道基于 `RequestDelegate` 委托链实现，理解管道的构建机制、Scoped 服务的陷阱、以及 Filters 的执行时序，是编写正确 Web 服务的基础。

## 中间件管道原理

### RequestDelegate 委托链

中间件管道本质上是一个嵌套的委托链，每个中间件接收一个 `RequestDelegate`（下一个中间件），返回一个新的 `RequestDelegate`：

```
请求 → [中间件1] → [中间件2] → [中间件3] → 终结点
         │            │            │
         ▼            ▼            ▼
     await next   await next   await next
     (调用下一层)  (调用下一层)  (执行终结点)
     后置逻辑      后置逻辑      返回响应
```

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// 中间件按注册顺序执行（洋葱模型）
app.UseExceptionHandler("/error");
app.UseHsts();
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();
```

::: warning 中间件顺序错误
中间件顺序直接影响行为。常见错误：

```csharp
// ❌ 错误：认证在路由之前
app.UseAuthentication();   // 此时还没有路由信息，认证无法工作
app.UseRouting();

// ❌ 错误：授权在认证之前
app.UseAuthorization();    // 没有认证信息，授权总是失败
app.UseAuthentication();

// ✅ 正确顺序
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
```
:::

### 自定义中间件

```csharp
// 内联中间件
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next(context);  // 调用下一个中间件
    sw.Stop();
    context.Response.Headers["X-Response-Time"] = $"{sw.ElapsedMilliseconds}ms";
});

// 基于类的中间件
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public RequestLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ILogger<RequestLoggingMiddleware> logger)
    {
        logger.LogInformation("Request: {Method} {Path}",
            context.Request.Method, context.Request.Path);
        await _next(context);  // 传递给下一个中间件
        logger.LogInformation("Response: {StatusCode}", context.Response.StatusCode);
    }
}

app.UseMiddleware<RequestLoggingMiddleware>();
```

### Use vs Map vs Run

| 方法 | 行为 |
| --- | --- |
| `Use` | 执行逻辑后调用 `next` 传递给下一个中间件 |
| `Map` | 根据路径前缀分支到不同的中间件管道 |
| `Run` | 终结中间件，不调用 `next`（短路） |

```csharp
// Map：路径分支
app.Map("/api", apiApp =>
{
    apiApp.UseRateLimiter();
    apiApp.MapControllers();
});

// Run：终结管道
app.Run(async context =>
{
    await context.Response.WriteAsync("Not Found");
});
```

## Kestrel 连接处理流程

```
客户端连接
  │
  ▼
[Kestrel 监听套接字]
  │
  ▼
[IO Queue] ──→ [IO 线程处理]
  │
  ▼
[HTTP/2 多路复用] ──→ 解析请求头
  │
  ▼
[调度到 ThreadPool]
  │
  ▼
[中间件管道执行]
  │
  ▼
[生成响应] ──→ [IO Queue] ──→ 发送响应
```

## 路由与控制器

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;

    public ProductsController(IProductService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProductDto>>> GetAll()
    {
        var products = await _service.GetAllAsync();
        return Ok(products);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        var product = await _service.GetByIdAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest request)
    {
        var product = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }
}
```

## 过滤器执行顺序

过滤器在控制器方法执行前后介入，形成过滤器管道：

```
请求进入
  │
  ▼
Authorization Filter ──────────────────────────→ 短路（401/403）
  │
  ▼
Resource Filter (OnResourceExecuting) ─────────→ 短路（缓存命中）
  │
  ▼
Action Filter (OnActionExecuting)
  │
  ▼
Action Method 执行
  │
  ▼
Action Filter (OnActionExecuted)
  │
  ▼
Resource Filter (OnResourceExecuted)
  │
  ▼
Exception Filter（如果有异常）
  │
  ▼
Result Filter（OnResultExecuting → OnResultExecuted）
  │
  ▼
响应返回
```

```csharp
// Action 过滤器：记录执行时间
public class TimingFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var sw = Stopwatch.StartNew();
        var result = await next();  // 执行 Action
        sw.Stop();

        if (result.Exception == null)
        {
            context.HttpContext.Response.Headers["X-Elapsed"] = $"{sw.ElapsedMilliseconds}ms";
        }
    }
}

// 异常过滤器
public class ApiExceptionFilter : IAsyncExceptionFilter
{
    public async Task OnExceptionAsync(ExceptionContext context)
    {
        if (context.Exception is BusinessException bizEx)
        {
            context.Result = new JsonResult(new { error = bizEx.Message, code = bizEx.ErrorCode })
            {
                StatusCode = 400
            };
            context.ExceptionHandled = true;
        }
    }
}
```

## Minimal API

```csharp
var app = WebApplication.CreateBuilder(args).Build();

// 单行端点
app.MapGet("/", () => "Hello World");

// 带参数
app.MapGet("/products/{id:int}", async (int id, IProductService service) =>
{
    var product = await service.GetByIdAsync(id);
    return product is null ? Results.NotFound() : Results.Ok(product);
});

// POST 带验证
app.MapPost("/products", async (CreateProductRequest req, IProductService service) =>
{
    var product = await service.CreateAsync(req);
    return Results.Created($"/products/{product.Id}", product);
})
.AddEndpointFilter<ValidationFilter>();

// 分组
var api = app.MapGroup("/api/v1").WithTags("V1");
api.MapGet("/users", GetAllUsers);
api.MapPost("/users", CreateUser);
```

### Minimal API vs Controller 性能对比

| 特性 | Minimal API | Controller |
| --- | --- | --- |
| 启动速度 | 更快（无反射扫描） | 较慢 |
| 请求吞吐量 | 更高（直接委托） | 略低 |
| 功能丰富度 | 基础 | Filters、Model Binding、复杂路由 |
| 适用场景 | 微服务、简单 API | 复杂业务逻辑、大型项目 |

## 配置系统

### IOptions\<T\> vs IOptionsSnapshot\<T\> vs IOptionsMonitor\<T\>

| 类型 | 生命周期 | 配置热更新 | 使用场景 |
| --- | --- | --- | --- |
| `IOptions<T>` | 单例 | 不支持 | 启动时确定的配置 |
| `IOptionsSnapshot<T>` | Scoped | 支持（每请求刷新） | HTTP 请求中读取最新配置 |
| `IOptionsMonitor<T>` | 单例 | 支持（事件通知） | 需要监听配置变更的场景 |

```csharp
public class SmtpOptions
{
    public const string SectionName = "Smtp";
    public string Host { get; set; }
    public int Port { get; set; }
}

builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));

// 使用
public class EmailService
{
    private readonly SmtpOptions _options;
    public EmailService(IOptions<SmtpOptions> options)
    {
        _options = options.Value;
    }
}

// 配置验证
builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .Validate(opts => opts.Port > 0, "端口必须大于 0");
```

## Rate Limiting（.NET 7+）

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.PermitLimit = 100;           // 100 个请求
        opt.Window = TimeSpan.FromMinutes(1);  // 每分钟
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 10;
    });
});

app.UseRateLimiter();

app.MapGet("/api/data", () => "data")
   .RequireRateLimiting("fixed");
```
