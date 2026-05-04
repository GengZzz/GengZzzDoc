# 构建系统

C++ 项目从单文件到多模块，需要构建系统管理编译、链接和依赖。CMake 是目前最主流的跨平台构建工具。

## CMake 基础

### 最小项目

项目结构：

```
my_project/
  CMakeLists.txt
  src/
    main.cpp
```

`CMakeLists.txt`：

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyProject LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(myapp src/main.cpp)
```

构建：

```bash
cmake -B build
cmake --build build
```

### 多文件项目

```cmake
add_executable(myapp
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
)
```

### 链接库

```cmake
add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE pthread)
```

`PRIVATE` / `PUBLIC` / `INTERFACE` 控制依赖的传播方式：

| 关键字 | 含义 |
| --- | --- |
| `PRIVATE` | 仅当前目标使用 |
| `PUBLIC` | 当前目标和依赖它的目标都使用 |
| `INTERFACE` | 仅依赖它的目标使用 |

## 创建和使用库

```cmake
# 创建静态库
add_library(utils STATIC
    src/utils/string_utils.cpp
    src/utils/math_utils.cpp
)
target_include_directories(utils PUBLIC include/)

# 主程序链接库
add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE utils)
```

## find_package

查找系统已安装的库。

```cmake
find_package(OpenSSL REQUIRED)
target_link_libraries(myapp PRIVATE OpenSSL::SSL)

find_package(GTest QUIET)
if(GTest_FOUND)
    add_executable(tests src/test.cpp)
    target_link_libraries(tests PRIVATE GTest::gtest_main)
endif()
```

## FetchContent（C++11+, CMake 3.11+）

自动下载和构建依赖，不需要预先安装。

```cmake
include(FetchContent)

FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG 10.2.1
)
FetchContent_MakeAvailable(fmt)

add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE fmt::fmt)
```

::: tip 提示
`FetchContent` 在配置阶段下载依赖，适合轻量级库。大型依赖考虑用包管理器预装。
:::

## 现代 CMake 最佳实践

### 目标导向

```cmake
# 好：目标级别设置
target_compile_features(myapp PRIVATE cxx_std_20)
target_include_directories(myapp PRIVATE src/)
target_compile_definitions(myapp PRIVATE NDEBUG)

# 避免：全局设置
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2")
include_directories(src/)
```

### 项目结构

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_subdirectory(src)
add_subdirectory(tests)
```

src/CMakeLists.txt：

```cmake
add_library(core STATIC
    parser.cpp
    analyzer.cpp
)
target_include_directories(core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/../include)
target_compile_features(core PUBLIC cxx_std_17)
```

## 包管理器

### vcpkg

```bash
vcpkg install fmt nlohmann-json gtest
```

CMake 集成：

```cmake
# 设置工具链文件
# cmake -B build -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake

find_package(fmt CONFIG REQUIRED)
target_link_libraries(myapp PRIVATE fmt::fmt)
```

### Conan

```python
# conanfile.txt
[requires]
fmt/10.2.1
gtest/1.14.0

[generators]
CMakeDeps
CMakeToolchain
```

```bash
conan install . --output-folder=build --build=missing
cmake -B build --toolchain build/conan_toolchain.cmake
cmake --build build
```

::: tip 提示
vcpkg 由微软维护，与 Visual Studio 集成好。Conan 更灵活，支持自定义仓库。团队项目建议统一使用同一种包管理器。
:::
