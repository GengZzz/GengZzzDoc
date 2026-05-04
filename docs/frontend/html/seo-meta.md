# SEO 与元标签

搜索引擎优化（SEO）的核心之一就是正确使用 HTML 元标签。这些标签告诉搜索引擎页面的内容、结构和分享方式。

## title 与 description

```html
<!-- title：搜索引擎结果的第一行，50-60 字符 -->
<title>HTML 技术文档 | GengZzzDoc</title>

<!-- description：搜索结果的摘要，120-160 字符 -->
<meta name="description" content="HTML 技术文档，深入覆盖文档结构、语义化、表单验证、Web Components Shadow DOM、性能优化与 SEO 等主题。">
```

### title 最佳实践

```
好：
- HTML 语义化详解 | GengZzzDoc
- CSS Grid 布局完全指南 | 前端开发
- MySQL 索引优化：从原理到实践

不好：
- 首页
- HTML HTML HTML HTML HTML（关键词堆砌）
- 一个关于 HTML 的非常长的标题包含了太多无关信息导致被搜索引擎截断...
```

### description 最佳实践

```html
<!-- 好：包含核心关键词，有吸引力的描述 -->
<meta name="description"
  content="深入理解浏览器解析 HTML 的完整流程：字节流到 DOM 树、CSSOM、渲染树、布局、绘制与合成。包含可交互的动画演示。">

<!-- 不好：空泛或堆砌关键词 -->
<meta name="description" content="HTML, HTML教程, HTML学习, 前端开发, Web开发">
```

## Open Graph 元标签

Open Graph 协议定义了网页在社交媒体（Facebook、微信、Telegram 等）分享时的展示方式：

```html
<!-- 必填 -->
<meta property="og:title" content="HTML 技术文档">
<meta property="og:type" content="website">
<meta property="og:image" content="https://example.com/og-image.png">
<meta property="og:url" content="https://example.com/frontend/html/">

<!-- 推荐 -->
<meta property="og:description" content="从浏览器渲染管线到 Web Components，深入 HTML 的每个层面。">
<meta property="og:site_name" content="GengZzzDoc">
<meta property="og:locale" content="zh_CN">

<!-- 文章类型特有 -->
<meta property="article:author" content="GengZzz">
<meta property="article:published_time" content="2026-05-04T10:00:00Z">
<meta property="article:tag" content="HTML">
<meta property="article:tag" content="前端">

<!-- 图片细节（可选但推荐） -->
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="HTML 技术文档封面图">
```

::: tip og:image 规范
- 推荐尺寸：1200x630 像素（1.91:1 比例）
- 最小尺寸：600x315 像素
- 格式：PNG、JPG
- 文件大小：建议 5MB 以内
- 图片 URL 必须是绝对路径
:::

## Twitter Card

Twitter Card 控制推文中的链接预览：

```html
<!-- 卡片类型 -->
<meta name="twitter:card" content="summary_large_image">
<!-- 类型：
  summary：小图卡片
  summary_large_image：大图卡片
  app：应用安装卡片
  player：视频播放卡片
-->

<!-- 必填 -->
<meta name="twitter:title" content="HTML 技术文档">
<meta name="twitter:description" content="从浏览器渲染管线到 Web Components，深入 HTML 的每个层面。">
<meta name="twitter:image" content="https://example.com/twitter-image.png">

<!-- 可选 -->
<meta name="twitter:site" content="@your_handle">
<meta name="twitter:creator" content="@author_handle">
<meta name="twitter:image:alt" content="封面图描述">
```

## Schema.org JSON-LD 结构化数据

JSON-LD 是 Google 推荐的结构化数据格式，帮助搜索引擎理解页面内容：

### 文章

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "HTML 技术文档",
  "description": "深入 HTML 技术的每个层面",
  "image": "https://example.com/og-image.png",
  "author": {
    "@type": "Person",
    "name": "GengZzz",
    "url": "https://github.com/GengZzz"
  },
  "publisher": {
    "@type": "Organization",
    "name": "GengZzzDoc",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2026-05-04",
  "dateModified": "2026-05-04",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/frontend/html/"
  }
}
</script>
```

### 面包屑

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "首页",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "前端",
      "item": "https://example.com/frontend/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "HTML"
    }
  ]
}
</script>
```

