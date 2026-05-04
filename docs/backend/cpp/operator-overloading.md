# 运算符重载

运算符重载让自定义类型像内置类型一样使用 `+`、`==`、`<<` 等符号，核心目标是提升代码可读性。

## 算术运算符

```cpp
class Vector2D {
public:
    double x, y;
    Vector2D(double x = 0, double y = 0) : x(x), y(y) {}

    Vector2D operator+(const Vector2D& rhs) const {
        return {x + rhs.x, y + rhs.y};
    }

    Vector2D operator-(const Vector2D& rhs) const {
        return {x - rhs.x, y - rhs.y};
    }

    Vector2D operator*(double scalar) const {
        return {x * scalar, y * scalar};
    }
};

int main() {
    Vector2D a(1, 2), b(3, 4);
    Vector2D c = a + b;     // {4, 6}
    Vector2D d = a * 2.5;   // {2.5, 5}
}
```

二元运算符作为成员函数时，左操作数是 `*this`。如果需要左操作数是其他类型（比如 `double * Vector2D`），需要用非成员函数。

```cpp
Vector2D operator*(double scalar, const Vector2D& v) {
    return v * scalar; // 复用已有的成员版本
}
```

## 比较运算符

```cpp
class Version {
public:
    int major, minor, patch;
    Version(int ma, int mi, int pa) : major(ma), minor(mi), patch(pa) {}

    bool operator==(const Version& rhs) const {
        return major == rhs.major && minor == rhs.minor && patch == rhs.patch;
    }

    bool operator<(const Version& rhs) const {
        if (major != rhs.major) return major < rhs.major;
        if (minor != rhs.minor) return minor < rhs.minor;
        return patch < rhs.patch;
    }

    bool operator!=(const Version& rhs) const { return !(*this == rhs); }
    bool operator>(const Version& rhs) const  { return rhs < *this; }
    bool operator<=(const Version& rhs) const { return !(rhs < *this); }
    bool operator>=(const Version& rhs) const { return !(*this < rhs); }
};
```

C++20 的 `<=>`（spaceship 运算符）可以自动生成全部比较运算符：

```cpp
#include <compare>

class Version {
public:
    auto operator<=>(const Version&) const = default;
    int major, minor, patch;
};
```

## 流运算符

```cpp
#include <ostream>
#include <istream>

class Point {
public:
    double x, y;

    friend ostream& operator<<(ostream& os, const Point& p) {
        return os << "(" << p.x << ", " << p.y << ")";
    }

    friend istream& operator>>(istream& is, Point& p) {
        return is >> p.x >> p.y;
    }
};

int main() {
    Point p{3, 4};
    cout << p << endl;        // (3, 4)
    cin >> p;                 // 从标准输入读取两个数
}
```

`operator<<` 和 `operator>>` 必须用非成员函数（通常声明为 `friend`），因为左操作数是 `ostream`/`istream`。

## 自增自减运算符

区分前置和后置的关键是后置版本有一个 `int` 占位参数。

```cpp
class Counter {
public:
    int value;

    // 前置 ++
    Counter& operator++() {
        ++value;
        return *this;
    }

    // 后置 ++
    Counter operator++(int) {
        Counter old = *this;
        ++value;
        return old;
    }
};
```

前置版本返回引用，后置版本返回值——因为后置的旧值需要独立存储。

## 函数调用运算符（仿函数）

```cpp
class Accumulator {
public:
    Accumulator(int init = 0) : sum(init) {}

    int operator()(int value) {
        sum += value;
        return sum;
    }

private:
    int sum;
};

int main() {
    Accumulator acc(0);
    acc(10);  // 10
    acc(20);  // 30
    acc(5);   // 35
}
```

仿函数可以保存状态，比普通函数更灵活。STL 算法大量使用仿函数和 `std::function`。

## 类型转换运算符

```cpp
class Celsius {
public:
    explicit Celsius(double t) : temp(t) {}

    explicit operator double() const { return temp; }
    // 隐式转换：去掉 explicit
    // operator double() const { return temp; }

private:
    double temp;
};

int main() {
    Celsius c(36.5);
    double val = static_cast<double>(c); // 需要显式转换
}
```

::: warning 警告
隐式类型转换运算符容易导致意外行为。建议加上 `explicit`，使用时通过 `static_cast` 显式转换。
:::
