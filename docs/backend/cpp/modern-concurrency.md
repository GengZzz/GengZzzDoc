# 现代并发

C++11 提供了完整的并发工具链：线程、future、原子操作和内存模型。

## std::thread 创建与管理

```cpp
#include <thread>
#include <iostream>
using namespace std;

void worker(int id) {
    cout << "线程 " << id << " 执行中" << endl;
}

int main() {
    thread t1(worker, 1);
    thread t2(worker, 2);

    t1.join();
    t2.join();
}
```

### 线程与参数传递

```cpp
void process(const string& name, int count) {
    for (int i = 0; i < count; ++i)
        cout << name << ": " << i << endl;
}

int main() {
    string task = "task-A";
    // string 会被拷贝到线程内部
    thread t(process, task, 3);
    t.join();

    // 需要传引用时用 ref()
    thread t2(process, ref(task), 3);
    t2.join();
}
```

::: warning 警告
`thread` 对象销毁前必须 `join()` 或 `detach()`，否则 `std::terminate()` 会终止程序。
:::

## std::async / std::future / std::promise

### async 异步执行

```cpp
#include <future>
#include <iostream>
using namespace std;

int compute() {
    // 模拟耗时计算
    int sum = 0;
    for (int i = 0; i < 1000000; ++i) sum += i;
    return sum;
}

int main() {
    future<int> result = async(launch::async, compute);
    // 主线程可以做其他事

    int value = result.get(); // 阻塞等待结果
    cout << "结果: " << value << endl;
}
```

`async` 返回 `future`，调用 `get()` 获取结果（只能调用一次）。

### promise 传递值

```cpp
void producer(promise<int> prom) {
    // 计算完成后设置值
    prom.set_value(42);
}

int main() {
    promise<int> prom;
    future<int> fut = prom.get_future();

    thread t(producer, move(prom));

    cout << "收到: " << fut.get() << endl; // 42
    t.join();
}
```

`promise` 写入值，`future` 读取值，二者通过共享状态通信。

## 原子操作 std::atomic

`atomic` 提供无锁的线程安全操作。

```cpp
#include <atomic>
#include <thread>
#include <iostream>
using namespace std;

atomic<int> counter{0};

void increment() {
    for (int i = 0; i < 100000; ++i) {
        counter.fetch_add(1, memory_order_relaxed);
    }
}

int main() {
    thread t1(increment);
    thread t2(increment);
    t1.join();
    t2.join();
    cout << counter << endl; // 200000
}
```

### atomic 常用操作

```cpp
atomic<int> x{0};

x.store(10);            // 原子写
int val = x.load();     // 原子读
x.exchange(20);         // 原子交换，返回旧值
x.compare_exchange_strong(expected, desired); // CAS

x.fetch_add(1);         // 原子加
x.fetch_sub(1);         // 原子减
++x;                    // 原子自增
```

## 内存顺序 memory_order

内存顺序控制原子操作的同步和排序约束。

```cpp
atomic<bool> ready{false};
int data = 0;

void producer() {
    data = 42;
    ready.store(true, memory_order_release); // release: 之前的写入对 acquire 可见
}

void consumer() {
    while (!ready.load(memory_order_acquire)) {} // acquire: 看到 release 之前的写入
    cout << data << endl; // 保证输出 42
}
```

| memory_order | 含义 |
| --- | --- |
| `relaxed` | 只保证原子性，不保证顺序 |
| `acquire` | 当前及之后的读写不会重排到此操作之前 |
| `release` | 当前及之前的读写不会重排到此操作之后 |
| `acq_rel` | 同时具有 acquire 和 release 语义 |
| `seq_cst` | 默认值，全序一致 |

::: tip 提示
大多数场景用默认的 `seq_cst` 就够了。只在追求极致性能时才考虑 `relaxed` / `acquire` / `release`，而且必须仔细推敲 happens-before 关系。
:::

## 线程池实现思路

```cpp
#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <functional>

class ThreadPool {
public:
    ThreadPool(int numThreads) {
        for (int i = 0; i < numThreads; ++i) {
            workers.emplace_back([this] {
                while (true) {
                    function<void()> task;
                    {
                        unique_lock<mutex> lock(mtx);
                        cv.wait(lock, [this] { return !tasks.empty(); });
                        task = move(tasks.front());
                        tasks.pop();
                    }
                    task();
                }
            });
        }
    }

    void submit(function<void()> task) {
        {
            lock_guard<mutex> lock(mtx);
            tasks.push(move(task));
        }
        cv.notify_one();
    }

    ~ThreadPool() {
        // 实际需要优雅关闭逻辑
    }

private:
    vector<thread> workers;
    queue<function<void()> > tasks;
    mutex mtx;
    condition_variable cv;
};
```

## 并行算法（C++17）

C++17 为部分 STL 算法添加了并行执行策略。

```cpp
#include <algorithm>
#include <execution>
#include <vector>

vector<int> data(1000000);
iota(data.begin(), data.end(), 0);

// 串行
sort(data.begin(), data.end());

// 并行
sort(execution::par, data.begin(), data.end());

// 并行 + 向量化
sort(execution::par_unseq, data.begin(), data.end());
```

::: tip 提示
并行算法需要编译器和标准库支持。MSVC 和 GCC 10+ 均支持，但需要链接 TBB（GCC）或启用相应选项。
:::
