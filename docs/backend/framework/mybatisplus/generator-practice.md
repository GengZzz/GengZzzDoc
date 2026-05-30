---
title: "代码生成与日常实践"
description: "MyBatis-Plus 代码生成器可以快速生成 Entity、Mapper、Service、Controller 等模板。它适合提高起步效率，但生成出来的代码不是架构设计本身。"
---

# 代码生成与日常实践

MyBatis-Plus 代码生成器可以快速生成 Entity、Mapper、Service、Controller 等模板。它适合提高起步效率，但生成出来的代码不是架构设计本身。真正的质量来自边界、命名、查询设计、事务和测试。

## 代码生成适合什么

适合生成：

- Entity 字段映射。
- Mapper 接口和 XML 基础文件。
- Service 接口和实现骨架。
- Controller 基础 CRUD。
- 表字段注释、作者、包名、模板结构。

不适合生成：

- 复杂业务流程。
- 权限判断。
- 状态机。
- 跨表事务。
- 高性能报表 SQL。

生成代码后要清理无用接口，不要让每个表都暴露完整增删改查。

## XML 自定义 SQL

复杂查询建议写 XML：

```xml
<select id="selectOrderSummary" resultType="OrderSummaryVO">
  select o.id, o.order_no, u.nickname, sum(i.amount) total_amount
  from orders o
  join users u on u.id = o.user_id
  join order_items i on i.order_id = o.id
  where o.deleted = 0
  group by o.id, o.order_no, u.nickname
</select>
```

XML 的优势是 SQL 结构直观，适合 review 和 DBA 优化。Wrapper 更适合简单动态条件，不要为了“全程 Java 链式”牺牲 SQL 可读性。

## 事务实践

Service 层定义事务边界：

```java
@Transactional(rollbackFor = Exception.class)
public void approveOrder(Long orderId) {
    OrderDO order = getById(orderId);
    order.approve();
    updateById(order);
    orderLogMapper.insert(OrderLogDO.approved(orderId));
}
```

注意：

- `@Transactional` 放在 public 方法上，并通过 Spring 代理调用。
- 同类内部调用不会触发事务代理。
- 捕获异常后不抛出，事务可能不会回滚。
- 外部 HTTP 调用不要放进事务内部。

## 项目规范

建议统一：

1. Entity 后缀，如 `UserDO`。
2. Mapper 只负责数据访问，不写业务判断。
3. Service 方法命名表达业务动作，如 `approveOrder`，不是 `updateStatus`。
4. Wrapper 构造逻辑集中在 Service 或 QueryService。
5. 逻辑删除、租户、审计字段统一基类。
6. 自定义 SQL 必须说明索引和分页策略。

## 常见坑

| 坑 | 后果 | 建议 |
| --- | --- | --- |
| 过度生成 Controller | 暴露不该开放的接口 | 只保留真实业务入口 |
| 全部使用 `updateById` | null 处理和状态校验混乱 | 明确 DTO、字段策略和状态机 |
| Wrapper 写复杂 join | 可读性差、难优化 | XML 自定义 SQL |
| 忽略插件改写 | 数据越权或分页错误 | 看最终 SQL，写集成测试 |
| Entity 直接返回前端 | 字段泄露、格式不稳定 | 使用 VO / DTO |
