# 类型守卫与收窄

## typeof 守卫

`typeof` 操作符在运行时检查原始类型，TypeScript 自动在条件分支中收窄类型。

```typescript
function formatValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value.trim()            // value: string
  }
  if (typeof value === 'number') {
    return value.toFixed(2)        // value: number
  }
  return value ? '是' : '否'      // value: boolean
}

// 实际场景：表单序列化
function serialize(field: { name: string; value: string | number | boolean }): string {
  const { name, value } = field
  if (typeof value === 'string') {
    return `${name}=${encodeURIComponent(value)}`
  }
  if (typeof value === 'number') {
    return `${name}=${value}`
  }
  return `${name}=${value ? '1' : '0'}`
}

// typeof 能识别的类型："string" | "number" | "boolean" | "symbol" | "bigint" | "undefined" | "object" | "function"
// 注意：typeof null === 'object'（JavaScript 历史遗留问题）
```

## instanceof 守卫

`instanceof` 检查对象是否是某个类的实例，自动收窄为该类的类型。

```typescript
class ApiError {
  constructor(public message: string, public statusCode: number) {}
}

class NetworkError {
  constructor(public message: string, public retryable: boolean) {}
}

function handleError(error: ApiError | NetworkError): string {
  if (error instanceof ApiError) {
    return `API 错误 ${error.statusCode}: ${error.message}`  // error: ApiError
  }
  return `网络错误: ${error.message}（${error.retryable ? '可重试' : '不可重试'）`
  // error: NetworkError
}

// 实际场景：数据处理
function processData(data: Date | string | number): number {
  if (data instanceof Date) {
    return data.getTime()          // data: Date
  }
  if (typeof data === 'string') {
    return new Date(data).getTime() // data: string
  }
  return data                      // data: number
}
```

## in 守卫

`in` 操作符检查对象是否拥有某个属性，常用于区分不同结构的对象。

```typescript
type Admin = { role: 'admin'; permissions: string[]; canDelete: boolean }
type User = { role: 'user'; email: string; lastLogin: Date }

function getDisplayName(account: Admin | User): string {
  if ('permissions' in account) {
    return `管理员（${account.permissions.length} 个权限）`  // account: Admin
  }
  return `用户（${account.email}）`                          // account: User
}

// 实际场景：处理多种 API 响应格式
type SuccessResponse = { status: 'success'; data: unknown }
type ErrorResponse = { status: 'error'; error: { code: number; message: string } }
type LoadingResponse = { status: 'loading'; progress: number }

function handleResponse(res: SuccessResponse | ErrorResponse | LoadingResponse) {
  if ('error' in res) {
    console.error(`错误 ${res.error.code}: ${res.error.message}`)
  } else if ('progress' in res) {
    console.log(`加载中：${res.progress}%`)
  } else {
    console.log('成功：', res.data)
  }
}
```

## 自定义类型守卫

自定义类型守卫通过返回 `value is Type` 的函数实现，封装复杂的类型检查逻辑。

```typescript
interface Cat {
  meow(): void
  purr(): void
}

interface Dog {
  bark(): void
  wag(): void
}

// 自定义类型守卫函数
function isCat(animal: Cat | Dog): animal is Cat {
  return 'meow' in animal
}

function handleAnimal(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow()   // animal: Cat
    animal.purr()
  } else {
    animal.bark()   // animal: Dog
    animal.wag()
  }
}

// 实际场景：验证 API 响应数据
interface ValidUser {
  id: number
  name: string
  email: string
}

function isValidUser(data: unknown): data is ValidUser {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    'email' in data &&
    typeof (data as any).id === 'number' &&
    typeof (data as any).name === 'string' &&
    typeof (data as any).email === 'string'
  )
}

async function fetchUser(id: number): Promise<ValidUser | null> {
  const res = await fetch(`/api/users/${id}`)
  const data: unknown = await res.json()

  if (isValidUser(data)) {
    return data  // data: ValidUser，可以安全访问 .name .email
  }
  console.error('无效的用户数据')
  return null
}

// 实际场景：检查非空值
function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

const items: (string | null)[] = ['hello', null, 'world', null, 'ts']
const validItems = items.filter(isNotNull)  // string[]
```

## 判别联合

判别联合（Discriminated Unions）通过一个公共的字面量属性（判别属性）区分不同的类型分支。

```typescript
// 定义判别联合类型
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number }

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2       // shape: { kind: 'circle'; radius: number }
    case 'rectangle':
      return shape.width * shape.height         // shape: { kind: 'rectangle'; ... }
    case 'triangle':
      return (shape.base * shape.height) / 2    // shape: { kind: 'triangle'; ... }
  }
}

// 实际场景：Redux 风格的 Action
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' }
  | { type: 'SET'; payload: number }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT': return state + action.payload
    case 'DECREMENT': return state - action.payload
    case 'RESET': return 0
    case 'SET': return action.payload
  }
}

// 实际场景：表单验证结果
type ValidationResult =
  | { valid: true; value: string }
  | { valid: false; errors: string[] }

function processResult(result: ValidationResult) {
  if (result.valid) {
    console.log('有效值:', result.value)        // result.value 可用
  } else {
    console.error('验证失败:', result.errors)    // result.errors 可用
  }
}
```

## 穷尽检查

穷尽检查（Exhaustiveness Checking）使用 `never` 类型确保所有可能的情况都被处理。当新增分支但忘记处理时，编译器会报错。

```typescript
// assertNever 辅助函数
function assertNever(value: never): never {
  throw new Error(`意外的值：${JSON.stringify(value)}`)
}

type TrafficLight = 'red' | 'yellow' | 'green'

function getAction(light: TrafficLight): string {
  switch (light) {
    case 'red': return '停车'
    case 'yellow': return '注意'
    case 'green': return '通行'
    default:
      // 如果新增了 'flashing' 但没处理，这里会编译报错
      return assertNever(light)
  }
}

// 实际场景：完整的状态机
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'

function getStatusMessage(status: OrderStatus): string {
  switch (status) {
    case 'pending': return '等待支付'
    case 'paid': return '已支付，待发货'
    case 'shipped': return '已发货'
    case 'delivered': return '已签收'
    case 'cancelled': return '已取消'
    default:
      return assertNever(status)
  }
}

// 实际场景：联合类型的 map 处理
const statusColors: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  paid: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444'
}

// 如果 OrderStatus 新增了值但 statusColors 没更新，这里会报错
```

## 多重守卫组合

在复杂场景中，可能需要组合多种类型守卫。

```typescript
interface ApiResponse<T> {
  status: number
  data: T | null
  error?: { code: string; message: string }
}

// 组合守卫：检查响应是否成功
function isSuccess<T>(res: ApiResponse<T>): res is ApiResponse<T> & { data: T } {
  return res.status >= 200 && res.status < 300 && res.data !== null
}

// 组合守卫：检查是否有错误
function hasError<T>(res: ApiResponse<T>): res is ApiResponse<T> & { error: { code: string; message: string } } {
  return res.error !== undefined
}

function handleApiResponse<T>(res: ApiResponse<T>) {
  if (isSuccess(res)) {
    console.log('数据:', res.data)      // res.data: T（非 null）
  } else if (hasError(res)) {
    console.error('错误:', res.error)    // res.error 已确认存在
  } else {
    console.warn('未知状态')
  }
}
```

## 注意事项

- `typeof` 只能检查原始类型，不能区分接口、类等对象类型。`typeof {} === 'object'` 对所有对象都为 true。
- `typeof null === 'object'` 是 JavaScript 的历史 Bug，处理可能为 null 的值时应先检查 `value !== null`。
- 自定义类型守卫的返回值类型（`value is Type`）是开发者保证的，TypeScript 不会验证守卫函数的逻辑是否正确。如果守卫函数有 bug，可能导致运行时类型错误。
- 判别联合的判别属性必须是字面量类型（如 `'circle'`），不能是宽泛的 `string`。
- 穷尽检查需要在 `tsconfig.json` 中启用 `strictNullChecks`，否则 `never` 类型的行为会不一致。
