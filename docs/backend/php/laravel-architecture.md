# Laravel 架构

Laravel 是 PHP 生态中最流行的全栈框架。理解其内部架构——从请求入口到响应返回——是掌握 Laravel 开发的关键。

## 请求生命周期

一个 HTTP 请求在 Laravel 中经过的完整路径：

```
客户端请求
  → public/index.php（入口文件）
  → bootstrap/app.php（创建 Application 容器）
  → HTTP Kernel（handle 方法）
    → 全局中间件（如 HandleCors, TrustProxies）
    → 路由中间件
    → 路由匹配
    → 控制器/闭包执行
    → Response 生成
  → 中间件返回（洋葱外层）
  → 发送响应
```

<PhpRequestLifecycleDemo />

```php
<?php
// public/index.php — Laravel 入口文件
require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

// 通过 Kernel 处理请求
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();  // 发送响应到客户端

$kernel->terminate($request, $response);  // 终止中间件（after middleware）
```

## 服务容器原理

服务容器是 Laravel 的核心，负责管理类的依赖注入和生命周期。

```php
<?php
// === 绑定 ===

// 简单绑定
app()->bind(PaymentGateway::class, StripeGateway::class);

// 单例绑定（全局只有一个实例）
app()->singleton(CacheManager::class, function($app) {
    return new CacheManager($app['config']['cache']);
});

// 实例绑定（直接提供实例）
app()->instance('config', $configArray);

// 绑定接口到实现
app()->bind(
    'App\Contracts\UserRepositoryInterface',
    'App\Repositories\EloquentUserRepository'
);

// === 解析 ===

// 自动解析（根据类型提示自动注入）
class UserController
{
    public function __construct(
        private UserService $userService,  // 容器自动实例化
        private Logger $logger              // 自动注入
    ) {}
}

// 手动解析
$gateway = app(PaymentGateway::class);
$cache = app('cache');  // 使用字符串键

// === 上下文绑定 ===
// 不同场景绑定不同实现
app()->when(PhotoController::class)
    ->needs(Filesystem::class)
    ->give(function() {
        return Storage::disk('photos');
    });

app()->when(VideoController::class)
    ->needs(Filesystem::class)
    ->give(function() {
        return Storage::disk('videos');
    });
```

::: tip 提示
服务容器的核心是 `resolve()` 方法：当请求一个类时，容器检查该类是否有依赖（通过反射读取构造函数参数），递归解析所有依赖，最终创建实例。这就是依赖注入（DI）和控制反转（IoC）的实现。
:::

## 服务提供者注册机制

```php
<?php
// 服务提供者是 Laravel 的引导机制
class AppServiceProvider extends ServiceProvider
{
    // 注册阶段 — 只注册到容器，不使用其他服务
    public function register(): void
    {
        $this->app->singleton(GithubClient::class, function($app) {
            return new GithubClient($app['config']['services.github']);
        });
    }

    // 启动阶段 — 所有服务提供者注册完成后执行
    public function boot(): void
    {
        // 注册模型观察者
        User::observe(UserObserver::class);

        // 注册视图 Composer
        View::composer('layouts.*', function($view) {
            $view->with('currentUser', auth()->user());
        });

        // 发布配置文件
        $this->publishes([
            __DIR__.'/../config/my-package.php' => config_path('my-package.php'),
        ]);

        // 注册路由（如果是包开发）
        if ($this->app->routesAreCached()) {
            $this->app->booted(function () {
                require $this->app->getCachedRoutesPath();
            });
        }
    }
}

// 服务提供者加载顺序（在 config/app.php 的 providers 数组中定义）
// 1. 环境检测（DetectEnvironment）
// 2. 加载配置（LoadConfiguration）
// 3. 配置日志（ConfigureLogging）
// 4. 处理异常（HandleExceptions）
// 5. 注册 Facades（RegisterFacades）
// 6. 注册服务提供者（RegisterProviders）
// 7. 启动服务提供者（BootProviders）
```

## Facade 原理

