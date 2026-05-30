---
title: "TypeScript 简介与环境搭建"
description: "TypeScript（简称 TS）是微软于 2012 年推出的开源编程语言。它是 JavaScript 的超集，意味着任何合法的 JS 代码都是合法的 TS 代码。"
---

# TypeScript 简介与环境搭建

## 什么是 TypeScript

TypeScript（简称 TS）是微软于 2012 年推出的开源编程语言。它是 JavaScript 的超集，意味着任何合法的 JS 代码都是合法的 TS 代码。TypeScript 在 JS 之上增加了可选的静态类型、接口、泛型、枚举等特性，并通过编译器（tsc）将代码转译为纯 JavaScript。

TypeScript 解决了 JavaScript 在大型项目中的痛点：缺乏类型约束导致的运行时错误、重构困难、IDE 支持不足。目前主流框架（Vue 3、Angular、Next.js）均原生支持 TypeScript。

## 安装 TypeScript

### 全局安装

```bash
npm install -g typescript
tsc --version
```

### 项目内安装（推荐）

```bash
mkdir my-ts-project && cd my-ts-project
npm init -y
npm install -D typescript
npx tsc --version
```

### 配置 package.json 脚本

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

## 初始化 tsconfig.json

```bash
npx tsc --init
```

生成的 `tsconfig.json` 包含大量注释，以下是实际项目中最常用的最小配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 核心配置项说明

| 配置项 | 作用 | 推荐值 |
| --- | --- | --- |
| `target` | 编译输出的 JS 版本 | `ES2020` 或更高 |
| `module` | 模块系统 | `ESNext`（配合打包工具） |
| `strict` | 启用所有严格检查 | `true`（必须开启） |
| `outDir` | 编译输出目录 | `./dist` |
| `rootDir` | 源码根目录 | `./src` |
| `esModuleInterop` | 兼容 CommonJS 导入 | `true` |
| `skipLibCheck` | 跳过 .d.ts 文件检查（加速编译） | `true` |

## 编译流程

TypeScript 的编译过程分为三个阶段：

```
.ts 源码 → 解析（Parsing） → 类型检查（Type Checking） → 输出 .js
```

1. **解析**：将 `.ts` 源码解析为抽象语法树（AST），识别类型注解
2. **类型检查**：基于 AST 进行静态类型分析，发现类型不匹配时报告错误
3. **输出**：擦除所有类型注解，生成纯 JavaScript 代码

### 手动编译

```bash
# 编译单个文件
npx tsc src/index.ts

# 使用 tsconfig.json 编译整个项目
npx tsc

# 监听模式
npx tsc --watch
```

### 配合打包工具

在实际项目中，通常使用打包工具来处理 TypeScript：

```bash
# Vite（推荐，零配置）
npm create vite@latest my-app -- --template vue-ts

# esbuild（极快）
npm install -D esbuild
npx esbuild src/index.ts --bundle --outfile=dist/bundle.js
```

## 第一个 TypeScript 程序

创建 `src/index.ts`：

```typescript
// 类型注解让意图明确
function greet(name: string, age: number): string {
  return `你好，${name}！你今年 ${age} 岁。`
}

// 编译器会检查参数类型
const message = greet('张三', 25)
console.log(message)

// 下面这行会在编译时报错：
// greet(123, '二十五')  // Argument of type 'number' is not assignable to parameter of type 'string'
```

编译并运行：

```bash
npx tsc
node dist/index.js
# 输出：你好，张三！你今年 25 岁。
```

## 注意事项

- `strict: true` 是最重要的配置，它等价于同时开启 `strictNullChecks`、`noImplicitAny`、`strictFunctionTypes` 等一系列严格检查。新项目务必开启。
- 全局安装的 `tsc` 和项目内安装的版本可能不同，优先使用 `npx tsc` 确保版本一致。
- `tsconfig.json` 存在时，`tsc` 会自动读取配置，无需手动指定文件路径。
