---
title: "高级类型"
description: "条件类型根据类型关系动态选择类型，语法为 T extends U ? X : Y。它是 TypeScript 类型编程的基础。"
---

# 高级类型

## 条件类型

条件类型根据类型关系动态选择类型，语法为 `T extends U ? X : Y`。它是 TypeScript 类型编程的基础。

```typescript
// 基本条件类型
type IsArray<T> = T extends any[] ? true : false

type A = IsArray<string[]>   // true
type B = IsArray<number>     // false

// 实际场景：API 响应处理
type ApiResult<T> = T extends { error: string }
  ? { success: false; error: string }
  : { success: true; data: T }

type UserResult = ApiResult<{ id: number; name: string }>
// { success: true; data: { id: number; name: string } }

type ErrorResult = ApiResult<{ error: string }>
// { success: false; error: string }

// 实际场景：函数参数适配
type FnOrValue<T> = T extends (...args: any[]) => infer R ? R : T

type R1 = FnOrValue<() => string>  // string
type R2 = FnOrValue<number>        // number
```

## infer 关键字

`infer` 只能在条件类型的 `extends` 子句中使用，用于从类型中推断（提取）某一部分。

```typescript
// 从函数类型中推断返回值
type ReturnType2<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => { id: number; name: string }
type Result = ReturnType2<Fn>  // { id: number; name: string }

// 从函数类型中推断参数
type Parameters2<T> = T extends (...args: infer P) => any ? P : never

type Params = Parameters2<(a: string, b: number) => void>
// [a: string, b: number]

// 从 Promise 中推断内部类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type U1 = UnwrapPromise<Promise<string>>  // string
type U2 = UnwrapPromise<number>           // number

// 从数组中推断元素类型
type Element<T> = T extends (infer E)[] ? E : never

type E1 = Element<string[]>           // string
type E2 = Element<[string, number]>   // string | number

// 实际场景：推断对象属性值类型
type ValueType<T, K extends keyof T> = T extends Record<K, infer V> ? V : never

const config = { port: 3000, host: 'localhost', debug: true }
type PortType = ValueType<typeof config, 'port'>  // number

// 实际场景：推断嵌套 Promise
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T

type DU = DeepUnwrap<Promise<Promise<Promise<string>>>>  // string
```

## 映射类型

映射类型基于旧类型创建新类型，遍历联合类型的每个成员，对每个属性进行变换。

```typescript
// 基本映射类型
type Readonly2<T> = {
  readonly [K in keyof T]: T[K]
}

type Optional<T> = {
  [K in keyof T]?: T[K]
}

interface User {
  id: number
  name: string
  email: string
}

type ReadonlyUser = Readonly2<User>
// { readonly id: number; readonly name: string; readonly email: string }

// 使用 as 重新映射键名
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}

type UserGetters = Getters<User>
// { getId: () => number; getName: () => string; getEmail: () => string }

// 过滤特定类型的属性
type StringProps<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K]
}

type UserStrings = StringProps<User>
// { name: string; email: string }

// 实际场景：事件处理器映射
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}`]?: (value: T[K]) => void
}

interface FormData {
  username: string
  age: number
  agree: boolean
}

type FormHandlers = EventHandlers<FormData>
// { onUsername?: (value: string) => void; onAge?: (value: number) => void; onAgree?: (value: boolean) => void }
```

## 模板字面量类型

模板字面量类型基于字符串字面量类型，通过拼接生成新的字符串字面量类型。

```typescript
// 基本拼接
type EventName = `${'click' | 'focus' | 'blur'}Event`
// 'clickEvent' | 'focusEvent' | 'blurEvent'

// 组合多个部分
type CSSUnit = 'px' | 'em' | 'rem' | '%'
type CSSValue = `${number}${CSSUnit}`
// `${number}px` | `${number}em` | `${number}rem` | `${number}%`

// 实际场景：API 路由类型
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ApiRoute = `/${string}`

type FullRoute = `${HTTPMethod} ${ApiRoute}`
// 'GET /${string}' | 'POST /${string}' | ...

// 实际场景：CSS 类名生成
type Size = 'sm' | 'md' | 'lg'
type Color = 'primary' | 'secondary' | 'danger'
type ButtonClass = `btn-${Size}-${Color}`
// 'btn-sm-primary' | 'btn-sm-secondary' | 'btn-sm-danger' | 'btn-md-primary' | ...

// 实际场景：数据库列名（snake_case 转换）
type SnakeCase<S extends string> = S extends `${infer H}${infer T}`
  ? T extends Uncapitalize<T>
    ? `${Lowercase<H>}${SnakeCase<T>}`
    : `${Lowercase<H>}_${SnakeCase<T>}`
  : S

type Column = SnakeCase<'createdAt'>
// 'created_at'
```

## 递归类型

递归类型是引用自身的类型，常用于处理嵌套数据结构。

```typescript
// 递归深度 Partial
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

interface Config {
  server: {
    host: string
    port: number
    ssl: {
      cert: string
      key: string
    }
  }
  database: {
    url: string
    pool: {
      min: number
      max: number
    }
  }
}

// 任意层级的属性都可以省略
const partialConfig: DeepPartial<Config> = {
  server: {
    ssl: {
      cert: '/path/to/cert'
    }
  }
}

// 递归深度 Readonly
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

// 实际场景：树形结构
interface TreeNode {
  id: string
  name: string
  children?: TreeNode[]
}

// 递归查找节点类型
type LeafNodes<T> = T extends { children: infer C }
  ? C extends any[]
    ? LeafNodes<C[number]>
    : T
  : T

// 实际场景：深拷贝类型
type DeepClone<T> = T extends Date
  ? Date
  : T extends RegExp
    ? RegExp
    : T extends any[]
      ? DeepClone<T[number]>[]
      : T extends object
        ? { [K in keyof T]: DeepClone<T[K]> }
        : T

// 递归 JSON 值类型
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

// 实际场景：嵌套路径
type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${Prefix}${K}` | NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
    }[keyof T & string]
  : never

type UserPaths = NestedKeyOf<Config>
// 'server' | 'server.host' | 'server.port' | 'server.ssl' | 'server.ssl.cert' | ...
```

## 注意事项

- 条件类型中的分布式行为：当 `T` 是联合类型时，`T extends U ? X : Y` 会对每个成员分别求值。用 `[T] extends [U]` 包裹可阻止分布式行为。
- `infer` 只能在条件类型的 `extends` 子句中使用，不能在其他位置使用。
- 递归类型有深度限制（TypeScript 默认约 50 层），过深的递归会导致编译器栈溢出。
- 模板字面量类型可以配合内置工具类型 `Uppercase`、`Lowercase`、`Capitalize`、`Uncapitalize` 使用。
- 映射类型中的 `as` 子句（键名重映射）在 TypeScript 4.1+ 中可用，用于过滤或转换键名。
