# 校验、认证与测试

Laravel 的日常业务质量很大程度取决于输入校验、认证授权和测试边界。校验解决“数据能不能进来”，认证解决“是谁”，授权解决“能不能做”，测试解决“这些规则以后会不会被改坏”。

## FormRequest

复杂接口建议使用 FormRequest：

```php
class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Order::class);
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku_id' => ['required', 'integer', 'exists:skus,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'remark' => ['nullable', 'string', 'max:500'],
        ];
    }
}
```

Controller 中只使用 `$request->validated()`。这样校验、授权、控制器编排边界清楚，也方便单独测试。

## 认证

Laravel 认证体系核心是 Guard 和 Provider：

| 概念 | 作用 |
| --- | --- |
| Guard | 说明如何识别当前用户，如 session、token |
| Provider | 说明用户从哪里查，如 Eloquent User 模型 |
| Password Broker | 处理重置密码 token |
| Sanctum / Passport | API token 或 OAuth2 能力 |

后台管理常用 session guard，前后端分离 API 常用 Sanctum token。不要把“登录了”当作“有权限”，认证只回答是谁，授权才回答能不能做。

## 授权

Policy 适合模型级权限：

```php
class OrderPolicy
{
    public function update(User $user, Order $order): bool
    {
        return $user->id === $order->user_id && $order->isDraft();
    }
}
```

日常建议：

- Controller 中使用 `$this->authorize('update', $order)`。
- 列表查询也要做数据范围过滤，不能只在详情和修改时判断。
- 后台角色权限可以与 Policy 结合，但不要让角色字符串散落在业务代码里。

## Feature Test

Laravel 的 Feature Test 很适合覆盖接口行为：

```php
public function test_user_can_create_order(): void
{
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/orders', [
            'items' => [
                ['sku_id' => Sku::factory()->create()->id, 'quantity' => 2],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', 'pending');

    $this->assertDatabaseHas('orders', ['user_id' => $user->id]);
}
```

测试重点不是覆盖框架本身，而是覆盖业务契约：权限、校验、状态流转、数据库结果、事件是否派发、Job 是否入队。
