# 服务容器与服务提供者

Laravel 服务容器是依赖解析中心。控制器、队列 Job、事件监听器、命令、策略等对象都可以通过构造方法声明依赖，由容器负责创建和注入。理解容器后，很多“框架自动帮我 new 对象”的现象就清楚了。

## 容器绑定

常见绑定方式：

```php
use App\Contracts\PaymentGateway;
use App\Services\StripePaymentGateway;

$this->app->bind(PaymentGateway::class, StripePaymentGateway::class);
```

`bind` 每次解析都创建新实例，`singleton` 在容器生命周期内复用同一个实例。选择时看对象是否有状态：

| 绑定方式 | 适合对象 | 风险 |
| --- | --- | --- |
| `bind` | 大部分无共享状态服务 | 创建频率较高，但通常可接受 |
| `singleton` | 配置读取器、客户端工厂、昂贵连接封装 | 如果保存请求级状态，长驻进程会串数据 |
| `instance` | 已创建好的实例 | 测试替换时要注意清理 |

Laravel 在传统 PHP-FPM 下每个请求生命周期较短，但在 Octane、队列 Worker、定时任务等长驻进程里，单例保存用户、租户、请求对象会造成严重问题。

## 自动解析

如果类依赖的是具体类，容器通常可以自动解析：

```php
class OrderController
{
    public function __construct(private OrderService $orders)
    {
    }
}
```

如果依赖的是接口，容器不知道应该使用哪个实现，必须显式绑定。日常建议：

- 应用服务可以直接依赖具体类，减少过度抽象。
- 对支付、短信、对象存储、消息推送、第三方 API 这类外部能力，用接口隔离实现。
- 测试中需要替换的依赖，可以用接口、Mock 或容器重新绑定。

## 服务提供者

Service Provider 是注册框架扩展和业务基础设施的入口。它通常有两个阶段：

| 方法 | 阶段 | 应该做什么 |
| --- | --- | --- |
| `register()` | 注册阶段 | 绑定接口与实现、合并配置、注册单例 |
| `boot()` | 启动阶段 | 注册事件监听、路由宏、Blade 指令、策略、模型观察者 |

不要在 `register()` 中依赖其他 Provider 已经启动后的能力。`register()` 更像“把东西放进容器”，`boot()` 更像“所有基础对象准备好后开始接线”。

## 配置读取

Provider 中常见写法：

```php
$this->app->singleton(SmsClient::class, function () {
    return new SmsClient(
        endpoint: config('services.sms.endpoint'),
        token: config('services.sms.token'),
    );
});
```

部署时通常会执行 `php artisan config:cache`，这会把配置合并成缓存文件。上线后不要在业务代码中直接读取 `.env()`，因为配置缓存后 `.env` 不一定按预期参与运行。正确做法是：`.env` 只进入 `config/*.php`，业务代码只读 `config()`。

## 日常落地建议

1. 把第三方 SDK 封装成自己的 Client 或 Gateway，不要在 Controller 中直接使用 SDK。
2. Provider 只注册基础设施，不写业务流程。
3. 长驻进程下谨慎使用单例，尤其不能把当前用户、请求、租户保存到 singleton 服务里。
4. 复杂服务的构造参数来自配置文件，便于环境切换和测试替换。
5. 对容器绑定写一两个集成测试，保证接口能解析出预期实现。
