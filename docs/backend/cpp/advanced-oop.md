# 高级面向对象

在继承与多态的基础上，C++ 还提供多继承、虚继承、RTTI 等更复杂的机制。

## 多继承

一个类可以有多个基类。

```cpp
class Readable {
public:
    virtual string read() = 0;
    virtual ~Readable() = default;
};

class Writable {
public:
    virtual void write(const string& data) = 0;
    virtual ~Writable() = default;
};

class File : public Readable, public Writable {
public:
    string read() override { return content; }
    void write(const string& data) override { content = data; }

private:
    string content;
};
```

### 菱形继承问题

当两条继承链汇聚到同一个基类时，派生类会包含两份基类的副本。

```cpp
class A {
public:
    int value;
};

class B : public A {};  // B 包含一份 A
class C : public A {};  // C 包含一份 A
class D : public B, public C {}; // D 包含两份 A！
```

## 虚继承

用 `virtual` 继承解决菱形问题，确保基类只有一份。

```cpp
class A {
public:
    int value;
};

class B : virtual public A {};
class C : virtual public A {};
class D : public B, public C {}; // D 中只有一个 A
```

::: warning 警告
虚继承有额外的运行时开销（通过虚基类表访问）。只在确实需要解决菱形继承时才使用。
:::

## RTTI（运行时类型识别）

### typeid

```cpp
#include <typeinfo>

Base* p = new Derived();
cout << typeid(*p).name() << endl; // 输出派生类的类型名
```

### dynamic_cast

安全的向下转型，失败时返回 `nullptr`（指针）或抛出 `bad_cast`（引用）。

```cpp
class Animal {
public:
    virtual ~Animal() = default;
};

class Dog : public Animal {
public:
    void bark() { cout << "汪汪!" << endl; }
};

void interact(Animal* animal) {
    if (Dog* dog = dynamic_cast<Dog*>(animal)) {
        dog->bark();
    } else {
        cout << "不是狗" << endl;
    }
}
```

::: tip 提示
`dynamic_cast` 要求基类至少有一个虚函数。如果没有虚函数，应该反思是否真的需要多态。
:::

## 纯虚函数与接口

纯虚函数没有实现，强制派生类提供自己的版本。只包含纯虚函数的类就是接口。

```cpp
class Shape {
public:
    virtual double area() const = 0;
    virtual double perimeter() const = 0;
    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    Circle(double r) : radius(r) {}
    double area() const override { return 3.14159 * radius * radius; }
    double perimeter() const override { return 2 * 3.14159 * radius; }

private:
    double radius;
};
```

C++ 没有 `interface` 关键字，但用"全部纯虚函数 + 虚析构"等价实现。

## CRTP 模式

CRTP（Curiously Recurring Template Pattern）把派生类作为模板参数传给基类，实现编译期多态。

```cpp
template <typename Derived>
class Counter {
public:
    static int count;
    Counter() { ++count; }
    Counter(const Counter&) { ++count; }
    ~Counter() { --count; }
};

template <typename Derived>
int Counter<Derived>::count = 0;

class Widget : public Counter<Widget> {};
class Gadget : public Counter<Gadget> {};

int main() {
    Widget w1, w2;
    Gadget g1;
    cout << Widget::count << endl; // 2
    cout << Gadget::count << endl; // 1
}
```

CRTP 的常见用途：禁止拷贝、单例模式、编译期接口检查。相比虚函数，没有运行时开销。
