# 常见设计模式

设计模式是经过验证的、解决特定设计问题的方案。它们不是银弹，但在合适的场景下能让代码更灵活、更可维护。本节介绍五种 Java 开发中最常用的设计模式。

## Singleton（单例模式）

**意图**：确保一个类只有一个实例，并提供全局访问点。

### 枚举实现（推荐）

```java
public enum DatabaseConnection {
    INSTANCE;

    private final String url = "jdbc:mysql://localhost:3306/mydb";

    public void query(String sql) {
        System.out.println("执行查询: " + sql);
    }

    public String getUrl() {
        return url;
    }
}

// 使用
public class SingletonEnumDemo {
    public static void main(String[] args) {
        DatabaseConnection.INSTANCE.query("SELECT 1");
    }
}
```

枚举实现天然防止反射攻击和序列化破坏，由 JVM 保证单例，是最安全的实现方式。

### 双重检查锁

```java
public class ConfigManager {
    // volatile 防止指令重排序
    private static volatile ConfigManager instance;
    private final Properties config;

    private ConfigManager() {
        config = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/app.properties")) {
            config.load(in);
        } catch (IOException e) {
            throw new RuntimeException("加载配置失败", e);
        }
    }

    public static ConfigManager getInstance() {
        if (instance == null) {                    // 第一次检查（无锁）
            synchronized (ConfigManager.class) {
                if (instance == null) {            // 第二次检查（有锁）
                    instance = new ConfigManager();
                }
            }
        }
        return instance;
    }

    public String get(String key) {
        return config.getProperty(key);
    }
}
```

### 饿汉式

```java
public class Logger {
    // 类加载时即创建实例，线程安全
    private static final Logger INSTANCE = new Logger();

    private Logger() {}

    public static Logger getInstance() {
        return INSTANCE;
    }

    public void log(String message) {
        System.out.println("[LOG] " + message);
    }
}
```

**适用场景**：需要全局唯一实例的场景，如配置管理器、日志器、连接池。如果实例创建代价大且可能用不到，用懒汉式；否则用枚举或饿汉式更简单。

## Factory（工厂模式）

**意图**：将对象的创建逻辑封装起来，调用者不需要知道具体创建哪个类。

```java
public interface Notification {
    void send(String message);
}

public class EmailNotification implements Notification {
    @Override
    public void send(String message) {
        System.out.println("发送邮件: " + message);
    }
}

public class SmsNotification implements Notification {
    @Override
    public void send(String message) {
        System.out.println("发送短信: " + message);
    }
}

public class PushNotification implements Notification {
    @Override
    public void send(String message) {
        System.out.println("发送推送: " + message);
    }
}

// 简单工厂
public class NotificationFactory {

    public static Notification create(String type) {
        return switch (type.toLowerCase()) {
            case "email" -> new EmailNotification();
            case "sms"   -> new SmsNotification();
            case "push"  -> new PushNotification();
            default -> throw new IllegalArgumentException("未知的通知类型: " + type);
        };
    }
}

// 使用
public class FactoryDemo {
    public static void main(String[] args) {
        Notification notification = NotificationFactory.create("email");
        notification.send("系统维护通知");
    }
}
```

**适用场景**：对象的创建逻辑复杂，或调用者不应该关心具体实现类时。新增通知类型只需添加实现类和修改工厂，调用方代码不变。

## Observer（观察者模式）

**意图**：定义一对多的依赖关系，当一个对象状态改变时，所有依赖它的对象都会收到通知。

```java
// 观察者接口
public interface EventListener {
    void onEvent(String eventType, Object data);
}

// 被观察者（事件管理器）
public class EventManager {
    private final Map<String, List<EventListener>> listeners = new HashMap<>();

    public void subscribe(String eventType, EventListener listener) {
        listeners.computeIfAbsent(eventType, k -> new ArrayList<>()).add(listener);
    }

    public void unsubscribe(String eventType, EventListener listener) {
        List<EventListener> list = listeners.get(eventType);
        if (list != null) {
            list.remove(listener);
        }
    }

    public void notify(String eventType, Object data) {
        List<EventListener> list = listeners.get(eventType);
        if (list != null) {
            for (EventListener listener : list) {
                listener.onEvent(eventType, data);
            }
        }
    }
}
```

使用示例：

```java
// 业务类
public class OrderService {
    private final EventManager events = new EventManager();

    public EventManager getEvents() {
        return events;
    }

    public void placeOrder(String orderId) {
        System.out.println("下单: " + orderId);
        events.notify("order_placed", orderId);
    }

    public void cancelOrder(String orderId) {
        System.out.println("取消订单: " + orderId);
        events.notify("order_cancelled", orderId);
    }
}

// 使用
public class ObserverDemo {
    public static void main(String[] args) {
        OrderService orderService = new OrderService();

        // 邮件服务监听下单事件
        orderService.getEvents().subscribe("order_placed", (type, data) -> {
            System.out.println("  -> 发送下单确认邮件: " + data);
        });

        // 库存服务监听下单和取消事件
        orderService.getEvents().subscribe("order_placed", (type, data) -> {
            System.out.println("  -> 扣减库存: " + data);
        });
        orderService.getEvents().subscribe("order_cancelled", (type, data) -> {
            System.out.println("  -> 恢复库存: " + data);
        });

        orderService.placeOrder("ORD-001");
        orderService.cancelOrder("ORD-001");
    }
}
```

输出：
```
下单: ORD-001
  -> 发送下单确认邮件: ORD-001
  -> 扣减库存: ORD-001
取消订单: ORD-001
  -> 恢复库存: ORD-001
```

**适用场景**：事件驱动的系统，如 GUI 事件监听、消息队列消费者、日志框架的多 appender。当一个对象的变化需要通知多个其他对象，且不想硬编码它们的关系时使用。

