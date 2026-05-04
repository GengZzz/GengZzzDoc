# 链接与导航

超链接是 Web 最核心的特性。`<a>` 标签看似简单，但它的 `href` 协议、`rel` 属性、`target` 属性、以及 `download` 属性都有深入的细节。

## href 协议

```html
<!-- HTTP/HTTPS -->
<a href="https://example.com">外部链接</a>
<a href="/about">站内绝对路径</a>
<a href="./about">站内相对路径</a>
<a href="../parent/page">上级目录</a>

<!-- 锚点跳转 -->
<a href="#section-2">跳到第 2 节</a>
<a href="#top">回到顶部</a>

<!-- 当前页面锚点目标 -->
<h2 id="section-2">第 2 节</h2>

<!-- 跨页面锚点 -->
<a href="/docs/page#section-2">跳到另一个页面的第 2 节</a>

<!-- mailto -->
<a href="mailto:user@example.com">发送邮件</a>
<a href="mailto:user@example.com?subject=反馈&body=我想提一个建议">
  带主题和正文的邮件链接
</a>

<!-- tel -->
<a href="tel:+8613800138000">拨打电话</a>

<!-- sms -->
<a href="sms:+8613800138000?body=你好">发送短信</a>

<!-- javascript:（不推荐使用） -->
<a href="javascript:void(0)">空链接</a>
<!-- 更好的方式：使用 button 或 href="#" + event.preventDefault() -->
```

::: warning javascript: 协议
`href="javascript:..."` 是一种过时的做法。它会导致：
- 点击时将 URL 设置为 JavaScript 表达式的返回值
- 可能引入 XSS 安全风险
- 无法被搜索引擎正确解析

推荐使用 `<button>` 替代，或者使用 `event.preventDefault()` 阻止默认行为。
:::

## target 属性

```html
<!-- _self：当前窗口（默认） -->
<a href="/page" target="_self">当前窗口打开</a>

<!-- _blank：新窗口/新标签页 -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  新标签页打开
</a>

<!-- _parent：父框架（iframe 场景） -->
<a href="/page" target="_parent">父框架</a>

<!-- _top：顶层框架（跳出所有 iframe） -->
<a href="/page" target="_top">顶层</a>

<!-- 自定义名称：在指定窗口打开 -->
<a href="/page1" target="myWindow">链接 1</a>
<a href="/page2" target="myWindow">链接 2</a>
<!-- 点击这两个链接都会在同一个叫 "myWindow" 的窗口打开 -->
```

::: tip target="_blank" 安全问题
在 `<a>` 使用 `target="_blank"` 时，新页面可以通过 `window.opener` 访问原页面的 `window` 对象，存在安全风险。**必须**同时添加 `rel="noopener noreferrer"`：
```html
<a href="https://external.com" target="_blank" rel="noopener noreferrer">
```
现代浏览器已默认对 `target="_blank"` 添加 `noopener` 行为，但为了兼容旧浏览器，仍建议显式声明。
:::

## download 属性

```html
<!-- 下载文件而不是导航 -->
<a href="/report.pdf" download>下载报告</a>

<!-- 指定下载文件名 -->
<a href="/data/2026-05-04.csv" download="2026年5月销售数据.csv">
  下载销售数据
</a>

<!-- 下载图片 -->
<a href="/image.png" download="logo.png">
  <img src="/image.png" alt="下载 Logo">
</a>
```

::: warning download 限制
- `download` 属性只对**同源 URL** 有效
- 跨域链接的 `download` 属性会被浏览器忽略，仍然会导航到该 URL
- 需要后端设置 `Content-Disposition: attachment` 头来支持跨域下载
:::

## rel 属性完整列表

`rel` 属性定义当前页面与链接目标之间的关系：

```html
<!-- noopener：阻止新页面访问 window.opener -->
<a href="https://example.com" target="_blank" rel="noopener">外部链接</a>

<!-- noreferrer：不发送 Referer 头 -->
<a href="https://example.com" rel="noreferrer">不暴露来源</a>

<!-- nofollow：告诉搜索引擎不要跟踪此链接（SEO） -->
<a href="https://ads.example.com" rel="nofollow">广告链接</a>

<!-- sponsored：标记付费/赞助链接（Google 规范） -->
<a href="https://sponsor.com" rel="sponsored">赞助商</a>

<!-- ugc：用户生成内容中的链接 -->
<a href="https://user-site.com" rel="ugc">用户评论中的链接</a>

<!-- author：指向作者页面 -->
<a href="/authors/gengzzz" rel="author">关于作者</a>

<!-- license：指向许可协议 -->
<a href="/license" rel="license">CC BY 4.0 许可</a>

<!-- help：指向帮助文档 -->
<a href="/docs/help" rel="help">帮助</a>

<!-- tag：标记当前页面属于某个分类 -->
<a href="/tags/html" rel="tag">HTML</a>

<!-- prev/next：分页导航 -->
<a href="/page/1" rel="prev">上一页</a>
<a href="/page/3" rel="next">下一页</a>

<!-- bookmark：永久链接 -->
<a href="/blog/my-post" rel="bookmark">文章永久链接</a>

<!-- external：外部站点 -->
<a href="https://other.com" rel="external">外部站点</a>
```