### FAQ

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "HTML 和 XHTML 有什么区别？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "HTML5 是 HTML 的最新版本，不需要闭合所有标签。XHTML 基于 XML，要求严格的语法。"
      }
    },
    {
      "@type": "Question",
      "name": "什么是语义化 HTML？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "语义化 HTML 指使用正确的标签表达正确的含义，让浏览器、屏幕阅读器和搜索引擎都能理解页面结构。"
      }
    }
  ]
}
</script>
```

### 网站搜索框

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "GengZzzDoc",
  "url": "https://example.com/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
```

## canonical URL

```html
<!-- 告诉搜索引擎这个页面的"权威"URL，避免重复内容问题 -->
<link rel="canonical" href="https://example.com/frontend/html/">

<!-- 常见场景 -->
<!-- 同一内容多个 URL -->
<!-- https://example.com/page?utm_source=twitter -->
<!-- https://example.com/page?ref=newsletter -->
<!-- 两者都应指向：https://example.com/page -->
<link rel="canonical" href="https://example.com/page">
```

::: tip canonical 使用场景
- URL 带有查询参数（`?utm_source=xxx`）
- 同时有 `www` 和非 `www` 版本
- HTTP 和 HTTPS 都可访问
- 打印版本页面
- 带尾斜杠和不带尾斜杠的 URL
:::

## robots meta

```html
<!-- 允许索引和跟踪 -->
<meta name="robots" content="index, follow">

<!-- 不索引但跟踪链接 -->
<meta name="robots" content="noindex, follow">

<!-- 索引但不跟踪链接 -->
<meta name="robots" content="index, nofollow">

<!-- 完全禁止 -->
<meta name="robots" content="noindex, nofollow">

<!-- 不归档（不提供网页快照） -->
<meta name="robots" content="noarchive">

<!-- 不显示摘要 -->
<meta name="robots" content="nosnippet">

<!-- Google 特有的 -->
<meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large">
```

::: warning noindex 的使用
`noindex` 会让搜索引擎完全移除该页面的索引。适用于：
- 登录页面、管理后台
- 搜索结果页（站内搜索）
- 感谢页面、确认页面
- 重复内容页面

不要对有价值的页面误设 `noindex`。
:::

## hreflang 多语言

```html
<!-- 同一页面的不同语言版本 -->
<link rel="alternate" hreflang="zh" href="https://example.com/zh/html/">
<link rel="alternate" hreflang="en" href="https://example.com/en/html/">
<link rel="alternate" hreflang="ja" href="https://example.com/ja/html/">

<!-- 默认/回退版本 -->
<link rel="alternate" hreflang="x-default" href="https://example.com/html/">
```

::: tip hreflang 注意事项
- 每个语言版本都需要包含所有版本的 `hreflang` 标签
- `x-default` 表示默认/回退页面
- hreflang 只是信号，搜索引擎可能不完全遵循
- 也可以通过 HTTP 头或 Sitemap 提供 hreflang 信息
:::

## 移动端适配

```html
<!-- viewport meta（必需） -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- 主题色（移动端浏览器地址栏颜色） -->
<meta name="theme-color" content="#4f46e5">
<meta name="theme-color" content="#1f2937" media="(prefers-color-scheme: dark)">

<!-- Web App Manifest -->
<link rel="manifest" href="/manifest.json">

<!-- Apple 特有 -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="GengZzzDoc">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Microsoft 特有 -->
<meta name="msapplication-TileColor" content="#4f46e5">
<meta name="msapplication-TileImage" content="/tile.png">
```

## 完整的 SEO 元标签模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 基础 SEO -->
  <title>HTML 技术文档 | GengZzzDoc</title>
  <meta name="description" content="深入 HTML 技术的每个层面">
  <link rel="canonical" href="https://example.com/frontend/html/">

  <!-- Open Graph -->
  <meta property="og:title" content="HTML 技术文档">
  <meta property="og:description" content="从浏览器渲染到 Web Components">
  <meta property="og:image" content="https://example.com/og.png">
  <meta property="og:url" content="https://example.com/frontend/html/">
  <meta property="og:type" content="website">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="HTML 技术文档">
  <meta name="twitter:description" content="从浏览器渲染到 Web Components">
  <meta name="twitter:image" content="https://example.com/og.png">

  <!-- 多语言 -->
  <link rel="alternate" hreflang="zh" href="https://example.com/zh/html/">
  <link rel="alternate" hreflang="en" href="https://example.com/en/html/">

  <!-- robots -->
  <meta name="robots" content="index, follow">

  <!-- 移动端 -->
  <meta name="theme-color" content="#4f46e5">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
  <!-- 结构化数据 -->
  <script type="application/ld+json">
  { "@context": "https://schema.org", "@type": "TechArticle", ... }
  </script>
</body>
</html>
```
