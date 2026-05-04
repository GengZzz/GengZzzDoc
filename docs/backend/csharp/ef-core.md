# Entity Framework Core

EF Core 是 .NET 的 ORM 框架，其 Change Tracker 的状态管理、查询编译缓存、并发控制机制是理解 EF Core 行为的关键。

## DbContext 生命周期

DbContext 代表一个工作单元，内部维护 Change Tracker 追踪实体状态变化。

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // 全局查询过滤器（软删除）
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
    }
}

// 注册（ASP.NET Core 中）
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
           .EnableSensitiveDataLogging()  // 开发环境
           .EnableDetailedErrors());
```

::: tip DbContext 生命周期
ASP.NET Core 默认注册为 **Scoped**（每个 HTTP 请求一个实例）。不要在不同作用域之间共享 DbContext 实例——它内部的 Change Tracker 不是线程安全的。
:::

## Change Tracker 状态管理

Change Tracker 追踪每个实体的状态，`SaveChanges` 时据此生成 SQL：

```
实体状态转换图：

Detached ──→ Added ──→ Unchanged ──→ Modified ──→ Unchanged
              │                        │
              │                        ▼
              │                    Deleted
              │                        │
              └────────────────────────┘
                  (SaveChanges 后)
```

| 状态 | 含义 | SaveChanges 动作 |
| --- | --- | --- |
| Detached | 未被跟踪 | 无 |
| Unchanged | 未修改 | 无 |
| Added | 新增 | INSERT |
| Modified | 已修改（只更新改变的列） | UPDATE |
| Deleted | 已删除 | DELETE |

```csharp
var user = new User { Name = "Alice" };
db.Entry(user).State;  // Detached

db.Users.Add(user);
db.Entry(user).State;  // Added

await db.SaveChangesAsync();  // INSERT INTO Users...

user.Name = "Bob";
db.Entry(user).State;  // Modified
db.Entry(user).Property(u => u.Name).IsModified;  // true

await db.SaveChangesAsync();  // UPDATE Users SET Name = 'Bob' WHERE Id = ...

db.Users.Remove(user);
db.Entry(user).State;  // Deleted

await db.SaveChangesAsync();  // DELETE FROM Users WHERE Id = ...
```

### DetectChanges 调用时机

EF Core 在以下时机自动调用 `DetectChanges`：

- `SaveChanges` / `SaveChangesAsync` 调用前
- `ToList`、`First`、`Count` 等查询执行前
- `ChangeTracker.Entries()` 调用时
- 显式调用 `ChangeTracker.DetectChanges()` 时

```csharp
// 高性能场景：批量操作时关闭自动 DetectChanges
db.ChangeTracker.AutoDetectChangesEnabled = false;
try
{
    for (int i = 0; i < 10000; i++)
    {
        db.Users.Add(new User { Name = $"User{i}" });
    }
    db.ChangeTracker.DetectChanges();  // 手动检测一次
    await db.SaveChangesAsync();
}
finally
{
    db.ChangeTracker.AutoDetectChangesEnabled = true;
}
```

## 查询编译与缓存

EF Core 对 LINQ 查询有三层处理：

```
LINQ 查询
  │
  ▼
[查询编译] ──→ 表达式树 → SQL 生成
  │
  ▼
[查询缓存] ──→ 编译后的 SQL 缓存（按查询结构匹配）
  │
  ▼
[参数化执行] ──→ 替换参数 → 执行 SQL
```

### CompileQuery 预编译

对于高频查询，可以手动预编译避免重复编译开销：

```csharp
// 预编译查询
private static readonly Func<AppDbContext, int, Task<User?>> GetUserById =
    EF.CompileAsyncQuery((AppDbContext db, int id) =>
        db.Users.FirstOrDefault(u => u.Id == id));

// 使用（跳过编译步骤，直接执行）
var user = await GetUserById(db, 42);
```

## 并发控制

### 乐观并发（RowVersion）

```csharp
// 实体定义
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }

    // 并发令牌（自动生成，每次更新变化）
    [Timestamp]
    public byte[] RowVersion { get; set; }
}

// Fluent API 配置
modelBuilder.Entity<Product>()
    .Property(p => p.RowVersion)
    .IsRowVersion();

// 处理并发冲突
public async Task UpdateProductPrice(int id, decimal newPrice)
{
    var maxRetries = 3;
    for (int i = 0; i < maxRetries; i++)
    {
        var product = await db.Products.FindAsync(id);
        product.Price = newPrice;

        try
        {
            await db.SaveChangesAsync();
            return;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            // 获取数据库中的当前值
            var entry = ex.Entries.Single();
            var dbValues = await entry.GetDatabaseValuesAsync();

            if (dbValues == null)
            {
                // 实体已被删除
                throw new InvalidOperationException("产品已被删除");
            }

            // 刷新实体，重试
            entry.OriginalValues.SetValues(dbValues);
        }
    }
    throw new InvalidOperationException("并发冲突次数过多");
}
```

### 并发令牌（单个属性）

```csharp
// 用单个属性作为并发令牌（而非整行版本）
modelBuilder.Entity<Product>()
    .Property(p => p.LastModified)
    .IsConcurrencyToken();

