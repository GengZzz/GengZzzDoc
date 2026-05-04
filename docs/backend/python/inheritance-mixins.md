# 继承与 Mixin

Python 的继承系统支持多重继承，通过 MRO（Method Resolution Order，C3 线性化算法）解决菱形继承问题。super() 调用遵循 MRO 链，而非简单的父类列表。

## 单继承

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError("子类必须实现 speak")

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says Meow!"

dog = Dog("Rex")
print(dog.speak())  # "Rex says Woof!"

# isinstance 检查
print(isinstance(dog, Animal))  # True
print(isinstance(dog, Dog))     # True
```

## 多重继承与 MRO

Python 使用 C3 线性化算法确定 MRO，保证：
- 子类优先于父类
- 多个父类按声明顺序排列
- 每个类在 MRO 中只出现一次

```python
class A:
    def method(self):
        print("A")

class B(A):
    def method(self):
        print("B")

class C(A):
    def method(self):
        print("C")

class D(B, C):
    pass

# 查看 MRO
print(D.__mro__)
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)

d = D()
d.method()  # "B" — 按 MRO 顺序，B 在 C 前面
```

```python
# super() 遵循 MRO 链
class A:
    def __init__(self):
        print("A.__init__")

class B(A):
    def __init__(self):
        super().__init__()
        print("B.__init__")

class C(A):
    def __init__(self):
        super().__init__()
        print("C.__init__")

class D(B, C):
    def __init__(self):
        super().__init__()
        print("D.__init__")

D()
# D.__init__
# B.__init__
# C.__init__
# A.__init__
# super() 跳到 MRO 中的下一个类，而非简单的"父类"
```

::: tip 提示
`super()` 不是"调用父类"，而是"调用 MRO 链中的下一个类"。在多继承中，这个区别至关重要。菱形继承图中，`super()` 确保每个类的 `__init__` 只被调用一次。
:::

## Mixin 模式

Mixin 是只提供额外方法、不定义自己的状态（通常没有 `__init__`）的类。它用于给类"混入"功能，而非建立"is-a"关系。

```python
class JsonMixin:
    """将对象转为 JSON 的混入类。"""
    import json

    def to_json(self):
        return json.dumps(self.__dict__, default=str, ensure_ascii=False)

class DictMixin:
    """将对象转为字典的混入类。"""
    def to_dict(self):
        return self.__dict__.copy()

class LoggableMixin:
    """添加日志功能的混入类。"""
    def log(self, message):
        print(f"[{self.__class__.__name__}] {message}")

# 组合使用
class User(DictMixin, JsonMixin, LoggableMixin):
    def __init__(self, name, email):
        self.name = name
        self.email = email

user = User("Alice", "alice@example.com")
print(user.to_dict())  # {'name': 'Alice', 'email': 'alice@example.com'}
print(user.to_json())  # {"name": "Alice", "email": "alice@example.com"}
user.log("登录成功")   # [User] 登录成功
```

::: warning 警告
Mixin 命名惯例以 `Mixin` 结尾。Mixin 不应有 `__init__` 方法或自己的状态——它只提供行为。有状态的多重继承容易导致 MRO 混乱。
:::

## ABC 抽象基类

`abc.ABC` 用于定义接口契约，强制子类实现特定方法。未实现抽象方法的子类无法实例化。

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        """计算面积。"""
        ...

    @abstractmethod
    def perimeter(self) -> float:
        """计算周长。"""
        ...

    def describe(self):
        """具体方法：子类直接继承。"""
        return f"面积={self.area():.2f}, 周长={self.perimeter():.2f}"

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return 3.14159 * self.radius ** 2

    def perimeter(self):
        return 2 * 3.14159 * self.radius

# s = Shape()  # TypeError: 无法实例化抽象类
r = Rectangle(3, 4)
print(r.describe())  # "面积=12.00, 周长=14.00"
```

```python
# 虚拟子类：不继承但注册为子类
from collections.abc import Sequence

class MyList:
    def __getitem__(self, index):
        ...
    def __len__(self):
        ...

# 注册后 isinstance 检查通过，但不继承任何方法
Sequence.register(MyList)
print(isinstance(MyList(), Sequence))  # True
```

`collections.abc` 提供了常用抽象基类：`Iterable`、`Iterator`、`Sequence`、`Mapping`、`Callable` 等。使用 `isinstance(obj, abc.XYZ)` 检查对象是否支持某种协议。
