---
sidebar: false
---

# Claude

Claude 是由 Anthropic 开发的 AI 助手，以安全性和实用性为核心设计目标。它能够理解长上下文、编写和分析代码、撰写文档、进行复杂推理，并通过工具调用与外部系统交互。当前模型系列包括 Haiku（轻量快速）、Sonnet（平衡性能）和 Opus（最强能力），覆盖从日常问答到复杂工程任务的各类场景。

## Claude 简介

Claude 基于 Anthropic 提出的 Constitutional AI（宪法 AI）理念训练，在保持高有用性的同时注重减少有害输出。与传统 AI 助手相比，Claude 在以下方面具有明显优势：

- **长上下文窗口**：支持最高 200K tokens 的上下文，可以一次性处理整本书或大型代码仓库
- **指令遵循能力强**：严格遵循系统提示和格式要求，适合自动化工作流
- **代码能力突出**：在多项编程基准测试中表现优异，支持主流编程语言
- **安全性优先**：经过专门的对齐训练，在敏感话题上表现更可靠

模型选择建议：

| 模型 | 特点 | 适用场景 |
|------|------|----------|
| Haiku | 最快、成本最低 | 简单分类、数据提取、快速问答 |
| Sonnet | 速度与能力平衡 | 日常编码、文档写作、中等复杂度推理 |
| Opus | 能力最强 | 复杂架构设计、深度分析、高质量内容创作 |

## 核心能力

### 长上下文理解

Claude 支持 200K tokens 的上下文窗口，可以处理约 15 万字的中文文本或约 5 万行代码。这意味着你可以：

- 一次性提交整个项目代码让 Claude 进行代码审查
- 上传长篇论文或技术规范让 Claude 总结分析
- 在多次对话中保持对整个项目的理解

::: tip
长上下文不等于无限上下文。对于超大项目，建议先提供目录结构和关键文件，而非盲目塞入所有代码。
:::

### 代码生成与分析

Claude 能够：

- 根据需求描述生成可运行的代码
- 审查现有代码并指出潜在问题
- 解释复杂代码的工作原理
- 在不同编程语言之间进行转换
- 调试错误并提供修复方案

### 工具使用（Tool Use）

Claude 支持通过 Tool Use 能力调用外部工具。你可以在 API 请求中定义工具的名称、描述和参数结构，Claude 会在需要时决定调用哪个工具并构造参数。

```python
tools = [
    {
        "name": "get_weather",
        "description": "获取指定城市的当前天气信息",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称，如 '北京'"
                }
            },
            "required": ["city"]
        }
    }
]
```

## 使用方式

### claude.ai 网页端

最直接的使用方式，访问 [claude.ai](https://claude.ai) 即可开始对话。免费版可使用 Sonnet 模型，Pro 用户可使用 Opus 并获得更高的使用额度。

### Claude Code

Anthropic 官方提供的 CLI 工具，让你在终端中直接与 Claude 协作编程。详见下一节。

### API 调用

通过 Anthropic Python/TypeScript SDK 将 Claude 集成到你的应用中。适合需要自动化或批量处理的场景。详见 [API 使用示例](#api-使用示例)。

### IDE 扩展

Claude 提供 VS Code 扩展，可以在编辑器内直接与 Claude 对话、获取代码建议。第三方工具如 Cursor、Continue 等也支持接入 Claude 模型。

## Claude Code

Claude Code 是 Anthropic 的官方命令行工具，让你在终端中直接使用 Claude 进行编程。它不只是一个聊天窗口，而是能够读写文件、执行命令、操作 Git 的完整开发助手。

### 安装

::: code-group

```bash [npm]
npm install -g @anthropic-ai/claude-code
```

```bash [yarn]
yarn global add @anthropic-ai/claude-code
```

```bash [pnpm]
pnpm add -g @anthropic-ai/claude-code
```

:::

### 基本使用

```bash
# 在项目目录中启动 Claude Code
cd your-project
claude

# 直接提问
claude -p "解释这个项目的结构"

# 执行特定任务
claude -p "修复 src/utils.ts 中的类型错误"
```

### 核心功能

Claude Code 能够：

- **文件编辑**：读取和修改项目中的文件，支持跨文件重构
- **命令执行**：运行测试、构建命令、安装依赖等
- **Git 操作**：创建分支、提交代码、生成 changelog、解决冲突
- **代码搜索**：在项目中搜索特定模式或实现
- **项目理解**：分析整体架构、依赖关系和代码风格

::: warning
Claude Code 默认在沙箱环境中运行，对文件写入和命令执行会有权限确认。在信任的项目中可通过 `--dangerously-skip-permissions` 跳过确认，但请谨慎使用。
:::

### CLAUDE.md 配置

在项目根目录创建 `CLAUDE.md` 文件，可以为 Claude Code 提供项目级别的上下文：

```markdown
# 项目规范

## 技术栈
- Vue 3 + TypeScript + Vite
- Pinia 状态管理
- Vitest 单元测试

## 代码规范
- 使用 Composition API
- 组件名使用 PascalCase
- 提交信息使用中文

## 常用命令
- `npm run dev` 启动开发服务器
- `npm run test` 运行测试
```

## API 使用示例

**安装 SDK：**

::: code-group

```bash [pip]
pip install anthropic
```

```bash [poetry]
poetry add anthropic
```

```bash [uv]
uv add anthropic
```

:::

使用 Anthropic Python SDK 调用 Claude API：

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "用 Python 实现一个 LRU 缓存，要求支持并发访问"}
    ]
)

