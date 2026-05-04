# 类型别名

## type 关键字

类型别名使用 `type` 关键字为任何类型创建一个新名称。它可以为原始类型、联合类型、交叉类型、元组等创建别名。

```typescript
// 基本类型别名
type ID = number | string
type Username = string

// 函数类型别名
type Formatter = (value: string) => string

const uppercase: Formatter = (v) => v.toUpperCase()

// 实际场景：API 类型定义
type ApiStatus = 'idle' | 'loading' | 'success' | 'error'

interface ApiState<T> {
  status: ApiStatus
  data: T | null
  error: string | null
}
```

## type vs interface 的区别

| 特性 | type | interface |
| --- | --- | --- |
| 定义对象形状 | 可以 | 可以 |
| 定义联合类型 | 可以 | 不可以 |
| 定义交叉类型 | 可以 | 不可以（用 extends） |
| 定义元组 | 可以 | 不可以 |
| 定义映射类型 | 可以 | 不可以 |
| 声明合并 | 不可以 | 可以 |
| extends | 不支持（用交叉类型） | 支持 |
| implements | 类可以 implements type（5.0+） | 支持 |

```typescript
// type 能做但 interface 做不到的

// 1. 联合类型
type Result<T> = { success: true; data: T } | { success: false; error: string }

// 2. 元组
type Coordinate = [number, number]

// 3. 映射类型
type Readonly2<T> = { readonly [K in keyof T]: T[K] }

// interface 能做但 type 做不到的

// 4. 声明合并
interface Window {
  myLib: any
}
interface Window {
  anotherLib: any
}
// Window 现在同时有 myLib 和 anotherLib

// 实际场景的选择建议
// 对象形状用 interface（可扩展）
interface User {
  id: number
  name: string
}

// 联合类型、工具类型用 type
type Nullable<T> = T | null
type UserOrGuest = User | { guest: true }
```

## 交叉类型

交叉类型使用 `&` 将多个类型合并为一个类型，新类型包含所有类型的属性。

```typescript
type HasName = { name: string }
type HasAge = { age: number }
type HasEmail = { email: string }

// 合并为一个完整类型
type Person = HasName & HasAge & HasEmail

const person: Person = {
  name: '张三',
  age: 25,
  email: 'zhangsan@example.com'
}

// 实际场景：混入（Mixin）模式
type Timestamps = {
  createdAt: Date
  updatedAt: Date
}

type SoftDelete = {
  deletedAt: Date | null
  isDeleted: boolean
}

type BaseEntity = {
  id: string
}

// 组合出完整的实体类型
type UserEntity = BaseEntity & Timestamps & SoftDelete & {
  name: string
  email: string
}

// 实际场景：工具类型实现
type WithLoading<T> = T & { isLoading: boolean }
type WithError<T> = T & { error: string | null }

type AsyncData<T> = WithLoading<WithError<T>>
// 结果：T & { isLoading: boolean } & { error: string | null }
```

### 交叉类型的属性冲突

```typescript
type A = { id: string }
type B = { id: number }

// 属性类型冲突时，结果为 never
type C = A & B
const c: C = { id: '???' }  // Error: 类型 'string' 不能赋值给类型 'string & number'

// 解决方案：使用不同属性名
type A2 = { stringId: string }
type B2 = { numberId: number }
type C2 = A2 & B2  // { stringId: string; numberId: number }
```

## 类型守卫

类型守卫是一种在运行时检查类型的方式，让 TypeScript 在代码分支中自动收窄类型。

### typeof 检查

```typescript
function formatValue(value: string | number): string {
  if (typeof value === 'string') {
    return value.trim()  // 这里 value 被收窄为 string
  }
  return value.toFixed(2)  // 这里 value 被收窄为 number
}

// 实际场景：处理表单值
function processFormField(value: string | number | boolean) {
  switch (typeof value) {
    case 'string':
      return value.trim()
    case 'number':
      return value.toString()
    case 'boolean':
      return value ? '是' : '否'
  }
}
```

### instanceof 检查

```typescript
function formatDate(input: Date | string): string {
  if (input instanceof Date) {
    return input.toISOString()  // 收窄为 Date
  }
  return new Date(input).toISOString()  // 收窄为 string
}

// 实际场景：错误处理
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url)
    } catch (err) {
      if (err instanceof TypeError) {
        // 网络错误，重试
        continue
      }
      throw err  // 其他错误，直接抛出
    }
  }
  throw new Error('重试次数耗尽')
}
```

### in 检查

```typescript
type Admin = { role: 'admin'; permissions: string[] }
type Guest = { role: 'guest'; visitCount: number }

function canDelete(user: Admin | Guest): boolean {
  if ('permissions' in user) {
    return user.permissions.includes('delete')  // 收窄为 Admin
  }
  return false  // Guest 没有权限
}

// 实际场景：处理不同类型的 API 响应
type SuccessResponse = { success: true; data: unknown }
type ErrorResponse = { success: false; error: { code: number; message: string } }

function handleResponse(res: SuccessResponse | ErrorResponse) {
  if ('error' in res) {
    console.error(`错误 ${res.error.code}: ${res.error.message}`)
  } else {
    console.log('成功:', res.data)
  }
}
```

## 注意事项

- `type` 和 `interface` 的选择：描述对象形状优先用 `interface`（可扩展、声明合并），需要联合类型、交叉类型、元组、映射类型时用 `type`。
- 交叉类型合并同名属性时，如果类型不兼容，结果为 `never`。
- `typeof` 只能检查原始类型（`string`、`number`、`boolean`、`symbol`、`bigint`、`undefined`、`function`、`object`），不能区分具体的接口或类。
- 在大型项目中，类型守卫函数（user-defined type guard）可以封装复杂的类型检查逻辑，参见[类型守卫与收窄](./type-guard-narrowing)章节。
