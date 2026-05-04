# 多线程与同步

POSIX 线程（pthread）是 C 语言中实现并发的标准方式。理解线程创建、同步原语和线程池实现，是编写高性能服务器的基础。

## pthread 基础

### 编译链接

```bash
gcc -pthread thread.c -o thread   # 编译时链接 pthread 库
```

### 线程创建与等待

```c
#include <stdio.h>
#include <pthread.h>

void *worker(void *arg) {
    int id = *(int *)arg;
    printf("线程 %d: 开始工作\n", id);
    // 模拟工作
    for (volatile long i = 0; i < 1000000; i++);
    printf("线程 %d: 工作完成\n", id);
    return NULL;
}

int main(void) {
    pthread_t threads[4];
    int ids[4] = {0, 1, 2, 3};

    // 创建 4 个线程
    for (int i = 0; i < 4; i++) {
        pthread_create(&threads[i], NULL, worker, &ids[i]);
    }

    // 等待所有线程完成
    for (int i = 0; i < 4; i++) {
        pthread_join(threads[i], NULL);
    }

    printf("所有线程完成\n");
    return 0;
}
```

::: warning 线程安全的 printf
`printf` 不是线程安全的（但大多数实现做了基本的锁保护）。多个线程同时 `printf` 可能导致输出交错。需要有序输出时使用互斥锁。
:::

### 线程返回值

```c
void *compute(void *arg) {
    int n = *(int *)arg;
    long sum = 0;
    for (int i = 1; i <= n; i++) sum += i;
    return (void *)sum;  // 返回计算结果
}

// 使用
long result;
pthread_join(thread, (void **)&result);
printf("结果: %ld\n", result);
```

## 互斥锁（pthread_mutex）

互斥锁保护共享数据，确保同一时刻只有一个线程访问：

```c
#include <stdio.h>
#include <pthread.h>

int counter = 0;
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

void *increment(void *arg) {
    int times = *(int *)arg;
    for (int i = 0; i < times; i++) {
        pthread_mutex_lock(&lock);
        counter++;  // 临界区
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    int n = 1000000;

    pthread_create(&t1, NULL, increment, &n);
    pthread_create(&t2, NULL, increment, &n);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);

    printf("counter = %d (期望 %d)\n", counter, 2 * n);
    // 没有锁的话结果会 < 2000000（数据竞争）

    pthread_mutex_destroy(&lock);
    return 0;
}
```

::: warning 不加锁的数据竞争
两个线程同时执行 `counter++` 实际上包含三步：读取 counter、加 1、写回 counter。不加锁时这三个操作可能交叉执行，导致最终结果偏小。这是**数据竞争**（data race），属于未定义行为。
:::

### 死锁

两个线程以不同顺序获取锁会导致死锁：

```c
// 线程 1
pthread_mutex_lock(&lock_a);
pthread_mutex_lock(&lock_b);  // 等待线程 2 释放 lock_b

// 线程 2
pthread_mutex_lock(&lock_b);
pthread_mutex_lock(&lock_a);  // 等待线程 1 释放 lock_a
// 死锁！双方都在等待对方释放锁
```

::: tip 避免死锁
- 所有线程以**相同顺序**获取锁
- 使用 `pthread_mutex_timedlock` 设置超时
- 尽量减少锁的持有时间
- 使用锁层次（lock hierarchy）定义锁的获取顺序
:::

## 条件变量（pthread_cond）

条件变量用于线程间的事件通知：

```c
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

pthread_mutex_t mtx = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;
int ready = 0;

void *producer(void *arg) {
    (void)arg;
    sleep(1);  // 模拟生产

    pthread_mutex_lock(&mtx);
    ready = 1;
    printf("生产者: 数据已就绪\n");
    pthread_cond_signal(&cond);  // 通知一个等待线程
    pthread_mutex_unlock(&mtx);

    return NULL;
}

void *consumer(void *arg) {
    (void)arg;

    pthread_mutex_lock(&mtx);
    while (!ready) {  // 必须用 while，不是 if
        pthread_cond_wait(&cond, &mtx);  // 等待通知
    }
    printf("消费者: 消费数据\n");
    pthread_mutex_unlock(&mtx);

    return NULL;
}

int main(void) {
    pthread_t prod, cons;
    pthread_create(&cons, NULL, consumer, NULL);
    pthread_create(&prod, NULL, producer, NULL);

    pthread_join(prod, NULL);
    pthread_join(cons, NULL);

    pthread_mutex_destroy(&mtx);
    pthread_cond_destroy(&cond);
    return 0;
}
```

::: tip 为什么用 while 不用 if
`pthread_cond_wait` 可能被虚假唤醒（spurious wakeup），即没有 `signal` 也被唤醒。用 `while` 循环检查条件可以正确处理这种情况。这也是 POSIX 标准规定的使用模式。
:::

## 读写锁

