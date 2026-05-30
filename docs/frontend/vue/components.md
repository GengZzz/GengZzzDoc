---
title: "组件基础"
description: "组件是 Vue 应用的构建块。每个组件封装了自己的模板、逻辑和样式。"
---

# 组件基础

组件是 Vue 应用的构建块。每个组件封装了自己的模板、逻辑和样式。

## 定义组件

```vue
<!-- MyButton.vue -->
<template>
  <button class="my-btn" @click="onClick">
    <slot />  <!-- 插槽：接收父组件传入的内容 -->
  </button>
</template>

<script setup>
// defineProps 和 defineEmits 是编译器宏，不需要 import
const props = defineProps({
  type: { type: String, default: 'default' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

function onClick() {
  if (!props.disabled) {
    emit('click')
  }
}
</script>

<style scoped>
.my-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
}
</style>
```

## Props

Props 是父组件向子组件传递数据的方式。

### 定义方式

```vue
<script setup>
// 对象形式（推荐，支持默认值和验证）
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
  status: {
    type: String,
    validator: (val) => ['active', 'inactive'].includes(val)
  }
})

// TypeScript 形式
// const props = defineProps<{
//   title: string
//   count?: number
// }>()
</script>
```

### 单向数据流

Props 是只读的。子组件不能直接修改 props，需要通过 emit 事件让父组件修改。

```vue
<script setup>
const props = defineProps({ modelValue: Number })
const emit = defineEmits(['update:modelValue'])

function increment() {
  emit('update:modelValue', props.modelValue + 1)
}
</script>
```

## 事件

子组件通过 `emit` 向父组件发送消息。

```vue
<!-- 子组件 -->
<script setup>
const emit = defineEmits(['submit', 'delete'])

function handleSubmit(data) {
  emit('submit', data)
}
</script>

<!-- 父组件 -->
<template>
  <MyForm @submit="onSubmit" @delete="onDelete" />
</template>
```

### 事件验证

```js
const emit = defineEmits({
  // 无验证
  click: null,
  // 带验证
  submit: ({ email, password }) => {
    if (email && password) return true
    console.warn('Invalid submit event payload!')
    return false
  }
})
```

## 插槽

插槽允许父组件向子组件传递模板内容。

### 默认插槽

```vue
<!-- AlertBox.vue -->
<template>
  <div class="alert">
    <slot>默认内容（没有传入时显示）</slot>
  </div>
</template>

<!-- 使用 -->
<template>
  <AlertBox>自定义警告内容</AlertBox>
</template>
```

### 具名插槽

```vue
<!-- Layout.vue -->
<template>
  <header><slot name="header" /></header>
  <main><slot /></main>  <!-- 默认插槽，name="default" -->
  <footer><slot name="footer" /></footer>
</template>

<!-- 使用 -->
<template>
  <Layout>
    <template #header>
      <h1>页面标题</h1>
    </template>
    <template #default>
      <p>主要内容</p>
    </template>
    <template #footer>
      <p>页脚信息</p>
    </template>
  </Layout>
</template>
```

### 作用域插槽

子组件向插槽传递数据：

```vue
<!-- ItemList.vue -->
<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item" :index="index">
        {{ item.name }}  <!-- 默认渲染 -->
      </slot>
    </li>
  </ul>
</template>

<!-- 使用 -->
<template>
  <ItemList :items="list">
    <template #default="{ item, index }">
      <span>#{{ index }}</span>
      <strong>{{ item.name }}</strong>
    </template>
  </ItemList>
</template>
```

## 组件通信方式

| 方式 | 适用场景 |
|------|---------|
| Props / Emit | 父子组件 |
| Provide / Inject | 跨层级祖先-后代 |
| Pinia | 全局状态 |
| mitt / event bus | 兄弟组件（不推荐） |

### Provide / Inject

```vue
<!-- 祖先组件 -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('dark')
provide('theme', theme)  // 提供响应式数据
provide('version', '3.0')  // 提供静态数据
</script>

<!-- 后代组件（任意深度） -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme')  // 注入后是 ref
const version = inject('version', 'unknown')  // 带默认值
</script>
```

## 生命周期

```
setup()  ────→ onBeforeMount()  ────→ onMounted()
                                           │
                                    onBeforeUpdate() ──→ onUpdated()
                                           │
                                    onBeforeUnmount() ──→ onUnmounted()
```

```vue
<script setup>
import { onMounted, onUnmounted, onUpdated } from 'vue'

onMounted(() => {
  console.log('组件挂载完成，可以访问 DOM')
})

onUpdated(() => {
  console.log('响应式数据变化导致 DOM 更新')
})

onUnmounted(() => {
  console.log('组件即将卸载，清理定时器等')
})
</script>
```
