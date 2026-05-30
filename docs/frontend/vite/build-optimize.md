---
title: "构建与优化"
description: "Vite 的生产构建基于 Rollup，输出高度优化的静态资源。"
---

# 构建与优化

Vite 的生产构建基于 Rollup，输出高度优化的静态资源。

## 构建流程

```text
源代码
  ↓
Rollup 打包（Tree Shaking + 代码分割）
  ↓
esbuild / Terser 压缩
  ↓
输出 dist/ 目录
```

## 代码分割

### 自动分割

Vite 会自动将以下内容分割为独立 chunk：

- 动态导入的模块（`import()`）
- 被多个 chunk 共享的模块

```js
// 自动代码分割
const module = await import('./heavy-module.js')
```

### 手动分包

```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue')) return 'vue-vendor'
            if (id.includes('lodash')) return 'lodash'
            return 'vendor'
          }
        }
      }
    }
  }
})
```

### 按路由懒加载

```js
// router/index.js
const routes = [
  {
    path: '/',
    component: () => import('@/views/Home.vue')  // 独立 chunk
  },
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard.vue')  // 独立 chunk
  }
]
```

## 预构建优化

开发阶段 Vite 会预构建 `node_modules` 中的依赖（使用 esbuild）：

```js
export default defineConfig({
  optimizeDeps: {
    include: ['lodash-es', 'axios'],       // 强制预构建
    exclude: ['your-local-package'],        // 排除预构建
    needsInterop: ['problematic-package']   // 需要 CJS 兼容
  }
})
```

## 静态资源处理

### 小文件内联

小于 `assetsInlineLimit`（默认 4KB）的资源会被内联为 Base64：

```js
export default defineConfig({
  build: {
    assetsInlineLimit: 4096  // 4KB
  }
})
```

### 图片压缩

```bash
npm install -D vite-plugin-imagemin
```

```js
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      webp: { quality: 75 }
    })
  ]
})
```

## 性能优化清单

### 构建配置

```js
export default defineConfig({
  build: {
    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },

    // CSS 代码分割
    cssCodeSplit: true,

    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500,

    // 生成 manifest 文件（配合后端部署）
    manifest: true
  }
})
```

### 依赖优化

| 策略 | 说明 |
|------|------|
| 按需引入 | 使用 `unplugin-vue-components` 自动按需导入 UI 库 |
| 懒加载路由 | 使用 `import()` 动态导入路由组件 |
| 避免大库 | 用 `date-fns` 替代 `moment`，用 `lodash-es` 替代 `lodash` |
| 压缩图片 | 使用 WebP 格式，合适的尺寸 |

### CDN 优化

```js
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vue', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
```

```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
```

## 分析构建产物

```bash
# 安装可视化插件
npm install -D rollup-plugin-visualizer

# 构建并查看分析报告
npm run build
```

```js
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true
    })
  ]
})
```

## 部署

### Nginx 配置

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/my-app/dist;

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

::: tip SPA 路由回退
对于单页面应用，所有路由都需要回退到 `index.html`，否则直接访问子路由会 404。
:::
