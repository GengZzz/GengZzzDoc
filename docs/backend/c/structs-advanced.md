# 结构体与内存对齐

结构体是 C 语言中组织复合数据的核心工具。内存对齐、位域和柔性数组成员是工程开发中经常遇到但容易忽视的细节。

## 内存对齐与 padding

编译器会为结构体成员插入**填充字节**（padding）以满足对齐要求。每个成员的地址必须是其大小的整数倍：

```c
#include <stdio.h>
#include <stddef.h>

struct Bad {
    char  a;     // 1 字节
    // 3 字节 padding（为了让 b 对齐到 4 字节边界）
    int   b;     // 4 字节
    char  c;     // 1 字节
    // 3 字节 padding（为了让整个结构体对齐到 4 字节边界）
};
// sizeof(struct Bad) = 12，但实际数据只有 6 字节

struct Good {
    int   b;     // 4 字节
    char  a;     // 1 字节
    char  c;     // 1 字节
    // 2 字节 padding
};
// sizeof(struct Good) = 8

int main(void) {
    printf("Bad:  %zu bytes\n", sizeof(struct Bad));   // 12
    printf("Good: %zu bytes\n", sizeof(struct Good));   // 8

    // 使用 offsetof 查看每个成员的偏移
    printf("Bad.a  offset: %zu\n", offsetof(struct Bad, a));   // 0
    printf("Bad.b  offset: %zu\n", offsetof(struct Bad, b));   // 4
    printf("Bad.c  offset: %zu\n", offsetof(struct Bad, c));   // 8
    return 0;
}
```

### 对齐规则

- `char`：任意地址（1 字节对齐）
- `short`：2 字节对齐
- `int` / `float`：4 字节对齐
- `long` / `double` / 指针：8 字节对齐（64 位系统）
- 结构体的对齐值 = 所有成员中最大的对齐值
- 结构体总大小必须是对齐值的整数倍

::: tip 布局优化
将成员按大小从大到小排列，或至少将相同大小的成员放在一起，可以最小化 padding：

```c
// 浪费空间
struct { char a; double b; char c; };  // 24 bytes

// 紧凑排列
struct { double b; char a; char c; };  // 16 bytes
```
:::

### _Alignas（C11）

手动指定对齐方式：

```c
#include <stdalign.h>

// 强制 64 字节对齐（常用于缓存行对齐）
_Alignas(64) char cache_line[64];

// 或使用 alignof 查询对齐要求
printf("int 对齐: %zu\n", alignof(int));  // 4
```

## 位域（Bit-field）

位域允许以位为单位指定结构体成员的宽度，常用于硬件寄存器映射和协议解析：

```c
#include <stdio.h>

struct Flags {
    unsigned int read   : 1;  // 1 位
    unsigned int write  : 1;  // 1 位
    unsigned int exec   : 1;  // 1 位
    unsigned int reserved : 5; // 5 位
    unsigned int owner  : 8;  // 8 位
    unsigned int group  : 8;  // 8 位
};  // 总共 24 位 = 3 字节（加上 padding 可能是 4 字节）

int main(void) {
    struct Flags f = {0};
    f.read = 1;
    f.write = 1;
    f.owner = 1000;  // 超出 8 位范围，只保留低 8 位（232）

    printf("sizeof: %zu\n", sizeof(f));  // 通常 4
    return 0;
}
```

::: warning 位域的不可移植性
- 位域的内存布局（大端/小端、跨字节顺序）由实现定义
- 不能对位域取地址（`&f.read` 编译错误）
- 不能使用 `sizeof` 作用于位域
- 跨平台协议解析建议手动使用位运算代替位域
:::

## 柔性数组成员（Flexible Array Member）

C99 允许结构体最后一个成员是不指定大小的数组，用于变长数据结构：

```c
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

typedef struct {
    size_t length;
    char   data[];  // 柔性数组成员（不占 sizeof 的空间）
} String;

String *string_new(const char *src) {
    size_t len = strlen(src);
    // 一次 malloc 同时分配结构体和数据
    String *s = malloc(sizeof(String) + len + 1);
    s->length = len;
    memcpy(s->data, src, len + 1);
    return s;
}

void string_free(String *s) {
    free(s);  // 只需一次 free
}

int main(void) {
    String *s = string_new("Hello, World!");
    printf("len=%zu, data=%s\n", s->length, s->data);
    string_free(s);
    return 0;
}
```

::: tip 柔性数组 vs 指针
```c
// 方式 1：柔性数组（一次 malloc，内存连续）
struct { size_t len; char data[]; };

// 方式 2：指针成员（两次 malloc，内存不连续）
struct { size_t len; char *data; };
```
柔性数组方式只需要一次 `malloc` 和一次 `free`，内存更紧凑、缓存更友好。
:::

## 链表实现

结构体自引用是构建链表的基础：

```c
#include <stdlib.h>
#include <stdio.h>

typedef struct Node {
    int data;
    struct Node *next;  // 自引用指针
} Node;

// 头插法
Node *list_prepend(Node *head, int value) {
    Node *node = malloc(sizeof(Node));
    if (!node) return head;
    node->data = value;
    node->next = head;
    return node;
}

// 遍历
void list_print(const Node *head) {
    for (const Node *p = head; p; p = p->next) {
        printf("%d -> ", p->data);
    }
    printf("NULL\n");
}

// 释放
void list_free(Node *head) {
    while (head) {
        Node *tmp = head;
        head = head->next;
        free(tmp);
    }
}

int main(void) {
    Node *list = NULL;
    list = list_prepend(list, 3);
    list = list_prepend(list, 2);
    list = list_prepend(list, 1);
    list_print(list);  // 1 -> 2 -> 3 -> NULL
    list_free(list);
    return 0;
}
```

::: warning 链表的常见 bug
- 释放节点时先保存 `next` 再释放，否则遍历断链
- 头节点可能变化，函数应返回新的头指针或传入 `Node **`
- 双向链表删除节点时要同时更新 `prev` 和 `next`
:::
