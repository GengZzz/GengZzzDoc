# HTTP 与 Session

PHP 天生为 Web 设计，HTTP 请求处理是其核心能力。理解 PHP 的请求处理流程、Session 机制和安全配置对于构建安全的 Web 应用至关重要。

## HTTP 请求处理流程

```php
<?php
declare(strict_types=1);

// PHP 将 HTTP 请求信息填充到超全局变量中

// GET 参数
$page = $_GET['page'] ?? 1;
$search = $_GET['q'] ?? '';

// POST 参数（application/x-www-form-urlencoded 或 multipart/form-data）
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

// SERVER 变量 — 服务器和请求信息
$requestMethod = $_SERVER['REQUEST_METHOD'];     // GET, POST, PUT, DELETE
$requestUri = $_SERVER['REQUEST_URI'];           // /users?page=2
$scriptName = $_SERVER['SCRIPT_NAME'];           // /index.php
$remoteAddr = $_SERVER['REMOTE_ADDR'];           // 客户端 IP
$userAgent = $_SERVER['HTTP_USER_AGENT'];        // 浏览器标识
$https = $_SERVER['HTTPS'] ?? 'off';             // 是否 HTTPS
$host = $_SERVER['HTTP_HOST'];                   // 域名

// 获取客户端真实 IP（考虑代理）
function getClientIp(): string
{
    $headers = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = trim(explode(',', $_SERVER[$header])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

// 读取 JSON 请求体
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// 读取请求头
function getHeader(string $name): ?string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return $_SERVER[$key] ?? null;
}

// 发送响应
http_response_code(201);  // 设置状态码
header('Content-Type: application/json; charset=utf-8');
header('X-Request-ID: ' . bin2hex(random_bytes(16)));
echo json_encode(['status' => 'created']);
```

## Session 机制

PHP Session 将用户数据存储在服务端，通过 Cookie 中的 Session ID 关联。

```php
<?php
declare(strict_types=1);

// 启动 Session（必须在任何输出之前调用）
session_start();

// Session 基本操作
$_SESSION['user_id'] = 42;
$_SESSION['username'] = 'alice';
$_SESSION['cart'] = ['item1', 'item2'];

// 读取
$userId = $_SESSION['user_id'] ?? null;

// 检查
if (isset($_SESSION['user_id'])) {
    echo "Logged in";
}

// 删除单个值
unset($_SESSION['cart']);

// 销毁整个 Session（登出时使用）
session_unset();     // 清空所有 Session 数据
session_destroy();   // 销毁 Session 文件
setcookie(session_name(), '', time() - 3600, '/');  // 删除 Cookie

// Session 配置（php.ini 或 session_start 前设置）
ini_set('session.save_handler', 'files');      // 存储方式
ini_set('session.save_path', '/var/lib/php/sessions');
ini_set('session.gc_maxlifetime', 1800);       // 30 分钟过期
ini_set('session.cookie_httponly', 1);          // 防止 JS 访问
ini_set('session.cookie_secure', 1);            // 仅 HTTPS
ini_set('session.cookie_samesite', 'Lax');     // CSRF 防护
ini_set('session.use_strict_mode', 1);          // 拒绝未初始化的 Session ID
ini_set('session.use_only_cookies', 1);         // 仅用 Cookie 存储 SID
ini_set('session.use_trans_sid', 0);            // 禁止 URL 中传递 SID
```

::: warning 警告
`session_start()` 必须在任何 HTML 输出之前调用，否则会触发 "headers already sent" 错误。这也是为什么框架通常将所有请求都路由到一个入口文件（index.php）的原因之一。
:::

### Session 存储后端

```php
<?php
// 自定义 Session Handler — 使用 Redis 存储
class RedisSessionHandler implements SessionHandlerInterface
{
    public function __construct(
        private Redis $redis,
        private int $ttl = 1800
    ) {}

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        return $this->redis->get("session:$id") ?: '';
    }

    public function write(string $id, string $data): bool
    {
        return $this->redis->setex("session:$id", $this->ttl, $data);
    }

    public function destroy(string $id): bool
    {
        return $this->redis->del("session:$id") > 0;
    }

    public function gc(int $max_lifetime): int|false
    {
        // Redis 自动过期，无需手动清理
        return 0;
    }
}

// 注册并使用
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);
$handler = new RedisSessionHandler($redis);
session_set_save_handler($handler, true);
session_start();
```

### Session 安全加固

