---
title: Vue 与 TypeScript
description: <script setup lang="ts"> 让 Vue 与 TypeScript 几乎零摩擦。本篇讲怎么给 props、emits、ref、模板引用与依赖注入标好类型，以及 reactive 解构等常见坑。
---

# Vue 与 TypeScript

在 Vue 3 里用 TypeScript，关键不是「配环境」（`<script setup lang="ts">` 开箱即用），而是**把组件的几个边界标好类型**：传进来的 props、抛出去的 emits、内部的响应式状态、模板引用。本篇要回答的是：这几处分别怎么标类型，以及哪些写法会悄悄丢掉类型或响应性。

## 给 props 标类型

用 `defineProps` 的**泛型**参数声明 props 类型，比运行时声明更直接、类型更准：

```vue
<script setup lang="ts">
interface Props {
  title: string;
  count?: number; // 可选
  tags: string[];
}
const props = defineProps<Props>();
</script>
```

需要**默认值**时用 `withDefaults` 包一层：

```ts
const props = withDefaults(defineProps<Props>(), {
  count: 0,
  tags: () => [], // 数组/对象默认值要用工厂函数
});
```

## 给 emits 标类型

`defineEmits` 同样支持泛型，把「能抛哪些事件、各带什么参数」写成类型，调用时就有检查和补全：

```ts
const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'submit', id: number): void;
}>();

emit('change', 'hello'); // ✓
emit('submit', 'x'); // ✗ 类型错误：应为 number
```

## 给响应式状态标类型

`ref` 多数时候能自动推断，需要显式类型（比如初值为 `null`）时用泛型：

```ts
import { ref } from 'vue';

const count = ref(0); // 推断为 Ref<number>
const user = ref<User | null>(null); // 显式标注
```

## 模板引用与依赖注入

模板引用一个组件或元素时，给 `ref` 标上对应类型：

```ts
import { ref } from 'vue';
const inputRef = ref<HTMLInputElement | null>(null);
// inputRef.value?.focus()
```

跨层级 `provide` / `inject` 时，用 `InjectionKey` 把键和值的类型绑定起来，避免 inject 出来是 `unknown`：

```ts
import { provide, inject, type InjectionKey } from 'vue';

const themeKey = Symbol() as InjectionKey<string>;
provide(themeKey, 'dark');
const theme = inject(themeKey); // 类型为 string | undefined
```

## 常见误区

::: warning 常见误区

- **解构 `reactive` 会同时丢类型推断与响应性**：`const { a } = reactive({ a: 1 })` 拿到的是普通值。需要解构就用 `toRefs`。
- **props 的对象/数组默认值不用工厂函数**：`withDefaults` 里默认值必须写成 `() => []`，直接写 `[]` 会报错。
- **过度标注**：能自动推断的（如 `ref(0)`）就别画蛇添足地写 `ref<number>(0)`。
  :::

## 延伸阅读

- 组合式 API 基础见 [组合式 API](./composition-api)
- 语言本身见 [TypeScript](/frontend/typescript/)
- [Vue + TypeScript 官方指南](https://cn.vuejs.org/guide/typescript/composition-api.html)
