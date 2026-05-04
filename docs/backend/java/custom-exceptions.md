# 自定义异常

当 Java 内置的异常类型无法准确表达业务含义时，可以定义自己的异常类。自定义异常让错误信息更清晰，也让调用者可以根据异常类型做出不同的处理。

## 自定义 checked 异常

继承 `Exception` 类即可创建受检异常。编译器会强制调用者处理或声明抛出。

```java
/**
 * 用户未找到异常 - 受检异常
 */
public class UserNotFoundException extends Exception {

    private final String username;

    public UserNotFoundException(String username) {
        super("用户不存在: " + username);
        this.username = username;
    }

    public UserNotFoundException(String username, Throwable cause) {
        super("用户不存在: " + username, cause);
        this.username = username;
    }

    public String getUsername() {
        return username;
    }
}
```

使用方式：

```java
public class UserService {

    private final Map<String, String> users = new HashMap<>();

    public UserService() {
        users.put("alice", "Alice Wang");
        users.put("bob", "Bob Li");
    }

    public String findUser(String username) throws UserNotFoundException {
        String name = users.get(username);
        if (name == null) {
            throw new UserNotFoundException(username);
        }
        return name;
    }
}

// 调用方必须处理
public class Demo {
    public static void main(String[] args) {
        UserService service = new UserService();
        try {
            String name = service.findUser("charlie");
            System.out.println(name);
        } catch (UserNotFoundException e) {
            System.out.println(e.getMessage());
            System.out.println("不存在的用户名: " + e.getUsername());
        }
    }
}
```

## 自定义 unchecked 异常

继承 `RuntimeException` 类即可创建非受检异常。编译器不强制处理，通常表示编程错误或不可恢复的业务状态。

```java
/**
 * 余额不足异常 - 非受检异常
 */
public class InsufficientBalanceException extends RuntimeException {

    private final BigDecimal balance;
    private final BigDecimal amount;

    public InsufficientBalanceException(BigDecimal balance, BigDecimal amount) {
        super(String.format("余额不足: 余额 %.2f, 需要 %.2f", balance, amount));
        this.balance = balance;
        this.amount = amount;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public BigDecimal getAmount() {
        return amount;
    }
}
```

使用方式：

```java
public class BankAccount {
    private BigDecimal balance;

    public BankAccount(BigDecimal initialBalance) {
        this.balance = initialBalance;
    }

    public void withdraw(BigDecimal amount) {
        if (amount.compareTo(balance) > 0) {
            throw new InsufficientBalanceException(balance, amount);
        }
        balance = balance.subtract(amount);
    }
}

public class Demo {
    public static void main(String[] args) {
        BankAccount account = new BankAccount(new BigDecimal("100.00"));
        account.withdraw(new BigDecimal("200.00")); // 抛出 InsufficientBalanceException
    }
}
```

::: tip 选择 checked 还是 unchecked
- **checked**：调用者有可能并且应该处理的情况。例如 `UserNotFoundException`，调用者可以显示"用户不存在"的提示。
- **unchecked**：不应该发生的情况，或者调用者无法合理处理的情况。例如 `InsufficientBalanceException`，可能意味着前置校验逻辑有漏洞。
:::

## 异常链

异常链保留了原始异常信息，避免丢失底层原因。这是调试多层调用时的关键能力。

```java
public class DataAccessException extends RuntimeException {

    public DataAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class UserRepository {

    public User findById(int id) {
        try {
            // 模拟数据库操作
            return queryDatabase(id);
        } catch (SQLException e) {
            // 包装原始异常，保留异常链
            throw new DataAccessException("查询用户失败, id=" + id, e);
        }
    }

    private User queryDatabase(int id) throws SQLException {
        throw new SQLException("Connection refused");
    }
}
```

调用 `e.printStackTrace()` 时会看到完整的异常链：

```
DataAccessException: 查询用户失败, id=42
    at UserRepository.findById(UserRepository.java:8)
    ...
Caused by: java.sql.SQLException: Connection refused
    at UserRepository.queryDatabase(UserRepository.java:13)
    ...
```

获取原始异常：

