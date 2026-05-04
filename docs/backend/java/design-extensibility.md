# 设计原则：可扩展性

好的程序不是一次写完的，而是在不断添加新功能的过程中保持结构清晰。开闭原则（Open-Closed Principle）指导我们设计出对扩展开放、对修改关闭的代码。

## 开闭原则

开闭原则是面向对象设计中最核心的原则之一：

- **对扩展开放**：可以通过添加新代码来扩展系统行为。
- **对修改关闭**：扩展行为时，不需要修改已有的代码。

违反开闭原则的典型情况是在一个方法中堆砌大量 `if-else` 或 `switch`，每次新增功能都要修改这个方法：

```java
// 违反开闭原则
public class PaymentProcessor {
    public void process(String type, BigDecimal amount) {
        if ("ALIPAY".equals(type)) {
            System.out.println("支付宝支付: " + amount);
        } else if ("WECHAT".equals(type)) {
            System.out.println("微信支付: " + amount);
        } else if ("CREDIT_CARD".equals(type)) {
            System.out.println("信用卡支付: " + amount);
        }
        // 新增支付方式必须修改这里...
    }
}
```

## 用接口实现扩展

用接口定义行为契约，通过新增实现类来扩展功能，而非修改已有代码：

```java
// 接口定义行为
public interface PaymentMethod {
    void pay(BigDecimal amount);
    String getName();
}

// 具体实现
public class AlipayPayment implements PaymentMethod {
    @Override
    public void pay(BigDecimal amount) {
        System.out.println("支付宝支付: " + amount + " 元");
    }

    @Override
    public String getName() {
        return "支付宝";
    }
}

public class WechatPayment implements PaymentMethod {
    @Override
    public void pay(BigDecimal amount) {
        System.out.println("微信支付: " + amount + " 元");
    }

    @Override
    public String getName() {
        return "微信";
    }
}

public class CreditCardPayment implements PaymentMethod {
    private final String cardNumber;

    public CreditCardPayment(String cardNumber) {
        this.cardNumber = cardNumber;
    }

    @Override
    public void pay(BigDecimal amount) {
        System.out.println("信用卡支付: " + amount + " 元 (卡号: "
            + cardNumber.substring(cardNumber.length() - 4) + ")");
    }

    @Override
    public String getName() {
        return "信用卡";
    }
}
```

支付处理器不再需要 if-else：

```java
public class PaymentProcessor {
    // 接收接口类型，而非具体类型
    public void process(PaymentMethod method, BigDecimal amount) {
        System.out.println("使用 " + method.getName() + " 进行支付");
        method.pay(amount);
    }
}
```

新增支付方式时，只需添加新的实现类，`PaymentProcessor` 完全不需要改动：

```java
// 新增支付方式 - 不修改任何已有代码
public class CryptoPayment implements PaymentMethod {
    private final String walletAddress;

    public CryptoPayment(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    @Override
    public void pay(BigDecimal amount) {
        System.out.println("加密货币支付: " + amount + " 到 " + walletAddress);
    }

    @Override
    public String getName() {
        return "加密货币";
    }
}
```

::: tip 识别违反开闭原则的信号
当你需要新增一个功能，却发现必须修改一个已经正常工作的方法时，就说明代码违反了开闭原则。此时应该考虑用接口抽象出变化的部分。
:::

## 策略模式预览

策略模式（Strategy Pattern）将算法封装为独立的对象，使得算法可以独立于使用它的客户端变化。

```java
// 策略接口
public interface SortStrategy {
    <T extends Comparable<T>> void sort(T[] array);
    String getName();
}

// 具体策略
public class BubbleSort implements SortStrategy {
    @Override
    public <T extends Comparable<T>> void sort(T[] array) {
        for (int i = 0; i < array.length - 1; i++) {
            for (int j = 0; j < array.length - 1 - i; j++) {
                if (array[j].compareTo(array[j + 1]) > 0) {
                    T temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;
                }
            }
        }
    }

    @Override
    public String getName() { return "冒泡排序"; }
}

public class QuickSort implements SortStrategy {
    @Override
    public <T extends Comparable<T>> void sort(T[] array) {
        Arrays.sort(array); // 委托给 JDK 实现
    }

    @Override
    public String getName() { return "快速排序"; }
}

// 上下文 - 使用策略
public class Sorter {
    private SortStrategy strategy;

    public Sorter(SortStrategy strategy) {
        this.strategy = strategy;
    }

    public void setStrategy(SortStrategy strategy) {
        this.strategy = strategy;
    }

    public <T extends Comparable<T>> void sort(T[] array) {
        System.out.println("使用 " + strategy.getName() + " 进行排序");
        strategy.sort(array);
    }
}

// 使用
public class StrategyDemo {
    public static void main(String[] args) {
        Integer[] data = {5, 3, 8, 1, 9, 2};

        Sorter sorter = new Sorter(new BubbleSort());
        sorter.sort(data.clone()); // 使用冒泡排序

        sorter.setStrategy(new QuickSort());
        sorter.sort(data.clone()); // 切换为快速排序
    }
}
```

