# 文档结构

一个 HTML 文档的结构看似简单，但每一个部分都有其存在的深层原因。理解文档结构是理解浏览器如何渲染页面的基础。

## DOCTYPE 的历史演变

`<!DOCTYPE html>` 是 HTML 文档的第一行，它不是 HTML 标签，而是一条指令，告诉浏览器使用哪个标准来解析页面。

### HTML4 时代

HTML4 有三种模式，每种都有复杂的 DTD 声明：

```html
<!-- HTML4 Strict：不包含废弃标签 -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
  "http://www.w3.org/TR/html4/strict.dtd">

<!-- HTML4 Transitional：包含废弃标签 -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
  "http://www.w3.org/TR/html4/loose.dtd">

<!-- HTML4 Frameset：允许使用 frameset -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN"
  "http://www.w3.org/TR/html4/frameset.dtd">
```

### HTML5 简化

HTML5 统一为一个声明，不区分 Strict/Transitional：

```html
<!DOCTYPE html>
```

::: tip 为什么能这样简化？
因为 HTML5 不再基于 SGML（Standard Generalized Markup Language），不需要引用 DTD 文件。这个声明的作用仅仅是触发浏览器的**标准模式（Standards Mode）**，避免进入怪异模式（Quirks Mode）。
:::

### 怪异模式与标准模式

浏览器根据 DOCTYPE 决定渲染模式：

```html
<!-- 有 DOCTYPE → 标准模式 -->
<!DOCTYPE html>
<html>
  <!-- 按 W3C 标准渲染 -->
</html>

<!-- 缺少 DOCTYPE → 怪异模式 -->
<html>
  <!-- 兼容 2000 年之前的旧网页，盒模型使用 border-box 等 -->
</html>
```

## html 根元素

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <!-- 页面内容 -->
</html>
```

### lang 属性

`lang` 属性指定页面的主要语言，它的作用：

1. **屏幕阅读器**选择正确的语音引擎
2. **搜索引擎**判断页面语言并匹配用户搜索
3. **浏览器**选择字体渲染策略（如中日韩字体差异）
4. **CSS** 伪类 `:lang()` 可以针对不同语言应用样式

```html
<html lang="zh-CN">
<!-- 中文简体 -->

<html lang="en">
<!-- 英文 -->

<html lang="zh-Hant">
<!-- 中文繁体 -->

<!-- 子元素可以覆盖父元素的语言 -->
<html lang="en">
<body>
  <p>This is English text.</p>
  <p lang="zh-CN">这是一段中文。</p>
</body>
</html>
```

## head 标签深度

`<head>` 包含文档的元数据，浏览器用它来处理页面但不会直接显示给用户。

### meta charset

```html
<head>
  <!-- 必须在 <head> 的前 1024 个字节内 -->
  <meta charset="UTF-8">
</head>
```

UTF-8 是现代 Web 的事实标准，支持几乎所有语言的字符。浏览器在读取 HTML 字节流时，需要知道使用什么字符编码来解码。如果 charset 声明太晚或缺失，浏览器会猜测编码，可能导致乱码。

### meta viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

这个标签是响应式设计的基础：

| 属性 | 说明 | 示例值 |
|------|------|--------|
| `width` | 视口宽度 | `device-width`（等于设备宽度） |
| `initial-scale` | 初始缩放比例 | `1.0`（不缩放） |
| `minimum-scale` | 最小缩放 | `0.5` |
| `maximum-scale` | 最大缩放 | `3.0` |
| `user-scalable` | 是否允许用户缩放 | `no`（不推荐禁用） |

::: warning 不要禁用缩放
设置 `user-scalable=no` 或 `maximum-scale=1` 会阻止视力障碍用户放大页面，违反 WCAG 准则。除非是全屏 Web App，否则不建议禁用。
:::

### meta 标签完整用途

```html
<!-- 字符编码 -->
<meta charset="UTF-8">

<!-- 视口 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- 页面描述（SEO） -->
<meta name="description" content="HTML 技术文档，覆盖文档结构、语义化、表单验证等">

<!-- 页面关键词（搜索引擎已基本忽略） -->
<meta name="keywords" content="HTML, 前端, Web">

<!-- 作者 -->
<meta name="author" content="GengZzz">

<!-- 爬虫行为控制 -->
<meta name="robots" content="index, follow">
<!-- content: index/noindex, follow/nofollow, noarchive, nosnippet -->

<!-- HTTP 头等价 -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'">

<!-- Open Graph（社交媒体分享） -->
<meta property="og:title" content="HTML 技术文档">
<meta property="og:description" content="深入 HTML 技术的每个层面">
<meta property="og:type" content="website">
<meta property="og:url" content="https://example.com/html/">
<meta property="og:image" content="https://example.com/og-image.png">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="HTML 技术文档">
<meta name="twitter:description" content="深入 HTML 技术的每个层面">
<meta name="twitter:image" content="https://example.com/og-image.png">

