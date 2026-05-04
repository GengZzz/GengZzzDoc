# Gemini

Gemini 是由 Google DeepMind 开发的多模态 AI 模型系列，能够同时理解文本、图像、音频和视频等多种输入形式。它以超长上下文窗口（最高 100 万 tokens）和强大的多模态推理能力著称，是当前最具竞争力的大语言模型之一。

## Gemini 简介

Gemini 于 2023 年 12 月首次发布，是 Google 在大语言模型领域的旗舰产品。与前代 PaLM 系列不同，Gemini 从设计之初就以原生多模态为目标，而非在文本模型基础上追加多模态能力。

核心特点：

- **原生多模态**：模型在训练阶段就融合了文本、图像、音频和视频数据，具备真正的跨模态理解能力。
- **超长上下文**：支持最高 100 万 tokens 的上下文窗口，可以一次性处理整本书籍、大型代码库或长视频。
- **多语言支持**：在 100+ 种语言上进行了优化，包括中文、日语、韩语等亚洲语言。
- **深度推理**：在数学、科学、编程等需要多步推理的任务上表现出色。

## 模型系列

Gemini 提供多个模型变体，针对不同场景进行了优化：

| 模型 | 定位 | 上下文长度 | 适用场景 |
| --- | --- | --- | --- |
| Gemini Ultra | 旗舰模型 | 100 万 tokens | 复杂推理、科研分析、多模态理解 |
| Gemini Pro | 平衡性能与成本 | 128K / 200 万 tokens | 日常对话、内容生成、API 集成 |
| Gemini Flash | 轻量高速 | 100 万 tokens | 高并发场景、实时响应、成本敏感应用 |
| Gemini Flash Lite | 极致轻量 | 100 万 tokens | 简单任务、批量处理、低延迟需求 |

::: tip 选择建议
大多数开发场景使用 Gemini Pro 即可满足需求。如果对延迟和成本有较高要求，优先选择 Gemini Flash。需要最强推理能力时再考虑 Gemini Ultra。
:::

