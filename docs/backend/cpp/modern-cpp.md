# 现代 C++

## 这一节你会学到什么

- 什么是现代 C++
- `auto`、范围 for、`nullptr`
- 智能指针和移动语义的基本感觉
- 写新代码时的优先选择

## 它是什么？

现代 C++ 通常指 C++11 之后逐步形成的一套写法。它不是一门新语言，而是让 C++ 更安全、更清晰、更少手动管理细节的方式。

## 为什么需要它？

老式 C++ 代码里常见大量裸指针、手动 `new / delete` 和复杂类型声明。现代 C++ 希望让资源自动释放，让代码表达意图，而不是到处处理底层细节。

## auto

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    auto age = 18;
    auto price = 9.9;
    vector<int> nums = {1, 2, 3};

    for (auto value : nums) {
        cout << value << endl;
    }
    return 0;
}
```

`auto` 让编译器根据右侧表达式推断类型。它适合类型明显或类型很长的场景。

## 范围 for

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> scores = {80, 90, 75};

    for (int score : scores) {
        cout << score << endl;
    }
    return 0;
}
```

范围 for 适合遍历容器，比手写下标更不容易越界。

## nullptr

```cpp
int* p = nullptr;
```

现代 C++ 用 `nullptr` 表示空指针，比旧式的 `NULL` 更明确。

## 智能指针

```cpp
#include <iostream>
#include <memory>
using namespace std;

int main() {
    auto number = make_unique<int>(42);
    cout << *number << endl;
    return 0;
}
```

`unique_ptr` 表示独占资源，离开作用域自动释放。初学时先记住：它能减少忘记 `delete` 的风险。

## 移动语义的直观理解

移动语义可以先理解成“搬走资源”，而不是“复制一份”。当对象内部保存大量数据时，移动比复制更高效。初学阶段不需要立刻掌握所有细节，但应该知道标准库容器和字符串已经大量使用这种能力。

## 常见建议

| 旧写法倾向 | 现代写法倾向 |
| --- | --- |
| 手动 `new / delete` | 标准库容器、智能指针 |
| `NULL` | `nullptr` |
| 复杂迭代器类型手写 | 合理使用 `auto` |
| 下标遍历全部场景 | 范围 for |

## 小练习

### 练习 1

把一个普通 `for` 下标循环改成范围 for。

### 练习 2

用 `auto` 保存 `vector<int>::size()` 的结果。

### 练习 3

用 `make_unique<int>` 创建整数并输出。

## 本节小结

- 现代 C++ 更强调自动资源管理和清晰表达。
- `auto` 要用在类型明确的地方。
- 新代码优先使用标准库容器和智能指针。
