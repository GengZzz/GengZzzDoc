# 字符数组与常用函数

## 这一节你会学到什么

- 字符数组是什么
- C 风格字符串为什么以 `'\0'` 结尾
- `strlen`、`strcpy`、`strcmp`、`strcat` 的作用
- 字符数组和 `std::string` 的取舍

## 它是什么？

字符数组是保存多个字符的数组。C 风格字符串是一种特殊字符数组：最后用空字符 `'\0'` 表示字符串结束。

```cpp
char name[4] = {'T', 'o', 'm', '\0'};
```

也可以写成：

```cpp
char name[] = "Tom";
```

第二种写法会自动补上 `'\0'`。

## 为什么需要它？

很多 C 语言库、底层接口和旧项目仍然使用字符数组。即使现代 C++ 更推荐 `std::string`，理解字符数组也有助于读懂老代码和理解字符串底层。

## 基础用法

```cpp
#include <iostream>
using namespace std;

int main() {
    char name[] = "Tom";
    cout << name << endl;
    cout << name[0] << endl;
    return 0;
}
```

输出字符数组名时，`cout` 会把它当作 C 风格字符串，从开头一直输出到 `'\0'`。

## 常用函数

使用这些函数需要包含 `<cstring>`。

```cpp
#include <cstring>
#include <iostream>
using namespace std;

int main() {
    char text[] = "hello";
    cout << strlen(text) << endl;
    return 0;
}
```

| 函数 | 作用 | 注意 |
| --- | --- | --- |
| `strlen(s)` | 获取字符串长度 | 不包含 `'\0'` |
| `strcpy(a, b)` | 把 b 复制到 a | a 要有足够空间 |
| `strcat(a, b)` | 把 b 拼接到 a 后面 | a 要有足够空间 |
| `strcmp(a, b)` | 比较两个字符串 | 相等时返回 0 |

## strcpy

```cpp
#include <cstring>
#include <iostream>
using namespace std;

int main() {
    char source[] = "C++";
    char target[10];

    strcpy(target, source);
    cout << target << endl;
    return 0;
}
```

`target` 必须足够大，能容纳复制内容和结尾的 `'\0'`。

## strcmp

```cpp
#include <cstring>
#include <iostream>
using namespace std;

int main() {
    char a[] = "abc";
    char b[] = "abc";

    if (strcmp(a, b) == 0) {
        cout << "相等" << endl;
    }

    return 0;
}
```

字符数组不能直接用 `==` 比较内容，应该使用 `strcmp`。

::: details 为什么更推荐 std::string？
字符数组需要自己关心空间大小和 `'\0'`，很容易越界。`std::string` 自动管理长度，更适合绝大多数 C++ 业务代码。

字符数组主要在这些场景出现：

- 学习 C/C++ 底层字符串表示。
- 调用 C 语言接口。
- 阅读旧项目代码。
- 某些对内存布局要求很严格的场景。
:::

## 常见错误

### 空间不够

```cpp
char name[3] = "Tom"; // 错误：还需要 '\0'
```

`"Tom"` 实际需要 4 个字符空间。

### 用 `==` 比较内容

```cpp
char a[] = "hi";
char b[] = "hi";
cout << (a == b); // 比较的不是字符串内容
```

比较内容应使用 `strcmp(a, b) == 0`。

## 小练习

### 练习 1

定义字符数组保存 `"hello"`，输出长度。

### 练习 2

使用 `strcmp` 判断两个字符数组内容是否相同。

### 练习 3

把一个字符数组复制到另一个足够大的字符数组中。

## 本节小结

- C 风格字符串以 `'\0'` 结尾。
- `<cstring>` 提供常用字符数组函数。
- 现代 C++ 日常开发优先使用 `std::string`。
