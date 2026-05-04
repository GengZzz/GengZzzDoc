# Lambda 表达式

Lambda 是匿名函数对象，让代码更紧凑，特别适合回调、STL 算法和一次性小函数。

## 基本语法

```cpp
[capture](parameters) -> return_type { body }
```

```cpp
auto add = [](int a, int b) { return a + b; };
cout << add(3, 4) << endl; // 7
```

返回类型通常可以省略，编译器自动推导。

## 捕获列表

捕获列表决定 Lambda 如何访问外部变量。

### 值捕获

```cpp
int factor = 10;
auto multiply = [factor](int x) { return x * factor; };
cout << multiply(5) << endl; // 50
// factor 修改不影响 Lambda 内部副本
```

值捕获在 Lambda 创建时拷贝一份，之后外部变量的修改不影响 Lambda 内部。

### 引用捕获

```cpp
int counter = 0;
auto increment = [&counter]() { ++counter; };
increment();
increment();
cout << counter << endl; // 2
```

::: warning 警告
引用捕获要确保 Lambda 执行时被引用的对象仍然存活。异步场景中引用捕获局部变量是最常见的悬空引用 bug。
:::

### 混合捕获

```cpp
int a = 1, b = 2, c = 3;
auto f = [a, &b, &c]() {
    // a 按值，b 和 c 按引用
};
```

### 捕获全部

```cpp
int x = 10, y = 20;
auto f1 = [=]() { return x + y; };   // 全部按值
auto f2 = [&]() { return x + y; };   // 全部按引用
```

### init capture（C++14）

可以在捕获列表中创建新变量或移动捕获。

```cpp
auto ptr = make_unique<int>(42);
auto lambda = [p = move(ptr)]() {
    cout << *p << endl;
};
// ptr 现在是 nullptr，所有权转移到 Lambda 内部
```

### 捕获 this

在类的成员函数中，用 `[this]` 或 `[*this]` 捕获当前对象。

```cpp
class Widget {
    int value = 0;
public:
    auto getIncrementer() {
        return [this]() { ++value; }; // 引用捕获 this
    }

    auto getSnapshot() {
        return [*this]() { return value; }; // 值捕获整个对象（C++17）
    }
};
```

## 泛型 Lambda（C++14）

Lambda 参数可以使用 `auto`，编译器会生成模板版本。

```cpp
auto print = [](const auto& value) {
    cout << value << endl;
};

print(42);        // int
print("hello");   // const char*
print(3.14);      // double
```

## constexpr Lambda（C++17）

Lambda 可以在编译期求值。

```cpp
constexpr auto square = [](int x) { return x * x; };
static_assert(square(5) == 25);
```

## Lambda 与 STL 算法

Lambda 最常见的用法是作为 STL 算法的谓词。

```cpp
#include <algorithm>
#include <vector>

vector<int> nums = {5, 3, 8, 1, 9, 2};

// 排序
sort(nums.begin(), nums.end(), [](int a, int b) {
    return a > b;
});

// 过滤
auto it = remove_if(nums.begin(), nums.end(), [](int x) {
    return x < 5;
});

// 聚合
int sum = accumulate(nums.begin(), nums.end(), 0,
    [](int acc, int x) { return acc + x; });
```

## Lambda 替代函数对象

Lambda 本质上是编译器生成的匿名函数对象。下面两种写法等价：

```cpp
// 函数对象
struct IsEven {
    bool operator()(int x) const { return x % 2 == 0; }
};
auto it1 = find_if(v.begin(), v.end(), IsEven());

// Lambda
auto it2 = find_if(v.begin(), v.end(), [](int x) { return x % 2 == 0; });
```

Lambda 更简洁，而且通过捕获列表访问局部变量，不需要手动存储状态。
