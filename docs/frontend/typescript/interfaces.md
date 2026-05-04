# 接口

## 定义对象形状

`interface` 用于定义对象的结构（shape），描述对象应该包含哪些属性以及属性的类型。它是 TypeScript 中描述对象类型的首选方式。

```typescript
interface User {
  id: number
  name: string
  email: string
}

const user: User = {
  id: 1,
  name: '张三',
  email: 'zhangsan@example.com'
}

// 缺少属性会报错
// const bad: User = { id: 1, name: '张三' }  // Error: 缺少 email

// 多余属性也会报错
// const bad2: User = { id: 1, name: '张三', email: 'x', phone: '123' }  // Error
```

## 可选属性

使用 `?` 标记可选属性，该属性可以存在也可以不存在。

```typescript
interface UserProfile {
  id: number
  name: string
  avatar?: string      // 可选：用户可能没有头像
  bio?: string         // 可选：个人简介
}

const user1: UserProfile = { id: 1, name: '张三' }               // 正确
const user2: UserProfile = { id: 2, name: '李四', avatar: '/pic.jpg' }  // 正确

// 实际场景：表单字段配置
interface FormField {
  name: string
  label: string
  type: 'text' | 'number' | 'email' | 'password'
  required: boolean
  placeholder?: string
  defaultValue?: string | number
  validator?: (value: any) => boolean
}
```

## 只读属性

使用 `readonly` 标记只读属性，该属性只能在对象创建时赋值，之后不能修改。

```typescript
interface Config {
  readonly apiUrl: string
  readonly version: string
  debug: boolean  // 非只读，可以修改
}

const config: Config = {
  apiUrl: 'https://api.example.com',
  version: '1.0.0',
  debug: false
}

// config.apiUrl = 'other'  // Error: Cannot assign to 'apiUrl' because it is a read-only property
config.debug = true  // 正确

// 实际场景：数据库实体的 id 字段
interface Entity {
  readonly id: string
  createdAt: Date
  updatedAt: Date
}
```

## 扩展接口

使用 `extends` 关键字让一个接口继承另一个接口的属性，实现类型的复用和组合。

```typescript
interface Animal {
  name: string
  age: number
}

interface Dog extends Animal {
  breed: string
  isGoodBoy: boolean
}

const myDog: Dog = {
  name: '旺财',
  age: 3,
  breed: '金毛',
  isGoodBoy: true
}

// 多重继承
interface Timestamped {
  createdAt: Date
  updatedAt: Date
}

interface SoftDeletable {
  deletedAt: Date | null
  isDeleted: boolean
}

interface Post extends Timestamped, SoftDeletable {
  id: number
  title: string
  content: string
}

// 实际场景：API 响应分层
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>

// 使用
type UserListResponse = PaginatedResponse<User>
```

## 函数类型接口

接口可以描述函数的签名，包括参数类型和返回值类型。

```typescript
// 定义函数接口
interface MathOperation {
  (a: number, b: number): number
}

const add: MathOperation = (a, b) => a + b
const multiply: MathOperation = (a, b) => a * b

// 实际场景：事件处理器
interface EventHandler<T = void> {
  (event: T): void
}

const onClick: EventHandler<MouseEvent> = (event) => {
  console.log(`点击位置：(${event.clientX}, ${event.clientY})`)
}

const onSubmit: EventHandler<FormData> = (formData) => {
  console.log('提交表单', formData)
}

// 实际场景：中间件模式
interface Middleware {
  (context: any, next: () => Promise<void>): Promise<void>
}

const logger: Middleware = async (ctx, next) => {
  console.log(`[请求] ${ctx.method} ${ctx.url}`)
  await next()
  console.log(`[响应] ${ctx.status}`)
}
```

## 索引签名

索引签名用于描述对象的动态属性，当属性名在编译时不确定时使用。

```typescript
// 字符串索引签名
interface StringMap {
  [key: string]: string
}

const headers: StringMap = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token123'
}

// 数字索引签名（常用于类数组）
interface NumberArray {
  [index: number]: string
}

const colors: NumberArray = ['red', 'green', 'blue']

// 实际场景：配置字典
interface AppConfig {
  [key: string]: string | number | boolean
}

const env: AppConfig = {
  PORT: 3000,
  HOST: 'localhost',
  DEBUG: true
}

// 实际场景：本地化翻译
interface Translations {
  [key: string]: string
}

const zhCN: Translations = {
  greeting: '你好',
  farewell: '再见',
  confirm: '确认',
  cancel: '取消'
}

function t(key: string): string {
  return zhCN[key] ?? key
}
```

### 索引签名与已知属性混合

```typescript
interface Cache {
  [key: string]: string | number  // 索引签名
  hitCount: number                // 已知属性必须兼容索引签名类型
  lastAccess: string              // 必须是 string | number 的子类型
}

// Error: boolean 不兼容 string | number
// interface Bad {
//   [key: string]: string | number
//   disabled: boolean  // Error
// }
```

## 接口合并

同名接口会自动合并，常用于扩展第三方库的类型定义。

```typescript
interface Window {
  myApp: {
    version: string
  }
}

// 此时 Window 类型同时包含浏览器内置属性和 myApp
window.myApp = { version: '1.0.0' }

// 实际场景：给第三方库添加类型
declare module 'express' {
  interface Request {
    user?: {
      id: number
      role: string
    }
  }
}
```

## 注意事项

- 接口与类型别名的主要区别：接口可以被 `extends` 扩展和自动合并（declaration merging），类型别名不可以重复声明同名类型。
- 函数类型接口的语法与类型别名不同，但功能一致。推荐用类型别名定义函数类型：`type Fn = (x: number) => string`。
- 索引签名会强制所有属性都兼容索引类型。如果需要混合不同类型的属性，考虑使用联合类型或交叉类型。
- 接口只存在于编译时，不会生成任何运行时代码。
