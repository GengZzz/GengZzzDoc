# 并发编程

并发是让多个任务在同一段时间内推进。线程是程序中可以独立执行的一条任务线。这一节覆盖线程创建、mutex 同步和内存模型概述。

## 创建线程

```cpp
#include <iostream>
#include <thread>
using namespace std;

void work() {
    cout << "子线程执行任务" << endl;
}

int main() {
    thread t(work);
    t.join();
    cout << "主线程结束" << endl;
    return 0;
}
```

`thread t(work)` 启动新线程，`join` 表示主线程等待它执行完。

## 传递参数

```cpp
#include <iostream>
#include <thread>
using namespace std;

void printNumber(int value) {
    cout << value << endl;
}

int main() {
    thread t(printNumber, 42);
    t.join();
    return 0;
}
```

线程函数需要参数时，可以在创建线程时继续传入。

## mutex

多个线程同时修改同一个数据时，结果可能混乱。`mutex` 像一把锁，保证同一时间只有一个线程进入关键区域。

```cpp
#include <iostream>
#include <mutex>
#include <thread>
using namespace std;

int counter = 0;
mutex m;

void addMany() {
    for (int i = 0; i < 1000; i++) {
        lock_guard<mutex> lock(m);
        counter++;
    }
}

int main() {
    thread a(addMany);
    thread b(addMany);

    a.join();
    b.join();

    cout << counter << endl;
    return 0;
}
```

`lock_guard` 创建时加锁，离开作用域自动解锁。

## 内存模型概述

C++ 内存模型定义了多线程环境下对共享数据的操作如何可见。即使没有 data race，编译器和 CPU 的指令重排也可能导致线程间看到不一致的结果。

```cpp
atomic<bool> ready{false};
int data = 0;

void producer() {
    data = 42;
    ready.store(true, memory_order_release); // 保证 data = 42 对 acquire 可见
}

void consumer() {
    while (!ready.load(memory_order_acquire)) {}
    cout << data << endl; // 保证输出 42
}
```

详见 [现代并发](./modern-concurrency.md#内存顺序-memory_order)。

## 线程安全容器

标准库容器默认不是线程安全的。需要外部同步：

```cpp
#include <mutex>
#include <queue>

mutex mtx;
queue<int> q;

void pushSafe(int val) {
    lock_guard<mutex> lock(mtx);
    q.push(val);
}

int popSafe() {
    lock_guard<mutex> lock(mtx);
    int val = q.front();
    q.pop();
    return val;
}
```

::: tip 提示
生产环境推荐用 concurrent 库（如 Intel TBB）或自行封装线程安全容器，而不是每次都手写锁。
:::

## 死锁避免策略

两个线程各持一把锁等待对方的锁，形成死锁。

```cpp
// 危险写法：可能死锁
// T1: lock(m1); lock(m2);
// T2: lock(m2); lock(m1);
```

### 方法 1：统一锁顺序

所有线程按相同顺序获取锁。

### 方法 2：std::lock + lock_guard

```cpp
#include <mutex>

mutex m1, m2;

void safeTransfer() {
    lock(m1, m2); // 原子获取两把锁
    lock_guard<mutex> l1(m1, adopt_lock);
    lock_guard<mutex> l2(m2, adopt_lock);
    // 安全操作
}
```

详见 [现代并发](./modern-concurrency.md) 中的线程池实现和死锁动画演示。

## 常见错误

### 忘记 join 或 detach

线程对象销毁前，如果还没有 `join` 或 `detach`，程序会异常终止。

### 数据竞争

多个线程同时读写同一变量，却没有同步措施，会导致不可预测结果。

## 专题导航

并发编程的深入内容分布在以下专题页：

- [现代并发](./modern-concurrency.md) — std::async/future/promise、原子操作、内存顺序、线程池实现
