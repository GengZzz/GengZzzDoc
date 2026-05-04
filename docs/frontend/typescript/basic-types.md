# 基础类型

## 原始类型

TypeScript 的原始类型与 JavaScript 一一对应，每个都有明确的类型注解。

### string

`string` 表示文本数据，使用 UTF-16 编码。常用于存储用户输入、URL、文件路径等。

```typescript
let username: string = '张三'
const protocol: string = 'https'

// 模板字符串也是 string 类型
const greeting: string = `欢迎，${username}`

// 实际场景：API 响应类型
interface ApiResponse {
  code: number
  message: string
  data: string | null
}
```

### number

`number` 表示双精度 64 位浮点数，包含整数和浮点数。JavaScript 没有单独的整数类型。

```typescript
let age: number = 25
let price: number = 99.99
let hex: number = 0xff       // 十六进制
let binary: number = 0b1010  // 二进制
let octal: number = 0o744    // 八进制

// 实际场景：计算购物车总价
function calculateTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
```

### boolean

`boolean` 只有两个值：`true` 和 `false`。用于逻辑判断和标志位。

```typescript
let isActive: boolean = true
let hasPermission: boolean = false

// 实际场景：权限检查
function canAccess(user: { role: string }, resource: string): boolean {
  return user.role === 'admin' || resource === 'public'
}
```

### null 与 undefined

`null` 表示"有意地没有值"，`undefined` 表示"尚未赋值"。在 `strictNullChecks` 模式下，它们不能赋值给其他类型。

```typescript
let emptyValue: null = null
let notAssigned: undefined = undefined

// strict 模式下必须显式声明可空
function findUser(id: number): { name: string } | null {
  if (id === 0) return null
  return { name: '张三' }
}

// 实际场景：可选的配置项
interface Config {
  host: string
  port: number
  timeout: number | null  // null 表示使用默认值
}
```

### void

`void` 表示函数没有返回值。它通常用作函数的返回类型注解。

```typescript
function logMessage(msg: string): void {
  console.log(msg)
  // 没有 return 语句，或 return 后不跟值
}

// 实际场景：事件处理函数
function handleClick(event: MouseEvent): void {
  event.preventDefault()
  console.log('按钮被点击')
}
```

### never

`never` 表示永远不会发生的值的类型。用于总是抛出异常或无限循环的函数，也用于穷尽检查。

```typescript
// 抛出异常的函数返回 never
function throwError(message: string): never {
  throw new Error(message)
}

// 无限循环返回 never
function infiniteLoop(): never {
  while (true) {}
}

// 实际场景：穷尽检查
type Shape = 'circle' | 'square' | 'triangle'

function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle': return Math.PI * 10 ** 2
    case 'square': return 10 * 10
    case 'triangle': return (10 * 10) / 2
    default:
      // 如果新增了 Shape 类型但没处理，这里会编译报错
      const _exhaustive: never = shape
      return _exhaustive
  }
}
```

### any

`any` 关闭类型检查，让变量回到纯 JavaScript 的动态类型状态。它会绕过 TypeScript 的类型系统，是最不安全的类型。

```typescript
let flexible: any = 42
flexible = '现在是字符串'  // 不报错
flexible = { key: 'value' } // 不报错
flexible.nonExistent()       // 不报错（运行时才会炸）

// 实际场景：迁移旧 JS 代码时的过渡
function legacyApi(data: any): any {
  return data.process()
}
```

### unknown

`unknown` 是 `any` 的类型安全替代品。它表示"类型未知"，在使用前必须进行类型检查或断言。

```typescript
let userInput: unknown = getUserInput()

// 不能直接使用 unknown 类型的值
// userInput.toUpperCase()  // 错误：Object is of type 'unknown'

// 必须先做类型检查
if (typeof userInput === 'string') {
  console.log(userInput.toUpperCase())  // 安全
}

// 或者使用类型断言
const str = userInput as string

// 实际场景：处理第三方 API 响应
async function fetchExternalApi(url: string): Promise<unknown> {
  const res = await fetch(url)
  return res.json()
}

async function processData() {
  const data = await fetchExternalApi('https://api.example.com/data')
  // 使用前必须验证类型
  if (typeof data === 'object' && data !== null && 'id' in data) {
    console.log(data.id)
  }
}
```

## 字面量类型

字面量类型将值限制为特定的字面量，而非宽泛的原始类型。

```typescript
// 单个字面量
const direction: 'up' = 'up'

// 联合字面量类型（常用）
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

function request(url: string, method: HttpMethod): void {
  console.log(`${method} ${url}`)
}

request('/api/users', 'GET')      // 正确
// request('/api/users', 'PATCH') // 错误：'PATCH' 不能赋值给 HttpMethod

// 数字字面量
type HttpStatus = 200 | 301 | 404 | 500

// 布尔字面量
type TrueOnly = true

// 实际场景：配置选项
interface ScrollOptions {
  behavior: 'smooth' | 'instant'
  block: 'start' | 'center' | 'end'
  inline: 'start' | 'center' | 'end'
}
```

## 联合类型

联合类型使用 `|` 表示一个值可以是多种类型之一。

```typescript
// 基本联合类型
function printId(id: number | string): void {
  console.log(`ID: ${id}`)
}

printId(101)        // 正确
printId('ABC-202')  // 正确

// 配合类型守卫使用
function formatId(id: number | string): string {
  if (typeof id === 'number') {
    return id.toString().padStart(6, '0')
  }
  return id.toUpperCase()
}

// 实际场景：API 分页参数
type Pagination = { page: number; pageSize: number } | 'all'

function fetchUsers(pagination: Pagination): void {
  if (pagination === 'all') {
    console.log('获取所有用户')
  } else {
    console.log(`第 ${pagination.page} 页，每页 ${pagination.pageSize} 条`)
  }
}

fetchUsers({ page: 1, pageSize: 20 })
fetchUsers('all')
```

## 类型别名初步

使用 `type` 关键字为类型创建别名，提升可读性。

```typescript
type ID = number | string
type Callback = (data: string) => void

// 实际场景：电商系统中的金额类型
type Money = number  // 单位：分（避免浮点精度问题）

function formatMoney(cents: Money): string {
  return `¥${(cents / 100).toFixed(2)}`
}

console.log(formatMoney(9999))  // ¥99.99
```

## 注意事项

- `any` 和 `unknown` 的区别：`any` 放弃类型检查，`unknown` 要求使用前必须检查类型。优先使用 `unknown`。
- `void` 不等于 `undefined`。在严格模式下，`void` 类型的变量不能赋值给 `undefined`。
- `never` 类型是所有类型的子类型，但没有类型是 `never` 的子类型（除了 `never` 自身）。
- 字面量类型与联合类型结合使用，可以实现比枚举更轻量的类型约束。
