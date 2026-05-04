# 语言基础

PHP 的语法融合了 C、Java 和 Perl 的特点。作为一门弱类型语言，PHP 允许灵活的类型使用，但现代 PHP 通过类型声明逐步引入强类型约束。

## 变量与类型

PHP 变量以 `$` 符号开头，支持动态类型——变量的类型由其存储的值决定，且可以在运行时改变。

```php
<?php
declare(strict_types=1);

// PHP 是弱类型语言，变量无需声明类型
$name = "Alice";       // string
$age = 25;             // integer
$price = 19.99;         // float
$isActive = true;       // boolean

// 类型可以随时改变（不推荐在实际代码中这样做）
$var = "hello";
$var = 42;              // 现在是 integer
$var = [1, 2, 3];       // 现在是 array

// gettype() 获取类型名
echo gettype($var);     // "array"

// var_dump() 输出类型和值（调试利器）
var_dump($name);        // string(5) "Alice"
var_dump($age);         // int(25)
```

PHP 内置的标量类型：`int`、`float`（或 `double`）、`string`、`bool`。
复合类型：`array`、`object`。
特殊类型：`null`、`resource`（如文件句柄、数据库连接）。

```php
<?php
// 类型检查函数
is_int(42);             // true
is_string("hello");     // true
is_array([1, 2]);       // true
is_null(null);          // true
is_numeric("123");      // true（注意：字符串 "123" 也是 numeric）

// 强制类型转换
$num = (int) "42abc";   // 42（截取开头的数字部分）
$num = (int) "abc";     // 0（无法转换）
$float = (float) "3.14"; // 3.14

// intval() 支持指定进制
intval("0xff", 16);     // 255
intval("010", 8);        // 8（八进制）
```

::: warning 警告
类型转换陷阱是 PHP 中最常见的 Bug 来源。`(int) "42abc"` 返回 42 而非报错，这种隐式转换在调试时极难发现。始终使用 `declare(strict_types=1)` 来启用严格类型检查。
:::

## 运算符

PHP 提供了丰富的运算符，但比较运算符的松散比较（`==`）是著名的坑。

```php
<?php
// 算术运算符
$a = 10 + 3;     // 13
$b = 10 / 3;     // 3.3333...（PHP 除法结果始终是 float）
$c = 10 % 3;     // 1（取模）
$d = 2 ** 8;     // 256（幂运算，PHP 5.6+）

// 松散比较 vs 严格比较
// 松散比较（==）会进行类型转换
var_dump(0 == "foo");       // true ！PHP 8.0+ 已修复为 false
var_dump("" == null);       // true
var_dump("0" == false);     // true
var_dump("" == false);      // true
var_dump("42" == 42);       // true

// 严格比较（===）同时检查类型和值
var_dump(0 === "foo");      // false
var_dump("42" === 42);      // false
var_dump(42 === 42);        // true

// 太空船运算符（<=>，PHP 7+）
// 返回 -1、0 或 1
echo 1 <=> 2;    // -1
echo 1 <=> 1;    // 0
echo 2 <=> 1;    // 1

// null 合并运算符（??，PHP 7+）
$username = $_GET['user'] ?? 'guest';
// 等价于：
$username = isset($_GET['user']) ? $_GET['user'] : 'guest';

// null 合并赋值（??=，PHP 7.4+）
$config['debug'] ??= false;

// 字符串连接用 . 而非 +
$greeting = "Hello" . " " . "World";
```

::: tip 提示
PHP 8.0 开始，松散比较 `0 == "foo"` 的结果改为 `false`，这是一个破坏性变更。在旧代码迁移时需要注意。最安全的做法是始终使用 `===` 和 `!==`。
:::

## 控制流

```php
<?php
// if / elseif / else
$score = 85;
if ($score >= 90) {
    $grade = 'A';
} elseif ($score >= 80) {
    $grade = 'B';
} elseif ($score >= 70) {
    $grade = 'C';
} else {
    $grade = 'F';
}

// match 表达式（PHP 8.0+）— 替代 switch，支持返回值
$statusCode = 404;
$message = match ($statusCode) {
    200 => 'OK',
    301 => 'Moved Permanently',
    404 => 'Not Found',
    500 => 'Internal Server Error',
    default => 'Unknown Status',
};
// match 使用严格比较（===），不进行类型转换
// match 支持多条件：match ($val) { 1, 2, 3 => 'low', ... }
// match 支持条件表达式：match (true) { $age < 18 => 'minor', ... }

// for 循环
for ($i = 0; $i < 5; $i++) {
    echo "$i ";
}

// while 循环
$n = 5;
while ($n > 0) {
    echo "$n ";
    $n--;
}

// do-while（至少执行一次）
$attempt = 0;
do {
    $attempt++;
    $result = tryConnect();
} while (!$result && $attempt < 3);

// foreach — 遍历数组的首选方式
$fruits = ['apple', 'banana', 'cherry'];
foreach ($fruits as $fruit) {
    echo "$fruit\n";
}

// 带键名遍历
$prices = ['apple' => 1.5, 'banana' => 0.8, 'cherry' => 2.0];
foreach ($prices as $name => $price) {
    echo "$name: $$price\n";
}

// 三元运算符（嵌套应避免，改用 match）
$label = $age >= 18 ? 'Adult' : 'Minor';
```

