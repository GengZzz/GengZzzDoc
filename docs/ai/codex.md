---
sidebar: false
---

# Codex

Codex 是 OpenAI 基于 GPT 系列微调的代码生成模型，专注于代码理解、生成与转换。它曾是 GitHub Copilot 的底层引擎，也是 OpenAI API 中 `code-davinci-002` 等模型的基础。虽然 Codex 独立 API 已于 2023 年停止公开访问，但其技术已融入 ChatGPT 和 GPT-4 系列，至今仍影响着整个 AI 编程工具生态。

## Codex 简介

OpenAI Codex 是 GPT-3 的后代模型，在大量公开源代码上进行了微调。它能够理解自然语言并将其转化为代码，支持十几种主流编程语言。

**核心定位：**

- 将自然语言描述转化为可执行代码
- 理解已有代码的语义并进行修改
- 支持跨语言代码转换与迁移
- 作为 GitHub Copilot 等产品的底层能力

**发展历程：**

| 时间 | 事件 |
|------|------|
| 2021 年 6 月 | OpenAI 发布 Codex 模型，开放私有 Beta |
| 2021 年 10 月 | GitHub Copilot 技术预览版发布，基于 Codex |
| 2022 年 6 月 | `code-davinci-002` 成为最强代码模型 |
| 2023 年 3 月 | Codex 独立 API 停止访问，能力并入 GPT-4 |
| 2024 年至今 | GPT-4o 系列继承并大幅超越 Codex 能力 |

::: tip Codex 与 GPT 的关系
Codex 并非全新架构，而是在 GPT-3 基础上使用 GitHub 公开代码数据微调而来。当前 ChatGPT 的代码能力已继承并超越了原始 Codex 模型。
:::

## 核心能力

Codex 围绕代码处理提供了以下核心能力：

- **代码补全** — 根据上下文自动补全函数、类或整段逻辑
- **代码解释** — 用自然语言解释代码的功能和实现思路
- **代码转换** — 在不同语言之间转换代码，或将旧语法升级为新版本
- **Bug 修复** — 分析代码中的错误并提供修复建议
- **测试生成** — 根据函数签名和业务逻辑自动生成单元测试
- **文档生成** — 为已有代码生成 docstring 和注释
- **多语言支持** — Python、JavaScript、TypeScript、Go、Ruby、Java、C++、Rust、SQL 等十余种语言

**代码转换示例：**

```python
# 将 JavaScript 转为 Python
# 输入：
# const sum = arr.reduce((a, b) => a + b, 0);

# Codex 输出：
total = sum(arr)
```

**Bug 修复示例：**

```python
# 有 Bug 的代码
def find_max(lst):
    max_val = 0  # 如果列表全是负数，结果错误
    for x in lst:
        if x > max_val:
            max_val = x
    return max_val

# Codex 修复建议
def find_max(lst):
    if not lst:
        raise ValueError("empty list")
    max_val = lst[0]  # 使用第一个元素初始化
    for x in lst[1:]:
        if x > max_val:
            max_val = x
    return max_val
```

## 使用方式

### ChatGPT 中使用

ChatGPT（GPT-4 及以上）集成了 Codex 的代码能力，直接在对话中描述需求即可生成代码。

### API 调用

通过 OpenAI Python SDK 调用代码相关模型。

**安装 SDK：**

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

**代码补全示例：**

```python
from openai import OpenAI

client = OpenAI()

response = client.completions.create(
    model="gpt-3.5-turbo-instruct",
    prompt="Write a Python function that sorts a list by frequency:\n\ndef sort_by_frequency(",
    max_tokens=200,
    temperature=0
)

print(response.choices[0].text)
```

**聊天补全示例（推荐）：**

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful programming assistant."},
        {"role": "user", "content": "用 Python 实现一个 LRU Cache，包含 get 和 put 方法"}
    ],
    temperature=0
)

