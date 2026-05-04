# 依赖注入

## IoC 容器原理

控制反转（IoC）将对象的创建和依赖关系管理从代码转移到容器。依赖注入（DI）是实现 IoC 的一种方式。

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

## 服务生命周期

ASP.NET Core 的内置 DI 容器支持三种生命周期：

### Transient（瞬时）

每次请求（注入）都创建新实例。

```csharp
builder.Services.AddTransient<IEmailService, EmailService>();

// 每次注入都 new 一个 EmailService
// 适合：无状态、轻量级服务
```

### Scoped（作用域）

每个作用域（ASP.NET Core 中默认每个 HTTP 请求）内共享同一实例。

```csharp
builder.Services.AddScoped<AppDbContext>();

// 同一个 HTTP 请求中，所有注入 AppDbContext 的地方共享同一实例
// 适合：DbContext、工作单元、请求级别的缓存
```

### Singleton（单例）

整个应用程序生命周期内共享同一实例。

```csharp
builder.Services.AddSingleton<ICacheService, RedisCacheService>();

// 程序启动时创建（或首次请求时惰性创建），直到程序关闭
// 适合：配置、缓存、日志、连接池
```

::: warning 生命周期陷阱
不要在短生命周期服务中注入长生命周期服务（会导致短生命周期对象被长生命周期对象持有，无法释放）：

```csharp
// 错误：Scoped 注入到 Singleton
public class BadSingleton
{
    private readonly AppDbContext _db;  // Scoped
    public BadSingleton(AppDbContext db) => _db = db;
    // _db 在第一次使用后就被缓存了，后续请求的 DbContext 也用这个旧实例
}

// 解决方案：注入 IServiceScopeFactory，手动创建作用域
public class GoodSingleton
{
    private readonly IServiceScopeFactory _scopeFactory;

    public GoodSingleton(IServiceScopeFactory _scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task DoWorkAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // db 是新创建的 Scoped 实例
    }
}
```
:::

## 注册方式

```csharp
// 接口 → 实现（推荐）
builder.Services.AddScoped<IUserService, UserService>();

// 直接注册类型
builder.Services.AddScoped<UserService>();

// 工厂模式
builder.Services.AddScoped<IConnection>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new Connection(config["ConnectionString"]);
});

// 泛型注册
builder.Services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

// 多个实现注册
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<IEmailSender, SendGridEmailSender>();  // 最后一个注册的生效

// 解决注入所有实现
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<IEmailSender, SendGridEmailSender>();
builder.Services.AddSingleton<IEmailSender, LocalEmailSender>();

public class NotificationService
{
    public NotificationService(IEnumerable<IEmailSender> senders)
    {
        // senders 包含所有注册的 IEmailSender 实现
    }
}
```

## Options 模式

将配置绑定到强类型对象，替代直接读取 `IConfiguration`。

```csharp
// 定义配置类
public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; }
    public int Port { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
}

// 注册
builder.Services.Configure<SmtpOptions>(
    builder.Configuration.GetSection(SmtpOptions.SectionName));

// 使用
public class EmailService
{
    private readonly SmtpOptions _options;

    // IOptions<T>：单例，读取配置时的快照
    // IOptionsSnapshot<T>：Scoped，每次请求重新绑定
    // IOptionsMonitor<T>：单例，支持配置变更通知
    public EmailService(IOptions<SmtpOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(string to, string subject, string body)
    {
        using var client = new SmtpClient(_options.Host, _options.Port);
        await client.SendMailAsync(/* ... */);
    }
}

// 配置验证
builder.Services.AddOptions<SmtpOptions>()
    .Bind(builder.Configuration.GetSection("Smtp"))
    .ValidateDataAnnotations()
    .Validate(opts => opts.Port > 0, "端口必须大于 0")
    .PostConfigure(opts => opts.Host ??= "localhost");
```

## Scrutor 自动注册

手动逐个注册接口到实现类繁琐且容易遗漏。Scrutor 通过约定自动扫描注册。

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

## 单元测试中的 Mock

DI 使单元测试可以轻松替换依赖。

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
