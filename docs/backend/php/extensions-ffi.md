# 扩展与 FFI

PHP 的功能可以通过扩展（Extension）来增强。扩展可以用 C 编写（传统方式）或通过 FFI（Foreign Function Interface，PHP 7.4+）直接调用 C 代码。

## PHP 扩展加载机制

PHP 扩展分为两类：

1. **内置扩展**：编译到 PHP 二进制中（如 standard、json、date）
2. **外部扩展**：通过 `.so`/`.dll` 动态加载（如 redis、swoole、gd）

```bash
# 查看所有已加载扩展
php -m

# 查看扩展详细信息
php --ri redis

# 查看扩展加载路径
php -i | grep extension_dir

# 动态加载扩展（php.ini）
# extension=redis.so
# extension=swoole.so
```

```ini
; php.ini 中加载扩展
extension=pdo_mysql.so
extension=mbstring.so
extension=gd.so
extension=redis.so
extension=opcache.so

; 在特定扩展目录下
extension_dir = "/usr/local/lib/php/extensions/no-debug-non-zits-20230831"
extension=swoole.so
```

## 常用扩展

### mbstring — 多字节字符串

```php
<?php
// mbstring 提供了对多字节字符（UTF-8、GBK等）的安全处理
// 普通 strlen 按字节计数，mb_strlen 按字符计数
echo strlen("你好世界");      // 12（UTF-8 中每个中文 3 字节）
echo mb_strlen("你好世界");    // 4（正确的字符数）

echo mb_strtoupper("héllo");  // "HÉLLO"
echo mb_substr("你好世界", 0, 2);  // "你好"

// 字符编码转换
$gbk = mb_convert_encoding("你好", "GBK", "UTF-8");
$utf8 = mb_convert_encoding($gbk, "UTF-8", "GBK");

// 检测编码
$encoding = mb_detect_encoding($text, ['UTF-8', 'GBK', 'Shift-JIS'], true);

// 设置默认编码
mb_internal_encoding('UTF-8');
```

### redis — Redis 客户端

```php
<?php
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// 如果需要密码
$redis->auth('your-redis-password');

// 选择数据库
$redis->select(0);

// 基本操作
$redis->set('key', 'value');
$redis->get('key');
$redis->expire('key', 3600);

// 哈希操作
$redis->hSet('user:1', 'name', 'Alice');
$redis->hGetAll('user:1');

// 列表操作
$redis->lPush('queue', 'job1');
$redis->rPop('queue');

// Pipeline — 批量操作减少网络往返
$redis->pipeline(function($pipe) {
    for ($i = 0; $i < 1000; $i++) {
        $pipe->set("key:$i", "value:$i");
    }
});
```

### gd — 图像处理

```php
<?php
// 创建图像
$img = imagecreatetruecolor(400, 300);
$bg = imagecolorallocate($img, 255, 255, 255);
imagefill($img, 0, 0, $bg);

// 绘制文字
$black = imagecolorallocate($img, 0, 0, 0);
imagestring($img, 5, 10, 10, 'Hello GD', $black);

// 保存
imagepng($img, '/tmp/test.png');
imagedestroy($img);

// 缩放图片
function resizeImage(string $src, string $dest, int $maxWidth, int $maxHeight): bool
{
    $info = getimagesize($src);
    $ratio = min($maxWidth / $info[0], $maxHeight / $info[1]);
    $newWidth = (int)($info[0] * $ratio);
    $newHeight = (int)($info[1] * $ratio);

    $srcImg = match($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_PNG => imagecreatefrompng($src),
        IMAGETYPE_GIF => imagecreatefromgif($src),
        default => throw new RuntimeException("Unsupported image type"),
    };

    $destImg = imagecreatetruecolor($newWidth, $newHeight);
    imagecopyresampled($destImg, $srcImg, 0, 0, 0, 0, $newWidth, $newHeight, $info[0], $info[1]);

    $result = match($info[2]) {
        IMAGETYPE_JPEG => imagejpeg($destImg, $dest, 90),
        IMAGETYPE_PNG => imagepng($destImg, $dest),
        IMAGETYPE_GIF => imagegif($destImg, $dest),
    };

    imagedestroy($srcImg);
    imagedestroy($destImg);
    return $result;
}
```

### opcache — OPcache

