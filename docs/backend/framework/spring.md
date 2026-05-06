<script setup>
import SpringIocLifecycleDemo from '../../.vitepress/theme/components/SpringIocLifecycleDemo.vue'
import SpringAopTransactionDemo from '../../.vitepress/theme/components/SpringAopTransactionDemo.vue'
</script>

# Spring Framework

Spring 是 Java 后端开发中最常用的基础框架之一。它不是只解决某一个功能点，而是提供一套应用组织方式：用 IoC 容器管理对象，用 AOP 扩展横切逻辑，用事务抽象屏蔽底层资源差异，再向上支撑 Web MVC、WebFlux、数据访问、测试等模块。Spring Framework 6.0+ 要求 Java 17+，Spring Framework 7.0.x 是当前稳定主线之一；日常开发更应掌握这些通用机制，而不是只记版本新闻。

## Spring 的定位

在没有 Spring 的普通 Java 程序里，对象通常由业务代码自己 `new` 出来，依赖关系也由调用方手动拼接。系统变大后，构造顺序、配置读取、事务边界、日志审计、缓存、资源释放都会分散在各处。

Spring 的核心价值是把这些公共问题集中到框架层：

- **IoC Container**：统一创建、配置、装配和销毁对象。
- **DI**：把对象需要的依赖从外部注入，而不是对象内部自己查找或创建。
- **AOP**：在不修改业务类的前提下，为方法调用附加事务、权限、日志、监控等横切逻辑。
- **事务抽象**：用一致的声明式模型管理 JDBC、JPA、消息等资源的事务边界。
- **环境与资源抽象**：统一处理配置、Profile、资源加载、事件发布和测试上下文。

日常写一个 `UserService`，你关注的是业务规则；Spring 负责在启动时发现它、创建它、注入 `UserRepository`、应用事务代理，并在运行期把请求调用导向正确的 Bean。

## IoC 与 DI

IoC（Inversion of Control，控制反转）指对象的创建与依赖装配控制权从业务代码转移给容器。DI（Dependency Injection，依赖注入）是实现 IoC 最常见的方式。

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentClient paymentClient;

    public OrderService(OrderRepository orderRepository, PaymentClient paymentClient) {
        this.orderRepository = orderRepository;
        this.paymentClient = paymentClient;
    }
}
```

这里 `OrderService` 不负责创建 `OrderRepository` 和 `PaymentClient`。Spring 在启动时解析这些 Bean 的定义，按构造方法参数找到候选 Bean，然后创建完整对象图。

常见注入方式：

| 方式 | 适用场景 | 开发建议 |
| --- | --- | --- |
| 构造器注入 | 必需依赖、不可变依赖 | 首选。便于测试，能尽早暴露循环依赖 |
| Setter 注入 | 可选依赖、运行期可变配置 | 适合有默认值或后置配置的场景 |
| 字段注入 | 快速示例、遗留代码 | 不推荐。隐藏依赖，不利于单元测试和不可变设计 |
| 方法参数注入 | `@Bean` 方法、事件监听、测试方法 | 适合局部依赖，不扩散到字段 |

依赖候选不唯一时，可以用 `@Primary`、`@Qualifier`、Bean 名称、泛型类型等方式消除歧义。集合注入如 `List<Handler>`、`Map<String, Handler>` 很适合策略链、插件点和批处理管道。

## BeanDefinition

BeanDefinition 是 Spring 容器中 Bean 的元数据，不是 Bean 实例本身。它描述了“将来如何创建一个 Bean”：

- Bean 的 class 或工厂方法。
- scope，如 `singleton`、`prototype`、`request`。
- 构造参数、属性值、自动装配模式。
- 初始化方法、销毁方法。
- 是否懒加载、是否 primary、是否 autowire candidate。
- 角色信息和来源资源。

以注解配置为例，`@ComponentScan` 找到 `@Service`、`@Repository`、`@Controller`、`@Component` 后，会把这些类解析成 BeanDefinition 并注册到 `BeanDefinitionRegistry`。真正的 Bean 实例通常要等到 `ApplicationContext` 刷新后期才创建。

BeanDefinition 的好处是把“扫描配置”和“创建对象”拆开。`BeanFactoryPostProcessor` 可以在实例化之前修改 BeanDefinition，例如占位符解析、配置类增强、Mapper 扫描注册等都依赖这个阶段。

## ApplicationContext 刷新流程

`ApplicationContext` 是日常最常用的 Spring 容器接口。它继承 BeanFactory 能力，并额外提供国际化、事件、资源加载、环境抽象等功能。启动核心动作是 `refresh()`。

简化后的刷新流程如下：

1. **准备环境**：初始化 `Environment`、校验必要属性、准备事件集合。
2. **获取 BeanFactory**：创建或刷新底层 `DefaultListableBeanFactory`。
3. **准备 BeanFactory**：设置 ClassLoader、类型转换器、表达式解析器、内置后处理器。
4. **执行 BeanFactoryPostProcessor**：修改 BeanDefinition，例如解析 `@Configuration`、`@Bean`、占位符。
5. **注册 BeanPostProcessor**：准备实例化前后、初始化前后的扩展点。
6. **初始化消息源和事件广播器**：支持 i18n 与事件发布。
7. **注册监听器**：收集 `ApplicationListener`。
8. **实例化非懒加载单例 Bean**：触发生命周期、依赖注入、AOP 代理创建。
9. **发布 ContextRefreshedEvent**：容器刷新完成，可以对外提供服务。

这条流程解释了很多开发现象：为什么 `BeanFactoryPostProcessor` 能改定义但通常拿不到完整业务 Bean，为什么 `BeanPostProcessor` 能包装 Bean，为什么大多数启动报错出现在预实例化单例阶段。

## Bean 生命周期

Spring Bean 的生命周期可以理解为“从定义到可用对象”的流水线：

<SpringIocLifecycleDemo />

关键阶段：

1. **注册 BeanDefinition**：来自注解扫描、XML、Java Config、Import、手动注册等。
2. **实例化**：通过构造方法或工厂方法创建原始对象。
3. **属性填充**：注入依赖 Bean、普通属性、配置值。
4. **Aware 回调**：如 `BeanNameAware`、`BeanFactoryAware`、`ApplicationContextAware`。
5. **初始化前 BeanPostProcessor**：处理 `@PostConstruct` 等扩展。
6. **初始化**：执行 `InitializingBean.afterPropertiesSet()` 或自定义 init 方法。
7. **初始化后 BeanPostProcessor**：AOP 代理通常在这里返回代理对象。
8. **放入单例池**：后续 `getBean()` 直接返回缓存中的最终对象。
9. **销毁**：容器关闭时执行 `@PreDestroy`、`DisposableBean`、destroy 方法。

注意“原始对象”和“最终暴露对象”可能不同。开启 AOP 后，业务 Bean 常常被代理对象替代，其他 Bean 注入到的也应该是这个代理对象。

## 循环依赖与三级缓存

Spring 默认能解决一部分单例 Bean 的循环依赖，典型是 setter 或字段注入形成的 `A -> B -> A`。它依赖三级缓存：

| 缓存 | 含义 |
| --- | --- |
| `singletonObjects` | 一级缓存，完整初始化好的单例 Bean |
| `earlySingletonObjects` | 二级缓存，提前暴露的早期 Bean 引用 |
| `singletonFactories` | 三级缓存，能创建早期引用的 ObjectFactory |

以 `A` 和 `B` 互相依赖为例：

1. 创建 `A` 的原始对象后，还没注入属性，Spring 把能暴露 `A` 早期引用的工厂放入三级缓存。
2. 给 `A` 注入 `B`，发现 `B` 还不存在，于是创建 `B`。
3. 给 `B` 注入 `A`，此时从三级缓存拿到 `A` 的早期引用，并放入二级缓存。
4. `B` 初始化完成进入一级缓存。
5. `A` 继续完成属性注入和初始化，最终进入一级缓存。

三级缓存不是为了“多缓存一层”这么简单，而是为了让 AOP 有机会提前暴露代理引用。如果 `A` 需要被代理，注入给 `B` 的不能是裸对象，否则后续事务、权限等增强可能绕过代理。

不能解决或不建议依赖的情况：

- **构造器循环依赖**：对象还没构造出来，无法提前暴露引用。
- **prototype 循环依赖**：prototype 不进单例缓存，无法用同样机制打断循环。
- **复杂 AOP 循环依赖**：可能出现早期代理和最终代理不一致的问题。

工程上应优先消除循环依赖：抽出第三个协作对象、拆分职责、改用事件、延迟查找 `ObjectProvider<T>`，而不是把三级缓存当常规设计工具。

## AOP 代理

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

## 事件机制

Spring 事件适合做应用内解耦，不适合替代可靠消息队列。

```java
public record OrderPaidEvent(Long orderId) {}

