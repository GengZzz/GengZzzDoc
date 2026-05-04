# 线程基础

线程是操作系统调度的最小单位。一个 Java 进程至少包含一个线程（主线程），多线程可以让程序同时执行多个任务。Java 对线程的支持内建于 `java.lang` 包中，不需要额外依赖。

## 创建线程

### 方式一：继承 Thread 类

`Thread` 类本身实现了 `Runnable` 接口，重写 `run()` 方法即可定义线程要执行的任务。

```java
public class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("线程运行中: " + Thread.currentThread().getName());
    }
}

// 使用
MyThread t = new MyThread();
t.start(); // 启动线程
```

### 方式二：实现 Runnable 接口（推荐）

Java 只支持单继承，如果继承了 `Thread` 就无法再继承其他类。实现 `Runnable` 接口更灵活，也更符合"任务与执行机制分离"的设计原则。

```java
public class MyTask implements Runnable {
    @Override
    public void run() {
        System.out.println("任务执行中: " + Thread.currentThread().getName());
    }
}

// 使用
Thread t = new Thread(new MyTask());
t.start();
```

用 Lambda 简化：

```java
Thread t = new Thread(() -> {
    System.out.println("Lambda 任务: " + Thread.currentThread().getName());
});
t.start();
```

::: tip 推荐用 Runnable
实现 `Runnable` 接口可以将任务代码与线程机制解耦，同一个 `Runnable` 实例可以被多个线程共享，也便于使用线程池。继承 `Thread` 只在简单场景下使用。
:::

## start() 与 run() 的区别

`start()` 方法会创建一个新的操作系统线程，然后在新线程中调用 `run()`。直接调用 `run()` 只是在当前线程中执行方法体，不会创建新线程。

```java
public class StartVsRun {
    public static void main(String[] args) {
        Runnable task = () -> {
            System.out.println("执行线程: " + Thread.currentThread().getName());
        };

        Thread t = new Thread(task, "新线程");

        // 直接调用 run() —— 在主线程中执行
        t.run();    // 输出: 执行线程: main

        // 调用 start() —— 创建新线程执行
        t.start();  // 输出: 执行线程: 新线程
    }
}
```

::: warning 不要直接调用 run()
直接调用 `run()` 等同于普通方法调用，达不到并发的效果。启动线程必须调用 `start()`。
:::

## 线程生命周期

Java 线程有 6 种状态，定义在 `Thread.State` 枚举中：

```
         new Thread()
              |
             New
              |
          start()
              |
          Runnable ◄─────────────────┐
         /         \                  |
    获得 CPU 时间片   失去时间片        |
       /               \              |
    Running ──────────────► Runnable
       |
   运行结束 / 异常终止
       |
   Terminated
```

完整的 6 种状态：

| 状态 | 触发条件 |
|------|---------|
| `NEW` | 创建了 Thread 对象，尚未调用 `start()` |
| `RUNNABLE` | 调用了 `start()`，在就绪队列中等待或正在运行 |
| `BLOCKED` | 等待获取 `synchronized` 锁 |
| `WAITING` | 调用了 `wait()`、`join()` 等，需要被显式唤醒 |
| `TIMED_WAITING` | `sleep(time)`、`join(time)` 等带超时的等待 |
| `TERMINATED` | `run()` 方法执行完毕或抛出未捕获异常 |

`BLOCKED`、`WAITING`、`TIMED_WAITING` 属于阻塞状态，详细机制在[线程同步](./thread-synchronization.md)中展开。

## Thread.sleep()

`Thread.sleep()` 让当前线程暂停指定毫秒数，让出 CPU 给其他线程。

```java
public class SleepDemo {
    public static void main(String[] args) {
        System.out.println("开始等待...");

        try {
            Thread.sleep(2000); // 暂停 2 秒
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.println("线程被中断");
        }

        System.out.println("等待结束");
    }
}
```

::: tip sleep 不释放锁
`sleep()` 让线程进入 `TIMED_WAITING` 状态，让出 CPU 但**不会释放已持有的锁**。如果需要在等待时释放锁，应该使用 `wait()`。
:::

