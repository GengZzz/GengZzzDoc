# AI

这里记录大语言模型基础、提示词工程、Agent 工作流和 AI 编程工具的实用笔记。

## 学习路线

```
模型基础 → Prompt 提示词 → Agent 工作流 → AI 工具实战
```

## 基础知识

| 主题 | 说明 | 入口 |
|------|------|------|
| 模型基础 | 能力边界、上下文窗口、推理模式、参数调优 | [开始学习](./model-basics.md) |
| Prompt | 提示词结构、上下文组织、可复用模板 | [开始学习](./prompt.md) |
| Agent | 目标拆解、工具调用、工作流编排 | [开始学习](./agent.md) |

## AI 工具

| 工具 | 开发者 | 说明 |
|------|--------|------|
| [Codex](./codex.md) | OpenAI | 代码生成模型，GPT 系列在编程领域的延伸，GitHub Copilot 底层能力 |
| [Claude](./claude.md) | Anthropic | 200K 长上下文、Claude Code CLI、MCP 工具协议 |
| [Gemini](./gemini.md) | Google | 100 万 token 上下文、原生多模态（文本/图像/音频/视频） |
| [OpenCode](./opencode.md) | 开源社区 | 终端优先的 AI 编程助手，支持多模型后端 |

## 为什么学 AI

AI 正在重塑软件开发的工作方式。不是替代程序员，而是扩展能力边界：

- **代码生成**：从自然语言描述直接生成可运行代码，减少重复劳动
- **代码审查**：自动发现潜在 bug、安全漏洞和性能问题
- **文档写作**：为函数、模块和项目自动生成文档
- **学习加速**：遇到不熟悉的 API 或框架时，AI 能快速给出可运行示例
- **自动化工作流**：通过 Agent 将多个工具串联，完成复杂任务

## 工具选择指南

不同场景适合不同的 AI 工具：

| 场景 | 推荐工具 | 原因 |
|------|----------|------|
| IDE 内实时补全 | GitHub Copilot (Codex) | 内联建议，零切换成本 |
| 复杂重构、架构设计 | Claude Code | 深度理解项目上下文，200K 窗口 |
| 大型代码库分析 | Gemini | 100 万 token 上下文，一次读完整个项目 |
| 终端 / SSH / CI/CD | OpenCode | 纯 CLI，可接本地模型，无需 GUI |
| API 集成开发 | Claude API / Gemini API | 结构化输出，Tool Use 能力 |
| 多模态任务（截图分析） | Gemini | 原生支持图像、音频、视频输入 |

::: tip 组合使用
没有一个工具能覆盖所有场景。日常编码用 Copilot，复杂任务用 Claude Code，大项目分析用 Gemini，三者互补效果最佳。
:::

## 核心概念速览

**上下文窗口（Context Window）**：模型一次能处理的 token 数量上限。决定了你能一次提交多少代码或文档给 AI。

- Claude：200K tokens（约 15 万字中文）
- Gemini：最高 100 万 tokens
- GPT-4o：128K tokens

**Token**：模型处理文本的最小单位。中文约 1 个字 = 1-2 个 token，英文约 1 个单词 = 1-2 个 token。

**Temperature**：控制输出随机性的参数。值越低输出越确定（适合代码生成），值越高越有创意（适合内容创作）。

**Tool Use**：模型调用外部工具的能力。比如让 AI 调用数据库查询、执行 shell 命令、访问 API 等。

**MCP（Model Context Protocol）**：Anthropic 提出的模型上下文协议，标准化 AI 与外部工具/数据源的连接方式。
