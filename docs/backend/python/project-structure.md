# 项目结构与工程化

Python 项目的工程化围绕 `pyproject.toml` 展开，统一管理依赖、构建、测试和发布。虚拟环境隔离项目依赖，pytest 驱动测试。

## 包结构设计

标准的 Python 项目结构：

```
myproject/
├── pyproject.toml          # 项目元数据和构建配置
├── README.md
├── src/
│   └── myproject/          # 包代码（src layout）
│       ├── __init__.py
│       ├── core/
│       │   ├── __init__.py
│       │   └── models.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py
│       └── utils/
│           ├── __init__.py
│           └── helpers.py
├── tests/
│   ├── conftest.py         # pytest fixtures
│   ├── test_models.py
│   └── test_routes.py
└── docs/
```

::: tip 提示
`src/` layout（包放在 src 目录下）比 flat layout（包在根目录）更安全。它确保测试和开发时必须先安装包，避免"在我的机器上能跑"的问题。
:::

## pyproject.toml

`pyproject.toml` 是 Python 项目的单一配置源，替代了 `setup.py`、`setup.cfg`、`requirements.txt`、`.flake8` 等多个文件。

```toml
[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.poetry]
name = "myproject"
version = "0.1.0"
description = "我的 Python 项目"
authors = ["GengZzz"]
readme = "README.md"
packages = [{include = "myproject", from = "src"}]

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.110.0"
sqlalchemy = "^2.0"
pydantic = "^2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
pytest-cov = "^5.0"
mypy = "^1.8"
ruff = "^0.3"

[tool.ruff]
line-length = 120
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --cov=myproject --cov-report=term-missing"

[tool.mypy]
python_version = "3.11"
strict = true
```

## 虚拟环境管理

### venv（标准库）

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows
pip install -e ".[dev]"      # 可编辑模式安装（含开发依赖）
```

### poetry（推荐）

```bash
# 安装依赖（从 pyproject.toml 读取，生成 poetry.lock）
poetry install

# 添加依赖
poetry add httpx
poetry add --group dev pytest-cov

# 运行命令（在虚拟环境中）
poetry run pytest
poetry run python -m myproject

# 进入虚拟环境 shell
poetry shell
```

### pipenv

```bash
pipenv install requests
pipenv install --dev pytest
pipenv run pytest
```

## 测试（pytest）

### 基本用法

```python
# tests/test_models.py
def test_user_creation():
    from myproject.core.models import User
    user = User(name="Alice", age=25)
    assert user.name == "Alice"
    assert user.age == 25

def test_user_invalid_age():
    from myproject.core.models import User
    import pytest
    with pytest.raises(ValueError, match="年龄不能为负"):
        User(name="Alice", age=-1)
```

### Fixtures

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from myproject.core.models import Base

@pytest.fixture
def db_session():
    """每个测试用例独立的数据库 Session。"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def sample_user(db_session):
    """预置测试用户。"""
    from myproject.core.models import User
    user = User(name="Alice", age=25, email="alice@test.com")
    db_session.add(user)
    db_session.commit()
    return user

# 使用 fixture
def test_find_user(db_session, sample_user):
    user = db_session.query(User).filter_by(name="Alice").first()
    assert user is not None
```

### 参数化测试

```python
import pytest

@pytest.mark.parametrize("input_str,expected", [
    ("hello", 5),
    ("", 0),
    ("你好世界", 4),
    ("a b c", 5),
])
def test_string_length(input_str, expected):
    assert len(input_str) == expected
```

### Mock

```python
from unittest.mock import patch, MagicMock

# mock 外部依赖
@patch("myproject.api.routes.external_api_call")
def test_api_with_mock(mock_api):
    mock_api.return_value = {"status": "ok"}

    from myproject.api.routes import get_data
    result = get_data()
    assert result["status"] == "ok"
    mock_api.assert_called_once()
```

## 打包与发布

```bash
# 构建
poetry build

# 发布到 PyPI
poetry publish

# 发布到私有仓库
poetry config repositories.private https://private.pypi.org/simple/
poetry publish -r private
```

## CI 集成

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install poetry
        run: pipx install poetry

      - name: Install dependencies
        run: poetry install

      - name: Lint
        run: poetry run ruff check .

      - name: Type check
        run: poetry run mypy src/

      - name: Test
        run: poetry run pytest

      - name: Build
        run: poetry build
```

::: tip 提示
CI 流程的核心步骤：lint（ruff）> 类型检查（mypy）> 测试（pytest）> 构建（poetry build）。lint 和类型检查放在测试之前，尽早发现问题。
:::
