---
title: "组合式 API"
description: "组合式 API（Composition API）是 Vue 3 的核心特性，通过函数式的方式组织组件逻辑，解决了 Options API 在复杂组件中逻辑分散的问题。"
---

# 组合式 API

组合式 API（Composition API）是 Vue 3 的核心特性，通过函数式的方式组织组件逻辑，解决了 Options API 在复杂组件中逻辑分散的问题。

## 核心函数

### ref 与 reactive

```vue
<script setup>
import { ref, reactive, toRefs } from 'vue'

// ref: 基本类型
const count = ref(0)
console.log(count.value)  // 0
count.value++

// reactive: 对象类型
const state = reactive({
  name: 'Vue',
  list: [1, 2, 3]
})
state.name = 'Vue 3'

// 解构 reactive 保持响应性
const { name } = toRefs(state)
name.value = 'Vue 3.4'
</script>
```

### computed

```vue
<script setup>
import { ref, computed } from 'vue'

const list = ref([3, 1, 4, 1, 5])

const sorted = computed(() => [...list.value].sort((a, b) => a - b))
const sum = computed(() => list.value.reduce((a, b) => a + b, 0))
</script>
```

### watch 与 watchEffect

```vue
<script setup>
import { ref, watch, watchEffect } from 'vue'

const keyword = ref('')
const page = ref(1)

// watch: 显式指定依赖
watch(keyword, () => {
  page.value = 1  // 搜索词变化时重置页码
})

// watchEffect: 自动追踪依赖
watchEffect(async () => {
  const res = await fetch(`/api/search?q=${keyword.value}&p=${page.value}`)
  // keyword 和 page 变化时自动重新执行
})
</script>
```

## 生命周期钩子

```vue
<script setup>
import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted
} from 'vue'

onMounted(() => {
  // DOM 已渲染，可执行 DOM 操作、初始化第三方库
})
</script>
```

| 钩子 | 触发时机 |
|------|---------|
| `onBeforeMount` | DOM 挂载前 |
| `onMounted` | DOM 挂载后 |
| `onBeforeUpdate` | 响应式数据变化后，DOM 更新前 |
| `onUpdated` | DOM 更新后 |
| `onBeforeUnmount` | 组件卸载前 |
| `onUnmounted` | 组件卸载后 |

## 自定义组合函数（Composables）

将可复用的逻辑提取到独立函数中，命名约定以 `use` 开头。

### useCounter

```js
// composables/useCounter.js
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const doubled = computed(() => count.value * 2)

  function increment() { count.value++ }
  function decrement() { count.value-- }
  function reset() { count.value = initial }

  return { count, doubled, increment, decrement, reset }
}
```

```vue
<script setup>
import { useCounter } from '@/composables/useCounter'

const { count, doubled, increment } = useCounter(10)
</script>
```

### useFetch

```js
// composables/useFetch.js
import { ref, watchEffect } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(true)

  watchEffect(async () => {
    loading.value = true
    try {
      const res = await fetch(url.value ?? url)
      data.value = await res.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  })

  return { data, error, loading }
}
```

```vue
<script setup>
import { useFetch } from '@/composables/useFetch'

const { data, loading, error } = useFetch('/api/users')
</script>
```

### useMouse

```js
// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(e) {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```

## 模板引用

```vue
<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref(null)
const canvasRef = ref(null)

onMounted(() => {
  inputRef.value.focus()  // 直接访问 DOM
  const ctx = canvasRef.value.getContext('2d')
})
</script>

<template>
  <input ref="inputRef" />
  <canvas ref="canvasRef" width="400" height="300" />
</template>
```

## 异步组件

```vue
<script setup>
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
</script>

<template>
  <Suspense>
    <template #default>
      <HeavyChart />
    </template>
    <template #fallback>
      <p>加载中...</p>
    </template>
  </Suspense>
</template>
```
