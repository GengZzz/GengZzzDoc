# JSX 与组件

JSX 是 JavaScript 的语法扩展，让你在 JS 中编写类似 HTML 的结构。React 组件是构建 UI 的基本单元。

## JSX 语法

```jsx
const element = <h1>Hello, React!</h1>
const name = 'React'
const element2 = <h1>Hello, {name}!</h1>  // 表达式嵌入

// 条件表达式
const greeting = <p>{isLoggedIn ? '欢迎回来' : '请登录'}</p>

// 属性绑定（camelCase）
const img = <img src={imageUrl} alt="logo" onClick={handleClick} />

// 样式：对象形式
const style = { color: 'red', fontSize: 20 }
const text = <p style={style}>红色文字</p>

// className 而非 class
const div = <div className="container">内容</div>
```

::: tip JSX 规则
- 只能返回一个根元素（可用 `<>...</>` Fragment 包裹）
- 标签必须闭合（`<img />`、`<br />`）
- 属性用 camelCase：`onClick`、`onChange`、`className`
- `style` 接受对象而非字符串
:::

## 函数组件

React 推荐使用函数组件 + Hooks。

```jsx
// 最简单的组件
function Welcome() {
  return <h1>欢迎</h1>
}

// 箭头函数形式
const Welcome = () => <h1>欢迎</h1>

// 使用组件
function App() {
  return (
    <div>
      <Welcome />
      <Welcome />
    </div>
  )
}
```

## Props

Props 是父组件向子组件传递数据的方式。

```jsx
// 接收 props
function UserCard({ name, age, avatar }) {
  return (
    <div className="card">
      <img src={avatar} alt={name} />
      <h3>{name}</h3>
      <p>{age} 岁</p>
    </div>
  )
}

// 使用
<UserCard name="张三" age={25} avatar="/avatar.png" />

// 解构 + 默认值
function Button({ children, type = 'primary', onClick }) {
  return (
    <button className={`btn btn-${type}`} onClick={onClick}>
      {children}
    </button>
  )
}

// children: 组件标签之间的内容
<Button type="danger" onClick={handleDelete}>删除</Button>
```

## 事件处理

```jsx
function Form() {
  function handleSubmit(e) {
    e.preventDefault()  // 阻止默认行为
    console.log('提交')
  }

  function handleClick(msg) {
    return () => console.log(msg)
  }

  function handleChange(e) {
    console.log(e.target.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
      <button type="submit">提交</button>
      <button onClick={handleClick('已点击')}>点击我</button>
    </form>
  )
}
```

## 条件渲染

```jsx
function StatusBadge({ status }) {
  // if/else
  if (status === 'loading') return <span>加载中...</span>
  if (status === 'error') return <span>出错了</span>

  // 三目运算符
  return (
    <span className={status === 'active' ? 'green' : 'gray'}>
      {status === 'active' ? '在线' : '离线'}
    </span>
  )
}

// && 短路
function Notification({ message }) {
  return (
    <div>
      {message && <div className="alert">{message}</div>}
    </div>
  )
}
```

## 列表渲染

```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <span className={todo.done ? 'done' : ''}>{todo.text}</span>
        </li>
      ))}
    </ul>
  )
}

// 过滤 + 映射
function ActiveUsers({ users }) {
  const active = users.filter(u => u.isActive)
  return (
    <ul>
      {active.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}
```

::: tip key 的作用
`key` 帮助 React 识别列表中哪些元素发生了变化。使用稳定的唯一标识（如 `id`），不要用数组索引。
:::

## 表单受控组件

```jsx
function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' })

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    console.log(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="邮箱"
      />
      <input
        name="password"
        type="password"
        value={form.password}
        onChange={handleChange}
        placeholder="密码"
      />
      <button type="submit">登录</button>
    </form>
  )
}
```
