# 线程同步

多个线程同时读写共享数据时，如果不加控制，会产生竞态条件（Race Condition），导致数据不一致。线程同步的目标就是保证共享数据在同一时刻只能被一个线程修改。

## 竞态条件

以下代码展示了经典的计数器竞态问题。两个线程同时对同一个变量执行 `count++`，最终结果可能不是 200000。

```java
public class RaceConditionDemo {
    private int count = 0;

    public void increment() {
        count++; // 非原子操作：读取 → 加一 → 写回
    }

    public static void main(String[] args) throws InterruptedException {
        RaceConditionDemo demo = new RaceConditionDemo();

        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 100000; i++) demo.increment();
        });
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 100000; i++) demo.increment();
        });

        t1.start();
        t2.start();
        t1.join();
        t2.join();

        System.out.println("期望: 200000, 实际: " + demo.count);
    }
}
```

`count++` 看似一步，实际包含三个操作：读取当前值、加一、写回。两个线程可能同时读到相同的旧值，导致一次加法丢失。

## synchronized 关键字

`synchronized` 是 Java 内置的互斥同步机制，保证同一时刻只有一个线程执行被保护的代码。

### 同步方法

```java
public class SyncCounter {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

实例同步方法的锁对象是 `this`。静态同步方法的锁对象是 `Class` 对象：

```java
public class SyncStatic {
    private static int count = 0;

    public static synchronized void increment() {
        count++; // 锁对象是 SyncStatic.class
    }
}
```

### 同步块

同步块可以指定任意锁对象，粒度比同步方法更细，减少不必要的锁竞争。

```java
public class SyncBlockDemo {
    private final Object lock = new Object();
    private int count = 0;

    public void increment() {
        synchronized (lock) {
            count++;
        }
    }
}
```

::: tip 选择合适的锁对象
- 同步实例方法：锁是 `this`，所有 `synchronized` 方法共享同一把锁
- 同步静态方法：锁是 `ClassName.class`
- 同步块：锁由你指定，可以缩小锁范围，提高并发性能
:::

::: warning 不要锁字符串常量
字符串常量池中相同的字面量是同一个对象，如果在不同地方 `synchronized("lock")` 会意外地共用同一把锁。
:::

## volatile 关键字

`volatile` 保证变量的可见性——一个线程修改了 `volatile` 变量，其他线程能立即看到最新值。但 `volatile` **不保证原子性**。

```java
public class VolatileDemo {
    private volatile boolean running = true;

    public void stop() {
        running = false;
    }

    public void work() {
        while (running) {
            // 没有 volatile，running 可能永远是 true（线程缓存）
        }
        System.out.println("已停止");
    }
}
```

`volatile` 适用的场景：
- 状态标志（如上面的 `running`）
- 一次性写入的不可变引用（如双重检查锁定中的单例）

`volatile` **不适用** 的场景：
- 复合操作（如 `count++`）—— 需要用 `synchronized` 或 `AtomicInteger`

::: tip volatile vs synchronized
`volatile` 只保证可见性，不保证原子性。`synchronized` 同时保证可见性和原子性。如果操作是原子的（如读写一个 `boolean`），`volatile` 就够了；如果涉及复合操作，必须用 `synchronized` 或 `java.util.concurrent.atomic` 包。
:::

## Lock 接口

`java.util.concurrent.locks.Lock` 接口提供了比 `synchronized` 更灵活的锁机制，最常用的实现是 `ReentrantLock`。

```java
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

public class LockCounter {
    private final Lock lock = new ReentrantLock();
    private int count = 0;

    public void increment() {
        lock.lock();
        try {
            count++;
        } finally {
            lock.unlock(); // 必须在 finally 中释放锁
        }
    }

    public int getCount() {
        return count;
    }
}
```

`tryLock()` 提供非阻塞的锁获取方式，可以避免死锁：

```java
import java.util.concurrent.TimeUnit;

public void tryIncrement() throws InterruptedException {
    if (lock.tryLock(1, TimeUnit.SECONDS)) {
        try {
            count++;
        } finally {
            lock.unlock();
        }
    } else {
        System.out.println("获取锁超时，跳过本次操作");
    }
}
```

`synchronized` 与 `ReentrantLock` 的对比：

| 特性 | synchronized | ReentrantLock |
|------|-------------|---------------|
| 释放锁 | 自动（退出同步块） | 手动（必须 `unlock()`） |
| 尝试获取 | 不支持 | `tryLock()` |
| 可中断 | 不支持 | `lockInterruptibly()` |
| 公平锁 | 非公平 | 可选公平/非公平 |
| 条件变量 | 单一 `wait/notify` | 多个 `Condition` |

::: tip 优先使用 synchronized
在不需要 `Lock` 特有功能时，优先使用 `synchronized`。它语法简洁、不会忘记释放锁，且 JVM 对其有持续的优化。
:::

## 死锁

当两个或更多线程互相等待对方持有的锁时，所有线程都无法继续，形成死锁。

```java
public class DeadlockDemo {
    private final Object lockA = new Object();
    private final Object lockB = new Object();

