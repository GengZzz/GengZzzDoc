# PHP 简介与环境搭建

PHP（PHP: Hypertext Preprocessor）最初由 Rasmus Lerdorf 于 1994 年创建，最初只是一个用 C 编写的 CGI 脚本，用于追踪访问者信息。经过 30 年发展，PHP 已经演变为一门成熟的动态语言，拥有强大的生态系统。

## 版本演进与性能飞跃

PHP 的性能在大版本升级中有了质的飞跃：

| 版本 | 年份 | 核心变化 | 性能对比 |
|------|------|----------|----------|
| PHP 5.x | 2004-2018 | Zend Engine II、命名空间、晚期静态绑定 | 基准线 |
| PHP 7.0 | 2015 | phpng 引擎重写、zval 结构优化 | 性能翻倍 |
| PHP 7.4 | 2019 | 类型化属性、预加载（Preloading） | 比 7.0 再快 10% |
| PHP 8.0 | 2020 | JIT 编译器、联合类型、match 表达式 | CPU 密集场景提升显著 |
| PHP 8.1 | 2021 | Fibers、枚举、只读属性 | 持续优化 |
| PHP 8.3 | 2023 | 类型化常量、json_validate | 语言完善 |

::: tip 提示
PHP 7.0 的性能飞跃来自于 phpng（PHP Next Generation）项目重写 Zend Engine 内存管理。核心改进是将 zval 从堆分配改为栈分配，减少内存碎片和 malloc 调用。
:::

```php
// PHP 7.0 之前：zval 在堆上分配，每个变量一次 malloc
// PHP 7.0+：zval 直接嵌入 HashTable 的 Bucket 中，零额外分配
$a = "hello";  // zval 在栈上，value.ptr 指向堆上的字符串
$b = 42;       // zval 存储 int 值，不分配额外内存
```

## 安装方式

### macOS (Homebrew)

```bash
# 安装最新版 PHP
brew install php

# 安装指定版本
brew install php@8.3

# 切换版本
brew unlink php@8.2 && brew link php@8.3

# 验证安装
php -v
php -m  # 查看已加载扩展
```

### Ubuntu/Debian (apt)

```bash
# 添加 Ondrej PPA（提供多版本 PHP）
sudo add-apt-repository ppa:ondrej/php
sudo apt update

# 安装 PHP 8.3 + 常用扩展
sudo apt install php8.3 php8.3-cli php8.3-fpm php8.3-mysql \
  php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-opcache

# 验证安装
php -v
```

### Docker

```bash
# 使用官方镜像
docker run --rm php:8.3-cli php -v

# 带扩展的开发环境
docker run --rm -v $(pwd):/app -w /app php:8.3-cli php index.php
```

```dockerfile
# Dockerfile 示例
FROM php:8.3-fpm

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    git \
    && docker-php-ext-install pdo_mysql zip opcache

# 安装 Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 配置 OPcache
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini
```

## php.ini 核心配置

PHP 配置文件控制着运行时行为，以下是生产环境必须关注的配置项：

```ini
; === 内存与执行时间 ===
memory_limit = 256M          ; 单个脚本最大内存（Laravel 建议至少 128M）
max_execution_time = 30      ; 最大执行时间（秒）
max_input_time = 60          ; 最大解析请求时间

; === 错误处理 ===
display_errors = Off         ; 生产环境关闭显示错误
log_errors = On              ; 开启错误日志
error_log = /var/log/php/error.log
error_reporting = E_ALL      ; 记录所有错误

; === 文件上传 ===
upload_max_filesize = 20M    ; 单文件最大大小
post_max_size = 25M          ; POST 数据最大大小（应大于 upload_max_filesize）
max_file_uploads = 20        ; 最大上传文件数

; === Session 配置 ===
session.save_handler = files ; 或 redis/memcached
session.gc_maxlifetime = 1440 ; Session 有效期（秒）
session.cookie_httponly = 1   ; 防止 JS 访问 Session Cookie
session.cookie_secure = 1     ; 仅 HTTPS 传输
session.cookie_samesite = Lax ; CSRF 防护

; === OPcache（生产必开）===
opcache.enable = 1
opcache.memory_consumption = 256
opcache.max_accelerated_files = 20000
opcache.validate_timestamps = 0  ; 生产环境关闭文件检查
```

