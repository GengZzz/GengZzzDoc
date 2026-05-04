# AI 入门

从零理解大语言模型：它是怎么工作的、能做什么、怎么用好它。

## 什么是大语言模型

大语言模型（Large Language Model, LLM）是一种基于深度学习的文本生成系统。它通过阅读海量文本（书籍、代码、网页），学习语言的统计规律，从而能够理解和生成人类语言。

核心原理并不神秘：

1. **训练阶段**：模型在数万亿 token 的文本上训练，学习"给定前面的文字，预测下一个词"
2. **推理阶段**：用户输入一段文字（prompt），模型逐 token 生成最可能的后续内容
3. **没有"理解"**：模型不真正理解语义，但它学到的统计规律足够强大，能在多数场景下表现得像理解了一样

```text
输入:  "Python 中用来处理 HTTP 请求的库是"
模型:  P("requests")=0.72, P("urllib")=0.18, P("flask")=0.06, ...
输出:  "requests"
```

::: tip 一个直觉
把 LLM 想象成一个读过几乎所有公开文本的"超级自动补全"。你打前半句，它补后半句。只是它补得极其准确、连贯、有逻辑。
:::

## 关键概念

### Token

模型不直接处理文字，而是将文本拆分为 **token**。一个 token 可能是一个字、一个词、或一个词的一部分。

| 文本 | Token 数（大约） |
|------|-----------------|
| `你好` | 2 tokens |
| `Hello World` | 2 tokens |
| `人工智能` | 2-3 tokens |
| 一段 1000 字的中文文章 | 1200-1500 tokens |

计费和上下文限制都按 token 计算，了解 token 消耗有助于控制成本。

### 上下文窗口

上下文窗口（Context Window）是模型单次能处理的最大 token 数量。超出窗口的内容会被截断。

| 模型 | 上下文窗口 | 大约相当于 |
|------|-----------|-----------|
| GPT-4o | 128K tokens | 约 10 万字中文 |
| Claude Sonnet 4 | 200K tokens | 约 15 万字中文 |
| Gemini 2.5 Pro | 100 万 tokens | 约 70 万字中文 |

窗口越大，能塞入的上下文越多——整本书、整个代码库、长对话历史。但窗口大不代表模型会认真读每一部分，关键信息放在开头或结尾效果更好。

### Temperature

控制输出随机性的参数，取值范围通常为 0-2。

```text
temperature = 0    → 最确定的输出，每次结果几乎一样
temperature = 0.7  → 适度随机，适合大多数对话
temperature = 1.5  → 高度随机，适合创意写作
```

**代码生成用低 temperature（0-0.3）**，保证输出稳定可预测。
**内容创作可以用较高 temperature（0.7-1.0）**，获得多样化的表达。

### System Prompt 和 User Prompt

一次 API 调用通常包含两种消息：

```text
System:  你是一个资深 Python 工程师，回答简洁，附带代码示例。
User:    实现一个 LRU 缓存
```

- **System Prompt**：定义角色、风格、约束，模型会始终遵守
- **User Prompt**：用户的实际问题或请求

System Prompt 是控制模型行为的最强手段。写好 system prompt 比写好 user prompt 更重要。

## 模型家族

当前主流的三个模型家族：

| 厂商 | 模型系列 | 核心特点 |
|------|---------|---------|
| OpenAI | GPT-4o / GPT-4o-mini | 综合能力均衡，生态最成熟 |
| Anthropic | Claude Sonnet / Opus | 长上下文、指令遵循强、安全性高 |
| Google | Gemini Pro / Flash / Ultra | 超长上下文（100 万 token）、原生多模态 |

每个家族都有"快而便宜"和"慢而强大"两档。日常任务用轻量模型，复杂推理用旗舰模型。

```text
轻量模型:  GPT-4o-mini / Claude Haiku / Gemini Flash
旗舰模型:  GPT-4o / Claude Opus / Gemini Ultra
```

## Prompt 工程

