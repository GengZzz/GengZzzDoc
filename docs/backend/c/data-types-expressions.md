# 数据类型与表达式

C 语言的类型系统看似简单，但整型宽度在不同平台上的差异、浮点数的精度陷阱，都是实际开发中常见的坑。

## 整型家族

### 固定宽度类型（推荐使用）

`<stdint.h>`（C99）提供了固定宽度的整型，不依赖平台：

```c
#include <stdint.h>
#include <stdio.h>

int main(void) {
    int8_t   a = 127;           // 1 字节，-128 ~ 127
    uint8_t  b = 255;           // 1 字节，0 ~ 255
    int16_t  c = 32767;         // 2 字节
    int32_t  d = 2147483647;    // 4 字节
    int64_t  e = 9223372036854775807LL;  // 8 字节

    printf("int32_t: %zu bytes\n", sizeof(int32_t));  // 4
    printf("int64_t: %zu bytes\n", sizeof(int64_t));  // 8
    return 0;
}
```

### 传统类型的宽度陷阱

`int` 的宽度由实现定义，这是 C 语言最著名的可移植性问题：

| 类型 | 16 位系统 | 32 位系统 | 64 位系统 |
| --- | --- | --- | --- |
| `short` | 2 bytes | 2 bytes | 2 bytes |
| `int` | 2 bytes | 4 bytes | 4 bytes |
| `long` | 4 bytes | 4 bytes | 4 或 8 bytes |
| `long long` | — | 8 bytes | 8 bytes |
| 指针 | 2 bytes | 4 bytes | 8 bytes |

::: warning long 的陷阱
在 Windows 64 位系统上 `long` 仍然是 4 字节（LLP64 模型），而在 Linux/macOS 64 位系统上 `long` 是 8 字节（LP64 模型）。如果你的代码依赖 `long` 是 8 字节，在 Windows 上会出错。使用 `int64_t` 可以避免这个问题。
:::

### sizeof 运算符

`sizeof` 在编译时求值，返回类型或变量占用的字节数：

```c
printf("char:  %zu\n", sizeof(char));      // 1（标准保证）
printf("short: %zu\n", sizeof(short));     // 通常 2
printf("int:   %zu\n", sizeof(int));       // 通常 4
printf("long:  %zu\n", sizeof(long));      // 视平台而定
printf("ptr:   %zu\n", sizeof(void *));    // 通常 4 或 8

// sizeof 作用于表达式时不求值表达式
int x = 10;
printf("%zu\n", sizeof(x++));  // x 不会被自增！
printf("%d\n", x);             // 仍然是 10
```

::: tip sizeof 返回值的格式化
`sizeof` 返回 `size_t` 类型（无符号整型），使用 `%zu` 格式化输出。在 `<stdint.h>` 中用 `SIZE_MAX` 可以获取其最大值。
:::

## 浮点数与 IEEE 754

### 精度陷阱

浮点数在计算机中使用 IEEE 754 标准存储，二进制无法精确表示所有十进制小数：

```c
#include <stdio.h>
#include <math.h>

int main(void) {
    double a = 0.1;
    double b = 0.2;
    double c = a + b;

    printf("0.1 + 0.2 = %.20f\n", c);
    // 输出: 0.30000000000000004441

    // 不要用 == 比较浮点数！
    if (c == 0.3) {
        printf("相等\n");    // 不会执行
    }

    // 正确做法：使用误差范围比较
    if (fabs(c - 0.3) < 1e-9) {
        printf("近似相等\n");  // 会执行
    }
    return 0;
}
```

### 浮点类型对比

| 类型 | 大小 | 有效位数 | 范围（约） | 格式化 |
| --- | --- | --- | --- | --- |
| `float` | 4 bytes | 6-7 位 | ±3.4e38 | `%f` |
| `double` | 8 bytes | 15-16 位 | ±1.8e308 | `%f` 或 `%lf` |
| `long double` | 12 或 16 bytes | 18-19 位 | ±1.2e4932 | `%Lf` |

::: warning float 精度不足
`float` 只有约 7 位有效数字，`0.1f + 0.2f` 的误差比 `double` 版本更大。除非有特殊需求（嵌入式、GPU 着色器），否则统一使用 `double`。
:::

### 特殊浮点值

```c
#include <math.h>
#include <stdio.h>

double d = 1.0 / 0.0;    // Inf（正无穷）
double n = -1.0 / 0.0;   // -Inf（负无穷）
double q = 0.0 / 0.0;    // NaN（非数字）

printf("isinf(1.0/0.0)  = %d\n", isinf(d));   // 非零
printf("isnan(0.0/0.0)  = %d\n", isnan(q));   // 非零
```

## 类型转换

### 隐式转换（自动类型提升）

C 在表达式求值时会自动进行类型转换：

```c
int i = 42;
double d = 3.14;
double result = i + d;  // int 被提升为 double，结果是 double

// 整型提升：char/short 在运算中自动提升为 int
char c1 = 100, c2 = 200;
int sum = c1 + c2;  // c1, c2 先提升为 int，再相加
```

### 显式转换（强制类型转换）

```c
int x = 3;
int y = 2;
double ratio = (double)x / y;  // 1.5
// 如果不强转：x / y = 1（整数除法截断），再赋给 double 变成 1.0

// 截断
double pi = 3.14159;
int truncated = (int)pi;  // 3（直接截断小数部分，不是四舍五入）
```

## 字面量后缀

```c
unsigned long x = 123456789UL;   // unsigned long
long long y = 9876543210LL;      // long long
float f = 3.14f;                  // float（默认浮点字面量是 double）
double d = 3.14;                  // double

// 整型字面量的不同进制
int dec = 255;       // 十进制
int oct = 0377;      // 八进制（以 0 开头）
int hex = 0xFF;      // 十六进制（以 0x 开头）
int bin = 0b11111111; // 二进制（C23，GCC/Clang 扩展支持）
```

## 整型溢出

有符号整型溢出是**未定义行为**（Undefined Behavior），编译器可以做任何处理：

```c
#include <stdio.h>
#include <limits.h>
#include <stdint.h>

int main(void) {
    int8_t a = 127;
    a = a + 1;         // 有符号溢出：未定义行为！
    printf("%d\n", a); // 实际输出 -128（回绕），但这不可靠

    uint8_t b = 255;
    b = b + 1;         // 无符号溢出：定义为回绕到 0
    printf("%u\n", b); // 输出 0（保证行为）

    // 安全的溢出检测
    if (a > INT8_MAX - 1) {
        printf("会溢出\n");
    }
    return 0;
}
```

::: warning 编译器会利用 UB 做优化
现代编译器假设有符号整型不会溢出，以此进行优化。如果代码逻辑依赖有符号溢出的回绕行为，编译器可能生成错误的代码。使用 `-fwrapv` 可以让有符号溢出也定义为回绕，但更好的做法是主动检测溢出。
:::
