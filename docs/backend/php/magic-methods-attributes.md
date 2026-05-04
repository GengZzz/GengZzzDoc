# 魔术方法与属性

PHP 提供了一组特殊的方法（Magic Methods），在特定条件下自动调用。配合 ArrayAccess、Iterator 等接口，可以实现高度灵活的对象行为。PHP 8.0 引入的 Attributes（属性注解）替代了文档注释中的元数据方案。

## 魔术方法

```php
<?php
declare(strict_types=1);

class Config
{
    private array $data = [];
    private array $modified = [];

    // __get — 访问不可访问（protected/private/未定义）属性时触发
    public function __get(string $name): mixed
    {
        return $this->data[$name] ?? null;
    }

    // __set — 给不可访问属性赋值时触发
    public function __set(string $name, mixed $value): void
    {
        $this->data[$name] = $value;
        $this->modified[$name] = true;
    }

    // __isset — 对不可访问属性调用 isset() 或 empty() 时触发
    public function __isset(string $name): bool
    {
        return isset($this->data[$name]);
    }

    // __unset — 对不可访问属性调用 unset() 时触发
    public function __unset(string $name): void
    {
        unset($this->data[$name]);
    }

    // __call — 调用不可访问方法时触发
    public function __call(string $method, array $args): mixed
    {
        // 实现 getter/setter 魔术方法
        if (str_starts_with($method, 'get')) {
            $key = lcfirst(substr($method, 3));
            return $this->data[$key] ?? null;
        }
        if (str_starts_with($method, 'set')) {
            $key = lcfirst(substr($method, 3));
            $this->data[$key] = $args[0];
            return $this;
        }
        throw new BadMethodCallException("Method {$method} does not exist");
    }

    // __callStatic — 调用不可访问的静态方法时触发
    public static function __callStatic(string $method, array $args): mixed
    {
        throw new BadMethodCallException("Static method {$method} does not exist");
    }

    // __toString — 对象被当作字符串使用时触发
    public function __toString(): string
    {
        return json_encode($this->data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }

    // __clone — 对象被 clone 时触发
    public function __clone()
    {
        // 深拷贝嵌套对象
        foreach ($this->data as $key => $value) {
            if (is_object($value)) {
                $this->data[$key] = clone $value;
            }
        }
    }

    // __debugInfo — var_dump() 时调用
    public function __debugInfo(): array
    {
        return [
            'data' => $this->data,
            'modified_keys' => array_keys($this->modified),
        ];
    }
}

$config = new Config();
$config->name = "App";               // __set
echo $config->name;                   // __get → "App"
echo $config->getName();              // __call → "App"
echo $config;                         // __toString
$copy = clone $config;               // __clone
```

::: tip 提示
魔术方法虽然灵活，但过度使用会降低代码可读性和 IDE 支持。`__get`/`__set` 会导致类型检查失效、IDE 无法自动补全。建议只在框架底层（如 Eloquent Model、ORM 映射）使用。
:::

## ArrayAccess 接口

实现 `ArrayAccess` 接口的对象可以用数组语法访问。

```php
<?php
declare(strict_types=1);

class Collection implements ArrayAccess, Countable, IteratorAggregate
{
    private array $items;

    public function __construct(array $items = [])
    {
        $this->items = $items;
    }

    // ArrayAccess 接口
    public function offsetExists(mixed $offset): bool
    {
        return isset($this->items[$offset]);
    }

    public function offsetGet(mixed $offset): mixed
    {
        return $this->items[$offset] ?? null;
    }

    public function offsetSet(mixed $offset, mixed $value): void
    {
        if ($offset === null) {
            $this->items[] = $value;
        } else {
            $this->items[$offset] = $value;
        }
    }

    public function offsetUnset(mixed $offset): void
    {
        unset($this->items[$offset]);
    }

    // Countable 接口
    public function count(): int
    {
        return count($this->items);
    }

    // IteratorAggregate 接口
    public function getIterator(): Traversable
    {
        return new ArrayIterator($this->items);
    }

    // 链式操作方法
    public function filter(callable $callback): static
    {
        return new static(array_filter($this->items, $callback, ARRAY_FILTER_USE_BOTH));
    }

    public function map(callable $callback): static
    {
        return new static(array_map($callback, $this->items));
    }

    public function toArray(): array
    {
        return $this->items;
    }
}

// 使用数组语法
$collection = new Collection(['a' => 1, 'b' => 2, 'c' => 3]);
echo $collection['a'];           // 1（offsetGet）
$collection['d'] = 4;            // offsetSet
isset($collection['b']);          // true（offsetExists）
unset($collection['b']);          // offsetUnset
count($collection);               // 3（Countable）

// foreach 支持（IteratorAggregate）
foreach ($collection as $key => $value) {
    echo "$key => $value\n";
}

// 链式调用
$result = $collection
    ->filter(fn($v) => $v > 1)
    ->map(fn($v) => $v * 10)
    ->toArray();
```

