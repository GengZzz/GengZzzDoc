# 概览、目录与路由

Laravel 把 PHP Web 开发中的常见基础设施做成一套约定：路由负责入口，控制器承接用例，服务容器管理依赖，Eloquent 处理数据访问，队列与事件处理异步任务。日常开发要先建立边界感：HTTP 层处理协议和输入，应用服务处理业务流程，模型和仓储处理数据规则。

## 适合解决什么问题

Laravel 适合以下场景：

- 需要快速搭建后台、API、管理端和业务系统。
- 团队希望统一目录、路由、校验、认证、ORM、队列和测试方式。
- 业务以 CRUD、表单流转、权限控制、定时任务和异步通知为主。
- 希望用较少胶水代码获得缓存、日志、事件、文件存储、邮件等能力。

不适合把所有业务都堆进 Controller。Laravel 的便利性很强，如果边界不清晰，项目会很快变成“控制器里写 SQL、发通知、算状态、调第三方”的混合代码。较稳的做法是：Controller 只做请求编排，复杂业务放到 Action、Service 或 Domain 类中。

## 目录结构

常见目录职责：

| 目录 | 日常职责 |
| --- | --- |
| `app/Http/Controllers` | 控制器，处理请求入口和响应组织 |
| `app/Http/Middleware` | 中间件，处理鉴权、限流、租户、语言、日志上下文 |
| `app/Models` | Eloquent 模型，表达表、关系、类型转换、查询 scope |
| `app/Providers` | 服务提供者，注册容器绑定、事件、宏、策略 |
| `routes/web.php` | Web 路由，通常带 Session、CSRF、Cookie |
| `routes/api.php` | API 路由，通常无状态，适合 token 鉴权 |
| `database/migrations` | 表结构演进脚本 |
| `database/seeders` | 初始化数据、测试数据 |
| `config` | 配置文件，读取 `.env` 后形成运行配置 |

目录不是强制架构，但它给团队提供了默认语言。新增能力时先判断它属于 HTTP、Application、Domain、Infrastructure 还是 Data Access，避免所有类都挤进 `app/Services`。

## 路由设计

路由要表达资源和动作，而不是暴露内部方法名。常见写法：

```php
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'can:access-admin'])
    ->group(function () {
        Route::apiResource('orders', OrderController::class);
        Route::post('orders/{order}/approve', [OrderApprovalController::class, 'store']);
    });
```

设计路由时关注四点：

1. **资源边界**：`orders`、`users`、`invoices` 这种资源名比 `getOrderList` 更稳定。
2. **HTTP 语义**：查询用 `GET`，创建用 `POST`，整体替换用 `PUT`，部分更新用 `PATCH`，删除用 `DELETE`。
3. **中间件分组**：认证、授权、限流、租户识别应该靠分组统一挂载。
4. **控制器粒度**：复杂动作可以拆独立控制器，例如 `OrderApprovalController@store`，不要让 `OrderController` 无限制膨胀。

## 路由模型绑定

Laravel 可以把 URL 中的参数直接解析成模型：

```php
Route::get('/users/{user}', function (User $user) {
    return new UserResource($user);
});
```

这让控制器少写一段 `User::findOrFail($id)`，但要注意三件事：

- 默认按主键查询，可以在模型中重写 `getRouteKeyName()` 使用 `uuid`、`slug`。
- 绑定发生在控制器之前，未找到会直接返回 404。
- 不要在绑定阶段加载过多关系，复杂查询应该放在控制器或查询对象中。

## 路由命名与 URL 生成

业务中不要到处拼 URL，命名路由更稳定：

```php
Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');

$url = route('orders.show', ['order' => $order->id]);
```

这样路由路径调整时，业务代码仍然通过名称生成地址。对于后台菜单、邮件链接、通知跳转尤其重要。