print(message.content[0].text)
```

使用系统提示来控制 Claude 的行为：

```python
message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="你是一位资深 Python 工程师。回答时只给出代码和简短注释，不要多余解释。",
    messages=[
        {"role": "user", "content": "实现二叉树的层序遍历"}
    ]
)
```

流式响应（适合长内容生成）：

```python
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    messages=[{"role": "user", "content": "详细解释 Raft 共识算法"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

::: tip
API 请求中务必设置合理的 `max_tokens`，避免为短回答支付高额费用。可以通过 `temperature` 参数控制输出的随机性（0 表示最确定，1 表示更有创意）。
:::

## MCP（Model Context Protocol）

MCP 是 Anthropic 开源的模型上下文协议，用于将外部工具和数据源接入 Claude。它定义了一套标准化的接口，让 Claude 可以访问文件系统、数据库、API 服务等。

### 工作原理

MCP 采用客户端-服务器架构：

- **MCP Client**：内置于 Claude Code 或其他 MCP 客户端应用中
- **MCP Server**：提供具体工具实现的服务端

Claude Code 启动时会读取配置文件，连接 MCP Server，获取可用工具列表。当 Claude 需要调用工具时，通过 MCP 协议发送请求，Server 执行后返回结果。

### 配置示例

在项目根目录的 `.mcp.json` 中配置 MCP Server：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/allowed/dir"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token"
      }
    }
  }
}
```

常用 MCP Server 包括：

- `@anthropic-ai/mcp-server-filesystem` — 文件系统访问
- `@anthropic-ai/mcp-server-github` — GitHub API 集成
- `@anthropic-ai/mcp-server-postgres` — PostgreSQL 数据库查询
- `@anthropic-ai/mcp-server-slack` — Slack 消息收发

## Prompt 技巧

### 使用系统提示设定角色

```
system: 你是一位专注于分布式系统的资深后端工程师。
你的回答应该包含具体的代码示例，并优先考虑可靠性和性能。
```

### 结构化提示

将复杂需求拆分为明确的步骤和约束：

```
请完成以下任务：
1. 读取 config.yaml 文件
2. 提取所有数据库连接配置
3. 生成一个 Python 脚本，测试每个数据库连接是否可达
4. 输出格式：CSV（数据库名, 主机, 端口, 连接状态）

约束：
- 使用 asyncpg 进行 PostgreSQL 连接测试
- 连接超时设置为 5 秒
- 不要修改原始配置文件
```

### XML 标签分隔上下文

当需要为 Claude 提供多种类型的输入时，用 XML 标签区分：

```
<requirement>
实现用户注册功能，需要邮箱验证
</requirement>

<api_spec>
POST /api/v1/register
Body: { "email": string, "password": string, "name": string }
</api_spec>

<existing_schema>
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
</existing_schema>
```

::: tip
Claude 对 XML 标签的识别非常可靠。用 `<context>`、`<task>`、`<constraint>` 等标签组织提示词，比纯文本分隔更不容易出错。
:::

### 思维链（Chain of Thought）

对于复杂推理任务，让 Claude 先分析再回答：

```
在回答之前，请先：
1. 分析问题的关键约束
2. 列出可能的解法
3. 比较各方案的优缺点
4. 给出最终推荐
```

## 安全与隐私

### Constitutional AI

Claude 使用 Anthropic 提出的 Constitutional AI 方法进行训练。该方法通过一组"宪法原则"来引导模型自我改进，在减少有害输出的同时保持高有用性。与传统的 RLHF 相比，Constitutional AI 减少了对人工标注的依赖，使对齐过程更加可扩展和可解释。

### 数据使用政策

- API 调用的数据默认不用于模型训练
- claude.ai 对话数据可能用于改进服务（可选择退出）
- 企业版提供更严格的数据隔离和隐私保护

::: warning
永远不要在 API 请求中发送密码、密钥等敏感凭据。如需处理敏感数据，建议在本地对数据进行脱敏后再发送。
:::

### 企业级安全

- SOC 2 Type II 认证
- 支持数据驻留（Data Residency）选项
- 提供 SSO 和 SCIM 集成
- 支持 IP 白名单和 API 密钥细粒度权限控制

## 最佳实践

### 选择合适的模型

- 需要快速响应且任务简单（分类、提取、格式化）→ 使用 Haiku
- 日常编码和文档任务 → 使用 Sonnet
- 复杂架构设计或高质量内容创作 → 使用 Opus

不要为了"保险"而所有任务都用 Opus，成本差距很大。

### 控制成本

- 设置合理的 `max_tokens`，不要默认设成最大值
- 对于重复性任务，使用 Prompt Caching 降低输入 token 费用
- 大批量任务使用 Batch API，可享受 50% 折扣
- 缓存系统提示和固定上下文，避免每次请求重复发送

### 利用长上下文

- 提交整个项目代码时，先给目录结构，再给关键文件
- 在长对话中，重要的约束应该放在消息开头或结尾（注意力集中在首尾）
- 合理使用 `system` 提示来保持一致性

### 结合其他工具

- 代码编辑 → 配合 Claude Code 或 IDE 扩展
- 文档生成 → 配合 VitePress、MkDocs 等静态站点生成器
- 自动化流程 → 通过 API 集成到 CI/CD 管道
- 知识检索 → 使用 MCP 接入 RAG 系统或数据库