print(response.choices[0].message.content)
```

::: tip 模型选择建议
纯代码生成场景推荐使用 `gpt-4o` 或 `gpt-4o-mini`，性价比高于旧版 Codex 模型。需要精确控制输出格式时可使用 Completions API，日常开发推荐 Chat Completions API。
:::

### IDE 集成

- **VS Code** — 安装 GitHub Copilot 插件，由 Codex 技术驱动，提供行级和函数级补全
- **JetBrains** — 同样通过 GitHub Copilot 插件支持 IntelliJ IDEA、PyCharm 等
- **Neovim / Vim** — 社区插件 `copilot.vim` 可接入
- **Xcode** — GitHub Copilot 已支持 Xcode 集成

**VS Code 中使用 Copilot 的基本流程：**

1. 在 VS Code 扩展市场搜索并安装 `GitHub Copilot`
2. 使用 GitHub 账号登录并授权
3. 编写代码时，灰色建议文本会自动出现
4. 按 `Tab` 接受建议，按 `Esc` 忽略
5. 使用 `Ctrl + Enter` 查看多个备选建议

::: tip Copilot Chat
GitHub Copilot 还提供 Chat 功能（`Ctrl + Shift + I`），可以在编辑器侧边栏中以对话方式提问、解释代码、生成测试等，体验类似于 ChatGPT。
:::

## Prompt 技巧

写好提示词是高效使用 Codex 类工具的关键。

**1. 提供充分的上下文**

```
# 项目使用 FastAPI + SQLAlchemy，数据库是 PostgreSQL
# 现有 User 模型有 id, name, email 字段
# 请实现一个分页查询用户的 API，支持按 name 模糊搜索
```

**2. 明确输入输出格式**

```
编写一个函数：
- 输入：字符串列表 ["apple", "banana", "apple", "cherry", "banana", "apple"]
- 输出：按频率降序排列的列表 ["apple", "banana", "cherry"]
- 语言：Python 3.11
```

**3. 指定语言版本和约束**

```
使用 TypeScript 5.x，要求：
- 严格模式 strict: true
- 使用泛型
- 包含完整的类型注解
- 不使用 any
```

**4. 给出示例引导风格**

```python
# 按照以下风格编写一个链表反转函数：
# 示例输入：1 -> 2 -> 3 -> None
# 示例输出：3 -> 2 -> 1 -> None
# 要求：使用迭代方式，时间复杂度 O(n)，空间复杂度 O(1)
```

## 与其他工具对比

| 维度 | Codex (OpenAI) | Claude Code (Anthropic) | GitHub Copilot |
|------|---------------|------------------------|----------------|
| 定位 | 代码生成模型 | 对话式编程助手 | IDE 内联补全 |
| 交互方式 | API / ChatGPT | CLI 终端工具 | 编辑器内嵌 |
| 核心优势 | 多语言代码生成 | 深度理解 + 项目级重构 | 实时补全、低延迟 |
| 适用场景 | 批量生成、脚本编写 | 复杂任务、架构设计 | 日常编码加速 |
| 上下文能力 | 单次请求受限 | 支持项目级上下文 | 文件级上下文 |

::: warning 不同工具各有侧重
没有一个工具能覆盖所有场景。日常编码用 Copilot 提效，复杂逻辑用 Claude Code 深入分析，批量生成或 API 集成用 OpenAI API，组合使用效果最佳。
:::

## 最佳实践

**安全审查生成的代码**

AI 生成的代码可能包含安全漏洞（如 SQL 注入、不安全的反序列化）。务必在使用前进行人工审查，尤其是涉及用户输入、认证和数据库操作的代码。

**不要直接用于生产环境**

生成的代码应视为初稿，需要经过测试和重构才能上线。AI 不了解项目的完整上下文和业务约束。

**结合测试使用**

让 AI 同时生成单元测试，用测试验证生成代码的正确性。

```python
# 先让 AI 生成函数
def parse_config(path: str) -> dict:
    ...

# 再让 AI 生成测试
def test_parse_config():
    result = parse_config("test_config.yaml")
    assert "database" in result
    assert isinstance(result["database"], dict)
```

**迭代优化**

不要期望一次生成完美代码。通过多轮对话逐步细化需求，效果远好于一次性的长提示词。

## 注意事项

**代码版权**

Codex 在开源代码上训练，生成的代码可能与已有开源项目相似。商用时需注意许可证合规问题，尤其是 Copyleft 类许可证（如 GPL）。

**安全漏洞风险**

模型可能复现训练数据中的常见漏洞模式，如硬编码密钥、不安全的加密算法等。务必使用安全扫描工具（如 `bandit`、`semgrep`）进行检查。

**Token 限制**

每个请求有 token 上限，过长的代码文件可能被截断。处理大文件时应分段提交，确保上下文完整性。

- `gpt-4o`：128K token 上下文
- `gpt-4o-mini`：128K token 上下文
- `gpt-3.5-turbo-instruct`：4K token 上下文

::: warning Token 消耗
代码生成的 token 消耗包括输入提示词和输出代码两部分。长上下文场景下费用增长较快，建议合理控制 prompt 长度并监控 API 用量。
:::