@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void pay(Long orderId) {
        // update order status
        publisher.publishEvent(new OrderPaidEvent(orderId));
    }
}

@Component
public class CouponListener {
    @EventListener
    public void onOrderPaid(OrderPaidEvent event) {
        // grant coupon
    }
}
```

事务相关事件可以使用 `@TransactionalEventListener`，例如在事务提交后再发通知：

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void afterCommit(OrderPaidEvent event) {
    // send notification after data commit
}
```

默认事件发布可以是同步的，监听器异常会影响发布线程。需要异步时可以结合 `@Async` 和线程池，但要明确失败重试、上下文传递和可观测性。

## 资源加载

Spring 的 `Resource` 抽象统一了 classpath、文件系统、URL、ServletContext 等资源访问方式：

```java
@Component
public class TemplateLoader {
    private final ResourceLoader resourceLoader;

    public TemplateLoader(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public String load() throws IOException {
        Resource resource = resourceLoader.getResource("classpath:/templates/mail.html");
        return resource.getContentAsString(StandardCharsets.UTF_8);
    }
}
```

常见前缀：

- `classpath:`：从类路径加载。
- `file:`：从文件系统加载。
- `http:` / `https:`：从 URL 加载。
- 无前缀：由具体 ApplicationContext 决定默认策略。

配置文件、SQL 初始化脚本、邮件模板、证书、静态资源都可以通过这一套模型处理。

## Profile 与环境配置

Profile 用来按环境启用不同 Bean 或配置。它适合表达“这个 Bean 是否参与当前环境”，不适合承载所有业务开关。

```java
@Configuration
@Profile("dev")
public class DevToolConfig {
    @Bean
    DemoDataInitializer demoDataInitializer() {
        return new DemoDataInitializer();
    }
}
```

也可以在方法上标注：

```java
@Bean
@Profile("prod")
SmsClient aliyunSmsClient() {
    return new AliyunSmsClient();
}
```

实践建议：

- 环境维度用 `dev`、`test`、`staging`、`prod` 等 Profile。
- 业务开关优先使用配置属性，如 `feature.xxx.enabled`。
- 用 `Environment` 或 `@Value` 读取简单值，用 `@ConfigurationProperties` 绑定结构化配置。
- 默认配置要能本地启动，敏感信息通过环境变量或密钥系统注入。

## 测试

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
