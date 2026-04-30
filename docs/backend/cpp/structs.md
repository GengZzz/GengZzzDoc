# 结构体

## 这一节你会学到什么

- 结构体是什么
- 如何定义和使用结构体
- 结构体和类的区别

## 它是什么？

结构体是一种把不同类型数据组合在一起的方式。

```cpp
struct Student {
    string name;
    int age;
    double score;
};
```

## 基础用法

```cpp
#include <iostream>
#include <string>
using namespace std;

struct Student {
    string name;
    int age;
};

int main() {
    Student stu;
    stu.name = "小明";
    stu.age = 18;
    cout << stu.name << endl;
    return 0;
}
```

## 结构体和类

区别：结构体成员默认 `public`，类成员默认 `private`。初学用结构体存数据，类存数据和函数。