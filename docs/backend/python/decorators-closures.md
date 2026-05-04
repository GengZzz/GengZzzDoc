# 装饰器与闭包

装饰器是 Python 中最具表现力的语法特性之一。它的本质是高阶函数 + 闭包：接收一个函数，返回一个增强后的函数。理解装饰器必须先理解闭包。

## 装饰器的本质

装饰器 `@decorator` 是语法糖，等价于 `func = decorator(func)`。

```python
def my_decorator(func):
    """最简单的装饰器。"""
    def wrapper(*args, **kwargs):
        print("调用前")
        result = func(*args, **kwargs)
        print("调用后")
        return result
    return wrapper

# 语法糖写法
@my_decorator
def say_hello(name):
    print(f"Hello, {name}")

# 等价于
# say_hello = my_decorator(say_hello)

say_hello("Alice")
# 调用前
# Hello, Alice
# 调用后
```

```python
# 装饰器的闭包本质
def my_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def add(a, b):
    return a + b

# add 现在指向 wrapper 函数
print(add.__name__)    # "wrapper" — 函数元信息丢失了！
print(add.__wrapped__) # AttributeError — 没有 wraps 时不存在
```

## functools.wraps

不使用 `wraps` 的装饰器会丢失被装饰函数的 `__name__`、`__doc__`、`__module__` 等元信息，导致调试困难和 `help()` 失效。

```python
import functools

def my_decorator(func):
    @functools.wraps(func)  # 保留 func 的元信息
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def add(a, b):
    """返回两数之和。"""
    return a + b

print(add.__name__)   # "add" — 正确保留了原函数名
print(add.__doc__)    # "返回两数之和。"
print(add.__wrapped__)  # <function add at 0x...> — 指向原函数
```

::: warning 警告
每个装饰器都应该使用 `@functools.wraps(func)`。不使用 `wraps` 是装饰器最常见的错误，会导致日志、调试和文档工具全部失灵。
:::

## 带参数的装饰器

带参数的装饰器是三层嵌套：外层接收参数，中层接收函数，内层执行逻辑。

```python
import functools
import time

def retry(max_attempts=3, delay=1):
    """带参数的装饰器：自动重试。"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    print(f"第 {attempt} 次失败: {e}, {delay}s 后重试")
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=3, delay=2)
def fetch_data(url):
    """从远程获取数据。"""
    import random
    if random.random() < 0.7:
        raise ConnectionError("连接失败")
    return {"status": "ok"}
```

展开后的等价代码：

```python
# @retry(max_attempts=3, delay=2)
# def fetch_data(url): ...
#
# 等价于：
# fetch_data = retry(max_attempts=3, delay=2)(fetch_data)
# retry(...) 返回 decorator，然后 decorator(fetch_data) 返回 wrapper
```

## 类装饰器

类也可以作为装饰器，通过实现 `__call__` 方法。

```python
import functools

class CountCalls:
    """统计函数调用次数的装饰器类。"""

    def __init__(self, func):
        functools.update_wrapper(self, func)  # 类装饰器使用 update_wrapper
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"{self.func.__name__} 被调用了 {self.count} 次")
        return self.func(*args, **kwargs)

@CountCalls
def say_hello():
    print("Hello!")

say_hello()  # "say_hello 被调用了 1 次" / "Hello!"
say_hello()  # "say_hello 被调用了 2 次" / "Hello!"
print(say_hello.count)  # 2
```

## 装饰器执行顺序

多个装饰器从下往上应用（最近的装饰器最先执行），从内往外执行（最外层装饰器的 wrapper 最先运行）。

```python
import functools

def bold(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<b>{func(*args, **kwargs)}</b>"
    return wrapper

def italic(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<i>{func(*args, **kwargs)}</i>"
    return wrapper

@bold          # 第二步应用
@italic        # 第一步应用
def greet(name):
    return f"Hello, {name}"

# 等价于: greet = bold(italic(greet))
# 执行时: bold的wrapper → italic的wrapper → 原始greet

print(greet("Alice"))
# <b><i>Hello, Alice</i></b>
```

## 常用标准库装饰器

```python
from functools import wraps, lru_cache, singledispatch, total_ordering

# lru_cache — 缓存函数结果
@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # 瞬间返回
print(fibonacci.cache_info())  # 命中/未命中统计

# singledispatch — 单分派泛函数
@singledispatch
def process(data):
    print(f"通用处理: {data}")

@process.register
def _(data: list):
    print(f"处理列表: {len(data)} 个元素")

@process.register
def _(data: dict):
    print(f"处理字典: {len(data)} 个键")

process([1, 2, 3])    # "处理列表: 3 个元素"
process({"a": 1})     # "处理字典: 1 个键"
process("hello")      # "通用处理: hello"
```
