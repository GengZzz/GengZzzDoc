# 高级模板

模板是 C++ 泛型编程的基石。掌握特化、SFINAE、变参模板和 Concepts 能写出更灵活、更安全的库代码。

## 模板特化

### 全特化

为特定类型提供不同的实现。

```cpp
template <typename T>
class Printer {
public:
    void print(T value) { cout << value << endl; }
};

// 全特化：针对 const char*
template <>
class Printer<const char*> {
public:
    void print(const char* value) {
        cout << "[string] " << value << endl;
    }
};
```

### 偏特化

对模板参数的一部分进行特化。

```cpp
// 主模板
template <typename T, typename U>
class Pair {
public:
    T first;
    U second;
};

// 偏特化：两个类型相同
template <typename T>
class Pair<T, T> {
public:
    T first;
    T second;
    T sum() const { return first + second; }
};
```

## SFINAE 原则

Substitution Failure Is Not An Error：模板参数替换失败不是错误，只是候选被排除。

```cpp
// 只有 T 有 size() 成员函数时才匹配
template <typename T>
auto getSize(const T& container) -> decltype(container.size(), size_t{}) {
    return container.size();
}

// 只有 T 是指针类型时才匹配
template <typename T>
enable_if_t<is_pointer_v<T>, void>
printPointer(T ptr) {
    cout << "地址: " << ptr << endl;
}
```

## enable_if

```cpp
// 只接受整数类型
template <typename T>
enable_if_t<is_integral_v<T>, T>
safeDivide(T a, T b) {
    return b != 0 ? a / b : 0;
}

// safeDivide(10, 3);     // OK
// safeDivide(10.0, 3.0); // 编译错误：不匹配
```

## if constexpr（C++17）

编译期分支，不满足条件的分支甚至不会被编译。

```cpp
template <typename T>
auto toString(const T& value) {
    if constexpr (is_integral_v<T>) {
        return to_string(value);
    } else if constexpr (is_floating_point_v<T>) {
        return to_string(value);
    } else {
        return string(value);
    }
}
```

::: tip 提示
`if constexpr` 的条件必须是编译期常量。它让模板中的类型相关分支变得简洁，替代了大量 SFINAE 代码。
:::

## 变参模板

接受任意数量模板参数的模板。

```cpp
// 递归终止
void printAll() {
    cout << endl;
}

// 递归展开：取第一个参数，递归处理剩余
template <typename T, typename... Args>
void printAll(const T& first, const Args&... rest) {
    cout << first << " ";
    printAll(rest...);
}

int main() {
    printAll(1, "hello", 3.14, 'A');
    // 输出: 1 hello 3.14 A
}
```

`typename... Args` 是参数包，`Args... rest` 是函数参数包，`rest...` 是包展开。

## 折叠表达式（C++17）

用一行代码展开参数包，替代递归模板。

```cpp
// 一元右折叠
template <typename... Args>
auto sum(Args... args) {
    return (args + ...); // ((a + b) + c) + d
}

// 二元折叠
template <typename... Args>
void printAll(const Args&... args) {
    ((cout << args << " "), ...); // 对每个参数执行 cout << arg << " "
    cout << endl;
}
```

折叠表达式的四种形式：

| 形式 | 含义 |
| --- | --- |
| `(args op ...)` | 右折叠 |
| `(... op args)` | 左折叠 |
| `(args op ... op init)` | 带初始值的右折叠 |
| `(init op ... op args)` | 带初始值的左折叠 |

## Concepts（C++20）

Concepts 为模板参数提供命名约束，替代 SFINAE 的晦涩写法。

```cpp
#include <concepts>

// 定义 concept
template <typename T>
concept Numeric = is_arithmetic_v<T>;

// 使用 concept
template <Numeric T>
T safeAdd(T a, T b) {
    return a + b;
}

// 或用 requires 子句
template <typename T>
requires requires(T a, T b) { a + b; }
auto add(T a, T b) {
    return a + b;
}
```

### 标准库常用 concepts

```cpp
template <std::integral T>       // 只接受整数
template <std::floating_point T> // 只接受浮点数
template <std::same_as<int> T>   // 只接受 int
template <std::convertible_to<string> T> // 可转换为 string
```

::: tip 提示
Concepts 的核心价值是让错误信息更清晰。SFINAE 失败时编译器报一堆模板实例化错误，Concepts 直接告诉你"不满足某某约束"。
:::
