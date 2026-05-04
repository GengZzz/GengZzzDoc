# 类与对象

PHP 的面向对象系统从 PHP 5 开始成熟，PHP 7.4 引入类型化属性，PHP 8.0 引入构造器提升（Constructor Promotion），PHP 8.1 引入只读属性（readonly），使得类定义越来越简洁。

## 类定义与类型化属性

```php
<?php
declare(strict_types=1);

// 基本类定义
class User
{
    // 类型化属性（PHP 7.4+）
    public int $id;
    public string $name;
    public string $email;
    public ?string $avatar = null;  // 可空属性，有默认值 null
    private DateTimeImmutable $createdAt;

    // readonly 属性（PHP 8.1+）— 初始化后不可修改
    public readonly string $uuid;

    public function __construct(
        int $id,
        string $name,
        string $email
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->createdAt = new DateTimeImmutable();
        $this->uuid = bin2hex(random_bytes(16));
    }
}

// 构造器提升（PHP 8.0+）— 参数直接声明为属性
class Product
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public float $price,
        private int $stock = 0,
        public readonly string $category = 'general'
    ) {}

    public function isAvailable(): bool
    {
        return $this->stock > 0;
    }
}

$p = new Product(id: 1, name: 'Widget', price: 9.99, stock: 100);
echo $p->name;  // "Widget"
// $p->id = 2;  // Error: readonly 属性不可修改
```

::: tip 提示
构造器提升是 PHP 8.0 最实用的特性之一。它将属性声明和构造函数参数合并，减少了大量样板代码。结合 `readonly`，可以轻松创建不可变值对象（Value Object）。
:::

## 静态成员与常量

```php
<?php
declare(strict_types=1);

class Config
{
    // 类常量 — 编译时确定，不可修改
    public const MAX_RETRIES = 3;
    public const ENV_PRODUCTION = 'production';
    public const ENV_DEVELOPMENT = 'development';

    // 常量也可以是数组（PHP 5.6+）或表达式（PHP 8.0+）
    public const DEFAULT_HEADERS = [
        'Content-Type' => 'application/json',
        'Accept' => 'application/json',
    ];

    // Late Static Binding（后期静态绑定）的静态属性
    private static ?Config $instance = null;
    private array $data = [];

    private function __construct(array $data = [])
    {
        $this->data = $data;
    }

    // 单例模式
    public static function getInstance(): static
    {
        if (self::$instance === null) {
            self::$instance = new static();
        }
        return self::$instance;
    }

    public static function fromEnv(): static
    {
        return new static([
            'debug' => (bool) ($_ENV['APP_DEBUG'] ?? false),
            'db_host' => $_ENV['DB_HOST'] ?? 'localhost',
        ]);
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->data[$key] ?? $default;
    }
}

// 访问常量
echo Config::MAX_RETRIES;  // 3

// 常量也可以用 constant() 动态访问
$constName = 'Config::MAX_RETRIES';
echo constant($constName);  // 3

// static::class 获取完全限定类名
echo Config::class;  // "Config"
```

## final 类与方法

```php
<?php
declare(strict_types=1);

// final 类 — 不可被继承
final class Money
{
    public function __construct(
        private readonly float $amount,
        private readonly string $currency
    ) {}

    public function add(Money $other): Money
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException("Currency mismatch");
        }
        return new Money($this->amount + $other->amount, $this->currency);
    }

    public function __toString(): string
    {
        return sprintf('%.2f %s', $this->amount, $this->currency);
    }
}
// class USD extends Money {}  // Error: Cannot extend final class

// final 方法 — 不可被子类覆盖
class BaseService
{
    // 模板方法模式：final 保证执行流程不被改变
    final public function execute(): void
    {
        $this->validate();
        $this->process();
        $this->cleanup();
    }

    protected function validate(): void
    {
        // 子类可以覆盖
    }

    abstract protected function process(): void;

    protected function cleanup(): void
    {
        // 子类可以覆盖
    }
}
```

## trait 机制与冲突解决

trait 是 PHP 实现代码复用的方式，解决了单继承的限制。