提示词是与 AI 交互的唯一方式。同一个模型，不同的 prompt 效果天差地别。

### 基本原则

**1. 给足上下文**

```text
❌ 写一个排序算法
✅ 用 Python 实现归并排序，要求：
   - 输入：整数列表
   - 输出：升序排列的新列表
   - 不使用内置 sorted()
```

**2. 指定输出格式**

```text
请以 JSON 格式返回，包含以下字段：
- name: string
- age: number
- skills: string[]
```

**3. 给出示例（Few-shot）**

```text
将用户需求转为 SQL：

需求: 查找所有年龄大于 25 的用户
SQL: SELECT * FROM users WHERE age > 25

需求: 统计每个部门的人数
SQL: SELECT department, COUNT(*) FROM users GROUP BY department

需求: 找出最近 7 天注册的管理员
SQL:
```

**4. 让模型分步思考（Chain of Thought）**

```text
在回答之前，请先：
1. 分析问题的关键约束
2. 列出可能的解法
3. 比较各方案的优缺点
4. 给出最终推荐
```

### 常见模式

| 模式 | 用法 | 适用场景 |
|------|------|---------|
| Zero-shot | 直接提问 | 简单任务，模型已有足够知识 |
| Few-shot | 给 2-3 个示例 | 需要特定格式或风格 |
| Role-play | 设定角色 | 专业领域问答 |
| Chain of Thought | 要求分步推理 | 数学、逻辑、复杂分析 |
| ReAct | 推理 + 行动交替 | Agent 工作流 |

## Agent

Agent 是让 LLM 不止"回答问题"，而是"完成任务"的架构模式。

核心思想：让模型自己决定什么时候调用工具、调用哪个工具，然后根据工具返回的结果继续推理。

```text
用户: 帮我查一下北京明天的天气，如果下雨就提醒我带伞

Agent 思考过程:
1. 需要查天气 → 调用 get_weather("北京", "明天")
2. 工具返回: "中雨, 22°C"
3. 下雨了 → 调用 send_notification("明天北京中雨，记得带伞")
```

Agent 的关键组件：

- **LLM**：负责理解任务和决策
- **工具（Tools）**：API 调用、代码执行、文件读写等
- **记忆（Memory）**：保存对话历史和中间结果
- **规划（Planning）**：将复杂任务拆解为可执行步骤

## 工具选择

| 场景 | 推荐 | 原因 |
|------|------|------|
| IDE 内代码补全 | GitHub Copilot | 内联建议，零切换成本 |
| 复杂重构、架构设计 | [Claude Code](./claude.md) | 深度项目理解，200K 上下文 |
| 大型代码库分析 | [Gemini](./gemini.md) | 100 万 token，一次读完整个项目 |
| 终端 / SSH / CI 环境 | [OpenCode](./opencode.md) | 纯 CLI，可接本地模型 |
| API 集成开发 | [Codex](./codex.md) / Claude API | 结构化输出，Tool Use |
| 截图分析、多模态 | [Gemini](./gemini.md) | 原生图像/音频/视频支持 |

::: tip 组合使用
日常编码用 Copilot，复杂逻辑用 Claude Code，大项目分析用 Gemini。三者互补，覆盖绝大多数场景。
:::

## 进阶路径

```
入门（你现在在这里）
  │
  ├── 学会写好 Prompt     → [Prompt](./prompt.md)
  ├── 理解模型能力边界     → [模型基础](./model-basics.md)
  ├── 选一个工具上手       → [AI 工具](#工具选择)
  │
进阶
  │
  ├── 用 Agent 完成复杂任务 → [Agent](./agent.md)
  ├── API 集成到自己的项目  → [Claude API](./claude.md#api-使用示例)
  ├── MCP 工具协议         → [Claude MCP](./claude.md#mcpmodel-context-protocol)
  │
高级
  │
  ├── 微调和训练自己的模型
  ├── RAG（检索增强生成）
  ├── 多 Agent 协作系统
```
