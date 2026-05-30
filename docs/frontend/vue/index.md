---
title: "Vue"
description: "Vue 是一款用于构建用户界面的渐进式 JavaScript 框架。它基于标准 HTML、CSS 和 JavaScript，提供了一套声明式的、组件化的编程模型，帮助开发者高效地开发用户界面。"
---

# Vue

Vue 是一款用于构建用户界面的渐进式 JavaScript 框架。它基于标准 HTML、CSS 和 JavaScript，提供了一套声明式的、组件化的编程模型，帮助开发者高效地开发用户界面。

## Vue 简介

Vue 由尤雨溪（Evan You）于 2014 年创建，核心理念是**渐进式框架**——你可以从一个简单的 `<script>` 标签开始，也可以逐步引入路由、状态管理、构建工具等组成完整的前端工程。

**核心特性：**

| 特性 | 说明 |
|------|------|
| 响应式数据绑定 | 数据变化自动更新 DOM |
| 组件化 | UI 拆分为独立、可复用的组件 |
| 虚拟 DOM | 高效的 DOM diff 算法 |
| 单文件组件 | `.vue` 文件将模板、逻辑、样式封装在一起 |
| 组合式 API | 更灵活的逻辑复用和代码组织方式 |

## 版本选择

| 版本 | 状态 | 说明 |
|------|------|------|
| Vue 2 | 维护模式 | 2023 年底停止新功能开发 |
| Vue 3 | 推荐 | Composition API、更好的 TypeScript 支持、性能提升 |

::: tip
新项目一律使用 Vue 3。本文档基于 Vue 3 + `<script setup>` 语法。
:::

## 学习路径

| 章节 | 内容 |
|------|------|
| [核心概念](./basics) | 响应式、模板语法、计算属性、侦听器 |
| [组件基础](./components) | Props、事件、插槽、组件通信 |
| [组合式 API](./composition-api) | ref、reactive、生命周期钩子、自定义 Hook |
| [路由](./router) | Vue Router 安装、路由配置、导航守卫 |
| [状态管理](./pinia) | Pinia 安装、Store 定义、持久化 |

## 规划与完成度

> 本板块的知识地图与建设进度。✅ 已完成 ⬜ 规划中。

- ✅ 核心概念、组件基础、组合式 API、路由、状态管理
- ⬜ 内置组件（Transition / Teleport / Suspense / KeepAlive）
- ⬜ 自定义指令与插件
- ⬜ 性能优化（懒加载、`v-memo`、虚拟列表、打包体积）
- ⬜ TypeScript 集成（`defineProps` 泛型、组件类型）
- ⬜ 测试（Vitest + Vue Test Utils）
- ⬜ SSR 与 Nuxt 入门
