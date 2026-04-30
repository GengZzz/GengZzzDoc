# 工程实践

## 这一节你会学到什么

- C++ 项目如何组织文件
- 头文件和源文件如何配合
- 编译、调试、格式化和测试的基本习惯
- 初学者如何写可维护代码

## 它是什么？

工程实践关注的不是某个语法点，而是如何把代码写成一个能长期维护的项目。包括文件组织、命名、构建、测试、调试和版本管理。

## 为什么需要它？

一个 30 行程序可以放在一个文件里；一个 3 万行项目如果没有结构，就会很难查找、修改和协作。工程实践让代码在变大后仍然可控。

## 文件组织

常见结构如下：

```text
project/
  include/
    calculator.h
  src/
    calculator.cpp
    main.cpp
  tests/
    calculator_test.cpp
```

头文件通常放声明，源文件放实现。

## 头文件和源文件

`calculator.h`

```cpp
#pragma once

int add(int a, int b);
```

`calculator.cpp`

```cpp
#include "calculator.h"

int add(int a, int b) {
    return a + b;
}
```

`main.cpp`

```cpp
#include <iostream>
#include "calculator.h"
using namespace std;

int main() {
    cout << add(2, 3) << endl;
    return 0;
}
```

这样拆分后，`main.cpp` 不需要知道 `add` 的内部细节，只需要知道如何调用。

## 编译示例

```bash
g++ src/main.cpp src/calculator.cpp -Iinclude -o app
```

参数 `-Iinclude` 告诉编译器去 `include` 目录找头文件。

## 调试习惯

1. 先读完整错误信息，找到第一个真正的错误。
2. 用最小输入复现问题。
3. 临时输出关键变量，确认程序走到哪里。
4. 学会使用断点调试，而不是只靠猜。

## 代码风格

| 建议 | 原因 |
| --- | --- |
| 变量名表达含义 | `studentCount` 比 `sc` 清楚 |
| 函数只做一件事 | 更容易测试和复用 |
| 复杂逻辑拆函数 | 主流程更易读 |
| 少用全局变量 | 降低意外修改风险 |

## 测试意识

即使暂时不使用测试框架，也可以写一些小程序验证函数行为。

```cpp
#include <cassert>

int add(int a, int b) {
    return a + b;
}

int main() {
    assert(add(2, 3) == 5);
    assert(add(-1, 1) == 0);
    return 0;
}
```

`assert` 失败时程序会中断，适合做简单检查。

## 常见错误

### 在头文件里放太多实现

普通函数实现通常放到 `.cpp`，头文件保留声明。模板是例外，通常需要放在头文件中。

### 修改后只编译一个文件

多文件项目要把相关 `.cpp` 一起交给编译器，或使用 CMake 等构建工具。

## 小练习

### 练习 1

把一个只有 `main.cpp` 的计算器程序拆成 `.h` 和 `.cpp`。

### 练习 2

给 `add`、`subtract`、`multiply` 写 `assert` 检查。

### 练习 3

尝试用 Git 提交一次小改动，提交信息写清楚改了什么。

## 本节小结

- 工程实践让代码规模变大后仍然可维护。
- 头文件放接口，源文件放实现。
- 调试和测试是写代码的一部分，不是最后才做的事。
