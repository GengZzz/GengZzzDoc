# 数据结构与算法实践

## 这一节你会学到什么

- 数据结构和算法分别是什么
- 数组、链表、栈、队列、哈希表的用途
- 排序和查找的基本思路
- 如何从小练习走向综合项目

## 它是什么？

数据结构是组织数据的方法，算法是解决问题的步骤。好数据结构能让算法更简单，好算法能让程序更快、更稳定。

## 为什么需要它？

同样是查找一个学生，如果数据只有 5 条，顺序查找就够了；如果有 100 万条，就要考虑更高效的结构和算法。数据规模越大，选择越重要。

## 常见数据结构

| 数据结构 | 直观理解 | 适合场景 |
| --- | --- | --- |
| 数组 / `vector` | 连续座位 | 按下标访问 |
| 链表 | 每个人知道下一个人在哪 | 频繁插入删除 |
| 栈 | 后放的先拿 | 撤销、括号匹配 |
| 队列 | 先来先服务 | 排队任务 |
| 哈希表 | 按 key 快速找值 | 字典、计数 |

## 顺序查找

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {8, 3, 6, 10};
    int target = 6;
    bool found = false;

    for (int value : nums) {
        if (value == target) {
            found = true;
            break;
        }
    }

    cout << (found ? "找到" : "没找到") << endl;
    return 0;
}
```

顺序查找简单直观，适合数据量不大或数据没有排序的情况。

## 二分查找

二分查找要求数据已经有序。它每次排除一半范围。

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {1, 3, 5, 7, 9};
    int target = 7;
    int left = 0;
    int right = nums.size() - 1;
    bool found = false;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) {
            found = true;
            break;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    cout << (found ? "找到" : "没找到") << endl;
    return 0;
}
```

## 排序

工程中通常先使用标准库 `sort`。

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

先会用标准算法，再学习冒泡排序、选择排序、快速排序等内部原理。

## 阶段练习

### 入门练习

1. 求数组最大值和最小值。
2. 统计 `vector<int>` 中某个数字出现次数。
3. 判断一个字符串是否为回文。

### 进阶练习

1. 用栈检查括号是否匹配。
2. 用队列模拟排队叫号。
3. 用 `map<string, int>` 统计单词出现次数。

### 综合练习

做一个“学生成绩管理”命令行程序：支持新增学生、查询成绩、按分数排序、统计平均分。

## 常见错误

### 忽略边界

空数组、只有一个元素、目标不存在，都是必须考虑的情况。

### 先追求复杂算法

初学阶段先写对，再优化。能用标准库解决时，优先使用标准库。

## 本节小结

- 数据结构决定数据怎么放，算法决定问题怎么解。
- 查找和排序是最基础的算法主题。
- 练习时要特别注意空数据和边界条件。
