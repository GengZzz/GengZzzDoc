# Eloquent 模型

Eloquent 是 Laravel 的 ORM（对象关系映射），通过 ActiveRecord 模式将数据库表映射为 PHP 类。它简洁优雅，但也容易被误用导致性能问题。

## 模型定义与基本操作

```php
<?php
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Model
{
    use HasFactory, SoftDeletes;

    // 可批量赋值的属性（白名单）
    protected $fillable = [
        'name', 'email', 'password', 'role',
    ];

    // 不可从请求中赋值的属性（黑名单）
    protected $guarded = ['id', 'is_admin'];

    // 隐藏字段（JSON 序列化时排除）
    protected $hidden = ['password', 'remember_token'];

    // 类型转换
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'settings' => 'array',
        'balance' => 'decimal:2',
    ];

    // 日期属性
    protected $dates = ['last_login_at'];
}

// CRUD 操作
// 创建
$user = User::create([
    'name' => 'Alice',
    'email' => 'alice@example.com',
    'password' => bcrypt('secret'),
]);

// 查询
$user = User::find(1);                    // 按主键查找
$user = User::where('email', $email)->first();  // 条件查询
$users = User::where('age', '>', 18)->get();     // 获取集合
$user = User::findOrFail(1);              // 找不到抛 404
$user = User::firstOrCreate(['email' => $email], ['name' => 'New User']);

// 更新
$user->name = 'Bob';
$user->save();
// 或批量更新
User::where('role', 'guest')->update(['is_active' => true]);

// 删除
$user->delete();  // 软删除（如果用了 SoftDeletes）
$user->forceDelete();  // 硬删除
User::destroy([1, 2, 3]);  // 批量删除
```

## 关系类型

Eloquent 支持所有常见数据库关系：

```php
<?php
class User extends Model
{
    // 一对一：一个用户有一个头像
    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    // 一对多：一个用户有多篇文章
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    // 一对多（反向）：文章属于用户
    // 在 Post 模型中定义
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

class Post extends Model
{
    // 多对多：文章和标签
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'post_tags')
                    ->withPivot('order')
                    ->withTimestamps();
    }

    // 多态关联：文章可以有多个评论、图片
    public function comments(): MorphMany
    {
        return $this->hasMany(Comment::class)->where('commentable_type', Post::class);
    }
}

class Comment extends Model
{
    // 多态关联（反向）
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}

// 使用
$user = User::with('posts')->find(1);
foreach ($user->posts as $post) {
    echo $post->title;
}

// 关联操作
$post = $user->posts()->create(['title' => 'New Post', 'content' => '...']);
$user->posts()->where('status', 'draft')->delete();

// 多对多操作
$post->tags()->attach($tagId);
$post->tags()->sync([1, 2, 3]);  // 同步：删除不在列表中的，添加新标签
$post->tags()->toggle([1, 2]);   // 切换：存在的删除，不存在的添加
```

## N+1 问题与 Eager Loading

N+1 问题是 Eloquent 最常见的性能陷阱。

```php
<?php
// N+1 问题演示
// 查询 1 个 SQL 获取所有用户
$users = User::all();  // SELECT * FROM users
foreach ($users as $user) {
    // 每个用户再查 1 个 SQL 获取文章（N 次查询）
    echo $user->posts->count();  // SELECT * FROM posts WHERE user_id = ?
}
// 如果有 100 个用户 = 1 + 100 = 101 条 SQL

// 解决方案：Eager Loading（预加载）
$users = User::with('posts')->get();  // 只有 2 条 SQL
// SQL 1: SELECT * FROM users
// SQL 2: SELECT * FROM posts WHERE user_id IN (1, 2, 3, ...)

// 嵌套预加载
$users = User::with('posts.comments')->get();

// 带条件的预加载
$users = User::with(['posts' => function($query) {
    $query->where('status', 'published')
          ->latest()
          ->limit(5);
}])->get();

// 预加载计数（不加载模型，只获取计数）
$users = User::withCount('posts')->get();
foreach ($users as $user) {
    echo $user->posts_count;  // 只是一个整数属性
}

// 延迟预加载（查询后决定加载哪些关联）
$users = User::all();
if ($needPosts) {
    $users->load('posts');
}

// 检测 N+1 问题（开发环境）
// 在 AppServiceProvider 中：
use Illuminate\Database\Connection;
DB::whenQueryingForLongerThan(500, function (Connection $connection) {
    // 超过 500ms 的查询记录下来
    logger()->warning('Slow query detected', ['sql' => $connection->queryLog]);
});

// 或使用 Laravel Debugbar / clockwork 查看所有 SQL
```

