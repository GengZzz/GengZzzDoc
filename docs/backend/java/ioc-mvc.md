# 控制反转与 MVC

控制反转（IoC）和 MVC 模式是面向对象设计中降低耦合、提高可测试性的核心思想。它们关注对象之间如何建立依赖关系，以及如何将职责合理分层。

## 依赖注入

普通写法中，对象在内部创建自己需要的依赖：

```java
public class Game {
    private ConsoleView view = new ConsoleView();
    private DatabaseService db = new DatabaseService("jdbc:mysql://localhost/game");

    public void start() {
        view.show("游戏开始");
        db.loadData();
    }
}
```

这种方式的问题：`Game` 被硬编码绑定到了 `ConsoleView` 和 `DatabaseService` 上，无法替换为其他实现，也无法在测试中使用 mock 对象。

依赖注入的核心思想：**不在类内部创建依赖，而从外部传入**。

```java
public class Game {
    private final View view;
    private final DataService db;

    // 通过构造器注入依赖
    public Game(View view, DataService db) {
        this.view = view;
        this.db = db;
    }

    public void start() {
        view.show("游戏开始");
        db.loadData();
    }
}
```

`Game` 现在只依赖 `View` 和 `DataService` 接口，不关心具体实现。组装工作交给外部：

```java
public class Main {
    public static void main(String[] args) {
        // 生产环境
        View view = new ConsoleView();
        DataService db = new DatabaseService("jdbc:mysql://localhost/game");

        // 测试环境可以替换
        // View view = new MockView();
        // DataService db = new InMemoryDataService();

        Game game = new Game(view, db);
        game.start();
    }
}
```

::: tip 依赖注入的好处
1. **可测试**：测试时可以注入 mock 对象，无需真实的数据库或 UI。
2. **可替换**：切换实现只需换一个类，不修改 `Game` 的代码。
3. **职责清晰**：`Game` 只负责游戏逻辑，创建哪些具体实现由组装层决定。
:::

## 控制反转

依赖注入是控制反转的一种实现方式。"反转"指的是控制权的反转：

- **传统方式**：应用代码主动创建和管理依赖（应用代码控制框架）。
- **IoC 方式**：框架负责创建对象、注入依赖（框架控制应用代码）。

```
传统方式:  应用代码  ──调用──>  框架/库
IoC 方式:  框架      ──调用──>  应用代码（通过接口/回调）
```

Spring 框架是最典型的 IoC 容器：

```java
// Spring 中的依赖注入 - 框架自动完成
@Service
public class OrderService {
    private final PaymentGateway paymentGateway;
    private final InventoryService inventoryService;

    // Spring 自动注入这两个依赖
    @Autowired
    public OrderService(PaymentGateway paymentGateway, InventoryService inventoryService) {
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
    }

    public void placeOrder(Order order) {
        inventoryService.reserve(order.getItems());
        paymentGateway.charge(order.getTotal());
    }
}
```

开发者编写 `OrderService`，但创建和组装的工作交给 Spring 容器——这就是控制反转。

## MVC 模式

MVC（Model-View-Controller）将程序按职责分成三部分：

| 层 | 职责 | 不应做 |
|---|---|---|
| **Model** | 数据和业务规则 | 不涉及如何展示 |
| **View** | 展示界面、渲染数据 | 不包含业务逻辑 |
| **Controller** | 接收用户输入，协调 Model 和 View | 不直接操作数据库，不直接绘制 UI |

三者的关系：

```
用户 ──输入──> Controller ──操作──> Model
                    │                 │
                    │ 更新             │ 数据
                    ▼                 ▼
                  View <─────────────┘
                    │
                  显示
                    │
                  用户
```

## 为什么分层

分层不是为了让代码变复杂，而是为了让变化局部化：

- **改显示方式**（从控制台换到 GUI）：只改 View 层，Model 和 Controller 不动。
- **改业务规则**（调整计价逻辑）：只改 Model 层，View 和 Controller 不动。
- **改输入方式**（从键盘换到网络请求）：只改 Controller 层，Model 和 View 不动。

没有分层时，一个改动可能波及所有代码。分层后，变化被限制在各自层内。

## 计数器的 MVC 实现

下面用一个完整的计数器示例展示 MVC 的协作方式。

### Model

Model 保存数据和业务规则，不依赖任何 UI 类：

```java
public class CounterModel {
    private int value;
    private final int step;

    public CounterModel(int initialValue, int step) {
        this.value = initialValue;
        this.step = step;
    }

    public CounterModel() {
        this(0, 1);
    }

    public void increment() {
        value += step;
    }

    public void decrement() {
        value -= step;
    }

    public void reset() {
        value = 0;
    }

    public int getValue() {
        return value;
    }
}
```

### View

View 负责展示数据。抽成接口以便替换不同实现：

```java
public interface CounterView {
    void display(int value);
    void displayError(String message);
}

// 控制台实现
public class ConsoleCounterView implements CounterView {
    @Override
    public void display(int value) {
        System.out.println("============");
        System.out.println("  计数: " + value);
        System.out.println("============");
    }

    @Override
    public void displayError(String message) {
        System.err.println("错误: " + message);
    }
}

// GUI 实现（示意）
public class GuiCounterView implements CounterView {
    private final JLabel label;

    public GuiCounterView(JLabel label) {
        this.label = label;
    }

    @Override
    public void display(int value) {
        label.setText("计数: " + value);
    }

    @Override
    public void displayError(String message) {
        JOptionPane.showMessageDialog(null, message);
    }
}
```

### Controller

Controller 接收用户操作，协调 Model 和 View：

```java
public class CounterController {
    private final CounterModel model;
    private final CounterView view;

    public CounterController(CounterModel model, CounterView view) {
        this.model = model;
        this.view = view;
    }

    public void onIncrement() {
        model.increment();
        view.display(model.getValue());
    }

    public void onDecrement() {
        model.decrement();
        view.display(model.getValue());
    }

    public void onReset() {
        model.reset();
        view.display(model.getValue());
    }

    public void onStart() {
        view.display(model.getValue());
    }
}
```

### 组装与运行

```java
public class CounterApp {
    public static void main(String[] args) {
        // 组装 MVC
        CounterModel model = new CounterModel(0, 1);
        CounterView view = new ConsoleCounterView();
        CounterController controller = new CounterController(model, view);

        // 启动
        controller.onStart();

        // 模拟用户操作
        Scanner scanner = new Scanner(System.in);
        while (true) {
            System.out.print("命令 (+/-/r/q): ");
            String cmd = scanner.nextLine().trim();
            switch (cmd) {
                case "+" -> controller.onIncrement();
                case "-" -> controller.onDecrement();
                case "r" -> controller.onReset();
                case "q" -> { return; }
                default -> view.displayError("未知命令: " + cmd);
            }
        }
    }
}
```

如果要换成 GUI 界面，只需换一个 View 实现和事件绑定方式，`CounterModel` 和 `CounterController` 完全不需要修改。这就是 MVC 分层的核心价值。

::: tip 依赖注入让 MVC 真正有效
MVC 的关键是 Model 和 Controller 都不直接创建 View，而是通过构造器注入。这样每个部分都可以独立测试、独立替换。如果 Controller 中写了 `new ConsoleView()`，分层就失去了意义。
:::
