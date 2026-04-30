# 继承与多态

## 这一节你会学到什么

- 继承是什么，什么时候适合用
- 子类如何复用父类能力
- 虚函数和多态的基本写法
- 继承常见误区

## 它是什么？

继承表示“某类对象是一种更具体的另一类对象”。例如，猫和狗都可以看作动物；圆形和矩形都可以看作图形。

多态表示“同一个调用，在不同对象上表现不同”。对动物调用 `speak`，狗可能输出“汪”，猫可能输出“喵”。

## 为什么需要它？

当多个类有共同特征时，继承能提取公共部分；当程序希望用统一方式处理不同对象时，多态能减少大量 `if / else`。

## 基础继承

```cpp
#include <iostream>
#include <string>
using namespace std;

class Animal {
public:
    string name;

    void eat() {
        cout << name << " 正在吃东西" << endl;
    }
};

class Dog : public Animal {
public:
    void bark() {
        cout << name << "：汪汪" << endl;
    }
};

int main() {
    Dog dog;
    dog.name = "小黑";
    dog.eat();
    dog.bark();
    return 0;
}
```

`Dog : public Animal` 表示 `Dog` 继承 `Animal`，因此拥有 `name` 和 `eat`。

## 虚函数与多态

```cpp
#include <iostream>
using namespace std;

class Shape {
public:
    virtual void draw() {
        cout << "绘制图形" << endl;
    }
};

class Circle : public Shape {
public:
    void draw() override {
        cout << "绘制圆形" << endl;
    }
};

class Rectangle : public Shape {
public:
    void draw() override {
        cout << "绘制矩形" << endl;
    }
};

int main() {
    Circle circle;
    Rectangle rectangle;

    Shape* shape = &circle;
    shape->draw();

    shape = &rectangle;
    shape->draw();
    return 0;
}
```

`virtual` 让 C++ 在运行时根据真实对象决定调用哪个函数。`override` 用来提醒编译器：这里确实是在重写父类函数。

## 什么时候不该用继承

继承适合“是一个”的关系，不适合“有一个”的关系。汽车有轮子，但汽车不是轮子；这时更适合把轮子作为成员变量，而不是继承。

## 常见错误

### 父类析构函数没有 virtual

如果要通过父类指针删除子类对象，父类析构函数应该是虚析构函数。

```cpp
class Base {
public:
    virtual ~Base() = default;
};
```

### 为了复用代码滥用继承

如果两个类只是碰巧有相似代码，不一定要继承。可以先考虑函数、组合或模板。

## 小练习

### 练习 1

定义 `Vehicle` 父类，再定义 `Bike` 和 `Car` 子类。

### 练习 2

给 `Animal` 添加虚函数 `speak`，让 `Dog` 和 `Cat` 输出不同内容。

### 练习 3

思考“电脑”和“键盘”应该用继承还是组合，并说明理由。

## 本节小结

- 继承表达“是一个”的关系。
- 多态让同一个接口可以有不同实现。
- 能用组合表达的关系，不要勉强使用继承。
