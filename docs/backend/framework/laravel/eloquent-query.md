---
title: "Eloquent 与查询设计"
description: "Eloquent 是 Active Record 风格 ORM，模型既表达表结构映射，也承载关系、类型转换、Scope、访问器和修改器。它开发效率高，但如果关系加载和查询边界失控，很容易出现 N+1、慢查询和模型过胖。"
---

<script setup>
import LaravelEloquentRelationDemo from '../../../.vitepress/theme/components/LaravelEloquentRelationDemo.vue'
</script>

# Eloquent 与查询设计

Eloquent 是 Active Record 风格 ORM，模型既表达表结构映射，也承载关系、类型转换、Scope、访问器和修改器。它开发效率高，但如果关系加载和查询边界失控，很容易出现 N+1、慢查询和模型过胖。

<LaravelEloquentRelationDemo />

## Model 基础

模型常见配置：

```php
class Order extends Model
{
    protected $fillable = ['user_id', 'status', 'total_amount'];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

`fillable` 或 `guarded` 控制批量赋值边界；`casts` 负责类型转换；关系方法负责描述关联。不要把复杂业务决策全部塞进 Model，Model 更适合保存数据规则、关系、简单状态判断和查询 scope。

## 查询构造器与 Scope

重复查询条件可以抽成本地 scope：

```php
public function scopePaid(Builder $query): void
{
    $query->where('status', OrderStatus::Paid);
}

$orders = Order::query()
    ->paid()
    ->whereBetween('paid_at', [$start, $end])
    ->latest('paid_at')
    ->paginate(20);
```

Scope 适合表达可复用的查询片段。不要在 Scope 中隐藏复杂权限、外部调用或写操作，否则调用方很难判断副作用。

## 关系加载与 N+1

典型 N+1：

```php
$orders = Order::latest()->take(50)->get();

foreach ($orders as $order) {
    echo $order->user->name;
}
```

这里会先查 1 次订单，再为每个订单查询用户。修复方式：

```php
$orders = Order::with(['user:id,name'])->latest()->take(50)->get();
```

日常判断：

- 列表页需要展示关联字段，优先 `with()`。
- 详情页需要复杂关联，可以 `load()` 或 `loadMissing()`。
- 统计数量使用 `withCount()`，不要加载全集合再 `count()`。
- 大批量处理使用 `chunkById()`，不要一次性 `get()` 全表。

## 事务边界

多表写入必须显式事务：

```php
DB::transaction(function () use ($user, $payload) {
    $order = Order::create([...]);
    $order->items()->createMany($payload['items']);
    InventoryService::reserve($order);
});
```

事务里尽量只做数据库相关动作。发送邮件、推送消息、调用第三方支付不要放在事务内部，避免锁持有时间过长，也避免事务回滚后外部动作已经发生。可以使用事件、队列或 after commit 机制处理。

## 性能检查清单

1. 列表查询是否只选择需要字段。
2. 是否存在循环中访问关系属性。
3. 分页是否有稳定排序字段。
4. 模糊查询是否会让索引失效。
5. 批量更新是否可以用单条 SQL 代替循环 save。
6. 慢查询是否需要联合索引、覆盖索引或读模型。
