# 类与对象

Python 的面向对象系统与 Java/C++ 有本质区别。在 Python 中，类本身也是对象（type 的实例），属性访问是一个可定制的过程，描述符协议是 property、classmethod、staticmethod 的底层实现。

## 类定义

```python
class User:
    """用户类。"""

    # 类属性：所有实例共享
    total_users = 0

    def __init__(self, name: str, age: int):
        # 实例属性：每个实例独有
        self.name = name
        self.age = age
        User.total_users += 1

    # 实例方法：第一个参数是 self
    def greet(self):
        return f"Hi, I'm {self.name}"

    # 类方法：第一个参数是 cls
    @classmethod
    def from_birth_year(cls, name: str, birth_year: int):
        """工厂方法：从出生年份创建实例。"""
        from datetime import date
        age = date.today().year - birth_year
        return cls(name, age)

    # 静态方法：没有 self 或 cls 参数
    @staticmethod
    def is_adult(age: int) -> bool:
        return age >= 18

user = User("Alice", 25)
print(user.greet())               # "Hi, I'm Alice"
print(User.total_users)           # 1

user2 = User.from_birth_year("Bob", 2000)
print(user2.age)                  # 26
print(User.is_adult(user2.age))   # True
```

## 属性访问机制

Python 对 `obj.attr` 的查找过程是一个三层机制：

```python
class MyClass:
    class_var = "class"

    def __init__(self):
        self.instance_var = "instance"

obj = MyClass()

# 1. 数据描述符（实现了 __set__ 的描述符）优先
# 2. 实例字典 obj.__dict__
# 3. 非数据描述符 / 类字典 type(obj).__dict__
# 4. 沿 MRO 向上查找
# 5. 都找不到则调用 __getattr__
```

### `__getattr__` 与 `__getattribute__`

```python
class DynamicObject:
    def __init__(self):
        self._data = {}

    def __getattr__(self, name):
        """仅在正常查找失败时调用。"""
        return self._data.get(name, f"<{name} not set>")

    def __setattr__(self, name, value):
        """每次属性赋值都调用。"""
        if name == "_data":
            super().__setattr__(name, value)  # 避免无限递归
        else:
            self._data[name] = value

obj = DynamicObject()
obj.x = 42           # 存入 _data 字典
print(obj.x)          # 42
print(obj.y)          # "<y not set>"
```

::: warning 警告
在 `__setattr__` 中直接赋值 `self.xxx = value` 会无限递归。必须通过 `super().__setattr__()` 或 `self.__dict__['xxx'] = value` 绕过。
:::

## 描述符协议

描述符是实现了 `__get__`、`__set__` 或 `__delete__` 方法的对象。它是 Python 属性访问的核心机制，`property`、`classmethod`、`staticmethod` 都是描述符。

```python
class Validated:
    """带验证的描述符。"""

    def __set_name__(self, owner, name):
        self.name = name          # 属性名
        self.storage_name = f"_validated_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.storage_name, None)

    def __set__(self, obj, value):
        if not isinstance(value, (int, float)) or value < 0:
            raise ValueError(f"{self.name} 必须是非负数，收到 {value}")
        setattr(obj, self.storage_name, value)

class Product:
    price = Validated()
    quantity = Validated()

    def __init__(self, name, price, quantity):
        self.name = name
        self.price = price       # 触发 Validated.__set__
        self.quantity = quantity

p = Product("Widget", 9.99, 100)
print(p.price)    # 9.99 — 触发 Validated.__get__
# p.price = -1   # ValueError!
```

### property 的本质

`property` 是一个描述符类，`@property` 语法糖的背后是描述符协议。

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("半径不能为负")
        self._radius = value

    @property
    def area(self):
        return 3.14159 * self._radius ** 2

c = Circle(5)
print(c.area)      # 78.53975
c.radius = 10      # 调用 setter
# c.radius = -1    # ValueError!
```

## `__slots__` 内存优化

默认情况下，Python 实例用 `__dict__` 存储属性（哈希表），每个实例约占用 100+ 字节的额外内存。`__slots__` 告诉 Python 只分配固定数量的属性槽。

```python
class PointDict:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class PointSlots:
    __slots__ = ('x', 'y')

    def __init__(self, x, y):
        self.x = x
        self.y = y

# 内存对比
import sys
p1 = PointDict(1, 2)
p2 = PointSlots(1, 2)
print(sys.getsizeof(p1.__dict__))  # 104 (字典)
# p2 没有 __dict__，属性直接存储在固定偏移处

# 创建大量实例时差异显著
points_dict = [PointDict(i, i) for i in range(100000)]
points_slots = [PointSlots(i, i) for i in range(100000)]
```

```python
# __slots__ 的限制
p = PointSlots(1, 2)
# p.z = 3  # AttributeError: 没有 'z' 槽位
```

::: tip 提示
`__slots__` 适合创建大量实例的场景（如百万级点坐标、ORM 模型对象）。缺点是不能动态添加属性、影响多重继承。权衡利弊后使用。
:::
