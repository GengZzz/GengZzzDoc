---
title: "泛型"
description: "泛型（Generics）是一种将类型作为参数传递的机制。它让函数、类、接口在保持类型安全的同时支持多种类型。"
---

# 泛型

## 泛型函数

泛型（Generics）是一种将类型作为参数传递的机制。它让函数、类、接口在保持类型安全的同时支持多种类型。

```typescript
// 无泛型：类型丢失
function identity(arg: any): any {
  return arg  // 返回值类型被擦除为 any
}

// 有泛型：类型保留
function identity2<T>(arg: T): T {
  return arg  // 返回值类型与参数类型一致
}

const result = identity2('hello')  // result 类型为 'hello'
const result2 = identity2(42)      // result2 类型为 42

// 实际场景：数组包装
function toArray<T>(value: T): T[] {
  return [value]
}

const arr1 = toArray('hello')   // string[]
const arr2 = toArray(42)        // number[]

// 实际场景：数据获取函数
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url)
  return response.json()
}

interface User {
  id: number
  name: string
}

// TS 推导 user 类型为 User
const user = await fetchData<User>('/api/users/1')
console.log(user.name)  // 安全访问
```

## 泛型约束

使用 `extends` 关键字限制泛型参数的范围，确保传入的类型满足特定条件。

```typescript
// 约束 T 必须有 length 属性
interface HasLength {
  length: number
}

function logLength<T extends HasLength>(arg: T): T {
  console.log(arg.length)
  return arg
}

logLength('hello')       // string 有 length
logLength([1, 2, 3])     // 数组有 length
logLength({ length: 10 }) // 对象有 length
// logLength(123)         // Error: number 没有 length

// 实际场景：获取对象属性
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const person = { name: '张三', age: 25, email: 'test@example.com' }
const name = getProperty(person, 'name')    // 类型：string
const age = getProperty(person, 'age')      // 类型：number
// getProperty(person, 'phone')             // Error: 'phone' 不在 person 的键中

// 实际场景：合并对象
function merge<T extends object, U extends object>(target: T, source: U): T & U {
  return { ...target, ...source }
}

const merged = merge({ name: '张三' }, { age: 25 })
// 类型：{ name: string } & { age: number }
```

## keyof 操作符

`keyof` 返回一个类型的所有键的联合类型。它常与泛型结合使用，实现类型安全的属性访问。

```typescript
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

type UserKeys = keyof User  // 'id' | 'name' | 'email' | 'role'

// 实际场景：类型安全的取值函数
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    result[key] = obj[key]
  }
  return result
}

const user: User = { id: 1, name: '张三', email: 'test@example.com', role: 'admin' }
const summary = pick(user, ['name', 'email'])
// 类型：Pick<User, 'name' | 'email'>

// 实际场景：类型安全的事件系统
type EventMap = {
  click: { x: number; y: number }
  submit: { data: FormData }
  error: { message: string; code: number }
}

function on<K extends keyof EventMap>(
  event: K,
  handler: (payload: EventMap[K]) => void
): void {
  // 注册事件处理器
}

on('click', (e) => console.log(e.x, e.y))      // e 类型为 { x: number; y: number }
on('error', (e) => console.log(e.code))         // e 类型为 { message: string; code: number }
```

## 默认类型参数

为泛型参数指定默认类型，在不显式传入类型时使用。

```typescript
interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 不指定类型参数时，data 为 unknown
const res1: ApiResponse = { code: 200, message: 'ok', data: {} }

// 指定类型参数时，data 有明确类型
interface UserData {
  id: number
  name: string
}
const res2: ApiResponse<UserData> = {
  code: 200,
  message: 'ok',
  data: { id: 1, name: '张三' }
}

// 实际场景：状态管理
interface AsyncState<TData = null, TError = Error> {
  isLoading: boolean
  data: TData
  error: TError | null
}

const state1: AsyncState = { isLoading: false, data: null, error: null }
const state2: AsyncState<string[]> = { isLoading: false, data: ['a', 'b'], error: null }
```

## 条件类型

条件类型根据类型关系动态选择类型，语法类似于三元表达式：`T extends U ? X : Y`。

```typescript
// 基本条件类型
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>  // true
type B = IsString<42>       // false

// 实际场景：根据输入类型决定返回类型
type ApiResponse2<T> = T extends 'user'
  ? { id: number; name: string }
  : T extends 'post'
    ? { id: number; title: string }
    : unknown

type UserResponse = ApiResponse2<'user'>  // { id: number; name: string }
type PostResponse = ApiResponse2<'post'>  // { id: number; title: string }

// 实际场景：函数返回类型推导
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type A1 = UnwrapPromise<Promise<string>>  // string
type A2 = UnwrapPromise<number>           // number

// 实际场景：提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never

type Item = ElementOf<string[]>   // string
type Item2 = ElementOf<number[]>  // number
```

### 分布式条件类型

当条件类型作用于联合类型时，它会对联合类型的每个成员分别求值，然后将结果合并。

```typescript
type ToArray<T> = T extends unknown ? T[] : never

type Result = ToArray<string | number>
// 结果：string[] | number[]（不是 (string | number)[]）

// 阻止分布式行为
type ToArray2<T> = [T] extends [unknown] ? T[] : never

type Result2 = ToArray2<string | number>
// 结果：(string | number)[]
```

## 实战：构建类型安全的 API 客户端

```typescript
// 定义 API 路由
interface ApiRoutes {
  '/api/users': {
    GET: { response: User[] }
    POST: { body: Omit<User, 'id'>; response: User }
  }
  '/api/users/:id': {
    GET: { response: User }
    PUT: { body: Partial<User>; response: User }
    DELETE: { response: void }
  }
}

// 类型安全的请求函数
type Route = keyof ApiRoutes
type Method<R extends Route> = keyof ApiRoutes[R]

async function api<R extends Route, M extends Method<R>>(
  route: R,
  method: M,
  options?: ApiRoutes[R][M] extends { body: infer B } ? { body: B } : {}
): Promise<ApiRoutes[R][M] extends { response: infer Res } ? Res : void> {
  const res = await fetch(route, {
    method: method as string,
    body: options && 'body' in options ? JSON.stringify(options.body) : undefined
  })
  return res.json()
}

// 类型安全的调用
const users = await api('/api/users', 'GET')              // users: User[]
const newUser = await api('/api/users', 'POST', {         // newUser: User
  body: { name: '张三', email: 'zhang@example.com', role: 'user' }
})
```

## 注意事项

- 泛型参数的命名惯例：`T`（Type）、`K`（Key）、`V`（Value）、`E`（Element）、`R`（Return）。多个泛型参数时使用 `T1, T2` 或有意义的名称。
- TypeScript 会自动推导泛型参数，大多数情况下不需要显式传入类型。但当推导结果不符合预期时，应显式指定。
- 条件类型中的分布式行为（distributed conditional types）只在泛型参数是裸类型参数（未被包裹在数组、Promise 等中）时触发。
- 避免过度泛型。如果函数只有一个参数且泛型只出现一次，可能不需要泛型。
