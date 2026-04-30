# 控制流与程序逻辑

## 这一节你会学到什么

- `if / else` 条件判断
- `switch` 多分支选择
- `for`、`while`、`do while` 循环
- 如何避免死循环和边界错误

## 它是什么？

控制流决定程序下一步走哪条路、某段代码重复执行多少次。没有控制流，程序只能从上到下一句句执行，无法根据输入做选择。

## 为什么需要它？

登录时要判断密码是否正确，成绩系统要判断是否及格，菜单程序要根据用户输入执行不同操作。这些都离不开控制流。

## if / else

```cpp
#include <iostream>
using namespace std;

int main() {
    int score = 75;

    if (score >= 60) {
        cout << "及格" << endl;
    } else {
        cout << "需要继续练习" << endl;
    }

    return 0;
}
```

`if` 后面的条件为真时执行第一个代码块，否则执行 `else`。

## 多条件判断

```cpp
#include <iostream>
using namespace std;

int main() {
    int score = 86;

    if (score >= 90) {
        cout << "优秀" << endl;
    } else if (score >= 80) {
        cout << "良好" << endl;
    } else if (score >= 60) {
        cout << "及格" << endl;
    } else {
        cout << "不及格" << endl;
    }

    return 0;
}
```

条件会从上到下检查，命中一个分支后就不会继续检查后面的分支。

## switch

```cpp
#include <iostream>
using namespace std;

int main() {
    int option = 2;

    switch (option) {
        case 1:
            cout << "新增" << endl;
            break;
        case 2:
            cout << "查询" << endl;
            break;
        default:
            cout << "未知选项" << endl;
    }

    return 0;
}
```

`switch` 适合“一个变量对应多个固定值”的场景。多数情况下每个 `case` 后要写 `break`。

## for 循环

```cpp
#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 5; i++) {
        cout << i << endl;
    }
    return 0;
}
```

`for` 常用于次数明确的循环，例如打印 5 次、遍历数组。

## while 循环

```cpp
#include <iostream>
using namespace std;

int main() {
    int count = 3;

    while (count > 0) {
        cout << count << endl;
        count--;
    }

    return 0;
}
```

`while` 适合“只要条件成立就继续”的场景。

## do while

```cpp
#include <iostream>
using namespace std;

int main() {
    int number = 1;

    do {
        cout << number << endl;
        number++;
    } while (number <= 3);

    return 0;
}
```

`do while` 至少执行一次，再判断是否继续。

## 常见错误

### 把 `=` 当成 `==`

```cpp
if (score = 60) { // 错误倾向：这是赋值，不是比较
}
```

比较是否相等要用 `==`。

### 忘记更新循环变量

```cpp
int i = 0;
while (i < 5) {
    cout << i << endl;
}
```

`i` 一直不变，条件永远成立，就会变成死循环。

## 小练习

### 练习 1

输入一个年龄，判断是否成年。

### 练习 2

用 `for` 输出 1 到 100 的和。

### 练习 3

用 `switch` 实现一个简单菜单：1 表示新增，2 表示删除，3 表示退出。

## 本节小结

- 条件判断负责选择路径。
- 循环负责重复执行。
- 写循环时一定要确认终止条件会发生变化。
