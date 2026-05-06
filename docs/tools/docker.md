---
outline: [2, 2]
---

# Docker

Docker 用来把应用和运行环境打包成镜像，再用容器运行。日常开发里，它最常解决三类问题：统一环境、快速启动依赖服务、把应用交付成可重复部署的产物。

## 核心心智

先分清三个概念：

| 概念 | 可以理解为 | 日常操作 |
| --- | --- | --- |
| 镜像 | 只读模板，包含应用和依赖 | `docker build`、`docker pull`、`docker images` |
| 容器 | 镜像运行后的进程实例 | `docker run`、`docker ps`、`docker exec` |
| Compose | 多个容器的启动说明书 | `docker compose up`、`docker compose down` |

Docker 的常见工作流是：

```text
写 Dockerfile -> 构建镜像 -> 运行容器 -> 查看日志/进入容器 -> 用 Compose 管理多服务
```

## 安装与检查

### 安装入口

- Windows / macOS：优先安装 Docker Desktop。
- Linux：安装 Docker Engine，并确认当前用户有执行 Docker 命令的权限。

### 验证环境

```bash
docker version
docker info
docker run --rm hello-world
```

`docker version` 用来看客户端和服务端版本，`docker info` 用来看 Docker Engine 当前配置，`hello-world` 用来确认拉取镜像和运行容器是否正常。

## 容器日常操作

### 启动一个容器

```bash
# 前台运行，适合快速验证
docker run --rm nginx

# 后台运行，并把宿主机 8080 映射到容器 80
docker run -d --name web -p 8080:80 nginx

# 指定环境变量
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -p 3306:3306 \
  mysql:8.4
```

常用参数：

| 参数 | 作用 | 场景 |
| --- | --- | --- |
| `--rm` | 容器退出后自动删除 | 临时测试命令 |
| `-d` | 后台运行 | Web 服务、数据库 |
| `--name` | 指定容器名 | 方便后续操作 |
| `-p` | 端口映射 | 让宿主机访问容器服务 |
| `-e` | 环境变量 | 密码、运行环境、配置开关 |
| `-v` | 挂载目录或卷 | 保存数据、同步源码 |

### 查看与进入容器

```bash
docker ps
docker ps -a
docker logs web
docker logs -f web
docker exec -it web sh
docker inspect web
```

- `docker ps` 只看运行中的容器。
- `docker ps -a` 会包含已退出的容器。
- `docker logs -f` 适合跟踪服务启动日志。
- `docker exec -it` 适合进入容器排查文件、环境变量、网络连通性。
- `docker inspect` 适合看端口、挂载、网络、镜像等完整元数据。

### 停止与删除

```bash
docker stop web
docker start web
docker restart web
docker rm web

# 强制删除运行中的容器
docker rm -f web
```

## 端口映射

容器里的服务默认只在容器网络里可见。要从浏览器或宿主机访问，需要用 `-p 宿主机端口:容器端口` 暴露出来。

```bash
docker run -d --name web -p 8080:80 nginx
```

上面这条命令表示：访问宿主机的 `8080`，流量会转发到容器内部的 `80`。

<div class="docker-animation port-map" aria-label="Docker 端口映射动画">
  <div class="host-box">Browser<br><span>localhost:8080</span></div>
  <div class="flow-line">
    <i></i>
  </div>
  <div class="container-box">Container<br><span>nginx:80</span></div>
</div>

::: tip 排查端口访问失败
先确认容器是否在运行，再确认应用是否监听在容器内正确端口，最后看 `-p` 是否写反。`8080:80` 是宿主机 `8080` 到容器 `80`，不是反过来。
:::

## 镜像与 Dockerfile

Dockerfile 是镜像构建说明。它描述基础镜像、工作目录、依赖安装、文件复制和启动命令。

### Node 应用示例

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

这个 Dockerfile 用了多阶段构建：

- `deps`：只安装依赖。
- `build`：复制源码并构建产物。
- `runtime`：只保留运行需要的静态文件和 Nginx。

好处是最终镜像更小，也不会把源码、Node 构建工具和开发依赖都带到运行环境里。

### 构建与运行

```bash
docker build -t my-web:dev .
docker run --rm -p 8080:80 my-web:dev
```

常用构建参数：

```bash
# 不使用构建缓存
docker build --no-cache -t my-web:dev .

# 构建前尝试拉取更新的基础镜像
docker build --pull -t my-web:dev .

# 同时拉新基础镜像并跳过缓存，适合排查环境问题
docker build --pull --no-cache -t my-web:dev .
```

### 构建缓存

Dockerfile 每条指令通常会形成一层。某一层内容变化后，这一层以及后面的层都要重新构建，所以依赖安装应该尽量放在源码复制之前。

