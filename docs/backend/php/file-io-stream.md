# 文件 I/O 与流

PHP 提供了丰富的文件系统操作函数，同时通过流（Stream）和上下文（Context）抽象统一了文件、网络、压缩等 I/O 操作的接口。

## 文件系统函数

```php
<?php
declare(strict_types=1);

// === 文件读写 ===

// file_get_contents — 读取整个文件到字符串
$content = file_get_contents('/var/log/app.log');

// file_put_contents — 写入字符串到文件
file_put_contents('/tmp/output.txt', 'Hello World');

// FILE_APPEND 标志追加写入
file_put_contents('/var/log/app.log', "New entry\n", FILE_APPEND);

// LOCK_EX 独占锁，防止并发写入损坏文件
file_put_contents('/tmp/counter.txt', $count, LOCK_EX);

// 逐行读取大文件
$handle = fopen('/var/log/access.log', 'r');
if ($handle) {
    while (($line = fgets($handle)) !== false) {
        // 处理每一行
        if (str_contains($line, '404')) {
            echo $line;
        }
    }
    fclose($handle);
}

// 使用 SplFileObject（面向对象方式）
$file = new SplFileObject('/var/log/access.log', 'r');
$file->setFlags(SplFileObject::READ_AHEAD | SplFileObject::SKIP_EMPTY);
foreach ($file as $lineNum => $line) {
    // 处理行
}

// === 目录操作 ===

// 创建目录（递归创建）
if (!is_dir('/tmp/nested/dir')) {
    mkdir('/tmp/nested/dir', 0755, true);  // recursive = true
}

// 遍历目录 — DirectoryIterator
$iterator = new DirectoryIterator('/var/www/html');
foreach ($iterator as $fileInfo) {
    if ($fileInfo->isDot()) continue;
    if ($fileInfo->isFile() && $fileInfo->getExtension() === 'php') {
        echo $fileInfo->getFilename() . ' (' . $fileInfo->getSize() . " bytes)\n";
    }
}

// 递归遍历 — RecursiveDirectoryIterator
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator('/var/www', RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);
foreach ($iterator as $file) {
    echo $file->getPathname() . "\n";
}

// === 文件信息 ===
$path = '/var/www/html/index.php';
file_exists($path);       // true/false
is_file($path);           // 是否是文件
is_dir('/var/www');       // 是否是目录
is_readable($path);       // 是否可读
is_writable('/tmp');      // 是否可写
filesize($path);          // 文件大小（字节）
filemtime($path);         // 最后修改时间（Unix 时间戳）
fileperms($path);         // 文件权限
```

::: warning 警告
在处理用户提供的文件路径时，必须验证路径是否在允许的目录范围内。使用 `realpath()` 解析符号链接后，检查是否在白名单目录内，防止路径遍历攻击（如 `../../etc/passwd`）。
:::

## 流（Stream）与上下文（Context）

PHP 的流抽象统一了所有 I/O 操作的接口，无论是文件、HTTP、压缩还是自定义数据源。

```php
<?php
declare(strict_types=1);

// 流封装器（Stream Wrappers）
// PHP 内置支持多种协议：
// file:// — 本地文件系统（默认）
// http://, https:// — HTTP 请求
// ftp://, ftps:// — FTP
// php:// — 特殊流（input, output, memory, temp, filter）
// compress.zlib:// — Gzip 压缩
// phar:// — PHP 归档

// php://input — 读取原始请求体（POST 数据）
$rawBody = file_get_contents('php://input');

// php://memory — 内存中读写
$memory = fopen('php://memory', 'r+');
fwrite($memory, "Temporary data");
rewind($memory);
echo stream_get_contents($memory);  // "Temporary data"
fclose($memory);

// 使用上下文自定义 HTTP 请求
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", [
            'Content-Type: application/json',
            'Authorization: Bearer token123',
        ]),
        'content' => json_encode(['name' => 'Alice']),
        'timeout' => 30,
    ],
    'ssl' => [
        'verify_peer' => true,
        'verify_peer_name' => true,
    ],
]);

$response = file_get_contents('https://api.example.com/users', false, $context);

// 流过滤器（Stream Filters）
$handle = fopen('/tmp/data.txt', 'r');
stream_filter_append($handle, 'string.toupper');  // 转大写
while (($line = fgets($handle)) !== false) {
    echo $line;  // 所有文本变为大写
}
fclose($handle);

// 自定义流过滤器
class Rot13Filter extends php_user_filter
{
    public function filter($in, $out, &$consumed, $closing): int
    {
        while ($bucket = stream_bucket_make_read($in)) {
            $bucket->data = str_rot13($bucket->data);
            $consumed += $bucket->datalen;
            stream_bucket_append($out, $bucket);
        }
        return PSFS_PASS_ON;
    }
}

stream_filter_register('rot13', Rot13Filter::class);
```

