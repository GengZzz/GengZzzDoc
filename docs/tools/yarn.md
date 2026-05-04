---
sidebar: false
---

# Yarn

Yarn 是 Facebook（Meta）于 2016 年发布的包管理器，旨在解决 npm 早期的速度和可靠性问题。Yarn v1（Classic）是最广泛使用的版本，Yarn Berry（v2+）采用了全新的 Plug'n'Play 策略。

## 安装

```bash
# npm 全局安装
npm install -g yarn

# 查看版本
yarn -v
```

::: code-group

```bash [npm]
npm install -g yarn
```

```bash [corepack]
corepack enable
corepack prepare yarn@stable --activate
```

:::

## 初始化项目

```bash
yarn init
yarn init -y
```

## 包管理

### 安装依赖

```bash
# 安装全部依赖
yarn

# 安装生产依赖
yarn add lodash

# 安装开发依赖
yarn add -D typescript vitest

# 安装指定版本
yarn add lodash@4.17.21

# 全局安装
yarn global add pnpm
```

### 卸载依赖

```bash
yarn remove lodash
yarn remove -D vitest
```

### 更新依赖

```bash
yarn upgrade             # 更新所有
yarn upgrade lodash      # 更新指定包
yarn upgrade-interactive # 交互式选择更新
```

## scripts 脚本

```bash
yarn dev
yarn build
yarn test
```

Yarn 直接运行脚本不需要 `run` 关键字。

## Yarn v1 vs Yarn Berry

| 对比 | Yarn v1 (Classic) | Yarn Berry (v2+) |
|------|------------------|------------------|
| 安装策略 | node_modules | Plug'n'Play（默认） |
| 锁文件 | `yarn.lock` | `yarn.lock` |
| 性能 | 比同期 npm 快 | 更快 |
| 兼容性 | 兼容 npm 生态 | PnP 可能有兼容问题 |
| 使用率 | 最广泛 | 逐步增长 |

## 工作区（Workspaces）

Yarn 原生支持 monorepo。

```json
{
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

```bash
# 安装所有工作区依赖
yarn

# 在指定工作区安装依赖
yarn workspace @myorg/ui add react

# 在所有工作区执行命令
yarn workspaces run build

# 仅对有变化的工作区执行
yarn workspaces foreach -t run build
```

## yarn.lock

Yarn 使用 `yarn.lock` 锁定依赖版本，确保团队成员安装的依赖完全一致。

::: tip yarn.lock 应该提交吗？
**是的**，`yarn.lock` 必须提交到版本控制。它保证所有环境安装相同的依赖版本。
:::

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `yarn` | 安装全部依赖 |
| `yarn add <pkg>` | 安装生产依赖 |
| `yarn add -D <pkg>` | 安装开发依赖 |
| `yarn remove <pkg>` | 卸载 |
| `yarn upgrade` | 更新依赖 |
| `yarn list` | 查看依赖树 |
| `yarn cache clean` | 清理缓存 |
| `yarn info <pkg>` | 查看包信息 |
| `yarn why <pkg>` | 查看为什么安装了这个包 |
| `yarn global list` | 查看全局安装的包 |

## 配置文件 .yarnrc.yml

```yaml
# .yarnrc.yml
nodeLinker: node-modules  # 使用 node_modules 而非 PnP

npmRegistryServer: "https://registry.npmmirror.com"

plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-interactive-tools.cjs
    spec: "@yarnpkg/plugin-interactive-tools"
```
