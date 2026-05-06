# GitHub Actions

GitHub Actions 用来把“提交代码之后必须做的事”自动化：安装依赖、运行测试、构建产物、上传制品、发布到 GitHub Pages 或其他环境。

这个项目当前的工作流在 `.github/workflows/deploy.yml` 中，主线是：`main` 分支有提交后构建 VitePress，再把 `docs/.vitepress/dist` 发布到 GitHub Pages。

<GitHubActionsWorkflowDemo />

## 适合解决什么问题

GitHub Actions 最适合处理三类日常工程问题：

| 场景 | 典型任务 | 价值 |
| --- | --- | --- |
| 持续集成 | 安装依赖、lint、测试、构建 | 每次提交都能尽早发现问题 |
| 持续部署 | 上传静态产物、部署服务、发布镜像 | 减少手动发布步骤 |
| 自动化维护 | 定时检查依赖、生成报告、同步仓库 | 把重复操作交给机器 |

对于文档站点，最小闭环通常是：提交到主分支 -> 构建文档 -> 上传静态文件 -> 部署页面。

## 核心概念

### workflow

Workflow 是一个自动化流程文件，放在 `.github/workflows/` 目录下，文件扩展名通常是 `.yml`。

```yaml
name: Deploy Docs

on:
  push:
    branches:
      - main
  workflow_dispatch:
```

这段配置表示两种触发方式：

- 推送到 `main` 分支时自动执行。
- 在 GitHub 页面上手动点击 `Run workflow` 执行。

### job

Job 是 workflow 里的一个阶段。不同 job 默认可以并行运行，如果需要顺序执行，就用 `needs` 声明依赖。

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
```

这里的意思是：`deploy` 必须等待 `build` 成功后才能运行。构建失败时，不会继续部署。

### step

Step 是 job 里的具体动作，可以执行命令，也可以复用社区 Action。

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Install dependencies
    run: npm ci
```

经验上，一个 step 只做一件明确的事。这样失败时日志更容易定位。

## 当前项目工作流拆解

### 1. 权限收敛

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

这段配置很重要。Actions 默认令牌不应该拿过宽权限，发布 Pages 只需要读取仓库内容、写入 Pages、签发身份令牌。

权限过宽的问题是：一旦某个步骤执行了不可信脚本，影响面会更大。

### 2. 并发控制

```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

`concurrency` 用来控制同一组任务的并发。这个项目把 Pages 发布放到 `pages` 组里，避免多个部署同时抢同一个发布环境。

`cancel-in-progress: false` 表示新任务不会取消正在运行的任务，而是等待它结束。文档站点发布通常可以这样做，因为部署不重，排队比中途取消更稳。

### 3. 构建阶段

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm

- name: Install dependencies
  run: npm ci

- name: Build docs
  run: npm run docs:build
```

关键点有三个：

- `node-version: 20` 固定 Node 版本，避免本地和 CI 环境漂移。
- `cache: npm` 复用 npm 缓存，减少重复下载。
- `npm ci` 严格按 lockfile 安装，适合 CI；不要用会改 lockfile 的 `npm install`。

### 4. 制品边界

```yaml
- name: Upload Pages artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: docs/.vitepress/dist
```

构建产物上传为 artifact 后，部署阶段只消费这个产物。这样 build 和 deploy 的边界很清楚：

- build 负责把源码变成静态文件。
- deploy 负责把静态文件发布到目标环境。

这个边界能减少“部署阶段又重新构建一次”的不确定性。

### 5. 部署阶段

```yaml
environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}

steps:
  - name: Deploy to GitHub Pages
    id: deployment
    uses: actions/deploy-pages@v4
```

`environment` 会把部署记录挂到 GitHub 的环境面板上，`page_url` 是最终站点地址。以后排查“哪次提交发布到了线上”时，这个记录很有用。

## 常见工作流模板

### 文档站点构建

```yaml
name: Build Docs

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run docs:build
```

这个模板适合先做质量门禁：PR 和 main 都构建，但不直接部署。

### 构建后部署

```yaml
deploy:
  needs: build
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/deploy-pages@v4
```

`if` 可以限制只有主分支部署。这样 PR 只验证构建，不会误发线上。

## Secrets 与环境变量

敏感信息不要写进仓库，例如：

- 服务器 SSH 私钥
- Docker Registry 密码
- 云服务 Access Key
- Webhook Token

应该在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 里配置，然后在 workflow 中读取：

```yaml
env:
  NODE_ENV: production

steps:
  - name: Deploy
    env:
      TOKEN: ${{ secrets.DEPLOY_TOKEN }}
    run: ./scripts/deploy.sh
```

注意：日志里不要 `echo` 敏感变量。GitHub 会对常见 secret 做掩码，但不能把安全完全交给平台兜底。

## 缓存策略

缓存的目标是减少重复下载，不是缓存构建结果。依赖缓存要围绕 lockfile 设计：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
```

当 `package-lock.json` 变化时，缓存会重新计算。这样能兼顾速度和正确性。

不建议缓存 `node_modules`，原因是：

- 目录体积大，压缩和恢复本身耗时。
- 不同系统、Node 版本可能存在二进制差异。
- `npm ci` 本来就会清理并重建依赖目录。

## 失败排查顺序

### 依赖安装失败

优先检查：

1. `package-lock.json` 是否提交。
2. Node 版本是否与本地一致。
3. 私有包 registry 和 token 是否配置。
4. 是否存在 postinstall 脚本依赖系统环境。

### 构建失败

优先检查：

1. 本地执行 `npm run docs:build` 是否复现。
2. 是否引用了只在本地存在的文件路径。
3. 静态资源路径是否受 `base` 配置影响。
4. Markdown 中的 Vue 组件是否已经注册。

### 部署失败

优先检查：

1. `permissions` 是否包含 `pages: write` 和 `id-token: write`。
2. Pages 设置是否选择 GitHub Actions 作为发布来源。
3. 上传 artifact 的路径是否正确。
4. `deploy` job 是否真的依赖了成功的 `build` job。

## 日常开发建议

### PR 只做验证，main 才部署

PR 阶段跑构建和测试，主分支合并后再部署，是最稳的默认策略。

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

部署 job 再加分支判断：

```yaml
if: github.ref == 'refs/heads/main'
```

### 把耗时步骤拆清楚

不要把安装、测试、构建、部署都塞进一个大脚本。CI 的价值之一就是日志可观察。

推荐拆成：

1. `Checkout`
2. `Setup runtime`
3. `Install dependencies`
4. `Run checks`
5. `Build`
6. `Upload artifact`
7. `Deploy`

### 固定运行时版本

CI 不是“随便找台机器跑一下”，而是可重复环境。Node、Java、Python、Go 等版本都应该显式配置。

对于这个项目，Node 版本固定在 20，和 VitePress 文档站构建需求匹配。

## 本节小结

- Workflow 负责定义流程，job 负责拆阶段，step 负责具体动作。
- `needs` 决定 job 依赖，构建失败就不应继续部署。
- Pages 发布要关注 `permissions`、artifact、environment 和 concurrency。
- CI 中优先使用 `npm ci`，并围绕 lockfile 做缓存。
- 排查失败时先看最早失败的 step，不要只盯最后的 deploy 结果。
