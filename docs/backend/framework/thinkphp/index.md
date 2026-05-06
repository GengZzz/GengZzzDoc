# ThinkPHP

ThinkPHP 是国内 PHP 项目中常见的 Web framework，强调轻量、快速落地和符合中文团队习惯的工程组织。学习 ThinkPHP 要抓住入口生命周期、路由中间件、容器与门面、模型查询、验证器、缓存队列和部署实践。

## 学习顺序

| 顺序 | 章节 | 学习重点 |
| --- | --- | --- |
| 1 | [概览、目录与入口](./overview-structure) | 单应用/多应用、入口文件、配置、环境 |
| 2 | [路由、中间件与控制器](./routing-middleware-controller) | 路由规则、参数绑定、中间件管道、响应 |
| 3 | [容器、门面与配置](./container-facade-config) | 依赖注入、Facade、Provider、配置加载 |
| 4 | [模型、查询与事务](./orm-model-query) | Db 查询、模型、关联、查询范围、事务 |
| 5 | [验证、缓存、队列与事件](./validation-cache-queue) | Validate、Cache、Queue、Event |
| 6 | [部署与日常实践](./deployment-practice) | URL 重写、权限、缓存、日志、上线排查 |

## 动画重点

- 请求入口和中间件管道动画放在“[路由、中间件与控制器](./routing-middleware-controller)”。
- 模型查询与关联加载动画放在“[模型、查询与事务](./orm-model-query)”。
