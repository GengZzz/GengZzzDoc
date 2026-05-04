# AI API 接入实战

通过 API 调用大语言模型，可以将 AI 能力深度集成到自有产品、自动化流水线和内部工具中。相比网页端，API 提供了更高的灵活性、可编程性和规模化能力。本文覆盖 OpenAI、Anthropic、Google Gemini 三大平台的接入方式，并介绍统一接口方案和 Tool Use 实战。

## 为什么用 API 而不是网页端

网页端适合探索和单次对话，但以下场景必须依赖 API：

- **产品集成**：在自己的应用中嵌入 AI 能力（聊天机器人、代码助手）
- **自动化流水线**：CI/CD 中自动生成文档、代码审查
- **批量处理**：对数千条数据执行分类、摘要、翻译
- **自定义控制**：精确控制 temperature、max_tokens、系统提示等参数

::: warning
使用 API 需要妥善保管密钥。永远不要将 API Key 提交到 Git 仓库或暴露在前端代码中。建议使用环境变量或密钥管理服务。
:::

## OpenAI API 接入

### 安装 SDK

::: code-group

```bash [pip]
pip install openai
```

```bash [poetry]
poetry add openai
```

```bash [uv]
uv add openai
```

:::

### 基础调用

```python
from openai import OpenAI

client = OpenAI(api_key="sk-xxx")  # 或设置环境变量 OPENAI_API_KEY

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "你是一位资深 Python 工程师。"},
        {"role": "user", "content": "用 Python 实现一个线程安全的单例模式"}
    ],
    temperature=0.7,
    max_tokens=1024,
)

print(response.choices[0].message.content)
print(f"消耗 tokens: {response.usage.total_tokens}")
```

### 流式响应

流式响应适合长内容生成，可以边生成边展示，减少用户等待时间。

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "详细解释 Python 的 GIL 机制"}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta
    if delta.content:
        print(delta.content, end="", flush=True)
```

### 错误处理

```python
from openai import RateLimitError, APIError, APITimeoutError
import time

def chat_with_retry(messages, max_retries=3):
    """带重试机制的 API 调用"""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o", messages=messages, max_tokens=1024, timeout=30,
            )
            return response.choices[0].message.content
        except RateLimitError:
            time.sleep(2 ** attempt)
        except APITimeoutError:
            print(f"超时，第 {attempt + 1} 次重试...")
        except APIError as e:
            if attempt == max_retries - 1:
                raise
    return None
```

## Anthropic API 接入

### 安装 SDK

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

### 基础调用

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-ant-xxx")

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="你是一位专注于分布式系统的资深后端工程师。",
    messages=[
        {"role": "user", "content": "解释 Raft 共识算法的核心流程"}
    ],
)

print(message.content[0].text)
```

::: tip
Anthropic 的 `system` 是顶层参数，不需要放入 messages。这与 OpenAI 不同——OpenAI 将 system prompt 作为 `role: "system"` 的消息传入。
:::

### 流式响应

```python
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    messages=[{"role": "user", "content": "实现一个支持过期时间的内存缓存"}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

## Google Gemini API 接入

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

### 基础调用

```python
from google import genai

client = genai.Client(api_key="your-api-key")

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="用 Python 实现快速排序，并分析时间复杂度",
)
print(response.text)
```

多轮对话（自动携带上下文）：

```python
chat = client.chats.create(model="gemini-2.0-flash")

response = chat.send_message("解释什么是装饰器")
print(response.text)

response = chat.send_message("给我一个带参数的装饰器示例")
print(response.text)
```

## 统一接口方案：LiteLLM

当项目需要同时对接多个提供商时，LiteLLM 提供 OpenAI 兼容的 API 格式，用同一套代码调用 100+ 种模型。

### 安装

::: code-group

```bash [pip]
pip install litellm
```

```bash [poetry]
poetry add litellm
```

```bash [uv]
uv add litellm
```

:::

### 使用示例

```python
import litellm

# 统一接口调用不同厂商
for model in [
    "openai/gpt-4o",
    "anthropic/claude-sonnet-4-20250514",
    "gemini/gemini-2.0-flash",
]:
    response = litellm.completion(
        model=model,
        messages=[{"role": "user", "content": "你好"}],
    )
    print(f"{model}: {response.choices[0].message.content[:50]}...")
