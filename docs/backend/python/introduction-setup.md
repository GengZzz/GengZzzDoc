# Python 简介与环境搭建

Python 由 Guido van Rossum 于 1991 年发布，采用缩进来定义代码块，强调可读性。它是一门解释型语言，但"解释"的具体实现因运行时而异。

## Python 实现

CPython 是官方实现，用 C 语言编写，代码先编译为字节码再由虚拟机执行。日常说的"Python"默认指 CPython。

| 实现 | 说明 | 适用场景 |
|------|------|---------|
| CPython | 官方实现，C 语言编写 | 通用开发，默认选择 |
| PyPy | JIT 编译，比 CPython 快 5-10 倍 | CPU 密集型纯 Python 代码 |
| Jython | JVM 上的 Python | 需要与 Java 互操作 |
| MicroPython | 嵌入式微控制器 | IoT、单片机开发 |

::: tip 提示
PyPy 对 C 扩展（如 NumPy、Pandas）兼容性有限。科学计算场景仍然推荐 CPython。
:::

## 包管理与虚拟环境

### pip

pip 是 CPython 内置的包管理器，从 PyPI（Python Package Index）下载安装包。

```bash
# 安装包
pip install requests

# 安装指定版本
pip install requests==2.31.0

# 从 requirements.txt 安装
pip install -r requirements.txt

# 导出当前环境依赖
pip freeze > requirements.txt
```

### venv

venv 是标准库自带的虚拟环境工具，为每个项目创建独立的 Python 运行环境，避免全局包污染。

```bash
# 创建虚拟环境
python -m venv .venv

# 激活（Windows）
.venv\Scripts\activate

# 激活（Linux/macOS）
source .venv/bin/activate

# 退出虚拟环境
deactivate
```

### poetry

poetry 是现代 Python 依赖管理工具，集依赖解析、虚拟环境管理、打包发布于一体。它使用 `pyproject.toml` 作为单一配置源，通过 `poetry.lock` 锁定精确版本。

```bash
# 安装 poetry
pip install poetry

# 初始化项目
poetry init

# 添加依赖
poetry add requests

# 添加开发依赖
poetry add --group dev pytest

# 安装所有依赖
poetry install

# 运行命令
poetry run python main.py
```

::: warning 警告
poetry 默认将虚拟环境存储在全局目录（`~/.cache/pypoetry/virtualenvs`）。如果希望虚拟环境在项目目录下，运行：
```bash
poetry config virtualenvs.in-project true
```
:::

## IDE 配置

### VS Code

推荐安装以下扩展：

- **Python** (Microsoft) — 语法高亮、调试、linting
- **Pylance** — 类型检查、智能补全
- **Ruff** — 快速 linter 和 formatter，替代 flake8 + black
- **Python Docstring Generator** — 自动生成 docstring

在 `.vscode/settings.json` 中配置：

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true
  },
  "python.testing.pytestEnabled": true
}
```

### PyCharm

PyCharm Community 版免费且功能完整。关键配置：

1. `File > Settings > Project > Python Interpreter` — 选择虚拟环境中的 Python 解释器
2. `Settings > Tools > Python Integrated Tools` — 将 Testing 设为 pytest
3. 启用 `Settings > Editor > Inspections > Python > PEP 8 coding style violation`

## Hello World

```python
# hello.py
def greet(name: str) -> str:
    """返回问候语。"""
    return f"Hello, {name}!"

if __name__ == "__main__":
    message = greet("World")
    print(message)
```

```bash
python hello.py
# 输出: Hello, World!
```

`if __name__ == "__main__"` 保证 `greet()` 函数在被其他模块 `import` 时不自动执行。这是 Python 模块的惯用写法。
