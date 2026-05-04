# 性能与加载

HTML 的编写方式直接影响页面的加载性能。理解关键渲染路径和资源加载优先级，是优化 Web 性能的第一步。

## 关键渲染路径（Critical Rendering Path）

浏览器从接收 HTML 到页面可交互，经历以下步骤：

```
1. HTML → DOM（文档对象模型）
   ↓ 遇到 <link>/<style>
2. CSS → CSSOM（CSS 对象模型）
   ↓ DOM + CSSOM 合并
3. Render Tree（渲染树，不含 display:none 节点）
   ↓
4. Layout（布局）：计算每个节点的几何位置
   ↓
5. Paint（绘制）：填充像素（颜色、边框、阴影、文字）
   ↓
6. Composite（合成）：将多个图层合并，GPU 输出到屏幕
```

### DOM 构建

```html
<!-- 浏览器逐行解析 HTML，构建 DOM 树 -->
<!DOCTYPE html>
<html>
<head>
  <!-- 遇到 <link>：异步请求 CSS，阻塞渲染 -->
  <link rel="stylesheet" href="/main.css">
  <!-- 遇到 <script>（默认）：暂停 DOM 构建，下载并执行 -->
  <script src="/app.js"></script>
</head>
<body>
  <h1>Hello</h1>
  <!-- DOM 构建继续 -->
</body>
</html>
```

### CSSOM 构建

CSS 的下载和解析是**渲染阻塞**的。浏览器必须等到 CSSOM 构建完成才能进行首次渲染。

```html
<!-- 这个 CSS 文件会阻塞渲染 -->
<link rel="stylesheet" href="/main.css">

<!-- 内联关键 CSS 可以消除一次网络请求 -->
<style>
/* 只包含首屏渲染所需的最小 CSS */
body { margin: 0; font-family: sans-serif; }
.header { height: 60px; background: #fff; }
.hero { min-height: 400px; }
</style>

<!-- 非关键 CSS 异步加载 -->
<link rel="preload" href="/non-critical.css" as="style"
  onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/non-critical.css"></noscript>
```

::: tip 关键 CSS 策略
1. 识别首屏渲染所需的最小 CSS
2. 内联到 `<style>` 中
3. 剩余 CSS 用 `preload` 异步加载
4. 这样浏览器可以在 CSS 下载前就开始渲染
:::

### Render Tree

Render Tree 是 DOM 和 CSSOM 的合并，包含所有可见节点：

```
DOM:  html > body > div > p > "Hello"     (包括 display:none)
CSSOM: body{...} div{...} p{display:none}  (所有样式规则)

Render Tree: html > body > div  (p 被排除，因为 display:none)
```

## script async/defer/module 行为差异

```
普通 <script src="...">
  HTML 解析 ────[暂停]──下载──执行──[继续]──→

<script async src="...">
  HTML 解析 ────────────[暂停]──执行──[继续]──→
              └──下载──┘

<script defer src="...">
  HTML 解析 ────────────────────[暂停]──执行──→
              └──下载──┘

<script type="module">
  自动 defer，支持 import/export
  HTML 解析 ────────────────────[暂停]──执行──→
              └──下载──┘
```

| 行为 | 阻塞 HTML 解析 | 执行时机 | 执行顺序 |
|------|----------------|----------|----------|
| 默认 | 是 | 下载完立即执行 | 按顺序 |
| `async` | 否 | 下载完立即执行 | 不保证顺序 |
| `defer` | 否 | DOM 解析完成后 | 保证按顺序 |
| `module` | 否 | DOM 解析完成后 | 保证按顺序 |

```html
<!-- 示例：正确的脚本加载策略 -->
<head>
  <!-- 关键 CSS：阻塞渲染 -->
  <style>/* 首屏最小 CSS */</style>

  <!-- 分析脚本：async，不影响渲染 -->
  <script async src="https://analytics.example.com/script.js"></script>
</head>
<body>
  <!-- 页面内容 -->

  <!-- 应用脚本：defer，保证在 DOM 解析后按顺序执行 -->
  <script defer src="/vendor.js"></script>
  <script defer src="/app.js"></script>
</body>
```

::: warning 不要在 head 中放无 defer/async 的 script
无 defer/async 的 script 放在 head 中会阻塞页面渲染，应该使用 defer。
:::

