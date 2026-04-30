# 语法、数据与表达式

## 这一节你会学到什么

- C++ 程序的基本骨架
- 注释、头文件、命名空间和 `main` 函数
- 变量、常量、基本数据类型和表达式
- 初学者最常见的语法错误

## 它是什么？

语法是 C++ 代码的书写规则，数据是程序要处理的内容，表达式是把数据组合成计算结果的写法。学习这一节的目标不是背完所有规则，而是能读懂一个短程序：哪里是入口，哪里保存数据，哪里做计算，哪里输出结果。

## 为什么需要它？

如果把程序比作一张菜谱，语法就是菜谱的格式，数据就是食材，表达式就是“把鸡蛋打散”“把水烧开”这样的操作。格式错了，编译器看不懂；数据类型选错了，结果可能和预期不同。

## 最小程序骨架

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello C++" << endl;
    return 0;
}
```

这段代码做了四件事：

1. `#include <iostream>` 引入输入输出工具。
2. `using namespace std;` 让我们可以直接写 `cout`。
3. `int main()` 是程序入口。
4. `return 0;` 表示程序正常结束。

## 注释

注释是写给人看的说明，编译器会忽略它。

```cpp
#include <iostream>
using namespace std;

int main() {
    // 输出一行文字
    cout << "学习 C++" << endl;

    /*
      这里可以写多行说明
      适合解释一段代码的目的
    */
    return 0;
}
```

注释要解释“为什么这样写”，不要重复代码本身。`// 输出 age` 这种注释意义不大，`// 未成年人不能注册，所以先检查年龄` 更有价值。

## 变量与常量

变量像一个带名字的小盒子，可以保存值；常量保存后不希望再改变。

```cpp
#include <iostream>
using namespace std;

int main() {
    int age = 18;
    const double pi = 3.14159;

    cout << age << endl;
    cout << pi << endl;
    return 0;
}
```

| 写法 | 含义 | 是否可修改 |
| --- | --- | --- |
| `int age = 18;` | 创建整数变量 | 可以 |
| `const double pi = 3.14159;` | 创建小数常量 | 不可以 |

## 基本数据类型

| 类型 | 适合保存 | 示例 |
| --- | --- | --- |
| `int` | 整数 | `42` |
| `double` | 小数 | `3.14` |
| `char` | 单个字符 | `'A'` |
| `bool` | 真或假 | `true` |
| `string` | 一串文字 | `"hello"` |

使用 `string` 需要引入 `<string>`。

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name = "小明";
    bool passed = true;

    cout << name << endl;
    cout << passed << endl;
    return 0;
}
```

## 表达式

表达式会产生一个结果，例如 `a + b`、`score >= 60`。

```cpp
#include <iostream>
using namespace std;

int main() {
    int math = 80;
    int english = 90;
    int total = math + english;

    cout << "总分：" << total << endl;
    cout << "是否及格：" << (total >= 120) << endl;
    return 0;
}
```

## 常见错误

### 忘记分号

```cpp
int age = 18
```

C++ 大多数语句末尾需要 `;`。看到 `expected ';'` 一类错误时，先检查上一行。

### 字符串和字符混用

```cpp
char level = "A"; // 错误
```

`char` 用单引号：`'A'`。双引号表示字符串。

### 使用变量前没有声明

```cpp
age = 18; // 错误：age 还没被创建
```

应该先写类型：`int age = 18;`。

## 小练习

### 练习 1

创建两个整数变量 `price` 和 `count`，输出总价。

### 练习 2

创建一个 `double` 类型变量表示身高，并输出它。

### 练习 3

创建一个 `const int passScore = 60;`，再创建分数变量，判断是否达到及格线。

## 本节小结

- C++ 程序从 `main` 函数开始运行。
- 变量保存可变化的数据，`const` 常量保存不应变化的数据。
- 类型决定数据能保存什么，表达式负责计算结果。
