# 状态管理

React 有多种状态管理方案，从轻量的 Context API 到专库如 Zustand、Redux Toolkit。

## 状态分类

| 类型 | 存储位置 | 示例 |
|------|---------|------|
| 组件状态 | `useState` | 表单输入、开关状态 |
| 共享状态 | 提升到共同父组件 | 兄弟组件共享数据 |
| 全局状态 | Context / Zustand / Redux | 用户信息、主题设置 |
| 服务端状态 | React Query / SWR | API 数据缓存 |

## Context API

React 内置的跨组件数据共享方案，适合低频更新的全局状态。

```jsx
// contexts/ThemeContext.jsx
import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme 必须在 ThemeProvider 内使用')
  return context
}
```

```jsx
// App.jsx
function App() {
  return (
    <ThemeProvider>
      <Header />
      <Main />
    </ThemeProvider>
  )
}

// 任意子组件
function Header() {
  const { theme, toggleTheme } = useTheme()
  return (
    <header className={theme}>
      <button onClick={toggleTheme}>切换主题</button>
    </header>
  )
}
```

::: tip Context 的局限

- 状态更新会导致所有消费者重新渲染
- 不适合高频更新（如输入框实时搜索）
- 深层嵌套时 Provider 层级管理复杂
:::

## Zustand

轻量级状态管理库，API 简洁，无 Provider 嵌套。

```bash
npm install zustand
```

### 基本用法

```js
// stores/useStore.js
import { create } from 'zustand'

export const useStore = create((set, get) => ({
  count: 0,
  user: null,

  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),

  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),

  // 读取当前状态
  doubleCount: () => get().count * 2
}))
```

```jsx
// 使用
function Counter() {
  const count = useStore(state => state.count)
  const increment = useStore(state => state.increment)

  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+1</button>
    </div>
  )
}
```

### 持久化

```js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUserStore = create(
  persist(
    (set) => ({
      token: '',
      name: '',
      setAuth: (token, name) => set({ token, name }),
      logout: () => set({ token: '', name: '' })
    }),
    { name: 'user-storage' }  // localStorage key
  )
)
```

### 异步操作

```js
export const useTodoStore = create((set) => ({
  todos: [],
  loading: false,

  fetchTodos: async () => {
    set({ loading: true })
    const res = await fetch('/api/todos')
    const todos = await res.json()
    set({ todos, loading: false })
  },

  addTodo: async (text) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text })
    })
    const todo = await res.json()
    set(state => ({ todos: [...state.todos, todo] }))
  }
}))
```

## Redux Toolkit

适合大型项目的完整状态管理方案。

```bash
npm install @reduxjs/toolkit react-redux
```

### 创建 Slice

```js
// features/counter/counterSlice.js
import { createSlice } from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1 },
    decrement: (state) => { state.value -= 1 },
    incrementByAmount: (state, action) => {
      state.value += action.payload
    }
  }
})

export const { increment, decrement, incrementByAmount } = counterSlice.actions
export default counterSlice.reducer
```

### 配置 Store

```js
// store.js
import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './features/counter/counterSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer
  }
})
```

```jsx
// main.jsx
import { Provider } from 'react-redux'
import { store } from './store'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
)
```

### 在组件中使用

```jsx
import { useSelector, useDispatch } from 'react-redux'
import { increment, decrement } from './features/counter/counterSlice'

function Counter() {
  const count = useSelector(state => state.counter.value)
  const dispatch = useDispatch()

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(decrement())}>-1</button>
    </div>
  )
}
```

## 方案选型

| 方案 | 适用场景 | 复杂度 |
|------|---------|--------|
| useState + Props | 小型组件树 | 低 |
| Context | 低频全局状态（主题、语言） | 低 |
| Zustand | 中小型项目，简洁 API | 低 |
| Redux Toolkit | 大型项目，需要 DevTools 和中间件 | 中 |
| Jotai / Recoil | 原子化状态管理 | 中 |

::: tip 选型建议

- 能用 `useState` 解决的不用全局状态
- 需要全局状态但更新不频繁 → Context
- 需要简洁高效的全局状态 → Zustand
- 大型项目、团队协作、需要完整工具链 → Redux Toolkit
:::
