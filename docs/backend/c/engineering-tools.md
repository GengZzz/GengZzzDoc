# 构建与调试工具

工程化的 C 项目需要掌握 Makefile 进阶用法、库文件制作、调试技巧和性能分析工具。

## Makefile 进阶

### 变量与规则

```makefile
# 变量定义
CC       = gcc
CFLAGS   = -Wall -Wextra -g -std=c17
LDFLAGS  = -lm -lpthread
SRCDIR   = src
OBJDIR   = obj
SRCS     = $(wildcard $(SRCDIR)/*.c)
OBJS     = $(SRCS:$(SRCDIR)/%.c=$(OBJDIR)/%.o)
TARGET   = myapp

# 默认目标
all: $(TARGET)

# 链接
$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $@ $(LDFLAGS)

# 编译（模式规则）
$(OBJDIR)/%.o: $(SRCDIR)/%.c | $(OBJDIR)
	$(CC) $(CFLAGS) -c $< -o $@

# 创建 obj 目录
$(OBJDIR):
	mkdir -p $(OBJDIR)

# 自动依赖生成
DEPS = $(OBJS:.o=.d)
CFLAGS += -MMD -MP
-include $(DEPS)

clean:
	rm -rf $(OBJDIR) $(TARGET)

.PHONY: all clean
```

### 自动依赖生成

`-MMD -MP` 让编译器自动追踪头文件依赖。当某个 `.h` 文件被修改时，相关的 `.c` 文件会自动重新编译：

```bash
gcc -MMD -MP -c main.c -o main.o
# 同时生成 main.d，内容如：
# main.o: main.c utils.h config.h
# utils.h:
# config.h:
```

::: tip Makefile 中的自动变量
- `$@`：目标文件名
- `$<`：第一个依赖文件名
- `$^`：所有依赖文件名
- `$*`：模式规则中的 % 匹配部分
:::

## 静态库与动态库

### 静态库（.a）

静态库在链接时被完整拷贝到可执行文件中：

```bash
# 编译目标文件（不链接）
gcc -c lib1.c -o lib1.o
gcc -c lib2.c -o lib2.o

# 打包为静态库
ar rcs libmylib.a lib1.o lib2.o

# 使用静态库
gcc main.c -L. -lmylib -o myapp
# 等价于 gcc main.c libmylib.a -o myapp
```

### 动态库（.so）

动态库在运行时加载，多个程序可以共享同一份库的内存映射：

```bash
# 编译为位置无关代码（PIC）
gcc -fPIC -c lib1.c -o lib1.o
gcc -fPIC -c lib2.c -o lib2.o

# 创建动态库
gcc -shared lib1.o lib2.o -o libmylib.so

# 使用动态库
gcc main.c -L. -lmylib -o myapp

# 运行时需要找到 .so 文件
export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH
./myapp

# 或者安装到系统路径
sudo cp libmylib.so /usr/local/lib/
sudo ldconfig
```

::: tip 静态库 vs 动态库
- 静态库：可执行文件独立，不依赖外部库文件，但体积大
- 动态库：多个程序共享，更新库不需要重新编译程序，但需要管理依赖
- 生产环境通常优先使用动态库
:::

### 查看依赖

```bash
ldd myapp              # 查看可执行文件依赖的动态库
nm -D libmylib.so      # 查看动态库导出的符号
objdump -t libmylib.a  # 查看静态库中的符号
```

## GDB 调试技巧

### 核心命令

```bash
# 编译时加 -g
gcc -g -O0 program.c -o program

# GDB 基础
gdb ./program
(gdb) break main           # 函数断点
(gdb) break file.c:42      # 行断点
(gdb) break func if x > 10 # 条件断点
(gdb) run arg1 arg2        # 带参数运行
(gdb) next (n)             # 单步（不进函数）
(gdb) step (s)             # 单步（进函数）
(gdb) finish               # 运行到当前函数返回
(gdb) until 50             # 运行到第 50 行
```

