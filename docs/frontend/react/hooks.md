# Hooks

Hooks 是 React 16.8 引入的特性，让你在函数组件中使用状态和其他 React 特性。

## useState

声明组件的状态变量。

```jsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  const [user, setUser] = useState({ name: 'React', version: 19 })

  // 基本类型
  function increment() {
    setCount(count + 1)
    // 或函数式更新（推荐，避免闭包问题）
    setCount(prev => prev + 1)
  }

  // 引用类型：需要创建新对象
  function updateName() {
    setUser({ ...user, name: 'React 19' })
  }

  // 数组
  const [items, setItems] = useState([])
  function addItem(item) {
    setItems(prev => [...prev, item])
  }
  function removeItem(id) {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+1</button>
    </div>
  )
}
```

::: tip 不可变更新
React 通过比较引用来判断是否需要重新渲染。更新对象/数组时必须创建新值，不能直接修改：

```js
// 错误
state.name = 'new'  // 不会触发重新渲染

// 正确
setState({ ...state, name: 'new' })
```

:::

## useEffect

处理副作用：数据获取、订阅、手动 DOM 操作、定时器等。

```jsx
import { useEffect, useState } from 'react'

function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 组件挂载 + userId 变化时执行
  useEffect(() => {
    async function fetchUser() {
      setLoading(true)
      const res = await fetch(`/api/users/${userId}`)
      setUser(await res.json())
      setLoading(false)
    }
    fetchUser()
  }, [userId])  // 依赖数组

  // 仅挂载时执行一次（空依赖数组）
  useEffect(() => {
    console.log('组件挂载')
  }, [])

  // 每次渲染都执行（无依赖数组）
  useEffect(() => {
    document.title = `用户: ${user?.name}`
  })

  // 清理函数：组件卸载或依赖变化前执行
  useEffect(() => {
    const timer = setInterval(() => console.log('tick'), 1000)

    return () => {
      clearInterval(timer)  // 清理定时器
    }
  }, [])

  if (loading) return <p>加载中...</p>
  return <p>{user.name}</p>
}
```

## useRef

获取 DOM 引用或在渲染间保持可变值（不触发重新渲染）。

```jsx
import { useRef, useEffect } from 'react'

function SearchInput() {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current.focus()  // 组件挂载后聚焦
  }, [])

  return <input ref={inputRef} placeholder="搜索..." />
}

// 保存值但不触发渲染
function Timer() {
  const [count, setCount] = useState(0)
  const timerRef = useRef(null)

  function start() {
    timerRef.current = setInterval(() => {
      setCount(c => c + 1)
    }, 1000)
  }

  function stop() {
    clearInterval(timerRef.current)
  }

  return (
    <div>
      <p>{count}</p>
      <button onClick={start}>开始</button>
      <button onClick={stop}>停止</button>
    </div>
  )
}
```

## useMemo / useCallback

性能优化：缓存计算结果和函数引用。

```jsx
import { useState, useMemo, useCallback } from 'react'

function ExpensiveList({ items, filter }) {
  // useMemo: 缓存计算结果
  const filtered = useMemo(() => {
    console.log('重新过滤...')
    return items.filter(item => item.includes(filter))
  }, [items, filter])

  // useCallback: 缓存函数引用（配合 React.memo 使用）
  const handleClick = useCallback((id) => {
    console.log('点击了', id)
  }, [])

  return (
    <ul>
      {filtered.map(item => (
        <MemoItem key={item} item={item} onClick={handleClick} />
      ))}
    </ul>
  )
}

// React.memo: 浅比较 props，不变则跳过渲染
const MemoItem = React.memo(function Item({ item, onClick }) {
  return <li onClick={() => onClick(item)}>{item}</li>
})
```

::: tip 何时使用 useMemo / useCallback

- `useMemo`：计算代价很高的派生数据
- `useCallback`：传递给 `React.memo` 子组件的回调函数
- 不要过度优化，简单计算不需要 memo
:::

## 自定义 Hook

将可复用的状态逻辑提取为自定义 Hook，命名以 `use` 开头。

```jsx
// hooks/useLocalStorage.js
import { useState, useEffect } from 'vue'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}
```

```jsx
// 使用
function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  const [lang, setLang] = useLocalStorage('lang', 'zh')

  return (
    <div>
      <select value={theme} onChange={e => setTheme(e.target.value)}>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </div>
  )
}
```

## Hook 规则

1. **只在顶层调用 Hook**：不能在条件、循环、嵌套函数中调用
2. **只在函数组件和自定义 Hook 中调用 Hook**

```jsx
// 错误
if (condition) {
  useEffect(() => {}, [])  // 条件中调用
}

// 正确
useEffect(() => {
  if (condition) {
    // 在回调中使用条件
  }
}, [])
```
