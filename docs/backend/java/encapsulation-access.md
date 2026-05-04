# 封装与访问控制

封装是面向对象编程的核心原则之一。它的目的是将对象的内部状态隐藏起来，只通过受控的方法对外提供服务，从而防止外部代码随意修改对象的状态。

## 为什么需要封装

假设一个 `BankAccount` 类的 `balance` 字段是公开的：

```java
// 反面示例：没有封装
public class BankAccount {
    public double balance;
}
```

任何外部代码都可以直接写 `account.balance = -1000`，绕过所有业务规则。封装就是把数据藏起来，让外部只能通过方法操作：

```java
public class BankAccount {
    private double balance;

    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("存款金额必须为正数");
        }
        balance += amount;
    }

    public void withdraw(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("取款金额必须为正数");
        }
        if (amount > balance) {
            throw new IllegalArgumentException("余额不足");
        }
        balance -= amount;
    }

    public double getBalance() {
        return balance;
    }
}
```

这样，`balance` 的所有修改都经过了验证逻辑，数据完整性得到保障。

## 四种访问修饰符

Java 提供四种访问级别，控制类、字段、方法的可见范围：

| 修饰符 | 本类 | 同包 | 子类 | 全局 |
|---|---|---|---|---|
| `private` | 可见 | 不可见 | 不可见 | 不可见 |
| *default*（无修饰符） | 可见 | 可见 | 不可见 | 不可见 |
| `protected` | 可见 | 可见 | 可见 | 不可见 |
| `public` | 可见 | 可见 | 可见 | 可见 |

```java
package com.example;

public class AccessDemo {
    private   int a = 1;   // 仅本类
              int b = 2;   // 本类 + 同包（default）
    protected int c = 3;   // 本类 + 同包 + 子类
    public    int d = 4;   // 任何地方

    private void privateMethod() {
        System.out.println("仅本类可见");
    }
}
```

::: tip 设计原则
- 字段通常声明为 `private`，除非有充分理由暴露。
- 对外提供的方法用 `public`。
- 同包内的辅助类使用 *default*（不加修饰符）。
- `protected` 主要用于继承场景，允许子类访问父类的特定成员。
:::

## Getter / Setter 模式

用 `private` 修饰字段后，通过 getter 和 setter 方法控制访问：

```java
public class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        setScore(score);  // 用 setter 做验证
    }

    // Getter
    public String getName() {
        return name;
    }

    public int getScore() {
        return score;
    }

    // Setter —— 带验证逻辑
    public void setScore(int score) {
        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("分数必须在 0~100 之间");
        }
        this.score = score;
    }

    public boolean isPassed() {
        return score >= 60;
    }

    public static void main(String[] args) {
        Student s = new Student("Alice", 85);
        System.out.println(s.getName() + " scored " + s.getScore());
        System.out.println("Passed: " + s.isPassed());

        s.setScore(95);
        System.out.println("New score: " + s.getScore());

        // s.setScore(150);  // 抛出 IllegalArgumentException
    }
}
```

::: tip 封装的好处
将验证逻辑集中在 setter 中，所有修改分数的入口都经过同一套规则。如果以后需要增加"分数不能低于历史最高分"之类的限制，只需改一处。
:::

## this 关键字

`this` 代表当前对象的引用，常用于区分同名的参数和字段：

```java
public class Point {
    private double x;
    private double y;

    public Point(double x, double y) {
        this.x = x;    // this.x 是字段，x 是参数
        this.y = y;
    }

    public double distanceTo(Point other) {
        double dx = this.x - other.x;
        double dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    @Override
    public String toString() {
        return "(" + x + ", " + y + ")";
    }

    public static void main(String[] args) {
        Point a = new Point(0, 0);
        Point b = new Point(3, 4);
        System.out.println("Distance from " + a + " to " + b + " = " + a.distanceTo(b));
        // 输出: Distance from (0.0, 0.0) to (3.0, 4.0) = 5.0
    }
}
```

## 完整示例：BankAccount

```java
public class BankAccount {
    private String owner;
    private double balance;

    public BankAccount(String owner, double initialBalance) {
        this.owner = owner;
        if (initialBalance < 0) {
            throw new IllegalArgumentException("初始余额不能为负数");
        }
        this.balance = initialBalance;
    }

    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("存款金额必须为正数");
        }
        balance += amount;
        System.out.println("存入 " + amount + "，当前余额: " + balance);
    }

    public void withdraw(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("取款金额必须为正数");
        }
        if (amount > balance) {
            System.out.println("余额不足，当前余额: " + balance);
            return;
        }
        balance -= amount;
        System.out.println("取出 " + amount + "，当前余额: " + balance);
    }

    public double getBalance() {
        return balance;
    }

    public String getOwner() {
        return owner;
    }

    public static void main(String[] args) {
        BankAccount account = new BankAccount("Alice", 1000);
        account.deposit(500);
        account.withdraw(200);
        account.withdraw(2000);  // 余额不足
        System.out.println("最终余额: " + account.getBalance());
    }
}
```

运行结果：

```
存入 500.0，当前余额: 1500.0
取出 200.0，当前余额: 1300.0
余额不足，当前余额: 1300.0
最终余额: 1300.0
```
