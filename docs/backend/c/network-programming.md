# 网络编程

POSIX socket API 是 C 语言网络编程的基础。TCP 服务器模型、IO 多路复用（epoll）和非阻塞 IO 是构建高性能网络服务的核心技术。

## Socket API

### 创建与配置

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    // 1. 创建 socket
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        perror("socket");
        return 1;
    }

    // 2. 允许地址复用（避免 TIME_WAIT 状态导致 bind 失败）
    int opt = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    // 3. 绑定地址
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(8080);           // 主机字节序转网络字节序
    addr.sin_addr.s_addr = htonl(INADDR_ANY);  // 监听所有接口

    if (bind(sockfd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(sockfd);
        return 1;
    }

    // 4. 开始监听
    if (listen(sockfd, 128) < 0) {  // backlog = 128
        perror("listen");
        close(sockfd);
        return 1;
    }

    printf("服务器监听端口 8080...\n");

    close(sockfd);
    return 0;
}
```

<CSocketCommDemo />

### TCP 服务器模型

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <signal.h>
#include <sys/wait.h>

void handle_client(int connfd) {
    char buf[1024];
    ssize_t n;

    while ((n = read(connfd, buf, sizeof(buf) - 1)) > 0) {
        buf[n] = '\0';
        printf("收到: %s", buf);

        // 回显
        write(connfd, buf, n);
    }

    close(connfd);
}

void sigchld_handler(int sig) {
    (void)sig;
    // 非阻塞回收所有已结束的子进程
    while (waitpid(-1, NULL, WNOHANG) > 0);
}

int main(void) {
    signal(SIGCHLD, sigchld_handler);

    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(8080),
        .sin_addr.s_addr = htonl(INADDR_ANY)
    };

    bind(sockfd, (struct sockaddr *)&addr, sizeof(addr));
    listen(sockfd, 128);

    printf("回显服务器监听 :8080\n");

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);

        int connfd = accept(sockfd, (struct sockaddr *)&client_addr, &client_len);
        if (connfd < 0) {
            perror("accept");
            continue;
        }

        printf("新连接: %s:%d\n",
               inet_ntoa(client_addr.sin_addr),
               ntohs(client_addr.sin_port));

        // 每个连接 fork 一个子进程处理
        pid_t pid = fork();
        if (pid == 0) {
            close(sockfd);  // 子进程不需要监听 socket
            handle_client(connfd);
            _exit(0);
        }
        close(connfd);  // 父进程不需要连接 socket
    }
    return 0;
}
```

### TCP 客户端

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);

    struct sockaddr_in server_addr = {
        .sin_family = AF_INET,
        .sin_port = htons(8080)
    };
    inet_pton(AF_INET, "127.0.0.1", &server_addr.sin_addr);

    if (connect(sockfd, (struct sockaddr *)&server_addr,
                sizeof(server_addr)) < 0) {
        perror("connect");
        close(sockfd);
        return 1;
    }

    // 发送数据
    const char *msg = "Hello Server!\n";
    write(sockfd, msg, strlen(msg));

    // 接收回显
    char buf[1024];
    ssize_t n = read(sockfd, buf, sizeof(buf) - 1);
    if (n > 0) {
        buf[n] = '\0';
        printf("服务器回显: %s", buf);
    }

    close(sockfd);
    return 0;
}
```

::: warning TCP 是字节流协议
TCP 不保留消息边界。发送两次 "Hello" 和 "World"，接收端可能一次收到 "HelloWorld"，也可能分三次收。应用层需要自己定义消息边界（如换行符分隔、长度前缀）。
:::

## UDP 通信

UDP 无连接、不可靠，但延迟低、开销小：

```c
// UDP 服务端
#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int main(void) {
    int sockfd = socket(AF_INET, SOCK_DGRAM, 0);

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(9090),
        .sin_addr.s_addr = htonl(INADDR_ANY)
    };

    bind(sockfd, (struct sockaddr *)&addr, sizeof(addr));

    char buf[1024];
    struct sockaddr_in client;
    socklen_t client_len = sizeof(client);

    while (1) {
        ssize_t n = recvfrom(sockfd, buf, sizeof(buf), 0,
                             (struct sockaddr *)&client, &client_len);
        if (n > 0) {
            buf[n] = '\0';
            printf("收到: %s\n", buf);
            // 回复
            sendto(sockfd, buf, n, 0,
                   (struct sockaddr *)&client, client_len);
        }
    }

    close(sockfd);
    return 0;
}
```

::: tip TCP vs UDP 选择
- TCP：需要可靠传输（HTTP、文件传输、数据库连接）
- UDP：能容忍丢包但需要低延迟（视频直播、DNS 查询、游戏同步）
:::

## IO 多路复用

单线程同时监控多个 socket 的可读/可写状态，避免为每个连接创建一个线程。

### select

```c
#include <sys/select.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

