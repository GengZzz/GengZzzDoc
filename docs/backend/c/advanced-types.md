# 高级类型

枚举、联合体、typedef 和 volatile 是 C 语言中常被忽略但非常有用的类型工具。

## 枚举（enum）

### 基本用法

```c
#include <stdio.h>

enum Color { RED, GREEN, BLUE };  // RED=0, GREEN=1, BLUE=2

int main(void) {
    enum Color c = GREEN;
    printf("%d\n", c);  // 输出 1
    return 0;
}
```

### 指定值

```c
enum HttpStatus {
    HTTP_OK          = 200,
    HTTP_NOT_FOUND   = 404,
    HTTP_SERVER_ERR  = 500
};

// 未指定的值从上一个值 +1 继续
enum Direction {
    NORTH = 1,
    SOUTH,     // 2
    EAST,      // 3
    WEST       // 4
};
```

### C 中 enum 的类型安全问题

C 的 `enum` 实际上就是 `int`，编译器不会阻止你赋一个不在枚举范围内的值：

```c
enum Color c = 42;  // 合法但无意义，编译器通常不报错
```

::: tip 增强类型安全
使用 `typedef` 给枚举一个明确的名字，加上范围检查宏：

```c
typedef enum { MODE_READ, MODE_WRITE, MODE_APPEND } FileMode;

const char *filemode_str(FileMode m) {
    switch (m) {
        case MODE_READ:   return "r";
        case MODE_WRITE:  return "w";
        case MODE_APPEND: return "a";
        default:          return "?";
    }
}
```
编译器开启 `-Wswitch` 后，如果 switch 没有覆盖所有枚举值会发出警告。
:::

## 联合体（union）

### 内存复用

`union` 的所有成员共享同一块内存，大小等于最大成员的大小：

```c
#include <stdio.h>

union Data {
    int    i;
    float  f;
    char   str[20];
};

int main(void) {
    union Data d;
    printf("sizeof(union Data) = %zu\n", sizeof(d));  // 20（最大成员 char[20]）

    d.i = 42;
    printf("d.i = %d\n", d.i);   // 42

    d.f = 3.14f;                   // 写入 f 会覆盖 i 的值
    printf("d.f = %f\n", d.f);   // 3.14
    printf("d.i = %d\n", d.i);   // 垃圾值！
    return 0;
}
```

::: warning 同一时刻只读最后一个写入的成员
读取一个没有被最后写入的联合体成员，得到的是未定义的表示（trap representation）。这是 union 最容易出错的地方。
:::

### Tagged Union 模式

用枚举标记联合体当前存储的类型，实现类似"变体类型"的效果：

```c
#include <stdio.h>

typedef enum {
    TYPE_INT,
    TYPE_FLOAT,
    TYPE_STRING
} ValueType;

typedef struct {
    ValueType type;
    union {
        int    i;
        float  f;
        char  *s;
    } value;
} Variant;

void print_variant(const Variant *v) {
    switch (v->type) {
        case TYPE_INT:    printf("int: %d\n", v->value.i); break;
        case TYPE_FLOAT:  printf("float: %f\n", v->value.f); break;
        case TYPE_STRING: printf("string: %s\n", v->value.s); break;
    }
}
```

### union 在位域解析中的应用

```c
#include <stdint.h>
#include <stdio.h>

// 将 32 位颜色值拆分为 RGBA 分量
typedef union {
    uint32_t value;
    struct {
        uint8_t b, g, r, a;  // 小端序下低地址在前
    } channels;
} Color;

int main(void) {
    Color c = { .value = 0xFF804020 };  // A=FF, R=80, G=40, B=20
    printf("R=%02X G=%02X B=%02X A=%02X\n",
           c.channels.r, c.channels.g, c.channels.b, c.channels.a);
    return 0;
}
```

## typedef vs #define

```c
// typedef 创建类型别名
typedef unsigned int uint;
typedef int *IntPtr;
typedef struct { int x; int y; } Point;

// #define 是文本替换
#define uint2 unsigned int
#define IntPtr2 int*

// 关键区别：多变量声明时
IntPtr p1, p2;    // p1 和 p2 都是 int*（typedef 整体替换）
IntPtr2 p3, p4;   // p3 是 int*，p4 是 int！（#define 是文本替换：int *p3, p4）
```

::: tip typedef 的优势
- 与指针、数组配合时行为正确
- 有作用域（在块内定义的 typedef 只在块内有效）
- 可以用于复杂的函数指针类型
:::

### 函数指针的 typedef

```c
// 不用 typedef 的函数指针声明（难以阅读）
int (*compare)(const void *, const void *);

// 用 typedef 后更清晰
typedef int (*CompareFunc)(const void *, const void *);
CompareFunc cmp = my_compare;
```

## volatile 关键字

`volatile` 告诉编译器该变量可能在程序控制之外被修改，禁止对它做优化：

```c
#include <stdio.h>
#include <signal.h>

volatile sig_atomic_t flag = 0;

void handler(int sig) {
    (void)sig;
    flag = 1;  // 信号处理函数修改 flag
}

int main(void) {
    signal(SIGINT, handler);

    // 没有 volatile 的话，编译器可能将 flag 缓存到寄存器
    // 认为 flag 永远是 0，导致死循环
    while (!flag) {
        // 等待信号
    }
    printf("收到信号，退出\n");
    return 0;
}
```

### volatile 的使用场景

| 场景 | 说明 |
| --- | --- |
| 信号处理函数 | 主程序与信号处理函数共享的变量 |
| 硬件寄存器 | 嵌入式开发中映射到硬件地址的变量 |
| 多线程（不够） | `volatile` **不能**替代互斥锁或 `_Atomic`，它只禁止编译器优化，不保证原子性 |

::: warning volatile 不是线程安全的
`volatile` 不提供内存屏障、不保证原子操作、不防止数据竞争。多线程同步请使用 `pthread_mutex` 或 C11 的 `_Atomic`。
:::
