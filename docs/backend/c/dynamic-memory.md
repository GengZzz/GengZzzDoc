# 动态内存管理

`malloc` 和 `free` 看起来简单，但堆内存管理是 C 语言中最容易出 bug 的领域。内存泄漏、double free、use-after-free 是三种最常见的致命错误。

## malloc / calloc / realloc / free

### malloc

在堆上分配指定字节数的内存，内容未初始化：

```c
#include <stdlib.h>

int *arr = malloc(10 * sizeof(int));  // 分配 10 个 int
if (arr == NULL) {
    // 分配失败！必须检查
    perror("malloc");
    return -1;
}

// arr[i] 的值是未初始化的垃圾值
```

### calloc

分配并**清零**内存，接收元素个数和每个元素的大小：

```c
int *arr = calloc(10, sizeof(int));  // 10 个 int，全部初始化为 0
// 等价于 malloc(10 * sizeof(int)) + memset(arr, 0, ...)
```

::: tip malloc vs calloc
需要零初始化时用 `calloc`。`calloc` 还会检查乘法溢出（`nmemb * size`），比手动 `malloc` + `memset` 更安全。
:::

### realloc

调整已分配内存块的大小：

```c
int *arr = malloc(5 * sizeof(int));
// ... 使用 arr ...

// 扩大到 10 个 int
int *tmp = realloc(arr, 10 * sizeof(int));
if (tmp == NULL) {
    // realloc 失败时，原指针 arr 仍然有效！
    free(arr);
    return -1;
}
arr = tmp;  // 更新指针
```

::: warning realloc 的行为
- `realloc(ptr, 0)`：等同于 `free(ptr)` 并返回 `NULL`（或实现定义的值）
- `realloc(NULL, size)`：等同于 `malloc(size)`
- 如果无法原地扩展，`realloc` 会分配新内存并**拷贝旧数据**，旧内存被释放
- 失败时返回 `NULL`，**原内存块不变**
:::

### free

释放动态分配的内存：

```c
free(arr);
arr = NULL;  // 好习惯：释放后置空，避免悬空指针
```

## 堆管理原理

`malloc` / `free` 背后是操作系统的内存管理器（Linux 上是 ptmalloc/glibc allocator，基于 dlmalloc 算法）：

```
用户代码          malloc 库              操作系统
malloc(64)  →  在 free list 中查找    →  brk/sbrk 扩展堆
                                  或  →  mmap 创建映射区域
free(ptr)   →  归还到 free list      →  可选：munmap 释放大块
```

### 内存碎片

频繁分配和释放不同大小的内存块会产生碎片：

```
堆布局（碎片化后）：
[已用 64B] [空闲 32B] [已用 128B] [空闲 16B] [已用 64B] [空闲 48B]
                                     ↑
                  malloc(48) 无法在这里分配（每个空闲块太小）
```

::: tip 减少碎片
- 使用固定大小的内存池（见下文）
- 对象池模式：预分配一组相同大小的块
- 大块内存使用 `mmap` 直接映射，不受堆碎片影响
:::

## 内存池实现

固定大小的内存池避免了 malloc/free 的碎片问题，性能也更可预测：

```c
#include <stdlib.h>
#include <string.h>

#define POOL_BLOCK_SIZE 64
#define POOL_BLOCK_COUNT 1024

typedef struct {
    char   memory[POOL_BLOCK_COUNT][POOL_BLOCK_SIZE];
    int    free_list[POOL_BLOCK_COUNT];  // 空闲索引栈
    int    free_top;                     // 栈顶
} Pool;

void pool_init(Pool *pool) {
    pool->free_top = POOL_BLOCK_COUNT;
    for (int i = 0; i < POOL_BLOCK_COUNT; i++) {
        pool->free_list[i] = i;
    }
}

void *pool_alloc(Pool *pool) {
    if (pool->free_top <= 0) return NULL;  // 池耗尽
    int idx = pool->free_list[--pool->free_top];
    return pool->memory[idx];
}

void pool_free(Pool *pool, void *ptr) {
    // 验证指针属于池
    char *p = (char *)ptr;
    if (p < (char *)pool->memory ||
        p >= (char *)pool->memory + sizeof(pool->memory)) {
        return;  // 不是这个池分配的
    }
    int idx = (int)(p - (char *)pool->memory) / POOL_BLOCK_SIZE;
    pool->free_list[pool->free_top++] = idx;
}
```

## 常见错误

### Double Free（重复释放）

```c
int *p = malloc(sizeof(int));
free(p);
free(p);  // 未定义行为！可能破坏堆管理器的内部数据结构
```

### Use After Free（释放后使用）

```c
int *p = malloc(sizeof(int));
*p = 42;
free(p);
printf("%d\n", *p);  // 未定义行为！内存可能已被重新分配
```

### 内存泄漏

```c
void leak(void) {
    int *p = malloc(1024);
    // 忘记 free(p)，函数返回后无法再释放
    // 每次调用 leak() 泄漏 1024 字节
}
```

### 缓冲区越界

```c
int *arr = malloc(5 * sizeof(int));
arr[5] = 100;  // 越界！arr 只有 0-4 有效下标
               // 可能覆盖堆管理器的元数据，导致后续 malloc/free 崩溃
```

::: warning 越界写入是最危险的
堆越界写入可能破坏 malloc 的内部控制结构，导致后续的 malloc 或 free 出现不可预测的行为，甚至被利用为安全漏洞。
:::

## Valgrind 检测

```bash
# 编译时加 -g 保留调试信息
gcc -g -Wall leak.c -o leak

# 运行 Valgrind
valgrind --leak-check=full --show-leak-kinds=all ./leak
```

典型错误报告：

```
==12345== Invalid read of size 4           # 读取已释放的内存
==12345== Invalid write of size 4          # 写入已释放的内存
==12345== Conditional jump depends on uninitialised value  # 使用未初始化值
==12345== 1,024 bytes in 1 blocks are definitely lost     # 内存泄漏
```

::: tip 工作流
开发阶段始终使用 `valgrind` 运行程序。CI 中也可以加入 Valgrind 检查，发现内存问题立即阻断流水线。
:::
