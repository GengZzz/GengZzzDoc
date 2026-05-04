# Laravel 进阶

Laravel 提供了一系列高级功能来处理 Web 应用中的常见模式：队列异步处理、事件解耦、任务调度、通知发送、API 构建。

## 队列系统

队列将耗时操作（邮件发送、图片处理、API 调用）异步执行，避免阻塞 HTTP 响应。

```php
<?php
declare(strict_types=1);

// 定义 Job
class ProcessPodcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;              // 最大重试次数
    public int $timeout = 120;          // 单次执行超时（秒）
    public int $backoff = 10;           // 重试间隔（秒）
    public int $maxExceptions = 3;      // 最大异常次数
    public string $queue = 'processing'; // 指定队列名称

    public function __construct(
        public Podcast $podcast
    ) {}

    public function handle(PodcastProcessor $processor): void
    {
        $processor->process($this->podcast);
    }

    // 失败处理（所有重试耗尽后调用）
    public function failed(Throwable $exception): void
    {
        // 通知管理员
        Notification::route('slack', config('services.slack.webhook'))
            ->notify(new JobFailedNotification($this->podcast, $exception));

        // 记录失败日志
        Log::error("Job failed for podcast {$this->podcast->id}", [
            'exception' => $exception->getMessage(),
        ]);
    }
}

// 分发 Job
ProcessPodcast::dispatch($podcast);                          // 同步分发
ProcessPodcast::dispatch($podcast)->onQueue('processing');   // 指定队列
ProcessPodcast::dispatch($podcast)->delay(now()->addMinutes(5));  // 延迟执行
ProcessPodcast::dispatch($podcast)->onConnection('redis');   // 指定连接

// 分发到同步队列（用于测试）
ProcessPodcast::dispatchSync($podcast);

// 链式 Job（按顺序执行）
Podcast::withChain([
    new ProcessPodcast($podcast),
    new OptimizePodcast($podcast),
    new NotifySubscribers($podcast),
])->dispatch();
```

```php
<?php
// 队列 Worker 配置
// .env
QUEUE_CONNECTION=redis
REDIS_QUEUE=default,processing,emails

// php artisan queue:work redis --queue=default,processing --tries=3 --timeout=90

// 速率限制
use Illuminate\Cache\RateLimiter;

// 在 AppServiceProvider 中定义
RateLimiter::for('api', function(object $job) {
    return Limit::perMinute(60)->by($job->user->id);
});

class CallExternalApi implements ShouldQueue
{
    public function middleware(): array
    {
        return [new RateLimited('api')];
    }
}

// 失败 Job 管理
// php artisan queue:failed          # 列出失败 Job
// php artisan queue:retry {id}      # 重试指定 Job
// php artisan queue:retry --all     # 重试所有失败 Job
// php artisan queue:flush           # 清空失败 Job 列表
```

::: tip 提示
队列死信（Dead Letter）问题：当 Job 不断失败重试时，可能占用 Worker 资源。设置合理的 `tries`、`timeout` 和 `maxExceptions`。对于关键 Job，使用 `failed()` 方法实现告警和补偿逻辑。Laravel Horizon 提供了队列监控面板，可以实时查看队列深度、吞吐量和失败率。
:::

## 事件与监听器

```php
<?php
// 定义事件
class OrderPlaced
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Order $order
    ) {}
}

// 定义监听器
class SendOrderConfirmation
{
    public function handle(OrderPlaced $event): void
    {
        Mail::to($event->order->user->email)
            ->send(new OrderConfirmationMail($event->order));
    }
}

class UpdateInventory
{
    public function handle(OrderPlaced $event): void
    {
        foreach ($event->order->items as $item) {
            $item->product->decrement('stock', $item->quantity);
        }
    }
}

// 可队列化的监听器
class GenerateInvoice implements ShouldQueue
{
    public function handle(OrderPlaced $event): void
    {
        // 异步生成发票 PDF
        $pdf = PDF::loadView('invoices.order', ['order' => $event->order]);
        Storage::put("invoices/{$event->order->order_no}.pdf", $pdf->output());
    }
}

// 注册（在 EventServiceProvider 中）
protected $listen = [
    OrderPlaced::class => [
        SendOrderConfirmation::class,
        UpdateInventory::class,
        GenerateInvoice::class,
    ],
];

// 触发事件
event(new OrderPlaced($order));
// 或
OrderPlaced::dispatch($order);
```

