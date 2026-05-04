# ASP.NET Core

ASP.NET Core 是跨平台的 Web 框架，基于中间件管道处理 HTTP 请求。

## 中间件管道

请求经过一系列中间件，每个中间件可以选择传递给下一个或短路返回。

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// 中间件按注册顺序执行
app.UseExceptionHandler("/error");       // 异常处理
app.UseHsts();                           // HSTS 头
app.UseHttpsRedirection();               // HTTPS 重定向
app.UseStaticFiles();                    // 静态文件
app.UseRouting();                        // 路由匹配
app.UseAuthentication();                 // 认证
app.UseAuthorization();                  // 授权
app.UseRateLimiter();                    // 限流
app.MapControllers();                    // 控制器终结点

app.Run();
```

### 自定义中间件

```csharp
// 内联中间件
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next(context);
    sw.Stop();
    context.Response.Headers["X-Response-Time"] = $"{sw.ElapsedMilliseconds}ms";
});

// 基于类的中间件
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        _logger.LogInformation("Request: {Method} {Path}",
            context.Request.Method, context.Request.Path);
        await _next(context);
        _logger.LogInformation("Response: {StatusCode}", context.Response.StatusCode);
    }
}

app.UseMiddleware<RequestLoggingMiddleware>();
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

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductRequest request)
    {
        await _service.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
```

### 模型绑定与验证

```csharp
public class CreateProductRequest
{
    [Required, StringLength(100)]
    public string Name { get; set; }

    [Range(0.01, 99999.99)]
    public decimal Price { get; set; }

    [Required]
    public string Category { get; set; }
}

// FluentValidation（推荐）
public class CreateProductValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThan(0).LessThan(100000);
        RuleFor(x => x.Category).NotEmpty().Must(BeValidCategory)
            .WithMessage("无效的分类");
    }

    private bool BeValidCategory(string category) =>
        new[] { "Electronics", "Books", "Clothing" }.Contains(category);
}
```

## 过滤器

过滤器在控制器方法执行前后介入，形成过滤器管道。

```
请求 → Authorization Filter → Resource Filter → Action Filter → Action Method
响应 ← Authorization Filter ← Resource Filter ← Action Filter ← Action Method
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

// 注册
builder.Services.AddScoped<TimingFilter>();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<TimingFilter>();
});
```

## Minimal API

适合微服务和小型 API，无需控制器。

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

// 终结点过滤器
app.MapPost("/upload", async (IFormFile file) =>
{
    await UploadAsync(file);
    return Results.Ok();
})
.AddEndpointFilter(async (context, next) =>
{
    var file = context.HttpContext.Request.Form.Files.FirstOrDefault();
    if (file == null || file.Length == 0)
        return Results.BadRequest("No file");
    return await next(context);
});
```

## Razor Pages

适合页面驱动的应用，每个页面对应一个 `.cshtml` + `.cshtml.cs` 文件。

```csharp
// Pages/Products/Index.cshtml.cs
public class IndexModel : PageModel
{
    private readonly AppDbContext _db;

    public IndexModel(AppDbContext db) => _db = db;

    public List<Product> Products { get; set; }

    [BindProperty(SupportsGet = true)]
    public string SearchTerm { get; set; }

    public async Task OnGetAsync()
    {
        var query = _db.Products.AsQueryable();
        if (!string.IsNullOrEmpty(SearchTerm))
            query = query.Where(p => p.Name.Contains(SearchTerm));
        Products = await query.ToListAsync();
    }
}
```

## SignalR 实时通信

```csharp
// Hub 类
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }

    public async Task JoinRoom(string room)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, room);
    }

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
}

// 注册
builder.Services.AddSignalR();
app.MapHub<ChatHub>("/chat");

// 客户端（JavaScript）
// const connection = new signalR.HubConnectionBuilder()
//     .withUrl("/chat").build();
// connection.on("ReceiveMessage", (user, msg) => { /* ... */ });
// connection.start();
```
