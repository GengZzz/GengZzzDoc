---
sidebar: false
---

# nvm

nvm（Node Version Manager）是 Node.js 的版本管理工具，允许在同一台机器上安装和切换多个 Node.js 版本。

## 安装

### macOS / Linux

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# 或 wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
```

安装后重新打开终端，验证：

```bash
nvm --version
```

::: tip nvm 安装失败？
如果提示 `nvm: command not found`，检查 shell 配置文件（`~/.bashrc`、`~/.zshrc`）中是否添加了 nvm 初始化代码。安装脚本通常会自动添加：

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

:::

### Windows

Windows 上使用 [nvm-windows](https://github.com/coreybutler/nvm-windows)：

下载 `nvm-setup.exe` 安装包安装即可。

::: code-group

```bash [下载安装]
# 下载地址
https://github.com/coreybutler/nvm-windows/releases
```

```bash [验证]
nvm version
```

:::

## 基本使用

### 安装 Node.js

```bash
# 安装最新 LTS 版本
nvm install --lts

# 安装指定版本
nvm install 20
nvm install 18.19.0

# 安装最新版本
nvm install node
```

### 切换版本

```bash
# 使用指定版本
nvm use 20
nvm use 18

# 查看当前版本
nvm current

# 查看已安装的版本
nvm ls
```

### 设置默认版本

```bash
# 新终端默认使用这个版本
nvm alias default 20
```

## 版本管理

```bash
# 查看所有可安装的版本
nvm ls-remote
nvm ls-remote --lts    # 只看 LTS 版本

# 查看本地已安装
nvm ls

# 卸载指定版本
nvm uninstall 18
```

```text
$ nvm ls
->     v18.20.4
       v20.18.0
       v22.11.0
default -> 20 (-> v20.18.0)
```

## 项目级版本固定

在项目根目录创建 `.nvmrc` 文件：

```bash
# .nvmrc
20
```

团队成员进入项目目录后执行：

```bash
nvm use    # 自动读取 .nvmrc 切换版本
```

如果没有安装该版本：

```bash
nvm install  # 自动安装 .nvmrc 指定的版本
```

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `nvm install --lts` | 安装最新 LTS |
| `nvm install <version>` | 安装指定版本 |
| `nvm use <version>` | 切换版本 |
| `nvm ls` | 列出本地版本 |
| `nvm ls-remote` | 列出远程可安装版本 |
| `nvm alias default <version>` | 设置默认版本 |
| `nvm current` | 查看当前版本 |
| `nvm uninstall <version>` | 卸载版本 |
| `nvm exec <version> <cmd>` | 用指定版本执行命令 |
| `nvm which <version>` | 查看版本安装路径 |

## nvm vs fnvm vs volta

| 工具 | 平台 | 特点 |
|------|------|------|
| nvm | macOS/Linux | 最流行，shell 函数实现 |
| nvm-windows | Windows | 独立项目，非 shell 实现 |
| fnm | 全平台 | Rust 实现，更快 |
| volta | 全平台 | 自动切换版本，按项目锁定 |

::: tip 性能对比
nvm 在打开新终端时有明显延迟（需要执行 shell 脚本）。如果在意终端启动速度，可以考虑 fnm（快 10 倍+）或 volta。
:::
