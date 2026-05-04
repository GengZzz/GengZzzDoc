# 智能指针

手动 `new` / `delete` 容易忘记释放或重复释放。C++11 引入三种智能指针，把资源管理交给对象生命周期，这就是 RAII 思想在指针层面的体现。

## unique_ptr：独占所有权

`unique_ptr` 保证同一时刻只有一个指针拥有该资源。

```cpp
#include <memory>
#include <iostream>
using namespace std;

int main() {
    unique_ptr<int> p1 = make_unique<int>(42);
    cout << *p1 << endl; // 42

    // unique_ptr<int> p2 = p1; // 编译错误：不能拷贝
    unique_ptr<int> p2 = move(p1); // 转移所有权

    // p1 现在是 nullptr
    cout << (p1 == nullptr) << endl; // 1
    cout << *p2 << endl;             // 42
}
```

`p1` 离开作用域时不会释放资源，因为所有权已经转给了 `p2`。

### 管理数组

```cpp
auto arr = make_unique<int[]>(10);
arr[0] = 1;
arr[1] = 2;
```

::: tip 提示
优先使用 `make_unique` 而不是 `unique_ptr<T>(new T(...))`，原因有二：写法更简洁，且在复杂表达式中提供更强的异常安全保证。
:::

## shared_ptr：共享所有权

`shared_ptr` 通过引用计数追踪有多少个指针指向同一资源，最后一个销毁时释放内存。

```cpp
#include <memory>
#include <iostream>
using namespace std;

int main() {
    shared_ptr<int> s1 = make_shared<int>(100);
    cout << s1.use_count() << endl; // 1

    {
        shared_ptr<int> s2 = s1;
        cout << s1.use_count() << endl; // 2
    } // s2 销毁，引用计数减到 1

    cout << s1.use_count() << endl; // 1
    cout << *s1 << endl;            // 100，对象仍然存活
}
```

### 引用计数的实现原理

`shared_ptr` 内部维护一个控制块（control block），存储引用计数、弱引用计数和删除器。多个 `shared_ptr` 指向同一对象时共享这个控制块。

```cpp
shared_ptr<int> a = make_shared<int>(42);
shared_ptr<int> b = a;  // a 和 b 共享同一个控制块
// 控制块：use_count=2, weak_count=0
```

::: warning 警告
不要用裸指针创建多个 `shared_ptr`，它们各自拥有独立的控制块，会导致重复释放：
```cpp
int* raw = new int(42);
shared_ptr<int> s1(raw);
shared_ptr<int> s2(raw); // 危险！两个独立的控制块
```
:::

## weak_ptr：打破循环引用

`weak_ptr` 是 `shared_ptr` 的观察者，不增加引用计数。

```cpp
#include <memory>
#include <iostream>
using namespace std;

class B; // 前向声明

class A {
public:
    shared_ptr<B> b_ptr;
    ~A() { cout << "A 析构" << endl; }
};

class B {
public:
    weak_ptr<A> a_ptr; // 用 weak_ptr 打破循环
    ~B() { cout << "B 析构" << endl; }
};

int main() {
    shared_ptr<A> a = make_shared<A>();
    shared_ptr<B> b = make_shared<B>();
    a->b_ptr = b;
    b->a_ptr = a;
    // 离开作用域时 A 和 B 都能正常析构
}
```

如果 B 中用 `shared_ptr<A>` 而非 `weak_ptr<A>`，A 和 B 互相引用，引用计数永远不为零，内存泄漏。

### 使用 weak_ptr

```cpp
weak_ptr<int> w = s1;          // 从 shared_ptr 创建
if (auto locked = w.lock()) {  // 尝试获取 shared_ptr
    cout << *locked << endl;
} else {
    cout << "对象已释放" << endl;
}
```

## 自定义删除器

智能指针默认用 `delete` 释放资源，但可以传入自定义删除器处理文件句柄、C 库资源等。

```cpp
#include <memory>
#include <cstdio>
using namespace std;

int main() {
    unique_ptr<FILE, decltype(&fclose)> fp(fopen("data.txt", "r"), &fclose);

    shared_ptr<int> sp(new int[10], [](int* p) { delete[] p; });
}
```

::: tip 提示
`shared_ptr` 的删除器类型不参与模板参数，所以不同删除器的 `shared_ptr<T>` 可以互相赋值。`unique_ptr` 则需要把删除器类型写进模板参数。
:::

## make_unique 与 make_shared 的异常安全

```cpp
void process(shared_ptr<A> sp, int value);

int main() {
    // 不安全：new A() 可能在构造 shared_ptr 之前抛出异常
    process(shared_ptr<A>(new A()), compute());

    // 安全：make_shared 把分配和构造放在一个原子操作中
    process(make_shared<A>(), compute());
}
```

`make_shared` 把对象内存和控制块合并为一次分配，既异常安全又减少内存碎片。

## 与裸指针的选择

| 场景 | 推荐 |
| --- | --- |
| 函数内部短期使用的动态对象 | `make_unique` |
| 多个所有者共享资源 | `make_shared` |
| 观察已有资源但不拥有 | `raw pointer` 或 `weak_ptr` |
| C 接口交互 | `raw pointer` + `unique_ptr` 管理 |
| 性能敏感且生命周期明确 | `raw pointer` + 作用域管理 |
