# 判断与循环

控制流决定了程序的执行路径。除了基本的 if/for 用法，switch 的 fall-through 陷阱和 goto 的合法用途是容易忽略的知识点。

## 条件判断

### if / else if / else

```c
#include <stdio.h>

int main(void) {
    int score = 85;

    if (score >= 90) {
        printf("A\n");
    } else if (score >= 80) {
        printf("B\n");
    } else if (score >= 70) {
        printf("C\n");
    } else {
        printf("D\n");
    }
    return 0;
}
```

::: warning 悬空 else
`else` 与最近的未匹配 `if` 配对。始终使用花括号消除歧义：

```c
if (a)
    if (b)
        do_something();
    else  // 这个 else 属于 if(b)，不是 if(a)!
        do_other();
```
:::

### 三元运算符

```c
int max = (a > b) ? a : b;

// 适合简单的二选一赋值，不要嵌套使用
int result = (x > 0) ? 1 : ((x < 0) ? -1 : 0);  // 嵌套可读性差
```

## switch 语句

### 基本用法

```c
#include <stdio.h>

int main(void) {
    char grade = 'B';

    switch (grade) {
        case 'A':
            printf("优秀\n");
            break;
        case 'B':
            printf("良好\n");
            break;
        case 'C':
            printf("及格\n");
            break;
        default:
            printf("未知\n");
            break;
    }
    return 0;
}
```

### Fall-through 陷阱

`switch` 的每个 `case` 标签只是一个跳转目标，**不自动终止**。没有 `break` 会继续执行下一个 case：

```c
int x = 1;
switch (x) {
    case 1:
        printf("one\n");    // 输出
        // 缺少 break！
    case 2:
        printf("two\n");    // 也会输出！
        break;
    case 3:
        printf("three\n");  // 不会输出
}
// 输出: one  two
```

::: tip 有意的 fall-through
如果确实需要 fall-through（比如多个 case 共享逻辑），用注释标记意图：
```c
case 'a':
case 'e':
    // 故意穿透：元音字母共用逻辑
    is_vowel = 1;
    break;
```
C17 开启 `-Wimplicit-fallthrough` 警告可以捕获遗漏的 break。
:::

### switch 的限制

`switch` 的表达式必须是整型（`char`、`short`、`int`、`long`、`enum`），不能是 `float`、`double` 或字符串。`case` 标签必须是编译时常量。

## 循环

### for 循环

```c
// 标准 for 循环
for (int i = 0; i < 10; i++) {
    printf("%d ", i);
}

// 三个表达式都可以省略（但分号不能省）
for (;;) {  // 无限循环
    break;
}
```

### while 循环

```c
// 当条件为真时重复执行
int n = 1024;
int bits = 0;
while (n > 0) {
    bits++;
    n /= 2;
}
printf("需要 %d 位\n", bits);  // 11
```

### do-while 循环

```c
// 至少执行一次，然后检查条件
int input;
do {
    printf("输入 1-10: ");
    scanf("%d", &input);
} while (input < 1 || input > 10);
```

`do-while` 常用于封装带副作用的宏：

```c
// 经典的 LOG 宏，用 do-while(0) 包裹
#define LOG(msg) do { \
    printf("[LOG] "); \
    printf(msg); \
    printf("\n"); \
} while (0)
```

## goto 的合法用途

`goto` 在日常逻辑中应避免，但在**错误清理**模式中有其不可替代的价值：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int init_system(void) {
    FILE *log = fopen("app.log", "a");
    if (!log) return -1;

    char *buf = malloc(1024);
    if (!buf) goto cleanup_log;

    int *counts = calloc(256, sizeof(int));
    if (!counts) goto cleanup_buf;

    // 正常逻辑...
    printf("初始化成功\n");

    free(counts);
    free(buf);
    fclose(log);
    return 0;

    // 错误清理路径（逆序释放）
cleanup_buf:
    free(buf);
cleanup_log:
    fclose(log);
    return -1;
}
```

这种模式在 Linux 内核代码中广泛使用。如果用嵌套 if-else 实现同样的逻辑，会形成多层嵌套，可读性更差。

::: tip goto 只用于向前跳转
`goto` 的使用原则：只在同一个函数内向前跳转（向代码下方跳），用于统一的错误清理。永远不要用 `goto` 实现循环或跨函数跳转。
:::