```java
try {
    repo.findById(42);
} catch (DataAccessException e) {
    System.out.println(e.getMessage());           // 查询用户失败, id=42
    System.out.println(e.getCause().getMessage()); // Connection refused
}
```

::: warning 始终传递 cause
在捕获异常后重新抛出自定义异常时，务必通过构造器传递原始异常作为 `cause`。丢弃原始异常会让调试变得极其困难。
:::

## 设计原则

### 见名知意

异常类的名称应该清楚地表达"出了什么问题"：

```java
// 好的命名
public class OrderAlreadyPaidException extends Exception { }
public class InvalidCouponCodeException extends Exception { }
public class AccountLockedException extends Exception { }

// 差的命名
public class BusinessException extends Exception { }   // 太笼统
public class MyException extends Exception { }          // 无意义
public class Error1 extends Exception { }               // 无法理解
```

### 提供有意义的信息

异常应该携带足够的上下文信息，让调用者不需要额外查找就能理解问题：

```java
// 好 - 提供了具体的上下文
public class OrderNotFoundException extends Exception {
    private final String orderId;
    private final String customerId;

    public OrderNotFoundException(String orderId, String customerId) {
        super(String.format("订单不存在: orderId=%s, customerId=%s", orderId, customerId));
        this.orderId = orderId;
        this.customerId = customerId;
    }

    public String getOrderId() { return orderId; }
    public String getCustomerId() { return customerId; }
}

// 差 - 只有一个笼统的消息
public class OrderNotFoundException extends Exception {
    public OrderNotFoundException() {
        super("出错了");
    }
}
```

### 保持异常层次合理

```java
// 定义业务异常的基类
public class BusinessException extends RuntimeException {
    private final String errorCode;

    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}

// 具体业务异常继承基类
public class PaymentFailedException extends BusinessException {
    public PaymentFailedException(String orderId, String reason) {
        super("PAYMENT_FAILED", "支付失败: orderId=" + orderId + ", 原因=" + reason);
    }
}

public class InventoryShortageException extends BusinessException {
    public InventoryShortageException(String sku, int available, int required) {
        super("INVENTORY_SHORTAGE",
            "库存不足: sku=" + sku + ", 可用=" + available + ", 需要=" + required);
    }
}
```

调用者可以统一捕获 `BusinessException`，也可以精确捕获具体异常：

```java
try {
    placeOrder(order);
} catch (PaymentFailedException e) {
    // 处理支付失败
} catch (InventoryShortageException e) {
    // 处理库存不足
} catch (BusinessException e) {
    // 统一兜底处理
    showError(e.getErrorCode(), e.getMessage());
}
```

## 何时使用自定义异常

**适合使用自定义异常的场景：**

- **业务异常**：表达业务规则的违规，如"订单已取消无法支付"、"用户权限不足"。这些异常的类型本身携带了信息，调用者可以据此做出不同处理。
- **模块边界异常**：在模块或服务的边界处，将内部异常包装为领域相关的异常。例如 DAO 层将 `SQLException` 包装为 `DataAccessException`。

**不需要自定义异常的场景：**

- 参数为空就抛 `NullPointerException` 或 `IllegalArgumentException`，不需要自定义 `NullParameterException`。
- 内部工具方法的异常不需要暴露给外部。

## 不要过度使用异常

异常机制设计用于处理异常情况，不应该用于正常的流程控制。

```java
// 错误：用异常做流程控制
public int findIndex(int[] arr, int target) {
    try {
        for (int i = 0; i <= arr.length; i++) { // 故意越界
            if (arr[i] == target) return i;
        }
    } catch (ArrayIndexOutOfBoundsException e) {
        return -1;
    }
    return -1;
}

// 正常：用返回值表示"未找到"
public int findIndex(int[] arr, int target) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == target) return i;
    }
    return -1;
}
```

::: warning 异常不是流程控制工具
用异常做流程控制有三个严重问题：
1. **性能差**：创建异常对象需要填充堆栈信息，代价远高于条件判断。
2. **语义混淆**：异常意味着"出了问题"，用它做正常逻辑会让维护者困惑。
3. **难以调试**：在开启异常断点的调试器中，正常的业务流程会反复触发断点。
:::
