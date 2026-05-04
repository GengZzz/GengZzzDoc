# 预处理器

预处理器在编译之前运行，负责文本替换、文件包含和条件编译。它的功能看似简单，但宏展开的陷阱和条件编译的工程应用是很多开发者容易忽略的知识。

## 宏定义

### 对象宏

```c
#define PI 3.14159265358979
#define MAX_SIZE 1024
#define DEBUG 1
```

### 函数宏

```c
#define SQUARE(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

### 宏展开陷阱

函数宏最大的问题是**多次求值**：

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int x = 5;
int y = MAX(x++, 3);
// 展开为：((x++) > (3) ? (x++) : (3))
// x 被自增了两次！结果是 6，不是 5

// 还有运算符优先级问题
int z = 2 * MAX(3, 4);
// 展开为：2 * ((3) > (4) ? (3) : (4))  → 8（正确）
// 但如果宏定义忘了加括号：2 * (3) > (4) ? (3) : (4) → 错误

// 安全做法：用内联函数替代
static inline int max(int a, int b) {
    return a > b ? a : b;  // a, b 只求值一次
}
```

::: tip 内联函数 vs 宏
C99 引入的 `static inline` 函数是宏的更好替代：
- 有类型检查
- 参数只求值一次
- 支持调试器断点
- 编译器同样可以内联展开
:::

### `#` 和 `##` 运算符

```c
// #：字符串化 — 将宏参数转为字符串
#define TO_STRING(x) #x
printf("%s\n", TO_STRING(hello));  // "hello"
printf("%s\n", TO_STRING(42));     // "42"

// ##：连接 — 将两个标记连接为一个
#define CONCAT(a, b) a##b
int CONCAT(my, Var) = 10;  // 等价于 int myVar = 10;

// 实用示例：生成重复代码
#define DEFINE_LIST(type) \
    typedef struct { type *data; size_t len; size_t cap; } type##List;

DEFINE_LIST(int)     // 生成 intList 类型
DEFINE_LIST(double)  // 生成 doubleList 类型
```

## #include 机制

### `#include <file.h>` vs `#include "file.h"`

- `<file.h>`：在系统头文件目录中搜索（`/usr/include` 等）
- `"file.h"`：先在当前文件所在目录搜索，找不到再搜索系统目录

### 头文件保护

```c
// myheader.h
#ifndef MYHEADER_H
#define MYHEADER_H

// 头文件内容...

#endif  // MYHEADER_H
```

::: tip #pragma once
大多数现代编译器支持 `#pragma once`，效果等同于传统的 include guard，且更简洁：

```c
#pragma once
// 头文件内容...
```
`#pragma once` 不是 C 标准的一部分，但 GCC、Clang、MSVC 都支持。如果需要严格的可移植性，两种方式同时使用。
:::

## 条件编译

### 跨平台代码

```c
#ifdef _WIN32
    #include <windows.h>
    #define PATH_SEP '\\'
#else
    #include <unistd.h>
    #define PATH_SEP '/'
#endif
```

### 功能开关

```c
#define FEATURE_LOGGING 1

#if FEATURE_LOGGING
    #define LOG(msg) fprintf(stderr, "[LOG] %s\n", msg)
#else
    #define LOG(msg) ((void)0)  // 空操作
#endif
```

### 版本检测

```c
#if __STDC_VERSION__ >= 201112L
    // C11 或更高
    #include <stdalign.h>
#elif __STDC_VERSION__ >= 199901L
    // C99
#else
    // C89/C90
#endif
```

### 预定义宏

C 标准和编译器扩展提供的预定义宏：

```c
#include <stdio.h>

int main(void) {
    printf("文件: %s\n", __FILE__);
    printf("行号: %d\n", __LINE__);
    printf("函数: %s\n", __func__);       // C99
    printf("日期: %s\n", __DATE__);
    printf("时间: %s\n", __TIME__);
    printf("C 标准: %ld\n", __STDC_VERSION__);  // 201710L = C17

    #ifdef __GNUC__
    printf("GCC 版本: %d.%d.%d\n",
           __GNUC__, __GNUC_MINOR__, __GNUC_PATCHLEVEL__);
    #endif
    return 0;
}
```

### 调试宏

```c
// 实用的调试打印宏
#ifdef DEBUG
    #define DBG(fmt, ...) \
        fprintf(stderr, "[%s:%d] " fmt "\n", __FILE__, __LINE__, ##__VA_ARGS__)
#else
    #define DBG(fmt, ...) ((void)0)
#endif

// 使用
DBG("value = %d, ptr = %p", x, (void *)p);
```

::: warning 预处理器的局限
预处理器只是文本替换工具，没有类型信息、不理解语法结构。过度使用宏会让代码难以调试和维护。能用 `enum` 代替的常量不要用宏，能用 `inline` 函数代替的不要用函数宏。
:::

## 预处理输出

使用 `-E` 选项查看预处理后的代码，对调试宏非常有用：

```bash
gcc -E program.c -o program.i    # 查看完整预处理结果
gcc -E program.c | tail -50      # 只看最后 50 行
```
