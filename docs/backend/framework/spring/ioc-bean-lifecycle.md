<script setup>
import SpringIocLifecycleDemo from '../../../.vitepress/theme/components/SpringIocLifecycleDemo.vue'
import SpringAopTransactionDemo from '../../../.vitepress/theme/components/SpringAopTransactionDemo.vue'
</script>

# BeanDefinition

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
