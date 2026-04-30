# 输入与输出

## 这一节你会学到什么

- `cin` 和 `cout` 的基本用法
- `getline` 如何读取一整行
- 常见格式化输出
- 输入失败时如何处理

## 它是什么？

输入输出是程序和用户交流的方式。`cin` 负责从键盘读取数据，`cout` 负责把结果显示到屏幕。

## 为什么需要它？

没有输入输出，程序只能处理写死的数据。学习输入输出后，程序才能根据用户输入做判断、计算和反馈。

## 基本输出

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello C++" << endl;
    cout << "年龄：" << 18 << endl;
    return 0;
}
```

`<<` 可以理解成“把右边的内容送到左边的输出流”。`endl` 表示换行并刷新输出。

## 基本输入

```cpp
#include <iostream>
using namespace std;

int main() {
    int age;

    cout << "请输入年龄：";
    cin >> age;

    cout << "你的年龄是：" << age << endl;
    return 0;
}
```

`>>` 可以理解成“从输入流取出数据，放进变量”。变量类型会影响读取方式。

## 连续输入

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;

    cin >> name >> age;
    cout << name << "，" << age << " 岁" << endl;
    return 0;
}
```

输入 `Tom 18` 时，`Tom` 会进入 `name`，`18` 会进入 `age`。

## 读取一整行

`cin >> name` 遇到空格会停止。如果要读取一整句话，使用 `getline`。

```cpp
#include <iostream>
#include <string>
using namespace std;

int main() {
    string sentence;

    cout << "请输入一句话：";
    getline(cin, sentence);

    cout << "你输入的是：" << sentence << endl;
    return 0;
}
```

::: details `cin` 后接 `getline` 为什么会读到空行？
`cin >> value` 读取数字或单词后，换行符可能还留在输入缓冲区。下一次 `getline` 会直接读到这个换行符，结果得到空字符串。

常见处理方式是先忽略掉剩余换行：

```cpp
#include <iostream>
#include <limits>
#include <string>
using namespace std;

int main() {
    int age;
    string intro;

    cin >> age;
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
    getline(cin, intro);

    cout << age << endl;
    cout << intro << endl;
    return 0;
}
```
:::

## 格式化输出

```cpp
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    double price = 12.3456;

    cout << fixed << setprecision(2) << price << endl;
    return 0;
}
```

`fixed` 表示按普通小数格式输出，`setprecision(2)` 表示保留 2 位小数。

## 输入失败处理

```cpp
#include <iostream>
using namespace std;

int main() {
    int age;

    if (cin >> age) {
        cout << "读取成功：" << age << endl;
    } else {
        cout << "请输入整数" << endl;
    }

    return 0;
}
```

如果用户输入 `abc`，读取整数会失败，程序应该给出提示，而不是继续使用无效数据。

## 常见错误

### 用 `cin` 读取带空格文本

```cpp
string name;
cin >> name;
```

如果输入 `Ada Lovelace`，这里只能读到 `Ada`。需要整行文本时使用 `getline`。

### 忽略输入失败

读取失败后变量不一定得到有效值。真实程序应检查输入是否成功。

## 小练习

### 练习 1

输入姓名和年龄，输出一句完整介绍。

### 练习 2

输入商品单价和数量，输出总价，保留两位小数。

### 练习 3

先输入年龄，再输入一句自我介绍，正确处理换行问题。

## 本节小结

- `cout` 输出，`cin` 输入。
- `getline` 用来读取整行文本。
- `iomanip` 可以控制小数位数等输出格式。
- 输入可能失败，不能默认用户永远输入正确内容。
