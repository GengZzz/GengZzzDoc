---
sidebar: false
title: "OpenCode"
description: "OpenCode 是一个开源的终端 AI 编程助手，直接在命令行中提供代码生成、文件编辑、命令执行等能力。它支持多种大语言模型后端（OpenAI、Anthropic、Google 等）。"
---

# OpenCode

OpenCode 是一个开源的终端 AI 编程助手，直接在命令行中提供代码生成、文件编辑、命令执行等能力。它支持多种大语言模型后端（OpenAI、Anthropic、Google 等），允许开发者在不离开终端的情况下完成编程任务，同时保持对代码和环境的完全控制。

## 核心特性

- **多模型支持**：可接入 OpenAI GPT-4o、Anthropic Claude、Google Gemini 等多种模型，通过统一接口切换
- **文件编辑**：直接在终端中创建、修改项目文件，支持 diff 预览和确认机制
- **命令执行**：在沙箱或宿主环境中运行 shell 命令，自动获取输出供 AI 分析
- **Git 集成**：理解仓库上下文，辅助生成 commit message、review 变更、解决冲突
- **插件系统**：可扩展的架构，支持自定义工具和工作流
- **上下文感知**：自动扫描项目结构，理解代码库的依赖关系和约定

::: tip
OpenCode 的核心设计理念是"终端优先"。与 IDE 插件不同，它在纯 CLI 环境中运行，适合远程开发、SSH 会话和 CI/CD 流水线中的自动化场景。
:::

## 安装与配置

### 通过包管理器安装

::: code-group

```bash [Homebrew]
brew install opencode
```

```bash [npm]
npm install -g opencode
```

```bash [pnpm]
pnpm add -g opencode
```

```bash [源码构建]
git clone https://github.com/opencode-ai/opencode.git
cd opencode
go build -o opencode .
```

:::

### 配置 API Key

OpenCode 通过环境变量读取各模型的 API Key：

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google
export GOOGLE_API_KEY="AIza..."
```

也可以写入 shell 配置文件持久化：

```bash
# ~/.bashrc 或 ~/.zshrc
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
source ~/.zshrc
```

### 选择模型后端

启动时指定使用的模型：

```bash
# 使用 OpenAI GPT-4o
opencode --model gpt-4o

# 使用 Claude Sonnet
opencode --model claude-sonnet-4-20250514

# 使用 Gemini
opencode --model gemini-2.5-pro
```

::: warning
确保 API Key 对应的账户有足够的额度。不同模型的计费方式和速率限制各不相同，建议根据任务复杂度选择合适的模型。
:::

## 基本使用

### 启动交互式会话

```bash
# 在当前目录启动
opencode

# 指定工作目录
opencode --workdir /path/to/project

# 非交互模式（单次调用）
opencode -p "解释这个项目的目录结构"
```

### 文件操作

在会话中，OpenCode 可以读取和编辑项目文件：

```bash
# 让 AI 读取并分析某个文件
> 请看一下 src/main.go 的代码结构

# 让 AI 生成或修改文件
> 在 utils 目录下新建一个 logger.go，实现基本的日志功能

# 查看变更的 diff
> 显示你刚才做的所有修改
```

### 代码生成与编辑

```bash
# 生成代码
> 写一个 Go 的 HTTP 中间件，实现请求日志记录

# 重构代码
> 把 handler/user.go 中的重复验证逻辑提取到一个公共函数

