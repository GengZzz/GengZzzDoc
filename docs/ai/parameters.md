---
title: "核心参数详解"
description: "调参是用好大语言模型的关键。本页详解每个参数的原理、取值和实战经验。"
---

# 核心参数详解

调参是用好大语言模型的关键。本页详解每个参数的原理、取值和实战经验。

## Token 详解

### 什么是 Token

Token 是模型处理文本的最小单位。模型不认识"字"或"词"，它只认识 token。文本在进入模型之前，会经过一个叫 Tokenizer（分词器）的组件，被拆分为 token 序列。

```text
英文: "I love programming"
Tokens: ["I", " love", " programming"]  → 3 个 token

中文: "我爱编程"
Tokens: ["我", "爱", "编", "程"]  → 4 个 token

混合: "Hello你好"
Tokens: ["Hello", "你好"]  → 2 个 token
```

### 分词原理

主流的分词方法是 BPE（Byte Pair Encoding，字节对编码）。它的工作方式：

1. 初始化：将文本拆为单个字符（或字节）
2. 统计相邻字符对的出现频率
3. 将出现频率最高的字符对合并为一个新 token
4. 重复步骤 2-3，直到达到目标词表大小

```text
训练过程示例：
初始: t, h, e, ▁c, a, t
第1轮: th, e, ▁c, a, t     (th 合并)
第2轮: the, ▁c, a, t       (the 合并)
第3轮: the, ▁ca, t         (ca 合并)
第4轮: the, ▁cat           (cat 合并)
最终: ["the", "▁cat"]      → 2 个 token
```

### 中英文 Token 差异

中文的 token 效率通常比英文低，这是当前分词器的主要痛点：

```text
英文 "Hello World"           → 2 tokens（高效）
中文 "你好世界"               → 3-4 tokens（一般）
日文 "こんにちは世界"          → 4-5 tokens（一般）
代码 "function main()"        → 4 tokens（中等）
```

| 文本内容 | 大约 Token 数 |
|---------|-------------|
| 1 个英文字母 | 1 token（平均） |
| 1 个中文字 | 1-2 tokens |
| 100 个英文单词 | 约 130 tokens |
| 100 个中文字 | 约 150-200 tokens |
| 1000 行 Python 代码 | 约 3000-5000 tokens |

::: tip 实用技巧
中英文混合的文本中，英文部分 token 消耗较低，中文部分较高。在计算成本和上下文限制时，中文文本需要打一个 1.5-2 倍的系数。
:::

### Token 计算方法

大多数 API 提供方都提供了 token 计算工具：

```python
# OpenAI tiktoken
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4o")
tokens = enc.encode("Hello, World!")
print(len(tokens))  # 4

# Anthropic
# 使用 API 响应中的 usage.prompt_tokens / usage.completion_tokens

# 通用估算
# 英文: 约 1 token / 4 字符
# 中文: 约 1 token / 1.5-2 字符
```

## 上下文窗口

上下文窗口（Context Window）是模型单次能处理的最大 token 数，包括输入和输出的总和。

### 各模型对比

| 模型 | 上下文窗口 | 大约相当于 |
|------|-----------|-----------|
| GPT-4o | 128K tokens | 约 10 万字中文 |
| GPT-4o-mini | 128K tokens | 约 10 万字中文 |
| Claude Sonnet 4 | 200K tokens | 约 15 万字中文 |
| Claude Opus 4 | 200K tokens | 约 15 万字中文 |
| Gemini 2.5 Pro | 1M tokens | 约 70 万字中文 |
| Gemini 2.0 Flash | 1M tokens | 约 70 万字中文 |
| Llama 3 70B | 128K tokens | 约 10 万字中文 |
| Qwen 2.5 72B | 128K tokens | 约 10 万字中文 |

### 如何有效利用上下文

上下文大不代表模型会认真阅读每一部分。注意力分布通常呈 U 形——开头和结尾的内容被关注最多，中间部分容易被忽略。

```text
上下文窗口中的注意力分布：

开头 ────────────────────────────────────── 结尾
高    中    低    低    低    中    高
↑                            ↑          ↑
重要指令                    被忽略      用户问题
放在最前面                   的内容      放在最后
```

::: tip 放置信息的最佳实践

- 指令和约束放在消息最开头
- 用户的具体问题放在消息末尾
- 不太重要的背景信息放中间
- 避免把关键信息埋在长段落中间
:::

::: warning 窗口 ≠ 记忆
200K 的上下文不意味着模型会"记住"所有内容。它只是能"看到"这么多，但对中间部分的关注度可能很低。对于超长上下文，考虑使用 RAG（检索增强生成）来按需提供相关片段。
:::

