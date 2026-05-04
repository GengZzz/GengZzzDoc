# Python

Python 是一门解释型、动态类型的通用编程语言。它以简洁语法和丰富生态著称，在 Web 开发、数据科学、自动化脚本和 AI 工程领域广泛应用。

本文档深入 Python 语言核心机制（GIL、内存管理、元类、协程），覆盖日常开发中遇到的实际问题（内存泄漏、循环引用、依赖管理混乱），并结合 FastAPI、SQLAlchemy、pytest 等主流框架的工程实践。

## 学习路径

| 阶段 | 主题 | 核心内容 |
|------|------|---------|
| 入门 | [Python 简介与环境搭建](./introduction-setup) | CPython/PyPy/Jython、pip/venv/poetry、IDE 配置 |
| 入门 | [语法基础](./syntax-basics) | 动态类型、缩进规则、PEP 8 编码规范 |
| 基础 | [数据类型](./data-types) | int/float/str/bytes 精度与编码、真值测试 |
| 基础 | [控制流程](./control-flow) | if/for/while、match-case、列表推导式、海象运算符 |
| 基础 | [函数](./functions) | 默认参数陷阱、\*args/\*\*kwargs、LEGB 作用域、闭包 |
| 数据结构 | [内置数据结构](./data-structures) | list 动态数组、dict 哈希表、collections 模块 |
| 数据结构 | [高级数据结构](./advanced-structures) | 生成器、迭代器协议、itertools、堆与二分查找 |
| 面向对象 | [类与对象](./classes-objects) | 属性访问、描述符协议、\_\_slots\_\_ 内存优化 |
| 面向对象 | [继承与 Mixin](./inheritance-mixins) | MRO C3 线性化、super() 机制、ABC 抽象基类 |
| 面向对象 | [魔术方法](./magic-methods) | \_\_new\_\_ vs \_\_init\_\_、上下文管理器、元类基础 |
| 高级特性 | [装饰器与闭包](./decorators-closures) | 装饰器本质、带参数装饰器、functools.wraps |
| 高级特性 | [错误处理](./error-handling) | 异常层次、异常链、上下文管理器与资源清理 |
| 高级特性 | [类型注解](./type-annotations) | typing 模块、Protocol、Pydantic 验证、mypy |
| 并发 | [多线程与多进程](./threading-multiprocessing) | GIL 本质与影响、multiprocessing、进程间通信 |
| 并发 | [异步编程](./async-programming) | async/await、asyncio 事件循环、aiohttp、信号量 |
| Web | [Web 框架](./web-frameworks) | Flask、FastAPI（依赖注入、WebSocket）、Django MTV |
| Web | [数据库与 ORM](./database-orm) | SQLAlchemy 声明式模型、Alembic 迁移、asyncpg |
| 工程 | [标准库常用模块](./stdlib-modules) | pathlib、re、json/csv、datetime、logging、subprocess |
| 工程 | [项目结构与工程化](./project-structure) | pyproject.toml、poetry、pytest、CI 集成 |

## 分类导航

### 入门
- [Python 简介与环境搭建](./introduction-setup)
- [语法基础](./syntax-basics)

### 数据类型与流程
- [数据类型](./data-types)
- [控制流程](./control-flow)
- [函数](./functions)

### 数据结构
- [内置数据结构](./data-structures)
- [高级数据结构](./advanced-structures)

### 面向对象
- [类与对象](./classes-objects)
- [继承与 Mixin](./inheritance-mixins)
- [魔术方法](./magic-methods)

### 高级特性
- [装饰器与闭包](./decorators-closures)
- [错误处理](./error-handling)
- [类型注解](./type-annotations)

### 并发编程
- [多线程与多进程](./threading-multiprocessing)
- [异步编程](./async-programming)

### Web 开发
- [Web 框架](./web-frameworks)
- [数据库与 ORM](./database-orm)

### 工程实践
- [标准库常用模块](./stdlib-modules)
- [项目结构与工程化](./project-structure)
