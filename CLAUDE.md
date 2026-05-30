# CLAUDE.md

本文件为 Claude Code 等 AI 助手提供本仓库的工作约定。每个会话开始时自动加载。

## 项目是什么

GengZzzDoc 是基于 **VitePress** 的个人技术知识库（静态文档站点），按主题沉淀前端、后端、数据库、操作系统、AI、工具等学习笔记，部署到 GitHub Pages 与 Gitee。

- 技术栈：VitePress 1.6 + Vue 3，自定义主题
- 站点 `base` 为 `/GengZzzDoc/`
- 文档源文件在 `docs/`，按主题分目录（`frontend/`、`backend/`、`database/`、`os/`、`ai/`、`tools/`、`cicd/` 等）

## 环境

- Node.js >= 20（见 `.nvmrc`），包管理器 npm
- `npm install` 会自动启用 husky git hooks

## 常用命令

```bash
npm run docs:dev      # 本地开发
npm run docs:build    # 构建 + 内部死链校验（提交前必跑）
npm run lint:md       # markdownlint 文档校验
npm run lint:md:fix   # 自动修复
npm run format        # prettier 格式化（仅配置/主题代码，不动文档 md）
npm run format:check  # 检查格式
npm run check         # 一键：lint:md + format:check + docs:build
```

## 工程化约定（重要）

- **质量校验职责分离**：Markdown 由 `markdownlint-cli2` 负责（配置 `.markdownlint-cli2.jsonc`）；`.ts/.vue/.css/.json/.yml` 由 `prettier` 负责。prettier **忽略 `docs/**/\*.md`**，不要去重排文档（会破坏 VitePress 的 `:::` 容器语法）。
- **提交前自动校验**：`pre-commit` 钩子对暂存文件跑 `lint-staged`（markdownlint --fix / prettier --write），通常无需手动全量校验。
- **MD040/MD055/MD056/MD060 已收敛为非阻断**（代码块语言缺失、表格样式误报），属渐进治理项，新写文档应尽量规范，但不强制阻断。

## 提交规范（commitlint 强制）

提交信息必须遵循 **Conventional Commits**，由 `commit-msg` 钩子校验，不合规会被拒绝。

- 格式：`<type>: <中文描述>`
- 常用 type：`docs`（文档增改，最常用）、`fix`（修错别字/死链/构建）、`chore`（工程化/依赖）、`refactor`（结构重构）、`ci`、`style`
- 结尾署名（**注意模型版本**）：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

⚠️ **在 Bash 工具里写多行提交信息**：本机默认 shell 是 PowerShell，但 Bash 工具执行的是 bash。**不要用 PowerShell here-string（`@'...'@`）**，否则 `@` 会混入提交信息导致 subject 为空。请用 `git commit -F 文件` 或 bash heredoc（`cat > /tmp/msg <<'EOF' ... EOF`）。

## 配置结构

VitePress 配置已模块化拆分：

- `docs/.vitepress/config.ts` — 主配置（约 50 行），import 聚合
- `docs/.vitepress/configs/nav.ts` — 顶部导航 `nav`
- `docs/.vitepress/configs/sidebar.ts` — 侧边栏 `sidebar`（新增文档在此补侧边栏入口）
- `docs/.vitepress/theme/index.ts` — 注册 Vue 动画组件
- `docs/.vitepress/theme/components/*.vue` — 动画组件

## 部署

- 推送 `main` → GitHub Actions `deploy.yml` 自动构建并发布 Pages
- PR / 非 main 分支推送 → `docs.yml` 跑 lint + format:check + build
- `link-check.yml` 每周用 lychee 检查外链

## 文档写作规范

详细的内容深度、动画组件模式、验收标准见技能文件 `.claude/skills/tech-docs-writer.md`。
