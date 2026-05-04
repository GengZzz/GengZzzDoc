# LINQ 高级

深入理解自定义 LINQ Provider 的实现、表达式树的访问者模式、以及 EF Core 如何将表达式树翻译为 SQL，是扩展 LINQ 能力和调试查询问题的基础。

## IQueryable Provider 接口

`IQueryable<T>` 的核心是三个属性：

```csharp
public interface IQueryable
{
    Expression Expression { get; }  // 表达式树（查询的抽象语法树）
    Type ElementType { get; }       // 元素类型
    IQueryProvider Provider { get; }  // 查询提供者（负责执行）
}

public interface IQueryProvider
{
    // 从表达式树创建查询
    IQueryable<TElement> CreateQuery<TElement>(Expression expression);

    // 执行查询并返回结果
    TResult Execute<TResult>(Expression expression);
}
```

### IQueryable 的工作流程

```
var query = db.Users.Where(u => u.Age > 18).Select(u => u.Name);

表达式树（query.Expression）：
  MethodCallExpression (Select)
    ├── MethodCallExpression (Where)
    │     ├── ConstantExpression (db.Users)
    │     └── Lambda: u => u.Age > 18
    └── Lambda: u => u.Name

执行时（query.ToList()）：
  Provider.Execute(expression)
    │
    ▼
  遍历表达式树 → 翻译为 SQL → 执行 → 返回结果
```

## 表达式树访问者模式

通过继承 `ExpressionVisitor` 可以遍历和修改表达式树：

```csharp
public class ExpressionTreePrinter : ExpressionVisitor
{
    protected override Expression VisitMethodCall(MethodCallExpression node)
    {
        Console.WriteLine($"方法调用: {node.Method.Name}");
        Console.WriteLine($"  参数数量: {node.Arguments.Count}");

        foreach (var arg in node.Arguments)
        {
            Console.WriteLine($"  参数类型: {arg.NodeType}");
        }

        return base.VisitMethodCall(node);
    }

    protected override Expression VisitBinary(BinaryExpression node)
    {
        Console.WriteLine($"二元表达式: {node.NodeType}");
        Console.WriteLine($"  左侧: {node.Left}");
        Console.WriteLine($"  右侧: {node.Right}");
        return base.VisitBinary(node);
    }

    protected override Expression VisitLambda<T>(Expression<T> node)
    {
        Console.WriteLine($"Lambda: {node}");
        return base.VisitLambda(node);
    }
}
```

## 表达式树修改与编译

### 替换参数

```csharp
// 将表达式树中的参数替换为另一个表达式
public class ParameterReplacer : ExpressionVisitor
{
    private readonly ParameterExpression _oldParam;
    private readonly Expression _newExpr;

    public ParameterReplacer(ParameterExpression oldParam, Expression newExpr)
    {
        _oldParam = oldParam;
        _newExpr = newExpr;
    }

    protected override Expression VisitParameter(ParameterExpression node)
    {
        return node == _oldParam ? _newExpr : base.VisitParameter(node);
    }
}

// 使用：将 u => u.Age > 18 中的 u 替换为另一个表达式
Expression<Func<User, bool>> predicate = u => u.Age > 18;
var param = Expression.Parameter(typeof(User), "x");
var replaced = new ParameterReplacer(predicate.Parameters[0], param)
    .Visit(predicate.Body);

var newLambda = Expression.Lambda<Func<User, bool>>(replaced, param);
```

### 组合表达式树

```csharp
// 动态组合 Where 条件
public static class PredicateBuilder
{
    public static Expression<Func<T, bool>> And<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var parameter = Expression.Parameter(typeof(T));
        var body = Expression.AndAlso(
            Expression.Invoke(left, parameter),
            Expression.Invoke(right, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }

    public static Expression<Func<T, bool>> Or<T>(
        this Expression<Func<T, bool>> left,
        Expression<Func<T, bool>> right)
    {
        var parameter = Expression.Parameter(typeof(T));
        var body = Expression.OrElse(
            Expression.Invoke(left, parameter),
            Expression.Invoke(right, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(body, parameter);
    }
}

// 使用
Expression<Func<User, bool>> isAdult = u => u.Age >= 18;
Expression<Func<User, bool>> isActive = u => u.IsActive;

var combined = isAdult.And(isActive);  // u => u.Age >= 18 && u.IsActive
var filtered = db.Users.Where(combined).ToList();
```

