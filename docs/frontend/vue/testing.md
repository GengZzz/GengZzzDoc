---
title: Vue 组件测试
description: Vue 组件测试的核心是像用户一样与组件交互、断言渲染结果，而非测试内部实现。本篇讲 Vitest + Vue Test Utils 的用法、异步处理与「测行为不测实现」的原则。
---

# Vue 组件测试

给 Vue 组件写测试，最容易跑偏的地方是**测错了对象**——去断言内部的私有方法、内部状态。好的组件测试遵循一条原则：**像用户一样和组件交互，然后断言用户能看到的结果**。这样测出来的东西，在你重构内部实现时不会无谓地失败。本篇要回答的是：用什么工具、怎么写、以及该测什么不该测什么。

## 工具：Vitest + Vue Test Utils

- **Vitest**：测试运行器，负责跑用例、断言、覆盖率。它和 Vite 共用配置，对 Vue 项目几乎零配置。
- **Vue Test Utils（VTU）**：Vue 官方的组件测试库，负责把组件**挂载**成可操作的实例，提供查找元素、触发事件等能力。

两者配合：VTU 把组件挂起来，Vitest 跑断言。

## 一个最小用例

```ts
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import Counter from './Counter.vue';

test('点击按钮后计数加一', async () => {
  const wrapper = mount(Counter);

  // 断言初始渲染
  expect(wrapper.text()).toContain('count: 0');

  // 模拟用户点击
  await wrapper.find('button').trigger('click');

  // 断言渲染结果变化
  expect(wrapper.text()).toContain('count: 1');
});
```

注意 `trigger` 前的 `await`：DOM 更新是异步的，**交互后要 `await` 才能拿到更新后的结果**（它内部会等一次 `nextTick`）。

## 测三类东西

- **渲染结果**：给定 props，渲染出的内容对不对（`wrapper.text()`、`wrapper.find()`）。
- **用户交互**：点击、输入后，界面有没有正确变化（`trigger`、`setValue`）。
- **对外事件**：组件有没有在该抛事件时抛出正确的事件和参数（`wrapper.emitted()`）。

```ts
await wrapper.find('button').trigger('click');
expect(wrapper.emitted('submit')).toBeTruthy();
expect(wrapper.emitted('submit')![0]).toEqual([42]);
```

## 异步：等待更新与请求

涉及 `await nextTick()` 或接口请求时，要让断言等到状态稳定。组件内有挂起的 Promise 时，常用 `flushPromises()` 把微任务清空：

```ts
import flushPromises from 'flush-promises';
// 触发会发请求的操作后
await flushPromises();
expect(wrapper.text()).toContain('加载完成');
```

## 常见误区

::: warning 常见误区

- **测实现而非行为**：去断言内部的 `vm.someMethod` 或私有 data，重构一改就红。应断言「用户能看到/感知到的结果」。
- **过度 mock**：把依赖全 mock 掉，测的就不再是真实组件了。只 mock 不可控的外部（网络、时间）。
- **忘记 `await`**：交互/异步后不等更新，断言拿到的是旧状态，导致莫名其妙的失败。
  :::

## 测试金字塔：多单元、少端到端

| 层级 | 测什么 | 数量 | 速度 |
| --- | --- | --- | --- |
| 单元/组件测试 | 单个组件的渲染与交互 | 多 | 快 |
| 集成测试 | 多组件/路由/store 协作 | 中 | 中 |
| 端到端（E2E） | 真实浏览器里的完整流程 | 少 | 慢 |

底层多写、上层精写——单元测试便宜又快，E2E 贵且慢，只覆盖关键主流程。

## 延伸阅读

- 组件与事件基础见 [组件基础](./components)
- [Vitest 官方文档](https://cn.vitest.dev/)
- [Vue Test Utils 官方文档](https://test-utils.vuejs.org/)
- [Vue 测试官方指南](https://cn.vuejs.org/guide/scaling-up/testing.html)
