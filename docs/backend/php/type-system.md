# 类型系统

PHP 的类型系统经历了从纯弱类型到可选强类型的演进。PHP 7 引入标量类型声明，PHP 8 联合类型和命名参数，PHP 8.1 枚举和交集类型，使得 PHP 在保持灵活性的同时具备了强大的类型约束能力。

## 标量类型声明

PHP 7.0 引入了四种标量类型的参数和返回值声明：`int`、`string`、`float`、`bool`。

```php
<?php
// 默认模式（强制模式）：PHP 会尝试类型转换
function add(int $a, int $b): int
{
    return $a + $b;
}
echo add("3", "4");  // 7 — PHP 自动将字符串转为 int

// 严格模式：不做类型转换，类型不匹配直接抛 TypeError
declare(strict_types=1);

function multiply(int $a, int $b): int
{
    return $a * $b;
}
// multiply("3", "4");  // TypeError: Argument #1 must be of type int, string given
echo multiply(3, 4);    // 12
```

::: tip 提示
`declare(strict_types=1)` 必须放在 PHP 文件的第一行（`<?php` 之后、任何其他代码之前）。它只影响当前文件中的函数调用，不影响被调用函数所在文件。建议在所有新项目中启用严格模式。
:::

## 返回类型与可空类型

```php
<?php
declare(strict_types=1);

// 返回类型声明
function findUser(int $id): ?User  // ?User 表示返回 User 或 null
{
    $user = User::query()->find($id);
    return $user; // 可能返回 null
}

// void 返回类型（PHP 7.1+）— 函数不返回值
function logAction(string $action): void
{
    error_log("[ACTION] $action");
    // 可以写 return; 但不能 return 值
}

// never 返回类型（PHP 8.1+）— 函数永远不会正常终止
function abortWithError(string $message): never
{
    throw new RuntimeException($message);
    // 或者调用 exit() / die()
}

// 可选参数 vs 可空类型
function greet1(string $name = null): string  // 可选参数
{
    return "Hello, " . ($name ?? "Guest");
}

function greet2(?string $name): string  // 可空类型（必须传参）
{
    return "Hello, " . ($name ?? "Guest");
}

greet1();          // OK — 不传参
greet1(null);      // OK — 传 null
// greet2();       // Error — 必须传参
greet2(null);      // OK — 传 null
```

## 联合类型（PHP 8.0+）

联合类型允许参数或返回值接受多种类型之一。

```php
<?php
declare(strict_types=1);

// 联合类型：参数接受 int 或 string
function formatId(int|string $id): string
{
    return "ID: $id";
}
echo formatId(42);        // "ID: 42"
echo formatId("abc-123"); // "ID: abc-123"

// 返回值联合类型
function findRecord(int $id): array|false
{
    $record = query("SELECT * FROM records WHERE id = $id");
    return $record ?: false;
}

// 可空类型是联合类型的语法糖
function process(?string $data): void { }
// 等价于：
function process(string|null $data): void { }

// 常见联合类型模式
function handle(Response|Request $input): void
{
    if ($input instanceof Response) {
        // 处理响应
    } else {
        // 处理请求
    }
}
```

## 交集类型（PHP 8.1+）

交集类型要求值同时满足多个类型约束，用 `&` 连接。

```php
<?php
declare(strict_types=1);

// 交集类型：参数必须同时实现 Countable 和 Iterator
function processCollection(Countable&Iterator $collection): void
{
    echo "Count: " . count($collection);
    foreach ($collection as $item) {
        // 遍历
    }
}

// 实际使用场景
interface Cacheable { public function getCacheKey(): string; }
interface Serializable { public function serialize(): string; }

function cache(Cacheable&Serializable $item): void
{
    $key = $item->getCacheKey();
    $data = $item->serialize();
    // 缓存逻辑
}
```

::: warning 警告
联合类型（`A|B`）和交集类型（`A&B`）不能混用。`A&B|C` 这样的写法不合法。可以使用 `((A&B)|C)` 包装，但更推荐用接口设计来避免这种情况。
:::

## mixed、never、void

