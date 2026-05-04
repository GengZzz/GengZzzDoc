# LINQ

LINQ（Language Integrated Query）将查询能力直接嵌入 C# 语言。理解延迟执行的内部机制（yield return 状态机）和 IEnumerable vs IQueryable 的区别，是避免常见性能陷阱的关键。

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

## yield return 编译器生成的代码

`yield return` 是延迟执行的核心。编译器将迭代器方法转换为一个状态机类：

```csharp
// 你写的代码
public static IEnumerable<int> Where(this IEnumerable<int> source,
    Func<int, bool> predicate)
{
    foreach (var item in source)
    {
        if (predicate(item))
            yield return item;
    }
}

// 编译器生成的简化版本
public class WhereIterator : IEnumerable<int>, IEnumerator<int>
{
    private int _state;
    private int _current;
    private IEnumerable<int> _source;
    private Func<int, bool> _predicate;
    private IEnumerator<int> _sourceEnumerator;

    public int Current => _current;
    object IEnumerator.Current => _current;

    public bool MoveNext()
    {
        switch (_state)
        {
            case 0:  // 初始化
                _sourceEnumerator = _source.GetEnumerator();
                _state = 1;
                goto case 1;
            case 1:  // 循环
                while (_sourceEnumerator.MoveNext())
                {
                    int item = _sourceEnumerator.Current;
                    if (_predicate(item))
                    {
                        _current = item;
                        return true;  // yield return item
                    }
                }
                _state = -1;  // 结束
                return false;
            default:
                return false;
        }
    }

    public void Dispose() { _sourceEnumerator?.Dispose(); }
    public void Reset() { throw new NotSupportedException(); }
    public IEnumerator<int> GetEnumerator() => new WhereIterator { ... };
}
```

每个 LINQ 方法返回一个新的迭代器对象，枚举时逐元素穿透多层迭代器。这使得 LINQ 查询是**流式处理**——一次只处理一个元素，不会将全部中间结果加载到内存。

## 延迟执行与立即执行

### 延迟执行的操作

以下操作返回 `IEnumerable<T>` 或 `IQueryable<T>`，不会立即执行：

```csharp
// 过滤
.Where()  .Take()  .Skip()  .Distinct()

// 投影
.Select()  .SelectMany()

// 排序
.OrderBy()  .ThenBy()  .Reverse()

// 连接
.Join()  .GroupJoin()  .Zip()

// 分组
.GroupBy()
```

### 立即执行的操作

以下操作会立即执行查询：

```csharp
// 聚合
int count = query.Count();
int sum = query.Sum();
double avg = query.Average();
int min = query.Min();

// 转换
List<int> list = query.ToList();
int[] array = query.ToArray();
Dictionary<int, string> dict = query.ToDictionary(x => x, x => x.ToString());

// 元素
int first = query.First();
int last = query.Last();
bool any = query.Any(x => x > 5);
bool all = query.All(x => x > 0);
```

::: warning 多次枚举陷阱
每次枚举 LINQ 查询都会重新执行。如果查询有副作用（如网络请求、日志），会执行多次：

```csharp
var expensiveQuery = data.Where(x => ExpensiveCheck(x));

// 错误：执行两次（Count 一次，First 一次）
int count = expensiveQuery.Count();
var first = expensiveQuery.First();

// 正确：执行一次，缓存结果
var cached = expensiveQuery.ToList();
int count2 = cached.Count;
var first2 = cached.First();
```

**何时用 ToList vs ToArray？**
- 后续需要多次枚举或需要索引访问 → `ToList`
- 知道最终大小且不需要修改 → `ToArray`
- 只枚举一次 → 不要 ToList，保持延迟执行
:::

## IEnumerable vs IQueryable

这是 LINQ 最核心的区别：

| 特性 | IEnumerable\<T\> | IQueryable\<T\> |
| --- | --- | --- |
| 执行位置 | 内存中（客户端） | 数据源（服务端） |
| Lambda 类型 | `Func<T, bool>` | `Expression<Func<T, bool>>` |
| 可分析性 | 编译为 IL，不可分析 | 表达式树，可分析和翻译 |
| 适用场景 | 集合操作 | 数据库查询 |