```php
<?php
// OPcache 扩展信息
$status = opcache_get_status();
echo "缓存命中率: " . ($status['opcache_statistics']['opcache_hit_rate'] ?? 'N/A') . "%\n";
echo "已缓存脚本: " . $status['opcache_statistics']['num_cached_scripts'] . "\n";
echo "内存使用: " . round($status['memory_usage']['used_memory'] / 1024 / 1024, 2) . "MB\n";

// 清除指定文件的缓存
opcache_invalidate('/path/to/file.php', true);

// 清除所有缓存
opcache_reset();

// 编译时优化状态
$conf = opcache_get_configuration();
foreach ($conf['directives'] as $key => $value) {
    echo "$key = $value\n";
}
```

## FFI（Foreign Function Interface）

FFI 允许 PHP 直接调用 C 函数和访问 C 数据结构，无需编写 C 扩展。

```php
<?php
// 启用 FFI（php.ini）
// ffi.enable = true

// FFI::load() 加载 C 头文件
// 定义 C 函数和结构体
$ffi = FFI::cdef("
    // 标准 C 库函数
    int printf(const char *format, ...);
    void *malloc(size_t size);
    void free(void *ptr);

    // 自定义函数签名
    double sqrt(double x);
    double pow(double x, double y);
    int abs(int x);

    // 结构体定义
    typedef struct {
        double x;
        double y;
    } Point;
", "libc.so.6");  // Linux: libc.so.6 | macOS: libc.dylib | Windows: msvcrt.dll

// 调用 C 函数
$ffi->printf("Hello from C: %d\n", 42);
echo $ffi->sqrt(2.0);       // 1.4142135623731
echo $ffi->pow(2.0, 10.0);  // 1024.0

// 使用 C 结构体
$point = $ffi->new("Point");
$point->x = 3.0;
$point->y = 4.0;

// 动态内存分配
$buffer = $ffi->malloc(1024);
// 使用 $buffer...
$ffi->free($buffer);
```

```php
<?php
// 实际场景：使用 FFI 调用 libz 压缩
$ffi = FFI::cdef("
    unsigned long compressBound(unsigned long sourceLen);
    int compress(unsigned char *dest, unsigned long *destLen,
                 const unsigned char *source, unsigned long sourceLen);
    int uncompress(unsigned char *dest, unsigned long *destLen,
                   const unsigned char *source, unsigned long sourceLen);
", "libz.so.1");

function ffiCompress(string $data): string
{
    global $ffi;
    $sourceLen = strlen($data);
    $destLen = $ffi->compressBound($sourceLen);

    $source = $ffi->new("unsigned char[$sourceLen]");
    $dest = $ffi->new("unsigned char[$destLen]");
    $destLenPtr = $ffi->new("unsigned long");
    $destLenPtr->cdata = $destLen;

    FFI::memcpy($source, $data, $sourceLen);
    $result = $ffi->compress($dest, $destLenPtr, $source, $sourceLen);

    if ($result !== 0) {
        throw new RuntimeException("Compression failed: $result");
    }

    return FFI::string($dest, $destLenPtr->cdata);
}

$compressed = ffiCompress("Hello World! " . str_repeat("x", 1000));
echo "Compressed size: " . strlen($compressed) . " bytes\n";
```

::: warning 警告
FFI 调用绕过了 PHP 的内存安全机制。不当使用可能导致段错误（Segfault）、内存泄漏或数据损坏。生产环境建议使用成熟的 C 扩展而非 FFI。FFI 更适合原型开发和性能关键路径的实验。
:::

## PHP 扩展开发简介

PHP 扩展使用 C 语言和 Zend API 编写。

```c
// myext.c — 一个简单的 PHP 扩展
#ifdef HAVE_CONFIG_H
#include "config.h"
#endif

#include "php.h"

// 定义函数
PHP_FUNCTION(my_greet)
{
    char *name;
    size_t name_len;

    ZEND_PARSE_PARAMETERS_START(1, 1)
        Z_PARAM_STRING(name, name_len)
    ZEND_PARSE_PARAMETERS_END();

    php_printf("Hello, %s! (from C extension)\n", name);
}

// 函数注册表
const zend_function_entry myext_functions[] = {
    PHP_FE(my_greet, NULL)
    PHP_FE_END
};

// 扩展入口
zend_module_entry myext_module_entry = {
    STANDARD_MODULE_HEADER,
    "myext",
    myext_functions,
    NULL, NULL, NULL, NULL, NULL,
    "1.0",
    STANDARD_MODULE_PROPERTIES
};

#ifdef COMPILE_DL_MYEXT
ZEND_GET_MODULE(myext)
#endif
```

```php
<?php
// 编译后可以直接使用
my_greet("World");  // "Hello, World! (from C extension)"
```

```bash
# 扩展编译步骤
phpize
./configure --enable-myext
make
make install

# 测试
echo "extension=myext.so" >> php.ini
php -r 'my_greet("PHP");'
```
