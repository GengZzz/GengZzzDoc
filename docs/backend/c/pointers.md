# 指针深入

指针是 C 语言最核心也最容易出错的特性。理解指针的本质（一个存储内存地址的变量）、指针运算的规则和多级指针的应用场景，是写出健壮 C 代码的基础。

## 指针基础

```c
#include <stdio.h>

int main(void) {
    int a = 42;
    int *p = &a;  // p 存储 a 的地址

    printf("a 的值: %d\n", a);       // 42
    printf("a 的地址: %p\n", (void *)&a);  // 0x7ffc...
    printf("p 存储的地址: %p\n", (void *)p);  // 同上
    printf("p 指向的值: %d\n", *p);  // 42（解引用）

    *p = 100;  // 通过指针修改 a 的值
    printf("a = %d\n", a);  // 100
    return 0;
}
```

<CPointerMemoryDemo />

::: tip 指针的本质
指针就是一个变量，只不过它存储的值是另一个变量的内存地址。`int *p` 表示"p 是一个指针，指向 int 类型的数据"。
:::

## 指针运算

指针加减整数时，实际移动的字节数等于 `n * sizeof(*ptr)`：

```c
int arr[] = {10, 20, 30, 40, 50};
int *p = arr;  // p 指向 arr[0]

printf("%d\n", *p);      // 10
printf("%d\n", *(p + 1)); // 20（p 向后移动 4 字节）
printf("%d\n", *(p + 3)); // 40（p 向后移动 12 字节）

// 指针之间的减法：返回元素个数，不是字节数
int *q = &arr[4];
printf("%td\n", q - p);  // 4（相差 4 个 int，不是 16 字节）
```

### 指针比较

```c
int arr[5] = {1, 2, 3, 4, 5};
int *begin = &arr[0];
int *end = &arr[5];  // 指向数组末尾之后一个位置（合法但不能解引用）

// 指针比较常用于遍历
for (int *p = begin; p < end; p++) {
    printf("%d ", *p);
}
```

::: warning 越界指针
`&arr[5]` 是一个合法的指针值（指向数组末尾之后一个位置），可以用于比较，但**不能解引用**。解引用越界指针是未定义行为。
:::

## 多级指针

### 二级指针（char **argv）

`main` 函数的 `argv` 是最常见的二级指针：

```c
int main(int argc, char *argv[]) {
    // argv 的类型是 char **（指向 char* 的指针）
    // argv[0] 是 char*，指向程序名字符串
    // argv[1] 是 char*，指向第一个参数字符串

    for (int i = 0; i < argc; i++) {
        printf("argv[%d]: %s\n", i, argv[i]);
    }
    return 0;
}
```

### 用二级指针修改指针本身

```c
#include <stdio.h>
#include <stdlib.h>

// 函数需要修改调用者的指针，必须传入指针的地址
void allocate_buffer(char **buf, size_t size) {
    *buf = malloc(size);  // 修改调用者的指针
}

int main(void) {
    char *buffer = NULL;
    allocate_buffer(&buffer, 256);
    // 现在 buffer 指向堆上分配的 256 字节

    if (buffer) {
        snprintf(buffer, 256, "Hello from heap");
        printf("%s\n", buffer);
        free(buffer);
    }
    return 0;
}
```

### 二级指针与二维数组

```c
// 二维数组 vs 指针数组
int matrix[3][4];       // 连续的 12 个 int，内存布局固定
int *ptrs[3];           // 3 个 int 指针，可以指向不同长度的行
int **pp;               // 指向 int* 的指针

// ptrs 可以模拟不等长的"二维数组"（锯齿数组）
ptrs[0] = malloc(4 * sizeof(int));  // 第 0 行有 4 列
ptrs[1] = malloc(6 * sizeof(int));  // 第 1 行有 6 列
ptrs[2] = malloc(2 * sizeof(int));  // 第 2 行有 2 列
```

## void 指针

`void *` 是通用指针类型，可以指向任何类型的数据：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 通用的内存拷贝
void my_memcpy(void *dest, const void *src, size_t n) {
    char *d = (char *)dest;
    const char *s = (const char *)src;
    for (size_t i = 0; i < n; i++) {
        d[i] = s[i];
    }
}

// 通用的打印函数（通过回调）
void print_array(const void *arr, size_t len, size_t size,
                 void (*print_elem)(const void *)) {
    const char *ptr = (const char *)arr;
    for (size_t i = 0; i < len; i++) {
        print_elem(ptr + i * size);
        printf(" ");
    }
    printf("\n");
}

void print_int(const void *p) { printf("%d", *(const int *)p); }
void print_double(const void *p) { printf("%.2f", *(const double *)p); }

int main(void) {
    int nums[] = {1, 2, 3, 4, 5};
    print_array(nums, 5, sizeof(int), print_int);

    double vals[] = {1.1, 2.2, 3.3};
    print_array(vals, 3, sizeof(double), print_double);
    return 0;
}
```

::: tip void * 的自动转换
在 C 中，`void *` 可以自动转换为任何指针类型（不需要强制转换）。`malloc` 返回 `void *`，C 中可以直接赋给 `int *`。但在 C++ 中必须显式转换。
:::

## 指针与数组的关系

### 等价性

`arr[i]` 实际上就是 `*(arr + i)` 的语法糖：

```c
int arr[5] = {10, 20, 30, 40, 50};

// 以下四种写法完全等价
arr[2]
*(arr + 2)
2[arr]       // 合法但不要用！
*(2 + arr)
```

### 关键区别

```c
int arr[5];
int *p = arr;

// sizeof 区别
sizeof(arr);  // 20：整个数组的字节数（5 * 4）
sizeof(p);    // 8：指针变量的大小（64位系统）

// & 运算符的区别
&arr    // 类型是 int (*)[5]，指向整个数组的指针
&p      // 类型是 int **，指向指针的指针

// &arr + 1 跳过整个数组（20 字节后）
// p + 1 只跳过一个 int（4 字节后）
```

## restrict 关键字

`restrict`（C99）告诉编译器：这个指针是访问所指向内存的唯一方式。这允许编译器做更激进的优化：

```c
// 没有 restrict：编译器必须假设 src 和 dest 可能重叠
void my_copy(int *dest, const int *src, size_t n) {
    for (size_t i = 0; i < n; i++)
        dest[i] = src[i];
}

// 有 restrict：编译器可以假设不重叠，使用更高效的优化
void my_copy_restricted(int *restrict dest, const int *restrict src, size_t n) {
    for (size_t i = 0; i < n; i++)
        dest[i] = src[i];
}
```

::: warning restrict 是承诺而非约束
`restrict` 是程序员对编译器的承诺。如果违反（两个 restrict 指针实际指向重叠内存），程序行为是未定义的。编译器不会帮你检查。
:::
