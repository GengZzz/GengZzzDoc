# 并发编程

## 这一节你会学到什么

- 线程是什么
- 如何用 `std::thread` 启动任务
- `mutex` 为什么重要
- 并发常见风险

## 它是什么？

并发是让多个任务在同一段时间内推进。线程是程序中可以独立执行的一条任务线。

## 为什么需要它？

下载文件时还能更新进度条，服务器能同时处理多个请求，数据处理程序能把任务拆给多个 CPU 核心，这些都和并发有关。

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

## 常见错误

### 忘记 join 或 detach

线程对象销毁前，如果还没有 `join` 或 `detach`，程序会异常终止。

### 数据竞争

多个线程同时读写同一变量，却没有同步措施，会导致不可预测结果。

## 小练习

### 练习 1

创建一个线程输出一句话，主线程等待它结束。

### 练习 2

创建两个线程分别输出不同数字。

### 练习 3

用 `mutex` 保护一个全局计数器。

## 本节小结

- `thread` 用来启动并发任务。
- `join` 用来等待线程结束。
- 共享数据需要同步，`mutex` 是最基础的同步工具之一。