## Temperature

Temperature 控制模型输出的随机程度。它是对模型预测概率分布的缩放参数。

### 原理

在生成每个 token 时，模型会为词表中的每个 token 计算一个概率分数。Temperature 就是对这些分数进行缩放：

```text
原始分数:  [2.0, 1.0, 0.5, -1.0]

temperature = 0.1（低温）→ 分数差距放大 → 概率: [0.95, 0.04, 0.01, 0.00]
temperature = 1.0（默认）→ 保持原样    → 概率: [0.52, 0.25, 0.15, 0.08]
temperature = 2.0（高温）→ 分数差距缩小 → 概率: [0.35, 0.28, 0.22, 0.15]
```

Temperature 越低，模型越倾向于选择概率最高的 token（确定性高）；Temperature 越高，低概率的 token 也有机会被选中（随机性高）。

### 取值范围与推荐

| Temperature | 效果 | 适用场景 |
|------------|------|---------|
| 0 | 几乎完全确定性，每次输出相同 | 代码生成、数据提取、分类 |
| 0.1-0.3 | 轻微随机，输出基本稳定 | 代码审查、技术文档 |
| 0.5-0.7 | 适度随机，平衡准确与多样 | 日常对话、问答、翻译 |
| 0.8-1.0 | 较高随机性，表达更多样 | 内容创作、头脑风暴 |
| 1.2-2.0 | 高度随机，可能出现意外内容 | 诗歌、创意实验 |

::: warning Temperature 过高的风险
Temperature 超过 1.5 时，模型输出可能变得不可控——逻辑混乱、前后矛盾、甚至胡言乱语。除非是纯创意实验，一般不建议超过 1.0。
:::

## Top-p 和 Top-k

Top-p 和 Top-k 是另一种控制输出随机性的采样策略，它们在 token 选择阶段起作用。

### Top-k

只从概率最高的 k 个 token 中采样，其余 token 直接丢弃。

```text
原始概率排序:
token A: 0.35
token B: 0.25
token C: 0.15
token D: 0.10
token E: 0.08
token F: 0.04
token G: 0.02
...

top_k = 3 → 只从 A, B, C 中选
top_k = 5 → 只从 A, B, C, D, E 中选
```

### Top-p（Nucleus Sampling）

从概率最高的 token 开始累加，直到累积概率达到 p 阈值，只从这些 token 中采样。

```text
top_p = 0.9 的工作过程:
token A: 0.35  → 累积 0.35  (< 0.9，继续)
token B: 0.25  → 累积 0.60  (< 0.9，继续)
token C: 0.15  → 累积 0.75  (< 0.9，继续)
token D: 0.10  → 累积 0.85  (< 0.9，继续)
token E: 0.08  → 累积 0.93  (≥ 0.9，停止)
→ 从 A, B, C, D, E 中采样
```

Top-p 的优势是自适应：当模型对下一个 token 很确定时（某个 token 概率很高），候选集自动变小；当模型不确定时，候选集自动变大。

### 参数组合建议

```text
精确任务（代码、数据）：temperature=0, top_p 不生效
日常对话：           temperature=0.7, top_p=0.9
创意写作：           temperature=0.9, top_p=0.95
```

::: tip Temperature vs Top-p
大多数情况下，只用其中一个就好。OpenAI 官方建议：修改 Temperature 或 Top-p 其中一个，另一个保持默认。同时调整两个参数可能导致行为不可预测。
:::

## Max Tokens

Max Tokens 限制模型单次响应的最大 token 数。

```python
# API 调用示例
response = client.chat.completions.create(
    model="gpt-4o",
    max_tokens=500,      # 最多生成 500 个 token
    messages=[...]
)
```

### 使用要点

- Max Tokens 是**输出**长度上限，不包括输入
- 设太小会导致回答被截断
- 设太大会增加不必要的成本（即使模型只用了 100 token，你也为 4096 token 的额度付费取决于计费方式）
- 不同模型的最大输出上限不同

| 场景 | 推荐 Max Tokens |
|------|----------------|
| 简短问答、分类 | 256-512 |
| 代码片段生成 | 1024-2048 |
| 长文写作、详细分析 | 4096-8192 |
| 代码文件生成 | 4096-16384 |

::: warning 注意输出截断
如果发现模型回答突然中断，很可能是 Max Tokens 设太小了。检查响应中的 `finish_reason` 字段——如果是 `"length"` 就说明被截断了。
:::

## Frequency Penalty 和 Presence Penalty

这两个参数用于惩罚重复内容，防止模型在输出中反复说同样的词或句子。

### Frequency Penalty

根据 token 在已生成文本中出现的**次数**来惩罚。出现越多，惩罚越大。

