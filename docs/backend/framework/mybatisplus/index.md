# MyBatis-Plus

MyBatis-Plus 是 MyBatis 的增强工具，核心目标是减少通用 CRUD 和条件构造样板代码，同时保留 MyBatis 对 SQL 的掌控能力。学习重点不是“会不会调用 `selectById`”，而是理解 BaseMapper、Service、Wrapper、自动填充、逻辑删除、分页插件、多租户插件和自定义 SQL 如何协同。

## 学习顺序

| 顺序 | 章节 | 学习重点 |
| --- | --- | --- |
| 1 | [概览与集成方式](./overview-integration) | 和 MyBatis 的关系、Spring Boot 集成、配置边界 |
| 2 | [Mapper、Service 与通用 CRUD](./mapper-service-crud) | BaseMapper、IService、ServiceImpl、批量操作 |
| 3 | [Wrapper 条件构造器](./wrapper-condition) | QueryWrapper、LambdaQueryWrapper、动态条件 |
| 4 | [实体映射、自动填充与逻辑删除](./entity-fill-logic-delete) | TableName、TableId、MetaObjectHandler、逻辑删除 |
| 5 | [插件、分页与多租户](./plugin-pagination-tenant) | MybatisPlusInterceptor、分页、乐观锁、租户拦截 |
| 6 | [代码生成与日常实践](./generator-practice) | Generator、XML 自定义 SQL、性能与边界 |

## 动画重点

- 通用 CRUD 注入链路动画放在“[Mapper、Service 与通用 CRUD](./mapper-service-crud)”。
- Wrapper 与拦截器改写 SQL 动画放在“[插件、分页与多租户](./plugin-pagination-tenant)”。
