# 数据类型

Python 内置数据类型的设计反映了"一切皆对象"的哲学。每种类型背后都有 CPython C 层面的实现细节，理解这些细节有助于写出更高效的代码。

## 整数（int）

Python 的整数是任意精度的，理论上没有溢出问题。CPython 内部使用一个可变长度的数组来存储大整数的每一位（30 位或 15 位，取决于平台）。

```python
# 小整数缓存：CPython 缓存了 -5 到 256 的整数对象
a = 256
b = 256
print(a is b)  # True — 命中缓存

a = 257
b = 257
print(a is b)  # False（在交互式环境中可能为 True，取决于实现）
```

```python
# 大整数自动支持，不会有溢出
huge = 2 ** 1000
print(huge)  # 完整输出，不会报错
print(huge.bit_length())  # 1001 位
```

```python
# 进制表示
print(0b1010)   # 10  — 二进制
print(0o17)     # 15  — 八进制
print(0xFF)     # 255 — 十六进制
```

## 浮点数（float）

Python 浮点数遵循 IEEE 754 双精度标准（64 位），有 53 位有效数字。这是许多精度问题的根源。

```python
# 经典的浮点精度问题
print(0.1 + 0.2)          # 0.30000000000000004
print(0.1 + 0.2 == 0.3)   # False

# 使用 decimal 模块处理精确计算
from decimal import Decimal

a = Decimal("0.1")
b = Decimal("0.2")
print(a + b == Decimal("0.3"))  # True

# 注意：必须传入字符串，传入 float 仍然会有精度问题
print(Decimal(0.1))  # Decimal('0.1000000000000000055511151231...')
```

::: warning 警告
金融计算务必使用 `Decimal`，绝不要用 `float`。`float` 的 0.1 实际上存储的是 `0.1000000000000000055511151231257827021181583404541015625`。
:::

## 复数（complex）

```python
z = 3 + 4j
print(z.real)     # 3.0
print(z.imag)     # 4.0
print(abs(z))     # 5.0 — 模长
```

## 字符串（str）

Python 3 的字符串是 Unicode 字符序列，内部使用灵活的编码方案存储：

- ASCII 字符串用 1 字节/字符
- Latin 字符串用 2 字节/字符
- 其他用 4 字节/字符

```python
# 字符串是不可变的
s = "hello"
# s[0] = "H"  # TypeError!

# 必须创建新字符串
s = "H" + s[1:]  # "Hello"

# 常用操作
print(len("你好世界"))    # 4 — 字符数，不是字节数
print("hello".upper())    # "HELLO"
print("  hello  ".strip())  # "hello"
print("-".join(["a", "b", "c"]))  # "a-b-c"
```

### f-string 格式化

```python
name = "Alice"
age = 25
print(f"{name} is {age} years old")

# 格式化数字
pi = 3.14159265359
print(f"{pi:.2f}")    # "3.14"
print(f"{1000000:,}")  # "1,000,000"

# 表达式
items = [1, 2, 3]
print(f"Total: {sum(items)}")  # "Total: 6"
```

### 字符串驻留（interning）

CPython 会对某些字符串进行驻留（缓存复用），以节省内存：

```python
a = "hello"
b = "hello"
print(a is b)  # True — 短字符串被驻留

a = "hello world!"
b = "hello world!"
print(a is b)  # False — 包含空格和标点的字符串不被驻留（实现相关）
```

## bytes 与 bytearray

`bytes` 是不可变的字节序列，`bytearray` 是可变版本。它们处理的是原始字节，而非 Unicode 字符。

```python
# 创建
data = b"hello"              # 字节字面量
data = bytes([72, 101, 108, 108, 111])  # 从整数列表
data = "你好".encode("utf-8")  # 从字符串编码

# 编解码
print(data)                  # b'\xe4\xbd\xa0\xe5\xa5\xbd'
print(data.decode("utf-8"))  # "你好"

# bytearray 是可变的
buf = bytearray(b"hello")
buf[0] = ord("H")
print(buf)  # bytearray(b'Hello')
```

::: tip 提示
区分 `str` 和 `bytes`：`str` 是文本（Unicode 字符），`bytes` 是二进制数据。Python 3 强制区分这两者，避免了 Python 2 中常见的编码混乱问题。
:::

## 布尔值与真值测试

`bool` 是 `int` 的子类，`True == 1`，`False == 0`。

```python
# 以下值在布尔上下文中为 False
print(bool(0))         # False — 数值零
print(bool(""))        # False — 空字符串
print(bool([]))        # False — 空列表
print(bool({}))        # False — 空字典
print(bool(None))      # False — None
print(bool(set()))     # False — 空集合

# 其他一切为 True
print(bool([0]))       # True — 非空列表（即使元素是 0）
print(bool("False"))   # True — 非空字符串
```

## 类型转换

```python
# 显式转换
int("42")         # 42
int("42", base=16)  # 66 — 十六进制转整数
float("3.14")     # 3.14
str(42)           # "42"
list("abc")       # ['a', 'b', 'c']
tuple([1, 2, 3])  # (1, 2, 3)
dict([("a", 1), ("b", 2)])  # {'a': 1, 'b': 2}

# 类型检查
x = 42
print(type(x))           # <class 'int'>
print(isinstance(x, int))  # True
print(isinstance(x, (int, float)))  # True — 检查多个类型
```

::: tip 提示
优先使用 `isinstance()` 而非 `type()` 进行类型检查。`isinstance()` 会考虑继承关系，支持子类判断。
:::
