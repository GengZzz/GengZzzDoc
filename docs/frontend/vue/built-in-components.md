---
title: Vue 内置组件
description: Transition、KeepAlive、Teleport、Suspense 是 Vue 内置的特殊组件，分别解决动画、状态缓存、跨 DOM 层级渲染与异步加载态这些普通组件难处理的横切问题。
---

# Vue 内置组件

Vue 除了让你写自己的组件，还内置了几个**特殊组件**——`Transition`、`KeepAlive`、`Teleport`、`Suspense`。它们不渲染自己的界面，而是给被包裹的内容**附加一种能力**。本篇要回答的是：**这几个组件各自解决了什么用普通组件很别扭的问题，以及用它们时要注意什么权衡？**

::: tip 心智模型
把它们理解成「**能力包裹器**」：你把普通内容塞进去，它就替这段内容加上「会做进场动画」「切走了也不销毁」「渲染到别处」「等异步好了再显示」的能力。它们自己几乎不产生 DOM。
:::

## 为什么需要「内置组件」

有几类需求，用普通组件和 `v-if` 很难优雅地实现：

- 元素出现/消失时想要**过渡动画**，手写 class 切换很繁琐；
- 用 `v-if` 切换组件会**销毁重建**，丢掉表单输入、滚动位置，还会重新发请求；
- 模态框、通知这类元素，逻辑上属于某个组件，**视觉上却需要挂到 `<body>`**，否则会被父级的 `overflow: hidden` 或 `z-index` 困住；
- 异步组件的 **loading 态**散落在各处，难以统一管理。

这四类问题，正好对应四个内置组件。

## Transition：进入与离开动画

`<Transition>` 给**单个**元素或组件的出现/消失自动挂上过渡。它的原理是：在元素进入和离开的不同阶段，自动添加和移除一组 CSS 类，你只要为这些类写好样式。

```vue
<script setup>
import { ref } from 'vue';
const show = ref(true);
</script>

<template>
  <button @click="show = !show">切换</button>
  <Transition name="fade">
    <p v-if="show">Hello</p>
  </Transition>
</template>

<style>
/* 进入/离开的「起点」和「过程」 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
</style>
```

::: warning 常见误区
Vue 3 的过渡类名是 `v-enter-from` / `v-enter-active` / `v-enter-to`（离开同理），和 **Vue 2 的 `v-enter` / `v-enter-active` / `v-enter-to` 不一样**——从 Vue 2 迁移时这是高频踩坑点。
:::

`<Transition>` 一次只能管**一个**根元素。要给 `v-for` 列表的增删做动画，得用它的兄弟组件 `<TransitionGroup>`。

## KeepAlive：缓存组件，保留状态

默认情况下，用动态组件或 `v-if` 切换时，被切走的组件会被**销毁**，再切回来是全新实例——表单白填了、滚动条回顶了、接口又请求一遍。`<KeepAlive>` 让被切走的组件**留在内存里**，切回来时恢复原样。

```vue
<template>
  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

可以用 `include` / `exclude` 按组件名筛选要缓存哪些，用 `max` 限制最多缓存几个（超出按 LRU 淘汰）。被缓存的组件不会触发 `unmounted`，而是触发专门的 `activated` / `deactivated` 钩子——需要在「重新可见」时刷新数据的话，写在 `activated` 里。

```vue
<KeepAlive :include="['UserList', 'OrderList']" :max="10">
  <component :is="currentTab" />
</KeepAlive>
```

**取舍**：缓存是用**内存**换体验。别无脑缓存一切——只缓存那些「切回来希望保留状态、或重建成本高」的组件，否则白白占内存。

## Teleport：把内容渲染到别处

`<Teleport>` 解决一个纯粹的「DOM 位置」矛盾：模态框、下拉菜单、全局通知，**逻辑上**属于当前组件（用它的状态、事件），但**视觉上**放在深层嵌套里会被父级的 `overflow: hidden`、`z-index`、`transform` 影响。`Teleport` 让你把这段 DOM「传送」到指定位置（通常是 `<body>`），而组件逻辑不变。

```vue
<script setup>
import { ref } from 'vue';
const open = ref(false);
</script>

<template>
  <button @click="open = true">打开弹窗</button>

  <Teleport to="body">
    <div v-if="open" class="modal">
      我被渲染到 body 下，但 open 仍是这个组件的状态
      <button @click="open = false">关闭</button>
    </div>
  </Teleport>
</template>
```

**注意**：`to` 指向的目标元素必须在 `Teleport` 挂载时**已经存在**于 DOM 中。需要时可用 `disabled` 属性临时让它「就地渲染」。

## Suspense：统一异步加载态（实验性）

`<Suspense>` 用来协调**异步依赖**——比如异步组件，或 `setup()` 是 `async` 的组件。它提供两个插槽：异步内容就绪前显示 `#fallback`，就绪后切换到 `#default`，省去你在每个组件里各写一套 loading 判断。

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncUserProfile />
    </template>
    <template #fallback>
      <div>加载中…</div>
    </template>
  </Suspense>
</template>
```

::: warning 实验性
`Suspense` 目前仍是**实验性（experimental）**特性，API 在未来版本可能调整，生产使用前请确认当前 Vue 版本的状态。
:::

## 小结：四个组件，四类问题

| 组件 | 解决的问题 | 关键点 |
| --- | --- | --- |
| `Transition` | 单个元素/组件的进入离开动画 | v3 类名是 `v-enter-from` 系列；多元素用 `TransitionGroup` |
| `KeepAlive` | 切换时保留组件状态、避免重建 | `include`/`max`；用 `activated` 钩子；用内存换体验 |
| `Teleport` | 把 DOM 渲染到组件树之外 | 逻辑在原处、DOM 在别处；目标须已存在 |
| `Suspense` | 统一处理异步组件的加载态 | 实验性；配 `#default` / `#fallback` |

它们可以**组合使用**——比如一个会做进场动画、又传送到 body 的弹窗，就是 `Transition` 套 `Teleport`。

## 延伸阅读

- 组件与生命周期基础见 [组件基础](./components)、[组合式 API](./composition-api)
- [Transition 官方文档](https://cn.vuejs.org/guide/built-ins/transition.html)
- [KeepAlive 官方文档](https://cn.vuejs.org/guide/built-ins/keep-alive.html)
- [Teleport 官方文档](https://cn.vuejs.org/guide/built-ins/teleport.html)
- [Suspense 官方文档](https://cn.vuejs.org/guide/built-ins/suspense.html)
