# 函数与闭包

PHP 中函数是一等公民——函数可以赋值给变量、作为参数传递、作为返回值返回。闭包（Closure）和箭头函数使得函数式编程在 PHP 中成为可能。

## 一等函数与回调

```php
<?php
declare(strict_types=1);

// 函数可以赋值给变量
$greet = function(string $name): string {
    return "Hello, $name!";
};
echo $greet("Alice");  // "Hello, Alice!"

// 函数作为参数传递
function applyTo(int $value, callable $func): int
{
    return $func($value);
}
$double = fn(int $n): int => $n * 2;
echo applyTo(5, $double);  // 10

// 直接传递匿名函数
echo applyTo(5, fn(int $n): int => $n ** 2);  // 25

// 内置函数也是 callable
$numbers = [3, 1, 4, 1, 5, 9];
usort($numbers, function(int $a, int $b): int {
    return $a <=> $b;
});
// 或使用 PHP 8.0+ 的排序函数引用
sort($numbers);

// is_callable 检查
var_dump(is_callable($greet));     // true
var_dump(is_callable('strlen'));   // true
var_dump(is_callable('notFunc'));  // false
```

## 闭包与 use 捕获

闭包可以捕获外部变量，这是闭包与普通匿名函数的核心区别。

```php
<?php
declare(strict_types=1);

// 按值捕获（默认）
$multiplier = 3;
$timesThree = function(int $n) use ($multiplier): int {
    return $n * $multiplier;
};
echo $timesThree(5);  // 15

$multiplier = 10;  // 修改外部变量
echo $timesThree(5);  // 15 — 闭包内仍是 3（按值捕获）

// 按引用捕获
$counter = 0;
$increment = function() use (&$counter): int {
    return ++$counter;
};
echo $increment();  // 1
echo $increment();  // 2
echo $counter;      // 2 — 外部变量也被修改了

// 实际场景：构建查询过滤器
function createFilter(string $field, string $operator, mixed $value): Closure
{
    return function(array $record) use ($field, $operator, $value): bool {
        $actual = $record[$field] ?? null;
        return match ($operator) {
            '='  => $actual === $value,
            '>'  => $actual > $value,
            '<'  => $actual < $value,
            '>=' => $actual >= $value,
            default => false,
        };
    };
}

$users = [
    ['name' => 'Alice', 'age' => 25],
    ['name' => 'Bob', 'age' => 17],
    ['name' => 'Charlie', 'age' => 30],
];

$adults = array_filter($users, createFilter('age', '>=', 18));
// 只保留 age >= 18 的用户

// 闭包绑定（bindTo）— 指定 $this 上下文
class Logger
{
    private string $prefix = '[LOG] ';

    public function createLogFunction(): Closure
    {
        return function(string $msg) {
            echo $this->prefix . $msg . "\n";
        };
    }
}

$logger = new Logger();
$log = $logger->createLogFunction();
$log("System started");  // "[LOG] System started"

// bindTo 将闭包绑定到另一个对象
$other = new class { private string $prefix = '[DEBUG] '; };
$debugLog = $log->bindTo($other);
$debugLog("Debug info");  // "[DEBUG] Debug info"
```

::: tip 提示
箭头函数 `fn() =>` 自动按值捕获外部作用域的所有变量，不需要 `use` 关键字。但箭头函数只能是单表达式，不能有多条语句。需要复杂逻辑时使用完整闭包。
:::

## 匿名类

匿名类在需要一次性使用的小型对象时非常实用。

```php
<?php
declare(strict_types=1);

// 匿名类实现接口
interface Formatter
{
    public function format(string $input): string;
}

$uppercase = new class implements Formatter {
    public function format(string $input): string
    {
        return strtoupper($input);
    }
};

echo $uppercase->format("hello");  // "HELLO"

// 匿名类继承抽象类
abstract class Notifier
{
    abstract public function send(string $message): void;
}

$slackNotifier = new class("my-channel") extends Notifier {
    public function __construct(private string $channel) {}

    public function send(string $message): void
    {
        echo "Sending to #{$this->channel}: $message\n";
    }
};

$slackNotifier->send("Deploy complete");

// 匿名类在测试中创建 mock
function createUserRepository(): object
{
    return new class {
        private array $users = [];

        public function save(array $user): int
        {
            $id = count($this->users) + 1;
            $this->users[$id] = $user;
            return $id;
        }

        public function find(int $id): ?array
        {
            return $this->users[$id] ?? null;
        }
    };
}
```

