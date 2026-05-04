# 多线程与多进程

Python 并发编程的核心挑战是 GIL（Global Interpreter Lock）。理解 GIL 的本质和限制，才能选择正确的并发方案。

## GIL 全局解释器锁

GIL 是 CPython 解释器中的一把互斥锁，它确保同一时刻只有一个线程执行 Python 字节码。这是 CPython 内存管理（引用计数）的简化方案。

**GIL 的本质**：CPython 使用引用计数管理内存。如果多个线程同时修改同一对象的引用计数，会导致计数错误（内存泄漏或提前释放）。GIL 通过保证同一时刻只有一个线程执行字节码，从根本上避免了引用计数的竞态条件。

**GIL 的影响**：

| 任务类型 | 多线程效果 | 原因 |
|---------|-----------|------|
| IO 密集型 | 有效 | IO 等待时释放 GIL，其他线程可执行 |
| CPU 密集型 | 无效甚至更慢 | 只有一个线程执行字节码，线程切换增加开销 |

```python
import threading
import time

# IO 密集型：多线程有效
def io_task(url):
    """模拟网络请求。"""
    time.sleep(1)  # sleep 时释放 GIL
    return f"下载完成: {url}"

# 顺序执行：约 4 秒
start = time.perf_counter()
for url in ["a", "b", "c", "d"]:
    io_task(url)
print(f"顺序: {time.perf_counter() - start:.1f}s")  # ~4.0s

# 并发执行：约 1 秒
start = time.perf_counter()
threads = []
for url in ["a", "b", "c", "d"]:
    t = threading.Thread(target=io_task, args=(url,))
    threads.append(t)
    t.start()
for t in threads:
    t.join()
print(f"并发: {time.perf_counter() - start:.1f}s")  # ~1.0s
```

```python
# CPU 密集型：多线程无效
def cpu_task(n):
    """CPU 密集型计算。"""
    total = 0
    for i in range(n):
        total += i * i
    return total

# 多线程做 CPU 密集型任务不会加速
# 因为同一时刻只有一个线程持有 GIL
```

::: warning 警告
不要用 `threading` 做 CPU 密集型并发。线程竞争 GIL 反而增加开销。CPU 密集型任务应使用 `multiprocessing`（多进程）或 `concurrent.futures.ProcessPoolExecutor`。
:::

## threading 模块

```python
import threading

# 共享状态的安全访问
counter = 0
lock = threading.Lock()

def increment(n):
    global counter
    for _ in range(n):
        with lock:  # 获取锁
            counter += 1

threads = [threading.Thread(target=increment, args=(100000,)) for _ in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(counter)  # 500000 — 没有锁的话结果会小于预期
```

```python
# 线程间通信
from queue import Queue

def producer(q):
    for i in range(5):
        q.put(i)
    q.put(None)  # 哨兵信号

def consumer(q):
    while True:
        item = q.get()
        if item is None:
            break
        print(f"消费: {item}")

q = Queue(maxsize=10)
t1 = threading.Thread(target=producer, args=(q,))
t2 = threading.Thread(target=consumer, args=(q,))
t1.start()
t2.start()
t1.join()
t2.join()
```

## multiprocessing 多进程

每个进程有独立的 Python 解释器和 GIL，因此多进程可以真正利用多核 CPU。

```python
from multiprocessing import Process, Pool
import os

def cpu_task(n):
    """CPU 密集型任务。"""
    return sum(i * i for i in range(n))

# 基本用法
def worker(name):
    print(f"进程 {name}, PID={os.getpid()}")

p = Process(target=worker, args=("A",))
p.start()
p.join()
```

```python
# 进程池
from multiprocessing import Pool

def square(n):
    return n * n

with Pool(processes=4) as pool:
    # map — 并行执行，收集结果
    results = pool.map(square, range(10))
    print(results)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

    # imap — 惰性迭代版本
    for result in pool.imap(square, range(10)):
        print(result)

    # apply_async — 异步提交单个任务
    async_result = pool.apply_async(square, (10,))
    print(async_result.get())  # 100
```

## 进程间通信

```python
from multiprocessing import Process, Queue, Pipe, Value, Array

# Queue — 进程安全的队列
def sender(q):
    q.put("来自子进程的消息")

q = Queue()
p = Process(target=sender, args=(q,))
p.start()
print(q.get())  # "来自子进程的消息"
p.join()

# Pipe — 双向管道
parent_conn, child_conn = Pipe()

def talk(conn):
    conn.send("你好")
    print(conn.recv())

p = Process(target=talk, args=(child_conn,))
p.start()
print(parent_conn.recv())  # "你好"
parent_conn.send("收到")
p.join()

# Value / Array — 共享内存
from multiprocessing import Value, Array

counter = Value('i', 0)        # 共享整数，初始值 0
shared_array = Array('d', [0.0] * 10)  # 共享 double 数组

def increment(val):
    with val.get_lock():
        val.value += 1
```

## concurrent.futures — 高级接口

`concurrent.futures` 提供了统一的线程池和进程池 API，推荐优先使用。

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import time

# 线程池 — IO 密集型
def fetch(url):
    time.sleep(1)
    return f"数据: {url}"

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(fetch, url): url for url in ["a", "b", "c", "d"]}
    for future in as_completed(futures):
        url = futures[future]
        print(future.result())

# 进程池 — CPU 密集型
def compute(n):
    return sum(i * i for i in range(n))

with ProcessPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(compute, [10**6] * 4))
    print(results)
```

::: tip 提示
选择方案的决策树：IO 密集型用 `ThreadPoolExecutor`；CPU 密集型用 `ProcessPoolExecutor`；需要大量协程用 `asyncio`。
:::
