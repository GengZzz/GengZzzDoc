---
title: "插件系统"
description: "Vite 插件基于 Rollup 插件接口，扩展了 Vite 特有的配置项。"
---

# 插件系统

Vite 插件基于 Rollup 插件接口，扩展了 Vite 特有的配置项。

## 官方插件

| 插件 | 说明 |
|------|------|
| `@vitejs/plugin-vue` | Vue SFC 支持 |
| `@vitejs/plugin-vue-jsx` | Vue JSX 支持 |
| `@vitejs/plugin-react` | React 支持 |
| `@vitejs/plugin-legacy` | 旧浏览器兼容（生成 SystemJS 版本） |

## 常用社区插件

### 自动导入

```bash
npm install -D unplugin-vue-components unplugin-auto-import
```

```js
// vite.config.js
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    // 自动导入 Vue、Vue Router、Pinia 的 API
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts'
    }),
    // 自动导入组件
    Components({
      dts: 'src/components.d.ts'
    })
  ]
})
```

使用后不再需要手动 `import` 和注册组件：

```vue
<!-- 无需 import { ref } from 'vue' -->
<!-- 无需 import MyButton from '@/components/MyButton.vue' -->
<template>
  <MyButton @click="count++">{{ count }}</MyButton>
</template>

<script setup>
const count = ref(0)  // 自动导入
</script>
```

### 图标插件

```bash
npm install -D unplugin-icons
```

```js
import Icons from 'unplugin-icons/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

export default defineConfig({
  plugins: [
    Icons({
      compiler: 'vue3',
      customCollections: {
        'my-icons': FileSystemIconLoader('./src/assets/icons')
      }
    })
  ]
})
```

### SVG 组件化

```bash
npm install -D vite-svg-loader
```

```js
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  plugins: [
    vue(),
    svgLoader()
  ]
})
```

```vue
<script setup>
import LogoIcon from '@/assets/logo.svg?component'
</script>

<template>
  <LogoIcon class="w-8 h-8" />
</template>
```

### PWA 支持

```bash
npm install -D vite-plugin-pwa
```

```js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'My App',
        short_name: 'App',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
```

### 可视化构建产物

```bash
npm install -D rollup-plugin-visualizer
```

```js
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
})
```

## 编写自定义插件

```js
// vite-plugin-example.js
export default function myPlugin(options = {}) {
  return {
    name: 'vite-plugin-example',

    // 转换文件内容
    transform(code, id) {
      if (id.endsWith('.vue')) {
        return code.replace('__VERSION__', JSON.stringify(options.version))
      }
    },

    // 修改 HTML
    transformIndexHtml(html) {
      return html.replace('<head>', `<head><meta name="version" content="${options.version}">`)
    },

    // 开发服务器中间件
    configureServer(server) {
      server.middlewares.use('/api/debug', (req, res) => {
        res.end(JSON.stringify({ uptime: process.uptime() }))
      })
    },

    // 构建结束
    closeBundle() {
      console.log('构建完成!')
    }
  }
}
```

```js
// vite.config.js
import myPlugin from './vite-plugin-example'

export default defineConfig({
  plugins: [
    myPlugin({ version: '1.0.0' })
  ]
})
```

## 插件执行顺序

| 钩子 | 时机 |
|------|------|
| `config` | 解析配置前 |
| `configResolved` | 配置解析后 |
| `configureServer` | 配置开发服务器 |
| `transformIndexHtml` | 处理 HTML |
| `resolveId` | 解析模块路径 |
| `load` | 加载模块内容 |
| `transform` | 转换代码 |
| `buildEnd` | 构建结束 |
| `closeBundle` | 关闭构建 |