### 编译表达式树

```csharp
// 编译为委托执行
Expression<Func<int, int, int>> expr = (a, b) => a + b;
Func<int, int, int> compiled = expr.Compile();
int result = compiled(3, 4);  // 7

// 一次性编译并缓存
private static readonly Func<int, int, int> CachedAdd =
    ((Expression<Func<int, int, int>>)((a, b) => a + b)).Compile();

int r = CachedAdd(3, 4);  // 直接执行，无编译开销
```

## EF Core 如何将表达式树翻译为 SQL

EF Core 的查询处理流程：

```
LINQ 查询（IQueryable）
  │
  ▼
[构建表达式树]
  │ Expression<Func<User, bool>>: u => u.Age > 18 && u.Name.Contains("A")
  │
  ▼
[表达式树访问]
  │ EF Core 使用多个 ExpressionVisitor 遍历树
  │
  ├── VisitBinary (AndAlso) → 转为 AND
  ├── VisitBinary (GreaterThan) → 转为 >
  ├── VisitMember (u.Age) → 转为列名
  ├── VisitConstant (18) → 转为参数 @p0
  └── VisitMethodCall (Contains) → 转为 LIKE '%A%'
  │
  ▼
[SQL 生成]
  │ SELECT * FROM Users WHERE Age > @p0 AND Name LIKE @p1
  │
  ▼
[参数化执行]
  │ @p0 = 18, @p1 = '%A%'
  │
  ▼
[结果映射]
  │ 将 DataReader 行映射回实体对象
```

### 不可翻译的表达式

当 LINQ 表达式包含无法翻译为 SQL 的操作时，EF Core 会报错或在客户端执行：

```csharp
// ❌ 无法翻译：自定义方法不能翻译为 SQL
var result = db.Users.Where(u => ValidateUser(u)).ToList();
// InvalidOperationException: The LINQ expression could not be translated

// ✅ 解决方案：先在数据库端过滤可翻译的条件，再在客户端过滤
var result = db.Users
    .Where(u => u.Age > 18)  // 可翻译为 SQL
    .AsEnumerable()            // 切换到客户端
    .Where(u => ValidateUser(u))  // 在内存中执行
    .ToList();
```

::: warning 可翻译 vs 不可翻译
**可翻译**：属性访问、比较运算符、`Contains`、`StartsWith`、`EndsWith`、`string.Length`、`string.ToLower()` 等

**不可翻译**：自定义方法、正则表达式、复杂 LINQ 运算符（如 `GroupBy` 在某些数据库上不支持）、客户端方法
:::

## 自定义 LINQ Provider 实现要点

实现自定义 LINQ Provider 需要实现 `IQueryProvider` 和 `IQueryable<T>`：

```csharp
// 简化的示例：将 LINQ 查询翻译为 URL 查询参数
public class UrlQueryProvider : IQueryProvider
{
    public IQueryable<TElement> CreateQuery<TElement>(Expression expression)
    {
        return new UrlQueryable<TElement>(this, expression);
    }

    public IQueryable CreateQuery(Expression expression)
    {
        throw new NotImplementedException();
    }

    public TResult Execute<TResult>(Expression expression)
    {
        // 遍历表达式树，翻译为 URL 参数
        var visitor = new UrlQueryTranslator();
        string url = visitor.Translate(expression);
        // 执行 HTTP 请求并返回结果
        return (TResult)ExecuteRequest(url, typeof(TResult));
    }

    public object Execute(Expression expression)
    {
        throw new NotImplementedException();
    }
}

// 表达式树翻译器
public class UrlQueryTranslator : ExpressionVisitor
{
    private StringBuilder _sb = new();

    public string Translate(Expression expression)
    {
        Visit(expression);
        return _sb.ToString();
    }

    protected override Expression VisitMethodCall(MethodCallExpression node)
    {
        if (node.Method.Name == "Where")
        {
            Visit(node.Arguments[0]);  // 数据源
            _sb.Append("?");
            Visit(node.Arguments[1]);  // 过滤条件
            return node;
        }
        return base.VisitMethodCall(node);
    }
}
```
