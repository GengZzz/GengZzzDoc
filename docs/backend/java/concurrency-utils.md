# 并发工具类

`java.util.concurrent` 包提供了大量高层并发工具，让我们不必直接操作 `Thread` 和底层同步原语。本篇覆盖线程池、异步编排、同步工具和并发集合。

## ExecutorService 线程池

直接创建线程的问题：创建和销毁开销大、无法控制并发数量、难以管理。线程池复用线程、限制并发、统一管理生命周期。

### 创建线程池

`Executors` 工厂方法提供了几种常用线程池：

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ExecutorDemo {
    public static void main(String[] args) {
        // 固定大小线程池
        ExecutorService fixed = Executors.newFixedThreadPool(4);

        // 可缓存线程池（空闲线程 60 秒后回收）
        ExecutorService cached = Executors.newCachedThreadPool();

        // 单线程池（保证任务串行执行）
        ExecutorService single = Executors.newSingleThreadExecutor();

        // 定时线程池
        ExecutorService scheduled = Executors.newScheduledThreadPool(2);
    }
}
```

各类型对比：

| 类型 | 特点 | 适用场景 |
|------|------|---------|
| `newFixedThreadPool(n)` | 固定 n 个线程 | CPU 密集型任务 |
| `newCachedThreadPool()` | 按需创建，空闲回收 | 大量短时 I/O 任务 |
| `newSingleThreadExecutor()` | 单个工作线程 | 需要串行执行的场景 |
| `newScheduledThreadPool(n)` | 支持定时和周期执行 | 定时任务 |

::: warning 阿里规约：禁止使用 Executors 创建线程池
`newFixedThreadPool` 和 `newSingleThreadExecutor` 使用无界队列，可能导致 OOM。`newCachedThreadPool` 最大线程数为 `Integer.MAX_VALUE`，可能创建过多线程。生产环境推荐使用 `ThreadPoolExecutor` 手动配置参数。
:::

### submit() 与 execute()

`execute()` 只接受 `Runnable`，没有返回值。`submit()` 接受 `Runnable` 或 `Callable`，返回 `Future` 用于获取结果。

```java
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

public class SubmitDemo {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        // execute: 无返回值
        pool.execute(() -> System.out.println("execute 任务"));

        // submit Runnable: Future.get() 返回 null
        Future<?> f1 = pool.submit(() -> System.out.println("submit Runnable"));
        System.out.println("Runnable 结果: " + f1.get()); // null

        // submit Callable: Future.get() 返回计算结果
        Callable<Integer> task = () -> {
            int sum = 0;
            for (int i = 1; i <= 100; i++) sum += i;
            return sum;
        };
        Future<Integer> f2 = pool.submit(task);
        System.out.println("Callable 结果: " + f2.get()); // 5050

        pool.shutdown();
    }
}
```

### shutdown() 与 shutdownNow()

```java
ExecutorService pool = Executors.newFixedThreadPool(2);

// shutdown: 不再接受新任务，等待已提交任务完成
pool.shutdown();

// shutdownNow: 尝试中断所有正在执行的任务，返回未开始的任务
// List<Runnable> unfinished = pool.shutdownNow();

// 等待所有任务完成（带超时）
boolean terminated = pool.awaitTermination(10, TimeUnit.SECONDS);
if (!terminated) {
    pool.shutdownNow(); // 超时后强制关闭
}
```

## CompletableFuture

`CompletableFuture`（Java 8+）提供了强大的异步编程模型，支持链式调用、异常处理和组合多个异步任务。

### 创建异步任务

```java
import java.util.concurrent.CompletableFuture;

// 无返回值
CompletableFuture<Void> f1 = CompletableFuture.runAsync(() -> {
    System.out.println("异步任务: " + Thread.currentThread().getName());
});

