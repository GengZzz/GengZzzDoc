---
sidebar: false
---

# pnpm

pnpm（Performant npm）是速度最快、磁盘效率最高的包管理器。它通过硬链接和符号链接机制，避免了重复存储相同的依赖包。

## 核心原理

```text
传统 npm/yarn:
  项目A/node_modules/lodash/  → 完整复制
  项目B/node_modules/lodash/  → 完整复制
  浪费磁盘空间！

pnpm:
  全局存储 ~/.pnpm-store/
    └── lodash@4.17.21         ← 唯一一份真实文件
  项目A/node_modules/lodash/  → 硬链接到全局存储
  项目B/node_modules/lodash/  → 硬链接到全局存储
  节省 60%+ 磁盘空间
```

**优势：**

| 特性 | 说明 |
|------|------|
| 快 | 安装速度比 npm/yarn 快 2-3 倍 |
| 省空间 | 硬链接避免重复存储 |
| 严格 | 非法访问未声明的依赖会报错 |
| 支持 monorepo | 原生 workspace 支持 |

## 安装

::: code-group

```bash [npm]
npm install -g pnpm
```

```bash [Homebrew]
brew install pnpm
```

```bash [Scoop]
scoop install pnpm
```

```bash [corepack]
corepack enable
corepack prepare pnpm@latest --activate
```

:::

## 初始化项目

```bash
pnpm init
```

## 包管理

```bash
# 安装全部依赖
pnpm install
pnpm i

# 安装生产依赖
pnpm add lodash

# 安装开发依赖
pnpm add -D typescript vitest

# 全局安装
pnpm add -g pnpm

# 卸载
pnpm remove lodash
pnpm rm lodash

# 更新
pnpm update
pnpm up              # 更新所有
pnpm up lodash       # 更新指定包
pnpm up --latest     # 更新到最新版本
```

## scripts 脚本

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

pnpm 直接运行脚本不需要 `run` 关键字。

## 严格模式

pnpm 默认启用严格依赖模式，`node_modules` 中只能访问 `package.json` 中显式声明的依赖。

```json
// 项目 A 的 package.json
{
  "dependencies": {
    "vue": "^3.4.0"
  }
}
```

```js
// 代码中如果直接 import lodash（未声明），pnpm 会报错
import _ from 'lodash'  // Error: lodash is not declared
```

::: tip 为什么严格模式是好事？
npm/yarn 使用扁平化 `node_modules`，允许代码访问未声明的依赖（幽灵依赖）。这会导致：

- 依赖行为不确定（不同版本可能被提升到不同层级）
- 构建结果不可复现
- pnpm 严格模式消除了这类隐患
:::

### 兼容处理

如果某些包确实需要访问未声明的依赖：

```ini
# .npmrc
shamefully-hoist=true     # 模拟 npm 的扁平化提升
public-hoist-pattern=*    # 提升所有包
strict-peer-dependencies=false
```

## workspace（monorepo）

pnpm 原生支持 monorepo。

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```bash
# 在所有 workspace 中安装依赖
pnpm add -D typescript -w    # -w 安装到根目录

# 在指定 package 中安装
pnpm add react --filter @myorg/ui

# 在所有 package 中执行命令
pnpm -r run build

# 仅对有变化的 package 执行
pnpm -r --filter="./packages/ui" run build

# 拓扑排序执行（先 build 依赖的包）
pnpm -r --workspace-concurrency=1 run build
```

## .npmrc 配置

```ini
# registry
registry=https://registry.npmmirror.com

# 依赖提升策略
shamefully-hoist=false
strict-peer-dependencies=false

# Store 路径
store-dir=~/.pnpm-store

# 缓存
cache-dir=~/.pnpm-cache
```

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm i` | 安装依赖 |
| `pnpm add <pkg>` | 安装生产依赖 |
| `pnpm add -D <pkg>` | 安装开发依赖 |
| `pnpm rm <pkg>` | 卸载 |
| `pnpm up` | 更新依赖 |
| `pnpm why <pkg>` | 查看为什么安装了这个包 |
| `pnpm ls` | 查看依赖树 |
| `pnpm store prune` | 清理未使用的存储 |
| `pnpm dlx <pkg>` | 临时执行包命令（类似 npx） |
| `pnpm approve-builds` | 批准构建脚本 |

## npm vs yarn vs pnpm

| 对比 | npm | yarn v1 | pnpm |
|------|-----|---------|------|
| 速度 | 中 | 快 | 最快 |
| 磁盘占用 | 大 | 大 | 小 |
| 依赖隔离 | 弱 | 弱 | 强（默认） |
| Monorepo | 基础 | 原生 | 原生 |
| lock 文件 | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| 推荐度 | 兼容性最好 | 逐步被替代 | 新项目首选 |