<div class="docker-animation layer-cache" aria-label="Docker 镜像层缓存动画">
  <div class="layer l1">FROM node</div>
  <div class="layer l2">COPY package*.json</div>
  <div class="layer l3">RUN npm ci</div>
  <div class="layer l4">COPY src</div>
  <div class="layer l5">RUN build</div>
</div>

```dockerfile
# 推荐：依赖文件先复制，源码后复制
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

这样日常只改业务代码时，`npm ci` 这一层通常可以复用缓存，构建会快很多。

### .dockerignore

`.dockerignore` 用来减少构建上下文，避免把无关文件传给 Docker。

```gitignore
node_modules
dist
.git
.env
*.log
coverage
```

如果忘了写 `.dockerignore`，构建会变慢，也可能把本地敏感文件带进构建上下文。

## Compose 管理多服务

单个容器可以用 `docker run`，多个服务建议用 Compose。比如一个 Web 应用同时依赖 MySQL 和 Redis，就不适合每次手写三条 `docker run`。

### compose.yaml 示例

```yaml
services:
  app:
    build:
      context: .
    ports:
      - "8080:80"
    environment:
      NODE_ENV: production
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: 123456
      MYSQL_DATABASE: app
    volumes:
      - mysql-data:/var/lib/mysql

  redis:
    image: redis:7.4-alpine

volumes:
  mysql-data:
```

### 常用命令

```bash
docker compose up
docker compose up -d
docker compose up --build
docker compose logs -f
docker compose ps
docker compose exec app sh
docker compose down
docker compose down -v
```

| 命令 | 场景 |
| --- | --- |
| `docker compose up` | 前台启动，方便看日志 |
| `docker compose up -d` | 后台启动 |
| `docker compose up --build` | 代码或 Dockerfile 变化后重新构建 |
| `docker compose logs -f` | 跟踪所有服务日志 |
| `docker compose exec app sh` | 进入指定服务容器 |
| `docker compose down` | 停止并删除容器、网络 |
| `docker compose down -v` | 连数据卷一起删除，谨慎使用 |

### 开发热更新

开发环境有两种常见方式：

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

或者使用 Compose Watch：

```yaml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

```bash
docker compose up --watch
```

日常选择：

- 小项目、本机和容器平台一致：用 bind mount 更直接。
- `node_modules`、编译产物、跨平台依赖容易冲突：用 Compose Watch 更稳。

## 数据挂载

容器删除后，容器内部写入的数据也会跟着消失。要保留数据库、上传文件、开发源码同步，就需要挂载。

### bind mount 与 volume

| 类型 | 谁管理 | 适合场景 |
| --- | --- | --- |
| bind mount | 宿主机目录 | 同步源码、挂载配置文件 |
| volume | Docker 管理 | 数据库数据、需要长期保存的数据 |

<div class="docker-animation mount-map" aria-label="Docker 数据挂载动画">
  <div class="mount-side">Host<br><span>./src</span></div>
  <div class="mount-bridge">
    <b></b>
  </div>
  <div class="mount-side">Container<br><span>/app/src</span></div>
</div>

### bind mount

```bash
docker run --rm \
  --mount type=bind,src="$(pwd)",target=/app \
  node:22-alpine \
  sh -c "cd /app && npm test"
```

`--mount` 写法更明确，适合脚本和团队协作；`-v "$(pwd)":/app` 更短，适合临时命令。

### volume

```bash
docker volume create mysql-data

docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=123456 \
  --mount type=volume,src=mysql-data,dst=/var/lib/mysql \
  mysql:8.4
```

数据库优先用 volume，不要把数据库目录随意挂到项目源码目录里。

## 网络与服务名

Compose 会为项目创建默认网络。同一个 `compose.yaml` 里的服务可以直接用服务名互相访问。

```yaml
services:
  app:
    environment:
      DATABASE_URL: mysql://root:123456@mysql:3306/app
    depends_on:
      - mysql

  mysql:
    image: mysql:8.4
```

这里应用连接数据库时，主机名写 `mysql`，不是 `localhost`。在容器内部，`localhost` 指的是当前容器自己。

## 排障路径

### 服务起不来

```bash
docker ps -a
docker logs <container>
docker inspect <container>
```

先看容器是否退出，再看日志里的第一条错误。不要只盯最后一行，很多应用真正的失败原因在更前面。

### 端口访问不到

```bash
docker ps
docker port <container>
docker exec -it <container> sh
```

进入容器后检查应用是否真的在监听目标端口：

```bash
ss -lntp
```

如果容器内应用只监听 `127.0.0.1`，外部通常访问不到，应该让应用监听 `0.0.0.0`。

### 改了代码没生效

按顺序检查：

1. 是否需要重新构建镜像：`docker compose up --build`
2. 是否被构建缓存影响：`docker build --no-cache ...`
3. 是否挂载路径覆盖了镜像里的文件
4. 是否进入了旧容器：`docker compose down` 后再启动

### 数据怎么没了

检查是否使用了 volume：

```bash
docker volume ls
docker inspect <container>
```

