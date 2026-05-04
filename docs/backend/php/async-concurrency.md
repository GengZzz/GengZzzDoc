# 异步与并发

PHP 传统上是同步阻塞模型：每个请求由一个独立的 PHP-FPM Worker 处理，Worker 在 I/O 操作（数据库查询、HTTP 请求）期间阻塞等待。现代 PHP 通过 Fibers、Swoole 扩展和应用服务器（RoadRunner）提供了异步编程能力。

## PHP 同步阻塞模型

```php
<?php
// 传统 PHP-FPM 模型的 I/O 阻塞问题
// 假设需要调用 3 个外部 API
function fetchDashboard(): array
{
    $user = fetchUserApi();       // 阻塞 100ms
    $orders = fetchOrdersApi();   // 阻塞 150ms
    $stats = fetchStatsApi();     // 阻塞 200ms
    // 总耗时：100 + 150 + 200 = 450ms（串行）
    return compact('user', 'orders', 'stats');
}

// PHP-FPM 进程模型：
// Master 进程 → 管理多个 Worker 进程
// 每个 Worker 进程处理一个请求
// Worker 处理完毕后回到进程池，等待下一个请求
// 没有协程、没有事件循环、无法并发 I/O
```

## Fibers（PHP 8.1+）

Fibers 是 PHP 8.1 引入的协程原语，提供了轻量级的协作式多任务。但 Fiber 本身不提供事件循环和非阻塞 I/O，需要配合异步框架使用。

```php
<?php
declare(strict_types=1);

// 基本 Fiber
$fiber = new Fiber(function(): void {
    echo "Fiber started\n";

    // suspend() 挂起执行，将控制权交回调用方
    Fiber::suspend("Hello from fiber");

    echo "Fiber resumed\n";
    Fiber::suspend("Second message");

    echo "Fiber done\n";
});

// 启动 Fiber
echo $fiber->start();   // "Hello from fiber"
// Fiber 此时处于 suspended 状态

echo $fiber->resume();  // "Second message"，输出 "Fiber resumed"

$fiber->resume();        // "Fiber done"
// Fiber 此时已结束

// Fiber 的返回值和异常
$fiber = new Fiber(function(): string {
    $value = Fiber::suspend(42);
    return "Got: $value";
});

$intermediate = $fiber->start();  // 42
$result = $fiber->resume("hello"); // "Got: hello"

// Fiber 中抛出异常
$fiber = new Fiber(function() {
    throw new RuntimeException("Fiber error");
});

try {
    $fiber->start();
} catch (RuntimeException $e) {
    echo $e->getMessage();  // "Fiber error"
}

// 实际场景：模拟并发 I/O
function async_fetch(string $url, float $delay): Fiber
{
    return new Fiber(function() use ($url, $delay) {
        // suspend，让出执行权（模拟非阻塞）
        Fiber::suspend("fetching: $url");
        // 在实际异步框架中，这里会注册 I/O 回调
        usleep((int)($delay * 1_000_000));
        return "result from $url";
    });
}

$fibers = [
    async_fetch('/api/users', 0.1),
    async_fetch('/api/orders', 0.15),
    async_fetch('/api/stats', 0.2),
];

// 在事件循环中，这些可以真正并发
foreach ($fibers as $fiber) {
    $fiber->start();
}
// 实际调度取决于事件循环实现
```

::: tip 提示
Fiber 本身只是协程调度原语，不包含事件循环和非阻塞 I/O。要实现真正的异步，需要配合 ReactPHP、Amp 或 Swoole 这样的框架。PHP 8.1+ 的 Stream 函数（如 `stream_socket_client`）已经支持 Fiber 感知。
:::

## Swoole 扩展

Swoole 是 PHP 的高性能异步扩展，提供了协程、HTTP Server、TCP Server、MySQL/Redis 异步客户端等。

```php
<?php
// Swoole 协程 HTTP Server
use Swoole\Http\Server;
use Swoole\Http\Request;
use Swoole\Http\Response;

$server = new Server('0.0.0.0', 9501);

// 配置
$server->set([
    'worker_num' => 4,              // Worker 进程数
    'max_request' => 10000,         // 每个 Worker 处理的最大请求数
    'enable_coroutine' => true,     // 启用协程
]);

$server->on('request', function(Request $request, Response $response) {
    // 每个请求在一个协程中处理
    $db = new Swoole\Coroutine\MySQL();
    $db->connect([
        'host' => '127.0.0.1',
        'user' => 'root',
        'password' => '',
        'database' => 'test',
    ]);

    // 协程 MySQL 查询（非阻塞）
    $users = $db->query('SELECT * FROM users LIMIT 10');

    // 协程 HTTP 客户端（非阻塞）
    $cli = new Swoole\Coroutine\Http\Client('api.example.com', 443, true);
    $cli->get('/external-data');
    $externalData = json_decode($cli->getBody(), true);

    $response->header('Content-Type', 'application/json');
    $response->end(json_encode([
        'users' => $users,
        'external' => $externalData,
    ]));
});

$server->start();
```

