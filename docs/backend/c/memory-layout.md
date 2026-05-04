# 内存布局

理解程序的地址空间布局是理解指针、栈溢出、堆溢出和段错误的基础。每个 C 程序运行时，操作系统为其映射一块虚拟地址空间。

## 程序地址空间

从低地址到高地址，典型的进程地址空间布局：

```
高地址  0xFFFFFFFF (32-bit)
┌──────────────────┐
│   内核空间        │  用户代码不可访问
├──────────────────┤
│   Stack (栈)      │  局部变量、函数调用，向下增长 ↓
│        ↓          │
├──────────────────┤
│   (空闲区域)       │
├──────────────────┤
│        ↑          │
│   Heap (堆)       │  malloc 分配，向上增长 ↑
├──────────────────┤
│   BSS 段          │  未初始化的全局/静态变量（自动清零）
├──────────────────┤
│   .data 段        │  已初始化的全局/静态变量
├──────────────────┤
│   .rodata 段      │  只读数据（字符串常量、const 变量）
├──────────────────┤
│   .text 段        │  程序机器指令（只读、可执行）
└──────────────────┘
低地址  0x00000000
```

<CMemoryLayoutDemo />

```c
#include <stdio.h>

int global_init = 42;       // .data 段
int global_uninit;          // BSS 段（自动为 0）
const int READONLY = 100;   // .rodata 段

int main(void) {
    int local = 10;              // 栈
    static int static_var = 5;   // .data 段
    int *heap = malloc(sizeof(int));  // 堆

    printf("代码段:   %p\n", (void *)main);           // 最低
    printf("只读数据: %p\n", (void *)&READONLY);
    printf("已初始化: %p\n", (void *)&global_init);
    printf("BSS:     %p\n", (void *)&global_uninit);
    printf("堆:      %p\n", (void *)heap);
    printf("栈:      %p\n", (void *)&local);          // 最高（用户空间）

    free(heap);
    return 0;
}
```

::: tip 验证地址布局
在 Linux 上运行上面的代码，可以看到 `.text` < `.rodata` < `.data` < `BSS` < `heap` < `stack` 的顺序。也可以查看 `/proc/<pid>/maps` 文件获取完整的内存映射。
:::

## 栈帧结构

每次函数调用在栈上创建一个**栈帧**（stack frame），也叫活动记录（activation record）：

```
高地址
┌──────────────────────┐
│  main() 的栈帧        │
│  ┌──────────────────┐│
│  │ 局部变量 a = 10  ││
│  │ 返回地址          ││
│  │ 保存的 ebp        ││
│  └──────────────────┘│
├──────────────────────┤
│  func() 的栈帧        │
│  ┌──────────────────┐│
│  │ 参数 x = 10      ││  ← 调用者传入
│  │ 返回地址          ││  ← func 执行完后跳回 main
│  │ 保存的 ebp        ││  ← 保存 main 的栈帧基址
│  │ 局部变量 tmp      ││
│  └──────────────────┘│
├──────────────────────┤
│  callee() 的栈帧      │
│  ...                  │
└──────────────────────┘
低地址
```

栈帧包含：
- **函数参数**（x86-64 中前 6 个通过寄存器传递，多余的压栈）
- **返回地址**：函数执行完后跳转回去的地址
- **保存的基址指针**（saved base pointer）
- **局部变量**

```c
#include <stdio.h>

void inner(void) {
    int x = 42;
    printf("inner: &x = %p\n", (void *)&x);
}

void outer(void) {
    int y = 10;
    inner();
    printf("outer: &y = %p\n", (void *)&y);
}

int main(void) {
    int z = 1;
    outer();
    printf("main: &z = %p\n", (void *)&z);
    return 0;
}
// 输出的地址：&x < &y < &z（栈向下增长）
```

::: warning 栈大小有限
默认栈大小通常 1-8 MB（Linux 默认 8 MB，可通过 `ulimit -s` 查看）。递归太深或在栈上分配大数组会导致栈溢出。大数组应该用 `malloc` 在堆上分配。
:::

## 缓冲区溢出原理

缓冲区溢出是最经典的安全漏洞，原理是向栈上写入超过分配大小的数据，覆盖返回地址或相邻变量：

```c
#include <stdio.h>
#include <string.h>

void vulnerable(void) {
    char buf[8];
    int secret = 42;

    // 危险！如果输入超过 7 个字符，会覆盖 buf 之后的内存
    // 可能覆盖 secret 变量，甚至返回地址
    gets(buf);  // 永远不要使用 gets()！

    printf("buf = %s\n", buf);
    printf("secret = %d\n", secret);
}

int main(void) {
    vulnerable();
    return 0;
}
```

```
栈上布局：
[buf: 8 字节] [secret: 4 字节] [保存的 ebp: 8 字节] [返回地址: 8 字节]
  ↑ 输入 "AAAAAAAABBBBBBBB" 会依次覆盖 secret、ebp、返回地址
```

::: warning gets 已经被移除
`gets()` 在 C11 中被正式移除。始终使用 `fgets(buf, sizeof(buf), stdin)` 替代。类似地，使用 `strncpy` 代替 `strcpy`，`snprintf` 代替 `sprintf`。
:::

### 防护机制

现代编译器和操作系统提供多种防护：

| 机制 | 说明 |
| --- | --- |
| 栈保护（Stack Canaries） | `-fstack-protector` 在栈帧中插入随机值，溢出时检测到被修改就终止程序 |
| ASLR | 地址空间布局随机化，每次运行地址不同，增加攻击难度 |
| NX / DEP | 栈不可执行，即使覆盖了返回地址也无法直接执行注入的代码 |
| `-D_FORTIFY_SOURCE` | 编译时检查缓冲区操作，对 `memcpy`、`sprintf` 等做边界检查 |
