# 设计原则：复用

代码复用不是简单地复制粘贴，而是通过合理的抽象让同一份逻辑只维护一份。DRY 原则（Don't Repeat Yourself）是软件设计的基石之一。

## DRY 原则

DRY 的核心思想：每一条知识在系统中只有一个明确的表示。如果相同的逻辑出现在多个地方，修改时就容易遗漏，bug 就此产生。

```java
// 违反 DRY - 两处几乎相同的验证逻辑
public void registerUser(String name, String email) {
    if (name == null || name.trim().isEmpty()) {
        System.out.println("错误: 用户名不能为空");
        return;
    }
    if (email == null || !email.contains("@")) {
        System.out.println("错误: 邮箱格式不正确");
        return;
    }
    // 注册逻辑...
}

public void updateProfile(String name, String email) {
    if (name == null || name.trim().isEmpty()) {
        System.out.println("错误: 用户名不能为空");
        return;
    }
    if (email == null || !email.contains("@")) {
        System.out.println("错误: 邮箱格式不正确");
        return;
    }
    // 更新逻辑...
}
```

修改验证规则时，必须找到所有出现的地方逐一修改。这就是重复代码的隐患。

## 识别代码重复

代码重复有多种形式，需要分别识别：

**完全重复**：一模一样的代码出现在多处。

```java
// 出现在三处
System.out.println("[" + LocalDateTime.now() + "] " + message);
```

**结构重复**：逻辑模式相同，只是具体值不同。

```java
// 结构相同，只有类名不同
public User findUserById(int id) {
    try (Connection conn = dataSource.getConnection();
         PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
        ps.setInt(1, id);
        ResultSet rs = ps.executeQuery();
        // 映射结果...
    }
}

public Product findProductById(int id) {
    try (Connection conn = dataSource.getConnection();
         PreparedStatement ps = conn.prepareStatement("SELECT * FROM products WHERE id = ?")) {
        ps.setInt(1, id);
        ResultSet rs = ps.executeQuery();
        // 映射结果...
    }
}
```

**隐性重复**：看起来不同，但修改时需要同步改动。例如两处分别用 `1000` 和 `60 * 60` 表示一小时的秒数。

## 提取方法

消除重复最直接的手段是把重复代码提取为方法。

```java
// 重构前
public class OrderProcessor {
    public void processOnlineOrder(Order order) {
        System.out.println("[" + LocalDateTime.now() + "] 开始处理订单: " + order.getId());
        // 在线订单处理...
        System.out.println("[" + LocalDateTime.now() + "] 订单处理完成: " + order.getId());
    }

    public void processOfflineOrder(Order order) {
        System.out.println("[" + LocalDateTime.now() + "] 开始处理订单: " + order.getId());
        // 线下订单处理...
        System.out.println("[" + LocalDateTime.now() + "] 订单处理完成: " + order.getId());
    }
}

// 重构后
public class OrderProcessor {

    private void log(String action, Order order) {
        System.out.println("[" + LocalDateTime.now() + "] " + action + ": " + order.getId());
    }

    public void processOnlineOrder(Order order) {
        log("开始处理订单", order);
        // 在线订单处理...
        log("订单处理完成", order);
    }

    public void processOfflineOrder(Order order) {
        log("开始处理订单", order);
        // 线下订单处理...
        log("订单处理完成", order);
    }
}
```

验证逻辑的重构：

```java
// 重构后 - 验证逻辑提取为方法
public class UserValidator {

    public void validate(String name, String email) {
        validateName(name);
        validateEmail(email);
    }

    private void validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("用户名不能为空");
        }
    }

    private void validateEmail(String email) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("邮箱格式不正确");
        }
    }
}

// 使用
public void registerUser(String name, String email) {
    validator.validate(name, email);
    // 注册逻辑...
}

public void updateProfile(String name, String email) {
    validator.validate(name, email);
    // 更新逻辑...
}
```

## 提取类

当多个方法围绕同一组数据操作时，说明这些职责可以提取为独立的类。

```java
// 重构前：一个类承担太多职责
public class ReportGenerator {
    public void generateSalesReport() {
        Connection conn = getConnection();
        // 查询数据库...
        // 格式化数据...
        // 输出 PDF...
    }

    public void generateUserReport() {
        Connection conn = getConnection();
        // 查询数据库...
        // 格式化数据...
        // 输出 Excel...
    }

    private Connection getConnection() { /* 重复的连接逻辑 */ }
}

// 重构后：职责分离
public class DatabaseService {
    public Connection getConnection() { /* 统一管理连接 */ }
    public List<SalesData> querySalesData() { /* 查询 */ }
    public List<UserData> queryUserData() { /* 查询 */ }
}

public class ReportFormatter {
    public String formatAsCsv(List<?> data) { /* CSV 格式化 */ }
    public String formatAsHtml(List<?> data) { /* HTML 格式化 */ }
}

public class ReportGenerator {
    private final DatabaseService dbService;
    private final ReportFormatter formatter;

    public void generateSalesReport() {
        List<SalesData> data = dbService.querySalesData();
        String output = formatter.formatAsCsv(data);
        // 输出...
    }
}
```

## 代码异味

代码异味（Code Smell）是代码中可能存在问题的信号，常见类型：

