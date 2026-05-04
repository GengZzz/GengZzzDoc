# 现代 C++ 与课程进阶特性

这篇整理翁恺 C++ 课程后半段的关键语言特性：`const`、引用再研究、拷贝构造、静态对象、静态成员、运算符重载和类型转换。这里的“现代”不是追逐新语法，而是用更清楚的方式管理对象、接口和资源。

## const：把“不修改”写进接口

`const` 的价值是让编译器帮你守住承诺。

```cpp
class Student {
public:
    Student(string n, int a) : name(n), age(a) {}

    void print() const {
        cout << name << ", " << age << endl;
    }

private:
    string name;
    int age;
};
```

`print() const` 表示这个成员函数不会修改对象状态。这样 `const Student` 对象也能调用它。

```cpp
const Student student("Alice", 18);
student.print();
```

常见写法：

```cpp
const int* p1;      // 指向常量的指针，不能通过 p1 改值
int* const p2 = &x; // 指针本身不可改
const int* const p3 = &x; // 指向和指针本身都不可改
```

## 引用：对象的别名

引用像是一个变量的别名，创建后必须绑定到对象，且不能再改绑。

```cpp
int value = 10;
int& ref = value;
ref = 20;
cout << value << endl; // 20
```

引用常用于函数参数，既避免拷贝，又能表达是否允许修改。

```cpp
void rename(Student& student, const string& name);
void print(const Student& student);
```

经验规则：

- 小的基础类型可以按值传递。
- 复杂对象优先用 `const T&` 只读传递。
- 需要修改实参时使用 `T&`。

## 拷贝构造：对象复制时发生什么

拷贝构造函数在“用已有对象创建新对象”时调用。

```cpp
class Buffer {
public:
    Buffer(int size) : size(size), data(new int[size]) {}

    Buffer(const Buffer& other) : size(other.size), data(new int[other.size]) {
        for (int i = 0; i < size; ++i) {
            data[i] = other.data[i];
        }
    }

    ~Buffer() {
        delete[] data;
    }

private:
    int size;
    int* data;
};
```

如果类里拥有堆内存、文件句柄等资源，就要认真考虑拷贝构造、赋值运算符和析构函数。否则默认浅拷贝可能导致两个对象指向同一块资源，最后重复释放。

## 静态成员：属于类，而不是某个对象

静态成员变量由这个类的所有对象共享。

```cpp
class Student {
public:
    Student() {
        ++count;
    }

    static int getCount() {
        return count;
    }

private:
    static int count;
};

int Student::count = 0;
```

调用静态成员函数时，不需要对象：

```cpp
cout << Student::getCount() << endl;
```

## 运算符重载：让对象也能表达自然运算

运算符重载不是为了炫技，而是让有明确数学或语义关系的对象更好读。

```cpp
class Complex {
public:
    Complex(double r, double i) : real(r), imag(i) {}

    Complex operator+(const Complex& other) const {
        return Complex(real + other.real, imag + other.imag);
    }

private:
    double real;
    double imag;
};
```

赋值运算符要特别小心自赋值和资源释放。

```cpp
Buffer& operator=(const Buffer& other) {
    if (this == &other) {
        return *this;
    }

    int* newData = new int[other.size];
    for (int i = 0; i < other.size; ++i) {
        newData[i] = other.data[i];
    }

    delete[] data;
    data = newData;
    size = other.size;
    return *this;
}
```

## 类型转换

C++ 允许类定义转换行为，但要谨慎使用，避免代码变得隐晦。

```cpp
class Score {
public:
    explicit Score(int v) : value(v) {}

    int getValue() const {
        return value;
    }

private:
    int value;
};
```

构造函数前加 `explicit` 可以阻止很多意外的隐式转换。初学时优先让转换显式一点，代码会更容易读。

## C++17 核心特性

### 结构化绑定

```cpp
auto [x, y] = getPoint();
auto [key, value] = *map.begin();
```

### std::optional

表示可能不存在的值，替代魔法数字和空指针。

```cpp
optional<int> findIndex(const vector<string>& data, const string& target) {
    for (int i = 0; i < data.size(); ++i) {
        if (data[i] == target) return i;
    }
    return nullopt;
}
```

### std::variant

类型安全的 union。

```cpp
variant<int, double, string> v = 42;
v = 3.14;
v = "hello";

visit([](auto&& val) { cout << val << endl; }, v);
```

### std::string_view

非拥有字符串引用，避免不必要的拷贝。

```cpp
void process(string_view sv) {
    cout << sv.substr(0, 5) << endl;
}
```

### if constexpr

编译期分支，详见 [高级模板](./advanced-templates.md#if-constexprc17)。

### 折叠表达式

简化变参模板，详见 [高级模板](./advanced-templates.md#折叠表达式c17)。

## C++20 核心特性

### Concepts

类型约束，替代 SFINAE，详见 [高级模板](./advanced-templates.md#conceptsc20)。

### Ranges

惰性求值的管道式数据处理。

```cpp
#include <ranges>

auto result = nums
    | views::filter([](int n) { return n % 2 == 0; })
    | views::transform([](int n) { return n * n; })
    | views::take(5);
```

### 协程

`co_await` / `co_yield` / `co_return` 实现无栈协程，适合异步和生成器模式。

### 三路比较运算符 <=>

自动生成全部比较运算符，详见 [运算符重载](./operator-overloading.md#比较运算符)。

## C++23 新特性

| 特性 | 说明 |
| --- | --- |
| `std::expected` | 错误处理，类似 Rust 的 Result |
| `std::print` | 格式化输出，替代 printf/cout |
| `std::flat_map` | 扁平化的有序 map |
| `auto(x)` / `auto{x}` | 显式创建副本 |
| `std::ranges::to<Container>` | Range 转容器 |

## 专题导航

现代 C++ 的深入内容分布在以下专题页：

- [构造与析构](./constructors-destructors.md) — 三/五法则、移动构造、explicit
- [运算符重载](./operator-overloading.md) — 算术/比较/流运算符、仿函数
- [智能指针](./smart-pointers.md) — unique_ptr/shared_ptr/weak_ptr、自定义删除器
- [移动语义](./move-semantics.md) — 左右值、std::move、完美转发、引用折叠
- [Lambda 表达式](./lambda-expressions.md) — 捕获列表、泛型 Lambda、constexpr Lambda
- [高级模板](./advanced-templates.md) — 特化、SFINAE、变参模板、Concepts
- [设计模式](./design-patterns-cpp.md) — Singleton、Factory、Observer、RAII
- [构建系统](./build-systems.md) — CMake、FetchContent、vcpkg/Conan
