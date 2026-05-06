<script setup>
import SpringIocLifecycleDemo from '../../../.vitepress/theme/components/SpringIocLifecycleDemo.vue'
import SpringAopTransactionDemo from '../../../.vitepress/theme/components/SpringAopTransactionDemo.vue'
</script>

# AOP 代理

Spring AOP 基于代理对象工作。调用方拿到的 Bean 如果命中切面，通常不是目标类本身，而是代理：

- 有接口时常用 JDK 动态代理，代理接口方法。
- 没有接口或配置强制 class 代理时使用 CGLIB，生成目标类子类。

核心概念：

| 概念 | 说明 |
| --- | --- |
| Join Point | 可被增强的位置，Spring AOP 中主要是方法执行 |
| Pointcut | 匹配哪些方法需要增强 |
| Advice | 在何时做什么，如 before、after、around |
| Aspect | Pointcut 与 Advice 的组合 |
| Advisor | Spring 内部常用的切面承载结构 |

```java
@Aspect
@Component
public class SlowLogAspect {
    @Around("@annotation(SlowLog)")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        long begin = System.nanoTime();
        try {
            return pjp.proceed();
        } finally {
            long costMs = (System.nanoTime() - begin) / 1_000_000;
            // write metric or log
        }
    }
}
```

AOP 最容易踩的点是“只有经过代理的外部调用才会被增强”。同一个类内部 `this.inner()` 属于自调用，不经过代理，因此 `@Transactional`、`@Cacheable`、自定义切面都可能失效。

## 事务传播与隔离

Spring 声明式事务本质上是一个 AOP 增强。调用代理方法时，`TransactionInterceptor` 根据 `@Transactional` 元数据决定是否开启、加入、挂起、提交或回滚事务。

<SpringAopTransactionDemo />

常用传播行为：

| 传播行为 | 含义 | 常见场景 |
| --- | --- | --- |
| `REQUIRED` | 有事务就加入，没有就新建 | 默认选择，适合大多数 service 方法 |
| `REQUIRES_NEW` | 总是新建事务，外层事务挂起 | 记录操作日志、发送站内消息，需要独立提交 |
| `NESTED` | 嵌套事务，通常基于保存点 | 批处理中局部失败回滚 |
| `SUPPORTS` | 有事务就加入，没有就非事务执行 | 查询方法可复用调用方事务 |
| `NOT_SUPPORTED` | 以非事务执行，已有事务挂起 | 不希望长事务包住慢 IO |
| `MANDATORY` | 必须已有事务，否则报错 | 强制只能被事务流程调用 |
| `NEVER` | 必须无事务，否则报错 | 禁止事务上下文的特殊操作 |

隔离级别决定一个事务能看到其他事务的哪些修改：

| 隔离级别 | 可避免的问题 | 说明 |
| --- | --- | --- |
| `READ_UNCOMMITTED` | 几乎不避免 | 可能读到未提交数据，少用 |
| `READ_COMMITTED` | 脏读 | Oracle、PostgreSQL 常见默认级别 |
| `REPEATABLE_READ` | 脏读、不可重复读 | MySQL InnoDB 常见默认级别，配合 MVCC |
| `SERIALIZABLE` | 脏读、不可重复读、幻读 | 最严格，并发成本最高 |
| `DEFAULT` | 使用数据库默认级别 | 推荐先理解数据库默认行为 |

回滚规则也要注意：默认对 `RuntimeException` 和 `Error` 回滚，对受检异常不回滚。需要时显式配置：

```java
@Transactional(rollbackFor = Exception.class)
public void importOrders(List<OrderRow> rows) throws Exception {
    // parse, validate, save
}
```

## 声明式事务失效场景

事务失效通常不是 Spring “没生效”，而是调用没有进入代理或事务属性不符合预期。

常见场景：

- **同类自调用**：`this.pay()` 调用不到代理上的 `@Transactional`。
- **方法不是 public**：基于代理的事务通常应放在 public 方法上。
- **final 类或 final 方法**：CGLIB 无法覆盖 final 方法。
- **异常被吞掉**：方法内部 catch 后不抛出，事务拦截器不知道失败。
- **抛出受检异常但未配置 rollbackFor**：默认不会回滚。
- **数据库引擎不支持事务**：例如 MySQL MyISAM。
- **没有被 Spring 管理**：自己 `new` 出来的对象不在容器中。
- **事务边界放错层**：Controller 里开大事务，或 DAO 粒度过细导致业务不一致。
- **多线程异步执行**：事务上下文通常绑定当前线程，新线程不会自动继承。

推荐做法：事务放在 service 层的业务用例入口；方法保持 public；异常语义清晰；跨方法需要事务增强时通过代理 Bean 调用，或重构到另一个 Bean。
