# 性能与调试

PHP 应用的性能优化需要从 OPcache 配置、PHP-FPM 调优、代码级分析三个层面入手。本节讲解 OPcache/JIT 配置、Xdebug 调试、Blackfire 性能分析以及常见问题排查。

## OPcache 配置调优

```ini
; php.ini OPcache 配置

; === 基础配置 ===
opcache.enable = 1
; OPcache 总内存，一般 128-256MB 足够
; 可通过 opcache_get_status() 查看实际使用量
opcache.memory_consumption = 256

; 驻留字符串缓冲区大小（类名、函数名等）
opcache.interned_strings_buffer = 16

; 最大缓存脚本数（按项目文件数设置，留 20% 余量）
opcache.max_accelerated_files = 20000

; === 时间戳检查 ===
; 开发环境：开启（文件修改后自动重新编译）
; opcache.validate_timestamps = 1
; opcache.revalidate_freq = 0

; 生产环境：关闭（性能最优，但修改文件后需手动重启 FPM）
opcache.validate_timestamps = 0

; === 文件缓存 ===
; 将缓存的 opcode 写入磁盘（加速 FPM 重启后恢复）
opcache.file_cache = /tmp/opcache

; === 预加载（PHP 7.4+）===
; 启动时加载指定文件，永久驻留内存，永不回收
; opcache.preload = /var/www/html/preload.php
; opcache.preload_user = www-data

; === JIT 配置（PHP 8.0+）===
; opcache.jit = 1255
; 含义：1255 = CRSH
;   C=1（CPU 寄存器分配）R=2（保留）S=5（JIT 所有函数）H=5（所有热点代码）
; 常用值：
;   1205 — 保守 JIT（推荐起始值）
;   1255 — 激进 JIT（更多函数被编译）
;   1235 — 不做内联
opcache.jit_buffer_size = 128M
; JIT 缓冲区大小，0 表示禁用 JIT
```

::: tip 提示
生产环境设置 `validate_timestamps = 0` 后，修改 PHP 文件不会立即生效。需要执行 `php-fpm reload` 或 `kill -USR2 <pid>` 来重新加载。在部署脚本中务必包含此步骤。
:::

## OPcache 预加载与 JIT

<PhpOpcacheDemo />

```php
<?php
// preload.php — OPcache 预加载脚本
// 预加载框架核心文件，所有请求共享，永不回收

// 预加载整个 vendor 目录（选择性地）
$vendorDir = '/var/www/html/vendor';

// 预加载 Laravel 核心
$files = glob($vendorDir . '/laravel/framework/src/Illuminate/Foundation/*.php');
foreach ($files as $file) {
    opcache_compile_file($file);
}

// 预加载路由和控制器
foreach (glob('/var/www/html/app/Http/Controllers/*.php') as $file) {
    opcache_compile_file($file);
}

// 预加载模型
foreach (glob('/var/www/html/app/Models/*.php') as $file) {
    opcache_compile_file($file);
}
```

```ini
; php.ini
opcache.preload = /var/www/html/preload.php
opcache.preload_user = www-data
```

## Xdebug 调试

```ini
; php.ini 或 xdebug.ini
[xdebug]
zend_extension = xdebug.so
xdebug.mode = debug,develop,profile
xdebug.start_with_request = trigger
xdebug.client_host = 127.0.0.1
xdebug.client_port = 9003

; 开发环境配置
xdebug.var_display_max_depth = 5
xdebug.var_display_max_children = 128
xdebug.var_display_max_data = 512
```

```php
<?php
// Xdebug 使用方式

// 1. 断点调试 — 在 IDE 中设置断点，然后：
// VS Code: 安装 PHP Debug 扩展，按 F5 启动调试
// PhpStorm: 点击电话图标开始监听

// 2. 触发调试（不通过 IDE）
xdebug_break();  // 等同于在该行设置断点

// 3. 性能分析
// 设置 XDEBUG_PROFILE=1 环境变量或触发参数
// 生成 cachegrind 文件，可用 KCacheGrind/Webgrind 分析
if (function_exists('xdebug_info')) {
    echo xdebug_info('mode');  // 查看 Xdebug 模式
}

// 4. 函数追踪
xdebug_start_trace('/tmp/trace');
// ... 被追踪的代码 ...
xdebug_stop_trace();
// 生成函数调用树和耗时报告
```

::: warning 警告
Xdebug 会显著降低 PHP 执行速度（约 2-5 倍），绝不能在生产环境启用。即使不主动调试，只要加载了 Xdebug 扩展就会影响性能。
:::

## Blackfire 性能分析

Blackfire 是 SensioLabs 开发的 PHP 性能分析工具，提供函数级别的耗时分析、内存分析和调用图。

```bash
# 安装 Blackfire 探针
curl -sS https://blackfire.io/api/v1/releases/probe/php/linux/amd64/8.3 | \
  tar xpf - -C /

# 配置 php.ini
blackfire.agent_socket = tcp://127.0.0.1:8307
blackfire.agent_timeout = 0.25
blackfire.log_level = 1
blackfire.log_file = /tmp/blackfire.log
```