```php
<?php
// Session 固定攻击防御 — 登录后重新生成 Session ID
function secureLogin(int $userId): void
{
    // 登录前：验证旧 Session 是否有效
    $oldSession = $_SESSION;

    // 重新生成 Session ID（防止 Session Fixation）
    session_regenerate_id(true);

    // 设置登录信息
    $_SESSION['user_id'] = $userId;
    $_SESSION['login_ip'] = $_SERVER['REMOTE_ADDR'];
    $_SESSION['login_ua'] = $_SERVER['HTTP_USER_AGENT'];
    $_SESSION['login_time'] = time();
}

// 每次请求验证 Session 一致性
function validateSession(): bool
{
    if (!isset($_SESSION['user_id'])) {
        return false;
    }

    // 检查 IP 和 User-Agent 一致性
    if ($_SESSION['login_ip'] !== $_SERVER['REMOTE_ADDR']) {
        session_destroy();
        return false;
    }

    // Session 超时检查
    $maxIdle = 1800;  // 30 分钟空闲超时
    if (time() - ($_SESSION['last_activity'] ?? 0) > $maxIdle) {
        session_destroy();
        return false;
    }
    $_SESSION['last_activity'] = time();

    return true;
}
```

## Cookie 安全属性

```php
<?php
// 安全的 Cookie 设置
setcookie('session_id', $sessionId, [
    'expires' => time() + 3600,
    'path' => '/',
    'domain' => '.example.com',
    'secure' => true,        // 仅 HTTPS 传输
    'httponly' => true,      // JS 无法访问（防 XSS 窃取 Cookie）
    'samesite' => 'Lax',     // CSRF 防护
]);

// SameSite 属性说明：
// Strict — 完全禁止跨站请求携带 Cookie（最安全，但影响用户体验）
// Lax — 允许顶级导航（如点击链接）携带 Cookie，禁止表单 POST 和 iframe 携带
// None — 允许所有跨站请求携带（必须配合 Secure=true）

// 登录 Token Cookie 示例
setcookie('auth_token', $token, [
    'expires' => time() + 86400 * 30,
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Strict',
]);
```

## CSRF 防御

```php
<?php
declare(strict_types=1);

class CsrfProtection
{
    // 生成 CSRF Token
    public static function generateToken(): string
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();
        return $token;
    }

    // 验证 CSRF Token
    public static function validateToken(?string $token): bool
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        if ($token === null || !isset($_SESSION['csrf_token'])) {
            return false;
        }

        // 时间敏感验证（Token 有效期 1 小时）
        $maxAge = 3600;
        if (time() - ($_SESSION['csrf_token_time'] ?? 0) > $maxAge) {
            return false;
        }

        return hash_equals($_SESSION['csrf_token'], $token);
    }

    // 生成隐藏表单字段
    public static function field(): string
    {
        $token = self::generateToken();
        return '<input type="hidden" name="_token" value="' . htmlspecialchars($token) . '">';
    }
}

// 在表单中使用
// <form method="POST" action="/transfer">
//     <?php echo CsrfProtection::field(); ?>
//     <input name="amount" type="number">
// </form>

// 在处理请求时验证
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!CsrfProtection::validateToken($_POST['_token'] ?? null)) {
        http_response_code(419);  // 419 Page Expired（非标准但广泛使用）
        die("CSRF token validation failed");
    }
    // 处理正常业务逻辑
}
```

## 文件上传安全

```php
<?php
// 验证上传文件
function validateUpload(array $file, array $allowedTypes, int $maxSize): ?string
{
    // 检查上传错误
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return "Upload failed with error code: {$file['error']}";
    }

    // 检查文件大小
    if ($file['size'] > $maxSize) {
        return "File size exceeds limit";
    }

    // 验证 MIME 类型（使用 finfo 而非客户端提供的 type）
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $actualMime = $finfo->file($file['tmp_name']);
    if (!in_array($actualMime, $allowedTypes, true)) {
        return "File type not allowed: $actualMime";
    }

    // 验证文件扩展名
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mimeToExt = [
        'image/jpeg' => ['jpg', 'jpeg'],
        'image/png' => ['png'],
        'image/gif' => ['gif'],
    ];
    $allowed = $mimeToExt[$actualMime] ?? [];
    if (!in_array($ext, $allowed, true)) {
        return "Extension does not match MIME type";
    }

    // 对图片文件进行二次验证
    if (str_starts_with($actualMime, 'image/')) {
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            return "Invalid image file";
        }
    }

    return null;  // 验证通过
}
```
