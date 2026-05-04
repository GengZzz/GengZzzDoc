# 最佳实践

## 何时用 any vs unknown

### 优先使用 unknown

`unknown` 是类型安全的 `any`。它要求使用前必须进行类型检查，从而避免运行时类型错误。

```typescript
// 不好：any 绕过了所有类型检查
function processAny(data: any) {
  data.nonExistent.method()  // 不报错，运行时崩溃
}

// 好：unknown 强制类型检查
function processUnknown(data: unknown) {
  if (typeof data === 'object' && data !== null && 'method' in data) {
    // 安全使用
  }
}
```

### any 的合理使用场景

```typescript
// 1. 与无类型的第三方库交互（过渡期）
declare const legacyLib: any
const result = legacyLib.doSomething()

// 2. JSON 解析（需要尽快转为具体类型）
const parsed: unknown = JSON.parse(rawString)
// 不要用 any，用 unknown + 验证

// 3. 测试中的 mock
const mock = { method: () => 'test' } as any
```

### never 的正确使用

```typescript
// 穷尽检查：确保所有分支都被处理
type Status = 'active' | 'inactive' | 'deleted'

function getColor(status: Status): string {
  switch (status) {
    case 'active': return 'green'
    case 'inactive': return 'gray'
    case 'deleted': return 'red'
    default:
      const _exhaustive: never = status
      return _exhaustive
  }
}

// 如果 Status 新增了 'pending'，上面的代码会在编译时报错
```

## 类型体操的边界

类型体操是指利用 TypeScript 类型系统进行复杂的类型运算。它很强大，但也有边界。

### 适度使用

```typescript
// 过度设计：递归类型 + 条件类型 + 模板字面量
// 能编译，但没人能维护
type DeepPath<T, P extends string = ''> = T extends object
  ? { [K in keyof T & string]: `${P}${K}` | DeepPath<T[K], `${P}${K}.`> }[keyof T & string]
  : P

// 简单实用的方案：用 IDE 提示代替复杂类型
type UserPaths = 'name' | 'email' | 'address.city' | 'address.zip'
```

### 明确边界

```typescript
// 1. 编译时间：复杂类型可能导致 IDE 卡顿
// 如果一个泛型推导超过 3 秒，考虑简化

// 2. 可读性：类型定义不应超过 10 行
// 超过时拆分为多个 type

// 3. 运行时价值：类型擦除后不存在
// 不要为了让类型系统满意而改变运行时逻辑
```

### 合理的类型工具

```typescript
// 好：简单实用的工具类型
type Nullable<T> = T | null
type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: Error | null
}

// 不好：过于复杂的类型运算
// 除非是库开发，否则避免 5 层以上的泛型嵌套
```

## Vue 中的 TS 写法

### 组合式 API（推荐）

```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ref 自动推导类型
const count = ref(0)             // Ref<number>
const name = ref('')             // Ref<string>

// 显式指定 ref 类型
const inputEl = ref<HTMLInputElement | null>(null)

// computed 自动推导
const doubleCount = computed(() => count.value * 2)

// 自定义类型
interface User {
  id: number
  name: string
  email: string
}

// Props 类型定义
interface Props {
  title: string
  count?: number
  user?: User
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  user: undefined
})

// Emits 类型定义
interface Emits {
  (e: 'update', value: string): void
  (e: 'submit', data: User): void
}

const emit = defineEmits<Emits>()

// 组件方法
function handleSubmit() {
  emit('submit', { id: 1, name: props.title, email: '' })
}

// 实际场景：API 请求封装
const users = ref<User[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchUsers() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/users')
    users.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '未知错误'
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)
</script>
```

### 组件 props 最佳实践

```typescript
// 使用 interface 定义 props（优于 type）
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false
})

// 暴露给父组件的方法
defineExpose({
  focus: () => inputEl.value?.focus(),
  clear: () => { /* ... */ }
})
```

## React 中的 TS 写法

### 函数组件

