# 控制流程

Python 的控制流语句与其他语言类似，但在语法细节上有自己的特色：缩进替代花括号、for-else、match-case 等。

## 条件语句

```python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 60:
    grade = "C"
else:
    grade = "D"

print(grade)  # "B"
```

三元表达式：

```python
age = 20
status = "adult" if age >= 18 else "minor"
```

### match-case（Python 3.10+）

`match-case` 不只是简单的值匹配，还支持解构和模式守卫。

```python
def handle_command(command: str) -> str:
    match command.split():
        case ["quit"]:
            return "退出程序"
        case ["hello", name]:
            return f"你好，{name}！"
        case ["add", *numbers]:
            total = sum(int(n) for n in numbers)
            return f"总和：{total}"
        case _:
            return "未知命令"

print(handle_command("hello Alice"))  # "你好，Alice！"
print(handle_command("add 1 2 3"))    # "总和：6"
```

```python
# 模式守卫
match point:
    case (x, y) if x == y:
        print("在对角线上")
    case (x, y):
        print(f"坐标：({x}, {y})")
```

## 循环

### for 循环

Python 的 `for` 实际上是"遍历"，遍历任何可迭代对象。

```python
# 遍历列表
for item in [1, 2, 3]:
    print(item)

# 遍历字典
d = {"a": 1, "b": 2}
for key in d:                  # 遍历键
    print(key)
for key, value in d.items():   # 遍历键值对
    print(f"{key} = {value}")

# range
for i in range(5):       # 0, 1, 2, 3, 4
    print(i)
for i in range(2, 10, 2):  # 2, 4, 6, 8
    print(i)
```

```python
# enumerate 获取索引
fruits = ["apple", "banana", "cherry"]
for index, fruit in enumerate(fruits):
    print(f"{index}: {fruit}")

# 从 1 开始编号
for index, fruit in enumerate(fruits, start=1):
    print(f"{index}: {fruit}")
```

### while 循环

```python
# 基本用法
count = 0
while count < 5:
    print(count)
    count += 1
```

### for-else

`else` 子句在循环正常结束（未被 `break` 中断）时执行。这个特性常被误解。

```python
def find_item(items, target):
    for item in items:
        if item == target:
            print(f"找到了: {target}")
            break
    else:
        # 循环完整遍历完，没有触发 break
        print(f"未找到: {target}")

find_item([1, 2, 3], 2)  # "找到了: 2"
find_item([1, 2, 3], 5)  # "未找到: 5"
```

### break、continue、pass

```python
# break — 跳出当前循环
for i in range(10):
    if i == 5:
        break
    print(i)  # 0, 1, 2, 3, 4

# continue — 跳过本次迭代
for i in range(5):
    if i == 2:
        continue
    print(i)  # 0, 1, 3, 4

# pass — 空语句，占位用
def not_implemented_yet():
    pass  # TODO: 后续实现
```

## 列表推导式

列表推导式是 Python 最强大的语法糖之一，将 map + filter 压缩为一行表达式。

```python
# 基本形式：[expression for item in iterable if condition]
squares = [x ** 2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# 带条件过滤
evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# 嵌套推导式
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [x for row in matrix for x in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

```python
# 字典推导式
squares_dict = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

# 集合推导式
unique_lengths = {len(word) for word in ["hello", "world", "hi", "go"]}
# {2, 5}
```

::: warning 警告
推导式虽然简洁，但过度嵌套会严重影响可读性。如果推导式超过两层嵌套或一行超过 80 字符，建议改用普通循环。
:::

## 海象运算符 :=（Python 3.8+）

海象运算符（walrus operator）允许在表达式内部赋值，减少重复计算和代码冗余。

```python
# 在条件中使用，避免重复调用
data = input("请输入: ")
while data != "quit":
    print(f"收到: {data}")
    data = input("请输入: ")

# 使用海象运算符简化
while (data := input("请输入: ")) != "quit":
    print(f"收到: {data}")
```

```python
# 在列表推导式中使用
raw_data = [1, 5, 12, 3, 18, 7]
processed = [y for x in raw_data if (y := x * 2) > 10]
# [24, 36, 14] — 只处理大于 5 的元素（乘以 2 后大于 10）
```

```python
# 在正则匹配中使用
import re

text = "联系电话: 13800138000"
if match := re.search(r'\d{11}', text):
    print(f"找到手机号: {match.group()}")
```
