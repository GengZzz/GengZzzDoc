# 移动语义

移动语义是 C++11 最重要的特性之一，它让程序在不需要深拷贝时"转移"资源，大幅减少内存分配和复制开销。

## 值类别：左值、右值与将亡值

C++ 中每个表达式都有值类别：

- **左值（lvalue）**：有名字、有地址的对象，如变量 `x`。
- **右值（prvalue）**：临时对象、字面量，如 `42`、`a + b`。
- **将亡值（xvalue）**：即将被移动的对象，如 `std::move(x)` 的结果。

```cpp
int x = 10;
int& lref = x;        // 左值引用，绑定到左值
int&& rref = 20;      // 右值引用，绑定到右值
int&& rref2 = move(x); // move 将 x 转为将亡值
```

## std::move 实现原理

`std::move` 本身不移动任何东西，它只是把参数转为右值引用。

```cpp
template <typename T>
constexpr remove_reference_t<T>&& move(T&& t) noexcept {
    return static_cast<remove_reference_t<T>&&>(t);
}
```

这是一个 `static_cast`，告诉编译器"这个对象的资源可以被偷走"。真正的移动发生在移动构造函数或移动赋值运算符中。

## 移动构造函数

```cpp
class String {
public:
    String(const char* s) {
        size = strlen(s);
        data = new char[size + 1];
        memcpy(data, s, size + 1);
    }

    // 拷贝构造：深拷贝
    String(const String& other) : size(other.size), data(new char[other.size + 1]) {
        memcpy(data, other.data, size + 1);
    }

    // 移动构造：窃取资源
    String(String&& other) noexcept
        : size(other.size), data(other.data) {
        other.data = nullptr;
        other.size = 0;
    }

    ~String() { delete[] data; }

private:
    char* data;
    size_t size;
};
```

移动构造的关键：把源对象的指针偷过来，然后把源对象置为空状态。

## 移动后对象的状态

移动后的对象处于"有效但未指定"的状态。可以安全地做以下操作：

- 析构
- 赋新值
- 调用不依赖当前值的方法

```cpp
String a("hello");
String b = move(a);
// a.data == nullptr, a.size == 0
// a 仍然可以安全使用
a = String("world"); // 重新赋值
```

::: warning 警告
不要在移动后依赖对象的旧值。标准库容器移动后只保证处于"可析构、可赋值"状态。
:::

## 完美转发

完美转发让函数模板把参数原封不动地传递给另一个函数，保持其值类别（左值还是右值）。

```cpp
template <typename T>
void wrapper(T&& arg) {
    target(forward<T>(arg));
}
```

### 引用折叠规则

`T&&` 在模板中是万能引用（universal reference），实际类型由推导决定：

| 模板参数 T | T&& 展开 | 引用折叠结果 |
| --- | --- | --- |
| `int&` | `int& &&` | `int&` |
| `int&&` | `int&& &&` | `int&&` |
| `int` | `int&&` | `int&&` |

规则：`& &&` → `&`，`&& &&` → `&&`。

`std::forward<T>(arg)` 在 T 推导为左值引用时返回左值引用，否则返回右值引用，实现"完美转发"。

```cpp
void process(int& x)  { cout << "左值: " << x << endl; }
void process(int&& x) { cout << "右值: " << x << endl; }

template <typename T>
void relay(T&& arg) {
    process(forward<T>(arg));
}

int main() {
    int a = 10;
    relay(a);      // 左值: 10
    relay(20);     // 右值: 20
}
```

::: tip 提示
完美转发的典型应用是工厂函数和 `emplace` 系列方法，它们需要把参数原样传递给构造函数。
:::

## 拷贝 vs 移动性能对比

```cpp
#include <vector>
#include <chrono>

int main() {
    vector<string> source(100000, "hello world");

    // 拷贝：复制所有字符串
    auto t1 = chrono::high_resolution_clock::now();
    vector<string> copy = source;
    auto t2 = chrono::high_resolution_clock::now();

    // 移动：只转移指针
    auto t3 = chrono::high_resolution_clock::now();
    vector<string> moved = move(source);
    auto t4 = chrono::high_resolution_clock::now();

    // 拷贝耗时远大于移动
}
```

移动 `vector` 只是把内部指针转移，O(1) 复杂度。拷贝需要复制每个元素，O(n) 复杂度。
