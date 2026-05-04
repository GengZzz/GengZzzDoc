# Vue Router

Vue Router 是 Vue.js 的官方路由管理器，用于构建单页面应用（SPA）。

## 安装与配置

```bash
npm install vue-router@4
```

### 创建路由实例

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('@/views/Home.vue') },
  { path: '/about', component: () => import('@/views/About.vue') },
  { path: '/user/:id', component: () => import('@/views/User.vue') },
  { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### 挂载到应用

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

## 基本使用

### 路由出口与导航

```vue
<template>
  <nav>
    <router-link to="/">首页</router-link>
    <router-link to="/about">关于</router-link>
    <router-link :to="{ name: 'user', params: { id: 123 } }">用户</router-link>
  </nav>

  <router-view />
</template>
```

### 编程式导航

```js
import { useRouter } from 'vue-router'

const router = useRouter()

// 字符串路径
router.push('/about')

// 对象
router.push({ path: '/user', query: { id: 1 } })
router.push({ name: 'user', params: { id: 123 } })

// 替换当前记录（不保留历史）
router.replace('/login')

// 前进/后退
router.back()
router.go(-1)
```

## 路由参数

### 动态路由参数

```vue
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// /user/:id
console.log(route.params.id)

// /search?q=vue&page=1
console.log(route.query.q)
console.log(route.query.page)
</script>
```

### 响应路由变化

```vue
<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

watch(
  () => route.params.id,
  (newId) => {
    // 参数变化时重新获取数据
    fetchUser(newId)
  }
)
</script>
```

## 嵌套路由

```js
const routes = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue'),
    children: [
      { path: '', component: () => import('@/views/DashboardHome.vue') },
      { path: 'profile', component: () => import('@/views/Profile.vue') },
      { path: 'settings', component: () => import('@/views/Settings.vue') }
    ]
  }
]
```

```vue
<!-- Dashboard.vue -->
<template>
  <div class="dashboard">
    <aside>
      <router-link to="/dashboard">概览</router-link>
      <router-link to="/dashboard/profile">个人资料</router-link>
      <router-link to="/dashboard/settings">设置</router-link>
    </aside>
    <main>
      <router-view />  <!-- 嵌套路由渲染位置 -->
    </main>
  </div>
</template>
```

## 导航守卫

### 全局守卫

```js
// router/index.js
router.beforeEach((to, from) => {
  // 返回 false 取消导航，返回路由地址重定向
  const isLoggedIn = localStorage.getItem('token')

  if (to.meta.requiresAuth && !isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to) => {
  // 记录页面访问日志
  console.log(`进入: ${to.path}`)
})
```

### 路由元信息

```js
const routes = [
  {
    path: '/admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  }
]
```

```js
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login'
  }
})
```

## 路由懒加载

```js
const routes = [
  {
    path: '/',
    component: () => import('@/views/Home.vue')  // 动态 import
  },
  {
    path: '/dashboard',
    component: () => import(
      /* webpackChunkName: "dashboard" */
      '@/views/Dashboard.vue'
    )
  }
]
```

::: tip 路由懒加载的好处
将路由对应的组件分割成独立的代码块，只在访问时才加载，减少首屏加载体积。
:::