Facade 提供了静态方法调用的语法糖，底层通过 `__callStatic` 魔术方法委托给容器中的服务实例。

```php
<?php
// Facade 基类
abstract class Facade
{
    protected static $app;        // 容器实例
    protected static $resolvedInstances = [];  // 已解析实例缓存

    // 静态方法调用时触发
    public static function __callStatic(string $method, array $args)
    {
        $instance = static::getFacadeRoot();
        return $instance->$method(...$args);
    }

    // 获取底层实例
    protected static function getFacadeRoot(): mixed
    {
        $name = static::getFacadeAccessor();
        return static::resolvedInstances[$name]
            ?? static::resolvedInstances[$name] = static::$app->make($name);
    }

    // 子类必须实现：返回容器中的绑定键
    abstract protected static function getFacadeAccessor(): string;
}

// Cache Facade 示例
class Cache extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'cache';  // 容器中 'cache' 绑定的实例
    }
}

// 使用时：Cache::get('key')
// 实际调用：app('cache')->get('key')
// 不是真正的静态调用，而是通过 __callStatic 代理

// Facade vs 依赖注入
// Facade：简洁、适合快速开发
// DI：可测试性强、依赖明确、适合复杂业务逻辑
```

::: warning 警告
Facade 的问题是隐藏了类的真实依赖。在单元测试中，需要使用 `Cache::shouldReceive()` 进行 Mock，而不是简单地注入一个假对象。对于核心业务逻辑，推荐使用依赖注入而非 Facade。
:::

## 中间件管道（洋葱模型）

```php
<?php
// 中间件管道的实现原理
// 请求从外到内穿过每一层中间件，响应从内到外返回

class HandleCors
{
    public function handle(Request $request, Closure $next): Response
    {
        // 进入时：检查 CORS
        if ($request->isMethod('OPTIONS')) {
            return $this->preflightResponse($request);
        }

        // 调用下一个中间件（$next）
        $response = $next($request);

        // 返回时：添加 CORS 头
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');

        return $response;
    }
}

class ThrottleRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        // 进入时：检查限流
        $key = $request->ip();
        if (RateLimiter::tooManyAttempts($key, 60)) {
            return response('Too Many Requests', 429);
        }

        RateLimiter::hit($key, 60);
        $response = $next($request);

        // 返回时：添加限流 Header
        $response->headers->set('X-RateLimit-Remaining', RateLimiter::remaining($key, 60));

        return $response;
    }
}

// 路由中间件注册
// bootstrap/app.php (Laravel 11+)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'auth' => \App\Http\Middleware\Authenticate::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
    ]);
})

// 管道的底层实现（简化版）
class Pipeline
{
    public function then(Closure $destination)
    {
        $pipeline = array_reduce(
            array_reverse($this->pipes),
            function($next, $pipe) {
                return function($request) use ($pipe, $next) {
                    return $pipe->handle($request, $next);
                };
            },
            $destination
        );
        return $pipeline($this->passable);
    }
}
```

## 路由系统

```php
<?php
// 基本路由
Route::get('/users', [UserController::class, 'index']);
Route::post('/users', [UserController::class, 'store']);
Route::get('/users/{user}', [UserController::class, 'show']);
Route::put('/users/{user}', [UserController::class, 'update']);
Route::delete('/users/{user}', [UserController::class, 'destroy']);

// 赯由资源（自动生成 CRUD 路由）
Route::apiResource('users', UserController::class);
// 自动生成 5 条路由：index, store, show, update, destroy

// 路由参数约束
Route::get('/users/{user}', [UserController::class, 'show'])
    ->where('user', '[0-9]+');

Route::get('/posts/{post:slug}', [PostController::class, 'show']);
// 使用 slug 列查找而不是 id

// 路由模型绑定（自动将 ID 转为模型实例）
class UserController
{
    public function show(User $user): JsonResponse
    {
        // $user 已经是通过 URL 中的 ID 查找到的 User 模型实例
        return response()->json($user);
    }
}

// 路由缓存（生产环境提升路由注册速度）
php artisan route:cache
php artisan route:clear
```