// 有返回值
CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> {
    return "异步结果";
});
```

### 链式转换

```java
public class CompletableFutureChain {
    public static void main(String[] args) throws Exception {
        // thenApply: 转换结果 (Function)
        CompletableFuture<Integer> f1 = CompletableFuture
            .supplyAsync(() -> "Hello")
            .thenApply(s -> s.length());

        System.out.println(f1.get()); // 5

        // thenAccept: 消费结果 (Consumer)
        CompletableFuture
            .supplyAsync(() -> "World")
            .thenAccept(s -> System.out.println("收到: " + s));

        // thenRun: 不关心前一步结果 (Runnable)
        CompletableFuture
            .supplyAsync(() -> "任务完成")
            .thenRun(() -> System.out.println("后续操作"));

        // thenCompose: 扁平化嵌套的 CompletableFuture
        CompletableFuture<String> f2 = CompletableFuture
            .supplyAsync(() -> "用户ID:123")
            .thenCompose(id -> CompletableFuture.supplyAsync(() -> "查询到 " + id));

        // thenCombine: 合并两个独立的异步结果
        CompletableFuture<String> f3 = CompletableFuture
            .supplyAsync(() -> "Hello")
            .thenCombine(
                CompletableFuture.supplyAsync(() -> "World"),
                (a, b) -> a + " " + b
            );

        System.out.println(f3.get()); // Hello World
    }
}
```

各链式方法对比：

| 方法 | 参数 | 返回值 | 用途 |
|------|------|--------|------|
| `thenApply` | `Function<T,U>` | `CompletableFuture<U>` | 转换结果 |
| `thenAccept` | `Consumer<T>` | `CompletableFuture<Void>` | 消费结果 |
| `thenRun` | `Runnable` | `CompletableFuture<Void>` | 执行后续动作 |
| `thenCompose` | `Function<T,CompletableFuture<U>>` | `CompletableFuture<U>` | 链接两个异步任务 |
| `thenCombine` | `CompletableFuture<U>, BiFunction` | `CompletableFuture<V>` | 合并两个结果 |

### 异常处理

```java
// exceptionally: 捕获异常，返回替代值
CompletableFuture<Integer> f1 = CompletableFuture
    .supplyAsync(() -> { throw new RuntimeException("出错了"); })
    .exceptionally(ex -> {
        System.err.println("异常: " + ex.getMessage());
        return 0; // 降级值
    });

// handle: 同时处理正常结果和异常
CompletableFuture<String> f2 = CompletableFuture
    .supplyAsync(() -> "OK")
    .handle((result, ex) -> {
        if (ex != null) return "错误: " + ex.getMessage();
        return "成功: " + result;
    });
```

### 组合多个 CompletableFuture

```java
import java.util.List;
import java.util.stream.Collectors;

public class CompletableFutureCombine {
    public static void main(String[] args) throws Exception {
        // allOf: 等待全部完成
        CompletableFuture<String> f1 = CompletableFuture.supplyAsync(() -> "A");
        CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> "B");
        CompletableFuture<String> f3 = CompletableFuture.supplyAsync(() -> "C");

        CompletableFuture<Void> all = CompletableFuture.allOf(f1, f2, f3);
        all.join(); // 等待全部完成

        List<String> results = List.of(f1, f2, f3).stream()
            .map(CompletableFuture::join)
            .collect(Collectors.toList());
        System.out.println(results); // [A, B, C]

        // anyOf: 任一完成即可
        CompletableFuture<Object> any = CompletableFuture.anyOf(
            CompletableFuture.supplyAsync(() -> { sleep(100); return "慢"; }),
            CompletableFuture.supplyAsync(() -> "快")
        );
        System.out.println("最快完成: " + any.get()); // 快
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
```

## 同步工具

### CountDownLatch

一个或多个线程等待其他线程完成操作。计数器只能用一次。

```java
import java.util.concurrent.CountDownLatch;

public class CountDownLatchDemo {
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(3); // 计数器初始值 3

        for (int i = 1; i <= 3; i++) {
            new Thread(() -> {
                System.out.println(Thread.currentThread().getName() + " 完成");
                latch.countDown(); // 计数器减一
            }, "worker-" + i).start();
        }

        latch.await(); // 主线程等待计数器归零
        System.out.println("所有工作完成");
    }
}
```

### CyclicBarrier

一组线程互相等待，全部到达屏障点后再继续。可重复使用。

```java
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;

