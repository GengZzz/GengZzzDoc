# 常用算法

## 这一节你会学到什么

- `<algorithm>` 是什么
- `sort`、`find`、`count`、`max_element` 的用法
- 自定义排序
- 常用算法如何配合容器

## 它是什么？

C++ 标准库提供了很多常用算法。算法通常不关心具体容器，只关心一段范围，例如 `begin()` 到 `end()`。

<CppAlgorithmSortDemo />

## 为什么需要它？

排序、查找、统计最大值这些需求太常见。标准库算法经过长期验证，通常比自己临时手写更可靠。

## sort 排序

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1};
    sort(nums.begin(), nums.end());

    for (int value : nums) {
        cout << value << " ";
    }

    return 0;
}
```

默认从小到大排序。

## 自定义排序

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1};

    sort(nums.begin(), nums.end(), greater<int>());

    for (int value : nums) {
        cout << value << " ";
    }

    return 0;
}
```

`greater<int>()` 表示从大到小排序。

## find 查找

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1};
    auto it = find(nums.begin(), nums.end(), 8);

    if (it != nums.end()) {
        cout << "找到了：" << *it << endl;
    }

    return 0;
}
```

`find` 找到时返回对应位置，找不到时返回 `end()`。

## count 统计

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 1, 3, 1};
    cout << count(nums.begin(), nums.end(), 1) << endl;
    return 0;
}
```

`count` 统计某个值出现次数。

## max_element 和 min_element

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1};

    auto maxIt = max_element(nums.begin(), nums.end());
    auto minIt = min_element(nums.begin(), nums.end());

    cout << *maxIt << endl;
    cout << *minIt << endl;
    return 0;
}
```

它们返回的是迭代器，所以输出值时要写 `*maxIt`。

::: details 常用算法速查
| 算法 | 作用 |
| --- | --- |
| `sort` | 排序 |
| `find` | 查找第一个匹配值 |
| `count` | 统计出现次数 |
| `reverse` | 反转范围 |
| `max_element` | 找最大元素 |
| `min_element` | 找最小元素 |
| `binary_search` | 在有序范围中判断是否存在 |
:::

## 常见错误

### 忘记包含 algorithm

```cpp
#include <algorithm>
```

使用标准库算法时通常需要这个头文件。

### 对未排序数据做 binary_search

`binary_search` 要求范围已经有序，否则结果不可靠。

## 小练习

### 练习 1

输入 5 个整数，用 `sort` 从小到大输出。

### 练习 2

统计数组中数字 `0` 出现的次数。

### 练习 3

找出一组分数中的最高分和最低分。

## 本节小结

- 标准库算法通常接收 `begin()` 和 `end()`。
- `sort`、`find`、`count` 是最常用的入门算法。
- 返回迭代器的算法需要先判断是否等于 `end()`。