### 检查数据

```bash
(gdb) print var            # 打印变量
(gdb) print *arr@10        # 打印数组前 10 个元素
(gdb) print/x var          # 十六进制输出
(gdb) print struct_var     # 打印整个结构体
(gdb) display var          # 每步自动打印
(gdb) watch var            # 变量值改变时断点
(gdb) info locals          # 所有局部变量
(gdb) info args            # 函数参数
```

### 调试崩溃

```bash
# 启用 core dump
ulimit -c unlimited

# 运行程序，崩溃时生成 core 文件
./program
# 产生 core 文件

# 加载 core 文件
gdb ./program core
(gdb) backtrace (bt)       # 查看调用栈
(gdb) frame 2              # 切换到第 2 帧
(gdb) info locals          # 查看该帧的局部变量
(gdb) print ptr            # 检查指针值
```

### 多线程调试

```bash
(gdb) info threads         # 列出所有线程
(gdb) thread 2             # 切换到线程 2
(gdb) thread apply all bt  # 打印所有线程的调用栈
```

## 性能分析

### gprof（函数级分析）

```bash
# 编译时加 -pg
gcc -pg -g program.c -o program

# 运行程序，自动生成 gmon.out
./program

# 查看分析结果
gprof ./program gmon.out
```

输出包含：
- Flat profile：每个函数的调用次数和耗时
- Call graph：函数调用关系和时间分配

### perf（Linux 系统级分析）

```bash
# 记录性能数据
perf record -g ./program

# 查看报告
perf report

# 实时监控
perf top

# CPU 性能计数器
perf stat ./program
```

::: tip perf 的强大之处
perf 可以分析 CPU 缓存命中率、分支预测失败、上下文切换等硬件级指标，是定位性能瓶颈的终极工具。
:::

### Valgrind Callgrind + KCachegrind

```bash
# 生成调用图
valgrind --tool=callgrind ./program
# 生成 callgrind.out.<pid>

# 可视化（需要 KCachegrind）
kcachegrind callgrind.out.*
```

## 编译优化

### 优化级别

| 选项 | 说明 | 使用场景 |
| --- | --- | --- |
| `-O0` | 无优化（默认） | 开发调试 |
| `-O1` | 基本优化 | |
| `-O2` | 推荐的优化级别 | 生产环境 |
| `-O3` | 激进优化（自动向量化等） | 计算密集型 |
| `-Os` | 优化代码大小 | 嵌入式 |
| `-Ofast` | `-O3` + 违反标准的优化 | 数值计算 |

```bash
gcc -O2 -Wall -g program.c -o program
```

::: warning 优化会改变调试体验
`-O2` 及以上会内联函数、消除死代码、重排指令，导致 GDB 中变量显示为 `<optimized out>`。开发阶段用 `-O0 -g`，发布时切换到 `-O2`。
:::

### 链接时优化（LTO）

```bash
gcc -flto -O2 -c a.c -o a.o
gcc -flto -O2 -c b.c -o b.o
gcc -flto -O2 a.o b.o -o program   # 链接时跨文件优化
```

<CppCompileFlow />

### 实用编译选项速查

```bash
-Wall -Wextra -Wpedantic  # 严格警告
-Werror                   # 警告视为错误
-g                        # 调试信息
-std=c17                  # C 标准版本
-DNDEBUG                  # 关闭 assert
-fsanitize=address        # 地址检查（ASan，运行时检测内存错误）
-fsanitize=undefined      # 未定义行为检查（UBSan）
-fsanitize=thread         # 数据竞争检查（TSan）
-static                   # 静态链接
```

::: tip Sanitizer 比 Valgrind 更快
`-fsanitize=address`（ASan）在编译时插入检查代码，运行速度比 Valgrind 快很多，同样能检测内存越界、use-after-free、内存泄漏。开发和 CI 中推荐使用。
:::
