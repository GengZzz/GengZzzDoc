# 二维数组

## 这一节你会学到什么

- 二维数组是什么
- 行和列如何理解
- 如何遍历二维数组
- 二维数组适合哪些场景

## 它是什么？

二维数组像一张表格，有行也有列。`matrix[1][2]` 表示第 2 行第 3 列，因为下标从 0 开始。

## 为什么需要它？

棋盘、座位表、课程表、图像像素、矩阵计算，都适合用二维结构表达。

## 基础用法

```cpp
#include <iostream>
using namespace std;

int main() {
    int grid[2][3] = {
        {1, 2, 3},
        {4, 5, 6}
    };

    cout << grid[0][0] << endl;
    cout << grid[1][2] << endl;
    return 0;
}
```

`grid[2][3]` 表示 2 行 3 列。

## 遍历二维数组

```cpp
#include <iostream>
using namespace std;

int main() {
    int grid[2][3] = {
        {1, 2, 3},
        {4, 5, 6}
    };

    for (int row = 0; row < 2; row++) {
        for (int col = 0; col < 3; col++) {
            cout << grid[row][col] << " ";
        }
        cout << endl;
    }

    return 0;
}
```

外层循环控制行，内层循环控制列。

## 行列求和

```cpp
#include <iostream>
using namespace std;

int main() {
    int scores[2][3] = {
        {80, 90, 75},
        {88, 92, 85}
    };

    for (int row = 0; row < 2; row++) {
        int sum = 0;
        for (int col = 0; col < 3; col++) {
            sum += scores[row][col];
        }
        cout << "第 " << row + 1 << " 行总分：" << sum << endl;
    }

    return 0;
}
```

## 用 vector 表示二维表

当行列大小需要运行时决定时，可以使用 `vector<vector<int>>`。

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<vector<int>> grid = {
        {1, 2, 3},
        {4, 5, 6}
    };

    cout << grid[1][2] << endl;
    return 0;
}
```

::: details 二维数组在内存中是怎么放的？
C++ 的二维数组通常按行连续存放。可以先理解为：第一行的元素放完，再接着放第二行。

例如：

```text
grid[0][0] grid[0][1] grid[0][2] grid[1][0] grid[1][1] grid[1][2]
```
:::

## 常见错误

### 行列写反

```cpp
int grid[2][3];
grid[2][0] = 10; // 错误：行下标最大是 1
```

声明中的 `2` 是行数，不是最大下标。

### 内层循环边界写错

2 行 3 列时，外层是 `< 2`，内层是 `< 3`。

## 小练习

### 练习 1

创建 3 行 3 列数组，输出主对角线元素。

### 练习 2

输入 2 行 3 列成绩，求每一行总分。

### 练习 3

用二维数组表示五子棋棋盘中的一小块区域。

## 本节小结

- 二维数组适合表格类数据。
- 访问格式是 `数组名[行][列]`。
- 遍历二维数组通常使用双层循环。
