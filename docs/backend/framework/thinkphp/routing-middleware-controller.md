---
title: "路由、中间件与控制器"
description: "ThinkPHP 请求处理的关键是路由和中间件。路由决定请求进入哪个控制器动作，中间件负责在控制器前后处理横切逻辑，控制器只应该组织输入、调用业务服务、返回响应。"
---

<script setup>
import ThinkPhpLifecycleDemo from '../../../.vitepress/theme/components/ThinkPhpLifecycleDemo.vue'
</script>

# 路由、中间件与控制器

ThinkPHP 请求处理的关键是路由和中间件。路由决定请求进入哪个控制器动作，中间件负责在控制器前后处理横切逻辑，控制器只应该组织输入、调用业务服务、返回响应。

<ThinkPhpLifecycleDemo />

## 路由定义

路由应该表达资源语义：

```php
Route::group('api', function () {
    Route::get('orders', 'OrderController/index');
    Route::post('orders', 'OrderController/save');
    Route::put('orders/:id', 'OrderController/update');
    Route::delete('orders/:id', 'OrderController/delete');
})->middleware(['Auth', 'Throttle']);
```

路由设计要注意：

- 参数加约束，例如 `:id` 应该限制为数字。
- 后台和 API 的路由分组分开挂中间件。
- 控制器方法名不要直接泄露内部实现，外部只关心资源和动作。
- 列表、详情、创建、更新、删除保持统一命名，便于团队协作。

## 中间件职责

中间件适合：

- 登录态和 token 校验。
- 权限预检查。
- CORS、限流、签名校验。
- 设置当前租户、语言、trace id。
- 响应 header 处理和访问日志。

中间件不适合写具体业务，例如生成订单、扣库存、发优惠券。那些应该放到服务类、事件或队列里。

## 控制器边界

控制器常见职责：

1. 接收请求参数。
2. 调用验证器。
3. 调用应用服务或模型查询。
4. 返回 JSON、模板或重定向。

推荐写法：

```php
public function save(Request $request, OrderService $orders)
{
    $data = $request->only(['sku_id', 'quantity', 'remark']);
    validate(OrderValidate::class)->scene('create')->check($data);

    $order = $orders->create($request->user(), $data);

    return json(['data' => $order]);
}
```

控制器里不要堆复杂 SQL、事务流程和第三方调用。这样后续加命令行任务、队列消费、测试用例时，可以复用同一套业务服务。

## 响应与异常

API 项目建议统一 JSON 结构，例如：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

异常不要在每个控制器里 try-catch 后返回不同格式。更好的方式是统一异常处理，把验证异常、认证异常、业务异常、系统异常转换成稳定响应。这样前端和客户端更容易处理错误。
