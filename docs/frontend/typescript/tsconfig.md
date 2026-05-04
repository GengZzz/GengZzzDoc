# tsconfig.json 完整指南

## 文件作用

`tsconfig.json` 是 TypeScript 项目的配置文件。它告诉编译器 `tsc` 如何编译项目：包含哪些文件、使用什么语法特性、输出到哪里、启用哪些检查等。

```bash
# 生成 tsconfig.json 模板
npx tsc --init
```

## compilerOptions 常用配置

### 语言与目标

| 配置项 | 说明 | 推荐值 |
| --- | --- | --- |
| `target` | 编译输出的 ECMAScript 版本 | `ES2020` 或更高 |
| `lib` | 包含的内置类型声明 | `["ES2020", "DOM", "DOM.Iterable"]` |
| `jsx` | JSX 支持模式 | `react-jsx`（React 17+） |
| `experimentalDecorators` | 启用旧版装饰器 | `true`（需要时开启） |

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  }
}
```

### 模块系统

| 配置项 | 说明 | 推荐值 |
| --- | --- | --- |
| `module` | 输出模块格式 | `ESNext` |
| `moduleResolution` | 模块解析策略 | `bundler` |
| `esModuleInterop` | 兼容 CommonJS 默认导出 | `true` |
| `resolveJsonModule` | 允许导入 JSON 文件 | `true` |

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

### 严格检查

| 配置项 | 说明 | 推荐值 |
| --- | --- | --- |
| `strict` | 启用所有严格检查 | `true` |
| `noImplicitAny` | 禁止隐式 any | `true`（strict 包含） |
| `strictNullChecks` | 严格空值检查 | `true`（strict 包含） |
| `strictFunctionTypes` | 严格函数类型检查 | `true`（strict 包含） |
| `noUnusedLocals` | 禁止未使用的局部变量 | `true` |
| `noUnusedParameters` | 禁止未使用的参数 | `true`（可选） |
| `noFallthroughCasesInSwitch` | switch 语句禁止穿透 | `true` |

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 输出与目录

| 配置项 | 说明 | 推荐值 |
| --- | --- | --- |
| `outDir` | 编译输出目录 | `./dist` |
| `rootDir` | 源码根目录 | `./src` |
| `declaration` | 生成 .d.ts 声明文件 | `true`（库项目） |
| `declarationMap` | 生成声明文件的 source map | `true`（库项目） |
| `sourceMap` | 生成 .js.map 文件 | `true` |
| `removeComments` | 移除注释 | `false` |

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  }
}
```

### 其他实用配置

| 配置项 | 说明 | 推荐值 |
| --- | --- | --- |
| `skipLibCheck` | 跳过 .d.ts 文件的类型检查 | `true`（加速编译） |
| `forceConsistentCasingInFileNames` | 强制文件名大小写一致 | `true` |
| `isolatedModules` | 确保每个文件可独立编译 | `true`（配合 Babel/esbuild） |
| `verbatimModuleSyntax` | 严格区分类型导入导出 | `true`（TypeScript 5.0+） |

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

## include / exclude / files

这三个配置项控制哪些文件被纳入编译范围。

```json
{
  "include": ["src/**/*"],           // 包含 src 下所有 .ts/.tsx 文件
  "exclude": ["node_modules", "dist", "**/*.spec.ts"],  // 排除
  "files": ["src/index.ts"]          // 精确指定文件（优先级最高）
}
```

### 通配符

| 通配符 | 含义 |
| --- | --- |
| `*` | 匹配零个或多个字符（不含目录分隔符） |
| `?` | 匹配单个字符 |
| `**/` | 匹配任意层级的目录 |

```json
{
  "include": [
    "src/**/*.ts",         // src 下所有 .ts 文件
    "src/**/*.tsx",        // src 下所有 .tsx 文件
    "tests/**/*.test.ts"   // tests 下所有测试文件
  ],
  "exclude": [
    "node_modules",
    "**/*.spec.ts",
    "dist",
    "coverage"
  ]
}
```

## 项目引用

项目引用（Project References）允许将大型 TypeScript 项目拆分为多个子项目，实现增量编译和更好的构建性能。

### 项目结构

```
monorepo/
  packages/
    shared/
      tsconfig.json          # 共享类型
      src/index.ts
    api/
      tsconfig.json          # API 服务，引用 shared
      src/index.ts
    web/
      tsconfig.json          # Web 应用，引用 shared
      src/index.ts
  tsconfig.json              # 根配置
```

### 根 tsconfig.json

```json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/api" },
    { "path": "./packages/web" }
  ]
}
```

### 子项目 tsconfig.json（api）

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "composite": true,              // 必须开启：启用项目引用
    "declaration": true,            // 必须开启：生成 .d.ts
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }         // 引用 shared 项目
  ]
}
```

### 构建命令

```bash
# 使用 tsc 构建所有项目（增量）
npx tsc --build

# 构建特定项目
npx tsc --build packages/api

# 清理构建产物
npx tsc --build --clean
```

## 实际项目配置模板

### Vue 3 + Vite 项目

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "env.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Node.js 项目

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## 注意事项

- `strict: true` 是最重要的配置。它等价于开启 `strictNullChecks`、`noImplicitAny`、`strictFunctionTypes`、`strictBindCallApply`、`strictPropertyInitialization`、`noImplicitThis`、`alwaysStrict` 共 7 个选项。
- `skipLibCheck: true` 可以显著提升大型项目的编译速度，通常不会影响类型安全。
- `isolatedModules: true` 确保每个文件可以被 Babel、esbuild 等工具独立编译，避免跨文件的类型依赖问题。
- 项目引用中的 `composite: true` 和 `declaration: true` 是必须的，否则 `tsc --build` 会报错。
- `paths` 配置只影响 TypeScript 的模块解析，不影响打包工具。在 Vite 中还需要单独配置 `resolve.alias`。
