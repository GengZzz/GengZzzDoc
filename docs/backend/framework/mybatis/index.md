# MyBatis

MyBatis 是 SQL mapper framework，适合需要掌控 SQL、参数绑定、结果映射和执行性能的 Java 后端项目。原来的长文已经拆成多个章节，方便按主题学习和回查。

## 学习顺序

| 顺序 | 章节 | 学习重点 |
| --- | --- | --- |
| 1 | [概览与执行链路](./overview-executor) | MapperProxy、MappedStatement、Executor、JDBC、对象映射 |
| 2 | [会话、Mapper 与 SQL 写法](./session-mapper-sql) | SqlSessionFactory、SqlSession、XML 与注解选择 |
| 3 | [参数绑定与动态 SQL](./parameters-dynamic-sql) | `#{}` / `${}`、foreach、if、where、set、trim |
| 4 | [结果映射与 N+1](./resultmap-n-plus-one) | ResultType、ResultMap、嵌套映射、延迟加载风险 |
| 5 | [缓存与 Executor](./cache-executor) | CacheKey、一级缓存、二级缓存、Executor 类型 |
| 6 | [插件、分页与批量写入](./plugins-pagination-batch) | Interceptor、分页策略、批处理提交 |
| 7 | [Spring 集成与常见坑](./spring-integration-practice) | Spring Boot 集成、事务、Mapper 扫描、日常落地建议 |

## 动画重点

- Mapper 执行链路动画放在“[概览与执行链路](./overview-executor)”。
- CacheKey 与缓存边界动画放在“[缓存与 Executor](./cache-executor)”。
