# 错误处理

Python 的异常处理机制采用 EAFP（Easier to Ask Forgiveness than Permission）哲学——先尝试操作，出错再处理，而非先检查条件（LBYL）。

## 异常层次结构

所有异常都继承自 `BaseException`。常规异常继承自 `Exception`，系统退出类异常（`SystemExit`、`KeyboardInterrupt`）直接继承 `BaseException`。

```
BaseException
├── SystemExit
├── KeyboardInterrupt
├── GeneratorExit
└── Exception
    ├── ValueError
    ├── TypeError
    ├── KeyError
    ├── IndexError
    ├── AttributeError
    ├── IOError / OSError
    │   └── FileNotFoundError
    ├── RuntimeError
    │   └── RecursionError
    ├── StopIteration
    └── ...
```

## try/except/else/finally

```python
def safe_divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("除数不能为零")
        return None
    except TypeError as e:
        print(f"类型错误: {e}")
        return None
    else:
        # 没有异常时执行——把"成功"逻辑放在这里
        print(f"计算成功: {result}")
        return result
    finally:
        # 无论是否异常都执行——用于资源清理
        print("计算结束")

safe_divide(10, 3)   # 计算成功: 3.33... / 计算结束
safe_divide(10, 0)   # 除数不能为零 / 计算结束
```

```python
# 捕获多个异常
try:
    value = int(input("输入数字: "))
except (ValueError, TypeError):
    print("输入无效")
```

::: tip 提示
尽量捕获具体的异常类型，而非宽泛的 `Exception`。捕获 `Exception` 会吞掉你没有预料到的错误，导致极难调试的问题。
:::

## 自定义异常

```python
class AppError(Exception):
    """应用基础异常。"""
    def __init__(self, message, code=None):
        super().__init__(message)
        self.message = message
        self.code = code

class ValidationError(AppError):
    """数据校验异常。"""
    def __init__(self, field, message):
        super().__init__(f"字段 '{field}' 校验失败: {message}")
        self.field = field

class NotFoundError(AppError):
    """资源不存在异常。"""
    def __init__(self, resource, resource_id):
        super().__init__(f"{resource} (id={resource_id}) 不存在")
        self.resource = resource
        self.resource_id = resource_id

# 使用
def get_user(user_id):
    if user_id <= 0:
        raise ValidationError("user_id", "必须为正整数")
    if user_id == 999:
        raise NotFoundError("User", user_id)
    return {"id": user_id, "name": "Alice"}

try:
    get_user(999)
except NotFoundError as e:
    print(e)  # "User (id=999) 不存在"
    print(e.resource)  # "User"
```

## 异常链（raise from）

`raise ... from ...` 将低层异常链接到高层异常，保留完整的异常追踪链。

```python
class DataLoadError(Exception):
    pass

def load_config(path):
    try:
        with open(path) as f:
            import json
            return json.load(f)
    except FileNotFoundError as e:
        raise DataLoadError(f"配置文件不存在: {path}") from e
    except json.JSONDecodeError as e:
        raise DataLoadError(f"配置文件格式错误: {path}") from e

try:
    load_config("/missing/config.json")
except DataLoadError as e:
    print(e)                    # "配置文件不存在: /missing/config.json"
    print(e.__cause__)          # 原始异常 FileNotFoundError
    print(e.__cause__.__class__.__name__)  # "FileNotFoundError"
```

```python
# 抑制异常链
try:
    some_operation()
except SomeError:
    raise DifferentError("替代错误") from None  # 不保留原始异常链
```

## 上下文管理器与资源清理

上下文管理器是资源管理的首选模式，确保资源在使用后被正确释放。

```python
# with 语句自动调用 __enter__ 和 __exit__
with open("data.txt", "r") as f:
    content = f.read()
# 文件自动关闭，即使读取过程中发生异常

# 多个上下文管理器
with open("input.txt") as src, open("output.txt", "w") as dst:
    dst.write(src.read())
```

```python
# contextlib.suppress — 忽略特定异常
from contextlib import suppress

with suppress(FileNotFoundError):
    import os
    os.remove("temp.txt")
# 文件不存在时不报错，等价于 try/except FileNotFoundError: pass

# contextlib.ExitStack — 动态管理多个上下文
from contextlib import ExitStack

def process_files(paths):
    with ExitStack() as stack:
        files = [stack.enter_context(open(p)) for p in paths]
        for f in files:
            print(f.read())
# 所有文件在退出时关闭，即使中途出错
```

::: tip 提示
资源清理的优先级：上下文管理器（`with`） > try/finally > `__del__`。上下文管理器是最 Pythonic 的方式，保证异常安全。
:::
