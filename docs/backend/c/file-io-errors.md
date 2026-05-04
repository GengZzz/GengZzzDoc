# 文件 I/O 与错误处理

C 语言提供两套文件操作接口：标准 I/O（带缓冲）和系统 I/O（无缓冲）。理解它们的区别和正确使用方式，对写出可靠的文件处理代码至关重要。

## 标准 I/O（stdio）

`fopen` / `fread` / `fwrite` / `fclose` 是带缓冲的高层接口：

```c
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(void) {
    FILE *fp = fopen("data.txt", "r");
    if (!fp) {
        fprintf(stderr, "打开失败: %s\n", strerror(errno));
        return 1;
    }

    char buf[256];
    while (fgets(buf, sizeof(buf), fp)) {
        printf("%s", buf);
    }

    if (ferror(fp)) {
        fprintf(stderr, "读取错误\n");
    }

    fclose(fp);
    return 0;
}
```

### 缓冲模式

标准 I/O 有三种缓冲模式：

| 模式 | 触发条件 | 适用场景 |
| --- | --- | --- |
| 全缓冲 | 缓冲区满或调用 `fflush` | 普通磁盘文件（默认） |
| 行缓冲 | 遇到 `\n` 或缓冲区满 | 终端（stdout） |
| 无缓冲 | 立即写入 | stderr |

```c
// 手动刷新缓冲区
fflush(stdout);  // 强制输出缓冲区内容

// 设置自定义缓冲区
char mybuf[4096];
setvbuf(fp, mybuf, _IOFBF, sizeof(mybuf));  // 全缓冲，4KB 缓冲区

// 关闭缓冲
setvbuf(fp, NULL, _IONBF, 0);  // 无缓冲
```

::: warning 缓冲与进程崩溃
如果程序崩溃，缓冲区中未刷新的数据会丢失。写日志文件时，每行后调用 `fflush` 或使用 `setbuf(fp, NULL)` 关闭缓冲。
:::

### fread / fwrite

用于读写二进制数据：

```c
#include <stdio.h>

typedef struct {
    int id;
    double score;
    char name[32];
} Record;

int main(void) {
    Record r = {1, 95.5, "Alice"};

    // 写入
    FILE *fp = fopen("data.bin", "wb");
    fwrite(&r, sizeof(Record), 1, fp);
    fclose(fp);

    // 读取
    Record r2;
    fp = fopen("data.bin", "rb");
    fread(&r2, sizeof(Record), 1, fp);
    fclose(fp);

    printf("id=%d, score=%.1f, name=%s\n", r2.id, r2.score, r2.name);
    return 0;
}
```

::: tip fread 的返回值
`fread` 返回实际读取的元素个数，不是字节数。如果返回值 < 请求的个数，可能是遇到了文件尾或错误。用 `feof` 和 `ferror` 判断具体原因。
:::

## 系统 I/O（unistd）

`open` / `read` / `write` / `close` 是无缓冲的底层 POSIX 接口：

```c
#include <fcntl.h>
#include <unistd.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(void) {
    int fd = open("data.txt", O_RDONLY);
    if (fd < 0) {
        perror("open");
        return 1;
    }

    char buf[4096];
    ssize_t n;
    while ((n = read(fd, buf, sizeof(buf))) > 0) {
        write(STDOUT_FILENO, buf, n);  // 直接写到 stdout
    }

    if (n < 0) {
        perror("read");
    }

    close(fd);
    return 0;
}
```

### 标准 I/O vs 系统 I/O

| 特性 | 标准 I/O | 系统 I/O |
| --- | --- | --- |
| 缓冲 | 带缓冲（减少系统调用） | 无缓冲（每次直接系统调用） |
| 可移植性 | ISO C 标准，跨平台 | POSIX 标准，Unix/Linux |
| 文件描述 | `FILE *` | `int fd` |
| 适用场景 | 普通文件、文本处理 | 需要精确控制、网络 socket、管道 |
| 性能 | 缓冲提升批量读写性能 | 每次 read/write 都是系统调用 |

::: tip 选择建议
默认使用标准 I/O。需要与 socket、pipe 配合使用时，用系统 I/O（`read` / `write` 接受文件描述符）。不要混用同一文件的两套接口。
:::

## 文件定位

```c
FILE *fp = fopen("data.bin", "rb");

// 移动到文件第 100 字节处
fseek(fp, 100, SEEK_SET);

// 从当前位置后退 10 字节
fseek(fp, -10, SEEK_CUR);

// 获取当前位置
long pos = ftell(fp);

// 获取文件大小
fseek(fp, 0, SEEK_END);
long size = ftell(fp);

// 重绕到开头
rewind(fp);

fclose(fp);
```

## 临时文件

```c
#include <stdio.h>

int main(void) {
    // 创建临时文件（自动生成唯一文件名）
    FILE *tmp = tmpfile();
    if (!tmp) {
        perror("tmpfile");
        return 1;
    }

    fprintf(tmp, "临时数据 %d\n", 42);

    // 使用后关闭即自动删除
    fclose(tmp);

    // 或者用 tmpnam 获取文件名（不推荐，有竞争条件）
    // 更安全的替代：mkstemp（POSIX）
    char template[] = "/tmp/myapp_XXXXXX";
    int fd = mkstemp(template);
    if (fd >= 0) {
        // template 现在包含实际文件名
        write(fd, "data", 4);
        close(fd);
        unlink(template);  // 手动删除
    }
    return 0;
}
```

## 错误处理

### errno / strerror / perror

```c
#include <errno.h>
#include <string.h>
#include <stdio.h>

FILE *fp = fopen("missing.txt", "r");
if (!fp) {
    // 方式 1：perror（最简洁）
    perror("fopen");  // 输出: fopen: No such file or directory

    // 方式 2：strerror（灵活，可用于格式化）
    fprintf(stderr, "fopen 失败: %s (errno=%d)\n",
            strerror(errno), errno);

    // errno 被系统调用设置，每个线程有独立副本
    // 成功的函数不会清除 errno，所以只在失败后检查
}
```

::: warning errno 是全局的（每线程）
成功调用不会清除 `errno`。不要在成功操作后检查 `errno`，只在系统调用失败后检查。`strerror_r` 是线程安全版本。
:::
