# 类型断言

## as 语法

`as` 是最常用的类型断言语法。它告诉编译器"我知道这个值的类型比你推断的更具体"。类型断言只在编译时起作用，不会做任何运行时转换。

```typescript
// 从宽类型断言为具体类型
const input = document.getElementById('username') as HTMLInputElement
console.log(input.value)  // 没有断言时，HTMLElement 没有 value 属性

// 实际场景：处理 DOM 元素
function getFormValue(formId: string, inputName: string): string {
  const form = document.getElementById(formId) as HTMLFormElement
  const input = form.elements.namedItem(inputName) as HTMLInputElement
  return input.value
}
```

### 类型断言的前提

类型断言要求源类型和目标类型必须有兼容性关系。不能随意断言完全无关的类型。

```typescript
// 合法：HTMLElement 是 HTMLInputElement 的父类型
const el = document.getElementById('x') as HTMLInputElement

// 合法：联合类型断言为其中一个成员
const id: number | string = 'ABC-123'
const strId = id as string

// 非法：string 和 number 互不兼容
// const num = 'hello' as number  // 编译错误
```

## 非空断言（!）

非空断言使用 `!` 后缀，告诉编译器该值不是 `null` 或 `undefined`。它比 `as` 更危险，因为跳过了空值检查。

```typescript
interface User {
  name: string
  address?: {
    city: string
  }
}

function getCity(user: User): string {
  // 非空断言：我保证 user.address 不是 undefined
  return user.address!.city
}

// 实际场景：Vue 组件中访问 DOM
function focusInput() {
  const input = document.querySelector('#search') as HTMLInputElement
  input!.focus()
}

// 实际场景：初始化后访问配置
let config: { apiUrl: string } | undefined

function initConfig() {
  config = { apiUrl: 'https://api.example.com' }
}

initConfig()
console.log(config!.apiUrl)  // 安全：initConfig 保证了 config 已赋值
```

### 非空断言的风险

```typescript
const user: User = { name: '张三' }

// 危险！user.address 是 undefined，非空断言不会阻止运行时错误
console.log(user.address!.city)  // 运行时 TypeError: Cannot read properties of undefined

// 安全的做法是可选链 + 空值合并
console.log(user.address?.city ?? '未知城市')
```

## const 断言

`as const` 将表达式的类型收窄为最具体的字面量类型，并将所有属性标记为 `readonly`。

```typescript
// 没有 const 断言
let str = 'hello'      // 类型：string
let arr = [1, 2, 3]    // 类型：number[]
let obj = { x: 1 }     // 类型：{ x: number }

// 使用 const 断言
const str2 = 'hello' as const      // 类型："hello"
const arr2 = [1, 2, 3] as const    // 类型：readonly [1, 2, 3]
const obj2 = { x: 1 } as const     // 类型：{ readonly x: 1 }

// 实际场景：定义不可变配置
const API_ENDPOINTS = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments'
} as const

// API_ENDPOINTS 的类型推导为：
// {
//   readonly users: "/api/users"
//   readonly posts: "/api/posts"
//   readonly comments: "/api/comments"
// }

type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]
// 结果："/api/users" | "/api/posts" | "/api/comments"

// 实际场景：路由定义
const routes = [
  { path: '/', name: 'home', component: 'Home' },
  { path: '/about', name: 'about', component: 'About' },
  { path: '/users/:id', name: 'user-detail', component: 'UserDetail' }
] as const

type RouteName = typeof routes[number]['name']
// 结果："home" | "about" | "user-detail"
```

## 双重断言

当两个类型完全不兼容时，普通的 `as` 断言会报错。此时可以通过 `as unknown as TargetType` 进行双重断言。这是最后的手段，应尽量避免使用。

```typescript
// 普通断言报错
// const num = 'hello' as number  // Error

// 双重断言
const num = 'hello' as unknown as number  // 编译通过，但运行时仍然是字符串

// 实际场景：测试 mock 对象
interface Database {
  query(sql: string): Promise<any[]>
}

// 在测试中创建一个最小 mock
const mockDb = {
  query: jest.fn()
} as unknown as Database

// 实际场景：处理第三方库的类型错误
const rawData: unknown = JSON.parse('{"x": 1}')
const point = rawData as unknown as { x: number; y: number }
```

## 类型断言 vs 类型转换

类型断言只在编译时生效，不会改变运行时值的实际类型。它不同于类型转换（如 `Number()`、`String()`）。

```typescript
// 类型断言：编译时告诉 TS 类型，运行时不变
const a = '123' as any as number
typeof a  // 运行时是 'string'，不是 'number'

// 类型转换：运行时真正改变值的类型
const b = Number('123')
typeof b  // 运行时是 'number'
```

## 最佳实践

```typescript
// 好：使用类型守卫代替类型断言
function process(value: string | number) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase())  // TS 自动收窄，无需断言
  }
}

// 好：使用可选链代替非空断言
const city = user.address?.city ?? '未知'

// 好：使用 as const 代替手动定义字面量联合类型
const colors = ['red', 'green', 'blue'] as const
type Color = typeof colors[number]  // "red" | "green" | "blue"

// 不好：频繁使用双重断言意味着类型设计有问题
```

## 注意事项

- `as` 断言不能将联合类型断言为不相关的类型。`'hello' as number` 会报错，但 `'hello' as any as number` 不会（双重断言）。
- 非空断言 `!` 应当作为最后手段。优先使用可选链 `?.` 和空值合并 `??`。
- `as const` 会将整个表达式冻结为只读。如果需要修改数组或对象的属性，不要使用 `as const`。
- 在 JSX 中不能使用 `as` 语法，需要使用尖括号断言（`<Type>value`），但 `.tsx` 文件中也禁止尖括号断言，因此 `.tsx` 文件中只能用 `as`。
