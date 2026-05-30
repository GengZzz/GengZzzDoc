---
title: "IoC 与 DI"
description: "IoC（Inversion of Control，控制反转）指对象的创建与依赖装配控制权从业务代码转移给容器。DI（Dependency Injection，依赖注入）是实现 IoC 最常见的方式。"
---

# IoC 与 DI

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
