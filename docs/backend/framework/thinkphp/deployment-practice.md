---
title: "部署与日常实践"
description: "ThinkPHP 上线时最常见的问题不是语法，而是 Web 根目录、URL 重写、目录权限、环境配置、缓存和日志。生产环境要把安全和可排查性放在第一位。"
---

# 部署与日常实践

ThinkPHP 上线时最常见的问题不是语法，而是 Web 根目录、URL 重写、目录权限、环境配置、缓存和日志。生产环境要把安全和可排查性放在第一位。

## Web 根目录

Web Server 根目录应该指向 `public`。不要暴露项目根目录。Nginx 常见配置重点：

```nginx
root /var/www/app/public;
index index.php;

location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

URL 重写错误会导致路由 404 或只有首页能打开。排查时先确认请求是否进入 `public/index.php`，再看路由是否匹配。

## 权限与运行目录

`runtime` 目录需要运行用户可写。权限问题常见表现：

- 日志写入失败。
- 缓存生成失败。
- 模板编译失败。
- 上传文件失败。

不要简单粗暴给全站 `777`。应确认 PHP-FPM 用户、部署用户和目录归属，给必要目录最小可写权限。

## 环境配置

生产环境建议：

- `app_debug=false`。
- 数据库、缓存、队列密码通过环境变量注入。
- 日志级别按生产需求配置，错误日志要能被收集。
- 开启 OPcache，减少 PHP 文件解析开销。
- 明确 session、cache、queue 驱动。

## 上线清单

1. 安装依赖并关闭 dev 包。
2. 检查 `.env` 和 `config`。
3. 执行数据库迁移或 SQL 变更。
4. 清理旧缓存，必要时预热配置和路由。
5. 重启 PHP-FPM 或队列 Worker。
6. 检查首页、健康接口、登录、关键 API。
7. 查看错误日志和慢查询。

## 日常排查

| 现象 | 可能原因 | 排查方向 |
| --- | --- | --- |
| 404 | URL 重写或路由未匹配 | Nginx try_files、route:list |
| 500 | 配置错误、权限、依赖缺失 | PHP 错误日志、runtime 日志 |
| 修改配置无效 | 缓存未清理 | 清理 runtime/cache |
| 上传失败 | 目录权限或大小限制 | PHP upload 配置、目录权限 |
| 队列不消费 | Worker 未启动或连接错误 | 进程管理、队列配置、日志 |
