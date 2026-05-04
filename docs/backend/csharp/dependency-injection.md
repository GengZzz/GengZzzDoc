# 依赖注入

ASP.NET Core 内置的 DI 容器是轻量级的 IoC 容器，理解其服务解析流程、Scoped 陷阱（Captive Dependency）、以及 .NET 8 的 Keyed Services，是避免运行时错误的关键。

## IoC 容器原理

控制反转（IoC）将对象的创建和依赖关系管理从代码转移到容器：

```
传统方式：                        DI 方式：
class OrderService                class OrderService
{
    private ILogger _logger;      {
    public OrderService()             private readonly ILogger _logger;
    {                                 public OrderService(ILogger logger)
        _logger = new FileLogger();   {
    }                                     _logger = logger;
}                                     }
                                  }
                                  // 容器自动创建 ILogger 实例并注入
```

## 服务解析原理

### IServiceProvider 解析流程

```
serviceProvider.GetService<IUserService>()
  │
  ▼
[查找 ServiceDescriptor]
  │ (注册了 IUserService → UserService)
  ▼
[检查生命周期]
  │
  ├── Singleton：从根容器的缓存中获取（或首次创建）
  ├── Scoped：从当前 Scope 的缓存中获取（或首次创建）
  └── Transient：每次创建新实例
  │
  ▼
[递归解析构造函数参数]
  │ (UserService 构造函数需要 IRepository<Order>)
  ▼
[递归解析所有依赖，直到创建完整对象图]
  │
  ▼
[返回实例]
```

### IServiceScopeFactory

用于在非 DI 管理的代码中创建作用域：

```csharp
// 在 BackgroundService 中使用
public class OrderProcessingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public OrderProcessingService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var orders = await db.Orders.Where(o => o.Status == "Pending").ToListAsync();
            // 处理订单...
        }
    }
}
```

## 三种生命周期的行为差异

| 生命周期 | 创建时机 | 缓存位置 | 释放时机 | 适用场景 |
| --- | --- | --- | --- | --- |
| Transient | 每次注入 | 不缓存 | 作用域结束时 | 无状态、轻量级 |
| Scoped | 每个作用域首次 | Scope 缓存 | 作用域结束时 | DbContext、工作单元 |
| Singleton | 首次注入 | 根容器缓存 | 应用关闭时 | 配置、缓存、连接池 |

```csharp
// Transient：每次注入都 new 一个
builder.Services.AddTransient<IEmailService, EmailService>();

// Scoped：同一个 HTTP 请求内共享同一实例
builder.Services.AddScoped<AppDbContext>();

// Singleton：整个应用生命周期内共享同一实例
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
```

### Captive Dependency 陷阱（Scoped 被 Singleton 持有）

这是 DI 中最常见的陷阱——短生命周期服务被长生命周期服务持有：

```csharp
// ❌ 错误：Scoped 的 DbContext 被 Singleton 捕获
public class OrderCache : Singleton  // 注册为 Singleton
{
    private readonly AppDbContext _db;  // Scoped！

    public OrderCache(AppDbContext db)
    {
        _db = db;  // 第一次注入时的 DbContext 被永久持有
    }

    public List<Order> GetOrders()
    {
        return _db.Orders.ToList();  // 使用的是过期的 DbContext！
    }
}

// 容器在启动时不会报错！但运行时会出问题：
// 1. _db 在第一次使用后就被缓存了
// 2. 后续请求的 DbContext 永远是同一个旧实例
// 3. Change Tracker 缓存了旧数据，导致数据不一致
// 4. 旧的 DbContext 最终可能导致连接池耗尽
```

**解决方案**：注入 `IServiceScopeFactory`，手动创建作用域：

```csharp
// ✅ 正确：用 IServiceScopeFactory 创建新 Scope
public class OrderCache
{
    private readonly IServiceScopeFactory _scopeFactory;

    public OrderCache(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task<List<Order>> GetOrdersAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Orders.ToListAsync();
    }
}
```

::: warning 检测 Captive Dependency
.NET 8 可以通过 `ValidateScopes` 启用验证：

```csharp
builder.Host.UseDefaultServiceProvider(options =>
{
    options.ValidateScopes = true;      // 开发环境启用
    options.ValidateOnBuild = true;     // 构建时验证（.NET 8+）
});
```

启用后，如果 Singleton 持有 Scoped 服务，会在启动时抛出异常。
:::

## 工厂模式注册

