# 类与对象

## 这一节你会学到什么

- 类、对象、成员变量和成员函数
- 构造函数和析构函数
- `public` 与 `private`
- 用类表达现实对象

## 它是什么？

类是一种自定义类型，用来描述一类事物有什么数据、能做什么动作。对象是根据类创建出来的具体个体。

可以把 `Student` 类理解为学生信息表的模板，把 `小明`、`小红` 理解为按模板创建出来的对象。

<CppClassObjectDemo />

## 为什么需要它？

当数据和操作分散在各处时，程序会变得难读。类可以把相关数据和行为放在一起，让代码更接近真实问题。

## 基础用法

```cpp
#include <iostream>
#include <string>
using namespace std;

class Student {
public:
    string name;
    int age;

    void sayHello() {
        cout << "你好，我是 " << name << endl;
    }
};

int main() {
    Student stu;
    stu.name = "小明";
    stu.age = 18;
    stu.sayHello();
    return 0;
}
```

`name` 和 `age` 是成员变量，`sayHello` 是成员函数。

## 构造函数

构造函数在对象创建时自动执行，常用来初始化成员变量。

```cpp
#include <iostream>
#include <string>
using namespace std;

class Student {
public:
    Student(string n, int a) {
        name = n;
        age = a;
    }

    void print() {
        cout << name << "，" << age << " 岁" << endl;
    }

private:
    string name;
    int age;
};

int main() {
    Student stu("小明", 18);
    stu.print();
    return 0;
}
```

`private` 成员不能在类外直接访问，只能通过类提供的函数使用。

## 析构函数

析构函数在对象销毁时自动执行。初学时先知道它存在，后面资源管理会更常用。

```cpp
#include <iostream>
using namespace std;

class Tracker {
public:
    Tracker() {
        cout << "对象创建" << endl;
    }

    ~Tracker() {
        cout << "对象销毁" << endl;
    }
};

int main() {
    Tracker t;
    return 0;
}
```

## public 和 private

| 访问控制 | 含义 | 常见用途 |
| --- | --- | --- |
| `public` | 类外可以访问 | 对外方法 |
| `private` | 只有类内部可以访问 | 内部数据 |
| `protected` | 类内部和子类可以访问 | 继承场景 |

封装的核心是：对象内部如何保存数据可以隐藏起来，外部只通过稳定的方法使用它。

## 常见错误

### 忘记 public

```cpp
class Student {
    string name;
};
```

`class` 中成员默认是 `private`。如果想在类外访问，需要写在 `public:` 下。

### 构造函数写了返回类型

```cpp
void Student(string n) {} // 错误：构造函数没有返回类型
```

构造函数名字和类名相同，并且不写返回类型。

## 小练习

### 练习 1

定义 `Car` 类，包含品牌和速度，并提供 `run` 函数。

### 练习 2

给 `Student` 类添加构造函数，初始化姓名和分数。

### 练习 3

把成员变量改成 `private`，通过 `print` 方法输出信息。

## 本节小结

- 类是模板，对象是具体实例。
- 构造函数负责初始化对象。
- `private` 可以保护对象内部状态。