## Strategy（策略模式）

**意图**：将算法族封装为独立的对象，使它们可以互相替换。

```java
// 策略接口
public interface DiscountStrategy {
    BigDecimal calculate(BigDecimal price);
    String getDescription();
}

// 具体策略
public class NoDiscount implements DiscountStrategy {
    @Override
    public BigDecimal calculate(BigDecimal price) {
        return price;
    }

    @Override
    public String getDescription() {
        return "无折扣";
    }
}

public class PercentageDiscount implements DiscountStrategy {
    private final double rate;

    public PercentageDiscount(double rate) {
        this.rate = rate;
    }

    @Override
    public BigDecimal calculate(BigDecimal price) {
        return price.multiply(BigDecimal.valueOf(1 - rate));
    }

    @Override
    public String getDescription() {
        return String.format("%.0f%% 折扣", rate * 100);
    }
}

public class FixedAmountDiscount implements DiscountStrategy {
    private final BigDecimal amount;

    public FixedAmountDiscount(BigDecimal amount) {
        this.amount = amount;
    }

    @Override
    public BigDecimal calculate(BigDecimal price) {
        return price.subtract(amount).max(BigDecimal.ZERO);
    }

    @Override
    public String getDescription() {
        return "减 " + amount + " 元";
    }
}

// 上下文
public class PriceCalculator {
    private DiscountStrategy strategy;

    public PriceCalculator(DiscountStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(DiscountStrategy strategy) {
        this.strategy = strategy;
    }

    public BigDecimal calculate(BigDecimal price) {
        BigDecimal result = strategy.calculate(price);
        System.out.println("原价: " + price + ", " + strategy.getDescription() + " -> " + result);
        return result;
    }
}

// 使用
public class StrategyDemo {
    public static void main(String[] args) {
        BigDecimal price = new BigDecimal("100.00");
        PriceCalculator calc = new PriceCalculator(new NoDiscount());

        calc.calculate(price);                             // 无折扣: 100.00
        calc.setStrategy(new PercentageDiscount(0.15));
        calc.calculate(price);                             // 85%: 85.00
        calc.setStrategy(new FixedAmountDiscount(new BigDecimal("20")));
        calc.calculate(price);                             // 减20: 80.00
    }
}
```

**适用场景**：同一问题有多种算法或行为可选时，如排序策略、支付方式、折扣计算。消除条件分支，新增策略只需添加类，不修改使用策略的代码。

## Builder（构建者模式）

**意图**：分步构建复杂对象，让构造过程更清晰、更灵活。

```java
public class HttpClient {
    private final String baseUrl;
    private final int connectTimeout;
    private final int readTimeout;
    private final Map<String, String> defaultHeaders;
    private final boolean followRedirects;

    // 私有构造器，只能通过 Builder 创建
    private HttpClient(Builder builder) {
        this.baseUrl = builder.baseUrl;
        this.connectTimeout = builder.connectTimeout;
        this.readTimeout = builder.readTimeout;
        this.defaultHeaders = Map.copyOf(builder.defaultHeaders);
        this.followRedirects = builder.followRedirects;
    }

    @Override
    public String toString() {
        return String.format("HttpClient{baseUrl='%s', connect=%dms, read=%dms, headers=%s, followRedirects=%s}",
            baseUrl, connectTimeout, readTimeout, defaultHeaders, followRedirects);
    }

    // Builder 类
    public static class Builder {
        private final String baseUrl;          // 必填参数
        private int connectTimeout = 5000;     // 默认值
        private int readTimeout = 10000;       // 默认值
        private Map<String, String> defaultHeaders = new HashMap<>();
        private boolean followRedirects = true;

        public Builder(String baseUrl) {
            if (baseUrl == null || baseUrl.isBlank()) {
                throw new IllegalArgumentException("baseUrl 不能为空");
            }
            this.baseUrl = baseUrl;
        }

        public Builder connectTimeout(int millis) {
            this.connectTimeout = millis;
            return this;  // 返回 this 实现链式调用
        }

        public Builder readTimeout(int millis) {
            this.readTimeout = millis;
            return this;
        }

        public Builder addHeader(String key, String value) {
            this.defaultHeaders.put(key, value);
            return this;
        }

        public Builder followRedirects(boolean follow) {
            this.followRedirects = follow;
            return this;
        }

        public HttpClient build() {
            return new HttpClient(this);
        }
    }
}

// 使用 - 链式调用，清晰直观
public class BuilderDemo {
    public static void main(String[] args) {
        HttpClient client = new HttpClient.Builder("https://api.example.com")
            .connectTimeout(3000)
            .readTimeout(15000)
            .addHeader("Authorization", "Bearer token123")
            .addHeader("Accept", "application/json")
            .followRedirects(false)
            .build();

        System.out.println(client);
    }
}
```

输出：
```
HttpClient{baseUrl='https://api.example.com', connect=3000ms, read=15000ms, headers={Authorization=Bearer token123, Accept=application/json}, followRedirects=false}
```

Builder 模式对比构造器重载：

```java
// 构造器重载 - 参数多时难以维护
HttpClient c1 = new HttpClient("https://api.example.com", 3000, 15000);
HttpClient c2 = new HttpClient("https://api.example.com", 3000, 15000, headers, true);

// Builder - 每个参数都有名字，顺序随意
HttpClient c3 = new HttpClient.Builder("https://api.example.com")
    .connectTimeout(3000)
    .readTimeout(15000)
    .build();
```

**适用场景**：构造参数多且大部分有默认值的复杂对象，如 HTTP 客户端、配置对象、SQL 查询构建器。当构造器参数超过 3-4 个时，考虑使用 Builder。
