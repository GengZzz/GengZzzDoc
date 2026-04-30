# 模板与泛型编程

## 这一节你会学到什么

- 模板解决什么问题
- 函数模板和类模板的基本写法
- 泛型编程的直观理解
- 模板常见错误

## 它是什么？

模板是一种“先写通用规则，使用时再替换类型”的机制。它让同一份逻辑可以用于 `int`、`double`、`string` 等不同类型。

## 为什么需要它？

如果没有模板，求两个数中较大值可能要写很多版本：`int` 版、`double` 版、`char` 版。模板让我们只写一份。

## 函数模板

```cpp
#include <iostream>
using namespace std;

template <typename T>
T bigger(T a, T b) {
    return a > b ? a : b;
}

int main() {
    cout << bigger(3, 5) << endl;
    cout << bigger(2.5, 1.8) << endl;
    return 0;
}
```

`T` 是类型占位符。调用 `bigger(3, 5)` 时，编译器会把 `T` 推断为 `int`。

## 类模板

```cpp
#include <iostream>
using namespace std;

template <typename T>
class Box {
public:
    Box(T v) : value(v) {}

    T get() {
        return value;
    }

private:
    T value;
};

int main() {
    Box<int> intBox(42);
    Box<double> doubleBox(3.14);

    cout << intBox.get() << endl;
    cout << doubleBox.get() << endl;
    return 0;
}
```

类模板创建对象时通常需要写出具体类型，例如 `Box<int>`。

## 泛型编程的直观理解

泛型编程关心的是“这类数据能做什么操作”，而不是它具体叫什么类型。只要类型支持 `>`，就可以交给上面的 `bigger` 使用。

## 常见错误

### 传入类型不一致

```cpp
bigger(3, 4.5); // 可能推断失败
```

初学时让两个参数类型保持一致，或者显式指定模板类型：`bigger<double>(3, 4.5)`。

### 类型不支持所需操作

如果某个类型不能比较大小，就不能直接用于需要 `>` 的模板。

## 小练习

### 练习 1

写一个 `smaller` 函数模板，返回较小值。

### 练习 2

写一个 `PairBox<T>`，保存两个相同类型的值。

### 练习 3

思考 `bigger` 能不能比较两个 `string`，然后写代码试一试。

## 本节小结

- 模板让代码适配多种类型。
- 函数模板常靠编译器自动推断类型。
- 类模板创建对象时通常要写具体类型。
