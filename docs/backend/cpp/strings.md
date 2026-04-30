# C++ 字符串

## 这一节你会学到什么

- `std::string` 的基本用法
- 字符串长度、拼接、访问和查找
- 字符串遍历
- `string` 和字符数组的区别

## 它是什么？

`std::string` 是 C++ 标准库提供的字符串类型，用来保存和处理一串文字。

## 为什么需要它？

文本处理非常常见：用户名、文件路径、消息内容、搜索关键词都属于字符串。`std::string` 比传统字符数组更安全，也更容易使用。

## 基础用法

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name = "Ada";
    cout << name << endl;
    cout << name.size() << endl;
    return 0;
}
```

`size()` 返回字符串长度。

## 拼接字符串

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string first = "Hello";
    string second = "C++";
    string message = first + " " + second;

    cout << message << endl;
    return 0;
}
```

`+` 可以拼接字符串。

## 访问字符

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string word = "code";

    cout << word[0] << endl;
    cout << word.at(1) << endl;
    return 0;
}
```

`word[0]` 访问第一个字符。`at` 会做边界检查，越界时会抛出异常。

## 查找和截取

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string email = "tom@example.com";
    size_t pos = email.find("@");

    if (pos != string::npos) {
        string name = email.substr(0, pos);
        cout << name << endl;
    }

    return 0;
}
```

`find` 找不到时返回 `string::npos`。`substr(起点, 长度)` 用来截取子串。

## 遍历字符串

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string word = "hello";

    for (char ch : word) {
        cout << ch << endl;
    }

    return 0;
}
```

范围 for 适合逐个处理字符。

::: details 常见 string 成员函数
| 函数 | 作用 |
| --- | --- |
| `size()` | 获取长度 |
| `empty()` | 判断是否为空 |
| `find()` | 查找子串 |
| `substr()` | 截取子串 |
| `push_back()` | 追加一个字符 |
| `clear()` | 清空字符串 |
:::

## 常见错误

### 越界访问

```cpp
string word = "abc";
cout << word[3]; // 错误
```

最后一个合法下标是 `2`。

### 忘记引入头文件

使用 `string` 需要：

```cpp
#include <string>
```

## 小练习

### 练习 1

输入一个单词，输出它的长度。

### 练习 2

输入邮箱地址，截取 `@` 前面的用户名。

### 练习 3

统计字符串中字符 `'a'` 出现的次数。

## 本节小结

- 初学阶段优先使用 `std::string`。
- `find`、`substr` 是常用字符串处理函数。
- 字符串下标同样从 0 开始。
