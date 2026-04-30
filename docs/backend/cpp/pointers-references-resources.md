# 指针、引用与资源管理

## 这一节你会学到什么

- 地址、指针、引用分别是什么
- `nullptr` 的作用
- `new / delete` 的风险
- 为什么现代 C++ 推荐智能指针和 RAII

## 它是什么？

地址像房间号，变量的值住在房间里。指针是一个专门保存地址的变量，引用则像给同一个房间取了一个别名。

<CppPointerAddressDemo />

## 为什么需要它？

有些数据很大，不适合到处复制；有些资源需要明确谁负责使用和释放；有些函数需要修改外部变量。指针和引用就是为这些场景服务的。

## 地址和指针

```cpp
#include <iostream>
using namespace std;

int main() {
    int age = 18;
    int* p = &age;

    cout << "age 的值：" << age << endl;
    cout << "age 的地址：" << &age << endl;
    cout << "p 保存的地址：" << p << endl;
    cout << "p 指向的值：" << *p << endl;
    return 0;
}
```

`&age` 取地址，`int* p` 声明指针，`*p` 访问指针指向的值。

## nullptr

```cpp
#include <iostream>
using namespace std;

int main() {
    int* p = nullptr;

    if (p == nullptr) {
        cout << "指针暂时没有指向任何变量" << endl;
    }

    return 0;
}
```

当指针还没有合适的目标时，用 `nullptr` 表示“空”。不要随便解引用空指针。

## 引用

```cpp
#include <iostream>
using namespace std;

int main() {
    int score = 80;
    int& ref = score;

    ref = 90;
    cout << score << endl;
    return 0;
}
```

`ref` 是 `score` 的别名，修改 `ref` 就是在修改 `score`。

## 指针和引用对比

| 对比项 | 指针 | 引用 |
| --- | --- | --- |
| 是否可以为空 | 可以用 `nullptr` | 通常必须绑定对象 |
| 是否可以改指向 | 可以 | 初始化后不能换绑 |
| 访问值 | `*p` | 像普通变量一样 |
| 常见用途 | 可选对象、动态资源、底层接口 | 函数参数、别名 |

## new / delete

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

`new` 在堆上申请资源，`delete` 释放资源。忘记释放会造成内存泄漏，重复释放会造成严重错误。

## 现代 C++ 的资源管理

实际工程里更推荐让对象自动管理资源，例如使用标准库容器、`string`、`unique_ptr`。

```cpp
#include <iostream>
#include <memory>
using namespace std;

int main() {
    unique_ptr<int> p = make_unique<int>(42);
    cout << *p << endl;
    return 0;
}
```

`unique_ptr` 离开作用域时会自动释放资源，这种思想叫 RAII：资源跟随对象生命周期。

## 常见错误

### 解引用空指针

```cpp
int* p = nullptr;
cout << *p; // 错误
```

使用指针前先确认它指向有效对象。

### new 后忘记 delete

```cpp
int* p = new int(10);
// 忘记 delete p
```

能不用裸 `new` 时就不用，优先使用标准库工具。

## 小练习

### 练习 1

创建一个整数变量，输出它的值和地址。

### 练习 2

写一个函数 `increase(int& value)`，让传入的数字加 1。

### 练习 3

用 `unique_ptr<int>` 保存一个整数并输出。

## 本节小结

- 指针保存地址，引用是别名。
- 空指针不能解引用。
- 资源管理优先交给标准库和对象生命周期。
