# 贡献指南

本项目是基于 VitePress 的个人技术知识库。欢迎补充文档或修正错误。

## 环境要求

- Node.js >= 20（仓库根目录提供 `.nvmrc`，可用 `nvm use`）
- 包管理器：npm

## 本地开发

```bash
npm install        # 安装依赖（会自动启用 husky git hooks）
npm run docs:dev   # 启动本地开发服务
npm run docs:build # 构建静态站点，并做内部链接校验
```

## 工程化校验

提交前请确保以下命令通过（CI 会同样校验）：

```bash
npm run lint:md       # markdownlint 文档结构校验
npm run lint:md:fix   # 自动修复可修复项
npm run format        # prettier 格式化配置/主题代码
npm run format:check  # 仅检查格式
npm run check         # 一键：lint + format:check + build
```

> 提交时 `husky` 的 `pre-commit` 钩子会对暂存文件自动执行 `lint-staged`，无需手动全量校验。

## 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)，由 `commit-msg` 钩子（commitlint）强制校验。

常用类型：

| type       | 用途                           |
| ---------- | ------------------------------ |
| `docs`     | 文档内容新增/更新（最常用）    |
| `fix`      | 修复错别字、失效链接、构建问题 |
| `chore`    | 工程化、依赖、脚手架           |
| `refactor` | 结构重构（如拆分配置）         |
| `style`    | 纯格式调整，不影响内容含义     |
| `ci`       | CI 配置变更                    |

示例：

```text
docs: 新增 Redis 持久化机制章节
fix: 修正 MySQL 索引文档中的失效链接
```

## 新增文档约定

1. 文档按主题放入对应目录（`docs/frontend`、`docs/backend`、`docs/database` 等）。
2. 在 `docs/.vitepress/configs/sidebar.ts`（侧边栏）/ `nav.ts`（导航）中补充入口。
3. 每篇补 frontmatter `title` + `description`（可用 `node scripts/add-frontmatter.mjs` 生成草稿）。
4. 内容尽量保持可检索、可复用、可迭代；代码块标注语言。
5. 构建产物、缓存、依赖与本地日志不提交到仓库。

## 板块知识地图与完成度

每个板块的 `index.md` 应包含两部分，让知识体系**可见、可追踪**：

- **学习路径**：已完成章节的有序列表/表格（带链接与一句话简介）。
- **规划与完成度**：一份知识地图清单，用 `✅ 已完成` / `⬜ 规划中` 标注，显式列出该技术「讲全」所需的章节——包括尚未写的，避免「想到哪写到哪」。

> 示例见 [`docs/frontend/vue/index.md`](docs/frontend/vue/index.md)、[`docs/architecture/index.md`](docs/architecture/index.md)。

单篇文档的内容深度、结构与验收标准见 `.claude/skills/` 下的写作技能。