// UPDATE 时：WHERE Id = @id AND LastModified = @originalLastModified
// 如果影响 0 行，抛出 DbUpdateConcurrencyException
```

## Shadow Property

Shadow Property 不在实体类中定义，但存在于数据库中：

```csharp
// 配置 Shadow Property
modelBuilder.Entity<Order>()
    .Property<DateTime>("CreatedAt");  // Shadow Property

modelBuilder.Entity<Order>()
    .Property<DateTime?>("UpdatedAt");

// 使用
var order = new Order { Total = 100 };
db.Entry(order).Property("CreatedAt").CurrentValue = DateTime.UtcNow;
await db.SaveChangesAsync();

// 查询
var recentOrders = await db.Orders
    .Where(o => EF.Property<DateTime>(o, "CreatedAt") > DateTime.UtcNow.AddDays(-7))
    .ToListAsync();
```

## Owned Entity

Owned Entity 是值对象，没有独立的标识，总是作为另一个实体的一部分：

```csharp
public class Order
{
    public int Id { get; set; }
    public decimal Total { get; set; }
    public Address ShippingAddress { get; set; }  // Owned Entity
}

public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
}

// 配置
modelBuilder.Entity<Order>().OwnsOne(o => o.ShippingAddress);
// 生成的表：Orders 表中包含 ShippingAddress_Street, ShippingAddress_City, ShippingAddress_ZipCode 列
```

## Value Conversion

```csharp
// 将枚举存储为字符串
modelBuilder.Entity<Order>()
    .Property(o => o.Status)
    .HasConversion<string>();

// 自定义转换
modelBuilder.Entity<User>()
    .Property(u => u.Tags)
    .HasConversion(
        v => string.Join(",", v),           // C# → 数据库
        v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()  // 数据库 → C#
    );
```

## 拦截器

### SaveChangesInterceptor

```csharp
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return base.SavingChangesAsync(eventData, result, cancellationToken);

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = DateTime.UtcNow;
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}

// 注册
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseSqlServer(connectionString)
           .AddInterceptors(sp.GetRequiredService<AuditSaveChangesInterceptor>()));
```

### DbCommandInterceptor

```csharp
public class SlowQueryInterceptor : DbCommandInterceptor
{
    public override ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Duration.TotalMilliseconds > 1000)
        {
            Console.WriteLine($"Slow query ({eventData.Duration.TotalMilliseconds}ms): {command.CommandText}");
        }
        return base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
    }
}
```

## 批量操作（ExecuteUpdate/Delete）

EF Core 7+ 内置的批量操作直接生成 SQL，不经过 Change Tracker：

```csharp
// 批量更新
await db.Users
    .Where(u => u.LastLogin < DateTime.Now.AddYears(-1))
    .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));
// SQL: UPDATE Users SET IsActive = 0 WHERE LastLogin < ...

// 批量删除
await db.Users
    .Where(u => !u.IsActive)
    .ExecuteDeleteAsync();
// SQL: DELETE FROM Users WHERE IsActive = 0
```

::: warning 批量操作注意事项
`ExecuteUpdateAsync` / `ExecuteDeleteAsync` 不经过 Change Tracker，不会触发实体事件，不会执行 `SaveChanges` 的验证逻辑，也不会自动处理关联实体。对于需要复杂业务校验的场景，仍需逐条处理。
:::

## N+1 查询问题

```csharp
// ❌ N+1：1 次列表查询 + N 次关联查询
foreach (var order in db.Orders)  // SELECT * FROM Orders
{
    Console.WriteLine(order.User.Name);  // SELECT * FROM Users WHERE Id = ...
}

// ✅ 方案 1：Include（Eager Loading）
var orders = db.Orders.Include(o => o.User).ToList();

// ✅ 方案 2：Select 投影（只取需要的字段）
var results = db.Orders
    .Select(o => new { o.Id, UserName = o.User.Name, o.Total })
    .ToList();
```

## 迁移

```bash
# 创建迁移
dotnet ef migrations add AddUserProfileTable

# 应用迁移
dotnet ef database update

# 回退到指定迁移
dotnet ef database update PreviousMigration

# 生成 SQL 脚本
dotnet ef migrations script --idempotent

# 删除最后一次迁移（尚未应用的）
dotnet ef migrations remove
```

::: warning Migration 冲突处理
多人同时创建 Migration 会产生冲突。解决方案：
1. 团队约定：一人负责创建 Migration，其他人拉取后执行
2. 使用 `migrations bundle` 在 CI/CD 中自动应用
3. 冲突时删除本地 Migration，重新基于最新代码生成
:::
