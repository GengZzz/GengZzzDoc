# 字符串处理

C 语言没有内置的字符串类型，字符串是以 `'\0'`（空字符）结尾的字符数组。这种设计简单高效，但也极易出错。

## C 字符串的本质

```c
// 三种字符串初始化方式
char s1[] = "Hello";       // 栈上数组，大小 6（含 '\0'）
char *s2 = "Hello";        // 指向只读数据区的字符串常量
char s3[10] = "Hello";     // 数组大小 10，前 6 字节有内容

// 区别
sizeof(s1);  // 6
strlen(s1);  // 5（strlen 不计 '\0'）

// s2 指向的是只读内存
s2[0] = 'h';  // 未定义行为！可能段错误
```

::: warning 字符串字面量是只读的
`char *p = "Hello"` 中的 `"Hello"` 存储在 `.rodata` 段。修改它是未定义行为。如果需要修改字符串，使用字符数组 `char p[] = "Hello"`。
:::

## 字符串函数的安全使用

### strcpy vs strncpy

```c
#include <string.h>

char dest[10];

// strcpy：不检查长度，缓冲区溢出风险
strcpy(dest, "This is way too long");  // 溢出！未定义行为

// strncpy：最多复制 n 个字符，但不保证 '\0' 结尾！
strncpy(dest, "Hello", sizeof(dest) - 1);
dest[sizeof(dest) - 1] = '\0';  // 手动添加终止符
```

::: tip strncpy 不自动添加 '\0'
如果源字符串长度 >= n，`strncpy` 不会在末尾添加 `'\0'`。必须手动保证。这也是为什么 `strncpy` 仍然危险。
:::

### 安全的替代方案

```c
// snprintf：最安全的字符串构造方式
char buf[64];
snprintf(buf, sizeof(buf), "Hello %s, age %d", name, age);
// 始终 '\0' 结尾，不会溢出

// 手动实现安全的字符串拷贝
size_t safe_strcpy(char *dest, const char *src, size_t dest_size) {
    if (dest_size == 0) return 0;
    size_t i;
    for (i = 0; i < dest_size - 1 && src[i] != '\0'; i++) {
        dest[i] = src[i];
    }
    dest[i] = '\0';
    return i;
}
```

### 常用字符串函数速查

| 函数 | 功能 | 注意 |
| --- | --- | --- |
| `strlen(s)` | 返回字符串长度 | O(n) 遍历，不含 '\0' |
| `strcpy(d, s)` | 拷贝字符串 | 不检查溢出 |
| `strncpy(d, s, n)` | 最多拷贝 n 字符 | 不保证 '\0' 结尾 |
| `strcat(d, s)` | 追加字符串 | 不检查溢出 |
| `strncat(d, s, n)` | 最多追加 n 字符 | 保证 '\0' 结尾 |
| `strcmp(s1, s2)` | 比较字符串 | 返回 <0, 0, >0 |
| `strncmp(s1, s2, n)` | 比较前 n 字符 | |
| `strstr(hay, needle)` | 子串搜索 | 返回首次出现位置或 NULL |
| `strtok(s, delim)` | 分割字符串 | 修改原字符串！不是线程安全的 |
| `strdup(s)` | 复制字符串 | POSIX，返回 malloc 分配的内存，需 free |

### strtok 的陷阱

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    char input[] = "apple,banana,cherry";

    // strtok 会修改原字符串！将分隔符替换为 '\0'
    char *token = strtok(input, ",");
    while (token) {
        printf("%s\n", token);
        token = strtok(NULL, ",");  // 后续调用传 NULL
    }

    // 此时 input 变成 "apple\0banana\0cherry"
    // 不是线程安全的！多线程使用 strtok_r
    return 0;
}
```

## 宽字符（wchar_t）

`wchar_t` 用于处理多字节字符集，`<wchar.h>` 提供对应的宽字符函数：

```c
#include <wchar.h>
#include <locale.h>

int main(void) {
    setlocale(LC_ALL, "");  // 使用系统 locale

    wchar_t *str = L"Hello, 世界";
    wprintf(L"%ls\n", str);
    wprintf(L"长度: %zu\n", wcslen(str));  // 8 个宽字符

    return 0;
}
```

::: warning wchar_t 的大小因平台而异
Windows 上 `wchar_t` 是 2 字节（UTF-16），Linux 上是 4 字节（UTF-32）。跨平台代码不应依赖 `wchar_t` 的大小。
:::

## UTF-8 处理

UTF-8 是互联网上最常用的编码，C 字符串可以自然存储 UTF-8 字节序列：

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    // UTF-8 字符串存储为 char 数组
    const char *hello = "你好";  // 6 字节（每个中文 3 字节）

    printf("字节长度: %zu\n", strlen(hello));  // 6
    // 注意：strlen 返回字节数，不是字符数！

    // 遍历 UTF-8 字符
    const char *p = hello;
    while (*p) {
        // 简单判断 UTF-8 字符的起始字节
        if ((*p & 0x80) == 0) {
            printf("ASCII: %c\n", *p);
            p += 1;
        } else if ((*p & 0xE0) == 0xC0) {
            printf("2 字节序列\n");
            p += 2;
        } else if ((*p & 0xF0) == 0xE0) {
            printf("3 字节序列（如中文）\n");
            p += 3;
        } else if ((*p & 0xF8) == 0xF0) {
            printf("4 字节序列（如 emoji）\n");
            p += 4;
        }
    }
    return 0;
}
```

::: tip 实际项目建议使用库
手动处理 UTF-8 非常复杂（处理非法序列、组合字符、排序等）。生产项目推荐使用成熟的库：libicu、utf8proc、或简单的 utf8.h（单头文件库）。
:::
