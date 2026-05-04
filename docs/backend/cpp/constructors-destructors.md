# 构造与析构

构造函数和析构函数定义对象的"出生"和"死亡"，是 C++ 资源管理的核心。

## 构造函数类型

### 默认构造函数

没有参数的构造函数。如果用户没有定义任何构造函数，编译器会生成一个默认版本。

```cpp
class Logger {
public:
    Logger() : level(0) {} // 默认构造
private:
    int level;
};
```

### 参数化构造函数

```cpp
class Point {
public:
    Point(double x, double y) : x(x), y(y) {}
private:
    double x, y;
};
```

### 委托构造函数（C++11）

一个构造函数可以调用同类的另一个构造函数。

```cpp
class File {
public:
    File(const string& name, bool append)
        : filename(name), mode(append ? "a" : "w") {}

    File() : File("untitled.txt", false) {}
    File(const string& name) : File(name, false) {}

private:
    string filename;
    string mode;
};
```

### 拷贝构造函数

用已有对象创建新对象时调用。

```cpp
class Buffer {
public:
    Buffer(int size) : data(new int[size]), len(size) {}

    Buffer(const Buffer& other) : data(new int[other.len]), len(other.len) {
        copy(other.data, other.data + len, data);
    }

    ~Buffer() { delete[] data; }

private:
    int* data;
    int len;
};
```

### 移动构造函数（C++11）

"窃取"右值资源，避免深拷贝。

```cpp
Buffer(Buffer&& other) noexcept
    : data(other.data), len(other.len) {
    other.data = nullptr;
    other.len = 0;
}
```

::: tip 提示
移动构造函数参数是 `Buffer&&`（右值引用），函数体中要把源对象置为安全的空状态，防止析构时释放已经转移的资源。
:::

## 析构函数

析构函数在对象销毁时自动调用，负责释放资源。

```cpp
class Connection {
public:
    Connection(const string& host) : socket(connect(host)) {}
    ~Connection() {
        if (socket) disconnect(socket);
    }

    Connection(const Connection&) = delete;
    Connection& operator=(const Connection&) = delete;

private:
    int socket = 0;
};
```

析构函数的调用顺序与构造函数相反：先构造的后析构。

## 三法则 / 五法则

如果你需要自定义析构函数、拷贝构造或拷贝赋值中的任何一个，通常三者都需要——这就是**三法则**。

C++11 扩展为**五法则**：再加上移动构造和移动赋值。

```cpp
class Resource {
public:
    Resource(int size) : data(new int[size]), size(size) {}

    // 析构
    ~Resource() { delete[] data; }

    // 拷贝构造
    Resource(const Resource& o) : data(new int[o.size]), size(o.size) {
        copy(o.data, o.data + size, data);
    }

    // 拷贝赋值
    Resource& operator=(const Resource& o) {
        if (this != &o) {
            delete[] data;
            data = new int[o.size];
            size = o.size;
            copy(o.data, o.data + size, data);
        }
        return *this;
    }

    // 移动构造
    Resource(Resource&& o) noexcept : data(o.data), size(o.size) {
        o.data = nullptr;
        o.size = 0;
    }

    // 移动赋值
    Resource& operator=(Resource&& o) noexcept {
        if (this != &o) {
            delete[] data;
            data = o.data;
            size = o.size;
            o.data = nullptr;
            o.size = 0;
        }
        return *this;
    }

private:
    int* data;
    int size;
};
```

::: tip 提示
如果类只管理单一资源，优先用 `unique_ptr` 或 `shared_ptr`，让编译器自动生成正确的特殊成员函数，省去手写五法则的麻烦。
:::

## explicit 关键字

`explicit` 阻止单参数构造函数参与隐式转换。

```cpp
class Celsius {
public:
    explicit Celsius(double temp) : temp(temp) {}
private:
    double temp;
};

void display(Celsius c) { /* ... */ }

int main() {
    // display(36.5);       // 编译错误：不允许隐式转换
    display(Celsius(36.5)); // 正确：显式构造
}
```

单参数构造函数默认允许隐式转换，这往往不是预期行为。经验规则：单参数构造函数加上 `explicit`。

## 构造函数异常

构造函数中抛出异常意味着对象没有完整构造，析构函数不会被调用。但如果在构造函数体内抛出异常，已经构造的成员变量会被析构。

```cpp
class Pair {
public:
    Pair(const string& a, const string& b)
        : first(a), second(b) {
        if (a.empty() || b.empty()) {
            throw invalid_argument("不能为空");
        }
        // first 和 second 已经构造，异常时它们会被正常析构
    }

private:
    string first;
    string second;
};
```

::: warning 警告
在构造函数中 `new` 分配的资源必须在构造函数体内捕获异常并释放，否则泄漏。这就是 RAII 用智能指针管理资源更有优势的原因。
:::
