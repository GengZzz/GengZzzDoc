# 类型转换

## 这一节你会学到什么

- 隐式类型转换是什么
- 显式类型转换怎么写
- `static_cast` 的基本用法
- 字符、数字、字符串之间的常见转换

## 它是什么？

类型转换是把一种类型的数据变成另一种类型。例如把 `int` 变成 `double`，或把字符数字 `'8'` 变成整数 `8`。

## 为什么需要它？

程序经常要混合处理不同类型的数据。计算平均分时，两个整数相除可能得到整数结果；读取文本时，用户输入的数字可能先以字符串形式出现。

## 隐式转换

```cpp
#include <iostream>
using namespace std;

int main() {
    int count = 3;
    double price = 9.9;
    double total = count * price;

    cout << total << endl;
    return 0;
}
```

这里 `count` 会参与小数计算，结果保存为 `double`。这种编译器自动完成的转换叫隐式转换。

## 整数除法的坑

```cpp
#include <iostream>
using namespace std;

int main() {
    int total = 5;
    int count = 2;

    cout << total / count << endl;
    cout << static_cast<double>(total) / count << endl;
    return 0;
}
```

`5 / 2` 是整数除法，结果是 `2`。把其中一个数转成 `double` 后，结果才是 `2.5`。

## static_cast

```cpp
#include <iostream>
using namespace std;

int main() {
    double score = 89.7;
    int simpleScore = static_cast<int>(score);

    cout << simpleScore << endl;
    return 0;
}
```

`static_cast<int>(score)` 表示明确告诉编译器：我知道这里要把 `double` 转成 `int`。小数部分会被截断，不是四舍五入。

## 字符和整数

```cpp
#include <iostream>
using namespace std;

int main() {
    char ch = '8';
    int value = ch - '0';

    cout << value << endl;
    return 0;
}
```

字符数字转整数常用 `ch - '0'`。这是因为字符编码中 `'0'` 到 `'9'` 是连续排列的。

## 字符串和数字

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string text = "123";
    int value = stoi(text);

    string priceText = "9.8";
    double price = stod(priceText);

    cout << value + 1 << endl;
    cout << price * 2 << endl;
    return 0;
}
```

`stoi` 把字符串转成整数，`stod` 把字符串转成小数。

::: details 字符串转换失败怎么办？
如果字符串不是合法数字，`stoi`、`stod` 可能抛出异常。真实程序应捕获错误。

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string text = "abc";

    try {
        int value = stoi(text);
        cout << value << endl;
    } catch (...) {
        cout << "转换失败" << endl;
    }

    return 0;
}
```
:::

## 常见错误

### 误以为强转会四舍五入

```cpp
int value = static_cast<int>(3.9); // 得到 3
```

转换成整数会丢掉小数部分。

### 字符数字和数字混淆

`'8'` 是字符，`8` 是整数。它们不是同一个值。

## 小练习

### 练习 1

输入两个整数，输出它们相除后的精确小数结果。

### 练习 2

把字符 `'5'` 转成整数 `5`。

### 练习 3

把字符串 `"98.5"` 转成 `double`，再加上 1.5 输出。

## 本节小结

- 隐式转换由编译器自动完成，但可能带来意外。
- `static_cast` 适合表达明确的类型转换意图。
- 字符串转数字可以使用 `stoi`、`stod`。
