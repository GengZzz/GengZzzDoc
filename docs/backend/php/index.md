# PHP 技术文档

PHP 是一门专为 Web 开发设计的服务端脚本语言，全球约 77% 的网站使用 PHP 驱动（W3Techs 数据）。从 WordPress 到 Laravel，从 Facebook 早期架构到现代 SaaS 应用，PHP 在 Web 领域占据着不可忽视的地位。

本系列文档不满足于"Hello World"层面的介绍，而是深入 PHP 内核原理、现代语言特性、Laravel 框架设计、安全防护以及生产环境部署调优。

## 学习路径

| 阶段 | 主题 | 核心内容 |
|------|------|----------|
| 入门 | 简介与环境搭建 | 版本演进、安装配置、Composer、Hello World |
| 入门 | 语言基础 | 变量类型、运算符、控制流、函数、字符串 |
| 类型系统 | 类型系统 | 标量类型声明、联合类型、枚举、类型转换陷阱 |
| 类型系统 | 函数与闭包 | 一等函数、闭包、高阶函数、箭头函数 |
| 面向对象 | 类与对象 | 属性、构造器提升、trait、匿名类 |
| 面向对象 | 继承与接口 | 抽象类、接口默认方法、后期静态绑定 |
| 面向对象 | 魔术方法与属性 | 魔术方法、ArrayAccess、Attributes |
| 数据处理 | 数组与数据结构 | HashTable 底层、SPL 容器、生成器 |
| 数据处理 | 文件 I/O 与流 | 文件操作、流与上下文、phar 打包 |
| 数据库 | PDO 数据库操作 | 预处理语句、事务、连接池 |
| 数据库 | Eloquent 模型 | 关系、N+1 问题、模型事件 |
| Web 开发 | HTTP 与 Session | 请求处理、Session 安全、CSRF |
| Web 开发 | Laravel 架构 | 生命周期、服务容器、中间件管道 |
| Web 开发 | Laravel 进阶 | 队列、事件、任务调度、API 资源 |
| 异步与扩展 | 异步与并发 | Fibers、Swoole、RoadRunner |
| 异步与扩展 | 扩展与 FFI | 扩展加载、FFI、Zend API |
| 安全 | Web 安全 | SQL 注入、XSS、CSRF、密码哈希 |
| 部署与调优 | 部署 | Nginx + PHP-FPM、Docker、Composer |
| 部署与调优 | 性能与调试 | OPcache、JIT、Xdebug、Blackfire |

## 交互演示

本系列包含 3 个 Vue 交互动画组件：

- **Zval 写时复制** — 展示 PHP 变量内部的 zval 结构、引用计数和 COW 机制
- **Laravel 请求生命周期** — 步进式展示 HTTP 请求在 Laravel 中的完整处理流程
- **OPcache 缓存机制** — 展示从首次编译到 JIT 机器码的完整缓存演进

## 适用读者

- 有其他语言基础（Java/Python/Go），需要快速掌握 PHP 的开发者
- 使用 Laravel 但希望深入理解框架原理的开发者
- 需要排查 PHP 生产环境问题的运维工程师
