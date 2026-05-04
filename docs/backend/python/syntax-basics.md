# 语法基础

Python 语法的核心设计哲学是"可读性优先"。缩进替代花括号，关键字尽量使用英文单词，减少视觉噪音。

## 变量与动态类型

Python 变量本质上是对象的引用（标签），而非存储值的容器。一个对象可以被多个变量引用。

```python
# 变量不需要声明类型，赋值即创建
x = 42          # x 引用整数对象 42
y = x           # y 也引用同一个整数对象
print(x is y)   # True — 同一个对象

# 重新赋值 = 创建新的引用关系
x = "hello"     # x 现在引用字符串对象
print(y)        # 42 — y 仍然引用原来的整数对象
```

```python
# id() 查看对象在内存中的地址
a = [1, 2, 3]
b = a
print(id(a) == id(b))  # True — a 和 b 引用同一个列表

b.append(4)
print(a)  # [1, 2, 3, 4] — a 也被修改了，因为 a 和 b 是同一个对象
```

::: warning 警告
将可变对象（list、dict、set）赋值给新变量时，创建的是引用而非副本。需要独立副本时使用 `copy.copy()` 或 `copy.deepcopy()`。
:::

## 运算符

### 算术运算符

```python
print(10 / 3)    # 3.3333... — 除法总是返回 float
print(10 // 3)   # 3         — 整除（向下取整）
print(10 % 3)    # 1         — 取余
print(2 ** 10)   # 1024      — 幂运算
```

::: tip 提示
Python 的整除 `//` 对负数是向下取整：`-7 // 2` 返回 `-4` 而非 `-3`。这是因为 `//` 遵循 `a == (a // b) * b + (a % b)` 的恒等式。
:::

### 比较运算符

```python
# 链式比较
x = 5
print(1 < x < 10)   # True — 等价于 1 < x and x < 10

# is vs ==
a = [1, 2]
b = [1, 2]
print(a == b)   # True  — 值相等
print(a is b)   # False — 不是同一个对象
```

`is` 比较的是对象身份（`id()`），`==` 比较的是值（调用 `__eq__`）。判断 `None` 时应使用 `is None`。

### 逻辑运算符

```python
# and 和 or 返回操作数的值，而非强制转为 bool
print(0 or "hello")    # "hello" — 0 为假，返回第二个操作数
print("a" and "b")     # "b"     — 两个都为真，返回最后一个
print("" or "default") # "default" — 空字符串为假

# not 总是返回 bool
print(not 0)    # True
print(not "")   # True
```

## 缩进规则

Python 使用缩进来标识代码块，取代了其他语言的花括号。标准缩进为 4 个空格。

```python
def check_score(score):
    if score >= 90:
        grade = "A"
    elif score >= 60:
        grade = "B"
    else:
        grade = "C"
    return grade
```

同一个代码块内的语句必须保持相同的缩进层级。混合使用 Tab 和空格会导致 `TabError`。

::: warning 警告
永远不要混用 Tab 和空格。PEP 8 推荐全部使用 4 个空格。在 VS Code 中设置 `"editor.insertSpaces": true` 和 `"editor.tabSize": 4`。
:::

## 注释与文档字符串

```python
# 单行注释以 # 开头

"""
多行字符串通常用作模块、类或函数的文档字符串（docstring）。
这是 Python 内置的文档机制，可通过 help() 或 __doc__ 访问。
"""

def add(a: int, b: int) -> int:
    """返回两个整数的和。

    Args:
        a: 第一个加数
        b: 第二个加数

    Returns:
        两数之和

    Examples:
        >>> add(1, 2)
        3
    """
    return a + b

# help(add) 会打印上面的 docstring
# add.__doc__ 可以程序化访问
```

docstring 有三种主流格式：Google 风格、NumPy 风格和 reStructuredText 风格。选择团队统一的风格即可。

## 编码规范（PEP 8）

PEP 8 是 Python 官方风格指南，核心规则：

| 规则 | 说明 |
|------|------|
| 缩进 | 4 个空格 |
| 行宽 | 79 字符（或 88/120，团队统一） |
| 命名 | 变量/函数用 `snake_case`，类用 `PascalCase`，常量用 `UPPER_SNAKE_CASE` |
| 空行 | 顶级定义之间空两行，方法之间空一行 |
| 导入 | 标准库 > 第三方 > 本地，每组之间空行 |

```python
# 好的命名
MAX_RETRIES = 3
user_name = "Alice"

def calculate_total(items):
    ...

class OrderProcessor:
    ...
```

使用 linter 自动检查：

```bash
# 使用 ruff（推荐，速度快）
pip install ruff
ruff check .
ruff format .
```