#define MAX_CLIENTS FD_SETSIZE  // 通常 1024

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = { .sin_family = AF_INET, .sin_port = htons(8080),
                                 .sin_addr.s_addr = htonl(INADDR_ANY) };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 128);

    int clients[MAX_CLIENTS];
    int max_fd = server_fd;
    fd_set readfds;

    memset(clients, 0, sizeof(clients));

    while (1) {
        FD_ZERO(&readfds);
        FD_SET(server_fd, &readfds);

        for (int i = 0; i < MAX_CLIENTS; i++) {
            if (clients[i] > 0) {
                FD_SET(clients[i], &readfds);
                if (clients[i] > max_fd) max_fd = clients[i];
            }
        }

        int ready = select(max_fd + 1, &readfds, NULL, NULL, NULL);

        if (FD_ISSET(server_fd, &readfds)) {
            int conn = accept(server_fd, NULL, NULL);
            for (int i = 0; i < MAX_CLIENTS; i++) {
                if (clients[i] == 0) { clients[i] = conn; break; }
            }
        }

        for (int i = 0; i < MAX_CLIENTS; i++) {
            if (clients[i] > 0 && FD_ISSET(clients[i], &readfds)) {
                char buf[1024];
                ssize_t n = read(clients[i], buf, sizeof(buf));
                if (n <= 0) {
                    close(clients[i]);
                    clients[i] = 0;
                } else {
                    write(clients[i], buf, n);  // 回显
                }
            }
        }
    }
    return 0;
}
```

### epoll（Linux 高性能方案）

`epoll` 是 Linux 上最高效的 IO 多路复用机制，适合大量并发连接：

```c
#include <sys/epoll.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

void set_nonblocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    set_nonblocking(server_fd);

    struct sockaddr_in addr = { .sin_family = AF_INET, .sin_port = htons(8080),
                                 .sin_addr.s_addr = htonl(INADDR_ANY) };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 128);

    // 创建 epoll 实例
    int epfd = epoll_create1(0);

    struct epoll_event ev = { .events = EPOLLIN, .data.fd = server_fd };
    epoll_ctl(epfd, EPOLL_CTL_ADD, server_fd, &ev);

    struct epoll_event events[1024];

    while (1) {
        int nfds = epoll_wait(epfd, events, 1024, -1);

        for (int i = 0; i < nfds; i++) {
            if (events[i].data.fd == server_fd) {
                // 新连接
                int conn = accept(server_fd, NULL, NULL);
                set_nonblocking(conn);
                ev.events = EPOLLIN | EPOLLET;  // 边缘触发
                ev.data.fd = conn;
                epoll_ctl(epfd, EPOLL_CTL_ADD, conn, &ev);
            } else {
                // 数据到达
                int fd = events[i].data.fd;
                char buf[4096];
                ssize_t n = read(fd, buf, sizeof(buf));
                if (n <= 0) {
                    close(fd);
                    epoll_ctl(epfd, EPOLL_CTL_DEL, fd, NULL);
                } else {
                    write(fd, buf, n);  // 回显
                }
            }
        }
    }

    close(epfd);
    close(server_fd);
    return 0;
}
```

### select / poll / epoll 对比

| 特性 | select | poll | epoll |
| --- | --- | --- | --- |
| fd 数量限制 | FD_SETSIZE (1024) | 无限制 | 无限制 |
| 检测方式 | 遍历所有 fd | 遍历所有 fd | 内核通知就绪 fd |
| 时间复杂度 | O(n) | O(n) | O(1)（就绪 fd 数） |
| fd 集合 | 每次重新设置 | 每次重新设置 | 注册一次，持久化 |
| 平台 | 跨平台 | 跨平台 | Linux only |

::: tip 实际选型
- 跨平台或 fd 数量少（< 100）：select / poll
- Linux + 大量并发（数千连接）：epoll
- macOS / BSD：kqueue（类似 epoll）
- 生产环境通常使用 libevent、libuv 等封装库
:::
