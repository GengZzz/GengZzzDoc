# 继承与多态

这篇对应翁恺 C++ 课程中的继承、子类父类关系、向上造型、多态性和多态实现。继承不是为了“少写几行代码”，而是为了表达对象之间的 `is-a` 关系，并让程序在扩展时仍然保持稳定。

## 继承表达 is-a 关系

```cpp
class Shape {
public:
    void moveTo(int x, int y) {
        this->x = x;
        this->y = y;
    }

private:
    int x = 0;
    int y = 0;
};

class Circle : public Shape {
public:
    Circle(int r) : radius(r) {}

private:
    int radius;
};
```

`Circle : public Shape` 的意思是：圆是一种图形。子类会继承父类中可继承的能力，但父类的 `private` 数据仍然只能由父类自己访问。

<CppInheritancePolymorphismDemo />

## 子类与父类的构造顺序

```cpp
class Base {
public:
    Base() { cout << "Base()" << endl; }
    ~Base() { cout << "~Base()" << endl; }
};

class Derived : public Base {
public:
    Derived() { cout << "Derived()" << endl; }
    ~Derived() { cout << "~Derived()" << endl; }
};
```

创建 `Derived` 对象时，先构造父类，再构造子类；销毁时顺序相反。

```text
Base()
Derived()
~Derived()
~Base()
```

这条规则很重要：父类部分必须先准备好，子类才能在这个基础上继续扩展。

## 默认参数与内联函数

课程在进入多态前会穿插默认参数和内联函数，它们常出现在类的接口设计里。

```cpp
class Counter {
public:
    void add(int step = 1) {
        value += step;
    }

    int get() const {
        return value;
    }

private:
    int value = 0;
};
```

默认参数通常写在函数声明处。定义在类体内的短函数天然倾向于内联，但是否真的内联由编译器决定。

## 向上造型

子类对象可以被当作父类对象使用，这叫向上造型。

```cpp
Circle circle(10);
Shape* shape = &circle;
```

向上造型让代码可以面向父类接口编程。它是多态的入口：调用者只知道“这是一个图形”，不必关心它具体是圆、矩形还是三角形。

## 多态：同一消息，不同响应

```cpp
class Shape {
public:
    virtual void draw() const {
        cout << "draw shape" << endl;
    }

    virtual ~Shape() = default;
};

class Circle : public Shape {
public:
    void draw() const override {
        cout << "draw circle" << endl;
    }
};

class Rectangle : public Shape {
public:
    void draw() const override {
        cout << "draw rectangle" << endl;
    }
};
```

当通过父类指针或引用调用虚函数时，程序会在运行时选择真实对象的函数。

```cpp
void paint(const Shape& shape) {
    shape.draw();
}

Circle circle;
Rectangle rectangle;

paint(circle);
paint(rectangle);
```

输出：

```text
draw circle
draw rectangle
```

## 多态成立的条件

1. 有继承关系。
2. 父类中声明 `virtual` 函数。
3. 通过父类指针或引用调用函数。

`override` 不是必须的，但强烈建议写上。它能让编译器帮你检查：你确实重写了父类虚函数，而不是不小心写了一个新的同名函数。

## 抽象类

如果父类只定义接口，不提供默认实现，可以使用纯虚函数。

```cpp
class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};
```

包含纯虚函数的类是抽象类，不能直接创建对象。它的意义是规定子类必须实现哪些能力。

## 练习

1. 定义 `Person` 和 `Student`，让 `Student` 继承 `Person`。
2. 定义抽象类 `Shape`，让 `Circle` 和 `Rectangle` 实现 `area`。
3. 写一个 `printArea(const Shape& shape)`，观察父类引用触发多态。

## 小结

- 继承用来表达稳定的 `is-a` 关系。
- 构造顺序是父类先、子类后；析构顺序相反。
- 向上造型让代码面向父类接口。
- 多态依赖虚函数、继承、父类指针或引用。
- 抽象类把“必须实现的行为”沉淀成接口。
