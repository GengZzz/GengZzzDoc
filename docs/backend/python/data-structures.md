# 内置数据结构

Python 内置数据结构的设计非常精巧。理解它们的底层实现（list 是动态数组、dict 是哈希表）有助于写出高效代码，避免常见的性能陷阱。

## list — 动态数组

Python 的 list 底层是 C 实现的动态数组。当容量不足时，按一定比例（约 1.125 倍）分配更大的内存并复制元素。

```python
# list 的常见操作及其时间复杂度
fruits = ["apple", "banana", "cherry"]

# O(1) — 尾部操作
fruits.append("date")
fruits.pop()

# O(n) — 中间插入/删除
fruits.insert(1, "blueberry")  # 索引 1 处插入
fruits.pop(1)                   # 删除索引 1 的元素

# O(1) — 随机访问
print(fruits[0])  # "apple"

# O(n) — 查找
print("banana" in fruits)  # 需要遍历
```

```python
# 切片创建新列表
original = [1, 2, 3, 4, 5]
sliced = original[1:4]    # [2, 3, 4] — 新列表
sliced[0] = 99
print(original)            # [1, 2, 3, 4, 5] — 不受影响

# 浅拷贝 vs 深拷贝
import copy
nested = [[1, 2], [3, 4]]
shallow = nested[:]          # 浅拷贝：外层新列表，内层还是引用
deep = copy.deepcopy(nested) # 深拷贝：完全独立

shallow[0].append(99)
print(nested)   # [[1, 2, 99], [3, 4]] — 原列表也被影响！
print(deep)     # [[1, 2], [3, 4]] — 独立副本
```

::: warning 警告
嵌套可变对象的浅拷贝（切片、`copy.copy()`、`list()`）只复制最外层。内层对象仍然是共享引用。需要完全独立时使用 `copy.deepcopy()`。
:::

## tuple — 不可变序列

tuple 的不可变性意味着创建后不能修改。CPython 对 tuple 做了缓存优化，小 tuple 会被复用。

```python
# tuple 不可变
point = (3, 4)
# point[0] = 5  # TypeError!

# 元组解包
x, y = point
print(x, y)  # 3 4

# 交换变量（元组解包的语法糖）
a, b = 1, 2
a, b = b, a  # 交换

# * 收集剩余元素
first, *rest = [1, 2, 3, 4, 5]
print(first)  # 1
print(rest)   # [2, 3, 4, 5]
```

```python
# tuple 作为字典键（不可变 + 可哈希）
locations = {
    (40.7128, -74.0060): "New York",
    (51.5074, -0.1278): "London",
}
```

## dict — 哈希表

Python 3.6+ 的 dict 采用紧凑型哈希表实现（结合数组和哈希表），保持插入顺序，内存占用更低。

```python
# 基本操作
user = {"name": "Alice", "age": 25}
print(user["name"])              # "Alice"
print(user.get("email", "N/A"))  # "N/A" — 安全访问

# 常用方法
user.update({"age": 26, "email": "alice@example.com"})
keys = list(user.keys())
values = list(user.values())
items = list(user.items())

# setdefault — 键不存在时设置默认值
counts = {}
for char in "hello":
    counts[char] = counts.get(char, 0) + 1

# 使用 setdefault 简化
counts = {}
for char in "hello":
    counts.setdefault(char, 0)
    counts[char] += 1
```

```python
# defaultdict — 自动创建默认值
from collections import defaultdict

counts = defaultdict(int)  # 默认值为 0
for char in "hello":
    counts[char] += 1
print(dict(counts))  # {'h': 1, 'e': 1, 'l': 2, 'o': 1}

# 分组
groups = defaultdict(list)
users = [("alice", 25), ("bob", 30), ("charlie", 25)]
for name, age in users:
    groups[age].append(name)
print(dict(groups))  # {25: ['alice', 'charlie'], 30: ['bob']}
```

## set 与 frozenset

set 是无序不重复集合，底层也是哈希表。frozenset 是不可变版本，可作为字典键。

```python
# set 操作
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

print(a | b)   # {1, 2, 3, 4, 5, 6}  — 并集
print(a & b)   # {3, 4}              — 交集
print(a - b)   # {1, 2}              — 差集
print(a ^ b)   # {1, 2, 5, 6}        — 对称差集

# frozenset 可哈希
fs = frozenset([1, 2, 3])
d = {fs: "frozen set"}
```

## collections 模块

### deque — 双端队列

`list` 的 `insert(0, x)` 和 `pop(0)` 都是 O(n)。`deque` 两端操作都是 O(1)。

```python
from collections import deque

dq = deque([1, 2, 3], maxlen=5)  # 限制最大长度
dq.appendleft(0)    # 左端添加 O(1)
dq.append(4)        # 右端添加 O(1)
dq.popleft()        # 左端弹出 O(1)
dq.pop()            # 右端弹出 O(1)
print(dq)           # deque([1, 2, 3], maxlen=5)

# 用 deque 实现滑动窗口
def sliding_window(data, size):
    window = deque(maxlen=size)
    for item in data:
        window.append(item)
        if len(window) == size:
            yield list(window)

for win in sliding_window([1, 2, 3, 4, 5], 3):
    print(win)
# [1, 2, 3]
# [2, 3, 4]
# [3, 4, 5]
```

### Counter — 计数器

```python
from collections import Counter

text = "abracadabra"
c = Counter(text)
print(c)  # Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})
print(c.most_common(2))  # [('a', 5), ('b', 2)]

# Counter 支持算术运算
c1 = Counter("aabb")
c2 = Counter("abcc")
print(c1 + c2)  # Counter({'a': 3, 'b': 3, 'c': 2})
```

### OrderedDict — 有序字典

Python 3.7+ 的普通 dict 已经保持插入顺序。`OrderedDict` 在需要相等性判断考虑顺序时仍有用。

```python
from collections import OrderedDict

# dict 的相等不考虑顺序
d1 = {"a": 1, "b": 2}
d2 = {"b": 2, "a": 1}
print(d1 == d2)  # True

# OrderedDict 的相等考虑顺序
od1 = OrderedDict([("a", 1), ("b", 2)])
od2 = OrderedDict([("b", 2), ("a", 1)])
print(od1 == od2)  # False
```
