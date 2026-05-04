# 魔术方法

魔术方法（dunder methods）是 Python 数据模型的核心。它们定义了对象在各种运算和操作中的行为，让自定义类能像内置类型一样自然地工作。

## 对象创建与销毁

```python
class Config:
    _instances = {}  # 单例缓存

    def __new__(cls, name, *args, **kwargs):
        """控制对象的创建（分配内存）。"""
        if name not in cls._instances:
            instance = super().__new__(cls)
            cls._instances[name] = instance
        return cls._instances[name]

    def __init__(self, name, **options):
        """控制对象的初始化（设置属性）。"""
        # __init__ 可能被多次调用（单例模式），只初始化一次
        if not hasattr(self, '_initialized'):
            self.name = name
            self.options = options
            self._initialized = True

    def __del__(self):
        """对象被垃圾回收时调用。"""
        print(f"Config '{self.name}' 被回收")

# 单例行为
c1 = Config("db", host="localhost")
c2 = Config("db", host="192.168.1.1")  # 返回同一实例
print(c1 is c2)           # True
print(c1.options)         # {'host': 'localhost'} — 不会被覆盖
```

::: warning 警告
`__del__` 不是析构函数。Python 的垃圾回收是不确定性的——`__del__` 的调用时机不可预测。不要在 `__del__` 中做关键的资源清理，应使用上下文管理器。
:::

## `__new__` vs `__init__`

| | `__new__` | `__init__` |
|---|---|---|
| 作用 | 创建并返回实例 | 初始化已创建的实例 |
| 参数 | 第一个参数是 `cls` | 第一个参数是 `self` |
| 返回值 | 必须返回一个实例 | 不返回（返回 None） |
| 调用顺序 | 先调用 | 后调用（拿到 `__new__` 返回的实例） |
| 使用场景 | 单例、不可变类型子类、元类 | 通用初始化 |

```python
# 不可变类型子类必须用 __new__
class UpperStr(str):
    def __new__(cls, value=""):
        instance = super().__new__(cls, value.upper())
        return instance

s = UpperStr("hello")
print(s)       # "HELLO"
print(type(s)) # <class 'UpperStr'>
```

## 字符串表示

```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        """面向开发者的精确表示，应能用于重建对象。"""
        return f"Vector({self.x!r}, {self.y!r})"

    def __str__(self):
        """面向用户的友好表示。"""
        return f"({self.x}, {self.y})"

    def __format__(self, spec):
        """支持 f-string 格式化。"""
        if spec == "polar":
            import math
            r = math.hypot(self.x, self.y)
            theta = math.atan2(self.y, self.x)
            return f"(r={r:.2f}, θ={theta:.2f})"
        return str(self)

v = Vector(3, 4)
print(repr(v))         # "Vector(3, 4)"
print(str(v))          # "(3, 4)"
print(f"{v:polar}")    # "(r=5.00, θ=0.93)"
```

::: tip 提示
`__repr__` 应该返回能重建对象的表达式。`__str__` 未定义时，`str()` 会回退到 `__repr__`。每个类都应该实现 `__repr__`。
:::

## 比较运算符

```python
from functools import total_ordering

@total_ordering
class Version:
    """语义化版本号。"""

    def __init__(self, major, minor=0, patch=0):
        self.major = major
        self.minor = minor
        self.patch = patch

    def _key(self):
        return (self.major, self.minor, self.patch)

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() == other._key()

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._key() < other._key()

    def __repr__(self):
        return f"Version({self.major}, {self.minor}, {self.patch})"

# @total_ordering 自动从 __eq__ 和 __lt__ 生成 __le__, __gt__, __ge__
v1 = Version(2, 1, 0)
v2 = Version(2, 1, 1)
print(v1 < v2)   # True
print(v1 <= v2)  # True
print(v1 > v2)   # False
print(v1 == v2)  # False
```

## 上下文管理器

上下文管理器实现了 `__enter__` 和 `__exit__`，用于资源的获取和释放。

```python
class Timer:
    import time

    def __enter__(self):
        self.start = self.time.perf_counter()
        return self  # 返回值绑定到 as 变量

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = self.time.perf_counter() - self.start
        print(f"耗时: {self.elapsed:.4f}s")
        # 返回 True 吞掉异常，返回 None 传播异常
        return False

with Timer() as t:
    sum(range(1000000))
# 输出: 耗时: 0.03xx s
```

```python
# 使用 contextlib 简化
from contextlib import contextmanager

@contextmanager
def managed_resource(name):
    print(f"获取资源 {name}")
    try:
        yield name  # yield 之前的代码 = __enter__
    finally:
        print(f"释放资源 {name}")  # yield 之后的代码 = __exit__

with managed_resource("数据库连接") as conn:
    print(f"使用 {conn} 工作")
# 获取资源 数据库连接
# 使用 数据库连接 工作
# 释放资源 数据库连接
```

## `__call__` — 可调用对象

```python
class Counter:
    def __init__(self):
        self.count = 0

    def __call__(self):
        self.count += 1
        return self.count

c = Counter()
print(c())  # 1
print(c())  # 2
print(c())  # 3
print(c.count)  # 3
```

## 元类基础

元类是"类的类"。普通类创建实例，元类创建类。`type` 是所有内置类型的元类。

```python
# 类创建过程
# MyClass = type('MyClass', (Base,), {'attr': value})
# 等价于
class MyClass:
    attr = "value"

print(type(MyClass))  # <class 'type'>
print(type(int))      # <class 'type'>
```

```python
class SingletonMeta(type):
    """单例元类。"""
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Database(metaclass=SingletonMeta):
    def __init__(self):
        self.connection = "connected"

db1 = Database()
db2 = Database()
print(db1 is db2)  # True — 单例
```

::: tip 提示
元类是 Python 中最强大的机制之一，但也是最容易被滥用的。大多数情况下，`__init_subclass__` 钩子和类装饰器足以满足需求，比元类更简单易读。
:::
