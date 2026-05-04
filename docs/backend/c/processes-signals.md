# 进程与信号

POSIX 系统中，进程是资源分配的基本单位，信号是进程间通信的最简单方式。理解 fork/exec/wait 模型和信号处理，是系统编程的基础。

## 进程基础

### 进程查看

```bash
ps aux              # 查看所有进程
ps -ef --forest     # 树状显示进程关系
top                 # 实时监控进程
/proc/<pid>/status  # 进程详细信息（Linux）
```

每个进程有唯一的 **PID**（Process ID），父进程的 PID 称为 **PPID**。

```c
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("PID:  %d\n", getpid());
    printf("PPID: %d\n", getppid());
    return 0;
}
```

## fork 创建进程

`fork()` 创建当前进程的副本（子进程），父子进程从 `fork()` 返回处继续执行：

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    printf("fork 前: PID=%d\n", getpid());

    pid_t pid = fork();

    if (pid < 0) {
        perror("fork");
        return 1;
    } else if (pid == 0) {
        // 子进程：fork 返回 0
        printf("子进程: PID=%d, PPID=%d\n", getpid(), getppid());
    } else {
        // 父进程：fork 返回子进程的 PID
        printf("父进程: PID=%d, 子PID=%d\n", getpid(), pid);
    }

    // 父子进程都会执行到这里
    printf("结束: PID=%d\n", getpid());
    return 0;
}
```

::: tip fork 的写时复制
现代操作系统使用**写时复制**（Copy-on-Write）优化 `fork`。父子进程共享物理内存页，只有当某一方写入时才复制。这使得 `fork` 的开销很小。
:::

### fork 的常见问题

```c
// 问题 1：fork 炸弹 — 创建 2^n 个进程
for (int i = 0; i < 20; i++) {
    fork();  // 每次 fork 翻倍！
}

// 问题 2：忘记 wait，子进程变僵尸进程
pid_t pid = fork();
if (pid > 0) {
    // 父进程没有调用 wait/waitpid
    // 子进程结束后成为僵尸进程（zombie）
}
```

## exec 函数族

`exec` 用新的程序替换当前进程映像。进程 PID 不变，但代码和数据被完全替换：

```c
#include <unistd.h>
#include <stdio.h>

int main(void) {
    printf("开始执行 ls...\n");

    // execlp：在 PATH 中搜索命令，参数逐个传递
    execlp("ls", "ls", "-la", "/tmp", NULL);
    // 如果 exec 成功，不会返回！下面的代码不会执行

    perror("exec 失败");  // 只有失败才会到这里
    return 1;
}
```

### exec 家族

| 函数 | 命令搜索 | 参数传递 |
| --- | --- | --- |
| `execl` | 完整路径 | 可变参数列表 |
| `execlp` | 搜索 PATH | 可变参数列表 |
| `execle` | 完整路径 | 可变参数 + 环境变量 |
| `execv` | 完整路径 | 参数数组 |
| `execvp` | 搜索 PATH | 参数数组 |
| `execvpe` | 搜索 PATH | 参数数组 + 环境变量 |

记忆规则：`l`=list（可变参数），`v`=vector（数组），`p`=PATH，`e`=environment。

## wait / waitpid

父进程用 `wait` 或 `waitpid` 回收子进程：

```c
#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>