```csharp
// IEnumerable<T>：在内存中执行
IEnumerable<User> enumerable = dbContext.Users;
var memoryFiltered = enumerable.Where(u => u.Age > 18);
// 实际 SQL: SELECT * FROM Users（加载全部数据到内存，然后过滤）

// IQueryable<T>：翻译为 SQL 在数据库执行
IQueryable<User> queryable = dbContext.Users;
var dbFiltered = queryable.Where(u => u.Age > 18);
// 实际 SQL: SELECT * FROM Users WHERE Age > 18
```

::: warning IQueryable 的过早转换陷阱
```csharp
// 错误：AsEnumerable() 后的 Where 在内存中执行
var result = dbContext.Orders
    .AsEnumerable()  // 转为 IEnumerable，后续操作在内存中
    .Where(o => o.Total > 1000);  // 在内存中过滤！数据库返回了全部订单

// 正确：保持 IQueryable 直到最终执行
var result = dbContext.Orders
    .Where(o => o.Total > 1000)  // 翻译为 SQL
    .AsEnumerable()               // 此时才从数据库取数据
    .Where(o => CustomFilter(o)); // 只有不可翻译的条件才用 AsEnumerable
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
var allTags = users.SelectMany(u => u.Tags);
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
var byAge = users.GroupBy(u => u.Age / 10 * 10);
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
```

### 聚合

```csharp
int sum = numbers.Sum();
int max = numbers.Max();
double avg = numbers.Average();

// Aggregate：自定义聚合
string csv = names.Aggregate("Names:", (current, name) => current + $" {name},");
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

## 自定义 LINQ 扩展方法

```csharp
public static class EnumerableExtensions
{
    // 批量处理：将集合分批
    public static IEnumerable<IEnumerable<T>> Batch<T>(
        this IEnumerable<T> source, int batchSize)
    {
        var batch = new List<T>(batchSize);
        foreach (var item in source)
        {
            batch.Add(item);
            if (batch.Count == batchSize)
            {
                yield return batch;
                batch = new List<T>(batchSize);
            }
        }
        if (batch.Count > 0)
            yield return batch;
    }

    // DistinctBy：按特定属性去重（.NET 6 已内置，这里展示原理）
    public static IEnumerable<T> DistinctBy<T, TKey>(
        this IEnumerable<T> source,
        Func<T, TKey> keySelector)
    {
        var seen = new HashSet<TKey>();
        foreach (var item in source)
        {
            if (seen.Add(keySelector(item)))
                yield return item;
        }
    }
}

// 使用
var batches = items.Batch(100);
foreach (var batch in batches)
{
    ProcessBatch(batch);
}
```

## N+1 查询问题

```csharp
// 错误：N+1（1 次查询订单 + N 次查询用户）
var orders = dbContext.Orders.ToList();
foreach (var order in orders)
{
    Console.WriteLine(order.User.Name);  // 每次循环触发一次 SQL
}

// 正确：用 Include 一次性加载
var orders2 = dbContext.Orders
    .Include(o => o.User)
    .ToList();

// 更好：用 Select 只取需要的字段
var result = dbContext.Orders
    .Select(o => new { o.Id, UserName = o.User.Name, o.Total })
    .ToList();
// SQL: SELECT o.Id, u.Name, o.Total FROM Orders o JOIN Users u ON ...
```

::: warning 过度使用 ToList 的内存问题
```csharp
// 错误：加载全部数据到内存
var allUsers = dbContext.Users.ToList();
var activeUsers = allUsers.Where(u => u.IsActive).ToList();

// 正确：保持 IQueryable，让数据库过滤
var activeUsers2 = dbContext.Users
    .Where(u => u.IsActive)
    .ToList();
// SQL: SELECT * FROM Users WHERE IsActive = 1
```
:::