## 文件上传处理

```php
<?php
declare(strict_types=1);

/**
 * 安全的文件上传处理器
 */
class FileUploader
{
    private string $uploadDir;
    private array $allowedMimes;
    private int $maxSize;

    public function __construct(
        string $uploadDir,
        array $allowedMimes = ['image/jpeg', 'image/png', 'image/gif'],
        int $maxSize = 5 * 1024 * 1024  // 5MB
    ) {
        $this->uploadDir = rtrim($uploadDir, '/');
        $this->allowedMimes = $allowedMimes;
        $this->maxSize = $maxSize;
    }

    public function handle(array $file): string
    {
        // 1. 检查上传错误
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException("Upload error: {$file['error']}");
        }

        // 2. 检查文件大小
        if ($file['size'] > $this->maxSize) {
            throw new RuntimeException("File too large: {$file['size']} bytes");
        }

        // 3. 验证 MIME 类型（使用 finfo 而非信任客户端）
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $actualMime = $finfo->file($file['tmp_name']);
        if (!in_array($actualMime, $this->allowedMimes, true)) {
            throw new RuntimeException("Invalid MIME type: $actualMime");
        }

        // 4. 生成安全的文件名
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $safeName = bin2hex(random_bytes(16)) . '.' . $ext;

        // 5. 移动文件
        $destination = $this->uploadDir . '/' . $safeName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new RuntimeException("Failed to move uploaded file");
        }

        return $safeName;
    }
}

// 使用
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['avatar'])) {
    $uploader = new FileUploader('/var/www/uploads');
    try {
        $filename = $uploader->handle($_FILES['avatar']);
        echo "Uploaded: $filename";
    } catch (RuntimeException $e) {
        echo "Error: " . $e->getMessage();
    }
}
```

::: warning 警告
绝对不要信任 `$_FILES['file']['type']` — 它由客户端提供，可以伪造。必须使用 `finfo_file()` 检查服务端实际的 MIME 类型。同时，永远不要使用用户上传的原始文件名，它可能包含路径遍历字符。
:::

## phar 打包

phar（PHP Archive）允许将整个 PHP 应用打包成单个文件。

```php
<?php
// build.php — 创建 phar 包
$phar = new Phar('myapp.phar', 0, 'myapp.phar');
$phar->buildFromDirectory('/path/to/app', '/\.php$/');
$phar->setStub($phar->createDefaultStub('index.php'));

// 运行 phar
// php myapp.phar

// 提取 phar 内容
// php -r "Phar::extractTo('/tmp/extract', 'myapp.phar');"
```

## 临时文件管理

```php
<?php
declare(strict_types=1);

// 创建临时文件
[$handle, $tmpFile] = stream_create_pair('php://memory', 'r+');
// 或使用更简单的方式
$tmpFile = tempnam(sys_get_temp_dir(), 'php_');
file_put_contents($tmpFile, 'Temporary data');

// 使用后清理
register_shutdown_function(function() use ($tmpFile) {
    if (file_exists($tmpFile)) {
        unlink($tmpFile);
    }
});

// tmpfile() — 自动删除的临时文件
$tmp = tmpfile();
fwrite($tmp, 'temp data');
fseek($tmp, 0);
echo stream_get_contents($tmp);
fclose($tmp);  // 关闭时自动删除

// SplTempFileObject — OOP 方式
$temp = new SplTempFileObject(5 * 1024 * 1024);  // 最大 5MB
$temp->fwrite('temporary content');
$temp->rewind();
echo $temp->fread(1024);
// 对象销毁时自动删除
```
