# 数据库与 ORM

Python 的数据库生态以 SQLAlchemy 为核心。SQLAlchemy 提供了两种使用模式：Core（SQL 表达式语言）和 ORM（对象关系映射）。生产环境通常使用 ORM + Alembic 迁移。

## SQLAlchemy 声明式模型

```python
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import declarative_base, relationship, Session, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # 一对多关系
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(String)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    author = relationship("User", back_populates="posts")

# 创建引擎和表
engine = create_engine("sqlite:///app.db", echo=False)
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
```

## Session 管理

Session 是 SQLAlchemy 的工作单元（Unit of Identity），管理对象的生命周期和事务。

```python
# 基本 CRUD
def create_user(session: Session, name: str, email: str) -> User:
    user = User(name=name, email=email)
    session.add(user)
    session.commit()      # 提交事务
    session.refresh(user)  # 刷新获取数据库生成的字段（如 id）
    return user

def get_user(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)

def get_users_by_name(session: Session, name: str) -> list[User]:
    return session.query(User).filter(User.name == name).all()

# 更新
def update_user(session: Session, user_id: int, **kwargs):
    user = session.get(User, user_id)
    if user:
        for key, value in kwargs.items():
            setattr(user, key, value)
        session.commit()

# 删除
def delete_user(session: Session, user_id: int):
    user = session.get(User, user_id)
    if user:
        session.delete(user)
        session.commit()
```

### 依赖注入式 Session（FastAPI）

```python
from fastapi import Depends
from sqlalchemy.orm import Session

def get_db():
    """数据库 Session 依赖。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
async def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

## 关系映射

```python
from sqlalchemy import Table, Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

# 多对多关系
post_tags = Table(
    "post_tags",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    posts = relationship("Post", secondary=post_tags, back_populates="tags")

# 在 Post 中添加
# tags = relationship("Tag", secondary=post_tags, back_populates="posts")
```

```python
# 查询关系
user = session.get(User, 1)
print(user.posts)         # 懒加载：访问时才执行查询

# 预加载避免 N+1 问题
from sqlalchemy.orm import joinedload

users = session.query(User).options(joinedload(User.posts)).all()
for user in users:
    print(f"{user.name}: {len(user.posts)} 篇文章")  # 不会额外查询
```

::: warning 警告
N+1 查询问题是 ORM 最常见的性能陷阱。遍历关系属性时，每访问一个对象就可能触发一次额外查询。使用 `joinedload` 或 `subqueryload` 预加载关联数据。
:::

## Alembic 迁移

Alembic 是 SQLAlchemy 的数据库迁移工具，管理 schema 变更的版本历史。

```bash
# 初始化
alembic init alembic

# 生成迁移脚本（自动检测模型变更）
alembic revision --autogenerate -m "添加 users 表"

# 执行迁移
alembic upgrade head

# 回退一步
alembic downgrade -1
```

```python
# alembic/env.py 中配置目标元数据
from app.models import Base
target_metadata = Base.metadata
```

```python
# 自动生成的迁移脚本示例
def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("email", sa.String(100), unique=True, nullable=False),
    )

def downgrade():
    op.drop_table("users")
```

## 异步数据库

```python
# 使用 asyncpg + SQLAlchemy 异步引擎（SQLAlchemy 2.0+）
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session

# FastAPI 中使用
@app.get("/users")
async def list_users(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(User))
    return result.scalars().all()
```

```python
# databases 库 — 更轻量的异步数据库方案
from databases import Database

database = Database("postgresql://user:pass@localhost/db")

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/users")
async def list_users():
    query = "SELECT * FROM users"
    return await database.fetch_all(query)
```

::: tip 提示
异步数据库驱动的选择：PostgreSQL 用 asyncpg（最快），MySQL 用 aiomysql，SQLite 用 aiosqlite。SQLAlchemy 2.0 的异步支持已经成熟，推荐使用。
:::
