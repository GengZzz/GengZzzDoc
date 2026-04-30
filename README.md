# GengZzzDoc

GengZzzDoc 是一个基于 VitePress 构建的个人技术知识库，用于沉淀前端、后端、数据库、AI、CI/CD、操作系统与常用工具等方向的学习笔记和工程实践。

> 乘风破浪会有时，直挂云帆济沧海。

## 内容板块

- 前端：Vue、TypeScript、Vite 等前端工程化内容
- 服务端：C++、Python、接口设计与工程实践
- 数据库：MySQL、Redis、MongoDB、PostgreSQL
- CI/CD：GitHub Actions、Gitee Pages、部署检查清单
- 操作系统：Windows、Linux 使用与实践
- 工具：Git、Docker 等常用开发工具
- AI：模型基础、Prompt、Agent 相关知识
- 其他：零散经验与补充内容

## 项目结构

```text
.
├── docs/                  # VitePress 文档源文件
│   ├── .vitepress/        # VitePress 配置、主题与构建缓存
│   ├── public/            # 静态资源
│   ├── frontend/          # 前端文档
│   ├── backend/           # 服务端文档
│   ├── database/          # 数据库文档
│   ├── cicd/              # CI/CD 文档
│   ├── os/                # 操作系统文档
│   ├── tools/             # 工具文档
│   ├── ai/                # AI 文档
│   └── other/             # 其他文档
├── package.json           # 项目脚本与依赖
└── README.md              # 项目说明
```

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run docs:dev
```

构建静态站点：

```bash
npm run docs:build
```

本地预览构建结果：

```bash
npm run docs:preview
```

## 部署说明

站点构建产物默认输出到 `docs/.vitepress/dist`。当前 VitePress 配置中的 `base` 为 `/GengZzzDoc/`，适合部署到同名仓库的 Pages 路径下。

## 维护约定

- 新增文档优先放到对应主题目录，并在 `docs/.vitepress/config.ts` 中补充导航或侧边栏入口。
- 文章内容尽量保持可检索、可复用、可迭代。
- 构建产物、缓存、依赖目录和本地日志不提交到仓库。