策略模式的关键在于：`Sorter` 不知道具体的排序算法，它只依赖 `SortStrategy` 接口。新增排序算法只需实现接口，无需修改 `Sorter`。

## 框架 + 数据

"框架 + 数据"是一种让程序结构稳定、把变化放到数据里的设计思想。框架处理流程，数据决定具体行为。

以城堡游戏的命令系统为例：

```java
// 命令接口
public interface Command {
    void execute(GameContext context);
}

// 具体命令
public class GoCommand implements Command {
    @Override
    public void execute(GameContext context) {
        String direction = context.getArgument();
        Room exit = context.getCurrentRoom().getExit(direction);
        if (exit != null) {
            context.setCurrentRoom(exit);
            System.out.println("你来到了: " + exit.getDescription());
        } else {
            System.out.println("那个方向没有出路");
        }
    }
}

public class LookCommand implements Command {
    @Override
    public void execute(GameContext context) {
        Room room = context.getCurrentRoom();
        System.out.println(room.getDescription());
        System.out.println("出口: " + String.join(", ", room.getExits()));
    }
}

public class HelpCommand implements Command {
    private final Map<String, String> helpText;

    public HelpCommand(Map<String, String> helpText) {
        this.helpText = helpText;
    }

    @Override
    public void execute(GameContext context) {
        helpText.forEach((cmd, desc) -> System.out.println(cmd + " - " + desc));
    }
}
```

游戏引擎只处理流程，不关心具体命令：

```java
public class GameEngine {
    // 框架：命令注册表
    private final Map<String, Command> commands = new HashMap<>();
    private final GameContext context;

    public GameEngine(GameContext context) {
        this.context = context;
    }

    // 注册命令 - 扩展点
    public void registerCommand(String name, Command command) {
        commands.put(name.toLowerCase(), command);
    }

    // 框架主循环 - 不需要修改
    public void run() {
        Scanner scanner = new Scanner(System.in);
        while (context.isRunning()) {
            System.out.print("> ");
            String input = scanner.nextLine().trim();
            if (input.isEmpty()) continue;

            String[] parts = input.split("\\s+", 2);
            String commandName = parts[0].toLowerCase();
            context.setArgument(parts.length > 1 ? parts[1] : "");

            Command command = commands.get(commandName);
            if (command != null) {
                command.execute(context);
            } else {
                System.out.println("未知命令，输入 help 查看帮助");
            }
        }
    }
}
```

组装阶段用数据驱动框架：

```java
public class GameSetup {
    public static void main(String[] args) {
        // 构建地图数据
        Room lobby = new Room("大厅");
        Room lab = new Room("实验室");
        Room library = new Room("图书馆");
        lobby.setExit("north", lab);
        lobby.setExit("east", library);
        lab.setExit("south", lobby);
        library.setExit("west", lobby);

        // 初始化游戏
        GameContext context = new GameContext(lobby);
        GameEngine engine = new GameEngine(context);

        // 注册命令 - 这就是"数据"
        engine.registerCommand("go", new GoCommand());
        engine.registerCommand("look", new LookCommand());

        Map<String, String> helpText = Map.of(
            "go <方向>", "向指定方向移动",
            "look", "查看当前房间"
        );
        engine.registerCommand("help", new HelpCommand(helpText));

        // 新增命令：不修改引擎，只添加新的 Command 实现 + 注册
        engine.registerCommand("quit", ctx -> {
            System.out.println("再见！");
            ctx.setRunning(false);
        });

        engine.run();
    }
}
```

::: tip "框架 + 数据"的好处
游戏引擎的 `run()` 方法是稳定的框架，命令的注册和地图的构建是可变的数据。新增命令类型、修改地图结构、调整游戏规则，都不需要修改引擎代码。这就是"对扩展开放，对修改关闭"在架构层面的体现。
:::