## 资源加载优先级

### preload

```html
<!-- preload：浏览器立即开始下载，优先级高 -->
<!-- 关键字体 -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- 首屏大图 -->
<link rel="preload" href="/hero.webp" as="image" type="image/webp">

<!-- 关键 CSS（如果不内联） -->
<link rel="preload" href="/critical.css" as="style">

<!-- 关键 JS -->
<link rel="preload" href="/app.js" as="script">

<!-- 关键数据 -->
<link rel="preload" href="/api/user.json" as="fetch" crossorigin>
```

::: tip preload 的注意事项
- `crossorigin` 对字体是必需的，即使同源
- `as` 属性必须正确，否则浏览器可能重复下载
- preload 的资源应该在关键渲染路径中用到
- 过度 preload 会抢占其他资源的带宽
:::

### prefetch

```html
<!-- prefetch：低优先级，浏览器空闲时下载 -->
<!-- 用户可能会访问的下一个页面 -->
<link rel="prefetch" href="/next-page.html">
<link rel="prefetch" href="/next-page-data.json">

<!-- 预获取其他页面的资源 -->
<link rel="prefetch" href="/images/gallery-1.webp">
<link rel="prefetch" href="/images/gallery-2.webp">
```

### preconnect / dns-prefetch

```html
<!-- preconnect：提前完成 DNS + TCP + TLS -->
<!-- 适用于一定会用到的第三方域名 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.example.com">

<!-- dns-prefetch：只提前做 DNS 解析 -->
<!-- 适用于可能用到的域名，开销更小 -->
<link rel="dns-prefetch" href="https://api.example.com">
<link rel="dns-prefetch" href="https://analytics.example.com">

<!-- 常见组合 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
```

### modulepreload

```html
<!-- modulepreload：预加载 ES Module -->
<!-- 提前下载和解析模块，但不执行 -->
<link rel="modulepreload" href="/modules/app.mjs">
<link rel="modulepreload" href="/modules/utils.mjs">

<script type="module">
  import { init } from '/modules/app.mjs'
  init()
</script>
```

## DOMContentLoaded vs load

```html
<script>
// DOMContentLoaded：DOM 解析完成，CSS、图片等可能还在加载
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 准备好了，可以操作元素了')
  // 大多数初始化代码应该在这里执行
})

// load：所有资源（图片、CSS、iframe 等）都加载完成
window.addEventListener('load', () => {
  console.log('所有资源加载完成')
  // 适合做性能统计
})
</script>
```

| 事件 | 触发时机 | 等待 CSS？ | 等待图片？ |
|------|----------|-----------|-----------|
| `DOMContentLoaded` | DOM 解析完成 | 是 | 否 |
| `load` | 所有资源加载完成 | 是 | 是 |

## 资源加载优先级总结

```
最高优先级：文档（HTML）、关键 CSS、同步 script
高优先级：preload 的资源、首屏图片
中优先级：async script、defer script、非首屏图片
低优先级：prefetch 的资源
```

## 性能优化清单

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>性能优化示例</title>

  <!-- 1. 预连接关键域名 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- 2. 内联关键 CSS -->
  <style>
    /* 只包含首屏最小 CSS */
    body { margin: 0; font-family: system-ui, sans-serif; }
    .header { height: 60px; }
  </style>

  <!-- 3. 异步加载非关键 CSS -->
  <link rel="preload" href="/full.css" as="style"
    onload="this.onload=null;this.rel='stylesheet'">

  <!-- 4. 预加载关键资源 -->
  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/hero.webp" as="image" type="image/webp">
</head>
<body>

  <!-- 5. 首屏内容：使用 width/height 防 CLS -->
  <img src="/hero.webp" alt="主图" width="1200" height="600"
    fetchpriority="high">

  <!-- 6. 非首屏图片：懒加载 -->
  <img src="/content.jpg" alt="内容图" loading="lazy" width="800" height="400">

  <!-- 7. 非关键 JS：defer -->
  <script defer src="/vendor.js"></script>
  <script defer src="/app.js"></script>

  <!-- 8. 第三方分析：async -->
  <script async src="https://analytics.example.com/script.js"></script>
</body>
</html>
```
