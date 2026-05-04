# 部署

生产环境 PHP 应用的标准部署架构是 Nginx + PHP-FPM，配合 Docker 容器化和 Composer 依赖管理。

## Nginx + PHP-FPM 配置

```nginx
# /etc/nginx/sites-available/myapp.conf
server {
    listen 80;
    server_name example.com;
    root /var/www/myapp/public;
    index index.php;

    # 字符集
    charset utf-8;

    # 日志
    access_log /var/log/nginx/myapp_access.log;
    error_log /var/log/nginx/myapp_error.log;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # PHP 文件处理
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

        # FastCGI 参数调优
        include fastcgi_params;

        # Buffer 大小
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;
        fastcgi_busy_buffers_size 256k;

        # 超时设置
        fastcgi_connect_timeout 60s;
        fastcgi_send_timeout 60s;
        fastcgi_read_timeout 60s;

        # 传递真实客户端信息
        fastcgi_param HTTP_X_REAL_IP $remote_addr;
        fastcgi_param HTTP_X_FORWARDED_FOR $proxy_add_x_forwarded_for;
        fastcgi_param HTTP_X_FORWARDED_PROTO $scheme;
    }

    # URL 重写（Laravel）
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # 安全：禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }

    # 禁止直接访问 .env 文件
    location ~ /\.env {
        deny all;
        return 404;
    }

    # 上传大小限制
    client_max_body_size 20M;
}
```

## PHP-FPM 进程管理

```ini
; /etc/php/8.3/fpm/pool.d/www.conf

; 进程管理方式
; static  — 固定数量进程（适合内存充足的服务器）
; dynamic — 动态调整进程数（推荐）
; ondemand — 按需创建进程（适合低流量场景）
pm = dynamic

; 最大子进程数（最关键参数）
; 计算公式：max_children = (总内存 - 系统预留) / 单进程内存
; 例：8GB 内存，系统预留 2GB，单进程 50MB
; max_children = (8192 - 2048) / 50 ≈ 120
pm.max_children = 50

; 动态模式参数
pm.start_servers = 10        ; 启动时的进程数
pm.min_spare_servers = 5     ; 最小空闲进程数
pm.max_spare_servers = 15    ; 最大空闲进程数

; 每个子进程处理的最大请求数（防内存泄漏）
pm.max_requests = 1000

; 状态页（监控用）
pm.status_path = /fpm-status

; 慢日志（排查慢请求）
slowlog = /var/log/php-fpm/www-slow.log
request_slowlog_timeout = 5s

; 进程空闲超时（ondemand 模式）
pm.process_idle_timeout = 10s

; PHP 配置覆盖
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 30
php_admin_value[upload_max_filesize] = 20M
```

::: tip 提示
`pm.max_children` 的计算是部署时最重要的配置之一。设得太小会导致请求排队（502/504），设得太大会耗尽内存触发 OOM Killer。用 `ps aux | grep php-fpm | awk '{print $6}'` 查看实际单进程内存。
:::

## Docker 多阶段构建

```dockerfile
# 多阶段构建 — 生产环境 PHP-FPM 镜像

# === 阶段 1：依赖安装 ===
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# === 阶段 2：应用构建 ===
FROM php:8.3-fpm AS app

# 安装系统依赖和 PHP 扩展
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql \
        opcache \
        gd \
        zip \
        bcmath \
        pcntl \
    && pecl install redis && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# OPcache 配置
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

# PHP-FPM 配置
COPY docker/php/fpm-pool.conf /usr/local/etc/php-fpm.d/www.conf

# Nginx 配置
COPY docker/nginx/default.conf /etc/nginx/sites-available/default

# Supervisor 配置（管理 nginx + php-fpm）
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 复制依赖
COPY --from=vendor /app/vendor /var/www/html/vendor

# 复制应用代码
COPY . /var/www/html

# 设置权限
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 构建时运行
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

```ini
; docker/php/opcache.ini
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 20000
opcache.validate_timestamps = 0
opcache.save_comments = 1
opcache.jit = 1255
opcache.jit_buffer_size = 128M
```

## 环境变量管理

```bash
# .env 文件示例（不要提交到版本控制）
APP_NAME=MyApp
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:xxxxxxxxxxxxxxxxxxxx

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=myapp
DB_USERNAME=app
DB_PASSWORD=secret

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
```

```php
<?php
// 使用 vlucas/phpdotenv 加载环境变量
require 'vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// 安全加载（文件不存在不报错）
$dotenv->safeLoad();

// 读取环境变量
$dbHost = $_ENV['DB_HOST'];
$dbPort = getenv('DB_PORT');
$appDebug = env('APP_DEBUG', false);  // Laravel 辅助函数

// 不可变模式（防止运行时修改）
$dotenv->required(['DB_HOST', 'DB_DATABASE', 'DB_USERNAME'])->notEmpty();
$dotenv->required('APP_ENV')->allowedValues(['production', 'staging', 'local']);
```

::: warning 警告
`.env` 文件包含敏感信息（数据库密码、API Key），绝对不能提交到 Git。确保 `.gitignore` 中包含 `.env`。在 Docker 中，使用 Docker Secrets 或环境变量注入而非将 `.env` 文件 bake 到镜像中。
:::