如果只是写在容器内部，没有 volume 或 bind mount，删除容器后数据就没有了。

## 清理空间

Docker 用久了会积累停止的容器、无用镜像、构建缓存和匿名卷。

```bash
docker system df
docker container prune
docker image prune
docker volume prune
docker builder prune
```

更彻底的清理：

```bash
docker system prune -a
```

::: warning
`docker system prune -a` 会删除所有未被容器使用的镜像，`docker volume prune` 会删除未被使用的数据卷。清理前先确认数据库、上传文件等重要数据是否还需要。
:::

## 生产实践

### 镜像要小

- 使用更小的基础镜像，如 `alpine` 或官方 slim 镜像。
- 使用多阶段构建，只把运行产物复制到最终镜像。
- 不安装运行时不需要的工具。

### 镜像要稳定

- 不建议长期使用裸 `latest`。
- 基础镜像尽量写明确版本，如 `node:22-alpine`、`mysql:8.4`。
- CI 构建可配合 `--pull` 获取基础镜像更新。

### 配置要外置

镜像里放应用和默认配置，环境差异用环境变量、配置文件挂载或密钥系统处理。不要把生产密码写进 Dockerfile。

## 命令速查

| 命令 | 说明 |
| --- | --- |
| `docker version` | 查看客户端和服务端版本 |
| `docker info` | 查看 Docker Engine 信息 |
| `docker pull nginx` | 拉取镜像 |
| `docker images` | 查看本地镜像 |
| `docker build -t app:dev .` | 构建镜像 |
| `docker run --rm app:dev` | 临时运行容器 |
| `docker run -d --name app app:dev` | 后台运行容器 |
| `docker ps -a` | 查看所有容器 |
| `docker logs -f app` | 跟踪日志 |
| `docker exec -it app sh` | 进入容器 |
| `docker stop app` | 停止容器 |
| `docker rm app` | 删除容器 |
| `docker volume ls` | 查看数据卷 |
| `docker compose up -d` | 后台启动 Compose 项目 |
| `docker compose up --build` | 构建并启动 |
| `docker compose down` | 停止并删除 Compose 容器和网络 |

## 参考资料

- [Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker build cache](https://docs.docker.com/build/cache/)
- [Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Volumes](https://docs.docker.com/engine/storage/volumes/)
- [docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Use Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/)

<style>
.docker-animation {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.docker-animation span {
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.host-box,
.container-box,
.mount-side,
.layer {
  position: relative;
  z-index: 1;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-align: center;
}

.host-box,
.container-box,
.mount-side {
  min-width: 150px;
  padding: 16px;
}

.flow-line {
  position: relative;
  flex: 1;
  height: 4px;
  min-width: 120px;
  border-radius: 999px;
  background: linear-gradient(90deg, #38bdf8, #22c55e);
}

.flow-line::after {
  position: absolute;
  top: -6px;
  right: -2px;
  content: "";
  border-left: 12px solid #22c55e;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
}

.flow-line i {
  position: absolute;
  top: -6px;
  left: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f59e0b;
  animation: docker-flow 2.4s ease-in-out infinite;
}

.layer-cache {
  flex-direction: column-reverse;
  align-items: stretch;
  max-width: 520px;
}

.layer {
  padding: 10px 14px;
  text-align: left;
  animation: docker-layer 5s ease-in-out infinite;
}

.layer.l1 { animation-delay: 0s; }
.layer.l2 { animation-delay: .3s; }
.layer.l3 { animation-delay: .6s; }
.layer.l4 { animation-delay: .9s; }
.layer.l5 { animation-delay: 1.2s; }

.mount-bridge {
  position: relative;
  flex: 1;
  height: 42px;
  min-width: 120px;
}

.mount-bridge::before,
.mount-bridge::after {
  position: absolute;
  left: 0;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  content: "";
}

.mount-bridge::before { top: 9px; }
.mount-bridge::after { bottom: 9px; }

.mount-bridge b {
  position: absolute;
  top: 2px;
  left: 0;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: #22c55e;
  box-shadow: 0 24px 0 #38bdf8;
  animation: docker-sync 2.8s ease-in-out infinite;
}

@keyframes docker-flow {
  0% { left: 0; opacity: .25; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { left: calc(100% - 16px); opacity: .25; }
}

@keyframes docker-layer {
  0%, 45%, 100% {
    border-color: var(--vp-c-divider);
    box-shadow: none;
    transform: translateX(0);
  }
  55%, 70% {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, .16);
    transform: translateX(8px);
  }
}

@keyframes docker-sync {
  0% { left: 0; }
  50% { left: calc(100% - 18px); }
  100% { left: 0; }
}

@media (max-width: 640px) {
  .docker-animation {
    flex-direction: column;
    align-items: stretch;
  }

  .flow-line,
  .mount-bridge {
    width: 100%;
    min-width: 0;
  }
}
</style>