# 修复 Bug
> 运行测试然后分析失败的用例并修复
```

::: tip
给 OpenCode 提供明确的约束条件（语言版本、依赖库、编码风格）可以显著提升生成质量。例如："用 Go 1.21 的泛型实现一个类型安全的环形缓冲区"。
:::

## 配置详解

OpenCode 支持项目级配置文件 `.opencode.json`（放在项目根目录）：

```json
{
  "model": "gpt-4o",
  "temperature": 0.2,
  "maxTokens": 4096,
  "tools": {
    "shell": {
      "enabled": true,
      "allowedCommands": ["go", "npm", "git", "ls", "cat"]
    },
    "fileWrite": {
      "enabled": true,
      "confirmBeforeWrite": true
    }
  },
  "ignore": [
    "node_modules",
    ".git",
    "vendor",
    "*.env"
  ],
  "instructions": "项目使用 Go 代码风格，遵循 Effective Go 规范。"
}
```

关键配置项说明：

| 字段 | 说明 |
| --- | --- |
| `model` | 默认使用的模型标识 |
| `temperature` | 控制生成随机性，代码任务建议 0-0.3 |
| `tools.shell` | Shell 命令执行权限控制 |
| `tools.fileWrite` | 文件写入权限及确认机制 |
| `ignore` | 不发送给 AI 的文件/目录模式 |
| `instructions` | 项目级系统提示词，定义编码规范 |

## 与其他工具对比

| 特性 | OpenCode | Claude Code | Cursor |
| --- | --- | --- | --- |
| 运行环境 | 终端 CLI | 终端 CLI | GUI IDE |
| 开源 | 是 | 否 | 否 |
| 模型选择 | 多模型可选 | 仅 Anthropic | 多模型可选 |
| 代码编辑 | Diff + 确认 | Diff + 确认 | 内联编辑 |
| 插件扩展 | 支持 | 有限 | 丰富生态 |
| 离线使用 | 可接本地模型 | 否 | 有限 |
| 价格 | 按 API 计费 | 按 API 计费 | 订阅制 |

::: tip
如果你已经在使用终端工作流（Vim/Neovim、tmux、SSH 远程开发），OpenCode 是一个自然的选择。如果更习惯 GUI 环境，Cursor 的编辑器体验更好。
:::

## 插件与扩展

OpenCode 的工具系统可以通过插件扩展。每个插件本质上是一个工具定义，告诉 AI 如何执行特定操作。

### 自定义工具示例

```json
{
  "plugins": [
    {
      "name": "database-query",
      "description": "执行 SQL 查询并返回结果",
      "command": "psql -t -A -c",
      "confirmBeforeRun": true
    },
    {
      "name": "deploy",
      "description": "部署应用到 staging 环境",
      "command": "./scripts/deploy.sh staging",
      "confirmBeforeRun": true
    }
  ]
}
```

### 内置工具

OpenCode 内置以下工具供 AI 调用：

- **file_read**：读取文件内容
- **file_write**：创建或修改文件
- **shell**：执行 shell 命令
- **grep**：在代码库中搜索文本
- **glob**：按模式匹配文件路径

## 最佳实践

### 项目级配置

为每个项目创建 `.opencode.json`，定义编码规范和工具权限，而不是依赖全局默认值。这样可以确保 AI 生成的代码符合项目约定。

```json
{
  "instructions": "这是一个 Vue 3 + TypeScript 项目，使用 Composition API 和 <script setup> 语法。样式用 Scoped CSS。组件命名用 PascalCase。"
}
```

### 版本控制集成

- 在执行 AI 生成的修改前先创建 git 分支：`git checkout -b ai/feature-name`
- 使用 `git diff` 审查所有 AI 生成的变更后再提交
- 不要让 OpenCode 直接推送到主分支
- 将 `.opencode.json` 纳入版本控制，确保团队配置一致

### 安全注意事项

- **永远不要**在配置中硬编码 API Key，使用环境变量
- 限制 `tools.shell.allowedCommands`，只允许项目需要的命令
- 对敏感目录（如含密钥、证书的目录）加入 `ignore` 列表
- 生产环境部署命令应设置 `confirmBeforeRun: true`
- 定期审查 AI 的操作日志，确保没有意外行为

::: warning
AI 可能会执行破坏性命令（如 `rm -rf`）。务必通过配置限制可执行的命令范围，并对写入操作开启确认机制。
:::
