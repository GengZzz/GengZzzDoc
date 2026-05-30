---
sidebar: false
title: "nrm"
description: "nrm（npm Registry Manager）是 npm 镜像源管理工具，用于快速切换 npm registry，解决国内网络环境下 npm 安装速度慢的问题。"
---

# nrm

nrm（npm Registry Manager）是 npm 镜像源管理工具，用于快速切换 npm registry，解决国内网络环境下 npm 安装速度慢的问题。

## 安装

```bash
npm install -g nrm
```

验证：

```bash
nrm --version
```

## 基本使用

### 查看可用源

```bash
nrm ls
```

```text
  npm ---------- https://registry.npmjs.org/
  yarn --------- https://registry.yarnpkg.com/
* npmmirror ---- https://registry.npmmirror.com/    # 当前使用的源
  taobao ------- https://registry.npmmirror.com/
  nj ----------- https://registry.nodejitsu.com/
  npmMirror ---- https://skimdb.npmjs.com/registry/
  edunpm ------- http://registry.enpmjs.org/
```

### 切换源

```bash
# 切换到淘宝镜像（推荐国内用户）
nrm use npmmirror

# 切换到官方源
nrm use npm

# 切换到 yarn 源
nrm use yarn
```

::: tip npmmirror 是什么？
原来的淘宝 npm 镜像（`registry.npm.taobao.org`）已更名为 npmmirror（`registry.npmmirror.com`），服务由阿里云提供。这是国内最常用的 npm 镜像。
:::

### 测试源速度

```bash
nrm test
```

```text
  npm ---- 1200ms
  yarn --- 800ms
  npmmirror - 200ms
  taobao -- 180ms
  nj ----- 1500ms
```

### 测试指定源

```bash
nrm test npmmirror
```

## 自定义源

```bash
# 添加自定义 registry
nrm add company https://npm.company.com/

# 删除自定义 registry
nrm del company

# 查看当前使用的源
nrm current
```

## 项目级配置

除了用 nrm 全局切换，也可以在项目级别指定 registry。

### .npmrc 文件

```ini
# 项目根目录的 .npmrc
registry=https://registry.npmmirror.com
```

### pnpm 配置

```ini
# .npmrc (pnpm 也读取此文件)
registry=https://registry.npmmirror.com
```

### package.json 中指定

```json
{
  "publishConfig": {
    "registry": "https://npm.company.com/"
  }
}
```

## 常用镜像源

| 名称 | 地址 | 说明 |
|------|------|------|
| npm 官方 | `https://registry.npmjs.org/` | 默认源 |
| npmmirror | `https://registry.npmmirror.com/` | 阿里云，国内推荐 |
| Cloudflare | `https://registry.npmmirror.com/` | CDN 加速 |
| GitHub Packages | `https://npm.pkg.github.com/` | GitHub 私有包 |

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `nrm ls` | 列出所有源 |
| `nrm use <name>` | 切换到指定源 |
| `nrm add <name> <url>` | 添加自定义源 |
| `nrm del <name>` | 删除自定义源 |
| `nrm test` | 测试所有源速度 |
| `nrm test <name>` | 测试指定源速度 |
| `nrm current` | 查看当前源 |

## 用 npm 直接配置（不装 nrm）

如果不装 nrm，也可以直接配置：

```bash
# 查看当前 registry
npm config get registry

# 设置 registry
npm config set registry https://registry.npmmirror.com

# 恢复官方源
npm config set registry https://registry.npmjs.org/
```

pnpm：

```bash
pnpm config set registry https://registry.npmmirror.com
```

yarn：

```bash
yarn config set registry https://registry.npmmirror.com
```

::: tip 要不要装 nrm？
如果只用一个源（如 npmmirror），直接 `npm config set` 即可。如果需要频繁在多个源之间切换（如公司私有源 + 公开源），nrm 更方便。
:::
