---
title: Vue 性能优化
description: Vue 默认已经足够快，性能优化是按需而非默认动作。本篇按「先测量再优化」的原则，梳理渲染、加载、大数据三个层面的优化手段与适用边界。
---

# Vue 性能优化

Vue 的响应式系统和虚拟 DOM 已经让大多数应用默认就「够快」。所以性能优化的第一原则不是「上手就优化」，而是：**先定位真正的瓶颈，再用对工具**。本篇要回答的是——常见的性能问题出在哪几层，每层有哪些手段，以及什么时候根本不该优化。

::: tip 先测量，再优化
盲目优化往往是浪费。先用 **Vue DevTools 的性能面板**或浏览器 Performance 录制，找到「渲染慢」「更新频繁」的具体组件，再针对性下手。**过早优化是万恶之源**这句话在前端同样成立。
:::

## 渲染层面：减少不必要的更新

响应式数据一变，相关组件就会重新渲染。优化的核心是**砍掉没必要的渲染**。

- **`v-once`**：内容只渲染一次，之后永不更新。适合纯静态、永不变化的块。
- **`v-memo`**：给定依赖数组，依赖没变就跳过这部分的更新。适合大列表里「大部分行不变」的场景。

```vue
<template>
  <!-- 仅当 item.id 或 selected 变化时才重新渲染这一行 -->
  <div v-for="item in list" :key="item.id" v-memo="[item.id, item.id === selected]">
    {{ item.name }}
  </div>
</template>
```

- **`computed` 而非方法**：`computed` 有缓存，依赖不变就不重算；模板里调用方法则每次渲染都执行。
- **冻结不需要响应式的数据**：大型只读对象用 `shallowRef` 或 `markRaw`，避免 Vue 为它递归建立响应式代理，省下可观的开销。

## 加载层面：把代码拆开、按需加载

首屏只该加载首屏需要的代码。

- **路由懒加载**：路由组件用动态 `import()`，打包时自动分包，访问到才下载。

```js
const routes = [{ path: '/about', component: () => import('./views/About.vue') }];
```

- **异步组件**：用 `defineAsyncComponent` 把重组件（如富文本编辑器、图表）延迟到用时再加载。

```js
import { defineAsyncComponent } from 'vue';
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'));
```

## 大数据层面：虚拟列表

当一次要渲染成千上万条数据时，再怎么优化单次渲染也扛不住——因为 DOM 节点太多。**虚拟列表（virtual list）**只渲染可视区域内的那几十个节点，滚动时动态替换内容，把 DOM 数量从「数据量」降到「一屏」。常用现成库如 `vue-virtual-scroller`。

## 常见误区

::: warning 常见误区

- **给所有组件套 `KeepAlive`**：缓存是用内存换体验，无脑缓存反而占内存、留脏状态。
- **滥用 `watch` 做派生计算**：能用 `computed` 的别用 `watch`，后者更难维护且易漏依赖。
- **不设 `key` 或用 index 作 key**：列表增删时会导致错误复用、状态错乱。
- **没测量就优化**：很多「优化」对真实瓶颈毫无帮助，反而增加复杂度。
  :::

## 小结：按层对症下药

| 症状 | 优化手段 |
| --- | --- |
| 某组件更新过于频繁 | `v-once` / `v-memo` / `computed` 缓存 |
| 大型只读数据拖慢响应式 | `shallowRef` / `markRaw` |
| 首屏 JS 体积过大 | 路由懒加载、异步组件、分包 |
| 长列表卡顿 | 虚拟列表 |

## 延伸阅读

- 响应式与 `computed` 基础见 [核心概念](./basics)、[组合式 API](./composition-api)
- [渲染机制与性能官方文档](https://cn.vuejs.org/guide/best-practices/performance.html)
- [`v-memo` 官方文档](https://cn.vuejs.org/api/built-in-directives.html#v-memo)
