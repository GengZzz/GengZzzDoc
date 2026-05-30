---
sidebar: false
title: "Hermes"
description: "Hermes 是 Nous Research 开发的开源大语言模型系列，基于 Llama 架构进行指令微调，以出色的指令跟随能力、推理能力和角色扮演能力著称。Hermes 3 是当前最新版本，在多项基准测试中表现优异。"
---

# Hermes

Hermes 是 Nous Research 开发的开源大语言模型系列，基于 Llama 架构进行指令微调，以出色的指令跟随能力、推理能力和角色扮演能力著称。Hermes 3 是当前最新版本，在多项基准测试中表现优异，是开源社区中最具影响力的 LLM 之一。

## Hermes 简介

Nous Research 是一家专注于开源 AI 研究的机构，致力于推动大语言模型的民主化。Hermes 系列模型通过精心设计的数据集和训练策略，在保持 Llama 基础能力的同时，显著提升了指令遵循、多轮对话和工具调用等实用能力。

**核心定位：**

- 开源大语言模型，可自由下载和部署
- 强调指令跟随和推理能力
- 支持工具调用（Function Calling）
- 适合角色扮演和创意写作

**发展历程：**

| 时间 | 版本 | 基座模型 | 要点 |
|------|------|----------|------|
| 2023 年 | Hermes 1 | Llama 1 | 首个版本，验证指令微调策略 |
| 2023 年 | Hermes 2 | Llama 2 | 改进推理和对话能力 |
| 2024 年 | Hermes 3 | Llama 3.1 | 支持工具调用、128K 上下文 |

::: tip Hermes 与 Llama 的关系
Hermes 基于 Meta 的 Llama 模型进行微调。Llama 提供基础语言能力，Hermes 在此基础上通过高质量指令数据集训练，使模型更擅长遵循用户指令、进行结构化输出和工具调用。
:::

## 模型规格

| 规格 | 参数 |
|------|------|
| 基座架构 | Llama 3.1 |
| 参数量 | 8B / 70B / 405B |
| 上下文长度 | 128K tokens |
| 许可证 | Llama 3.1 Community License |
| 量化格式 | GGUF、GPTQ、AWQ 支持 |

### 8B 版本

适合本地部署，可在消费级显卡（如 RTX 4090、RTX 3090）上运行。8B 版本在指令跟随和工具调用方面表现出色，是性价比最高的选择。

### 70B 版本

性能大幅提升，需要多卡或高端显卡（如 A100、H100）。适合对推理质量要求较高的生产环境。

## 核心能力

### 指令跟随

Hermes 3 在指令遵循方面表现优异，能够严格按照用户的要求执行任务，包括格式要求、约束条件和输出风格。

### 工具调用

Hermes 3 支持原生的 Function Calling，可以定义工具并让模型在需要时自动调用。

```json
{
  "tools": [
    {
      "name": "get_weather",
      "description": "获取指定城市的天气信息",
      "parameters": {
        "type": "object",
        "properties": {
          "city": {"type": "string", "description": "城市名称"}
        },
        "required": ["city"]
      }
    }
  ]
}
```

::: tip 工具调用格式
Hermes 使用特定的 XML 格式进行工具调用。模型会生成 `<tool_call>` 标签包裹的 JSON 调用请求，解析后执行并返回结果。
:::

### 结构化输出

Hermes 支持 JSON 模式，可以强制模型输出符合指定结构的 JSON 数据，适合数据提取、API 响应等场景。

### 角色扮演与创意写作

在角色扮演和创意写作方面，Hermes 是开源模型中表现最出色的之一，能够维持角色的一致性和上下文的连贯性。

## 使用方式

### 云端 API

通过第三方推理服务调用 Hermes：

| 平台 | 说明 |
|------|------|
| OpenRouter | 统一 API 接口，按 token 计费 |
| Together AI | 提供高速推理，支持批量调用 |
| Fireworks AI | 低延迟推理服务 |
| Groq | 基于 LPU 的超快推理 |

### 本地部署

#### Ollama

最简单的本地运行方式：

::: code-group

```bash [安装 Ollama]
curl -fsSL https://ollama.ai/install.sh | sh
```

```bash [拉取 8B 模型]
ollama run hermes3
```

```bash [拉取 70B 模型]
ollama run hermes3:70b
```

:::

#### vLLM

适合生产环境的高性能推理框架：

```bash
pip install vllm

python -m vllm.entrypoints.openai.api_server \
  --model NousResearch/Hermes-3-Llama-3.1-8B \
  --port 8000
```

#### llama.cpp

CPU 推理方案，不需要 GPU：

```bash
# 下载 GGUF 格式模型
# 运行推理
./server -m hermes-3-llama-3.1-8b.Q4_K_M.gguf \
  --host 0.0.0.0 --port 8080
```

## API 使用示例

通过 OpenAI 兼容接口调用：

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.openrouter.ai/api/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="nousresearch/hermes-3-llama-3.1-8b",
    messages=[
        {"role": "system", "content": "你是一位资深 Python 工程师。"},
        {"role": "user", "content": "实现一个线程安全的单例模式"}
    ],
    temperature=0.7,
    max_tokens=1024
)

print(response.choices[0].message.content)
```

使用 Ollama 本地调用：

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

response = client.chat.completions.create(
    model="hermes3",
    messages=[
        {"role": "user", "content": "解释 Raft 共识算法的核心思想"}
    ]
)

print(response.choices[0].message.content)
```

## 与其他模型对比

| 对比 | Hermes 3 8B | Llama 3.1 8B | Mistral 7B | Qwen 2.5 7B |
|------|------------|-------------|-----------|------------|
| 指令跟随 | 优秀 | 良好 | 良好 | 优秀 |
| 工具调用 | 原生支持 | 需微调 | 需微调 | 原生支持 |
| 角色扮演 | 优秀 | 一般 | 一般 | 良好 |
| 推理能力 | 良好 | 良好 | 良好 | 优秀 |
| 中文能力 | 中等 | 中等 | 中等 | 优秀 |
| 本地部署 | 方便 | 方便 | 方便 | 方便 |

::: tip 选型建议

- 英文场景 + 角色扮演/创意写作 → Hermes 3
- 中文场景 → Qwen 2.5 或 DeepSeek
- 纯代码任务 → CodeLlama 或 DeepSeek-Coder
- 通用能力最强（不计成本）→ GPT-4o 或 Claude Opus
:::

## 最佳实践

### 系统提示设计

Hermes 对系统提示的遵循度很高，设计好的系统提示能显著提升输出质量：

```
你是一位专注于系统架构的技术顾问。
回答格式：
1. 核心概念（1-2 句话）
2. 具体方案（含代码示例）
3. 注意事项（列出潜在风险）
```

### 温度设置

| 场景 | 建议温度 |
|------|---------|
| 代码生成 | 0.0 ~ 0.3 |
| 技术问答 | 0.3 ~ 0.5 |
| 创意写作 | 0.7 ~ 1.0 |
| 角色扮演 | 0.8 ~ 1.2 |

### 量化推荐

本地部署时，选择合适的量化格式：

| 量化 | 显存占用（8B） | 质量损失 |
|------|--------------|---------|
| FP16 | ~16 GB | 无 |
| Q8_0 | ~9 GB | 极小 |
| Q4_K_M | ~5.5 GB | 小 |
| Q3_K_M | ~4 GB | 明显 |