| 异味 | 表现 | 对策 |
| --- | --- | --- |
| 长方法 | 一个方法超过 50 行 | 提取子方法 |
| 大类 | 一个类承担太多职责 | 拆分为多个类 |
| 重复代码 | 相似逻辑出现在多处 | 提取方法或类 |
| 魔法数字 | 代码中出现无法理解的字面量 | 提取为命名常量 |
| 过长参数列表 | 方法有超过 3-4 个参数 | 用参数对象封装 |

魔法数字示例：

```java
// 有异味
if (age < 18) { ... }
if (discount > 0.15) { ... }
Thread.sleep(86400000);

// 重构后
static final int MIN_ADULT_AGE = 18;
static final double MAX_DISCOUNT_RATE = 0.15;
static final long ONE_DAY_MS = 24 * 60 * 60 * 1000L;

if (age < MIN_ADULT_AGE) { ... }
if (discount > MAX_DISCOUNT_RATE) { ... }
Thread.sleep(ONE_DAY_MS);
```

## 重构基础

重构是在不改变外部行为的前提下改善内部代码结构。核心原则：**小步修改，保持行为不变**。

基本手法：

1. **提取方法**（Extract Method）：将一段代码抽为独立方法。
2. **内联方法**（Inline Method）：将简单方法展开到调用处。
3. **重命名**（Rename）：让名字更准确地表达意图。
4. **移动方法**（Move Method）：把方法移到更合适的类中。

安全重构的步骤：
1. 确认当前代码有测试覆盖（或先写测试）
2. 做一个小改动
3. 运行测试确认行为不变
4. 重复

::: warning 没有测试就不要重构
重构的前提是行为不变。没有测试，你无法确认改动是否引入了 bug。在遗留代码上重构时，至少先为要修改的代码写一个粗略的测试。
:::

## 示例：重构重复代码程序

下面展示一个典型的重构过程，从充满重复代码的程序逐步改写。

### 重构前

```java
public class ReportService {

    public void generateDailyReport() {
        // 1. 连接数据库
        String url = "jdbc:mysql://localhost:3306/mydb";
        try (Connection conn = DriverManager.getConnection(url, "user", "pass")) {
            // 2. 查询数据
            String sql = "SELECT * FROM orders WHERE date = CURDATE()";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                // 3. 格式化输出
                System.out.println("========== 日报 ==========");
                while (rs.next()) {
                    System.out.printf("订单: %s  金额: %.2f%n",
                        rs.getString("id"), rs.getDouble("amount"));
                }
                System.out.println("==========================");
            }
        } catch (SQLException e) {
            System.out.println("生成报表失败: " + e.getMessage());
        }
    }

    public void generateMonthlyReport() {
        // 1. 连接数据库 - 重复！
        String url = "jdbc:mysql://localhost:3306/mydb";
        try (Connection conn = DriverManager.getConnection(url, "user", "pass")) {
            // 2. 查询数据 - SQL 不同
            String sql = "SELECT * FROM orders WHERE MONTH(date) = MONTH(CURDATE())";
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                // 3. 格式化输出 - 重复！
                System.out.println("========== 月报 ==========");
                while (rs.next()) {
                    System.out.printf("订单: %s  金额: %.2f%n",
                        rs.getString("id"), rs.getDouble("amount"));
                }
                System.out.println("==========================");
            }
        } catch (SQLException e) {
            System.out.println("生成报表失败: " + e.getMessage());
        }
    }
}
```

问题：连接逻辑重复、格式化逻辑重复、异常处理重复。

### 重构后

```java
public class DatabaseService {
    private final String url;
    private final String user;
    private final String password;

    public DatabaseService(String url, String user, String password) {
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public List<Map<String, Object>> query(String sql) {
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            List<Map<String, Object>> results = new ArrayList<>();
            ResultSetMetaData meta = rs.getMetaData();
            int columnCount = meta.getColumnCount();

            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= columnCount; i++) {
                    row.put(meta.getColumnName(i), rs.getObject(i));
                }
                results.add(row);
            }
            return results;
        } catch (SQLException e) {
            throw new RuntimeException("查询失败: " + sql, e);
        }
    }
}

public class ReportFormatter {

    public void printReport(String title, List<Map<String, Object>> data) {
        System.out.println("========== " + title + " ==========");
        for (Map<String, Object> row : data) {
            System.out.printf("订单: %s  金额: %.2f%n",
                row.get("id"), ((Number) row.get("amount")).doubleValue());
        }
        System.out.println("=".repeat(title.length() + 22));
    }
}

public class ReportService {
    private final DatabaseService dbService;
    private final ReportFormatter formatter;

    public ReportService(DatabaseService dbService, ReportFormatter formatter) {
        this.dbService = dbService;
        this.formatter = formatter;
    }

    public void generateDailyReport() {
        List<Map<String, Object>> data = dbService.query(
            "SELECT * FROM orders WHERE date = CURDATE()");
        formatter.printReport("日报", data);
    }

    public void generateMonthlyReport() {
        List<Map<String, Object>> data = dbService.query(
            "SELECT * FROM orders WHERE MONTH(date) = MONTH(CURDATE())");
        formatter.printReport("月报", data);
    }
}
```

重构效果：
- 数据库连接逻辑只存在于 `DatabaseService` 中
- 格式化逻辑只存在于 `ReportFormatter` 中
- `ReportService` 只负责组合查询和格式化
- 新增报表类型只需添加一个方法，不需要复制粘贴
