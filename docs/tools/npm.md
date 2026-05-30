---
sidebar: false
title: "npm"
description: "npm（Node Package Manager）是 Node.js 默认的包管理器，也是全球最大的软件注册中心。它用于安装、分享和管理项目依赖。"
---

# npm

npm（Node Package Manager）是 Node.js 默认的包管理器，也是全球最大的软件注册中心。它用于安装、分享和管理项目依赖。

## 安装

npm 随 Node.js 一同安装。安装 Node.js 后自动获得 npm。

```bash
# 查看版本
node -v
npm -v
```

## 初始化项目

```bash
npm init          # 交互式创建 package.json
npm init -y       # 使用默认值快速创建
```

生成的 `package.json`：

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

## 包管理

### 安装依赖

```bash
# 安装生产依赖（写入 dependencies）
npm install lodash
npm i lodash

# 安装开发依赖（写入 devDependencies）
npm install -D typescript
npm i -D vitest

# 全局安装
npm install -g pnpm

# 安装指定版本
npm install lodash@4.17.21

# 安装最新版本
npm install lodash@latest

# 根据 package.json 安装全部依赖
npm install
```

### 卸载依赖

```bash
npm uninstall lodash
npm un lodash
npm un -D vitest
```

### 更新依赖

```bash
npm update            # 更新所有
npm update lodash     # 更新指定包
npm outdated          # 查看可更新的包
```

## package.json 核心字段

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "lint": "eslint ."
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "packageManager": "npm@10.0.0"
}
```

### 版本号规则

| 符号 | 含义 | 示例 |
|------|------|------|
| `^` | 兼容版本（不改主版本） | `^3.4.0` → 3.x.x |
| `~` | 补丁版本（不改次版本） | `~3.4.0` → 3.4.x |
| `*` | 任意版本 | `*` |
| `>` `>=` `<` `<=` | 范围 | `>=1.0.0 <2.0.0` |

## scripts 脚本

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "lint": "eslint . --fix",
    "prepare": "husky install"
  }
}
```

```bash
npm run dev      # 运行自定义脚本
npm run build
npm test         # test 可以省略 run
npm start        # start 可以省略 run
```

::: tip 生命周期脚本

- `preinstall` / `postinstall`：安装前后触发
- `prepublishOnly`：发布前触发
- `prepare`：安装后 / 发布前触发（常用于 husky）
:::

## npx

npx 用于执行 npm 包中的命令，无需全局安装。

```bash
# 创建 Vite 项目
npx create-vite@latest my-app

# 执行一次性命令
npx eslint .

# 查看包内容
npx npm-check-updates
```

## 发布包

```bash
# 注册 npm 账号后
npm login

# 发布
npm publish

# 发布 scoped 包
npm publish --access public
```

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm i` | 安装依赖 |
| `npm i <pkg>` | 安装生产依赖 |
| `npm i -D <pkg>` | 安装开发依赖 |
| `npm un <pkg>` | 卸载 |
| `npm ls` | 查看依赖树 |
| `npm outdated` | 查看过期依赖 |
| `npm cache clean --force` | 清理缓存 |
| `npm list -g --depth=0` | 查看全局安装的包 |
| `npm audit` | 安全审计 |
| `npm pack` | 打包为 .tgz |