## PHP 8 Attributes（属性注解）

Attributes 替代了基于文档注释的注解方案（如 Doctrine Annotations），提供了原生的元数据支持。

```php
<?php
declare(strict_types=1);

// 定义 Attribute 类
use Attribute;

#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
class Route
{
    public function __construct(
        public readonly string $path,
        public readonly string $method = 'GET',
        public readonly array $middleware = []
    ) {}
}

#[Attribute(Attribute::TARGET_PARAMETER)]
class Validate
{
    public function __construct(
        public readonly string $rule,
        public readonly ?string $message = null
    ) {}
}

#[Attribute(Attribute::TARGET_CLASS)]
class Controller
{
    public function __construct(
        public readonly string $prefix = ''
    ) {}
}

// 使用 Attributes
#[Controller(prefix: '/api/users')]
class UserController
{
    #[Route(path: '/api/users', method: 'GET')]
    public function index(): array
    {
        return User::all()->toArray();
    }

    #[Route(path: '/api/users/{id}', method: 'GET')]
    public function show(
        #[Validate('required|integer')]
        int $id
    ): User {
        return User::findOrFail($id);
    }

    #[Route(path: '/api/users', method: 'POST', middleware: ['auth', 'throttle'])]
    public function store(): User
    {
        return User::create(request()->all());
    }
}

// 通过反射读取 Attributes
$reflection = new ReflectionClass(UserController::class);
$attributes = $reflection->getAttributes(Controller::class);

foreach ($attributes as $attribute) {
    $controller = $attribute->newInstance();
    echo "Prefix: " . $controller->prefix . "\n";
}

// 读取方法上的 Attributes
foreach ($reflection->getMethods() as $method) {
    $routeAttrs = $method->getAttributes(Route::class);
    foreach ($routeAttrs as $routeAttr) {
        $route = $routeAttr->newInstance();
        echo "{$route->method} {$route->path} → {$method->name}()\n";
    }
}
```

::: tip 提示
PHP 8 的 Attributes 是真正的语言特性，不是注释解析。Attribute 类必须使用 `#[Attribute]` 标记，通过反射 API (`ReflectionClass::getAttributes()`) 读取。相比 Doctrine Annotations，它有 IDE 支持、类型安全、不依赖外部库等优势。
:::

## ReflectionAttribute

```php
<?php
declare(strict_types=1);

// 实际应用：路由注册系统
class Router
{
    private array $routes = [];

    public function registerController(string $controllerClass): void
    {
        $reflection = new ReflectionClass($controllerClass);
        $prefix = '';

        // 读取类级别的 Controller attribute
        $controllerAttrs = $reflection->getAttributes(Controller::class);
        if ($controllerAttrs) {
            $prefix = $controllerAttrs[0]->newInstance()->prefix;
        }

        // 读取每个方法上的 Route attribute
        foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            $routeAttrs = $method->getAttributes(Route::class);
            foreach ($routeAttrs as $attr) {
                $route = $attr->newInstance();
                $fullPath = $prefix . $route->path;
                $this->routes[] = [
                    'method' => $route->method,
                    'path' => $fullPath,
                    'controller' => $controllerClass,
                    'action' => $method->getName(),
                    'middleware' => $route->middleware,
                ];
            }
        }
    }

    public function dispatch(string $method, string $path): mixed
    {
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $this->matchPath($route['path'], $path)) {
                $controller = new $route['controller'];
                return $controller->{$route['action']}(...$this->extractParams($route['path'], $path));
            }
        }
        throw new RuntimeException("Route not found: $method $path");
    }

    private function matchPath(string $pattern, string $path): bool
    {
        $regex = preg_replace('/\{(\w+)\}/', '([^/]+)', $pattern);
        return (bool) preg_match("#^{$regex}$#", $path);
    }

    private function extractParams(string $pattern, string $path): array
    {
        $regex = preg_replace('/\{(\w+)\}/', '([^/]+)', $pattern);
        preg_match("#^{$regex}$#", $path, $matches);
        array_shift($matches);
        return $matches;
    }
}
```
