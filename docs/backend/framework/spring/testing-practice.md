---
title: "测试"
description: "Spring 测试的目标不是“所有测试都启动完整容器”，而是按测试边界选择成本最低的方式。"
---

# 测试

Spring 测试的目标不是“所有测试都启动完整容器”，而是按测试边界选择成本最低的方式。

| 测试类型 | 是否启动 Spring | 适用场景 |
| --- | --- | --- |
| 纯单元测试 | 否 | 业务规则、工具类、领域服务 |
| Spring TestContext | 是 | 验证 Bean 装配、事务、事件、配置 |
| Slice Test | 部分启动 | Web 层、数据访问层等局部测试 |
| 集成测试 | 是，接近真实环境 | 数据库、消息、外部系统协作 |

示例：

```java
@SpringJUnitConfig(AppConfig.class)
class OrderServiceTest {
    @Autowired
    OrderService orderService;

    @Test
    void createsOrder() {
        Long orderId = orderService.createOrder(...);
        assertThat(orderId).isNotNull();
    }
}
```

事务测试中，Spring Test 默认可以在测试方法结束后回滚事务，适合保持数据库干净。但如果你要验证提交后的事件、触发器或异步流程，需要显式提交或换成更接近生产的集成测试策略。

## 日常开发心智模型

遇到 Spring 问题时，可以按这条链路定位：

1. **有没有 BeanDefinition**：扫描路径、条件注解、Profile、Import 是否生效。
2. **有没有 Bean 实例**：构造参数、依赖候选、懒加载、初始化异常。
3. **拿到的是不是代理**：事务、缓存、切面是否命中，调用是否经过代理。
4. **运行上下文是否正确**：事务传播、线程、Profile、配置源、事件时机。
5. **资源边界是否合理**：数据库连接、事务时长、外部 IO、异常回滚规则。

掌握这些机制后，Spring 就不再是“注解魔法”，而是一条可解释、可调试的对象创建与方法调用链。
