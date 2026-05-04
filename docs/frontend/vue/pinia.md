# Pinia 状态管理

Pinia 是 Vue 的官方状态管理库，是 Vuex 的继任者。它提供类型安全、DevTools 支持和极简的 API。

## 安装与配置

```bash
npm install pinia
```

```js
// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

## 定义 Store

### Setup Store（推荐）

写法类似 `<script setup>`，可以使用 Composition API 的所有能力。

```js
// stores/counter.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function incrementBy(amount) {
    count.value += amount
  }

  return { count, doubled, increment, incrementBy }
})
```

### Options Store

类似 Options API 的写法：

```js
export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    token: '',
    isLoggedIn: false
  }),

  getters: {
    displayName: (state) => state.name || '未登录'
  },

  actions: {
    login(credentials) {
      this.token = credentials.token
      this.name = credentials.name
      this.isLoggedIn = true
    },

    logout() {
      this.$reset()
    }
  }
})
```

## 在组件中使用

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()

// 直接访问 state
console.log(counter.count)

// 调用 action
counter.increment()

// 解构保持响应性（需要 storeToRefs）
import { storeToRefs } from 'pinia'
const { count, doubled } = storeToRefs(counter)
</script>

<template>
  <p>计数: {{ counter.count }}</p>
  <p>双倍: {{ counter.doubled }}</p>
  <button @click="counter.increment">+1</button>
  <button @click="counter.incrementBy(5)">+5</button>
</template>
```

::: tip storeToRefs
直接解构 store 会丢失响应性。使用 `storeToRefs` 可以保持 ref 的响应性：
```js
import { storeToRefs } from 'pinia'
const { count, name } = storeToRefs(useStore())
```
:::

## Store 间互相调用

```js
// stores/cart.js
import { defineStore } from 'pinia'
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  function checkout() {
    const user = useUserStore()  // 在 action 中调用其他 store
    if (!user.isLoggedIn) {
      throw new Error('请先登录')
    }
    // 执行结账逻辑
  }

  return { items, checkout }
})
```

## 数据持久化

### 手动实现

```js
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')
  const language = ref(localStorage.getItem('language') || 'zh')

  watch(theme, (val) => localStorage.setItem('theme', val))
  watch(language, (val) => localStorage.setItem('language', val))

  return { theme, language }
})
```

### 使用 pinia-plugin-persistedstate

```bash
npm install pinia-plugin-persistedstate
```

```js
// main.js
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```

```js
export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const name = ref('')
  return { token, name }
}, {
  persist: true  // 自动持久化到 localStorage
})
```

## Store 批量操作

```js
// $patch: 批量修改 state
counterStore.$patch({
  count: 0,
  list: []
})

// $patch 传函数：更灵活
counterStore.$patch((state) => {
  state.count++
  state.list.push('new item')
})

// $reset: 重置为初始状态
counterStore.$reset()

// $subscribe: 监听 state 变化
counterStore.$subscribe((mutation, state) => {
  console.log('state 变化:', mutation.type, state)
})
```

## Pinia vs Vuex

| 对比 | Pinia | Vuex 4 |
|------|-------|--------|
| TypeScript | 原生支持 | 需额外配置 |
| API 复杂度 | 简单 | 较复杂 |
| Mutations | 不需要 | 必须定义 |
| DevTools | 支持 | 支持 |
| 模块化 | 天然模块化 | 命名空间 |
| 体积 | ~1KB | ~2.5KB |
| Vue 3 | 官方推荐 | 兼容方案 |

::: tip 为什么选择 Pinia
Pinia 是 Vue 核心团队推荐的状态管理方案。新项目无需考虑 Vuex，直接使用 Pinia。
:::