读写锁允许多个线程同时读，但写操作独占：

```c
pthread_rwlock_t rwlock = PTHREAD_rwlock_INITIALIZER;

// 读者（多个读者可以同时持有锁）
pthread_rwlock_rdlock(&rwlock);
// 读取共享数据...
pthread_rwlock_unlock(&rwlock);

// 写者（独占锁）
pthread_rwlock_wrlock(&rwlock);
// 修改共享数据...
pthread_rwlock_unlock(&rwlock);
```

适合读多写少的场景（如缓存、配置表）。

## 线程池实现

线程池预先创建一组工作线程，避免频繁创建/销毁线程的开销：

```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

#define POOL_SIZE 4
#define QUEUE_SIZE 64

typedef struct {
    void (*func)(void *);
    void *arg;
} Task;

typedef struct {
    Task queue[QUEUE_SIZE];
    int head, tail, count;
    pthread_mutex_t lock;
    pthread_cond_t not_empty;
    pthread_cond_t not_full;
    int shutdown;
} ThreadPool;

ThreadPool pool;

void pool_init(ThreadPool *p) {
    p->head = p->tail = p->count = 0;
    p->shutdown = 0;
    pthread_mutex_init(&p->lock, NULL);
    pthread_cond_init(&p->not_empty, NULL);
    pthread_cond_init(&p->not_full, NULL);
}

void pool_submit(ThreadPool *p, void (*func)(void *), void *arg) {
    pthread_mutex_lock(&p->lock);
    while (p->count == QUEUE_SIZE && !p->shutdown) {
        pthread_cond_wait(&p->not_full, &p->lock);
    }
    if (p->shutdown) {
        pthread_mutex_unlock(&p->lock);
        return;
    }
    p->queue[p->tail] = (Task){ .func = func, .arg = arg };
    p->tail = (p->tail + 1) % QUEUE_SIZE;
    p->count++;
    pthread_cond_signal(&p->not_empty);
    pthread_mutex_unlock(&p->lock);
}

void *worker_thread(void *arg) {
    ThreadPool *p = (ThreadPool *)arg;
    while (1) {
        pthread_mutex_lock(&p->lock);
        while (p->count == 0 && !p->shutdown) {
            pthread_cond_wait(&p->not_empty, &p->lock);
        }
        if (p->shutdown && p->count == 0) {
            pthread_mutex_unlock(&p->lock);
            break;
        }
        Task task = p->queue[p->head];
        p->head = (p->head + 1) % QUEUE_SIZE;
        p->count--;
        pthread_cond_signal(&p->not_full);
        pthread_mutex_unlock(&p->lock);

        task.func(task.arg);
    }
    return NULL;
}

// 示例任务
void print_task(void *arg) {
    int id = *(int *)arg;
    printf("任务 %d 完成 (线程 %lu)\n", id, (unsigned long)pthread_self());
}

int main(void) {
    pool_init(&pool);

    pthread_t threads[POOL_SIZE];
    for (int i = 0; i < POOL_SIZE; i++) {
        pthread_create(&threads[i], NULL, worker_thread, &pool);
    }

    int ids[20];
    for (int i = 0; i < 20; i++) {
        ids[i] = i;
        pool_submit(&pool, print_task, &ids[i]);
    }

    // 关闭线程池
    pthread_mutex_lock(&pool.lock);
    pool.shutdown = 1;
    pthread_cond_broadcast(&pool.not_empty);
    pthread_mutex_unlock(&pool.lock);

    for (int i = 0; i < POOL_SIZE; i++) {
        pthread_join(threads[i], NULL);
    }

    pthread_mutex_destroy(&pool.lock);
    pthread_cond_destroy(&pool.not_empty);
    pthread_cond_destroy(&pool.not_full);
    return 0;
}
```

## 原子操作（_Atomic）

C11 引入 `_Atomic` 类型和 `<stdatomic.h>`，提供无锁的原子操作：

```c
#include <stdatomic.h>
#include <pthread.h>
#include <stdio.h>

atomic_int counter = ATOMIC_VAR_INIT(0);

void *increment(void *arg) {
    int n = *(int *)arg;
    for (int i = 0; i < n; i++) {
        atomic_fetch_add(&counter, 1);  // 原子加 1
    }
    return NULL;
}

// 原子标志实现自旋锁
atomic_flag spinlock = ATOMIC_FLAG_INIT;

void spin_lock(atomic_flag *flag) {
    while (atomic_flag_test_and_set(flag)) {
        // 自旋等待
    }
}

void spin_unlock(atomic_flag *flag) {
    atomic_flag_clear(flag);
}
```

::: tip 原子操作 vs 互斥锁
- 原子操作：无锁，性能好，适合简单操作（计数器、标志位）
- 互斥锁：适合保护复杂的数据结构（链表、树）
- 原子操作不能保护多步操作（如"检查再修改"）
:::