```php
<?php
declare(strict_types=1);

// 定义 trait
trait Timestampable
{
    private ?DateTimeImmutable $createdAt = null;
    private ?DateTimeImmutable $updatedAt = null;

    public function markCreated(): void
    {
        $this->createdAt = new DateTimeImmutable();
    }

    public function markUpdated(): void
    {
        $this->updatedAt = new DateTimeImmutable();
    }

    public function getCreatedAt(): ?DateTimeImmutable
    {
        return $this->createdAt;
    }
}

trait SoftDeletable
{
    private ?DateTimeImmutable $deletedAt = null;

    public function softDelete(): void
    {
        $this->deletedAt = new DateTimeImmutable();
    }

    public function isDeleted(): bool
    {
        return $this->deletedAt !== null;
    }

    public function restore(): void
    {
        $this->deletedAt = null;
    }
}

// 使用多个 trait
class Post
{
    use Timestampable, SoftDeletable;

    public function __construct(
        public readonly string $title,
        public readonly string $content
    ) {
        $this->markCreated();
    }
}

// trait 冲突解决
trait Logger
{
    public function log(string $msg): void
    {
        echo "[LOG] $msg\n";
    }
}

trait Auditor
{
    public function log(string $msg): void
    {
        echo "[AUDIT] $msg\n";
    }
}

class Order
{
    // 使用 insteadof 指定优先使用的 trait
    use Logger, Auditor {
        Logger::log insteadof Auditor;    // log() 使用 Logger 的实现
        Auditor::log as auditLog;         // Auditor::log 重命名为 auditLog
    }
}

$order = new Order();
$order->log("event");       // "[LOG] event"
$order->auditLog("event");  // "[AUDIT] event"
```

::: tip 提示
trait 是编译时的代码复制，不是运行时的继承。当你使用 `use TraitA, TraitB` 时，PHP 会将 trait 的方法直接复制到类中。因此 trait 中的属性和方法可以与类成员无缝交互。
:::

## 匿名类

```php
<?php
declare(strict_types=1);

// 匿名类适用于一次性使用的场景
interface CacheDriver
{
    public function get(string $key): mixed;
    public function set(string $key, mixed $value, int $ttl = 0): void;
}

// 创建匿名类实现接口
function createMemoryCache(): CacheDriver
{
    return new class implements CacheDriver {
        private array $store = [];

        public function get(string $key): mixed
        {
            $entry = $this->store[$key] ?? null;
            if ($entry === null) return null;
            if ($entry['expires'] > 0 && $entry['expires'] < time()) {
                unset($this->store[$key]);
                return null;
            }
            return $entry['value'];
        }

        public function set(string $key, mixed $value, int $ttl = 0): void
        {
            $this->store[$key] = [
                'value' => $value,
                'expires' => $ttl > 0 ? time() + $ttl : 0,
            ];
        }
    };
}

$cache = createMemoryCache();
$cache->set('user:1', ['name' => 'Alice'], 3600);
$user = $cache->get('user:1');
```

## 属性提升与联合类型属性

```php
<?php
declare(strict_types=1);

// PHP 8.0+ 属性支持联合类型
class ApiResponse
{
    public function __construct(
        public readonly int $code,
        public readonly string $message,
        public readonly array|object|null $data = null,
        public readonly array $errors = []
    ) {}

    public static function success(mixed $data): static
    {
        return new static(code: 200, message: 'OK', data: $data);
    }

    public static function error(string $message, array $errors = []): static
    {
        return new static(code: 400, message: $message, errors: $errors);
    }

    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'message' => $this->message,
            'data' => $this->data,
            'errors' => $this->errors,
        ];
    }
}

// 使用
$response = ApiResponse::success(['id' => 1, 'name' => 'Alice']);
echo json_encode($response->toArray());

// 属性 hooks（PHP 8.4 提案中的特性，当前需要手动实现）
class Temperature
{
    private float $celsius;

    public function __construct(float $celsius)
    {
        $this->setCelsius($celsius);
    }

    public function getCelsius(): float
    {
        return $this->celsius;
    }

    public function setCelsius(float $value): void
    {
        if ($value < -273.15) {
            throw new InvalidArgumentException("Temperature below absolute zero");
        }
        $this->celsius = $value;
    }

    public function getFahrenheit(): float
    {
        return $this->celsius * 9 / 5 + 32;
    }
}
```
