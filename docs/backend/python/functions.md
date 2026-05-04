# 函数

Python 函数是一等公民（first-class citizen），可以作为参数传递、作为返回值返回、存储在数据结构中。理解函数的底层机制是掌握装饰器、闭包和高阶函数的前提。

## 函数定义

```python
def add(a: int, b: int) -> int:
    """返回两数之和。"""
    return a + b

# 函数是对象
print(type(add))        # <class 'function'>
print(add.__name__)     # "add"
print(add.__doc__)      # "返回两数之和。"
```

## 默认参数陷阱

默认参数在函数定义时求值一次，而非每次调用时。对于不可变类型（int、str、None）这不是问题，但对于可变类型（list、dict）会导致意外行为。

```python
# 错误示范：可变默认值
def append_item(item, target=[]):
    target.append(item)
    return target

print(append_item(1))  # [1]
print(append_item(2))  # [1, 2] — 不是 [2]！所有调用共享同一个列表
print(append_item(3))  # [1, 2, 3]
```

```python
# 正确写法：用 None 作为哨兵值
def append_item(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target

print(append_item(1))  # [1]
print(append_item(2))  # [2] — 每次调用创建新列表
```

::: warning 警告
默认参数的可变陷阱是 Python 最常见的 bug 来源之一。记住：默认值在 `def` 语句执行时求值一次，所有调用共享同一个默认对象。
:::

## *args 与 **kwargs

`*args` 收集多余的位置参数为元组，`**kwargs` 收集多余的关键字参数为字典。

```python
def log(level, *args, **kwargs):
    message = " ".join(str(arg) for arg in args)
    print(f"[{level}] {message}")
    if kwargs:
        print(f"  额外信息: {kwargs}")

log("INFO", "用户", "登录", user_id=123)
# [INFO] 用户 登录
#   额外信息: {'user_id': 123}
```

```python
# 参数顺序：位置参数 > *args > 关键字参数 > **kwargs
def func(a, b, *args, key=None, **kwargs):
    pass
```

### 解包运算符

```python
# 调用时解包
def add(a, b, c):
    return a + b + c

nums = [1, 2, 3]
print(add(*nums))  # 6

config = {"host": "localhost", "port": 8080}
print(f"{config['host']}:{config['port']}")

# 字典解包
def connect(host, port, timeout=30):
    print(f"连接 {host}:{port} (超时 {timeout}s)")

connect(**config)  # 连接 localhost:8080 (超时 30s)
```

## 作用域规则（LEGB）

Python 按 LEGB 顺序查找变量名：

1. **L**ocal — 函数内部的局部变量
2. **E**nclosing — 外层嵌套函数的变量
3. **G**lobal — 模块级别的全局变量
4. **B**uilt-in — 内置名称（`len`、`print` 等）

```python
x = "global"

def outer():
    x = "enclosing"

    def inner():
        x = "local"
        print(x)  # "local"

    inner()

outer()

# 使用 nonlocal 修改外层变量
def counter():
    count = 0

    def increment():
        nonlocal count  # 声明使用外层变量
        count += 1
        return count

    return increment

c = counter()
print(c())  # 1
print(c())  # 2
print(c())  # 3
```

```python
# global 声明修改全局变量
counter_global = 0

def increment_global():
    global counter_global
    counter_global += 1

increment_global()
print(counter_global)  # 1
```

::: tip 提示
尽量避免使用 `global`。全局可变状态是并发 bug 和难以调试问题的根源。优先使用函数参数和返回值传递数据。
:::

## 闭包

闭包是一个函数，它记住了创建时的环境变量，即使外层函数已经返回。

```python
def make_multiplier(factor):
    def multiply(x):
        return x * factor  # factor 来自外层函数的环境
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(5))   # 10
print(triple(5))   # 15

# 闭包保存了 factor 的引用
print(double.__closure__)           # 不为 None
print(double.__closure__[0].cell_contents)  # 2
```

闭包的本质：函数对象持有一个 `__closure__` 属性，其中保存了对外层变量的引用（cell 对象）。

## 递归

```python
# 阶乘
def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
```

Python 默认递归深度限制为 1000 层，可以通过 `sys.setrecursionlimit()` 调整，但不建议。

```python
import sys
print(sys.getrecursionlimit())  # 1000

# 深度递归改用迭代
def factorial_iter(n: int) -> int:
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
```

::: warning 警告
Python 没有尾递归优化。递归过深会抛出 `RecursionError`。对于可能深度很大的递归，改用迭代或显式栈。
:::
