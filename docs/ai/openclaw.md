---
sidebar: false
---

# OpenClaw

OpenClaw（小龙虾）是一个开源的 AI Agent 框架，专注于构建可扩展的智能体应用。它提供了统一的接口来调用各种大语言模型，并内置了工具调用、记忆管理和多轮对话等能力，帮助开发者快速搭建生产级 AI 应用。

## OpenClaw 简介

OpenClaw 的设计目标是降低 AI Agent 的开发门槛。与 LangChain 等通用框架不同，OpenClaw 更注重开箱即用的体验和模块化扩展能力。

**核心定位：**

- 开源 AI Agent 框架
- 支持多种 LLM 后端（OpenAI、Anthropic、Ollama 等）
- 内置工具调用和记忆管理
- 轻量级、模块化设计

**框架特点：**

| 特点 | 说明 |
|------|------|
| 多模型支持 | 统一接口调用 OpenAI、Claude、Ollama 等 |
| 工具系统 | 插件式工具注册，支持自定义工具 |
| 记忆管理 | 短期/长期记忆，支持向量数据库存储 |
| 流式响应 | 原生支持流式输出 |
| TypeScript 优先 | 完整的类型定义，开发体验好 |

## 安装

::: code-group

```bash [npm]
npm install openclaw
```

```bash [yarn]
yarn add openclaw
```

```bash [pnpm]
pnpm add openclaw
```

:::

## 快速上手

### 基本用法

```typescript
import { OpenClaw } from 'openclaw'

const agent = new OpenClaw({
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
})

const response = await agent.chat('解释一下什么是 RAG 技术')
console.log(response)
```

### 使用工具

```typescript
import { OpenClaw, tool } from 'openclaw'

const searchTool = tool({
  name: 'web_search',
  description: '搜索互联网获取信息',
  parameters: {
    query: { type: 'string', description: '搜索关键词' },
  },
  execute: async ({ query }) => {
    // 实现搜索逻辑
    return `搜索结果: ${query} 的相关内容...`
  },
})

const agent = new OpenClaw({
  model: 'gpt-4o',
  tools: [searchTool],
})

const response = await agent.chat('最近有哪些新的前端框架发布？')
```

### 多轮对话与记忆

```typescript
const agent = new OpenClaw({
  model: 'gpt-4o',
  memory: {
    type: 'sliding-window',
    maxMessages: 20,
  },
})

await agent.chat('我叫小明，是一名后端工程师')
await agent.chat('我擅长 Go 和 Rust')
const response = await agent.chat('介绍一下我的技术背景')
// 模型会记住之前的信息
```

## 核心功能

### 工具系统

OpenClaw 的工具系统采用插件式设计，注册和使用都很简洁：

```typescript
import { OpenClaw, tool } from 'openclaw'

const weatherTool = tool({
  name: 'get_weather',
  description: '获取指定城市的天气',
  parameters: {
    city: { type: 'string', description: '城市名称' },
  },
  execute: async ({ city }) => {
    const data = await fetchWeatherAPI(city)
    return { temperature: data.temp, condition: data.desc }
  },
})

const calculatorTool = tool({
  name: 'calculator',
  description: '执行数学计算',
  parameters: {
    expression: { type: 'string', description: '数学表达式' },
  },
  execute: async ({ expression }) => {
    return eval(expression).toString()
  },
})

const agent = new OpenClaw({
  model: 'gpt-4o',
  tools: [weatherTool, calculatorTool],
})
```

::: tip 工具自动调度
OpenClaw 会根据用户的自然语言输入，自动判断需要调用哪个工具。你只需要定义工具的描述和参数，框架会处理 LLM 与工具之间的协调。
:::

### 记忆管理

支持多种记忆策略：

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| 滑动窗口 | 保留最近 N 轮对话 | 短会话、客服场景 |
| 摘要记忆 | 自动压缩历史对话 | 长会话 |
| 向量记忆 | 使用向量数据库存储 | 知识库场景 |

```typescript
const agent = new OpenClaw({
  model: 'gpt-4o',
  memory: {
    type: 'vector',
    provider: 'chromadb',
    collection: 'agent-memory',
  },
})
```

### 流式响应

```typescript
const agent = new OpenClaw({
  model: 'gpt-4o',
})

const stream = await agent.stream('写一篇关于微服务架构的技术博客')

for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

### 多模型切换

```typescript
import { OpenClaw } from 'openclaw'

// 使用 OpenAI
const agent1 = new OpenClaw({ model: 'gpt-4o', apiKey: '...' })

// 使用 Claude
const agent2 = new OpenClaw({ model: 'claude-sonnet-4-20250514', apiKey: '...' })

// 使用本地 Ollama
const agent3 = new OpenClaw({
  model: 'llama3.1',
  baseUrl: 'http://localhost:11434/v1',
})
```

## 配置选项

```typescript
interface OpenClawConfig {
  model: string
  apiKey?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
  memory?: MemoryConfig
  systemPrompt?: string
}
```

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `temperature` | 0.7 | 生成随机性，0 最确定 |
| `maxTokens` | 4096 | 最大输出 token 数 |
| `systemPrompt` | — | 系统提示词 |
| `memory` | 无 | 记忆配置 |
| `tools` | [] | 工具列表 |

## 与其他框架对比

| 对比 | OpenClaw | LangChain | AutoGPT |
|------|----------|-----------|---------|
| 定位 | Agent 框架 | 通用 LLM 框架 | 自主 Agent |
| 学习曲线 | 低 | 高 | 中 |
| 工具系统 | 插件式 | 链式 | 内置 |
| 记忆支持 | 内置 | 需配置 | 简单 |
| TypeScript | 原生 | Python 优先 | Python |
| 体积 | 轻量 | 庞大 | 中等 |

::: tip 选型建议
- 快速搭建 Agent 应用 → OpenClaw
- 需要复杂的链式调用和 RAG → LangChain
- 需要完全自主的 Agent → AutoGPT / CrewAI
:::

## 最佳实践

### 系统提示设计

```
你是一位专业的技术助手。
- 回答简洁，用代码示例说明
- 不确定时明确说明，不编造信息
- 使用中文回答
```

### 错误处理

```typescript
try {
  const response = await agent.chat(userInput)
} catch (error) {
  if (error.code === 'rate_limit') {
    // 限流，等待重试
    await sleep(5000)
  } else if (error.code === 'context_length') {
    // 上下文过长，清理记忆
    agent.clearMemory()
  }
}
```

### 性能优化

- 合理设置 `maxTokens`，避免过长输出
- 对于简单任务使用轻量模型（如 GPT-4o-mini）
- 利用流式响应提升用户感知速度
- 使用向量记忆代替全量历史对话