```csharp
// 工厂注册：动态创建实例
builder.Services.AddScoped<IConnection>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new Connection(config["ConnectionString"]);
});

// Func<T> 工厂：延迟解析
builder.Services.AddTransient<Func<IEmailSender>>(sp =>
    () => sp.GetRequiredService<IEmailSender>());

// 使用
public class OrderService
{
    private readonly Func<IEmailSender> _emailSenderFactory;

    public OrderService(Func<IEmailSender> emailSenderFactory)
    {
        _emailSenderFactory = emailSenderFactory;
    }

    public async Task CreateOrderAsync(Order order)
    {
        // 需要时才创建实例
        var sender = _emailSenderFactory();
        await sender.SendAsync(/* ... */);
    }
}
```

## Keyed Services（.NET 8+）

.NET 8 引入了 Keyed Services，可以按 key 注册和解析多个实现：

```csharp
// 注册 Keyed Services
builder.Services.AddKeyedSingleton<INotification, EmailNotification>("email");
builder.Services.AddKeyedSingleton<INotification, SmsNotification>("sms");
builder.Services.AddKeyedSingleton<INotification, PushNotification>("push");

// 解析
public class NotificationService
{
    public NotificationService(
        [FromKeyedServices("email")] INotification emailNotifier,
        [FromKeyedServices("sms")] INotification smsNotifier)
    {
        // 分别注入不同的实现
    }
}

// 在 Minimal API 中使用
app.MapPost("/notify", ([FromKeyedServices("email")] INotification notifier, string msg)
    => notifier.SendAsync(msg));
```

## 装饰器模式

```csharp
// 注册装饰器
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.Decorate<IOrderService, OrderServiceLoggingDecorator>();

// 装饰器实现
public class OrderServiceLoggingDecorator : IOrderService
{
    private readonly IOrderService _inner;
    private readonly ILogger<OrderServiceLoggingDecorator> _logger;

    public OrderServiceLoggingDecorator(IOrderService inner, ILogger<OrderServiceLoggingDecorator> logger)
    {
        _inner = inner;
        _logger = logger;
    }

    public async Task<Order> CreateOrderAsync(CreateOrderRequest request)
    {
        _logger.LogInformation("Creating order...");
        var order = await _inner.CreateOrderAsync(request);
        _logger.LogInformation("Order {OrderId} created", order.Id);
        return order;
    }
}
```

## Scrutor 自动注册

手动逐个注册接口繁琐且容易遗漏。Scrutor 通过约定自动扫描注册：

```bash
dotnet add package Scrutor
```

```csharp
builder.Services.Scan(scan => scan
    .FromAssemblyOf<IUserService>()
    .AddClasses(classes => classes.AssignableTo<ITransientService>())
        .AsImplementedInterfaces()
        .WithTransientLifetime()
    .AddClasses(classes => classes.AssignableTo<IScopedService>())
        .AsImplementedInterfaces()
        .WithScopedLifetime()
    .AddClasses(classes => classes.AssignableTo<ISingletonService>())
        .AsImplementedInterfaces()
        .WithSingletonLifetime()
);
```

## 多实现注册

```csharp
// 注册多个实现
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<IEmailSender, SendGridEmailSender>();
builder.Services.AddSingleton<IEmailSender, LocalEmailSender>();

// 注入所有实现
public class NotificationService
{
    private readonly IEnumerable<IEmailSender> _senders;

    public NotificationService(IEnumerable<IEmailSender> senders)
    {
        _senders = senders;  // 包含所有注册的 IEmailSender
    }
}
```

## Options 模式

```csharp
public class SmtpOptions
{
    public const string SectionName = "Smtp";
    public string Host { get; set; }
    public int Port { get; set; }
}

builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection(SmtpOptions.SectionName));

// 配置验证
builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .Validate(opts => opts.Port > 0, "端口必须大于 0")
    .PostConfigure(opts => opts.Host ??= "localhost");
```

## 单元测试中的 Mock

```csharp
using Moq;

public class OrderServiceTests
{
    [Fact]
    public async Task CreateOrder_ShouldSendEmail()
    {
        // Arrange
        var mockEmail = new Mock<IEmailSender>();
        var mockRepo = new Mock<IOrderRepository>();
        var service = new OrderService(mockRepo.Object, mockEmail.Object);

        // Act
        await service.CreateOrderAsync(new CreateOrderRequest { /* ... */ });

        // Assert
        mockEmail.Verify(
            x => x.SendAsync(It.IsAny<string>(), "订单确认", It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task GetOrder_WhenNotFound_ShouldThrow()
    {
        var mockRepo = new Mock<IOrderRepository>();
        mockRepo.Setup(x => x.GetByIdAsync(999)).ReturnsAsync((Order)null);

        var service = new OrderService(mockRepo.Object, Mock.Of<IEmailSender>());

        await Assert.ThrowsAsync<NotFoundException>(
            () => service.GetOrderAsync(999));
    }
}
```
