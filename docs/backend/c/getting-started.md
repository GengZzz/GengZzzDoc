# 程序设计与 C 语言

C 语言诞生于 1972 年，由 Dennis Ritchie 在贝尔实验室开发，最初用于重写 UNIX 操作系统。它简洁、高效、贴近硬件，至今仍是系统编程领域的核心语言。

## 编译执行流程

C 是编译型语言，源代码需要经过四个阶段才能变成可执行程序：

<CppCompileFlow />

```c
// hello.c — 一个最小的 C 程序
#include <stdio.h>

int main(void) {
    printf("Hello, World!\n");
    return 0;
}
```

### 预处理（Preprocessing）

`gcc -E hello.c -o hello.i`

预处理器展开 `#include`、替换宏定义、处理条件编译指令。输出仍然是 C 源码，但所有 `#` 开头的指令已被处理。你可以打开 `hello.i` 查看 `<stdio.h` 被展开后有上千行。

### 编译（Compilation）

`gcc -S hello.i -o hello.s`

编译器将 C 源码翻译为汇编代码。这一阶段会进行词法分析、语法分析、语义检查、优化。如果代码有语法错误，在这一步就会报错。

### 汇编（Assembly）

`gcc -c hello.s -o hello.o`

汇编器将汇编代码转为机器码，生成目标文件（object file）。目标文件是二进制格式，包含机器指令和符号表，但还不能独立运行。

### 链接（Linking）

`gcc hello.o -o hello`

链接器将目标文件与库文件合并，解析所有符号引用，生成最终的可执行文件。`printf` 函数的实现在 C 标准库中，链接器在这一步将其接入。

::: tip 一步到位
实际开发中 `gcc hello.c -o hello` 一条命令完成全部四个阶段。`-E`、`-S`、`-c` 选项用于分步观察。
:::

## main 函数

```c
// 两种常见写法
int main(void)           // 不接受命令行参数
int main(int argc, char *argv[])  // 接受命令行参数
```

- `argc`（argument count）：命令行参数个数，包含程序名本身
- `argv`（argument vector）：参数字符串数组，`argv[0]` 是程序名

```c
#include <stdio.h>

int main(int argc, char *argv[]) {
    printf("程序名: %s\n", argv[0]);
    printf("参数个数: %d\n", argc);
    for (int i = 1; i < argc; i++) {
        printf("argv[%d] = %s\n", i, argv[i]);
    }
    return 0;
}
```

```bash
gcc args.c -o args
./args hello world 42
# 程序名: ./args
# 参数个数: 4
# argv[1] = hello
# argv[2] = world
# argv[3] = 42
```

## return 值的含义

`main` 函数的返回值传递给操作系统，称为**退出状态码**（exit status）：

- `return 0`：程序正常结束
- 非零值：程序异常结束，不同值可表示不同错误

```bash
./hello
echo $?   # 查看上一个程序的退出状态码，输出 0
```

在 shell 脚本中可以利用这个值判断程序是否成功执行：

```bash
gcc build.c -o build
if [ $? -eq 0 ]; then
    echo "编译成功"
else
    echo "编译失败"
fi
```

## 标准输入输出

C 标准库提供三个预定义的流：

| 流 | 文件指针 | 文件描述符 | 默认关联 |
| --- | --- | --- | --- |
| 标准输入 | `stdin` | 0 | 键盘 |
| 标准输出 | `stdout` | 1 | 终端 |
| 标准错误 | `stderr` | 2 | 终端 |

```c
#include <stdio.h>

int main(void) {
    int age;
    printf("请输入年龄: ");          // 输出到 stdout
    scanf("%d", &age);               // 从 stdin 读取
    fprintf(stderr, "调试: age=%d\n", age); // 输出到 stderr
    printf("你 %d 岁了\n", age);
    return 0;
}
```

::: warning printf 不会自动刷新缓冲区
`stdout` 默认是行缓冲的。如果 `printf` 的格式字符串不以 `\n` 结尾，输出可能不会立即显示。在需要即时输出时，可以调用 `fflush(stdout)` 强制刷新。
:::