    public void method1() {
        synchronized (lockA) {
            System.out.println(Thread.currentThread().getName() + " 持有 lockA，等待 lockB");

            try { Thread.sleep(100); } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            synchronized (lockB) {
                System.out.println(Thread.currentThread().getName() + " 获取到 lockB");
            }
        }
    }

    public void method2() {
        synchronized (lockB) {
            System.out.println(Thread.currentThread().getName() + " 持有 lockB，等待 lockA");

            try { Thread.sleep(100); } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            synchronized (lockA) {
                System.out.println(Thread.currentThread().getName() + " 获取到 lockA");
            }
        }
    }

    public static void main(String[] args) {
        DeadlockDemo demo = new DeadlockDemo();

        new Thread(demo::method1, "线程1").start();
        new Thread(demo::method2, "线程2").start();
        // 两个线程将永远阻塞
    }
}
```

避免死锁的方法：
- **固定加锁顺序**：所有线程按相同顺序获取锁
- **使用 tryLock 带超时**：超时后释放已持有的锁
- **避免嵌套锁**：持有一个锁时尽量不要申请另一个锁

## wait() / notify() / notifyAll()

这三个方法定义在 `Object` 类中，用于线程间通信。**必须在 `synchronized` 块中调用**，否则抛出 `IllegalMonitorStateException`。

- `wait()`：释放锁，进入等待状态，直到被唤醒
- `notify()`：唤醒一个等待该锁的线程
- `notifyAll()`：唤醒所有等待该锁的线程

```java
public class WaitNotifyDemo {
    private final Object lock = new Object();
    private boolean ready = false;

    public void waitForSignal() throws InterruptedException {
        synchronized (lock) {
            while (!ready) { // 必须用 while 检查条件
                lock.wait(); // 释放锁，进入等待
            }
            System.out.println("收到信号，继续执行");
        }
    }

    public void sendSignal() {
        synchronized (lock) {
            ready = true;
            lock.notifyAll(); // 唤醒所有等待线程
        }
    }
}
```

::: warning 用 while 而不是 if 检查条件
`wait()` 返回后，条件可能已经被其他线程改变了（虚假唤醒）。必须在 `while` 循环中重新检查条件。
:::

## 生产者-消费者模型

生产者-消费者是经典的线程协作模式：生产者生成数据放入缓冲区，消费者从缓冲区取出数据处理。

```java
import java.util.LinkedList;
import java.util.Queue;

public class ProducerConsumerDemo {
    private final Queue<Integer> buffer = new LinkedList<>();
    private final int capacity = 5;

    public void produce(int item) throws InterruptedException {
        synchronized (buffer) {
            while (buffer.size() == capacity) {
                buffer.wait(); // 缓冲区满，等待消费者取走
            }
            buffer.add(item);
            System.out.println("生产: " + item + " | 缓冲区: " + buffer.size());
            buffer.notifyAll(); // 通知消费者
        }
    }

    public int consume() throws InterruptedException {
        synchronized (buffer) {
            while (buffer.isEmpty()) {
                buffer.wait(); // 缓冲区空，等待生产者放入
            }
            int item = buffer.poll();
            System.out.println("消费: " + item + " | 缓冲区: " + buffer.size());
            buffer.notifyAll(); // 通知生产者
            return item;
        }
    }

    public static void main(String[] args) {
        ProducerConsumerDemo demo = new ProducerConsumerDemo();

        // 生产者线程
        Thread producer = new Thread(() -> {
            for (int i = 1; i <= 10; i++) {
                try {
                    demo.produce(i);
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }, "producer");

        // 消费者线程
        Thread consumer = new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                try {
                    demo.consume();
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }, "consumer");

        producer.start();
        consumer.start();
    }
}
```

::: tip 实际项目中使用 BlockingQueue
手写 `wait/notify` 容易出错。`java.util.concurrent.BlockingQueue` 内部实现了生产者-消费者逻辑，直接用它更安全、更简洁。详见[并发工具类](./concurrency-utils.md)。
:::
