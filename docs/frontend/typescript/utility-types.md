---
title: "工具类型"
description: "TypeScript 内置了一系列工具类型（Utility Types），用于对现有类型进行变换。它们都是基于泛型实现的。"
---

# 工具类型

TypeScript 内置了一系列工具类型（Utility Types），用于对现有类型进行变换。它们都是基于泛型实现的。

## Partial\<T\>

将类型 `T` 的所有属性变为可选。

```typescript
interface User {
  id: number
  name: string
  email: string
}

type PartialUser = Partial<User>
// 等价于 { id?: number; name?: string; email?: string }

// 实际场景：更新操作，只需要传入要修改的字段
function updateUser(id: number, updates: Partial<User>): void {
  console.log(`更新用户 ${id}:`, updates)
}

updateUser(1, { name: '李四' })            // 只更新 name
updateUser(2, { email: 'new@example.com' }) // 只更新 email
```

## Required\<T\>

将类型 `T` 的所有属性变为必选（移除所有 `?`）。

```typescript
interface Config {
  host?: string
  port?: number
  debug?: boolean
}

type StrictConfig = Required<Config>
// { host: string; port: number; debug: boolean }

// 实际场景：确保配置完整
function createServer(config: Required<Config>) {
  console.log(`启动服务器 ${config.host}:${config.port}`)
}

createServer({ host: 'localhost', port: 3000, debug: true })
```

## Readonly\<T\>

将类型 `T` 的所有属性变为只读。

```typescript
interface State {
  count: number
  name: string
}

type FrozenState = Readonly<State>
// { readonly count: number; readonly name: string }

// 实际场景：不可变状态
function createImmutableState(initial: State): Readonly<State> {
  return { ...initial }
}

const state = createImmutableState({ count: 0, name: '计数器' })
// state.count = 1  // Error: Cannot assign to 'count' because it is a read-only property
```

## Pick\<T, K\>

从类型 `T` 中选取指定的属性 `K` 组成新类型。

```typescript
interface User {
  id: number
  name: string
  email: string
  password: string
  role: string
}

// 只选取 name 和 email
type UserPreview = Pick<User, 'name' | 'email'>
// { name: string; email: string }

// 实际场景：API 返回脱敏数据
type PublicUser = Pick<User, 'id' | 'name' | 'role'>

function getPublicProfile(user: User): PublicUser {
  return { id: user.id, name: user.name, role: user.role }
}
```

## Omit\<T, K\>

从类型 `T` 中排除指定的属性 `K`，保留其余属性。

```typescript
// 排除 password 字段
type SafeUser = Omit<User, 'password'>
// { id: number; name: string; email: string; role: string }

// 实际场景：表单提交排除自增字段
type CreateUserInput = Omit<User, 'id'>

function createUser(data: CreateUserInput): User {
  return { id: Math.random(), ...data }
}
```

## Record\<K, V\>

构造一个键类型为 `K`、值类型为 `V` 的对象类型。

```typescript
// 基本用法
type UserRoles = Record<string, 'admin' | 'user' | 'guest'>

const roles: UserRoles = {
  'alice': 'admin',
  'bob': 'user'
}

// 实际场景：状态码映射
const statusMessages: Record<number, string> = {
  200: 'OK',
  404: 'Not Found',
  500: 'Internal Server Error'
}

// 实际场景：枚举到值的映射
type Theme = 'light' | 'dark'
type ThemeConfig = Record<Theme, { bg: string; text: string }>

const themeConfig: ThemeConfig = {
  light: { bg: '#ffffff', text: '#000000' },
  dark: { bg: '#1a1a1a', text: '#ffffff' }
}
```

## Exclude\<T, U\>

从联合类型 `T` 中排除可以赋值给 `U` 的类型。

```typescript
type All = 'a' | 'b' | 'c' | 'd'
type Excluded = Exclude<All, 'a' | 'c'>
// 结果：'b' | 'd'

// 实际场景：排除特定类型
type Primitive = string | number | boolean | null | undefined | symbol | bigint
type NonSymbol = Exclude<Primitive, symbol>
// string | number | boolean | null | undefined | bigint
```

## Extract\<T, U\>

从联合类型 `T` 中提取可以赋值给 `U` 的类型。

```typescript
type All = string | number | boolean | undefined
type OnlyPrimitives = Extract<All, string | number>
// 结果：string | number

// 实际场景：提取特定的事件类型
type AppEvent = 'click' | 'submit' | 'resize' | 'scroll' | 'keydown'
type MouseEvents = Extract<AppEvent, 'click' | 'submit'>
// 'click' | 'submit'
```

## ReturnType\<T\>

获取函数类型 `T` 的返回值类型。

```typescript
function getUser() {
  return { id: 1, name: '张三', email: 'zhang@example.com' }
}

type User2 = ReturnType<typeof getUser>
// { id: number; name: string; email: string }

// 实际场景：从 API 函数推导响应类型
async function fetchConfig() {
  return {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3
  }
}

type Config2 = Awaited<ReturnType<typeof fetchConfig>>
// { apiUrl: string; timeout: number; retries: number }
```

## Parameters\<T\>

获取函数类型 `T` 的参数类型组成的元组。

```typescript
function createUser(name: string, age: number, email: string) {
  return { name, age, email }
}

type CreateUserParams = Parameters<typeof createUser>
// [name: string, age: number, email: string]

// 实际场景：包装函数时保留参数类型
function withLogging<F extends (...args: any[]) => any>(fn: F) {
  return (...args: Parameters<F>): ReturnType<F> => {
    console.log('调用参数:', args)
    return fn(...args)
  }
}

const loggedCreateUser = withLogging(createUser)
```

## 其他常用工具类型

```typescript
// NonNullable<T> — 排除 null 和 undefined
type Nullable = string | null | undefined
type Definite = NonNullable<Nullable>  // string

// Awaited<T> — 获取 Promise 解包后的类型
type AsyncResult = Awaited<Promise<Promise<string>>>  // string

// Uppercase<S> / Lowercase<S> — 字符串字面量大小写转换（仅限模板字面量类型）
type Greeting = Uppercase<'hello'>  // 'HELLO'

// ReadonlyArray<T> — 只读数组
const arr: ReadonlyArray<number> = [1, 2, 3]
// arr.push(4)  // Error: Property 'push' does not exist on type 'readonly number[]'
```

## 自定义工具类型

```typescript
// 深度 Partial
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

interface Config3 {
  server: {
    host: string
    port: number
    ssl: {
      cert: string
      key: string
    }
  }
}

type PartialConfig = DeepPartial<Config3>
// server?.ssl?.cert 都变成可选

// 深度 Readonly
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

// 可空类型
type Nullable2<T> = T | null

// 可选且可空
type OptionalNullable<T> = {
  [K in keyof T]?: T[K] | null
}
```

## 注意事项

- 工具类型只在编译时生效，不会影响运行时行为。
- `Partial` 是浅层的，只将第一层属性变为可选。嵌套对象内部的属性仍然是必选的。需要深层可选时使用 `DeepPartial`。
- `Pick` 和 `Omit` 是互补操作：`Pick` 选取属性，`Omit` 排除属性。
- `Exclude` 和 `Extract` 也是互补操作：`Exclude` 排除类型，`Extract` 提取类型。
- `ReturnType` 不能用于重载函数，此时需要手动指定返回类型。
