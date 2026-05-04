# C# 简介与环境搭建

C# 诞生于 2000 年，由 Anders Hejlsberg 设计，是一门运行在 .NET 平台上的静态类型语言。理解 C# 需要先理解它所依赖的运行时环境——CLR。

## .NET 生态演进

.NET 生态经历了三个主要阶段，当前推荐使用 .NET 8+（LTS 版本）。

| 版本 | 特点 | 状态 |
| --- | --- | --- |
| .NET Framework | Windows 专属，闭源，GAC 全局程序集缓存 | 仅维护，不再演进 |
| .NET Core 1.x-3.x | 跨平台、开源、模块化 | 已停止支持 |
| .NET 5 / 6 / 7 / 8 / 9 | 统一平台，AOT 编译支持，性能大幅提升 | .NET 8 为当前 LTS |

::: tip 选择建议
新项目直接使用 .NET 8+。.NET Framework 4.8 仅用于维护遗留系统。
:::

## CLR 与 JIT 编译

C# 源代码不会直接编译为机器码，而是经过两步编译：

```
C# 源码 → [Roslyn 编译器] → IL 中间语言（.dll/.exe）→ [JIT 编译器] → 机器码
```

**CLR（Common Language Runtime）** 是 .NET 的执行引擎，负责：

- **JIT 编译**：将 IL 按需编译为当前平台的机器码（而非一次性全部编译）
- **内存管理**：自动分配和回收内存（GC）
- **类型安全**：验证 IL 代码的类型安全性，防止非法内存访问
- **异常处理**：统一的异常模型
- **线程管理**：线程池、任务调度

**JIT 编译的关键细节**：

- 方法首次调用时触发 JIT 编译，编译后的机器码缓存在内存中
- JIT 能根据运行时信息做优化（如根据 CPU 指令集选择 SIMD 指令）
- Tiered Compilation（分层编译）：先快速编译（tier 0），热点方法再优化编译（tier 1）
- .NET 8 引入的 Dynamic PGO 可以在 tier 1 阶段做基于运行时分析的去虚拟化

::: warning JIT vs AOT
.NET 支持 Native AOT（.NET 7+），直接编译为原生机器码，启动速度极快，但失去 JIT 的运行时优化能力。适合 CLI 工具、Serverless 场景。Web 服务通常仍用 JIT。
:::

## 开发环境

### Visual Studio（Windows）

全功能 IDE，内置调试器、性能分析器、热重载。

- Visual Studio 2022 Community 免费（个人/小团队）
- 安装时选择「.NET 桌面开发」或「ASP.NET 和 Web 开发」工作负载

### VS Code + C# Dev Kit

跨平台轻量方案，适合 Linux/macOS 开发者。

```bash
# 安装扩展
code --install-extension ms-dotnettools.csharp
code --install-extension ms-dotnettools.csdevkit
```

### JetBrains Rider

付费 IDE，代码分析能力强，跨平台。

## dotnet CLI

命令行工具是日常开发的核心，不依赖 IDE。

```bash
# 查看已安装的 SDK
dotnet --list-sdks

# 创建项目
dotnet new console -n MyApp          # 控制台应用
dotnet new webapi -n MyApi           # Web API
dotnet new classlib -n MyLib         # 类库
dotnet new sln -n MySolution         # 解决方案

# 管理解决方案
dotnet sln add MyApi/MyApi.csproj
dotnet sln add MyLib/MyLib.csproj

# 构建与运行
dotnet build                          # 编译
dotnet run --project MyApi           # 运行指定项目
dotnet watch run                      # 热重载运行

# 包管理
dotnet add package Newtonsoft.Json
dotnet add reference ../MyLib/MyLib.csproj

# 发布
dotnet publish -c Release -r linux-x64 --self-contained
dotnet publish -c Release -r win-x64 /p:PublishSingleFile=true
```

## Hello World

```csharp
// Program.cs
using System;

namespace MyApp;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("Hello, .NET!");

        // C# 9+ 顶级语句（Top-level Statements），实际等价于上面的代码：
        // 直接在 Program.cs 中写：
        // Console.WriteLine("Hello, .NET!");
    }
}
```

::: tip 顶级语句
.NET 6+ 模板默认使用顶级语句，省去 Main 方法和 class 包装。编译器自动生成 Program 类和 Main 方法。一个项目只能有一个顶级语句文件。
:::

### 项目文件结构

```xml
<!-- MyApp.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

- `TargetFramework`：目标框架（net8.0、net9.0）
- `Nullable`：启用可空引用类型检查（C# 8+）
- `ImplicitUsings`：自动引入常用命名空间（System、System.Collections.Generic 等）
