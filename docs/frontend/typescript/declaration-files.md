# 声明文件

## .d.ts 格式

声明文件（`.d.ts`）只包含类型信息，不包含实现代码。它用于为纯 JavaScript 库提供类型定义，或者声明模块的类型接口。

```typescript
// types.d.ts

// 声明一个接口
interface User {
  id: number
  name: string
  email: string
}

// 声明一个函数类型
declare function greet(user: User): string

// 声明一个常量
declare const VERSION: string

// 声明一个枚举
declare enum LogLevel {
  Debug,
  Info,
  Warn,
  Error
}
```

## declare module

`declare module` 用于为第三方 JavaScript 模块声明类型。当一个 npm 包没有自带类型定义时，你需要手动编写或使用 `@types` 包。

```typescript
// 为一个没有类型的库声明类型
// lodash-debounce.d.ts
declare module 'lodash.debounce' {
  interface DebounceOptions {
    leading?: boolean
    maxWait?: number
    trailing?: boolean
  }

  interface DebouncedFunc<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T> | undefined
    cancel(): void
    flush(): ReturnType<T> | undefined
  }

  export default function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: DebounceOptions
  ): DebouncedFunc<T>
}

// 实际场景：为内部工具库声明类型
declare module '@/utils/crypto' {
  export function encrypt(data: string, key: string): string
  export function decrypt(data: string, key: string): string
  export function hash(data: string): string
}
```

## declare namespace

`declare namespace` 用于声明全局命名空间下的类型，常见于 UMD 库和全局脚本。

```typescript
// 为全局变量声明类型
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    DATABASE_URL: string
    API_KEY: string
  }
}

// 使用时自动有类型
console.log(process.env.NODE_ENV)  // 类型：'development' | 'production' | 'test'

// 实际场景：声明 jQuery 类型（简化版）
declare namespace JQuery {
  interface AjaxSettings {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: unknown
    success?: (response: any) => void
    error?: (xhr: XMLHttpRequest) => void
  }
}

interface JQuery {
  find(selector: string): JQuery
  addClass(className: string): JQuery
  on(event: string, handler: (event: Event) => void): JQuery
  ajax(settings: JQuery.AjaxSettings): void
}

declare const $: {
  (selector: string): JQuery
  ajax(settings: JQuery.AjaxSettings): void
}
```

## declare global

`declare global` 在模块文件中扩展全局类型。常用于声明全局可用的类型或扩展内置接口。

```typescript
// 在模块文件中扩展全局 Window 接口
export {}  // 确保文件被当作模块

declare global {
  interface Window {
    myApp: {
      version: string
      env: 'development' | 'production'
      config: Record<string, unknown>
    }
  }

  // 扩展全局 String 接口
  interface String {
    toCamelCase(): string
  }
}

// 现在可以安全使用
window.myApp = { version: '1.0.0', env: 'development', config: {} }

// 实际场景：测试框架的全局函数
declare global {
  function describe(name: string, fn: () => void): void
  function it(name: string, fn: () => void): void
  function expect(value: any): {
    toBe(expected: any): void
    toEqual(expected: any): void
    toBeTruthy(): void
  }
}
```

## @types 包

`@types` 是 DefinitelyTyped 项目维护的社区类型定义包，为大量 JavaScript 库提供类型支持。

```bash
# 安装类型定义
npm install -D @types/node          # Node.js 运行时类型
npm install -D @types/lodash        # lodash 类型
npm install -D @types/react         # React 类型
npm install -D @types/express       # Express 类型

# 有些包自带类型定义，不需要单独安装 @types
# 例如：axios、dayjs（v2+）、vue（v3+）
```

### 配置 @types

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["node", "jest"],         // 只加载指定的 @types 包
    "typeRoots": ["./custom-types"]    // 自定义类型目录
  }
}
```

### 查找 @types 包

- 访问 [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)
- 使用 [TypeSearch](https://www.typescriptlang.org/dt/search) 搜索
- 运行 `npm search @types/<包名>`

## 为项目编写类型声明

### 场景一：声明模块类型

```typescript
// src/types/images.d.ts
declare module '*.png' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明 CSS 模块
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
```

### 场景二：声明 JSON 数据的类型

```typescript
// src/types/config.d.ts
declare module '*/config.json' {
  interface AppConfig {
    name: string
    version: string
    features: Record<string, boolean>
  }
  const config: AppConfig
  export default config
}
```

### 场景三：环境变量类型

```typescript
// src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 三斜线指令

三斜线指令（`/// <reference />`）是旧的文件引用方式，现代项目中通常不需要手动使用。

```typescript
/// <reference types="node" />        // 引入 @types/node
/// <reference path="./other.d.ts" /> // 引入其他声明文件
/// <reference lib="es2020" />        // 引入内置库声明

// 三斜线指令必须位于文件顶部，在所有其他代码之前
// 在 tsconfig.json 的 types 配置存在时，通常不需要手动写
```

## 注意事项

- `.d.ts` 文件中只能有声明（`declare`），不能有实现代码。它不会生成 JavaScript 输出。
- 如果一个 npm 包自带 `.d.ts` 文件（在 `package.json` 的 `types` 字段指定），则不需要额外安装 `@types`。
- `declare global` 只能在模块文件中使用（文件中有 `import` 或 `export`）。如果文件是脚本（没有任何 import/export），全局声明直接写在顶层即可。
- 声明文件中的类型与源码中的类型享有相同的作用域规则，但值（`const`、`function` 等）通过 `declare` 声明后不会生成实际代码。
