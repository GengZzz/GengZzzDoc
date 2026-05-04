# 配置详解

Vite 的配置文件是项目根目录的 `vite.config.js`（或 `.ts`）。

## 基本配置

```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/my-app/',           // 部署路径
  root: '.',                  // 项目根目录
  publicDir: 'public',        // 静态资源目录
  build: {
    outDir: 'dist',           // 构建输出目录
    assetsDir: 'assets',      // 静态资源子目录
    sourcemap: false,         // 是否生成 source map
  }
})
```

## 路径别名

```js
// vite.config.js
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  }
})
```

配合 TypeScript 使用时，还需配置 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## 环境变量

### 文件命名规则

| 文件 | 加载时机 | 说明 |
|------|---------|------|
| `.env` | 始终 | 通用变量 |
| `.env.local` | 始终 | 本地覆盖（git 忽略） |
| `.env.development` | `npm run dev` | 开发环境 |
| `.env.production` | `npm run build` | 生产环境 |

### 变量定义

```bash
# .env
VITE_APP_TITLE=My App

# .env.development
VITE_API_BASE=http://localhost:3000/api

# .env.production
VITE_API_BASE=https://api.example.com
```

::: warning 变量前缀
只有以 `VITE_` 开头的变量才会暴露给客户端代码。这是为了防止意外泄露敏感信息。
:::

### 在代码中使用

```js
console.log(import.meta.env.VITE_API_BASE)
console.log(import.meta.env.VITE_APP_TITLE)
console.log(import.meta.env.MODE)       // 'development' | 'production'
console.log(import.meta.env.DEV)        // 是否开发模式
console.log(import.meta.env.PROD)       // 是否生产模式
```

## CSS 配置

```js
export default defineConfig({
  css: {
    // CSS 预处理器配置
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      },
      less: {
        modifyVars: { '@primary-color': '#1890ff' }
      }
    },
    // CSS Modules
    modules: {
      localsConvention: 'camelCaseOnly'
    },
    // PostCSS 配置（也可用 postcss.config.js）
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('tailwindcss')
      ]
    }
  }
})
```

## 开发服务器配置

```js
export default defineConfig({
  server: {
    port: 3000,           // 端口号
    open: true,           // 自动打开浏览器
    host: '0.0.0.0',      // 允许网络访问
    https: false,         // 是否启用 HTTPS
    proxy: {              // 代理配置
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  }
})
```

## 构建配置

```js
export default defineConfig({
  build: {
    target: 'es2015',         // 编译目标
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',         // 'terser' | 'esbuild'
    terserOptions: {
      compress: {
        drop_console: true,   // 移除 console
        drop_debugger: true   // 移除 debugger
      }
    },
    rollupOptions: {
      output: {
        // 手动分包
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-lib': ['element-plus']
        }
      }
    }
  }
})
```
