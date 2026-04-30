# 输入输出、文件与异常

## 这一节你会学到什么

- 控制台输入输出
- 文件读取和写入
- 异常是什么，如何捕获
- 如何读懂常见错误信息

## 它是什么？

输入输出让程序和外部世界交换数据。控制台输入输出面对键盘和屏幕，文件输入输出面对磁盘上的文本文件。异常是一种报告错误的机制。

## 为什么需要它？

只会在屏幕打印结果还不够。很多程序需要保存配置、读取日志、导出统计结果，也需要在出错时给出清晰反馈。

## 控制台输入输出

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;

    cout << "请输入姓名和年龄：";
    cin >> name >> age;

    cout << name << "，" << age << " 岁" << endl;
    return 0;
}
```

`cin` 从标准输入读取，`cout` 输出到屏幕。

## 写文件

```cpp
#include <fstream>
#include <iostream>
using namespace std;

int main() {
    ofstream file("notes.txt");

    if (!file) {
        cout << "文件打开失败" << endl;
        return 1;
    }

    file << "今天学习 C++ 文件写入" << endl;
    return 0;
}
```

`ofstream` 用于写文件。文件对象创建失败时，应该先处理错误。

## 读文件

```cpp
#include <fstream>
#include <iostream>
#include <string>
using namespace std;

int main() {
    ifstream file("notes.txt");
    string line;

    if (!file) {
        cout << "文件不存在或无法打开" << endl;
        return 1;
    }

    while (getline(file, line)) {
        cout << line << endl;
    }

    return 0;
}
```

`getline` 适合按行读取文本。

## 异常

```cpp
#include <iostream>
#include <stdexcept>
using namespace std;

int divide(int a, int b) {
    if (b == 0) {
        throw runtime_error("除数不能为 0");
    }
    return a / b;
}

int main() {
    try {
        cout << divide(10, 0) << endl;
    } catch (const exception& e) {
        cout << "出错：" << e.what() << endl;
    }
    return 0;
}
```

`throw` 抛出错误，`try / catch` 捕获错误。异常适合处理无法在当前函数正常完成的情况。

## 常见错误

### 文件路径不对

程序运行目录和源码目录不一定相同。如果文件打不开，先确认当前工作目录。

### 读取失败后继续使用数据

```cpp
int value;
cin >> value;
```

如果用户输入的不是整数，读取会失败。真实程序要检查输入状态。

## 小练习

### 练习 1

读取用户输入的姓名，把欢迎语写入 `welcome.txt`。

### 练习 2

逐行读取一个文本文件，并统计行数。

### 练习 3

写一个除法函数，除数为 0 时抛出异常。

## 本节小结

- `cin`、`cout` 用于控制台交互。
- `ifstream` 读文件，`ofstream` 写文件。
- 异常让错误处理从正常流程中分离出来。
