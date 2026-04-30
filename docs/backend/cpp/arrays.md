# 一维数组

## 这一节你会学到什么

- 一维数组是什么
- 下标为什么从 0 开始
- 如何遍历数组
- 数组越界为什么危险

## 它是什么？

一维数组是一排连续的小格子，每个格子保存同一种类型的数据。数组名代表这一组数据，下标代表第几个格子。

<CppArrayIndexDemo />

## 为什么需要它？

如果有 5 个学生分数，用 5 个变量会很散：

```cpp
int a = 80;
int b = 90;
int c = 75;
```

数组可以把它们放在一起，更适合批量处理。

## 基础用法

```cpp
#include <iostream>
using namespace std;

int main() {
    int scores[5] = {80, 90, 75, 88, 92};

    cout << scores[0] << endl;
    cout << scores[4] << endl;
    return 0;
}
```

长度为 5 的数组，合法下标是 `0` 到 `4`。

## 遍历数组

```cpp
#include <iostream>
using namespace std;

int main() {
    int scores[5] = {80, 90, 75, 88, 92};

    for (int i = 0; i < 5; i++) {
        cout << scores[i] << endl;
    }

    return 0;
}
```

`i < 5` 很关键。如果写成 `i <= 5`，就会访问不存在的 `scores[5]`。

## 求和与平均值

```cpp
#include <iostream>
using namespace std;

int main() {
    int scores[5] = {80, 90, 75, 88, 92};
    int sum = 0;

    for (int i = 0; i < 5; i++) {
        sum += scores[i];
    }

    cout << "总分：" << sum << endl;
    cout << "平均分：" << sum / 5.0 << endl;
    return 0;
}
```

`5.0` 是小数，能避免整数除法丢失小数部分。

::: details 数组长度能不能运行时输入？
传统 C++ 固定数组的长度应在编译期确定。不同编译器可能允许 `int nums[n]`，但这不是标准 C++ 的好习惯。

如果长度需要运行时决定，优先使用 `vector`：

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;

    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    return 0;
}
```
:::

## 常见错误

### 数组越界

```cpp
int nums[3] = {1, 2, 3};
cout << nums[3]; // 错误
```

越界不一定马上报错，但它会访问不属于数组的内存。

### 忘记初始化

```cpp
int nums[3];
cout << nums[0]; // 值不确定
```

局部数组没有初始化时，里面可能是随机值。

## 小练习

### 练习 1

输入 5 个整数，输出最大值。

### 练习 2

输入 5 个分数，统计及格人数。

### 练习 3

把数组元素逆序输出。

## 本节小结

- 数组保存一组相同类型的数据。
- 下标从 0 开始。
- 遍历时最容易出错的是边界条件。
