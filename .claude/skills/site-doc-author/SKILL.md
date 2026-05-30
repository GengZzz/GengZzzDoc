---
name: site-doc-author
description: 为本 VitePress 技术知识库（GengZzzDoc）撰写或扩充文档时使用。当用户要求「写/补全/扩充某技术的文档或笔记」、「完善某板块」、「按知识地图补章节」时触发。负责知识地图驱动的选题、单篇健壮性把关、配置接入与工程化提交。
---

# 站点文档作者（site-doc-author）

本技能用于给 **GengZzzDoc** 这个 VitePress 知识库写文档。目标不是「写一篇」，而是**让某个技术板块的知识体系更完整、单篇更健壮**。

先读 `CLAUDE.md` 了解项目约定，再读 `.claude/skills/tech-docs-writer.md` 获取内容深度与动画组件标准——本技能在其之上补充「知识地图」与「单篇健壮性」两层。

## 一、知识地图驱动（先定骨架，再写内容）

不要「想到哪写到哪」。任何写作任务先回答：**这个板块「讲全」需要哪些章节？**

1. 打开对应板块的 `docs/<板块>/index.md`，查看「学习路径」和「规划与完成度」清单。
2. 若没有完成度清单，先补一份：列出该技术的完整章节地图，用 `✅ 已完成` / `⬜ 规划中` 标注（见 `docs/frontend/vue/index.md` 示范）。
3. 从 `⬜` 项中选取要写的章节，优先补**结构性缺口**（核心机制、对比选型、性能、测试）而非边角。
4. 写完后更新该 index 的清单状态与「学习路径」。

## 二、单篇健壮性 Checklist

每篇在 `tech-docs-writer.md`「概念→代码→注意事项」三段式基础上，还须满足：

- [ ] **frontmatter**：`title` + 一句话 `description`（SEO/搜索摘要）
- [ ] **开篇即场景**：第一段先回答「什么时候用、解决什么问题」
- [ ] **版本标注**：涉及版本差异处标明（如 Java 8 vs 17/21、ES2015+、MySQL 5.7 vs 8）
- [ ] **对比/选型表**：凡有多个相似方案，给一张选型表
- [ ] **常见误区**：用 `::: warning 常见误区` 容器
- [ ] **高频考点**（可选）：用 `::: tip 高频考点` 容器
- [ ] **延伸阅读**：篇尾给官方文档等参考链接（会被 lychee 外链检查覆盖）
- [ ] **动画组件**：满足「步骤/层次/对比」条件时按规范补 `.vue` 组件
- [ ] **代码块标注语言**（满足 markdownlint MD040，虽未强制但应遵守）

## 三、配置接入

- 新增页面 → 在 `docs/.vitepress/configs/sidebar.ts` 补侧边栏项；如需顶部入口改 `nav.ts`
- 新增动画组件 → 在 `docs/.vitepress/theme/index.ts` 注册
- 不要再去改已拆分的 `config.ts`（它只做 import 聚合）

## 四、校验与提交（工程化闭环）

```bash
npm run lint:md        # 0 error
npm run format:check   # 通过（新增 .vue/.ts 先 npm run format）
npm run docs:build     # 构建通过（含内部死链校验）
```

提交遵循 Conventional Commits（`commit-msg` 钩子强制）：

- 在 **Bash 工具**里写多行提交用 `git commit -F 文件` 或 bash heredoc，**勿用 PowerShell here-string `@'...'@`**（`@` 会污染提交信息）
- 署名：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 推送两个远程：`git push origin main` 和 `git push gitee main`

## 五、验收

- 板块 index 的完成度清单已更新
- 单篇通过第二节 Checklist
- `npm run docs:build` 通过，新链接全部可达
- 提交信息合规、两端已推送
