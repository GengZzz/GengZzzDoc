---
title: "容器、门面与配置"
description: "ThinkPHP 提供容器和门面能力。容器解决对象创建和依赖注入，门面提供静态调用风格但底层仍然可以解析真实对象。理解这两者可以避免项目里到处 new，也能让服务更容易替换和测试。"
---

# 容器、门面与配置

ThinkPHP 提供容器和门面能力。容器解决对象创建和依赖注入，门面提供静态调用风格但底层仍然可以解析真实对象。理解这两者可以避免项目里到处 `new`，也能让服务更容易替换和测试。

## 容器与依赖注入

控制器或服务可以声明依赖：

```php
class OrderController
{
    public function __construct(private OrderService $orders)
    {
    }
}
```

容器会负责创建 `OrderService` 及其依赖。日常建议：

- 业务服务通过构造方法声明依赖，不要在方法内部临时 `new`。
- 第三方客户端、支付、短信、对象存储封装成服务，并在容器中注册。
- 依赖接口时明确绑定实现，便于测试替换。

## 门面 Facade

门面让代码可以写成静态调用：

```php
Cache::set('order:'.$id, $payload, 600);
Db::name('order')->where('id', $id)->find();
```

优点是方便，缺点是隐藏依赖。建议：

- Controller 中少量使用 `Request`、`Cache`、`Log` 可以接受。
- 核心业务服务不要大量依赖 Facade，最好通过构造方法注入服务。
- 测试复杂逻辑时，显式依赖比静态门面更容易替换。

## 配置加载

配置文件通常返回数组：

```php
return [
    'default' => env('database.driver', 'mysql'),
    'connections' => [
        'mysql' => [
            'hostname' => env('database.hostname', '127.0.0.1'),
            'database' => env('database.database', ''),
        ],
    ],
];
```

业务代码读取配置：

```php
$timeout = config('queue.connections.redis.retry_after');
```

不要把配置读取散落在复杂业务内部。更好的方式是在服务构造时读取配置，形成明确参数，这样测试时可以直接传入替代值。

## Provider 与启动扩展

服务提供者适合注册：

- 接口和实现绑定。
- 第三方 SDK 客户端。
- 自定义验证规则。
- 事件监听器。
- 命令行指令。

Provider 中不要写业务流程。它是基础设施接线位置，不是订单、用户、支付这些业务逻辑的执行位置。

## 日常建议

1. 容器负责依赖，业务服务负责流程，模型负责数据。
2. Facade 用于薄层便捷调用，不要让它掩盖核心依赖。
3. 配置要集中，敏感信息只放环境变量。
4. Provider 保持轻量，启动阶段不要做耗时网络请求。
