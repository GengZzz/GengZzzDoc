# C# 简介与环境搭建

C# 诞生于 2000 年，由 Anders Hejlsberg（Delphi 和 TypeScript 之父）设计，是一门运行在 .NET 平台上的静态类型语言。理解 C# 需要深入理解它所依赖的运行时环境——CLR 的内部架构。

## .NET 生态演进

| 版本 | 特点 | 状态 |
| --- | --- | --- |
| .NET Framework 1.x-4.8 | Windows 专属，闭源，GAC 全局程序集缓存 | 仅维护，不再演进 |
| .NET Core 1.x-3.x | 跨平台、开源、模块化 | 已停止支持 |
| .NET 5 / 6 / 7 / 8 / 9 | 统一平台，AOT 编译支持，性能大幅提升 | .NET 8 为当前 LTS |

::: tip 选择建议
新项目直接使用 .NET 8+。.NET Framework 4.8 仅用于维护遗留系统。
:::

## CLR 内部架构

CLR（Common Language Runtime）是 .NET 的执行引擎，其内部结构远比"JIT 编译器"复杂。

### 执行流程全景

```
C# 源码
  │
  ▼
[Roslyn 编译器] ──→ IL 中间语言（.dll/.exe 中的 IL 代码 + 元数据表）
  │
  ▼
[CLR 加载器] ──→ 程序集加载 → 类型验证 → JIT 编译
  │
  ▼
[执行引擎] ──→ 执行机器码 + GC 管理 + 异常处理 + 线程调度
```

### MethodTable 与 EEClass

CLR 中每个类型都有一个 **MethodTable**（方法表），它是类型在运行时的核心数据结构：

```
┌─────────────────────────────────────────────┐
│                MethodTable                   │
├─────────────────────────────────────────────┤
│  TypeHandle（指向 EEClass）                  │
│  BaseSize（对象最小大小，含对象头）            │
│  ComponentSize（数组元素大小）                │
│  Flags（值类型/引用类型/泛型等标记）           │
│  Virtual Method Slots（虚方法槽）             │
│  Interface Map（接口映射表）                  │
│  PerInstInfo（静态字段）                      │
└─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│               EEClass                        │
├─────────────────────────────────────────────┤
│  类型名称、命名空间                           │
│  字段描述符（FieldDesc 数组）                  │
│  方法描述符（MethodDesc 数组）                 │
│  接口列表                                     │
│  Attribute 元数据                            │
└─────────────────────────────────────────────┘
```

- **MethodTable**：运行时热路径使用，紧凑布局，用于方法调度、类型检查
- **EEClass**：包含完整的类型元数据，加载后通常不变

### JIT 编译详细流程

当方法首次被调用时，JIT 编译流程如下：

```
方法首次调用
  │
  ▼
[Precode / Fixup Stub] ──→ 第一次调用时跳转到 JIT 编译器
  │
  ▼
[Load IL + 元数据] ──→ 读取 IL 代码和类型信息
  │
  ▼
[JIT 编译] ──→ IL → 机器码（根据当前 CPU 架构优化）
  │
  ▼
[更新 Precode] ──→ 将 Fixup Stub 替换为编译后的机器码地址
  │
  ▼
[执行机器码] ──→ 后续调用直接执行，不再经过 JIT
```

关键细节：
- **Precode** 是方法入口处的跳转桩，首次调用触发编译，之后直接跳转
- JIT 能根据运行时信息做优化（如根据 CPU 指令集选择 AVX2/SSE4 指令）
- 编译后的机器码缓存在 **Code Heap** 中，进程生命周期内不会重新编译

### Tiered Compilation（分层编译）

.NET Core 3.0+ 引入分层编译，方法经历两个编译阶段：

| 阶段 | 特点 | 适用场景 |
| --- | --- | --- |
| Tier 0（Quick JIT） | 快速编译，最少优化，编译速度快 | 冷方法、启动阶段 |
| Tier 1（Optimized） | 完整优化，内联、去虚拟化、循环展开 | 热方法（调用次数超过阈值） |