::: warning 警告
`display_errors = On` 绝对不能在生产环境开启。错误信息泄露可能暴露数据库凭据、文件路径等敏感信息。
:::

## Composer 安装与使用

Composer 是 PHP 的依赖管理工具，类似于 Node.js 的 npm 或 Python 的 pip。

```bash
# 安装 Composer（全局）
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# 验证
composer --version

# 创建新项目（以 Laravel 为例）
composer create-project laravel/laravel my-app

# 在已有项目中安装依赖
composer install

# 添加依赖
composer require guzzlehttp/guzzle

# 添加开发依赖
composer require --dev phpunit/phpunit

# 自动加载原理：PSR-4
# composer.json 中定义命名空间到目录的映射
```

```json
// composer.json 中的 PSR-4 配置
{
  "autoload": {
    "psr-4": {
      "App\\": "app/",
      "Database\\Factories\\": "database/factories/",
      "Database\\Seeders\\": "database/seeders/"
    }
  }
}
```

```bash
# 修改 autoload 后需要重新生成映射
composer dump-autoload
```

::: tip 提示
PSR-4 自动加载的核心是 `spl_autoload_register()`。当代码中使用一个未加载的类时，PHP 会根据 PSR-4 规则将命名空间 `\` 替换为目录分隔符，拼出文件路径并 require。
:::

## Hello World 与内置 Web Server

### CLI 模式

```php
<?php
// hello.php
declare(strict_types=1);

echo "Hello, PHP " . PHP_VERSION . "\n";

// 获取当前 SAPI
echo "Running on: " . php_sapi_name() . "\n";
```

```bash
php hello.php
# Hello, PHP 8.3.6
# Running on: cli
```

### 内置 Web Server

PHP 5.4+ 内置了开发用 Web Server，不需要 Apache 或 Nginx：

```bash
# 启动开发服务器（默认 localhost:8000）
php -S localhost:8000

# 指定文档根目录
php -S localhost:8000 -t public/

# 使用路由器脚本（模拟 URL 重写）
php -S localhost:8000 router.php
```

```php
<?php
// router.php - 简单的路由器脚本
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$filePath = __DIR__ . '/public' . $path;

if (is_file($filePath)) {
    // 直接返回静态文件
    return false;
}

// 所有其他请求都交给 index.php
require __DIR__ . '/public/index.php';
```

::: warning 警告
内置 Web Server 是单线程阻塞模型，仅用于本地开发。绝对不要在生产环境使用。
:::

## PHP 运行模式

PHP 有多种运行模式，适用于不同场景：

| 运行模式 | 说明 | 适用场景 |
|----------|------|----------|
| CLI | 命令行模式 | 脚本任务、Composer、队列 Worker |
| PHP-FPM | FastCGI 进程管理 | Web 服务（Nginx 配合） |
| Apache mod_php | Apache 模块 | Apache 服务器（已较少使用） |
| 内置 Server | 单线程阻塞 | 本地开发 |

现代 Web 应用的标准部署架构是 **Nginx + PHP-FPM**，通过 FastCGI 协议通信。Nginx 负责处理静态文件和负载均衡，PHP-FPM 负责执行 PHP 代码。

```bash
# 查看当前 PHP 版本和编译信息
php -v
php -i | grep "Server API"    # 查看运行模式
php --ini                      # 查看加载的配置文件
php -m                         # 列出所有扩展
php -r "echo ini_get('memory_limit');"  # 查看配置值
```