```bash
# CLI 分析
blackfire run php artisan migrate

# HTTP 分析（安装 Browser 扩展后点击分析按钮）
# 或使用 CLI
blackfire curl http://localhost/api/users
```

## 常见问题排查

### 502 Bad Gateway

```bash
# 原因：PHP-FPM 进程崩溃或无可用进程
# 排查步骤：

# 1. 检查 PHP-FPM 是否运行
systemctl status php8.3-fpm

# 2. 查看 PHP-FPM 错误日志
tail -f /var/log/php8.3-fpm.log
# 常见错误：
# - "server reached max_children" → 需要增加 pm.max_children
# - "process signaled SIGSEGV" → 代码导致段错误

# 3. 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log
# "connect() to unix:/run/php/php8.3-fpm.sock failed (11: Resource temporarily unavailable)"
# → FPM 进程池耗尽

# 4. 检查进程数和连接数
ps aux | grep php-fpm | wc -l
ss -s  # 查看 socket 统计

# 解决方案：
# - 增加 pm.max_children
# - 检查代码中的阻塞操作（外部 API 超时）
# - 检查数据库慢查询
```

### 504 Gateway Timeout

```bash
# 原因：PHP-FPM 处理时间超过 Nginx 等待时间
# 排查步骤：

# 1. 确认是 PHP 慢还是 Nginx 超时短
# 在 PHP 中添加日志
$startTime = microtime(true);
register_shutdown_function(function() use ($startTime) {
    $elapsed = microtime(true) - $startTime;
    if ($elapsed > 5) {
        error_log("Slow request: {$_SERVER['REQUEST_URI']} took {$elapsed}s");
    }
});

# 2. 检查 PHP 慢日志
cat /var/log/php-fpm/www-slow.log
# 显示执行时间超过 request_slowlog_timeout 的请求的调用栈

# 3. 常见原因：
# - 数据库慢查询（开启 MySQL slow query log）
# - 外部 API 超时（设置 curl timeout）
# - 死循环或递归过深
# - OPcache 预热不足（首次请求编译大量文件）

# 解决方案：
# - 调整 fastcgi_read_timeout 和 request_slowlog_timeout
# - 优化慢查询
# - 添加超时机制
```

### 内存泄漏定位

```php
<?php
// CLI 队列 Worker 内存泄漏排查

// 方法 1：监控内存增长
class MemoryMonitor
{
    private float $startMemory;

    public function start(): void
    {
        $this->startMemory = memory_get_usage(true);
    }

    public function report(string $label = ''): void
    {
        $current = memory_get_usage(true);
        $peak = memory_get_peak_usage(true);
        $delta = $current - $this->startMemory;
        error_log(sprintf(
            "[%s] Current: %.2fMB, Peak: %.2fMB, Delta: %.2fMB",
            $label,
            $current / 1024 / 1024,
            $peak / 1024 / 1024,
            $delta / 1024 / 1024
        ));
    }
}

// 方法 2：强制 GC 并查看效果
'gc_collect_cycles()' . ": " . gc_collect_cycles() . " cycles collected\n";
'gc_status()' . ": " . print_r(gc_status(), true) . "\n";

// 方法 3：常见泄漏来源
// - 全局数组不断增长（$GLOBALS、static 属性）
// - 闭包捕获大量数据
// - ORM 模型累积（批量处理时未释放）
// - 未关闭的文件句柄、数据库连接

// Worker 内存控制
class QueueWorker
{
    public function run(): void
    {
        $maxMemory = 128 * 1024 * 1024;  // 128MB
        $processed = 0;

        while (true) {
            $job = $this->getNextJob();
            if ($job) {
                $job->handle();
                $processed++;
            }

            // 内存超限则退出（由 Supervisor 重启）
            if (memory_get_usage(true) > $maxMemory) {
                error_log("Worker exiting due to memory limit after $processed jobs");
                break;
            }

            // 定期强制 GC
            if ($processed % 100 === 0) {
                gc_collect_cycles();
            }
        }
    }
}
```

### 慢请求追踪

```php
<?php
// 中间件方式追踪慢请求
class SlowRequestLogger
{
    private float $startTime;

    public function handle(Request $request, Closure $next): Response
    {
        $this->startTime = microtime(true);
        $queryCountBefore = DB::getQueryLog();

        $response = $next($request);

        $duration = microtime(true) - $this->startTime;
        $queryCount = count(DB::getQueryLog()) - count($queryCountBefore);

        // 记录超过 1 秒的请求
        if ($duration > 1.0) {
            Log::warning('Slow request detected', [
                'method' => $request->method(),
                'uri' => $request->path(),
                'duration' => round($duration * 1000) . 'ms',
                'queries' => $queryCount,
                'memory' => round(memory_get_peak_usage(true) / 1024 / 1024, 2) . 'MB',
            ]);
        }

        return $response;
    }
}
```