## 高阶函数

PHP 内置了大量接受回调的高阶函数，掌握它们可以大幅减少样板代码。

```php
<?php
declare(strict_types=1);

$numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// array_map — 对每个元素应用函数
$squares = array_map(fn(int $n): int => $n ** 2, $numbers);
// [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]

// 多个数组并行映射
$names = ['alice', 'bob', 'charlie'];
$lengths = array_map(strlen(...), $names);
// [5, 3, 7]

// array_filter — 过滤元素
$evens = array_filter($numbers, fn(int $n): bool => $n % 2 === 0);
// [2, 4, 6, 8, 10]

// 不传回调则过滤 falsy 值
$mixed = [0, 1, '', 'hello', null, false, [], [1]];
$truthy = array_values(array_filter($mixed));
// [1, "hello", [1]]

// array_reduce — 归约为单个值
$sum = array_reduce($numbers, fn(int $carry, int $n): int => $carry + $n, 0);
// 55

// 使用 reduce 构建关联数组
$users = [
    ['id' => 1, 'name' => 'Alice'],
    ['id' => 2, 'name' => 'Bob'],
];
$indexed = array_reduce($users, function(array $carry, array $user): array {
    $carry[$user['id']] = $user['name'];
    return $carry;
}, []);
// [1 => 'Alice', 2 => 'Bob']

// usort — 自定义排序
$products = [
    ['name' => 'Widget', 'price' => 9.99],
    ['name' => 'Gadget', 'price' => 24.99],
    ['name' => 'Doohickey', 'price' => 4.99],
];
usort($products, fn(array $a, array $b): int => $a['price'] <=> $b['price']);

// array_combine — 合并键值
$keys = ['name', 'age', 'city'];
$values = ['Alice', 25, 'Beijing'];
$combined = array_combine($keys, $values);
// ['name' => 'Alice', 'age' => 25, 'city' => 'Beijing']
```

## 可调用对象与 __invoke

任何实现了 `__invoke` 方法的对象都可以像函数一样调用。

```php
<?php
declare(strict_types=1);

class Validator
{
    public function __construct(
        private string $rule,
        private mixed $param = null
    ) {}

    public function __invoke(mixed $value): bool
    {
        return match ($this->rule) {
            'min' => strlen((string) $value) >= $this->param,
            'max' => strlen((string) $value) <= $this->param,
            'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
            default => true,
        };
    }
}

$minLength = new Validator('min', 8);
var_dump(is_callable($minLength));  // true
echo $minLength("short") ? "Valid" : "Invalid";    // "Invalid"
echo $minLength("longpassword") ? "Valid" : "Invalid";  // "Valid"

// 在数组函数中使用
$inputs = ['password123', 'ab', 'hello12345'];
$validInputs = array_filter($inputs, $minLength);
// ['password123', 'hello12345']

// 命名参数与默认值组合
function createUser(
    string $name,
    string $email,
    int $age = 18,
    string $role = 'user',
    bool $active = true
): array {
    return compact('name', 'email', 'age', 'role', 'active');
}

// 使用命名参数跳过中间的可选参数
$user = createUser(
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin'  // 跳过 age，直接设置 role
);
```

## 箭头函数 vs 闭包选择

| 特性 | 箭头函数 `fn() =>` | 闭包 `function() use()` |
|------|---------------------|-------------------------|
| 语法简洁度 | 高 | 中 |
| 变量捕获 | 自动按值捕获所有 | 需手动 use 指定 |
| 引用捕获 | 不支持 | `use (&$var)` |
| 多条语句 | 不支持 | 支持 |
| `$this` 绑定 | 自动绑定 | PHP 8.0+ 也自动绑定 |
| 适用场景 | 简单映射/过滤 | 复杂逻辑 |

```php
<?php
// 箭头函数适合简短的转换
$mapped = array_map(fn($x) => $x * 2, $numbers);

// 闭包适合需要多步处理的逻辑
$processors = [];
foreach ($fields as $field) {
    $processors[] = function(array $data) use ($field): mixed {
        $value = $data[$field] ?? null;
        $value = trim((string) $value);
        $value = strip_tags($value);
        return $value === '' ? null : $value;
    };
}
```
