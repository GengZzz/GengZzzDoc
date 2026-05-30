---
title: Vue 自定义指令与插件
description: 当逻辑需要直接操作 DOM、或要给整个应用注入全局能力时，组件就不够用了。自定义指令和插件是 Vue 的两种横向复用机制，本篇讲它们各自的定位与取舍。
---

# Vue 自定义指令与插件

组件是 Vue 复用的主力，但它解决的是「**可复用的 UI 块**」。还有两类需求它处理起来很别扭：一是「给某个元素附加底层 DOM 行为」（比如自动聚焦、拖拽），二是「给**整个应用**装一套全局能力」（比如全局注册、配置）。这两件事分别对应**自定义指令**和**插件**。本篇要回答的是：它们各自该在什么场景用，以及怎么不滥用。

## 自定义指令：复用「对元素的底层操作」

自定义指令（custom directive）是一个**直接拿到 DOM 元素、对它做点什么**的复用单元。最经典的例子是「元素挂载后自动聚焦」——这件事没有 UI，纯粹是操作 DOM，用组件包它反而别扭。

```vue
<script setup>
// 局部指令：约定以 v 开头命名即可在模板中用 v-focus
const vFocus = {
  mounted: (el) => el.focus(),
};
</script>

<template>
  <input v-focus />
</template>
```

指令通过一组**生命周期钩子**介入元素的各个阶段，常用的是 `mounted`（元素插入后）和 `updated`（数据更新后）：

```js
const vColor = {
  mounted: (el, binding) => (el.style.color = binding.value),
  updated: (el, binding) => (el.style.color = binding.value),
};
// 用法：<p v-color="'red'">
```

要全局复用，用 `app.directive('focus', { ... })` 注册成全局指令。

::: warning 常见误区
不要把业务逻辑塞进指令。指令的定位是「**操作 DOM**」——自动聚焦、滚动、懒加载图片这类。如果一段逻辑不碰 DOM，优先用**组合式函数（composable）**或组件，而不是指令。
:::

## 插件：给整个应用安装全局能力

插件（plugin）用来一次性给应用注入全局性的东西：全局组件、全局指令、全局属性、`provide` 的依赖等。Vue Router、Pinia 本质上都是插件。

一个插件就是一个带 `install(app, options)` 方法的对象（或一个函数），在 `app.use()` 时被调用：

```js
// plugins/i18n.js
export default {
  install(app, options) {
    // 注入全局可用的方法
    app.config.globalProperties.$t = (key) => options.messages[key] ?? key;
    // 也可以注册全局组件、指令，或 provide 依赖
    app.provide('i18n', options);
  },
};
```

```js
// main.js
import i18n from './plugins/i18n';
app.use(i18n, { messages: { hello: '你好' } });
```

`app.use()` 会自动调用 `install` 并传入 `app` 实例，**同一个插件多次 `use` 只会安装一次**。

## 怎么选：组件 / 组合式函数 / 指令 / 插件

| 需求 | 用什么 |
| --- | --- |
| 可复用的一块 UI | 组件 |
| 可复用的一段**有状态逻辑**（不碰 DOM） | 组合式函数（`useXxx`） |
| 对某个**元素**附加底层 DOM 行为 | 自定义指令 |
| 给**整个应用**装全局能力/配置 | 插件 |

记住优先级：**能用组件或组合式函数解决的，就别用指令**；指令只在「真的要直接操作 DOM」时出场。

## 延伸阅读

- 组件复用的基础见 [组件基础](./components)、[组合式 API](./composition-api)
- [自定义指令官方文档](https://cn.vuejs.org/guide/reusability/custom-directives.html)
- [插件官方文档](https://cn.vuejs.org/guide/reusability/plugins.html)
