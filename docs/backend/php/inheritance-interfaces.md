# 继承与接口

PHP 使用单继承模型——每个类只能继承一个父类，但可以实现多个接口。配合 trait 可以达到类似多继承的效果。

## 继承基础

```php
<?php
declare(strict_types=1);

class Animal
{
    public function __construct(
        protected string $name,
        protected int $age
    ) {}

    public function speak(): string
    {
        return "{$this->name} makes a sound";
    }

    public function getName(): string
    {
        return $this->name;
    }
}

class Dog extends Animal
{
    public function __construct(
        string $name,
        int $age,
        private string $breed
    ) {
        parent::__construct($name, $age);
    }

    // 方法覆盖
    public function speak(): string
    {
        return "{$this->name} barks!";
    }

    // 新增方法
    public function fetch(): string
    {
        return "{$this->name} fetches the ball";
    }
}

$dog = new Dog("Rex", 3, "Labrador");
echo $dog->speak();     // "Rex barks!"
echo $dog->getName();   // "Rex"（继承自 Animal）

// instanceof 检查
var_dump($dog instanceof Animal);  // true
var_dump($dog instanceof Dog);     // true
```

## 抽象类

```php
<?php
declare(strict_types=1);

// 抽象类 — 不能实例化，子类必须实现抽象方法
abstract class PaymentGateway
{
    protected array $config;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    // 抽象方法 — 只有签名，没有实现
    abstract public function charge(float $amount, string $currency): PaymentResult;
    abstract public function refund(string $transactionId): bool;

    // 普通方法 — 提供共享逻辑
    public function validateAmount(float $amount): bool
    {
        return $amount > 0 && $amount <= $this->getMaxAmount();
    }

    protected function getMaxAmount(): float
    {
        return (float) ($this->config['max_amount'] ?? 10000);
    }
}

class PaymentResult
{
    public function __construct(
        public readonly bool $success,
        public readonly string $transactionId,
        public readonly ?string $error = null
    ) {}
}

class StripeGateway extends PaymentGateway
{
    public function charge(float $amount, string $currency): PaymentResult
    {
        if (!$this->validateAmount($amount)) {
            return new PaymentResult(success: false, transactionId: '', error: 'Invalid amount');
        }
        // Stripe API 调用逻辑
        return new PaymentResult(success: true, transactionId: 'txn_abc123');
    }

    public function refund(string $transactionId): bool
    {
        // Stripe 退款逻辑
        return true;
    }
}
```

## 接口

接口定义契约（contract），规定实现类必须具备的方法。

```php
<?php
declare(strict_types=1);

// 基本接口
interface CacheInterface
{
    public function get(string $key, mixed $default = null): mixed;
    public function set(string $key, mixed $value, int $ttl = 0): bool;
    public function delete(string $key): bool;
    public function has(string $key): bool;
}

// 接口可以继承接口
interface TaggableCacheInterface extends CacheInterface
{
    public function setByTag(string $tag, string $key, mixed $value, int $ttl = 0): bool;
    public function getByTag(string $tag): array;
    public function flushByTag(string $tag): bool;
}

// 实现接口
class RedisCache implements TaggableCacheInterface
{
    public function __construct(
        private Redis $redis,
        private string $prefix = 'cache:'
    ) {}

    public function get(string $key, mixed $default = null): mixed
    {
        $value = $this->redis->get($this->prefix . $key);
        return $value !== false ? unserialize($value) : $default;
    }

    public function set(string $key, mixed $value, int $ttl = 0): bool
    {
        $serialized = serialize($value);
        if ($ttl > 0) {
            return $this->redis->setex($this->prefix . $key, $ttl, $serialized);
        }
        return $this->redis->set($this->prefix . $key, $serialized);
    }

    public function delete(string $key): bool
    {
        return $this->redis->del($this->prefix . $key) > 0;
    }

    public function has(string $key): bool
    {
        return $this->redis->exists($this->prefix . $key) > 0;
    }

    public function setByTag(string $tag, string $key, mixed $value, int $ttl = 0): bool
    {
        $this->redis->sAdd($this->prefix . "tag:$tag", $key);
        return $this->set($key, $value, $ttl);
    }

    public function getByTag(string $tag): array
    {
        $keys = $this->redis->sMembers($this->prefix . "tag:$tag");
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $this->get($key);
        }
        return $result;
    }

    public function flushByTag(string $tag): bool
    {
        $keys = $this->redis->sMembers($this->prefix . "tag:$tag");
        foreach ($keys as $key) {
            $this->delete($key);
        }
        $this->redis->del($this->prefix . "tag:$tag");
        return true;
    }
}
```