public class CyclicBarrierDemo {
    public static void main(String[] args) {
        CyclicBarrier barrier = new CyclicBarrier(3, () -> {
            System.out.println("--- 所有线程已到达，继续执行 ---");
        });

        for (int i = 1; i <= 3; i++) {
            new Thread(() -> {
                System.out.println(Thread.currentThread().getName() + " 到达屏障");
                try {
                    barrier.await(); // 等待其他线程
                } catch (InterruptedException | BrokenBarrierException e) {
                    Thread.currentThread().interrupt();
                }
                System.out.println(Thread.currentThread().getName() + " 穿过屏障");
            }, "线程-" + i).start();
        }
    }
}
```

### Semaphore

控制同时访问特定资源的线程数量，常用于限流。

```java
import java.util.concurrent.Semaphore;

public class SemaphoreDemo {
    public static void main(String[] args) {
        Semaphore semaphore = new Semaphore(3); // 最多 3 个许可

        for (int i = 1; i <= 6; i++) {
            new Thread(() -> {
                try {
                    semaphore.acquire(); // 获取许可
                    System.out.println(Thread.currentThread().getName() + " 获取许可，开始执行");
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    semaphore.release(); // 释放许可
                    System.out.println(Thread.currentThread().getName() + " 释放许可");
                }
            }, "任务-" + i).start();
        }
    }
}
```

三种同步工具的对比：

| 工具 | 用途 | 可复用 |
|------|------|--------|
| `CountDownLatch` | 一个/多个线程等待其他线程 | 否 |
| `CyclicBarrier` | 一组线程互相等待 | 是 |
| `Semaphore` | 控制并发访问数量 | 是 |

## 并发集合

### ConcurrentHashMap

线程安全的 `HashMap`，采用分段锁（Java 8+ 使用 CAS + synchronized），并发性能远优于 `Hashtable` 或 `Collections.synchronizedMap()`。

```java
import java.util.concurrent.ConcurrentHashMap;

ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

// 线程安全的 put/get
map.put("key", 1);
map.get("key");

// 原子操作
map.putIfAbsent("key", 0);       // key 不存在时才放入
map.compute("key", (k, v) -> v == null ? 1 : v + 1); // 原子更新
map.merge("key", 1, Integer::sum); // 原子合并

// 统计大小（弱一致性，但通常够用）
int size = map.size();
```

### CopyOnWriteArrayList

写时复制：修改操作在底层数组的副本上执行，读操作无锁。适合读多写少的场景。

```java
import java.util.concurrent.CopyOnWriteArrayList;

CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();

// 读操作无锁
list.add("A"); // 写时复制整个数组
String first = list.get(0); // 读操作无锁

// 遍历时不会抛 ConcurrentModificationException
list.add("B");
for (String s : list) {
    System.out.println(s); // 遍历的是快照
}
```

::: warning CopyOnWriteArrayList 不适合写多场景
每次写入都会复制整个数组，写操作开销很大。只有在读远多于写时才考虑使用。
:::

### ConcurrentLinkedQueue

基于 CAS 的无锁线程安全队列，适合高并发场景。

```java
import java.util.concurrent.ConcurrentLinkedQueue;

ConcurrentLinkedQueue<String> queue = new ConcurrentLinkedQueue<>();
queue.offer("A");  // 入队
queue.poll();      // 出队，队列为空返回 null
queue.peek();      // 查看队首
```

### BlockingQueue

阻塞队列，内置了生产者-消费者的等待/唤醒逻辑。

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(10);

// 生产者
queue.put(1);         // 队列满时阻塞
queue.offer(2);       // 队列满时返回 false
queue.offer(3, 1, TimeUnit.SECONDS); // 带超时

// 消费者
int item = queue.take(); // 队列空时阻塞
Integer maybe = queue.poll(); // 队列空时返回 null
```

常用实现：

| 实现 | 特点 |
|------|------|
| `ArrayBlockingQueue` | 有界数组，FIFO |
| `LinkedBlockingQueue` | 可选有界链表，FIFO |
| `PriorityBlockingQueue` | 无界，按优先级排序 |
| `SynchronousQueue` | 不存储元素，直接传递 |

::: tip 生产者-消费者推荐方案
使用 `BlockingQueue` 替代手写的 `wait/notify`，代码更简洁、更安全。线程池内部也大量使用 `BlockingQueue` 来管理待执行任务。
:::