```php
<?php
// mixed（PHP 8.0+）— 接受任何类型，等价于不声明类型
// 主要用于文档化意图
function dump(mixed $value): void
{
    var_dump($value);
}

// 实际场景：配置读取
function getConfig(string $key): mixed
{
    return $this->config[$key] ?? null;
}

// never（PHP 8.1+）— 函数永远不返回
function redirect(string $url): never
{
    header("Location: $url");
    exit;
}

function throwError(string $msg): never
{
    throw new InvalidArgumentException($msg);
}

// never vs void
// void: 函数正常执行完毕，只是不返回值
// never: 函数永远不会正常结束（总是 exit 或 throw）
```

## 枚举（PHP 8.1+）

枚举替代了传统的类常量模式，提供类型安全的有限值集合。

```php
<?php
declare(strict_types=1);

// 纯枚举 — 没有关联值
enum Status
{
    case Active;
    case Inactive;
    case Pending;
}

function updateStatus(Status $status): void
{
    // $status 只能是 Status 的三个值之一
    echo match ($status) {
        Status::Active => 'User is active',
        Status::Inactive => 'User is inactive',
        Status::Pending => 'User is pending',
    };
}

updateStatus(Status::Active);  // OK
// updateStatus('active');     // TypeError — 类型安全

// Backed Enum — 有关联值（int 或 string）
enum HttpStatus: int
{
    case OK = 200;
    case NotFound = 404;
    case ServerError = 500;
}

// 从值反查枚举
$status = HttpStatus::from(404);        // HttpStatus::NotFound
$status = HttpStatus::tryFrom(999);     // null（不抛异常）
$status = HttpStatus::from(999);        // ValueError（抛异常）

// 获取关联值
echo HttpStatus::OK->value;  // 200
echo HttpStatus::OK->name;   // "OK"

// 枚举可以实现接口
interface Describable
{
    public function describe(): string;
}

enum Color: string implements Describable
{
    case Red = 'red';
    case Green = 'green';
    case Blue = 'blue';

    public function describe(): string
    {
        return match ($this) {
            Color::Red => 'Hot color',
            Color::Green => 'Nature color',
            Color::Blue => 'Cool color',
        };
    }
}

// 枚举可以有静态方法
enum Suit: string
{
    case Hearts = 'H';
    case Diamonds = 'D';
    case Clubs = 'C';
    case Spades = 'S';

    public static function reds(): array
    {
        return [self::Hearts, self::Diamonds];
    }

    public function color(): string
    {
        return in_array($this, self::reds()) ? 'red' : 'black';
    }
}
```

::: tip 提示
PHP 枚举与 Java/C# 枚举不同：PHP 枚举是单例对象，每个 case 只有一个实例。枚举值可以用于类型声明、match 表达式，并支持序列化。相比传统的类常量模式，枚举提供了编译时检查和 IDE 自动补全。
:::

## 类型转换陷阱

PHP 的类型转换规则是出了名的"灵活"，以下是需要特别注意的陷阱：

```php
<?php
// "0" == false 为 true（松散比较）
var_dump("0" == false);    // true（PHP 7.x）| false（PHP 8.0+ str_contains 修复）
var_dump("0" === false);   // false（严格比较）

// 空字符串、null、0、false、空数组 在松散比较中都等于 false
var_dump("" == false);     // true
var_dump(null == false);   // true
var_dump(0 == false);      // true
var_dump([] == false);     // true

// 数组比较的特殊情况
var_dump([1, 2] == [2, 1]);    // false — 数组有序
var_dump(["a" => 1] == ["a" => "1"]); // true — 松散比较值

// 浮点数比较陷阱
var_dump(0.1 + 0.2 == 0.3);   // false！
var_dump(abs(0.1 + 0.2 - 0.3) < 1e-10);  // true — 正确做法

// 最佳实践：始终使用 === 和 !==
$value = getConfig("debug");
if ($value === null) { /* 配置不存在 */ }
if ($value === false) { /* 配置值为 false */ }
if ($value === 0) { /* 配置值为 0 */ }
// 松散比较无法区分以上三种情况
```