触发 Tier 1 优化的条件（默认）：
- 方法被调用 **30 次** 以上
- 方法包含 **反向分支**（循环）
- 方法在 **启动路径** 之外

### Dynamic PGO（.NET 8+）

Dynamic PGO（Profile-Guided Optimization）在 Tier 1 阶段基于运行时分析做进一步优化：

- **去虚拟化（Devirtualization）**：如果运行时发现某个虚方法调用 99% 的情况都指向同一个实现，直接内联该实现
- **类型检查消除**：如果某个 `is` 检查几乎总是 true，编译器可以假设它为 true
- **分支预测**：根据实际执行频率调整分支顺序

```
// 原始代码
void Process(Animal animal)
{
    animal.Speak();  // 虚方法调用，通常需要查 vtable
}

// Dynamic PGO 优化后（如果 99% 的调用是 Dog）
void Process(Animal animal)
{
    if (animal is Dog dog)  // 类型检查（几乎总是 true）
        Dog.Speak(dog);     // 直接调用，内联优化
    else
        animal.Speak();     // 回退到虚方法调用
}
```

::: warning PGO 优化的陷阱
PGO 做的去虚拟化在极少数情况下可能引入性能退化——如果那 1% 的类型突然变成主流，需要重新编译。这种"过拟合"在 AOT 场景下尤其需要注意。
:::

## AOT vs JIT 权衡

| 特性 | JIT | Native AOT |
| --- | --- | --- |
| 启动速度 | 慢（需 JIT 编译） | 极快（已是机器码） |
| 峰值性能 | 更好（运行时优化、PGO） | 略低（缺少运行时信息） |
| 内存占用 | 较高（JIT 编译器本身占内存） | 较低 |
| 部署大小 | 较小（含 IL） | 较大（含完整机器码） |
| 调试体验 | 好（支持 Edit & Continue） | 受限 |
| 运行时特性 | 完整（反射、Emit、动态加载） | 受限（需 trimmer 标记） |
| 适用场景 | Web 服务、桌面应用 | CLI 工具、Serverless、嵌入式 |

::: warning AOT 的限制
Native AOT 不支持：
- 运行时代码生成（`System.Reflection.Emit`）
- 未标记的反射（需通过 `[DynamicallyAccessedMembers]` 保留类型成员）
- 程序集动态加载（`Assembly.LoadFile` 等）
- 部分 COM 互操作
:::

## 元数据表

.NET 程序集（.dll/.exe）中不只包含 IL 代码，还包含完整的**元数据表（Metadata Tables）**：

| 元数据表 | 内容 | 示例 |
| --- | --- | --- |
| TypeDef | 类型定义 | `MyClass` 的基类、字段、方法列表 |
| MethodDef | 方法定义 | 方法的 IL 代码偏移、参数签名 |
| FieldDef | 字段定义 | 字段类型、偏移量 |
| MemberRef | 成员引用 | 对外部类型方法的引用 |
| CustomAttribute | 自定义 Attribute | `[Serializable]` 等 |

每个元数据行有一个 **Metadata Token**（如 `0x02000001` 表示第一个 TypeDef），运行时通过 Token 精确定位类型和方法信息。

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

# Native AOT 发布
dotnet publish -c Release -r linux-x64 -p:PublishAot=true
```

## Hello World

```csharp
// .NET 6+ 顶级语句（Top-level Statements）
// 直接在 Program.cs 中写逻辑，编译器自动生成 Program 类和 Main 方法
Console.WriteLine("Hello, .NET!");
```

::: tip 顶级语句的编译产物
顶级语句在编译时被转换为：

```csharp
internal class Program
{
    private static void Main(string[] args)
    {
        Console.WriteLine("Hello, .NET!");
    }
}
```

一个项目只能有一个顶级语句文件。`args` 变量在顶级语句中可用。
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