## 接口默认方法（PHP 8.0+）

PHP 8.0 允许在接口中定义带实现的方法（默认方法），类似于 Java 8 的 default methods。

```php
<?php
declare(strict_types=1);

interface Logger
{
    public function log(string $level, string $message, array $context = []): void;

    // 默认方法 — 提供便捷实现
    public function info(string $message, array $context = []): void
    {
        $this->log('info', $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log('error', $message, $context);
    }

    public function warning(string $message, array $context = []): void
    {
        $this->log('warning', $message, $context);
    }
}

// 实现类只需实现核心方法，info/error/warning 有默认实现
class FileLogger implements Logger
{
    public function __construct(private string $logFile) {}

    public function log(string $level, string $message, array $context = []): void
    {
        $line = sprintf("[%s] [%s] %s\n", date('Y-m-d H:i:s'), strtoupper($level), $message);
        file_put_contents($this->logFile, $line, FILE_APPEND);
    }
    // info()、error()、warning() 使用默认实现
}
```

## trait vs 接口 vs 抽象类

| 特性 | 接口 | 抽象类 | trait |
|------|------|--------|-------|
| 多实现 | 支持 | 不支持（单继承） | 支持多个 trait |
| 属性 | 不能有 | 可以有 | 可以有 |
| 方法实现 | 默认方法（PHP 8.0+） | 可以有 | 完全支持 |
| 构造函数 | 不能有 | 可以有 | 不能有 |
| 访问修饰符 | 都是 public | 支持所有 | 支持所有 |
| 用途 | 定义契约 | 部分实现+模板方法 | 代码复用 |

```php
<?php
// 最佳实践组合：
// 接口定义契约
interface Loggable
{
    public function toLog(): string;
}

// trait 提供通用实现
trait HasTimestamps
{
    protected DateTimeImmutable $createdAt;
    protected ?DateTimeImmutable $updatedAt = null;

    public function touch(): void
    {
        $this->updatedAt = new DateTimeImmutable();
    }
}

// 抽象类提供骨架实现
abstract class Entity
{
    use HasTimestamps;

    abstract public function getId(): int|string;
}

// 具体类
class Order extends Entity implements Loggable
{
    public function __construct(
        private int $id,
        private float $amount
    ) {
        $this->createdAt = new DateTimeImmutable();
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function toLog(): string
    {
        return "Order #{$this->id}: \${$this->amount}";
    }
}
```

## 后期静态绑定（static::）

PHP 的静态方法绑定分为早期绑定（`self::`）和后期绑定（`static::`）。

```php
<?php
declare(strict_types=1);

class BaseModel
{
    protected static string $table = 'base';

    public static function getTable(): string
    {
        return static::$table;  // 后期静态绑定
    }

    public static function getTableSelf(): string
    {
        return self::$table;    // 早期绑定
    }

    // 实际场景：Active Record 查询
    public static function find(int $id): ?static
    {
        $table = static::$table;
        $row = DB::query("SELECT * FROM {$table} WHERE id = ?", [$id]);
        return $row ? new static($row) : null;
    }

    public static function query(): static
    {
        return new static();  // static 关键字返回当前类实例
    }
}

class User extends BaseModel
{
    protected static string $table = 'users';
}

class Post extends BaseModel
{
    protected static string $table = 'posts';
}

echo User::getTable();      // "users"（static 后期绑定到 User::$table）
echo User::getTableSelf();  // "base"  （self 始终绑定到 BaseModel::$table）
echo Post::getTable();      // "posts"

// static:: 也用于返回类型
$user = User::find(1);  // 返回 User 实例，不是 BaseModel
```

::: warning 警告
`self::` 在编译时绑定，始终引用定义该方法的类。`static::` 在运行时绑定，引用实际调用的类。在继承体系中，涉及静态属性或方法重写时，几乎总是应该使用 `static::`。
:::
