# 类型注解

Python 是动态类型语言，但类型注解（PEP 484+）提供了可选的静态类型检查能力。类型注解不影响运行时行为，但可以被 mypy、Pyright 等工具检查，以及被 IDE 用于更好的补全和错误提示。

## 类型注解语法

```python
# 变量注解
name: str = "Alice"
age: int = 25
scores: list[int] = [90, 85, 92]

# 函数注解
def greet(name: str) -> str:
    return f"Hello, {name}"

def process(data: list[str], verbose: bool = False) -> dict[str, int]:
    return {s: len(s) for s in data}

# 类属性注解
class User:
    name: str
    age: int

    def __init__(self, name: str, age: int) -> None:
        self.name = name
        self.age = age
```

## typing 模块

### 基础类型

```python
from typing import List, Dict, Tuple, Set, Optional, Union, Any, Callable, TypeVar

# Python 3.9+ 可以直接用内置类型
numbers: list[int] = [1, 2, 3]           # 旧写法: List[int]
mapping: dict[str, int] = {"a": 1}      # 旧写法: Dict[str, int]
pair: tuple[str, int] = ("a", 1)        # 旧写法: Tuple[str, int]

# Optional = Union[X, None]
def find_user(user_id: int) -> Optional[dict]:  # 可能返回 None
    if user_id == 0:
        return None
    return {"id": user_id, "name": "Alice"}

# Union 多类型
def process(value: Union[int, str]) -> str:
    return str(value)

# Python 3.10+ 管道语法
def process(value: int | str) -> str:
    return str(value)

# Callable[[参数类型], 返回类型]
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# Any — 任意类型（关闭类型检查）
def legacy_code(data: Any) -> Any:
    return data
```

### 泛型 TypeVar

```python
from typing import TypeVar, Generic

T = TypeVar('T')

def first(items: list[T]) -> T:
    """返回列表第一个元素，保持类型。"""
    return items[0]

# 类型检查器知道 first[int]([1, 2]) 返回 int
# first[str](["a", "b"]) 返回 str

# 泛型类
class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

int_stack: Stack[int] = Stack()
int_stack.push(42)
# int_stack.push("hello")  # mypy 报错
```

## Protocol 结构化子类型

Protocol（PEP 544）实现了结构化子类型（鸭子类型的类型注解版本）。只要对象有所需的方法，就满足 Protocol。

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Drawable(Protocol):
    def draw(self) -> str: ...

class Circle:
    def draw(self) -> str:
        return "绘制圆形"

class Square:
    def draw(self) -> str:
        return "绘制方形"

# 不需要继承 Drawable，只要实现了 draw() 方法就满足协议
def render(shape: Drawable) -> None:
    print(shape.draw())

render(Circle())   # OK
render(Square())   # OK
```

::: tip 提示
Protocol 是 Python 中"鸭子类型"的类型安全版本。不需要显式继承接口，只要对象有所需的方法签名就满足类型检查。
:::

## Pydantic 数据验证

Pydantic 是 Python 中最流行的数据验证库，结合类型注解实现运行时验证和序列化。

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: str
    age: int = Field(ge=0, le=150)
    nickname: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("邮箱格式无效")
        return v.lower()

# 自动验证和类型转换
user = UserCreate(name="Alice", email="ALICE@EXAMPLE.COM", age=25)
print(user.name)       # "Alice"
print(user.email)      # "alice@example.com" — 自动转小写
print(user.model_dump())  # {'name': 'Alice', 'email': 'alice@example.com', 'age': 25, 'nickname': None}

# 验证失败抛出异常
try:
    UserCreate(name="", email="invalid", age=-1)
except Exception as e:
    print(e)  # 3 个验证错误
```

```python
# 嵌套模型
class Address(BaseModel):
    city: str
    street: str

class User(BaseModel):
    name: str
    address: Address

user = User(name="Alice", address={"city": "Beijing", "street": "长安街"})
print(user.address.city)  # "Beijing" — 自动从字典构建 Address
```

## mypy 静态检查

mypy 是 Python 的静态类型检查器，在不运行代码的情况下发现类型错误。

```bash
# 安装
pip install mypy

# 检查单个文件
mypy script.py

# 检查整个项目
mypy src/

# 严格模式
mypy --strict src/
```

```python
# mypy 能捕获的错误示例
def add(a: int, b: int) -> int:
    return a + b

result: str = add(1, 2)  # mypy 报错: Incompatible types in assignment
```

```ini
# mypy.ini 配置
[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True

[mypy-tests.*]
ignore_errors = True

[mypy-third_party.*]
ignore_missing_imports = True
```

::: tip 提示
类型注解的价值在项目规模增大时尤为明显。它让 IDE 提供更准确的补全、让重构更安全、让新成员更快理解代码意图。建议从新代码开始逐步添加类型注解。
:::