```typescript
import { useState, useEffect, useCallback } from 'react'

// Props 类型
interface UserCardProps {
  user: {
    id: number
    name: string
    email: string
  }
  onSelect: (id: number) => void
  className?: string
  children?: React.ReactNode
}

// 函数组件：使用 React.FC 或直接注解
function UserCard({ user, onSelect, className, children }: UserCardProps) {
  return (
    <div className={className} onClick={() => onSelect(user.id)}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {children}
    </div>
  )
}

// 实际场景：带泛型的组件
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string | number
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  )
}

// 使用
function App() {
  const users: UserCardProps['user'][] = [
    { id: 1, name: '张三', email: 'zhang@example.com' }
  ]

  return (
    <List
      items={users}
      keyExtractor={(u) => u.id}
      renderItem={(user) => (
        <UserCard user={user} onSelect={(id) => console.log(id)} />
      )}
    />
  )
}
```

### Hooks 类型

```typescript
// useState 自动推导
const [count, setCount] = useState(0)  // [number, Dispatch<SetStateAction<number>>]

// useState 显式类型（可能有多种类型时）
const [data, setData] = useState<string | null>(null)

// useReducer 类型
interface State {
  count: number
  step: number
}

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'setStep'; payload: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + state.step }
    case 'decrement': return { ...state, count: state.count - state.step }
    case 'setStep': return { ...state, step: action.payload }
  }
}

// useRef 类型
const inputRef = useRef<HTMLInputElement>(null)

// 自定义 Hook 的返回类型
function useToggle(initial = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue(v => !v), [])
  return [value, toggle, setValue]
}
```

## 通用编码规范

### 类型定义

```typescript
// 1. 优先使用 interface 定义对象形状
interface User {
  id: number
  name: string
}

// 2. 使用 type 定义联合类型、工具类型
type Status = 'active' | 'inactive'
type Nullable<T> = T | null

// 3. 使用 PascalCase 命名类型
type UserProfile = User & { bio: string }

// 4. 泛型参数命名约定
// T - Type, K - Key, V - Value, E - Element, R - Return
function first<T>(arr: T[]): T | undefined { return arr[0] }
```

### 函数与参数

```typescript
// 1. 避免可选参数 + 默认值同时使用
function bad(x?: number = 10) {}  // 不要这样
function good(x: number = 10) {}  // 正确

// 2. 返回值类型应在复杂函数中显式标注
function complex(data: Input): Output { /* ... */ }

// 3. 简单函数可以省略返回值类型
const double = (x: number) => x * 2  // TS 自动推导 number

// 4. 使用 readonly 保护不修改的参数
function sum(numbers: readonly number[]): number {
  // numbers.push(1)  // Error
  return numbers.reduce((a, b) => a + b, 0)
}
```

### 错误处理

```typescript
// 1. 使用 unknown 而非 Error 捕获异常
try {
  await riskyOperation()
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error('未知错误:', err)
  }
}

// 2. Result 模式替代异常
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

function parseJSON<T>(input: string): Result<T> {
  try {
    return { ok: true, value: JSON.parse(input) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) }
  }
}
```

### 类型安全的数据处理

```typescript
// 1. API 响应验证
function validateResponse(data: unknown): data is ApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    'data' in data
  )
}

// 2. 避免双重断言，使用类型守卫
// 不好
const data = raw as unknown as User

// 好
if (isValidUser(raw)) {
  const data = raw  // data: ValidUser
}

// 3. 配置对象使用 satisfies（TypeScript 4.9+）
const routes = {
  home: '/',
  about: '/about',
  user: '/users/:id'
} satisfies Record<string, string>
// routes.user 仍然是 '/users/:id'（字面量类型），而不是 string
```

## 注意事项

- `any` 是逃生舱，不是常态。每次使用 `any` 时，考虑是否有更安全的替代方案。
- 类型体操在库开发中很有价值，但在业务代码中应以可读性为先。
- Vue 3 的 `<script setup lang="ts">` 是推荐的写法，它提供了最佳的类型推导支持。
- React 中使用 TypeScript 时，Props 接口应显式声明 `children`（React 18 不再自动包含）。
- TypeScript 的类型系统是结构性的（structural typing），而非名义性的（nominal typing）。两个结构相同的类型是兼容的，即使它们的名称不同。
