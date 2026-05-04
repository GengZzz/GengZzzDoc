# Web 框架

Python Web 生态有三个主流框架：Flask（轻量微框架）、FastAPI（现代异步框架）、Django（全功能框架）。它们对应不同的 WSGI/ASGI 协议。

## WSGI vs ASGI

| 协议 | 同步/异步 | 代表服务器 | 代表框架 |
|------|----------|-----------|---------|
| WSGI | 同步 | Gunicorn, uWSGI | Flask, Django |
| ASGI | 异步 | Uvicorn, Hypercorn | FastAPI, Django 4+ |

WSGI 是同步的——每个请求占用一个工作进程/线程。ASGI 支持异步，可以用少量进程处理大量并发连接。

## Flask 基础

```python
from flask import Flask, request, jsonify, abort

app = Flask(__name__)

@app.route("/users", methods=["GET"])
def list_users():
    return jsonify([{"id": 1, "name": "Alice"}])

@app.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()
    if not data or "name" not in data:
        abort(400, description="缺少 name 字段")
    return jsonify({"id": 2, "name": data["name"]}), 201

@app.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id: int):
    return jsonify({"id": user_id, "name": "Alice"})
```

### Flask 中间件

```python
from flask import Flask, g, request
import time

app = Flask(__name__)

@app.before_request
def before_request():
    g.start_time = time.perf_counter()

@app.after_request
def after_request(response):
    elapsed = time.perf_counter() - g.start_time
    response.headers["X-Response-Time"] = f"{elapsed:.4f}s"
    return response

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found"}), 404
```

## FastAPI

FastAPI 基于 Starlette（ASGI 框架）和 Pydantic（数据验证），自动从类型注解生成 OpenAPI 文档。

```python
from fastapi import FastAPI, HTTPException, Depends, WebSocket
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(title="用户服务")

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: str
    age: int = Field(ge=0, le=150)

class User(UserCreate):
    id: int

# 模拟数据库
users_db: dict[int, User] = {}

@app.get("/users", response_model=list[User])
async def list_users():
    return list(users_db.values())

@app.post("/users", response_model=User, status_code=201)
async def create_user(user: UserCreate):
    user_id = len(users_db) + 1
    new_user = User(id=user_id, **user.model_dump())
    users_db[user_id] = new_user
    return new_user

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="用户不存在")
    return users_db[user_id]
```

### 依赖注入

```python
from fastapi import Depends, Header, HTTPException

async def get_token(authorization: str = Header()) -> str:
    """从请求头提取并验证 token。"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="无效的认证头")
    token = authorization[7:]
    # 验证逻辑...
    return token

async def get_current_user(token: str = Depends(get_token)) -> dict:
    """通过 token 获取当前用户。"""
    # 解析 token，查询用户...
    return {"id": 1, "name": "Alice"}

@app.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user
```

### WebSocket

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: str):
        for ws in self.active:
            await ws.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            await manager.broadcast(f"收到: {data}")
    except WebSocketDisconnect:
        manager.disconnect(ws)
```

## Django MTV 架构

Django 采用 MTV（Model-Template-View）架构，内置 ORM、Admin、认证等完整功能。

```python
# models.py
from django.db import models

class User(models.Model):
    name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.name

# views.py
from django.http import JsonResponse
from .models import User

def user_list(request):
    users = list(User.objects.values("id", "name", "email"))
    return JsonResponse(users, safe=False)

# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("users/", views.user_list, name="user-list"),
]
```

::: tip 提示
框架选择建议：API 服务首选 FastAPI（类型安全 + 自动文档 + 异步支持）；快速原型可用 Flask；全功能 Web 应用（含 Admin、模板）选 Django。
:::