## 任务调度

任务调度替代了传统的 crontab 配置，将定时任务定义在代码中。

```php
<?php
// routes/console.php 或 app/Console/Kernel.php

use Illuminate\Console\Scheduling\Schedule;

// 基本调度
Schedule::command('cache:prune')->daily();

// Cron 表达式
Schedule::command('report:generate')->cron('0 9 * * 1-5');  // 工作日 9:00

// 带频率的调度
Schedule::command('queue:work --stop-when-empty')->everyMinute()->withoutOverlapping();
Schedule::command('backup:run')->dailyAt('02:00')->onOneServer();

// 闭包调度
Schedule::call(function() {
    Cache::forget('daily_stats');
})->daily();

// 条件调度
Schedule::command('report:monthly')
    ->monthly()
    ->when(function() {
        return now()->day === 1;  // 每月 1 号
    });

// 防止重叠
Schedule::command('import:users')
    ->everyFiveMinutes()
    ->withoutOverlapping()  // 上一次未完成则跳过
    ->onOneServer();        // 在多服务器环境中只在一台执行

// 任务输出
Schedule::command('backup:run')
    ->daily()
    ->appendOutputTo(storage_path('logs/backup.log'))
    ->emailOutputOnFailure('admin@example.com');

// 环境限制
Schedule::command('telescope:prune')->daily()->environments('production');
Schedule::command('db:seed')->environments('local');

// 运行调度（需配置 crontab）
// * * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

## 通知系统

```php
<?php
// 定义通知
class OrderShipped extends Notification
{
    public function __construct(
        private Order $order
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database', 'slack'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Order #{$this->order->order_no} Shipped")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Your order has been shipped.")
            ->action('Track Order', url("/orders/{$this->order->id}"))
            ->line('Thank you for your purchase!');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_no' => $this->order->order_no,
            'message' => "Order #{$this->order->order_no} has been shipped",
        ];
    }

    public function toSlack(object $notifiable): SlackMessage
    {
        return (new SlackMessage)
            ->content("Order #{$this->order->order_no} shipped to {$notifiable->name}")
            ->attachment(function($attachment) {
                $attachment->fields([
                    'Total' => '$' . number_format($this->order->total, 2),
                    'Items' => $this->order->items->count(),
                ]);
            });
    }
}

// 发送通知
$user->notify(new OrderShipped($order));

// 通知到指定频道
Notification::route('mail', 'admin@example.com')
    ->route('slack', config('services.slack.webhook'))
    ->notify(new SystemAlert('High CPU usage'));
```

## API 资源

```php
<?php
// API Resource — 转换模型为 JSON
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->when(
                $request->user()?->isAdmin() || $request->user()?->id === $this->id,
                $this->email
            ),
            'avatar' => $this->whenNotNull($this->avatar_url),
            'created_at' => $this->created_at->toIso8601String(),
            'posts' => PostResource::collection($this->whenLoaded('posts')),
            'posts_count' => $this->whenCounted('posts'),
        ];
    }
}

// 控制器中使用
class UserController
{
    public function index(): AnonymousResourceCollection
    {
        $users = User::with('posts')->withCount('posts')->paginate(20);
        return UserResource::collection($users);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load('posts'));
    }
}

// 响应格式：
// {
//   "data": [{ "id": 1, "name": "Alice", ... }],
//   "meta": { "current_page": 1, "last_page": 5, "per_page": 20 },
//   "links": { "first": "...", "last": "...", "next": "..." }
// }
```

## Form Request 验证

```php
<?php
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create-users');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'in:admin,editor,viewer'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => '该邮箱已被注册',
            'password.min' => '密码至少需要 :min 个字符',
        ];
    }

    // 验证后钩子
    public function after(): array
    {
        return [
            function(StringValidator $validator) {
                if ($this->input('role') === 'admin' && !$this->user()->isSuperAdmin()) {
                    $validator->errors()->add('role', '只有超级管理员可以创建管理员账号');
                }
            },
        ];
    }
}

// 控制器中使用
class UserController
{
    public function store(StoreUserRequest $request): UserResource
    {
        // 验证已自动完成
        $data = $request->validated();
        $data['password'] = bcrypt($data['password']);
        $user = User::create($data);
        return new UserResource($user);
    }
}
```
