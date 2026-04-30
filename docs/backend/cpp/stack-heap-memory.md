# 栈、堆与内存模型

## 这一节你会学到什么

- 栈内存和堆内存的区别
- 函数调用和局部变量如何进入栈
- `new / delete` 与堆内存
- 为什么推荐 RAII 和智能指针

## 它是什么？

内存可以先理解成程序运行时使用的一片空间。栈适合保存函数调用过程中的局部数据，堆适合保存生命周期更灵活的数据。

<CppStackHeapDemo />

## 为什么需要它？

C++ 允许程序员接近底层资源。如果不理解栈和堆，很容易写出悬空指针、内存泄漏、重复释放等问题。

## 栈内存

```cpp
#include <iostream>
using namespace std;

void printAge() {
    int age = 18;
    cout << age << endl;
}

int main() {
    printAge();
    return 0;
}
```

`age` 是局部变量，函数调用时创建，函数结束时自动销毁。这个过程由系统管理。

## 堆内存

```cpp
#include <iostream>
using namespace std;

int main() {
    int* p = new int(42);

    cout << *p << endl;

    delete p;
    p = nullptr;
    return 0;
}
```

`new` 申请堆内存，`delete` 释放堆内存。申请和释放必须配对。

## 栈和堆对比

| 对比项 | 栈 | 堆 |
| --- | --- | --- |
| 管理方式 | 自动管理 | 手动或智能指针管理 |
| 常见内容 | 局部变量、函数参数 | 动态创建的数据 |
| 生命周期 | 随作用域结束 | 可跨作用域，需要明确释放 |
| 风险 | 返回局部变量地址 | 泄漏、重复释放、悬空指针 |

## 悬空指针

```cpp
int* makePointer() {
    int value = 10;
    return &value; // 错误：value 离开函数就销毁
}
```

函数结束后，`value` 已经不存在，返回它的地址会得到悬空指针。

## 智能指针

```cpp
#include <iostream>
#include <memory>
using namespace std;

int main() {
    auto p = make_unique<int>(42);
    cout << *p << endl;
    return 0;
}
```

`unique_ptr` 离开作用域时自动释放资源，能减少手写 `delete` 的错误。

::: details RAII 是什么？
RAII 的核心思想是：资源交给对象管理，对象创建时获取资源，对象销毁时释放资源。

常见例子：

- `string` 自动管理字符内存。
- `vector` 自动管理动态数组。
- `unique_ptr` 自动管理堆对象。
- 文件流对象离开作用域时关闭文件。
:::

## 常见错误

### 忘记 delete

```cpp
int* p = new int(10);
```

没有释放就丢失指针，会造成内存泄漏。

### 重复 delete

```cpp
delete p;
delete p; // 错误
```

释放后应把指针设为 `nullptr`，更好的方式是使用智能指针。

## 小练习

### 练习 1

观察一个局部变量在函数内创建和销毁的过程。

### 练习 2

使用 `new` 创建整数，再正确 `delete`。

### 练习 3

把上一题改写为 `unique_ptr<int>`。

## 本节小结

- 栈自动管理，堆需要明确管理。
- 裸 `new / delete` 容易出错。
- 现代 C++ 优先使用标准库容器和智能指针。
