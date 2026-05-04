# 快速开始

## 创建项目

::: code-group

```bash [npm]
npm create vite@latest my-app -- --template vue
```

```bash [yarn]
yarn create vite my-app --template vue
```

```bash [pnpm]
pnpm create vite my-app --template vue
```

:::

### 可用模板

| 模板 | 命令 |
|------|------|
| Vanilla JS | `--template vanilla` |
| Vue | `--template vue` |
| Vue + TS | `--template vue-ts` |
| React | `--template react` |
| React + TS | `--template react-ts` |
| Preact | `--template preact` |
| Svelte | `--template svelte` |

```bash
cd my-app
npm install
npm run dev
```

## 目录结构

```text
my-app/
├── public/              # 静态资源（不经过构建处理）
│   └── favicon.svg
├── src/
│   ├── assets/          # 静态资源（经过构建处理）
│   ├── components/      # 组件
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── index.html           # HTML 入口
├── vite.config.js       # Vite 配置
├── package.json
└── tsconfig.json        # TypeScript 配置（如使用 TS）
```

::: tip index.html 在根目录
与 Webpack 不同，Vite 的 `index.html` 在项目根目录而非 `public/` 目录。Vite 将 `index.html` 作为入口文件，通过 `<script type="module">` 加载 JS。
:::

## 开发服务器

```bash
npm run dev
```

默认启动在 `http://localhost:5173`，支持：

- **热更新（HMR）**：修改代码后浏览器即时更新，无需手动刷新
- **HTTPS**：通过 `--https` 或配置启用
- **网络访问**：通过 `--host` 允许局域网访问

## 脚本命令

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.ts"
  }
}
```

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建（输出到 `dist/`） |
| `npm run preview` | 本地预览生产构建结果 |
