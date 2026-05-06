<script setup>
import LaravelRequestLifecycleDemo from '../../../.vitepress/theme/components/LaravelRequestLifecycleDemo.vue'
</script>

# 请求生命周期与中间件

一次 Laravel 请求从 `public/index.php` 进入，经过应用启动、HTTP Kernel、中间件管道、路由匹配、控制器执行、响应返回和终止中间件。难点不在于背流程，而是知道每一层适合放什么逻辑。

<LaravelRequestLifecycleDemo />

## 生命周期拆解

核心链路：

1. **入口文件**：`public/index.php` 加载 Composer autoload 和 Bootstrap。
2. **创建应用**：加载容器、配置、Provider，准备异常处理和 HTTP Kernel。
3. **HTTP Kernel**：接收 Request，把请求送入中间件管道。
4. **全局中间件**：处理维护模式、代理、CORS、TrimStrings、空字符串转换等。
5. **路由匹配**：根据 method、path、domain、prefix 匹配路由。
6. **路由中间件**：处理鉴权、权限、限流、绑定替换、签名校验。
7. **控制器或闭包**：调用业务用例，返回数组、Resource、View、Response。
8. **响应回程**：中间件可以继续加工响应，例如加 header、记录日志。
9. **terminate**：响应发送后执行收尾逻辑，适合轻量日志，不适合重任务。

## 中间件适合放什么

中间件适合处理“横切关注点”：

- 请求身份识别：登录态、token、租户、语言。
- 通用安全策略：CSRF、签名、来源校验。
- 访问控制前置判断：是否需要订阅、是否允许访问后台。
- 限流和幂等：按用户、IP、API key 做限制。
- 上下文注入：把 trace id、tenant id 放进日志上下文。

中间件不适合承载业务流程。比如“订单审批后扣库存、发通知、写审计”不应该写在中间件里，而应该是应用服务、事件或 Job 的职责。

## 控制器粒度

控制器常见坏味道是越来越胖：

```php
public function store(Request $request)
{
    // 校验、查用户、算价格、开事务、扣库存、发消息、写日志都在这里
}
```

更可维护的拆法：

```php
public function store(StoreOrderRequest $request, CreateOrderAction $action)
{
    $order = $action->handle($request->user(), $request->validated());

    return new OrderResource($order);
}
```

控制器负责协议边界：拿到已校验数据、调用用例、返回 Resource。业务动作由 Action 或 Service 承接，事务边界也更容易集中。

## 响应设计

API 项目建议统一响应资源：

```php
return new OrderResource($order->load('items.product'));
```

Resource 的价值：

- 控制字段输出，避免模型所有属性直接暴露。
- 统一日期、金额、枚举、状态文案格式。
- 按需加载关联，减少隐藏的 N+1。
- 让前端契约更稳定。

错误响应不要到处手写数组。校验错误、认证错误、授权错误、业务异常应该由异常处理器统一转换成 HTTP 响应，控制器只处理正常路径。