```text
frequency_penalty = 0  → 不惩罚，模型可以自由重复
frequency_penalty = 0.5 → 轻微惩罚重复
frequency_penalty = 1  → 较强惩罚，显著减少重复
frequency_penalty = 2  → 强烈惩罚，可能导致用词过于生僻
```

### Presence Penalty

只要 token 在已生成文本中出现过，就施加**固定惩罚**，不管出现几次。

```text
presence_penalty = 0  → 不惩罚
presence_penalty = 1  → 出现过的 token 被抑制，鼓励模型谈论新话题
```

### 区别与使用

| 参数 | 惩罚方式 | 效果 |
|------|---------|------|
| Frequency Penalty | 按出现次数线性增加 | 减少词汇重复 |
| Presence Penalty | 出现即固定惩罚 | 鼓励引入新话题、新概念 |

::: tip 实际使用建议
大多数场景下这两个参数保持默认值（0）即可。如果你发现模型输出中有大量重复的短语或句子，可以设置 `frequency_penalty=0.3~0.8`。需要模型展开讨论多方面内容时，可以设置 `presence_penalty=0.3~0.6`。
:::

## Prompt 类型

一次 API 调用通常包含三种角色的消息：

### System Prompt

定义模型的角色、行为风格和全局约束。模型会始终遵守 System Prompt 的指示。

```text
System: 你是一位资深的 Python 后端工程师。
  - 回答简洁，直接给出代码
  - 使用 type hints
  - 遵循 PEP 8 规范
  - 不确定时说明可能的问题
```

### User Prompt

用户的实际问题或请求。

```text
User: 实现一个线程安全的 LRU 缓存，支持过期时间
```

### Assistant Prompt

模型的回复，也可以由用户预填充来引导模型的输出方向。

```text
Assistant: 好的，下面是一个基于 OrderedDict 和 threading.Lock 的实现：
```python
from collections import OrderedDict
...
```

### 消息组合示例

```python
messages = [
    {
        "role": "system",
        "content": "你是 Python 专家，回答只给代码和简短注释。"
    },
    {
        "role": "user",
        "content": "实现一个生产者-消费者队列"
    }
]
```

::: tip System Prompt 是最强大的控制手段
写好 System Prompt 比反复调整参数更有效。一个好的 System Prompt 能显著提升输出质量。详见 [Prompt 基础技巧](./prompt-basics.md)。
:::

## 实际调参经验表

以下是不同场景下推荐的参数组合，可直接用于 API 调用：

### 代码生成

```python
{
    "temperature": 0,
    "top_p": 1,
    "max_tokens": 4096,
    "frequency_penalty": 0,
    "presence_penalty": 0
}
```

追求确定性和准确性。Temperature 设为 0 保证每次输出一致。

### 对话问答

```python
{
    "temperature": 0.7,
    "top_p": 0.9,
    "max_tokens": 2048,
    "frequency_penalty": 0.3,
    "presence_penalty": 0
}
```

适度随机让回答更自然，轻微的 frequency penalty 避免车轱辘话。

### 创意写作

```python
{
    "temperature": 0.9,
    "top_p": 0.95,
    "max_tokens": 4096,
    "frequency_penalty": 0.5,
    "presence_penalty": 0.6
}
```

高温增加表达多样性，presence penalty 鼓励引入新元素。

### 数据分析与提取

```python
{
    "temperature": 0,
    "top_p": 1,
    "max_tokens": 2048,
    "frequency_penalty": 0,
    "presence_penalty": 0
}
```

与代码生成类似，追求精确和稳定。

### 综合速查表

| 场景 | Temperature | Top-p | Max Tokens | Freq Penalty | Pres Penalty |
|------|------------|-------|-----------|-------------|-------------|
| 代码生成 | 0 | 1 | 4096 | 0 | 0 |
| 代码审查 | 0.1-0.3 | 1 | 2048 | 0 | 0 |
| 技术文档 | 0.3-0.5 | 0.9 | 4096 | 0.2 | 0 |
| 日常对话 | 0.7 | 0.9 | 2048 | 0.3 | 0 |
| 头脑风暴 | 0.8-1.0 | 0.95 | 2048 | 0.5 | 0.5 |
| 创意写作 | 0.9 | 0.95 | 4096 | 0.5 | 0.6 |
| 数据提取 | 0 | 1 | 1024 | 0 | 0 |
| 翻译 | 0.3 | 0.9 | 2048 | 0.2 | 0 |

::: warning 没有万能参数
上表只是起点。不同模型对同一参数的响应可能不同，不同任务的要求也千差万别。建议从推荐值开始，根据实际效果微调。
:::