int main(void) {
    pid_t pid = fork();

    if (pid == 0) {
        // 子进程
        printf("子进程工作中...\n");
        sleep(2);
        return 42;  // 退出码 42
    }

    // 父进程等待子进程
    int status;
    pid_t finished = waitpid(pid, &status, 0);

    if (WIFEXITED(status)) {
        printf("子进程 %d 正常退出，退出码 %d\n",
               finished, WEXITSTATUS(status));
    } else if (WIFSIGNALED(status)) {
        printf("子进程 %d 被信号 %d 终止\n",
               finished, WTERMSIG(status));
    }
    return 0;
}
```

## 僵尸进程与孤儿进程

- **僵尸进程**（Zombie）：子进程已结束但父进程未调用 `wait` 回收。子进程的退出状态保存在内核中，PID 被占用。
- **孤儿进程**（Orphan）：父进程先于子进程结束，子进程被 init（PID 1）收养，由 init 负责回收。

```c
// 僵尸进程示例
int main(void) {
    pid_t pid = fork();
    if (pid == 0) {
        return 0;  // 子进程立即退出
    }
    // 父进程不调用 wait，睡眠 30 秒
    // 期间用 ps aux | grep Z 可以看到子进程是僵尸状态
    sleep(30);
    wait(NULL);  // 最终回收
    return 0;
}
```

::: tip 处理僵尸进程
- 始终调用 `wait` / `waitpid` 回收子进程
- 或者设置 `SIGCHLD` 处理函数，使用 `waitpid(-1, NULL, WNOHANG)` 非阻塞回收
- 或者使用 `signal(SIGCHLD, SIG_IGN)` 让内核自动回收（Linux 特有）
:::

## 信号

信号是内核发送给进程的异步通知。常见信号：

| 信号 | 编号 | 默认行为 | 说明 |
| --- | --- | --- | --- |
| SIGINT | 2 | 终止 | Ctrl+C |
| SIGTERM | 15 | 终止 | `kill` 默认信号 |
| SIGKILL | 9 | 终止（不可捕获） | 强制杀死 |
| SIGSEGV | 11 | 终止 + core dump | 段错误 |
| SIGCHLD | 17 | 忽略 | 子进程状态变化 |
| SIGPIPE | 13 | 终止 | 写入已关闭的管道 |
| SIGHUP | 1 | 终止 | 终端关闭 |

### signal（简单方式）

```c
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

volatile sig_atomic_t running = 1;

void handle_sigint(int sig) {
    (void)sig;
    printf("\n收到 SIGINT，准备退出...\n");
    running = 0;
}

int main(void) {
    signal(SIGINT, handle_sigint);

    printf("按 Ctrl+C 退出\n");
    while (running) {
        sleep(1);
    }
    printf("已退出\n");
    return 0;
}
```

### sigaction（推荐方式）

`sigaction` 比 `signal` 更可靠、功能更丰富：

```c
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

void handle(int sig, siginfo_t *info, void *ctx) {
    (void)ctx;
    printf("收到信号 %d，发送者 PID=%d\n", sig, info->si_pid);
}

int main(void) {
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_sigaction = handle;
    sa.sa_flags = SA_SIGINFO;  // 使用 sa_sigaction 而非 sa_handler

    sigaction(SIGTERM, &sa, NULL);

    printf("PID=%d，等待信号...\n", getpid());
    pause();  // 等待信号
    return 0;
}
```

::: warning 信号处理函数的限制
信号处理函数中只能调用**异步信号安全**（async-signal-safe）的函数。`printf`、`malloc`、`free` 等都不是异步信号安全的。`write` 是安全的。实际项目中通常只在处理函数中设置 `volatile sig_atomic_t` 标志。
:::

## 管道通信

管道是进程间通信（IPC）的基本方式，提供单向数据流：

```c
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>

int main(void) {
    int pipefd[2];  // pipefd[0] 读端, pipefd[1] 写端

    if (pipe(pipefd) < 0) {
        perror("pipe");
        return 1;
    }

    pid_t pid = fork();
    if (pid == 0) {
        // 子进程：读取管道
        close(pipefd[1]);  // 关闭写端

        char buf[256];
        ssize_t n = read(pipefd[0], buf, sizeof(buf) - 1);
        if (n > 0) {
            buf[n] = '\0';
            printf("子进程收到: %s\n", buf);
        }
        close(pipefd[0]);
    } else {
        // 父进程：写入管道
        close(pipefd[0]);  // 关闭读端

        const char *msg = "Hello from parent!";
        write(pipefd[1], msg, strlen(msg));
        close(pipefd[1]);

        wait(NULL);  // 等待子进程
    }
    return 0;
}
```

::: tip 管道的特性
- 半双工：数据只能单向流动
- 只能用于有亲缘关系的进程（父子、兄弟）
- 管道大小通常 64KB（Linux），满了 `write` 会阻塞
- 读端关闭后写端会产生 SIGPIPE 信号
:::