::: warning 警告
N+1 问题是 Laravel 应用性能问题的头号原因。一个不带 `with()` 的关联遍历可能在开发环境看不出问题（数据量小），到了生产环境数据量增长后就会导致数据库连接耗尽。在代码审查时，务必检查所有 `->` 关联访问是否经过预加载。
:::

## 模型事件与观察者

```php
<?php
// 模型事件
class Order extends Model
{
    protected static function booted(): void
    {
        // 创建前：生成订单号
        static::creating(function(Order $order) {
            $order->order_no = 'ORD-' . strtoupper(Str::random(10));
        });

        // 创建后：发送通知
        static::created(function(Order $order) {
            event(new OrderCreated($order));
        });

        // 更新后：记录变更
        static::updated(function(Order $order) {
            $changes = $order->getChanges();
            Log::info("Order #{$order->id} updated", $changes);
        });

        // 删除前：检查是否可删除
        static::deleting(function(Order $order) {
            if ($order->status === 'shipped') {
                throw new RuntimeException("Cannot delete shipped order");
            }
        });
    }
}

// 观察者模式（更好的组织方式）
class OrderObserver
{
    public function creating(Order $order): void
    {
        $order->order_no = 'ORD-' . strtoupper(Str::random(10));
    }

    public function created(Order $order): void
    {
        // 发送确认邮件
        Mail::to($order->user->email)->send(new OrderConfirmation($order));
    }

    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            Cache::forget("order:{$order->id}");
        }
    }
}

// 注册观察者（在 AppServiceProvider 中）
Order::observe(OrderObserver::class);
```

## Accessor / Mutator

```php
<?php
class User extends Model
{
    // Accessor（获取器）— 读取时转换
    // Laravel 9+ 风格
    protected function firstName(): Attribute
    {
        return Attribute::make(
            get: fn(?string $value) => ucfirst($value ?? ''),
        );
    }

    // Mutator（修改器）— 写入时转换
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn(string $value) => bcrypt($value),
        );
    }

    // 组合 Accessor + Mutator
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn(string $value) => ucwords($value),
            set: fn(string $value) => strtolower($value),
        );
    }
}

$user->password = 'secret';  // 自动 bcrypt
echo $user->password;         // 输出哈希值

// 属性转换（casts）
protected $casts = [
    'is_admin' => 'boolean',
    'options' => 'array',
    'metadata' => 'json',
    'score' => 'decimal:2',
    'registered_at' => 'datetime:Y-m-d',
    'status' => App\Enums\UserStatus::class,  // PHP 8.1 枚举
];
```

## Query Builder vs Eloquent

| 特性 | Query Builder | Eloquent |
|------|--------------|----------|
| 速度 | 更快（直接 SQL） | 稍慢（模型实例化开销） |
| 关系 | 需手动 JOIN | 自动处理 |
| 事件 | 无 | 支持模型事件 |
| 适用场景 | 报表查询、批量操作 | 业务逻辑、CRUD |

```php
<?php
// Query Builder — 复杂统计查询
$stats = DB::table('orders')
    ->select(DB::raw('DATE(created_at) as date, COUNT(*) as count, SUM(amount) as total'))
    ->where('status', 'completed')
    ->whereBetween('created_at', [$start, $end])
    ->groupBy(DB::raw('DATE(created_at)'))
    ->orderBy('date')
    ->get();

// Eloquent — 业务逻辑操作
$order = Order::create([...]);
$order->items()->createMany([...]);
$order->markAsPaid();
event(new OrderPaid($order));
```
