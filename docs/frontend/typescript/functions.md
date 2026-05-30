---
title: "函数"
description: "TypeScript 可以为函数的参数和返回值添加类型注解，让函数的输入输出契约化。"
---

# 函数

## 参数类型与返回值类型

TypeScript 可以为函数的参数和返回值添加类型注解，让函数的输入输出契约化。

```typescript
// 完整注解
function add(a: number, b: number): number {
  return a + b
}

// 箭头函数
const multiply = (a: number, b: number): number => a * b

// 返回 void 的函数
function log(msg: string): void {
  console.log(msg)
}

// 返回 Promise
async function fetchUser(id: number): Promise<{ name: string }> {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

// 实际场景：数据转换管道
function parseJSON<T>(raw: string): T {
  return JSON.parse(raw)
}

function validateUser(data: unknown): data is { name: string; age: number } {
  return typeof data === 'object' && data !== null && 'name' in data && 'age' in data
}
```

## 可选参数

可选参数使用 `?` 标记，必须放在必选参数之后。

```typescript
function createUser(name: string, age?: number): { name: string; age: number | undefined } {
  return { name, age }
}

createUser('张三')          // age 是 undefined
createUser('张三', 25)     // age 是 25

// 实际场景：配置选项
function request(
  url: string,
  method?: 'GET' | 'POST',
  headers?: Record<string, string>
): Promise<Response> {
  return fetch(url, {
    method: method ?? 'GET',
    headers: headers ?? {}
  })
}

// 实际场景：通知系统
function notify(
  message: string,
  type?: 'info' | 'warning' | 'error',
  duration?: number
): void {
  const notificationType = type ?? 'info'
  const displayTime = duration ?? 3000
  console.log(`[${notificationType}] ${message} (${displayTime}ms)`)
}
```

## 默认参数

为参数提供默认值，当调用时未传入该参数或传入 `undefined` 时使用默认值。

```typescript
function connect(
  host: string = 'localhost',
  port: number = 3306,
  database: string = 'mydb'
): string {
  return `mysql://${host}:${port}/${database}`
}

connect()                           // mysql://localhost:3306/mydb
connect('prod-server')              // mysql://prod-server:3306/mydb
connect('prod-server', 5432)        // mysql://prod-server:5432/mydb

// 实际场景：分页查询
function query(
  table: string,
  options: {
    page?: number
    pageSize?: number
    orderBy?: string
  } = {}
): string {
  const { page = 1, pageSize = 20, orderBy = 'id' } = options
  return `SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`
}

query('users')                                    // SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 0
query('users', { page: 3, pageSize: 50 })         // SELECT * FROM users ORDER BY id LIMIT 50 OFFSET 100
```

## 剩余参数

剩余参数使用 `...` 将多个参数收集为一个数组。

```typescript
function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0)
}

sum(1, 2, 3)       // 6
sum(10, 20, 30, 40) // 100

// 实际场景：日志函数
function log2(level: string, ...messages: unknown[]): void {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level}]`, ...messages)
}

log2('INFO', '用户登录', { userId: 123 })

// 实际场景：事件发射器
type EventCallback = (...args: any[]) => void

class EventEmitter {
  private listeners: Record<string, EventCallback[]> = {}

  on(event: string, callback: EventCallback): void {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
  }

  emit(event: string, ...args: any[]): void {
    this.listeners[event]?.forEach(cb => cb(...args))
  }
}
```

## this 绑定

TypeScript 支持通过 `this` 参数显式声明函数内部 `this` 的类型。`this` 参数是一个假参数，编译后会被擦除。

```typescript
interface User {
  name: string
  age: number
  greet(this: User): string  // this 参数
}

const user: User = {
  name: '张三',
  age: 25,
  greet() {
    return `你好，我是 ${this.name}`
  }
}

// 实际场景：DOM 事件处理器
interface ButtonHandler {
  (this: HTMLButtonElement, event: MouseEvent): void
}

// 实际场景：链式调用
class QueryBuilder {
  private conditions: string[] = []

  where(this: QueryBuilder, condition: string): this {
    this.conditions.push(condition)
    return this
  }

  and(this: QueryBuilder, condition: string): this {
    this.conditions.push(`AND ${condition}`)
    return this
  }

  build(): string {
    return this.conditions.join(' ')
  }
}

const query = new QueryBuilder()
  .where('age > 18')
  .and('status = "active"')
  .build()
// 'age > 18 AND status = "active"'
```

## 函数重载

函数重载允许一个函数有多个签名，根据不同的参数类型和数量返回不同的类型。

```typescript
// 重载签名（对外可见）
function formatDate(date: Date): string
function formatDate(timestamp: number): string
function formatDate(isoString: string): string

// 实现签名（对内可见，不直接暴露）
function formatDate(input: Date | number | string): string {
  const date = input instanceof Date
    ? input
    : typeof input === 'number'
      ? new Date(input)
      : new Date(input)

  return date.toLocaleDateString('zh-CN')
}

// 调用时 TS 根据参数类型选择正确的重载
formatDate(new Date())        // 使用 Date 重载
formatDate(1700000000000)     // 使用 number 重载
formatDate('2024-01-01')      // 使用 string 重载

// 实际场景：API 请求函数
function api<T>(url: string): Promise<T>
function api<T>(url: string, data: unknown): Promise<T>
function api<T>(url: string, data?: unknown): Promise<T> {
  if (data) {
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json())
  }
  return fetch(url).then(r => r.json())
}

// TS 推导 user 的类型为 User
const user2 = await api<User>('/api/users/1')

// 实际场景：DOM 查询
function $(selector: string): HTMLElement | null
function $(selector: string, context: Document): HTMLElement | null
function $(selector: string, context?: Document): HTMLElement | null {
  return (context ?? document).querySelector(selector)
}
```

### 重载注意事项

```typescript
// 重载签名的参数类型必须是实现签名的子集
// 实现签名不能直接调用，必须通过重载签名调用

// 错误示例：实现签名对外不可见
// function add(a: number, b: number): number  // 实现签名
// const result = add('a', 'b')  // Error: 实现签名不可直接匹配

// 正确：所有可能的调用都有对应的重载签名
function createElement(tag: 'a'): HTMLAnchorElement
function createElement(tag: 'div'): HTMLDivElement
function createElement(tag: 'input'): HTMLInputElement
function createElement(tag: string): HTMLElement {
  return document.createElement(tag)
}
```

## 注意事项

- 可选参数和默认参数不能同时使用。有默认值的参数本身就是可选的。
- 剩余参数必须是最后一个参数。
- `this` 参数必须是第一个参数，且编译后会被移除，不会影响运行时的参数传递。
- 函数重载的匹配顺序是从上到下，因此应该把更具体的签名放在前面。
- 返回 `void` 的函数类型，实际可以返回任意值（调用者会忽略返回值），这是 TypeScript 的设计特性。
