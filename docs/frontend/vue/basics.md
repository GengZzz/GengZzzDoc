# 核心概念

Vue 的核心是一套响应式系统，数据变化时视图自动更新。本章覆盖模板语法、响应式基础、计算属性和侦听器。

## 创建应用

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

## 模板语法

Vue 使用基于 HTML 的模板语法，允许声明式地将 DOM 绑定到组件实例的数据。

### 文本插值

```vue
<template>
  <p>{{ message }}</p>
  <p>{{ count + 1 }}</p>
  <p>{{ message.split('').reverse().join('') }}</p>
</template>

<script setup>
import { ref } from 'vue'
const message = ref('Hello Vue')
const count = ref(0)
</script>
```

### 指令

指令是带有 `v-` 前缀的特殊属性。

```vue
<template>
  <!-- 条件渲染 -->
  <p v-if="show">显示内容</p>
  <p v-else>隐藏内容</p>

  <!-- 列表渲染 -->
  <ul>
    <li v-for="item in list" :key="item.id">{{ item.name }}</li>
  </ul>

  <!-- 属性绑定 -->
  <img :src="imageUrl" :alt="title" />

  <!-- 事件绑定 -->
  <button @click="handleClick">点击</button>

  <!-- 双向绑定 -->
  <input v-model="inputValue" />
</template>
```

### 常用指令速查

| 指令 | 缩写 | 用途 |
|------|------|------|
| `v-bind` | `:` | 属性绑定 |
| `v-on` | `@` | 事件绑定 |
| `v-model` | — | 双向绑定 |
| `v-if` / `v-else` / `v-else-if` | — | 条件渲染 |
| `v-show` | — | 条件显示（display 切换） |
| `v-for` | — | 列表渲染 |

::: tip v-if vs v-show
- `v-if`：真正的条件渲染，条件为假时不渲染 DOM 元素
- `v-show`：始终渲染，仅切换 CSS `display` 属性
- 频繁切换用 `v-show`，条件很少改变用 `v-if`
:::

## 响应式基础

### ref

`ref` 接受一个内部值，返回一个响应式的、可变的 ref 对象。在模板中访问时自动解包。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++  // JS 中需要 .value
}
</script>

<template>
  <p>{{ count }}</p>  <!-- 模板中自动解包，不需要 .value -->
  <button @click="increment">+1</button>
</template>
```

### reactive

`reactive` 返回一个对象的响应式代理。

```vue
<script setup>
import { reactive } from 'vue'

const state = reactive({
  name: 'Vue',
  version: 3,
  features: ['响应式', '组件化', '虚拟DOM']
})

function updateName() {
  state.name = 'Vue 3'
}
</script>

<template>
  <p>{{ state.name }} v{{ state.version }}</p>
  <ul>
    <li v-for="f in state.features" :key="f">{{ f }}</li>
  </ul>
</template>
```

::: tip ref vs reactive
| 对比 | ref | reactive |
|------|-----|----------|
| 适用类型 | 任意类型 | 仅对象/数组 |
| 访问方式 | `.value` | 直接访问 |
| 模板解包 | 自动 | 自动 |
| 重新赋值 | 可以 | 不可以（会丢失响应性） |
| 推荐场景 | 基本类型 | 复杂对象状态 |
:::

### toRefs / toRef

将 reactive 对象解构后保持响应性：

```js
import { reactive, toRefs } from 'vue'

const state = reactive({ name: 'Vue', version: 3 })
const { name, version } = toRefs(state)

// name 和 version 仍然是 ref，修改会同步到 state
name.value = 'Vue 3'
```

## 计算属性

`computed` 基于响应式依赖进行缓存的计算值。

```vue
<script setup>
import { ref, computed } from 'vue'

const firstName = ref('张')
const lastName = ref('三')

// 计算属性：自动追踪依赖
const fullName = computed(() => `${firstName.value}${lastName.value}`)

// 可写计算属性
const reversedName = computed({
  get: () => fullName.value.split('').reverse().join(''),
  set: (val) => {
    firstName.value = val[0]
    lastName.value = val.slice(1)
  }
})
</script>

<template>
  <p>全名: {{ fullName }}</p>
  <p>反转: {{ reversedName }}</p>
</template>
```

::: tip computed vs methods
计算属性有缓存，只有依赖变化时才重新计算。methods 每次渲染都会执行。
:::

## 侦听器

### watch

侦听一个或多个响应式数据源，数据变化时执行回调。

```vue
<script setup>
import { ref, watch } from 'vue'

const keyword = ref('')

// 侦听单个 ref
watch(keyword, (newVal, oldVal) => {
  console.log(`搜索词从 "${oldVal}" 变为 "${newVal}"`)
})

// 侦听多个源
watch([keyword], ([newKeyword], [oldKeyword]) => {
  // 执行搜索
})

// 深度侦听
const user = ref({ name: 'Vue', info: { age: 3 } })
watch(user, (val) => {
  console.log('user 变化了')
}, { deep: true })

// 立即执行
watch(keyword, (val) => {
  console.log(val)
}, { immediate: true })
</script>
```

### watchEffect

自动追踪回调中的响应式依赖，立即执行一次。

```vue
<script setup>
import { ref, watchEffect } from 'vue'

const id = ref(1)
const data = ref(null)

watchEffect(async () => {
  // 自动追踪 id 的变化
  const response = await fetch(`/api/user/${id.value}`)
  data.value = await response.json()
})
</script>
```

::: tip watch vs watchEffect
| 对比 | watch | watchEffect |
|------|-------|-------------|
| 依赖追踪 | 显式指定 | 自动追踪 |
| 初始执行 | 默认不执行 | 立即执行 |
| 访问旧值 | 可以 | 不可以 |
| 适用场景 | 需要旧值、惰性执行 | 自动追踪、副作用 |
:::
