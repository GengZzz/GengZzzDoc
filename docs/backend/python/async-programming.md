# 异步编程

Python 的异步编程基于协程（coroutine）和事件循环（event loop）。与多线程不同，协程在单线程内通过主动让出控制权实现并发，不存在竞态条件，也不受 GIL 限制。

## 协程基础

协程是可以通过 `await` 暂停和恢复的函数。`async def` 定义协程函数，调用它返回协程对象（不会立即执行）。

```python
import asyncio

async def hello(name: str) -> str:
    """一个简单的协程。"""
    print(f"开始问候 {name}")
    await asyncio.sleep(1)  # 暂停，让事件循环去执行其他协程
    print(f"结束问候 {name}")
    return f"Hello, {name}"

# 运行协程
async def main():
    result = await hello("Alice")
    print(result)

asyncio.run(main())
```

::: warning 警告
协程对象必须被 `await`，否则不会执行。创建协程对象后忘记 await 是常见错误，Python 会发出 `RuntimeWarning: coroutine was never awaited`。
:::

## asyncio 事件循环

事件循环是异步编程的核心调度器。它维护一个待执行的协程队列，在协程遇到 `await`（IO 等待）时切换到下一个协程。

```python
import asyncio

async def task_a():
    print("A: 开始")
    await asyncio.sleep(2)  # 让出控制权，2 秒后恢复
    print("A: 完成")
    return "A 的结果"

async def task_b():
    print("B: 开始")
    await asyncio.sleep(1)
    print("B: 完成")
    return "B 的结果"

async def main():
    # 并发执行多个协程
    start = asyncio.get_event_loop().time()

    results = await asyncio.gather(task_a(), task_b())

    elapsed = asyncio.get_event_loop().time() - start
    print(f"结果: {results}")    # ['A 的结果', 'B 的结果']
    print(f"耗时: {elapsed:.1f}s")  # ~2.0s（并发），而非 3.0s（顺序）

asyncio.run(main())
```

## Task 与 Future

`Task` 是对协程的包装，让它在事件循环中调度执行。`Future` 是一个占位符，代表尚未完成的计算结果。

```python
import asyncio

async def download(url: str) -> str:
    await asyncio.sleep(1)
    return f"下载完成: {url}"

async def main():
    # create_task 立即开始调度协程
    task1 = asyncio.create_task(download("page1.html"))
    task2 = asyncio.create_task(download("page2.html"))

    # 等待两个任务完成
    r1 = await task1
    r2 = await task2
    print(r1, r2)

    # 超时控制
    try:
        result = await asyncio.wait_for(
            download("slow_page.html"),
            timeout=0.5
        )
    except asyncio.TimeoutError:
        print("下载超时")

    # 等待任意一个完成
    task3 = asyncio.create_task(download("page3.html"))
    done, pending = await asyncio.wait([task3], timeout=0.5)
    if task3 in done:
        print(task3.result())
    else:
        task3.cancel()  # 取消未完成的任务
```

## aiohttp 异步 HTTP

```python
import asyncio
import aiohttp

async def fetch(session, url):
    async with session.get(url) as response:
        return await response.text()

async def main():
    async with aiohttp.ClientSession() as session:
        # 并发请求
        urls = [
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/2",
            "https://httpbin.org/delay/1",
        ]
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        print(f"获取了 {len(results)} 个页面")

asyncio.run(main())
```

## 异步生成器

```python
import asyncio

async def async_range(n):
    """异步生成器：逐个产生值，每次产生前等待。"""
    for i in range(n):
        await asyncio.sleep(0.1)
        yield i

async def main():
    async for num in async_range(5):
        print(num)  # 0, 1, 2, 3, 4（每个间隔 0.1 秒）

asyncio.run(main())
```

## 信号量与速率限制

信号量控制同时运行的协程数量，防止对下游服务造成过大压力。

```python
import asyncio
import aiohttp

async def fetch_with_limit(sem, session, url):
    async with sem:  # 获取信号量
        print(f"开始请求: {url}")
        async with session.get(url) as response:
            data = await response.text()
            print(f"完成请求: {url} ({len(data)} 字节)")
            return data

async def main():
    sem = asyncio.Semaphore(3)  # 最多同时 3 个请求

    async with aiohttp.ClientSession() as session:
        urls = [f"https://httpbin.org/delay/{i % 3}" for i in range(10)]
        tasks = [fetch_with_limit(sem, session, url) for url in urls]
        results = await asyncio.gather(*tasks)

asyncio.run(main())
```

::: tip 提示
异步代码的优势在高并发 IO 场景（Web 服务器、爬虫、数据库连接池）中最为明显。对于 CPU 密集型任务，仍需 `ProcessPoolExecutor` 或 `run_in_executor` 绕过 GIL。
:::

## asyncio 与多线程/多进程配合

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

async def main():
    loop = asyncio.get_running_loop()

    # 在线程池中运行阻塞 IO 函数
    with ThreadPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, blocking_io_func)

    # 在进程池中运行 CPU 密集函数
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_heavy_func)

asyncio.run(main())
```
