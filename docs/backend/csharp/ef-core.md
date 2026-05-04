# Entity Framework Core

EF Core 是 .NET 的 ORM 框架，将数据库表映射为 C# 对象，支持 LINQ 查询翻译为 SQL。

## DbContext 生命周期

DbContext 代表一个工作单元，生命周期应与业务操作绑定。

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Fluent API 配置
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(u => u.Email).IsUnique();
        });
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

## 实体配置

### Data Annotations

```csharp
public class User
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; }

    [EmailAddress]
    public string Email { get; set; }

    [Column("birth_date")]
    public DateTime? BirthDate { get; set; }

    [NotMapped]  // 不映射到数据库
    public int Age => BirthDate.HasValue
        ? (int)((DateTime.Now - BirthDate.Value).TotalDays / 365.25)
        : 0;
}
```

### Fluent API（推荐）

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<User>(entity =>
    {
        entity.ToTable("users");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Id).HasColumnName("id");
        entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100);
        entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(200);
        entity.HasIndex(e => e.Email).IsUnique();

        // 忽略属性
        entity.Ignore(e => e.Age);
    });

    // 全局过滤器（软删除）
    modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
}
```

## 关系映射

### 一对多

```csharp
public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Order> Orders { get; set; } = new();  // 导航属性
}

public class Order
{
    public int Id { get; set; }
    public decimal Total { get; set; }

    public int UserId { get; set; }          // 外键
    public User User { get; set; }           // 导航属性
}

// 配置
modelBuilder.Entity<Order>()
    .HasOne(o => o.User)
    .WithMany(u => u.Orders)
    .HasForeignKey(o => o.UserId)
    .OnDelete(DeleteBehavior.Cascade);  // 级联删除
```

### 一对一

```csharp
public class User
{
    public int Id { get; set; }
    public UserProfile Profile { get; set; }
}

public class UserProfile
{
    public int Id { get; set; }  // 同时是主键和外键
    public string Bio { get; set; }
    public User User { get; set; }
}

modelBuilder.Entity<User>()
    .HasOne(u => u.Profile)
    .WithOne(p => p.User)
    .HasForeignKey<UserProfile>(p => p.Id);
```

### 多对多

```csharp
// EF Core 5+ 简写（自动生成中间表）
public class Student
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Course> Courses { get; set; } = new();
}

public class Course
{
    public int Id { get; set; }
    public string Title { get; set; }
    public List<Student> Students { get; set; } = new();
}

// 如果中间表需要额外字段，显式定义
public class Enrollment
{
    public int StudentId { get; set; }
    public Student Student { get; set; }
    public int CourseId { get; set; }
    public Course Course { get; set; }
    public DateTime EnrolledAt { get; set; }
    public string Grade { get; set; }
}
```

## 迁移

```bash
# 创建迁移
dotnet ef migrations add AddUserProfileTable

# 应用迁移
dotnet ef database update

# 回退到指定迁移
dotnet ef database update PreviousMigration

# 生成 SQL 脚本（不用自动执行）
dotnet ef migrations script --idempotent

# 删除最后一次迁移（尚未应用的）
dotnet ef migrations remove
```

## 查询优化

### Include（预加载）

```csharp
// Eager loading：一次性加载关联数据
var users = await db.Users
    .Include(u => u.Orders)            // LEFT JOIN Orders
    .ThenInclude(o => o.OrderItems)    // LEFT JOIN OrderItems
    .ToListAsync();

// 生成的 SQL 包含所有 JOIN
```

### Split Query（分拆查询）

```csharp
// 当 Include 多个集合导航属性时，默认会产生笛卡尔积
// Split Query 拆成多条 SQL 避免数据膨胀

var users = await db.Users
    .Include(u => u.Orders)
    .Include(u => u.Addresses)
    .AsSplitQuery()  // 生成 3 条 SQL，而非 1 条大 JOIN
    .ToListAsync();

// 也可以全局配置
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(conn, o => o.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
```

### Select 投影

```csharp
// 只查询需要的字段，减少数据传输
var dtos = await db.Users
    .Where(u => u.IsActive)
    .Select(u => new UserDto
    {
        Id = u.Id,
        Name = u.Name,
        OrderCount = u.Orders.Count  // 子查询翻译
    })
    .ToListAsync();

// 生成的 SQL：
// SELECT u.Id, u.Name, (SELECT COUNT(*) FROM Orders WHERE UserId = u.Id)
// FROM Users u WHERE u.IsActive = 1
```

## Change Tracker

EF Core 通过 Change Tracker 追踪实体状态变化，`SaveChanges` 时据此生成 SQL。

```csharp
// 实体状态
// Detached  → 未被跟踪
// Unchanged → 未修改
// Added     → 新增（INSERT）
// Modified  → 已修改（UPDATE，只更新改变的列）
// Deleted   → 已删除（DELETE）

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

## N+1 问题与批量操作

### N+1 问题

```csharp
// N+1：查询 1 次列表 + N 次关联数据
foreach (var order in db.Orders)  // SELECT * FROM Orders
{
    // 每次循环触发一次查询
    Console.WriteLine(order.User.Name);  // SELECT * FROM Users WHERE Id = ...
}

// 解决方案 1：Include
var orders = db.Orders.Include(o => o.User).ToList();

// 解决方案 2：Select 投影
var results = db.Orders.Select(o => new { o.Id, UserName = o.User.Name }).ToList();
```

### 批量操作

EF Core 默认逐条操作。批量更新/删除可用 EF Core 7+ 内置方法：

```csharp
// EF Core 7+ 批量更新（不加载实体，直接生成 SQL）
await db.Users
    .Where(u => u.LastLogin < DateTime.Now.AddYears(-1))
    .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, false));

// 批量删除
await db.Users
    .Where(u => !u.IsActive)
    .ExecuteDeleteAsync();
```

::: warning 批量操作注意事项
`ExecuteUpdateAsync` / `ExecuteDeleteAsync` 不经过 Change Tracker，不会触发实体事件，也不会执行 `SaveChanges` 的验证逻辑。对于需要复杂业务校验的场景，仍需逐条处理。
:::
