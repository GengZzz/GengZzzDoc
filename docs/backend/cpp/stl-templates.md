# STL 与模板

## 这一节你会学到什么

- STL 是什么
- 常用容器：`vector`、`string`、`map`、`set`、`queue`、`stack`
- 常用算法：`sort`、`find`、`count`
- 如何选择合适容器

## 它是什么？

STL 是 C++ 标准库中一组常用数据结构和算法。它就像一套工具箱：数组不够灵活时用 `vector`，需要键值对应时用 `map`，需要排序时用 `sort`。

## 为什么需要它？

自己实现动态数组、排序、队列并不容易，也容易出错。STL 已经提供成熟实现，初学者应该先学会使用工具，再逐步理解内部原理。

## vector

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> scores;
    scores.push_back(80);
    scores.push_back(90);

    for (int score : scores) {
        cout << score << endl;
    }
    return 0;
}
```

`vector` 像可以自动变长的数组。新增元素常用 `push_back`。

<CppVectorGrowthDemo />

## string

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name = "Ada";
    cout << name.size() << endl;
    cout << name[0] << endl;
    return 0;
}
```

`string` 负责文本处理，比手写字符数组更适合入门。

## map 和 set

```cpp
#include <iostream>
#include <map>
#include <set>
#include <string>
using namespace std;

int main() {
    map<string, int> ages;
    ages["Tom"] = 18;
    ages["Ada"] = 20;

    set<string> names;
    names.insert("Tom");
    names.insert("Tom");

    cout << ages["Ada"] << endl;
    cout << names.size() << endl;
    return 0;
}
```

`map` 保存键值对，`set` 保存不重复元素。

## queue 和 stack

```cpp
#include <iostream>
#include <queue>
#include <stack>
using namespace std;

int main() {
    queue<int> q;
    q.push(1);
    q.push(2);
    cout << q.front() << endl;

    stack<int> s;
    s.push(1);
    s.push(2);
    cout << s.top() << endl;
    return 0;
}
```

`queue` 先进先出，像排队；`stack` 后进先出，像叠盘子。

## 常用算法

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {3, 1, 4, 1, 5};

    sort(nums.begin(), nums.end());
    cout << count(nums.begin(), nums.end(), 1) << endl;

    auto it = find(nums.begin(), nums.end(), 4);
    if (it != nums.end()) {
        cout << "找到了" << endl;
    }
    return 0;
}
```

算法通常接收一段范围：`begin()` 表示开始，`end()` 表示结束的下一个位置。

## 容器选择

| 需求 | 推荐容器 |
| --- | --- |
| 按顺序保存一组数据 | `vector` |
| 保存文本 | `string` |
| 按名字查找值 | `map` |
| 去重 | `set` |
| 先进先出 | `queue` |
| 后进先出 | `stack` |

## 常见错误

### 访问空容器

```cpp
vector<int> nums;
cout << nums[0]; // 错误
```

访问前先确认容器不为空。

### 忘记包含头文件

使用 `vector` 需要 `<vector>`，使用 `sort` 需要 `<algorithm>`。

## 小练习

### 练习 1

用 `vector` 保存 5 个分数并求平均值。

### 练习 2

用 `map` 统计每个学生的年龄。

### 练习 3

输入一组数字，用 `sort` 排序后输出。

## 本节小结

- STL 提供成熟的数据结构和算法。
- 先选对容器，再写逻辑。
- `begin()` 和 `end()` 是算法常用的范围表达方式。
