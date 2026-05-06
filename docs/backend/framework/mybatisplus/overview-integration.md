# 概览与集成方式

MyBatis-Plus 建立在 MyBatis 之上，不替代 MyBatis 的核心执行链路。它主要增强三类能力：通用 Mapper 方法、条件构造器、常用插件。也就是说，复杂 SQL、ResultMap、TypeHandler、事务、Mapper 扫描这些基础仍然属于 MyBatis 和 Spring 体系。

## 与 MyBatis 的关系

| 能力 | MyBatis | MyBatis-Plus |
| --- | --- | --- |
| SQL 执行链路 | Executor、StatementHandler、ResultSetHandler | 复用 |
| Mapper XML | 手写 SQL、ResultMap | 继续支持 |
| 通用 CRUD | 需要自己写 | BaseMapper 自动提供 |
| 动态条件 | XML 动态 SQL | Wrapper API |
| 分页插件 | 需要自行配置插件 | 提供分页拦截器 |
| 逻辑删除 | 手写条件 | 注解和配置支持 |

使用 MyBatis-Plus 后，不代表所有 SQL 都应该用 Wrapper。复杂报表、深层 join、窗口函数、批量更新、数据库特定语法，仍然建议写 XML 或注解 SQL。

## Spring Boot 集成

常见配置：

```yaml
mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
  type-aliases-package: com.example.modules.*.entity
  configuration:
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: assign_id
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

关键点：

- `mapper-locations` 要覆盖所有 XML。
- 驼峰映射要和数据库命名规范统一。
- 主键策略要统一，避免不同模块有的自增、有的雪花。
- 逻辑删除字段要进入索引设计，否则所有查询都多一个低效条件。

## 适合使用的场景

MyBatis-Plus 适合：

- 大量单表 CRUD。
- 后台管理系统。
- 条件查询多，但 SQL 结构不复杂。
- 需要统一逻辑删除、乐观锁、自动填充。
- 团队已经熟悉 MyBatis，但想减少样板代码。

不适合完全依赖它处理复杂查询。Wrapper 链式写法一旦嵌套过深，可读性会下降，此时 XML 更清楚。

## 模块分层建议

常见分层：

| 层 | 职责 |
| --- | --- |
| Controller | 请求、校验、响应 |
| Service | 业务流程、事务边界 |
| Mapper | 数据访问入口，BaseMapper + 自定义 SQL |
| Entity | 表结构映射 |
| DTO / VO | 输入输出模型 |

不要把 Wrapper 构造逻辑散落在 Controller。复杂查询可以放到 QueryService 或 Mapper 自定义方法，保证 HTTP 层不直接理解数据库细节。
