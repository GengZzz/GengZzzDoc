# LINQ

LINQ（Language Integrated Query）将查询能力直接嵌入 C# 语言，提供统一的语法操作集合、数据库、XML 等数据源。

## 查询语法 vs 方法语法

```csharp
int[] numbers = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

// 查询语法（类似 SQL）
var query1 =
    from n in numbers
    where n % 2 == 0
    orderby n descending
    select n * n;

// 方法语法（链式调用，更常用）
var query2 = numbers
    .Where(n => n % 2 == 0)
    .OrderByDescending(n => n)
    .Select(n => n * n);

// 两者等价：{ 100, 64, 36, 16, 4 }
```

## 延迟执行原理

LINQ 查询默认是**延迟执行（Deferred Execution）**的——只在真正需要结果时才执行。

```csharp
var source = Enumerable.Range(1, 10);
Console.WriteLine("定义查询...");

var query = source.Where(x =>
{
    Console.WriteLine($"  过滤: {x}");
    return x % 2 == 0;
});

Console.WriteLine("查询已定义，但尚未执行");
Console.WriteLine("开始枚举:");

foreach (var x in query)
{
    Console.WriteLine($"  结果: {x}");
}

// 输出：
// 定义查询...
// 查询已定义，但尚未执行
// 开始枚举:
//   过滤: 1
//   过滤: 2
//   结果: 2
//   过滤: 3
//   过滤: 4
//   结果: 4
//   ...
```

### 延迟执行的内部机制

延迟执行依赖 `IEnumerable<T>` + `yield return`。每个 LINQ 方法返回一个新的迭代器对象，枚举时逐元素处理。

```csharp
// 简化的 Where 实现
public static IEnumerable<T> Where<T>(
    this IEnumerable<T> source,
    Func<T, bool> predicate)
{
    foreach (var item in source)
    {
        if (predicate(item))
        {
            yield return item;  // 暂停，返回当前元素
        }
    }
}
```

### 立即执行的操作

以下操作会触发立即执行：

```csharp
// 聚合
int count = query.Count();
int sum = query.Sum();
double avg = query.Average();

// 转换
List<int> list = query.ToList();
int[] array = query.ToArray();
Dictionary<int, string> dict = query.ToDictionary(x => x, x => x.ToString());

// 元素
int first = query.First();
int last = query.Last();
int single = query.Single(x => x > 5);  // 多个匹配则抛异常
```

::: warning 多次枚举陷阱
每次枚举 LINQ 查询都会重新执行。如果查询有副作用（如网络请求、日志），会执行多次。解决方案：用 `.ToList()` 或 `.ToArray()` 缓存结果。

```csharp
var expensiveQuery = data.Where(x => ExpensiveCheck(x));

// 错误：执行两次
int count = expensiveQuery.Count();
var first = expensiveQuery.First();

// 正确：执行一次，缓存结果
var cached = expensiveQuery.ToList();
int count2 = cached.Count;
var first2 = cached.First();
```
:::

## 常用运算符

### 过滤与投影

```csharp
var users = GetUsers();

// Where：过滤
var adults = users.Where(u => u.Age >= 18);

// Select：投影/转换
var names = users.Select(u => u.Name);

// SelectMany：展平嵌套集合
var allTags = users.SelectMany(u => u.Tags);  // List<List<Tag>> → IEnumerable<Tag>
```

### 排序

```csharp
var sorted = users
    .OrderBy(u => u.Age)           // 主排序
    .ThenBy(u => u.Name)           // 次排序
    .ThenByDescending(u => u.Id);  // 三次排序
```

### 分组与连接

```csharp
// GroupBy：分组
var byAge = users.GroupBy(u => u.Age / 10 * 10);  // 按年龄段分组
foreach (var group in byAge)
{
    Console.WriteLine($"{group.Key}s: {group.Count()} 人");
}

// Join：内连接
var orders = GetOrders();
var result = users.Join(
    orders,
    user => user.Id,
    order => order.UserId,
    (user, order) => new { user.Name, order.Product }
);

// GroupJoin：左外连接
var withOrders = users.GroupJoin(
    orders,
    user => user.Id,
    order => order.UserId,
    (user, oList) => new { user.Name, Orders = oList.ToList() }
);
```

### 聚合

```csharp
int sum = numbers.Sum();
int max = numbers.Max();
int min = numbers.Min();
double avg = numbers.Average();

// Aggregate：自定义聚合
string csv = names.Aggregate(
    "Names:",
    (current, name) => current + $" {name},"
);
// 也可以用 seed
int product = numbers.Aggregate(1, (acc, n) => acc * n);
```

### 集合操作

```csharp
var set1 = new[] { 1, 2, 3, 4 };
var set2 = new[] { 3, 4, 5, 6 };

var union = set1.Union(set2);           // { 1, 2, 3, 4, 5, 6 }
var intersect = set1.Intersect(set2);   // { 3, 4 }
var except = set1.Except(set2);         // { 1, 2 }
```

## IQueryable 与数据库查询翻译

这是 LINQ 最强大的应用场景。

```csharp
// IEnumerable<T>：在内存中执行
IEnumerable<User> enumerable = dbContext.Users;
var memoryFiltered = enumerable.Where(u => u.Age > 18);  // 加载全部数据到内存再过滤

// IQueryable<T>：翻译为 SQL 在数据库执行
IQueryable<User> queryable = dbContext.Users;
var dbFiltered = queryable.Where(u => u.Age > 18);  // 翻译为 SELECT * FROM Users WHERE Age > 18
```

`IQueryable` 携带**表达式树（Expression\<Func\<T, bool\>\>）**，EF Core 分析表达式树结构生成 SQL。

```csharp
var query = dbContext.Orders
    .Include(o => o.User)           // LEFT JOIN Users
    .Where(o => o.Total > 1000)     // WHERE Total > 1000
    .OrderByDescending(o => o.Date) // ORDER BY Date DESC
    .Select(o => new               // SELECT User.Name, o.Total
    {
        Customer = o.User.Name,
        o.Total
    });

// 此时还未执行
var results = await query.ToListAsync();  // 执行 SQL 并返回结果
```

## 性能陷阱

### N+1 查询问题

```csharp
// 错误：N+1（1 次查询订单 + N 次查询用户）
var orders = dbContext.Orders.ToList();
foreach (var order in orders)
{
    // 每次循环触发一次数据库查询
    Console.WriteLine(order.User.Name);
}

// 正确：用 Include 一次性加载
var orders2 = dbContext.Orders
    .Include(o => o.User)
    .ToList();
```

### Select 投影减少数据传输

```csharp
// 只需要 Name 和 Email，不要加载整个 User 实体
var brief = dbContext.Users
    .Where(u => u.IsActive)
    .Select(u => new { u.Name, u.Email })
    .ToList();

// 生成的 SQL：SELECT Name, Email FROM Users WHERE IsActive = 1
```