<!-- 主题色（移动端浏览器地址栏颜色） -->
<meta name="theme-color" content="#4f46e5">
```

### title 标签

```html
<title>HTML 技术文档 - GengZzzDoc</title>
```

`<title>` 不只是显示在浏览器标签页上，它还是：

- 搜索引擎结果页（SERP）中最显眼的标题
- 浏览器书签的默认名称
- 屏幕阅读器访问页面时朗读的第一个信息

::: tip title 最佳实践
- 保持 50-60 个字符以内
- 包含页面核心关键词
- 使用 `|` 或 `-` 分隔站点名：`页面名 | 站点名`
:::

### link 标签

```html
<!-- 外部样式表 -->
<link rel="stylesheet" href="/styles/main.css">

<!-- 网站图标 -->
<link rel="icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- 预加载关键资源 -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/critical.css" as="style">

<!-- 预连接（DNS + TCP + TLS） -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="https://api.example.com">

<!-- 预获取（可能用到的资源） -->
<link rel="prefetch" href="/next-page-data.json">

<!-- Canonical URL（避免重复内容） -->
<link rel="canonical" href="https://example.com/html/">

<!-- 多语言替代 -->
<link rel="alternate" hreflang="en" href="https://example.com/en/html/">
<link rel="alternate" hreflang="zh" href="https://example.com/zh/html/">
```

### script 标签

```html
<!-- 默认行为：阻塞 HTML 解析，立即下载并执行 -->
<script src="/app.js"></script>

<!-- async：下载时不阻塞，下载完立即执行（顺序不保证） -->
<script async src="/analytics.js"></script>

<!-- defer：下载不阻塞，DOM 解析完按顺序执行 -->
<script defer src="/app.js"></script>

<!-- module：ES Module，自动 defer，支持 import/export -->
<script type="module" src="/app.mjs"></script>

<!-- nomodule：给不支持 ES Module 的旧浏览器 -->
<script nomodule src="/legacy.js"></script>

<!-- 内联脚本 -->
<script>
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 解析完成')
  })
</script>
```

::: tip script 加载策略选择
- **外部依赖库（如 Google Analytics）**：用 `async`
- **依赖 DOM 的应用脚本**：用 `defer`
- **现代模块化应用**：用 `type="module"`
- **需要立即执行且阻塞渲染**：默认（极少数场景）
:::

### noscript 标签

```html
<noscript>
  <p>您的浏览器未启用 JavaScript，请启用后访问。</p>
  <!-- 也可以包含 meta 重定向 -->
  <meta http-equiv="refresh" content="0; url=/no-js-version.html">
</noscript>
```

## body 标签

```html
<body>
  <header>
    <nav><!-- 导航 --></nav>
  </header>
  <main>
    <article>
      <h1>页面标题</h1>
      <p>内容</p>
    </article>
  </main>
  <footer><!-- 页脚 --></footer>
</body>
```

## 完整的 HTML5 文档模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="页面描述">
  <title>页面标题 | 站点名</title>

  <link rel="icon" href="/favicon.ico">
  <link rel="canonical" href="https://example.com/page/">

  <!-- 关键 CSS 内联，非关键 CSS 异步加载 -->
  <style>/* 首屏关键 CSS */</style>
  <link rel="preload" href="/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">

  <!-- 预连接关键域名 -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
</head>
<body>
  <!-- 页面内容 -->

  <!-- 非关键 JS -->
  <script defer src="/app.js"></script>
</body>
</html>
```

::: warning 常见错误
- `<meta charset>` 放在 `<body>` 里或放在太靠后的位置
- 忘记 `<!DOCTYPE html>`，导致浏览器进入怪异模式
- 使用自闭合标签时加了 `/`（如 `<meta ... />`），HTML5 中不需要
- `<script>` 放在 `<head>` 中不加 `defer/async`，阻塞页面渲染
:::

## 浏览器解析流程

当浏览器收到 HTML 文档时，处理流程如下：

```
1. 接收字节流（从 HTTP 响应体）
2. 根据 charset 解码为字符串
3. 词法分析（Tokenization）→ 生成 Token 序列
   - StartTag: <div>
   - EndTag: </div>
   - Text: "Hello"
   - Comment: <!-- ... -->
4. Token → Node → 构建 DOM 树
5. 遇到 <link>/<style> → 请求 CSS → 构建 CSSOM 树
6. DOM + CSSOM → Render Tree（跳过 display:none 的节点）
7. Layout：计算每个节点的几何位置（x, y, width, height）
8. Paint：绘制文本、颜色、边框、阴影等
9. Composite：将多个图层合并，由 GPU 输出到屏幕
```

这个流程解释了为什么 `<script>` 默认会阻塞渲染——浏览器必须暂停 DOM 构建，下载并执行脚本，因为脚本可能会修改 DOM（如 `document.write`）。