```

## Tool Use / Function Calling 实战

Tool Use 让模型在对话中调用你定义的函数，实现查询数据库、调用 API 等操作。

### 定义工具

```python
import json

tools = [
    {
        "type": "function",
        "function": {
            "name": "query_database",
            "description": "查询业务数据库（只支持 SELECT）",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "SQL 查询语句"}
                },
                "required": ["sql"]
            }
        }
    }
]
```

### 让模型调用并处理返回

```python
def execute_tool_call(tool_call):
    func_name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)
    if func_name == "query_database":
        sql = args["sql"]
        if not sql.strip().lower().startswith("select"):
            return json.dumps({"error": "只允许 SELECT"})
        return json.dumps({"rows": [{"name": "张三", "balance": 1500}]})
    return json.dumps({"error": f"未知函数: {func_name}"})

def chat_with_tools(user_message):
    messages = [{"role": "user", "content": user_message}]
    response = client.chat.completions.create(
        model="gpt-4o", messages=messages, tools=tools,
    )
    assistant = response.choices[0].message

    if assistant.tool_calls:
        messages.append(assistant)
        for tc in assistant.tool_calls:
            messages.append({
                "role": "tool", "tool_call_id": tc.id,
                "content": execute_tool_call(tc),
            })
        response = client.chat.completions.create(
            model="gpt-4o", messages=messages,
        )
    return response.choices[0].message.content

print(chat_with_tools("帮我查一下张三的余额"))
```

::: tip
在 Anthropic SDK 中，工具定义使用 `input_schema` 而非 `parameters`，工具结果通过 `tool_result` 内容块返回。API 设计不同但核心流程一致。
:::

## 对话管理

### 维护历史消息与 Token 控制

```python
import tiktoken

class ConversationManager:
    def __init__(self, model="gpt-4o", max_tokens=4096):
        self.model = model
        self.max_context_tokens = max_tokens
        self.messages = []
        self.system_prompt = None

    def set_system(self, prompt: str):
        self.system_prompt = prompt

    def _count_tokens(self, text: str) -> int:
        return len(tiktoken.encoding_for_model(self.model).encode(text))

    def _trim_history(self):
        """滑动窗口：保留 system + 最近对话"""
        total = self._count_tokens(self.system_prompt or "")
        kept = []
        for msg in reversed(self.messages):
            t = self._count_tokens(msg["content"])
            if total + t > self.max_context_tokens * 0.8:
                break
            total += t
            kept.insert(0, msg)
        self.messages = kept

    def chat(self, user_input: str) -> str:
        self.messages.append({"role": "user", "content": user_input})
        self._trim_history()
        api_msgs = []
        if self.system_prompt:
            api_msgs.append({"role": "system", "content": self.system_prompt})
        api_msgs.extend(self.messages)
        response = client.chat.completions.create(
            model=self.model, messages=api_msgs, max_tokens=1024,
        )
        reply = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": reply})
        return reply
```

::: warning
`tiktoken` 仅适用于 OpenAI 模型。Anthropic 和 Gemini 有各自的 token 计算方式，实际项目中应使用对应 SDK 的计数方法。
:::

## 异步调用与并发

需要并行处理大量请求时，使用异步客户端可以显著提升吞吐量。

```python
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()
semaphore = asyncio.Semaphore(10)  # 限制并发数

async def ask(question: str) -> str:
    async with semaphore:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": question}],
            max_tokens=256,
        )
        return response.choices[0].message.content

async def batch_ask(questions: list[str]) -> list[str]:
    return await asyncio.gather(*[ask(q) for q in questions])

async def main():
    questions = [
        "Python 中 list 和 tuple 的区别？",
        "什么是闭包？",
        "解释 Python 的垃圾回收机制。",
        "asyncio 和 threading 的区别？",
        "什么是元类？",
    ]
    results = await batch_ask(questions)
    for q, a in zip(questions, results):
        print(f"Q: {q}\nA: {a[:80]}...\n")

asyncio.run(main())
```

::: tip
生产中务必使用信号量限制并发数，避免触发 API 速率限制。`asyncio.Semaphore(10)` 可将并发控制在 10 个请求以内。
:::