## Thread.join()

`join()` 方法让当前线程等待目标线程执行完毕后再继续。常用于需要等待某个线程结果的场景。

```java
public class JoinDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            try {
                Thread.sleep(1000);
                System.out.println("工作线程完成");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "worker");

        worker.start();
        System.out.println("主线程等待 worker...");
        worker.join(); // 主线程阻塞，直到 worker 结束
        System.out.println("主线程继续执行");
    }
}

// 输出:
// 主线程等待 worker...
// 工作线程完成
// 主线程继续执行
```

## 守护线程

守护线程（Daemon Thread）是为其他线程服务的后台线程。当所有非守护线程（用户线程）结束时，JVM 直接退出，不会等待守护线程结束。

典型的守护线程：垃圾回收线程。

```java
public class DaemonDemo {
    public static void main(String[] args) {
        Thread daemon = new Thread(() -> {
            while (true) {
                try {
                    Thread.sleep(500);
                    System.out.println("守护线程运行中...");
                } catch (InterruptedException e) {
                    break;
                }
            }
        });

        daemon.setDaemon(true); // 必须在 start() 之前设置
        daemon.start();

        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        System.out.println("主线程结束，JVM 即将退出");
        // 守护线程会随 JVM 退出而终止
    }
}
```

::: warning setDaemon 必须在 start() 前调用
如果在线程启动后调用 `setDaemon()`，会抛出 `IllegalThreadStateException`。
:::

## 线程优先级

Java 提供 1~10 的线程优先级，用 `setPriority()` 设置。优先级只是给调度器的建议，不保证调度顺序。

```java
public class PriorityDemo {
    public static void main(String[] args) {
        Thread high = new Thread(() -> System.out.println("高优先级"), "high");
        Thread low = new Thread(() -> System.out.println("低优先级"), "low");

        high.setPriority(Thread.MAX_PRIORITY);  // 10
        low.setPriority(Thread.MIN_PRIORITY);   // 1

        // 优先级只影响调度概率，不保证执行顺序
        low.start();
        high.start();
    }
}
```

三个预定义常量：

| 常量 | 值 |
|------|---|
| `Thread.MIN_PRIORITY` | 1 |
| `Thread.NORM_PRIORITY` | 5（默认） |
| `Thread.MAX_PRIORITY` | 10 |

::: tip 优先级不保证行为
不同操作系统对线程优先级的处理方式不同，不要依赖优先级来控制程序逻辑。
:::

## Callable 与 Future

`Runnable.run()` 没有返回值也不能抛出受检异常。`Callable` 接口弥补了这两个不足：`call()` 方法可以返回结果，也可以抛出异常。`Future` 用来获取异步计算的结果。

```java
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;

public class CallableDemo {
    public static void main(String[] args) {
        Callable<Integer> task = () -> {
            int sum = 0;
            for (int i = 1; i <= 100; i++) {
                sum += i;
            }
            return sum;
        };

        FutureTask<Integer> future = new FutureTask<>(task);
        new Thread(future).start();

        // 主线程可以做其他事情...

        try {
            Integer result = future.get(); // 阻塞直到计算完成
            System.out.println("计算结果: " + result); // 5050
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (ExecutionException e) {
            System.err.println("计算出错: " + e.getCause());
        }
    }
}
```

`Future` 的常用方法：

| 方法 | 说明 |
|------|------|
| `get()` | 阻塞等待结果 |
| `get(timeout, unit)` | 带超时的等待 |
| `isDone()` | 任务是否完成 |
| `cancel(mayInterrupt)` | 取消任务 |

::: tip FutureTask 既是 Runnable 又是 Future
`FutureTask` 同时实现了 `Runnable` 和 `Future` 接口，可以直接传给 `Thread` 构造方法。在实际项目中，通常使用线程池的 `submit()` 方法提交 `Callable`，直接返回 `Future`。
:::

<JavaConcurrencyDemo />
