---
title: "模型、查询与事务"
description: "ThinkPHP 可以直接使用 Db 查询构造器，也可以使用模型。查询构造器适合简单 SQL 和统计，模型适合表达表、字段转换、关联和业务查询范围。日常关键是控制查询边界，避免控制器直接拼复杂 SQL。"
---

<script setup>
import ThinkPhpOrmQueryDemo from '../../../.vitepress/theme/components/ThinkPhpOrmQueryDemo.vue'
</script>

# 模型、查询与事务

ThinkPHP 可以直接使用 `Db` 查询构造器，也可以使用模型。查询构造器适合简单 SQL 和统计，模型适合表达表、字段转换、关联和业务查询范围。日常关键是控制查询边界，避免控制器直接拼复杂 SQL。

<ThinkPhpOrmQueryDemo />

## Db 查询

简单查询：

```php
$orders = Db::name('order')
    ->where('status', 'paid')
    ->whereBetweenTime('paid_at', $start, $end)
    ->order('paid_at', 'desc')
    ->paginate(20);
```

查询构造器要注意：

- 外部输入必须走参数绑定，不拼接 SQL 字符串。
- 分页查询必须有稳定排序。
- 大列表不要 `select()` 全部字段。
- 统计和列表分开，不要加载全部数据后在 PHP 中统计。

## 模型与查询范围

模型可以定义查询范围：

```php
class Order extends Model
{
    public function scopePaid($query)
    {
        $query->where('status', 'paid');
    }
}

$orders = Order::scope('paid')->select();
```

查询范围适合复用业务条件，例如“已支付”“未删除”“当前租户”。不要把写操作、外部 API 调用放进 scope。

## 关联查询

模型关联让代码表达更清楚：

```php
class Order extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

列表页如果要展示关联字段，要提前加载或改用 join，避免循环中逐条查用户。关联加载方便，但不等于性能一定好。数据量大、筛选复杂时，明确 join 和 select 字段更可控。

## 事务

多表写入要用事务：

```php
Db::transaction(function () use ($data) {
    $order = Order::create($data);
    OrderLog::create(['order_id' => $order->id, 'action' => 'created']);
});
```

事务里只放必须强一致的数据库操作。短信、邮件、HTTP 回调、文件处理应该放到事务外或队列里。否则事务锁会被外部耗时操作拖长，导致并发性能下降。

## 性能排查

常见问题：

| 问题 | 表现 | 优化 |
| --- | --- | --- |
| N+1 查询 | 列表接口 SQL 数量随行数增长 | 预加载、join、批量查询 |
| 无索引筛选 | 数据量上来后接口变慢 | 按 where/order 设计联合索引 |
| 大偏移分页 | 页码越大越慢 | 使用游标或基于 id 翻页 |
| 循环写入 | 导入、批量更新很慢 | 批量 insert/update，分批提交 |