::: details Gemini 模型版本命名规则
Google 的模型命名会随版本更新调整。建议始终参考 [Google AI 官方文档](https://ai.google.dev/gemini-api/docs) 获取最新的模型标识符，例如 `gemini-2.5-pro`、`gemini-2.0-flash` 等。
:::

## 核心能力

### 多模态理解

Gemini 可以同时处理多种类型的输入：

- **文本**：问答、摘要、翻译、代码生成。
- **图像**：图片描述、OCR 识别、图表分析、视觉推理。
- **音频**：语音转文字、音频内容分析、音乐理解。
- **视频**：视频内容描述、关键帧提取、动作识别。

### 超长上下文

Gemini 的 100 万 token 上下文窗口在实际应用中意味着：

- 一次性分析约 3 万行代码的代码库。
- 处理长达数百页的 PDF 文档。
- 理解长达 1 小时的视频内容。
- 在对话中保持极长的记忆范围。

### 代码生成与理解

Gemini 在编程任务上表现突出：

- 支持 Python、JavaScript、Java、C++、Go 等主流语言。
- 能够理解项目级代码结构并生成符合上下文的代码。
- 具备代码审查、bug 检测和重构建议能力。

### 多语言翻译

Gemini 的多语言能力不仅限于翻译，还支持跨语言的代码切换、文化适配和语义理解。

## 使用方式

### Google AI Studio

Google AI Studio 是最便捷的体验方式，适合快速原型验证和 prompt 调试。

1. 访问 [aistudio.google.com](https://aistudio.google.com)。
2. 使用 Google 账号登录。
3. 选择模型，输入 prompt，直接测试。

::: tip
Google AI Studio 对 Gemini Pro 和 Flash 提供免费额度，适合学习和小规模实验。
:::

### Gemini API

通过 Google AI SDK 调用 Gemini，适合将 AI 能力集成到自己的应用中。需要在 [Google AI Studio](https://aistudio.google.com/apikey) 创建 API 密钥。

### Google Cloud Vertex AI

企业级部署方案，适合需要数据隔离、合规审计和规模化调用的场景。

### Google Workspace 集成

Gemini 已内置于 Google Docs、Sheets、Slides、Gmail 等产品中，作为智能助手直接使用。

## API 使用示例

使用 Google AI Python SDK 进行对话和多模态调用。

### 安装 SDK

::: code-group

```bash [pip]
pip install google-genai
```

```bash [poetry]
poetry add google-genai
```

```bash [uv]
uv add google-genai
```

:::

### 基础对话

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="用 Python 实现一个 LRU 缓存，要求支持 get 和 put 操作"
)

print(response.text)
```

### 多模态输入（图片分析）

```python
from google import genai
from PIL import Image

client = genai.Client(api_key="YOUR_API_KEY")

image = Image.open("screenshot.png")

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[image, "描述这张截图中的 UI 布局，并指出可能的可用性问题"]
)

print(response.text)
```

### 流式输出

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")

stream = client.models.generate_content_stream(
    model="gemini-2.0-flash",
    contents="解释 Transformer 中自注意力机制的计算过程"
)

for chunk in stream:
    print(chunk.text, end="", flush=True)
```

### 多轮对话

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")
chat = client.chats.create(model="gemini-2.0-flash")

response = chat.send_message("什么是依赖注入？")
print(response.text)

response = chat.send_message("给出一个 Spring Boot 中的代码示例")
print(response.text)
```

## Gemini 与编程

### 代码生成

Gemini 擅长根据自然语言描述生成代码，尤其在以下场景表现优秀：

- 根据函数签名推断实现逻辑。
- 从注释或需求描述生成完整函数。
- 生成单元测试和边界条件测试。

### 代码审查

将代码片段提交给 Gemini，可以得到：

- 潜在 bug 和安全漏洞的识别。
- 性能优化建议。
- 代码风格和可读性改进建议。

### API 集成开发

Gemini 可以辅助 API 集成开发：

- 根据 API 文档生成调用代码。
- 解析和转换 API 响应数据。
- 处理认证、重试、错误处理等通用逻辑。

## 与其他工具对比

| 维度 | Gemini 2.5 Pro | GPT-4o | Claude Opus 4 |
| --- | --- | --- | --- |
| 最大上下文 | 100 万 tokens | 128K tokens | 200K tokens |
| 原生多模态 | 文本/图像/音频/视频 | 文本/图像/音频 | 文本/图像 |
| 代码生成 | 强 | 强 | 很强 |
| 多语言能力 | 优秀（100+ 语言） | 优秀 | 良好 |
| 价格（输入） | 中等 | 中等 | 较高 |
| 免费额度 | 有 | 无 | 无 |
| 工具使用 | 支持 | 支持 | 支持 |

::: tip 差异化优势
Gemini 最大的差异化优势在于 100 万 tokens 的超长上下文和原生视频理解能力。如果需要分析大型代码库、长文档或视频内容，Gemini 是当前最佳选择。
:::

## Prompt 技巧

### 多模态提示

同时输入图片和文本，让 Gemini 进行跨模态分析：

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        Image.open("architecture.png"),
        "这是我的系统架构图。请分析潜在的单点故障，并提出改进方案。"
    ]
)
```

### Few-shot 示例

提供 2-3 个输入输出示例，帮助模型理解期望的输出格式：

```python
prompt = """
将以下用户需求转换为 JSON 格式的 API 请求体。

示例 1:
输入: 用户名张三，年龄 25，邮箱 zhangsan@example.com
输出: {"name": "张三", "age": 25, "email": "zhangsan@example.com"}

示例 2:
输入: 用户名李四，年龄 30，邮箱 lisi@example.com，角色 admin
输出: {"name": "李四", "age": 30, "email": "lisi@example.com", "role": "admin"}

现在转换:
输入: 用户名王五，年龄 28，邮箱 wangwu@example.com，部门 engineering
"""

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=prompt
)
```

### 系统指令

使用系统指令定义模型的角色和行为边界：

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="解释 React 中 useEffect 的清理函数",
    config=genai.types.GenerateContentConfig(
        system_instruction="你是一个资深前端工程师，用简洁的语言和技术细节回答问题。不要泛泛而谈，给出可运行的代码示例。"
    )
)
```

## 最佳实践

### 利用超长上下文

- **代码库分析**：将整个项目的源码作为上下文，让 Gemini 理解项目结构后生成符合风格的代码。
- **文档问答**：将长文档（如技术手册、API 文档）直接传入，基于文档内容进行精准问答。
- **长对话记忆**：在长时间的对话中保持上下文连续性，避免重复提供背景信息。

### 多模态输入的优势

- **UI 分析**：截图 + 描述，让模型分析界面设计问题。
- **文档数字化**：传入扫描件或截图，提取结构化信息。
- **错误诊断**：传入错误截图和日志，让模型定位问题。

### 成本控制

- **按任务选模型**：简单任务用 Flash，复杂推理用 Pro，避免所有请求都用旗舰模型。
- **控制上下文长度**：不要盲目塞入全部上下文，只传入与任务相关的内容。
- **使用缓存**：对于重复的前缀内容，利用 API 的缓存机制减少 token 消耗。
- **批量处理**：将多个独立任务合并为一次 API 调用，减少请求次数。

::: warning 注意事项
API 密钥等敏感信息不要硬编码在代码中，应使用环境变量或密钥管理服务。同时注意 Gemini API 的速率限制和配额，生产环境建议做好请求队列和重试机制。
:::
