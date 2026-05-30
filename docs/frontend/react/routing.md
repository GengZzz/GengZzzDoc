---
title: "React Router"
description: "React Router 是 React 生态中最主流的路由库。"
---

# React Router

React Router 是 React 生态中最主流的路由库。

## 安装

```bash
npm install react-router-dom
```

## 基本配置

```jsx
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/user/:id" element={<User />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## 导航

### 声明式

```jsx
import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <nav>
      <Link to="/">首页</Link>
      <Link to="/about">关于</Link>
      {/* NavLink 自动添加 active class */}
      <NavLink to="/dashboard" className={({ isActive }) =>
        isActive ? 'active' : ''
      }>仪表盘</NavLink>
    </nav>
  )
}
```

### 编程式

```jsx
import { useNavigate } from 'react-router-dom'

function LoginForm() {
  const navigate = useNavigate()

  function handleSubmit() {
    // 登录成功后跳转
    navigate('/dashboard')

    // 带参数跳转
    navigate('/user/123')

    // 替换当前记录
    navigate('/home', { replace: true })

    // 前进/后退
    navigate(-1)  // 后退
  }

  return <button onClick={handleSubmit}>登录</button>
}
```

## 路由参数

```jsx
import { useParams, useSearchParams } from 'react-router-dom'

// 动态参数 /user/:id
function User() {
  const { id } = useParams()
  return <p>用户 ID: {id}</p>
}

// 查询参数 /search?q=react&page=1
function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q')
  const page = searchParams.get('page')

  function handleSearch(q) {
    setSearchParams({ q, page: 1 })
  }

  return <p>搜索: {query}, 第 {page} 页</p>
}
```

## 嵌套路由与 Outlet

```jsx
import { Routes, Route, Outlet } from 'react-router-dom'

// 布局组件
function DashboardLayout() {
  return (
    <div className="dashboard">
      <aside>
        <NavLink to="/dashboard">概览</NavLink>
        <NavLink to="/dashboard/settings">设置</NavLink>
      </aside>
      <main>
        <Outlet />  {/* 子路由渲染位置 */}
      </main>
    </div>
  )
}

// 路由配置
<Routes>
  <Route path="/dashboard" element={<DashboardLayout />}>
    <Route index element={<DashboardHome />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>
```

## 路由守卫

```jsx
import { Navigate, useLocation } from 'react-router-dom'

// 受保护路由组件
function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem('token')
  const location = useLocation()

  if (!isLoggedIn) {
    // 重定向到登录页，记住当前路径
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

// 使用
<Routes>
  <Route path="/login" element={<Login />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
</Routes>

// Login 组件中获取来源路径
function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  function handleLogin() {
    localStorage.setItem('token', 'xxx')
    navigate(from, { replace: true })
  }
}
```

## 懒加载

```jsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}
```