## nav 语义标签

```html
<!-- 主导航 -->
<nav aria-label="主导航">
  <ul>
    <li><a href="/" aria-current="page">首页</a></li>
    <li><a href="/docs">文档</a></li>
    <li><a href="/about">关于</a></li>
  </ul>
</nav>

<!-- 面包屑导航 -->
<nav aria-label="面包屑">
  <ol>
    <li><a href="/">首页</a></li>
    <li><a href="/docs">文档</a></li>
    <li><a href="/docs/html" aria-current="page">HTML</a></li>
  </ol>
</nav>

<!-- 分页 -->
<nav aria-label="分页">
  <ul>
    <li><a href="/page/1" rel="prev">上一页</a></li>
    <li><a href="/page/1">1</a></li>
    <li><a href="/page/2" aria-current="page">2</a></li>
    <li><a href="/page/3">3</a></li>
    <li><a href="/page/3" rel="next">下一页</a></li>
  </ul>
</nav>
```

::: tip 不是所有链接组都需要 nav
只有**主要的导航区块**才使用 `<nav>`。页脚中的链接列表、文章中的锚点目录等可以用普通 `<ul>`，不需要 `<nav>`。
:::

## 面包屑导航实现

```html
<!-- 方案一：使用有序列表 + CSS -->
<nav aria-label="面包屑">
  <ol class="breadcrumb">
    <li><a href="/">首页</a></li>
    <li><a href="/frontend">前端</a></li>
    <li><a href="/frontend/html" aria-current="page">HTML</a></li>
  </ol>
</nav>

<style>
.breadcrumb {
  display: flex;
  list-style: none;
  padding: 0;
  gap: 0.5em;
}

.breadcrumb li + li::before {
  content: '/';
  margin-right: 0.5em;
  color: #888;
}

.breadcrumb [aria-current="page"] {
  font-weight: bold;
  text-decoration: none;
  color: inherit;
}
</style>
```

```html
<!-- 方案二：使用结构化数据（SEO 推荐） -->
<nav aria-label="面包屑">
  <ol class="breadcrumb">
    <li><a href="/">首页</a></li>
    <li><a href="/frontend">前端</a></li>
    <li aria-current="page">HTML</li>
  </ol>
</nav>

<!-- 配合 JSON-LD 结构化数据 -->
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

## aria-current 属性

在导航和面包屑中，用 `aria-current` 指示当前活跃项：

```html
<nav aria-label="主导航">
  <ul>
    <li><a href="/">首页</a></li>
    <li><a href="/docs" aria-current="page">文档</a></li>
    <li><a href="/about">关于</a></li>
  </ul>
</nav>
```

`aria-current` 的值：

| 值 | 含义 |
|------|------|
| `page` | 当前页面 |
| `step` | 流程中的当前步骤 |
| `location` | 当前位置 |
| `date` | 当前日期 |
| `time` | 当前时间 |
| `true` | 当前项（通用） |

## 链接可访问性

```html
<!-- 避免"点击这里"等无意义文本 -->
<!-- 不好 -->
<a href="/report">点击这里</a>

<!-- 好 -->
<a href="/report">查看 2026 年度报告</a>

<!-- 如果必须用图标链接，添加 aria-label -->
<a href="/settings" aria-label="设置">
  <svg><!-- 齿轮图标 --></svg>
</a>

<!-- 或者用 sr-only 文字 -->
<a href="/settings">
  <svg aria-hidden="true"><!-- 齿轮图标 --></svg>
  <span class="sr-only">设置</span>
</a>
```

::: warning 链接文本必须有意义
屏幕阅读器用户经常通过链接列表来浏览页面。如果所有链接都是"点击这里"或"了解更多"，用户将无法区分它们。链接文本应该能独立传达目标页面的内容。
:::

## 跳过导航链接

为键盘用户添加"跳过导航"链接：

```html
<body>
  <a href="#main-content" class="skip-link">跳过导航，直接到主内容</a>
  <header>
    <nav><!-- 大量导航链接 --></nav>
  </header>
  <main id="main-content">
    <h1>页面标题</h1>
  </main>
</body>

<style>
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  z-index: 9999;
}
.skip-link:focus {
  top: 0;
}
</style>
```
