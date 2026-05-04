# 标准库常用模块

Python 标准库被称为"内置电池"（batteries included），覆盖文件系统、正则表达式、数据格式、日期时间、日志和子进程等日常开发需求。

## os 与 pathlib

`pathlib`（Python 3.4+）是 `os.path` 的现代替代，提供面向对象的路径操作。

```python
from pathlib import Path

# 路径拼接（用 / 运算符）
project = Path("/home/user/project")
config = project / "config" / "settings.yaml"
print(config)  # /home/user/project/config/settings.yaml

# 路径属性
print(config.name)      # "settings.yaml"
print(config.stem)      # "settings"
print(config.suffix)    # ".yaml"
print(config.parent)    # /home/user/project/config

# 文件操作
Path("data.txt").write_text("hello", encoding="utf-8")
content = Path("data.txt").read_text(encoding="utf-8")

Path("data.bin").write_bytes(b"\x00\x01\x02")
data = Path("data.bin").read_bytes()

# 目录遍历
for py_file in Path(".").rglob("*.py"):
    print(py_file)

# 路径检查
print(config.exists())     # True / False
print(config.is_file())    # 是否为文件
print(config.is_dir())     # 是否为目录

# 创建目录（parents=True 递归创建）
Path("a/b/c").mkdir(parents=True, exist_ok=True)
```

::: tip 提示
优先使用 `pathlib` 而非 `os.path`。`pathlib` 更直观、可读性更好，且支持类型检查。
:::

## re 正则表达式

```python
import re

# 常用操作
text = "联系电话: 13800138000, 邮箱: alice@example.com"

# 匹配
phone = re.search(r'\d{11}', text)
print(phone.group())  # "13800138000"

# 查找所有
numbers = re.findall(r'\d+', text)
print(numbers)  # ['13800138000']

# 替换
cleaned = re.sub(r'\d{4}(\d{4})', r'****\1', text)
print(cleaned)  # "联系电话: ****38000, 邮箱: alice@example.com"

# 分组提取
match = re.match(r'(\w+)@(\w+)\.(\w+)', 'alice@example.com')
if match:
    print(match.groups())  # ('alice', 'example', 'com')
    print(match.group(1))  # "alice"

# 编译复用
email_pattern = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
emails = email_pattern.findall("发给 alice@test.com 和 bob@test.org")
```

```python
# 命名分组
pattern = r'(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})'
match = re.match(pattern, "2026-05-04")
print(match.groupdict())  # {'year': '2026', 'month': '05', 'day': '04'}
```

## json / csv / 数据格式

```python
import json
from pathlib import Path

# JSON 处理
data = {"users": [{"name": "Alice", "age": 25}]}

# 写入文件
Path("data.json").write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

# 读取文件
loaded = json.loads(Path("data.json").read_text(encoding="utf-8"))

# 处理不可序列化的对象
from datetime import datetime

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

print(json.dumps({"time": datetime.now()}, cls=CustomEncoder))
```

```python
import csv

# 写入 CSV
with open("users.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "age", "email"])
    writer.writeheader()
    writer.writerow({"name": "Alice", "age": 25, "email": "alice@test.com"})

# 读取 CSV
with open("users.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])
```

## datetime 时区处理

```python
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo  # Python 3.9+

# 获取当前时间
now = datetime.now()                          # 本地时间（无时区信息）
utc_now = datetime.now(timezone.utc)          # UTC 时间（带时区）

# 时区转换
beijing = ZoneInfo("Asia/Shanghai")
tokyo = ZoneInfo("Asia/Tokyo")

time_in_beijing = utc_now.astimezone(beijing)
time_in_tokyo = time_in_beijing.astimezone(tokyo)

print(time_in_beijing.strftime("%Y-%m-%d %H:%M:%S %Z"))
# "2026-05-04 12:00:00 CST"

# 解析时间字符串
dt = datetime.fromisoformat("2026-05-04T12:00:00+08:00")

# 时间计算
future = now + timedelta(days=7, hours=3)
diff = future - now
print(diff.days)  # 7
```

::: warning 警告
永远不要存储不带时区的 `datetime`。`datetime.now()` 返回的本地时间在不同服务器上结果不同，会导致严重 bug。始终使用 `datetime.now(timezone.utc)` 并在展示时转换时区。
:::

## logging 日志体系

```python
import logging

# 基础配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# 获取模块级 logger
logger = logging.getLogger(__name__)

logger.debug("调试信息")      # 不会输出（级别低于 INFO）
logger.info("服务启动")
logger.warning("磁盘空间不足")
logger.error("连接失败")
logger.critical("系统崩溃")
```

```python
# 生产环境配置：多 handler + 文件轮转
import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger("app")
logger.setLevel(logging.DEBUG)

# 控制台 handler
console = logging.StreamHandler()
console.setLevel(logging.WARNING)
console.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))

# 文件 handler（10MB 轮转，保留 5 个备份）
file_handler = RotatingFileHandler(
    "app.log", maxBytes=10*1024*1024, backupCount=5, encoding="utf-8"
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s"
))

logger.addHandler(console)
logger.addHandler(file_handler)
```

## subprocess 子进程

```python
import subprocess

# 简单命令
result = subprocess.run(["python", "--version"], capture_output=True, text=True)
print(result.stdout)   # "Python 3.11.x\n"
print(result.returncode)  # 0

# 带输入的管道
result = subprocess.run(
    ["grep", "error"],
    input="info: all good\nerror: something failed\n",
    capture_output=True,
    text=True
)
print(result.stdout)  # "error: something failed\n"

# 安全执行（shell=False，传入列表）
result = subprocess.run(
    ["ls", "-la"],
    capture_output=True,
    text=True,
    cwd="/home/user",  # 指定工作目录
    timeout=30,         # 超时控制
)

# 检查返回码
result.check_returncode()  # 非零返回码抛出 CalledProcessError
```

::: warning 警告
不要使用 `shell=True` 处理用户输入，会导致命令注入漏洞。始终使用列表形式传参：`subprocess.run(["ls", user_input])` 而非 `subprocess.run(f"ls {user_input}", shell=True)`。
:::
