# 函数深入

C 语言的函数不仅是代码复用的工具，更是理解指针、栈帧和回调机制的关键。

## 函数声明与定义

### 前置声明

当函数定义在调用之后，需要先声明：

```c
// 声明（函数原型），可以省略参数名
int add(int, int);

int main(void) {
    printf("%d\n", add(3, 4));
    return 0;
}

// 定义
int add(int a, int b) {
    return a + b;
}
```

头文件（`.h`）放声明，源文件（`.c`）放定义，这是 C 项目的基本组织方式。

## 参数传递

C 语言只有**值传递**。要修改调用者的变量，必须传递指针：

```c
#include <stdio.h>

// 值传递：函数内修改不影响调用者
void swap_wrong(int a, int b) {
    int tmp = a;
    a = b;
    b = tmp;  // 只修改了副本
}

// 指针传递：通过解引用修改原值
void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void) {
    int x = 10, y = 20;
    swap(&x, &y);
    printf("x=%d, y=%d\n", x, y);  // x=20, y=10
    return 0;
}
```

### 数组参数的特殊性

数组作为参数时会**退化为指针**，函数内无法获取数组长度：

```c
// 这两个声明完全等价
void process(int arr[10]);
void process(int arr[]);
void process(int *arr);      // 实际上传入的是指针

// sizeof(arr) 在函数内部是指针大小，不是数组大小！
void print_size(int arr[5]) {
    printf("%zu\n", sizeof(arr));  // 输出 8（64位系统），不是 20
}

// 必须显式传递长度
void process(int *arr, size_t len) { ... }
```

## 递归与栈帧

每次函数调用都会在栈上创建一个新的**栈帧**（stack frame），存储局部变量、参数和返回地址：

```c
#include <stdio.h>

// 递归计算阶乘
unsigned long long factorial(int n) {
    if (n <= 1) return 1;  // 基本情况
    return n * factorial(n - 1);
}

int main(void) {
    printf("5! = %llu\n", factorial(5));  // 120
    return 0;
}
```

调用 `factorial(3)` 时的栈帧变化：

```
factorial(3)                    factorial(2)                  factorial(1)
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│ n = 3       │               │ n = 2       │               │ n = 1       │
│ 返回 3 * ?  │──→ 调用       │ 返回 2 * ?  │──→ 调用       │ 返回 1      │
└─────────────┘               └─────────────┘               └─────────────┘
    栈帧 1                        栈帧 2                        栈帧 3
```

::: warning 递归深度限制
默认栈大小通常 1-8 MB。每个栈帧大约需要几十到几百字节，递归几万次就会栈溢出。对于深度未知的递归（如遍历深层目录），考虑改用迭代或显式栈。
:::

## 函数指针

函数指针存储函数的入口地址，可以像变量一样传递和调用：

```c
#include <stdio.h>

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

int main(void) {
    // 声明函数指针
    int (*op)(int, int);

    op = add;
    printf("add: %d\n", op(3, 4));  // 7

    op = sub;
    printf("sub: %d\n", op(3, 4));  // -1
    return 0;
}
```

### 函数指针数组

```c
// 实现简易计算器
typedef int (*Operation)(int, int);

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }
int mul(int a, int b) { return a * b; }

Operation ops[] = { add, sub, mul };
const char *names[] = { "add", "sub", "mul" };

for (int i = 0; i < 3; i++) {
    printf("%s(6, 7) = %d\n", names[i], ops[i](6, 7));
}
```

## 回调模式（qsort 实现）

`qsort` 是标准库中回调函数的经典用例：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 比较函数：返回负数(a<b)、零(a==b)、正数(a>b)
int cmp_int(const void *a, const void *b) {
    return (*(const int *)a) - (*(const int *)b);
}

int cmp_str(const void *a, const void *b) {
    return strcmp(*(const char **)a, *(const char **)b);
}

int main(void) {
    int nums[] = {5, 2, 8, 1, 9, 3};
    qsort(nums, 6, sizeof(int), cmp_int);
    // nums: {1, 2, 3, 5, 8, 9}

    const char *names[] = {"Charlie", "Alice", "Bob"};
    qsort(names, 3, sizeof(char *), cmp_str);
    // names: {"Alice", "Bob", "Charlie"}
    return 0;
}
```

`qsort` 的函数签名：

```c
void qsort(void *base, size_t nmemb, size_t size,
           int (*compar)(const void *, const void *));
```

- `base`：数组首地址
- `nmemb`：元素个数
- `size`：每个元素的大小
- `compar`：比较函数指针

这种"传入函数"的模式在事件驱动编程、GUI 框架、网络服务器中广泛应用。

## 变长参数（va_list）

`printf` 接受不定数量的参数，这是通过 `<stdarg.h>` 实现的：

```c
#include <stdio.h>
#include <stdarg.h>

// 求任意个整数的平均值
double average(int count, ...) {
    va_list args;
    va_start(args, count);  // 初始化，count 是最后一个固定参数

    double sum = 0;
    for (int i = 0; i < count; i++) {
        sum += va_arg(args, int);  // 逐个取出参数
    }

    va_end(args);  // 清理
    return sum / count;
}

int main(void) {
    printf("avg = %.1f\n", average(3, 10, 20, 30));  // 20.0
    printf("avg = %.1f\n", average(5, 1, 2, 3, 4, 5));  // 3.0
    return 0;
}
```

::: warning va_list 没有类型检查
编译器无法检查 `va_arg` 取出的类型是否正确。传入 `double` 但用 `va_arg(args, int)` 取出会导致未定义行为。这也是为什么 `printf` 的格式字符串与参数不匹配时会出现奇怪结果。
:::
