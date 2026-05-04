# 开工环境搭建

工欲善其事，必先利其器。C 语言开发需要编译器、编辑器、构建工具和调试器四件套。

## 编译器选择

### GCC（GNU Compiler Collection）

Linux 上最常用的 C 编译器，也是大多数发行版的默认编译器。

```bash
# Ubuntu / Debian
sudo apt install build-essential

# CentOS / RHEL
sudo yum groupinstall "Development Tools"

# macOS
xcode-select --install   # 安装 Apple Clang（GCC 的别名）

# 验证
gcc --version
```

### Clang / LLVM

Clang 是 LLVM 项目的 C/C++/Objective-C 编译器，错误信息比 GCC 更友好，编译速度通常更快。

```bash
# Ubuntu
sudo apt install clang

# macOS 自带 Clang
clang --version
```

::: tip GCC vs Clang
两者都完整支持 C11/C17 标准。日常开发任选其一即可。交叉验证时可以两个都编译一遍，能发现更多潜在问题。生产环境通常使用 GCC，开源社区工具链对 GCC 支持更成熟。
:::

### MSVC（Windows）

Windows 平台可以安装 Visual Studio Community 版本，自带 MSVC 编译器。也可以使用 MinGW-w64 获取 GCC 的 Windows 移植版。

## VS Code 配置

VS Code 是轻量级但功能强大的编辑器，通过插件可以搭建完整的 C 开发环境。

### 必装插件

- **C/C++**（Microsoft）：代码补全、跳转定义、调试支持
- **C/C++ Extension Pack**：打包安装常用 C 开发插件
- **Code Runner**：一键编译运行单文件

### 配置文件

`.vscode/c_cpp_properties.json` — 配置 IntelliSense：

```json
{
  "configurations": [
    {
      "name": "Linux",
      "compilerPath": "/usr/bin/gcc",
      "cStandard": "c17",
      "intelliSenseMode": "linux-gcc-x64",
      "includePath": ["${workspaceFolder}/**"]
    }
  ],
  "version": 4
}
```

`.vscode/tasks.json` — 配置编译任务：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "gcc",
      "args": ["-Wall", "-Wextra", "-g", "${file}", "-o", "${fileDirname}/${fileBasenameNoExtension}"],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

::: warning 编译选项很重要
始终使用 `-Wall -Wextra` 开启所有警告。很多段错误和未定义行为的根源，编译器会在警告中提示。`-g` 选项生成调试信息，GDB 调试时必不可少。
:::

## CMake 入门

CMake 是最流行的跨平台 C/C++ 构建系统。单文件可以用 `gcc` 直接编译，多文件项目推荐使用 CMake。

### 最小 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.10)
project(myapp C)

set(CMAKE_C_STANDARD 17)

add_executable(myapp main.c utils.c)
```

### 构建流程

```bash
mkdir build && cd build
cmake ..
make          # 或 cmake --build .
./myapp
```

### 多目录项目

```
project/
├── CMakeLists.txt
├── src/
│   ├── main.c
│   └── network.c
├── include/
│   └── network.h
└── lib/
    └── utils.c
```

```cmake
cmake_minimum_required(VERSION 3.10)
project(myapp C)

set(CMAKE_C_STANDARD 17)

# 头文件搜索路径
include_directories(include)

# 将 lib/ 下的源码编译为静态库
add_library(utils STATIC lib/utils.c)

# 主程序
add_executable(myapp src/main.c src/network.c)
target_link_libraries(myapp utils)
```

## GDB 调试器

GDB（GNU Debugger）是 Linux 上最常用的 C 程序调试工具。

### 常用命令

```bash
# 编译时必须加 -g 选项
gcc -g -Wall program.c -o program

# 启动 GDB
gdb ./program

# GDB 内部常用命令
(gdb) break main          # 在 main 函数设断点
(gdb) break program.c:42  # 在第 42 行设断点
(gdb) run                 # 运行程序
(gdb) next (n)            # 单步执行（不进入函数）
(gdb) step (s)            # 单步执行（进入函数）
(gdb) print var           # 打印变量值
(gdb) print *ptr          # 打印指针指向的值
(gdb) backtrace (bt)      # 查看调用栈（调试段错误的核心命令）
(gdb) continue (c)        # 继续执行到下一个断点
(gdb) info locals         # 显示当前栈帧所有局部变量
(gdb) quit                # 退出
```

### 调试段错误

段错误（Segmentation Fault）是 C 开发中最常见的崩溃。GDB 可以直接定位到出错的代码行：

```bash
# 程序崩溃时自动启动 GDB
gdb ./program
(gdb) run
# 程序崩溃后 GDB 会停在出错的位置
(gdb) backtrace   # 查看调用链
(gdb) print ptr   # 检查指针值，通常是 NULL 或非法地址
```

## Valgrind 内存检测

Valgrind 是 Linux 上最强大的内存错误检测工具，能发现内存泄漏、越界访问、使用已释放内存等问题。

```bash
# 安装
sudo apt install valgrind

# 检测内存问题
valgrind --leak-check=full ./program
```

典型输出解读：

```
==12345== Invalid read of size 4           # 读取了非法内存
==12345==    at 0x4005B6: main (program.c:10)
==12345==  Address 0x0 is not stack'd, malloc'd or freed  # 地址 0x0 = NULL 指针

==12345== 64 bytes in 1 blocks are definitely lost         # 内存泄漏 64 字节
==12345==    at 0x4C2AB: malloc (vg_replace_malloc.c:299)
==12345==    at 0x4005D6: main (program.c:15)
```

::: tip 调试工作流
段错误 → GDB backtrace 定位 → 检查指针值
内存问题 → Valgrind 检测 → 根据报告修复
两者结合使用，能解决绝大多数 C 程序的运行时错误。
:::
