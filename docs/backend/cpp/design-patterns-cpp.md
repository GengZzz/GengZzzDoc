# 设计模式的 C++ 实现

用 C++ 的语言特性（RAII、模板、`std::function`）实现经典设计模式，往往比传统 OOP 写法更简洁。

## Singleton（Meyers' Singleton）

利用局部静态变量的线程安全初始化特性（C++11 保证）。

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger inst;
        return inst;
    }

    void log(const string& msg) {
        cout << "[LOG] " << msg << endl;
    }

private:
    Logger() = default;
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
};

int main() {
    Logger::instance().log("程序启动");
}
```

::: tip 提示
这是最简洁的单例实现，不需要手动管理生命周期，也不需要 double-checked locking。
:::

## Factory（模板工厂）

```cpp
class Shape {
public:
    virtual void draw() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    void draw() const override { cout << "画圆" << endl; }
};

class Rectangle : public Shape {
public:
    void draw() const override { cout << "画矩形" << endl; }
};

// 工厂函数
unique_ptr<Shape> createShape(const string& type) {
    if (type == "circle")    return make_unique<Circle>();
    if (type == "rectangle") return make_unique<Rectangle>();
    return nullptr;
}
```

## Observer（信号槽简化版）

```cpp
#include <functional>
#include <vector>
#include <algorithm>

class EventEmitter {
public:
    using Handler = function<void(int)>;
    using HandlerId = size_t;

    HandlerId on(Handler handler) {
        handlers.push_back(move(handler));
        return handlers.size() - 1;
    }

    void off(HandlerId id) {
        handlers[id] = nullptr;
    }

    void emit(int value) {
        for (auto& h : handlers) {
            if (h) h(value);
        }
    }

private:
    vector<Handler> handlers;
};

int main() {
    EventEmitter emitter;

    auto id = emitter.on([](int val) {
        cout << "收到: " << val << endl;
    });

    emitter.emit(42);
    emitter.off(id);
    emitter.emit(100); // 不会触发
}
```

## Strategy（std::function 替代）

用 `std::function` 替代继承层次，更灵活。

```cpp
#include <functional>

class Sorter {
public:
    using Strategy = function<void(vector<int>&)>;

    Sorter(Strategy strategy) : strategy(move(strategy)) {}

    void sort(vector<int>& data) {
        strategy(data);
    }

private:
    Strategy strategy;
};

// 使用
Sorter sorter([](vector<int>& data) {
    std::sort(data.begin(), data.end());
});

vector<int> nums = {5, 3, 1, 4};
sorter.sort(nums);
```

## Builder

```cpp
class HttpRequest {
public:
    string method;
    string url;
    map<string, string> headers;
    string body;

    class Builder {
    public:
        Builder(const string& url) { request.url = url; }

        Builder& method(const string& m) { request.method = m; return *this; }
        Builder& header(const string& key, const string& val) {
            request.headers[key] = val;
            return *this;
        }
        Builder& body(const string& b) { request.body = b; return *this; }

        HttpRequest build() { return move(request); }

    private:
        HttpRequest request;
    };

private:
    HttpRequest() = default;
};

// 使用
auto req = HttpRequest::Builder("https://api.example.com")
    .method("POST")
    .header("Content-Type", "application/json")
    .body(R"({"key":"value"})")
    .build();
```

## RAII 模式

RAII 不是某个设计模式，而是 C++ 的核心编程范式：资源获取即初始化。

```cpp
class FileGuard {
public:
    FileGuard(const string& filename, const char* mode)
        : fp(fopen(filename.c_str(), mode)) {
        if (!fp) throw runtime_error("打开文件失败");
    }

    ~FileGuard() { if (fp) fclose(fp); }

    FileGuard(const FileGuard&) = delete;
    FileGuard& operator=(const FileGuard&) = delete;

    FILE* get() const { return fp; }

private:
    FILE* fp;
};

// 使用
void writeLog(const string& path) {
    FileGuard file(path, "w");
    fputs("日志内容\n", file.get());
    // 离开作用域自动关闭，即使抛出异常
}
```

`lock_guard`、`unique_lock`、`unique_ptr`、`shared_ptr` 都是 RAII 模式的典型应用。