## 函数

PHP 函数支持命名参数、可变参数、默认值、箭头函数等现代特性。

```php
<?php
declare(strict_types=1);

// 基本函数定义
function greet(string $name, string $greeting = "Hello"): string
{
    return "$greeting, $name!";
}

echo greet("Alice");                  // "Hello, Alice!"
echo greet("Bob", "Hi");              // "Hi, Bob!"

// 命名参数（PHP 8.0+）— 跳过可选参数、提高可读性
echo greet(greeting: "Hey", name: "Charlie");
// 无需关心参数顺序

// 可变参数
function sum(int ...$numbers): int
{
    return array_sum($numbers);
}
echo sum(1, 2, 3, 4, 5);  // 15

// 可变参数也可以在中间
function logMessage(string $level, string ...$messages): void
{
    foreach ($messages as $msg) {
        echo "[$level] $msg\n";
    }
}
logMessage("ERROR", "Connection failed", "Retrying...");

// 箭头函数（PHP 7.4+）— 单表达式自动捕获外部变量
$multiply = fn(int $a, int $b): int => $a * $b;
echo $multiply(3, 4);  // 12

// 箭头函数自动按值捕获外部变量（不需要 use）
$tax = 0.1;
$addTax = fn(float $price): float => $price * (1 + $tax);
echo $addTax(100);  // 110

// 返回类型：void、never（PHP 8.1+）
function debugLog(string $msg): void
{
    error_log($msg);
    // void 函数没有 return 值（可以写 return; 但不能 return 值）
}

function abort(int $code): never
{
    http_response_code($code);
    exit;
}
// never 表示函数永远不会正常返回（总是 exit 或 throw）
```

## 字符串处理

PHP 提供了三种字符串字面量方式和强大的 PCRE 正则支持。

```php
<?php
// 单引号字符串 — 不解析变量和转义序列（除了 \\ 和 \'）
$name = 'World';
echo 'Hello, $name';   // 输出：Hello, $name（原样输出）

// 双引号字符串 — 解析变量和转义序列
echo "Hello, $name";   // 输出：Hello, World
echo "Line1\nLine2";   // 解析换行符

// Heredoc — 类似双引号字符串，适合多行
$sql = <<<SQL
SELECT *
FROM users
WHERE name = '$name'
  AND status = 'active'
ORDER BY created_at DESC
SQL;

// Nowdoc — 类似单引号字符串，不解析变量
$template = <<<'TPL'
Hello, {$name}!
This is a template string.
TPL;
// {$name} 会被原样输出，不会被解析

// 常用字符串函数
strlen("Hello");                    // 5
mb_strlen("你好世界");              // 4（多字节安全）
strpos("Hello World", "World");     // 6（首次出现位置）
str_replace("World", "PHP", "Hello World"); // "Hello PHP"
substr("Hello World", 0, 5);       // "Hello"
trim("  spaces  ");                // "spaces"
explode(",", "a,b,c");             // ["a", "b", "c"]
implode(", ", ["a", "b", "c"]);   // "a, b, c"
str_contains("Hello World", "World"); // true（PHP 8.0+）
str_starts_with("Hello", "He");    // true（PHP 8.0+）
str_ends_with("Hello", "lo");      // true（PHP 8.0+）

// PCRE 正则表达式
$email = "user@example.com";
$pattern = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/';
if (preg_match($pattern, $email)) {
    echo "Valid email";
}

// preg_match_all — 全局匹配
$text = "Order #123 and #456";
preg_match_all('/#(\d+)/', $text, $matches);
// $matches[0]: ["#123", "#456"]
// $matches[1]: ["123", "456"]

// preg_replace — 正则替换
$clean = preg_replace('/\s+/', ' ', 'too   many    spaces');
// "too many spaces"
```

::: warning 警告
处理用户输入的正则表达式时要警惕 ReDoS（正则表达式拒绝服务攻击）。复杂回溯的正则可能导致 PHP-FPM Worker 阻塞。建议对用户提供的正则模式设置超时限制，或使用 `preg_match` 前先做模式复杂度检查。
:::

## 变量作用域与超全局变量

```php
<?php
// 局部作用域
function test() {
    $local = "I'm local";
    echo $local;
}
// echo $local;  // 错误：$local 在函数外部不可访问

// global 关键字
$counter = 0;
function increment() {
    global $counter;
    $counter++;
}
// 或使用 $GLOBALS 超全局数组
function increment2() {
    $GLOBALS['counter']++;
}

// 静态变量 — 函数调用间保持值
function counter(): int {
    static $count = 0;
    return ++$count;
}
echo counter(); // 1
echo counter(); // 2

// 超全局变量（在任何作用域都可访问）
$_GET;      // URL 查询参数
$_POST;     // POST 请求体
$_REQUEST;  // GET + POST + Cookie（不推荐使用）
$_SERVER;   // 服务器和请求信息
$_SESSION;  // Session 数据
$_COOKIE;   // Cookie 数据
$_FILES;    // 上传文件
$_ENV;      // 环境变量
$GLOBALS;   // 所有全局变量的引用
```
