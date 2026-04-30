# 类与对象

这篇对应翁恺 C++ 课程前半段的主线：第一个程序、什么是对象、面向对象基本概念、头文件、时钟例子、成员变量、构造与析构、对象初始化、`new` / `delete`、访问限制、初始化列表和对象组合。

## 从第一个程序看 C++

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++" << endl;
    return 0;
}
```

先记住三件事：

- `main` 是程序入口。
- `cout` 是标准输出流，`endl` 表示换行并刷新输出。
- `#include <iostream>` 引入输入输出库。

课程真正要带出的重点不是这几行代码，而是：C++ 程序可以把“数据”和“操作数据的函数”组织在一起，这就是对象的起点。

## 什么是对象

对象可以先粗略理解为：

```text
对象 = 状态 + 行为
```

以自动售票机为例，状态包括余额、票价、库存；行为包括投币、出票、找零。写程序时，如果只把这些拆成很多零散变量和函数，程序会越来越难维护；如果把它们收进一个对象，边界就清楚了。

```cpp
class TicketMachine {
public:
    void insertMoney(int amount) {
        balance += amount;
    }

    void printTicket() {
        if (balance >= price) {
            cout << "出票" << endl;
            balance -= price;
        }
    }

private:
    int price = 5;
    int balance = 0;
};
```

<CppClassObjectDemo />

## 类是对象的模板

类描述对象拥有什么数据、能做什么动作。对象则是类创建出来的具体实例。

```cpp
class Clock {
public:
    void setTime(int h, int m, int s) {
        hour = h;
        minute = m;
        second = s;
    }

    void display() {
        cout << hour << ":" << minute << ":" << second << endl;
    }

private:
    int hour = 0;
    int minute = 0;
    int second = 0;
};

int main() {
    Clock clock;
    clock.setTime(8, 30, 0);
    clock.display();
}
```

`public` 是对象对外开放的接口，`private` 是对象自己维护的内部状态。一个基本原则是：数据尽量私有，行为通过公开函数暴露。

## 头文件与实现文件

课程里会强调头文件，因为 C++ 项目常把“声明”和“实现”分开。

`Clock.h` 放类的声明：

```cpp
#pragma once

class Clock {
public:
    void setTime(int h, int m, int s);
    void display();

private:
    int hour;
    int minute;
    int second;
};
```

`Clock.cpp` 放成员函数实现：

```cpp
#include "Clock.h"
#include <iostream>
using namespace std;

void Clock::setTime(int h, int m, int s) {
    hour = h;
    minute = m;
    second = s;
}

void Clock::display() {
    cout << hour << ":" << minute << ":" << second << endl;
}
```

这种拆分会让接口更稳定，也方便多个源文件复用同一个类。

## 构造函数与析构函数

构造函数负责对象出生时的初始化，析构函数负责对象离开时的清理。

```cpp
class Clock {
public:
    Clock(int h, int m, int s) : hour(h), minute(m), second(s) {
        cout << "Clock created" << endl;
    }

    ~Clock() {
        cout << "Clock destroyed" << endl;
    }

private:
    int hour;
    int minute;
    int second;
};
```

初始化列表比在构造函数体内赋值更直接，尤其当成员是 `const`、引用，或另一个对象时，初始化列表是必须掌握的写法。

## new 与 delete

`new` 在堆上创建对象，`delete` 释放对象。

```cpp
Clock* clock = new Clock(8, 30, 0);
delete clock;
```

初学阶段要知道这套机制，但日常写现代 C++ 时，应优先使用自动对象、标准库容器和智能指针，让资源释放更可靠。

```cpp
Clock clock(8, 30, 0); // 离开作用域时自动析构
```

## 对象组合

组合表示一个对象“拥有”另一个对象。

```cpp
class Date {
public:
    Date(int y, int m, int d) : year(y), month(m), day(d) {}

private:
    int year;
    int month;
    int day;
};

class Student {
public:
    Student(string n, Date b) : name(n), birthday(b) {}

private:
    string name;
    Date birthday;
};
```

组合对象的构造顺序是：先构造成员对象，再构造自身；析构顺序相反。理解这个顺序，是后面学习资源管理和继承构造的基础。

## 练习

1. 写一个 `Clock` 类，包含 `hour`、`minute`、`second`，提供构造函数和 `display`。
2. 写一个 `TicketMachine` 类，包含票价、余额、总收入，实现投币和出票。
3. 把一个类拆成 `.h` 和 `.cpp` 两个文件，练习声明与实现分离。

## 小结

- 面向对象不是先背 `class` 语法，而是先识别对象的状态和行为。
- `private` 保护状态，`public` 暴露稳定接口。
- 构造函数、析构函数和初始化列表共同决定对象生命周期。
- 组合是比继承更基础的对象关系：一个对象由多个对象组成。