```php
<?php
// Swoole 协程并发
use Swoole\Coroutine;
use function Swoole\Coroutine\run;

run(function() {
    // 并发执行 3 个数据库查询
    $results = Swoole\Coroutine\batch([
        // 每个查询在独立协程中执行，真正的并发
        function() {
            $redis = new Coroutine\Redis();
            $redis->connect('127.0.0.1', 6379);
            return $redis->hGetAll('user:1');
        },
        function() {
            $mysql = new Coroutine\MySQL();
            $mysql->connect([...]);
            return $mysql->query('SELECT * FROM orders WHERE user_id = 1');
        },
        function() {
            $cli = new Coroutine\Http\Client('api.example.com', 443, true);
            $cli->get('/profile/1');
            return json_decode($cli->getBody(), true);
        },
    ]);

    // 总耗时约等于最慢的那个查询，而非全部之和
    list($userCache, $orders, $externalProfile) = $results;
});
```

## RoadRunner 应由服务器

RoadRunner 是用 Go 编写的高性能 PHP 应用服务器，通过 Supervisor 进程管理 + 协程模型替代 PHP-FPM。

```yaml
# .rr.yaml — RoadRunner 配置
version: "3"
http:
  address: "0.0.0.0:8080"
  pool:
    num_workers: 4
    max_jobs: 1000        # 每个 Worker 最大请求数（防内存泄漏）
    allocate_timeout: 60s
    destroy_timeout: 60s

jobs:
  consume:
    - "default"
    - "processing"
  pool:
    num_workers: 2

kv:
  default:
    driver: memory
    config:
      interval: 10
```

```php
<?php
// PSR-7 兼容的请求处理
use Spiral\RoadRunner\Http\PSR7Worker;

$worker = RoadRunner\Worker::create();
$psr7 = new PSR7Worker($worker);

while ($request = $psr7->waitRequest()) {
    try {
        $response = new \Nyholm\Psr7\Response();
        $response->getBody()->write(json_encode(['status' => 'ok']));
        $psr7->respond($response);
    } catch (Throwable $e) {
        $psr7->getWorker()->error($e->getMessage());
    }
}
```

::: tip 提示
RoadRunner 相比 Swoole 的优势：1）PSR-7/PSR-15 兼容，现有 Laravel/Symfony 应用可无缝迁移；2）Go 实现，稳定性好；3）内置 Jobs 功能，可替代 Laravel Queue Worker。Swoole 的优势：更高性能（纯 C 扩展）、更丰富的底层 API。
:::

## 与传统 PHP-FPM 模型对比

| 特性 | PHP-FPM | Swoole | RoadRunner |
|------|---------|--------|------------|
| 进程模型 | 一请求一进程 | 事件驱动多协程 | Go Supervisor + PHP Worker |
| 内存 | 每进程独立 | 共享内存 | 每 Worker 独立 |
| 启动开销 | 每次请求加载框架 | 启动时加载一次 | 启动时加载一次 |
| 代码热更新 | 自动（新进程） | 需要 reload | 需要 reload |
| 并发 I/O | 不支持 | 原生协程 | 需要 Fiber |
| 生态兼容 | 完美 | 需要适配 | PSR 兼容 |
| 适用场景 | 传统 Web | 高并发 API/微服务 | Laravel 生态 |

```php
<?php
// ReactPHP — 纯 PHP 异步框架
require 'vendor/autoload.php';

use React\EventLoop\Loop;
use React\Http\Browser;

$loop = Loop::get();
$browser = new Browser($loop);

// 并发请求
$promises = [
    $browser->get('https://api.example.com/users'),
    $browser->get('https://api.example.com/orders'),
    $browser->get('https://api.example.com/stats'),
];

React\Promise\all($promises)->then(function(array $responses) {
    foreach ($responses as $response) {
        echo $response->getBody();
    }
});

$loop->run();
```
