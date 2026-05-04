# 高级数据结构

生成器、迭代器、堆和二分查找是 Python 中处理数据流和有序数据的核心工具。生成器的惰性求值特性使得它能够处理远超内存容量的数据集。

## 迭代器协议

Python 的 `for` 循环背后调用的是迭代器协议：`__iter__()` 返回迭代器对象，`__next__()` 返回下一个元素，耗尽时抛出 `StopIteration`。

```python
# 手动实现迭代器
class CountDown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

for num in CountDown(3):
    print(num)  # 3, 2, 1
```

```python
# 等价的 for 循环展开
nums = [1, 2, 3]
it = iter(nums)        # 调用 __iter__
while True:
    try:
        item = next(it)  # 调用 __next__
    except StopIteration:
        break
    print(item)
```

::: tip 提示
任何实现了 `__iter__` 方法的对象都是**可迭代对象**（iterable）。任何同时实现了 `__iter__` 和 `__next__` 的对象是**迭代器**（iterator）。迭代器本身也是可迭代的——`__iter__` 返回 `self`。
:::

## 生成器（yield）

生成器是一种特殊的迭代器，用 `yield` 关键字定义。每次 `yield` 暂停函数执行并保存局部状态，下次调用 `next()` 时从暂停处继续。

```python
def fib():
    """斐波那契生成器。"""
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# 使用生成器
gen = fib()
print(next(gen))  # 0
print(next(gen))  # 1
print(next(gen))  # 1
print(next(gen))  # 2
print(next(gen))  # 3

# 生成器是惰性的——只有调用 next() 时才执行
# 生成器对象占用极少内存，可以表示无限序列
```

```python
# 生成器的状态机模型
def echo():
    while True:
        received = yield  # yield 可以同时接收值
        print(f"收到: {received}")

gen = echo()
next(gen)           # 启动生成器，执行到 yield 暂停
gen.send("hello")   # 发送值给 yield 表达式，打印 "收到: hello"
gen.send("world")   # 打印 "收到: world"
```

### yield from 委托生成器

`yield from` 将生成器的部分操作委托给子生成器，自动处理值传递和异常传播。

```python
def inner_gen():
    yield 1
    yield 2
    return "inner done"  # 返回值被 yield from 捕获

def outer_gen():
    result = yield from inner_gen()  # 委托给 inner_gen
    print(f"inner 返回: {result}")
    yield 3

for val in outer_gen():
    print(val)
# 1
# 2
# inner 返回: inner done
# 3
```

```python
# yield from 的常见用法：扁平化嵌套可迭代对象
def flatten(nested):
    for item in nested:
        if hasattr(item, '__iter__') and not isinstance(item, (str, bytes)):
            yield from flatten(item)
        else:
            yield item

print(list(flatten([[1, 2], [3, [4, 5]], 6])))
# [1, 2, 3, 4, 5, 6]
```

## 生成器表达式

生成器表达式是列表推导式的惰性版本，用圆括号包裹。它不会一次性创建整个列表，而是逐个产生元素。

```python
# 列表推导式：立即创建整个列表
squares_list = [x**2 for x in range(1000000)]  # 占用大量内存

# 生成器表达式：惰性求值
squares_gen = (x**2 for x in range(1000000))   # 几乎不占内存
print(next(squares_gen))  # 0
print(next(squares_gen))  # 1

# 用 sum() 等函数直接消费生成器表达式
total = sum(x**2 for x in range(10))
print(total)  # 285
```

::: tip 提示
当只需要遍历一次、不需要随机访问、数据量可能很大时，优先使用生成器表达式而非列表推导式。
:::

## itertools 模块

`itertools` 提供了高效的迭代器组合工具。

```python
import itertools

# chain — 链接多个可迭代对象
combined = itertools.chain([1, 2], [3, 4], [5])
print(list(combined))  # [1, 2, 3, 4, 5]

# islice — 迭代器切片
data = range(1000000)
sliced = itertools.islice(data, 5, 10)
print(list(sliced))  # [5, 6, 7, 8, 9]

# groupby — 分组（需先排序）
data = sorted(["apple", "avocado", "banana", "blueberry"])
for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(f"{key}: {list(group)}")
# a: ['apple', 'avocado']
# b: ['banana', 'blueberry']

# product — 笛卡尔积
for combo in itertools.product("AB", "12"):
    print("".join(combo))
# A1, A2, B1, B2

# combinations / permutations
print(list(itertools.combinations([1, 2, 3], 2)))
# [(1, 2), (1, 3), (2, 3)]
print(list(itertools.permutations([1, 2, 3], 2)))
# [(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]

# cycle — 无限循环
colors = itertools.cycle(["red", "green", "blue"])
for _, color in zip(range(5), colors):
    print(color)
# red, green, blue, red, green
```

## 堆（heapq）

`heapq` 模块实现最小堆，可以高效找到最小元素。对于最大堆，取负值存入。

```python
import heapq

# 基本堆操作
nums = [3, 1, 4, 1, 5, 9, 2, 6]
heapq.heapify(nums)  # 原地转换为堆
print(nums)  # [1, 1, 2, 3, 5, 9, 4, 6] — 堆顺序

heapq.heappush(nums, 0)  # O(log n) 插入
smallest = heapq.heappop(nums)  # O(log n) 弹出最小值
print(smallest)  # 0

# n 个最大/最小元素
data = [10, 4, 5, 8, 2, 9, 1]
print(heapq.nlargest(3, data))   # [10, 9, 8]
print(heapq.nsmallest(3, data))  # [1, 2, 4]
```

```python
# 优先队列
import heapq

class PriorityQueue:
    def __init__(self):
        self._queue = []
        self._counter = 0  # 用于打破优先级相同的元素的顺序

    def push(self, item, priority):
        heapq.heappush(self._queue, (priority, self._counter, item))
        self._counter += 1

    def pop(self):
        return heapq.heappop(self._queue)[-1]

pq = PriorityQueue()
pq.push("低优先级", 3)
pq.push("高优先级", 1)
pq.push("中优先级", 2)

print(pq.pop())  # "高优先级"
print(pq.pop())  # "中优先级"
print(pq.pop())  # "低优先级"
```

## bisect 二分查找

`bisect` 模块在已排序序列中进行高效的二分查找和插入。

```python
import bisect

# 在已排序列表中查找插入位置
data = [1, 3, 5, 7, 9]
pos = bisect.bisect_left(data, 6)   # 3 — 6 应插入的位置
pos = bisect.bisect_right(data, 5)  # 3 — 第一个 > 5 的位置

# insort 保持排序插入
bisect.insort(data, 6)
print(data)  # [1, 3, 5, 6, 7, 9]

# 用 bisect 实现分数等级判定
def grade(score, breakpoints=[60, 70, 80, 90], grades="FDCBA"):
    index = bisect.bisect(breakpoints, score)
    return grades[index]

print(grade(85))  # "B"
print(grade(95))  # "A"
```
