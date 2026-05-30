---
title: "队列、任务与部署实践"
description: "Laravel 项目上线后，稳定性往往取决于异步任务、配置缓存、队列 Worker、日志监控和发布流程。开发时能跑通不等于生产环境可靠，尤其是邮件、短信、导出、回调、支付通知这类耗时任务。"
---

# 队列、任务与部署实践

Laravel 项目上线后，稳定性往往取决于异步任务、配置缓存、队列 Worker、日志监控和发布流程。开发时能跑通不等于生产环境可靠，尤其是邮件、短信、导出、回调、支付通知这类耗时任务。

## Job 与队列

耗时操作应该进入队列：

```php
class SendOrderPaidNotification implements ShouldQueue
{
    public function handle(NotificationGateway $gateway): void
    {
        $gateway->sendOrderPaid($this->orderId);
    }
}
```

队列任务要关注：

- **幂等**：同一个 Job 重试多次不能造成重复扣款、重复发券。
- **重试策略**：设置 `tries`、`backoff`，区分临时失败和永久失败。
- **超时**：任务超时时间要小于 Worker 超时和进程管理器超时。
- **事务提交后派发**：依赖数据库新状态的 Job 应在事务提交后再执行。

## Event 与 Listener

事件适合解耦业务动作：

```php
event(new OrderPaid($order->id));
```

Listener 可以发通知、写审计、同步统计、触发积分。事件不是银弹：如果后续动作必须和主流程强一致，就不能随便异步；如果只是最终一致，事件和队列会让主流程更清爽。

## Scheduler

定时任务统一放在调度器中：

```php
Schedule::command('orders:close-expired')->everyMinute()->withoutOverlapping();
```

生产环境只需要系统 cron 每分钟执行一次 Laravel scheduler。要注意 `withoutOverlapping()` 防止任务重叠，长任务最好拆成扫描任务和队列任务，不要一个 cron 锁住大量数据。

## 部署清单

常见发布步骤：

1. 拉取代码并安装依赖：`composer install --no-dev --optimize-autoloader`。
2. 生成配置缓存：`php artisan config:cache`。
3. 生成路由缓存：`php artisan route:cache`。
4. 执行数据库迁移：`php artisan migrate --force`。
5. 重启队列 Worker：`php artisan queue:restart`。
6. 清理或重建必要缓存：视业务情况执行 `cache:clear`、`view:cache`。
7. 检查日志、队列堆积、健康检查接口。

## 生产常见问题

| 问题 | 常见原因 | 排查方向 |
| --- | --- | --- |
| `.env` 改了没生效 | 配置已缓存 | 重新 `config:cache`，业务代码改用 `config()` |
| 队列任务一直旧代码 | Worker 长驻未重启 | 发布后执行 `queue:restart` |
| 路由 404 | 路由缓存未更新 | 检查 `route:list` 和 `route:cache` |
| 文件权限错误 | storage/bootstrap cache 不可写 | 检查运行用户和目录权限 |
| 任务重复执行 | Job 非幂等或超时重试 | 加业务唯一键、状态机、锁 |
