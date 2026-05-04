# 模块与命名空间

## import / export

TypeScript 使用 ES Module 语法进行模块化，与 JavaScript 完全一致。

```typescript
// math.ts — 具名导出
export function add(a: number, b: number): number {
  return a + b
}

export function subtract(a: number, b: number): number {
  return a - b
}

export const PI = 3.14159265

export interface Point {
  x: number
  y: number
}

// 默认导出
export default class Calculator {
  add(a: number, b: number) { return a + b }
}
```

```typescript
// app.ts — 导入
import Calculator from './math'                    // 默认导入
import { add, subtract, PI } from './math'         // 具名导入
import { add as plus } from './math'               // 重命名导入
import * as MathUtils from './math'                // 命名空间导入

console.log(add(1, 2))           // 3
console.log(MathUtils.PI)        // 3.14159265
```

## 类型导入

TypeScript 允许单独导入类型，编译器会将其从最终的 JavaScript 输出中移除。

```typescript
import type { User, UserRole } from './types'     // 只导入类型
import { type User, createUser } from './api'      // 混合导入：createUser 是值，User 是类型
import { type } from './api'                        // 整个模块仅类型导入

// 实际场景：API 层与类型分离
// types/user.ts
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

// api/user.ts
import type { User } from '../types/user'

export async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
}

export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  return res.json()
}
```

### 类型导入的优势

```typescript
// 使用 import type 后，编译器知道这里只有类型
import type { Config } from './config'

// 某些打包工具（如 esbuild、Rollup）会移除 type-only 导入
// 避免循环依赖问题
// 确保不会意外将类型当作值使用
```

## 动态导入

使用 `import()` 在运行时按需加载模块，常用于代码分割和懒加载。

```typescript
// 按需加载模块
async function loadChart() {
  const { Chart } = await import('./chart-library')
  return new Chart('#container')
}

// 实际场景：路由懒加载
const routes = {
  '/': () => import('./pages/Home'),
  '/about': () => import('./pages/About'),
  '/dashboard': () => import('./pages/Dashboard'),
}

async function navigate(path: string) {
  const loader = routes[path as keyof typeof routes]
  if (loader) {
    const module = await loader()
    module.default.render()
  }
}

// 实际场景：条件加载 polyfill
async function ensureIntersectionObserver() {
  if (!('IntersectionObserver' in window)) {
    await import('intersection-observer')
  }
  return window.IntersectionObserver
}

// 实际场景：按语言加载翻译文件
async function loadLocale(locale: string) {
  const translations = await import(`./locales/${locale}.json`)
  return translations.default
}
```

## 重新导出

使用 `export *` 或 `export { ... } from` 将一个模块的内容重新导出，常用于构建 barrel 文件。

```typescript
// index.ts — barrel 文件
export { add, subtract, PI } from './math'
export type { Point } from './math'
export { default as Calculator } from './math'
export { fetchUser, createUser } from './api/user'
export type { User, UserRole } from './types/user'

// 使用时只需从一个入口导入
import { add, fetchUser, type User } from './index'
```

## 模块解析策略

TypeScript 如何查找导入的模块由 `moduleResolution` 配置决定。

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"    // 推荐：配合 Vite、esbuild 等打包工具
  }
}
```

常用策略：

| 策略 | 适用场景 |
| --- | --- |
| `node` | Node.js 项目，经典 node_modules 查找 |
| `node16` / `nodenext` | Node.js ESM 项目 |
| `bundler` | Vite、esbuild、Webpack 等打包工具项目 |
| `classic` | 已过时，不推荐 |

## 命名空间

命名空间（namespace）是 TypeScript 特有的模块化方式，将相关的类型和值组织在一个命名空间内。在 ES Module 普及后，命名空间已不再是推荐的做法。

```typescript
// 命名空间写法（了解即可）
namespace Geometry {
  export interface Point {
    x: number
    y: number
  }

  export function distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
  }

  // 未导出的内容不可从外部访问
  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}

const p1: Geometry.Point = { x: 0, y: 0 }
const p2: Geometry.Point = { x: 3, y: 4 }
console.log(Geometry.distance(p1, p2))  // 5

// 命名空间合并（同名命名空间会自动合并）
namespace Validation {
  export function isString(value: unknown): value is string {
    return typeof value === 'string'
  }
}

namespace Validation {
  export function isNumber(value: unknown): value is number {
    return typeof value === 'number'
  }
}

// Validation 现在同时有 isString 和 isNumber
```

### 命名空间 vs ES Module

| 特性 | namespace | ES Module |
| --- | --- | --- |
| 使用场景 | 声明文件、全局类型 | 一切现代项目 |
| 代码分割 | 不支持 | 支持（动态导入） |
| Tree-shaking | 不支持 | 支持 |
| 循环依赖 | 困难 | 天然支持 |
| 推荐度 | 不推荐 | 推荐 |

## 注意事项

- 新项目应统一使用 ES Module（`import/export`），不要使用命名空间。
- 命名空间在 `.d.ts` 声明文件中仍有用武之地（为全局库声明类型）。
- `import type` 在需要区分类型导入和值导入时很有用，尤其在 `isolatedModules: true` 的配置下。
- 动态导入的返回类型是 `Promise<Module>`，TypeScript 可以推导出导入模块的类型。
- barrel 文件（`index.ts`）虽然方便，但在大型项目中可能影响 tree-shaking 和编译性能。
