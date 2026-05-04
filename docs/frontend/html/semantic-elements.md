# 语义化元素

语义化不是"用标签把页面包起来"这么简单。语义标签的核心价值在于：**让浏览器、屏幕阅读器、搜索引擎、开发者工具都能理解页面的结构**。

## HTML5 语义标签总览

### 结构性语义标签

```html
<header>
  <!-- 页面或区块的头部，通常包含 logo、标题、导航 -->
  <h1>站点名称</h1>
  <nav><!-- 导航 --></nav>
</header>

<nav>
  <!-- 导航链接区域 -->
  <ul>
    <li><a href="/">首页</a></li>
    <li><a href="/about">关于</a></li>
  </ul>
</nav>

<main>
  <!-- 页面主体内容，每个页面只能有一个 -->
  <article><!-- 独立内容 --></article>
  <aside><!-- 侧边栏 --></aside>
</main>

<article>
  <!-- 独立的、可独立分发的内容（博客文章、新闻、评论） -->
  <h2>文章标题</h2>
  <p>文章正文...</p>
</article>

<section>
  <!-- 按主题分组的内容，通常有标题 -->
  <h2>章节标题</h2>
  <p>章节内容...</p>
</section>

<aside>
  <!-- 与主内容间接相关的补充信息（侧边栏、引用框） -->
  <p>相关链接...</p>
</aside>

<footer>
  <!-- 页面或区块的尾部 -->
  <p>&copy; 2026</p>
</footer>
```

### 内容性语义标签

```html
<figure>
  <!-- 自包含的插图、图表、代码片段等 -->
  <img src="chart.png" alt="2025年销售趋势图">
  <figcaption>图 1：2025年月度销售数据</figcaption>
</figure>

<details>
  <!-- 可展开/收起的详情 -->
  <summary>点击查看详情</summary>
  <p>这是被隐藏的内容，默认收起，用户点击后展开。</p>
</details>

<!-- details 的 open 属性控制初始状态 -->
<details open>
  <summary>默认展开</summary>
  <p>页面加载时就展示的内容。</p>
</details>

<mark>
  <!-- 高亮标记，表示相关性或搜索匹配 -->
  <p>搜索结果中的<mark>关键词</mark>会高亮显示。</p>
</mark>

<time datetime="2026-05-04">
  <!-- 机器可读的时间 -->
  2026年5月4日
</time>

<data value="12345">
  <!-- 机器可读的数据 -->
  产品编号 12345
</data>

<address>
  <!-- 联系信息 -->
  <a href="mailto:user@example.com">联系我们</a>
</address>

<output>
  <!-- 计算结果 -->
  <output name="result">42</output>
</output>
```

## 语义化原则

### 何时用 article

`<article>` 适用于**可以独立分发或复用**的内容：

- 博客文章
- 新闻报道
- 论坛帖子
- 产品卡片
- 评论区的单条评论

判断标准：**把这个内容复制到其他站点或 RSS 阅读器中，它仍然有意义吗？** 如果是，就用 `<article>`。

### 何时用 section

`<section>` 适用于**按主题分组**的内容，通常带有标题：

```html
<article>
  <h1>C++ 智能指针详解</h1>
  <section>
    <h2>unique_ptr</h2>
    <p>独占所有权的智能指针...</p>
  </section>
  <section>
    <h2>shared_ptr</h2>
    <p>共享所有权的智能指针...</p>
  </section>
</article>
```

判断标准：**内容逻辑上属于一个主题分组，且有独立的标题？** 如果是，用 `<section>`。

### 何时不用 div

`<div>` 没有语义，它只在以下场景使用：

1. **纯布局容器**：需要一个包裹元素来控制 CSS 布局
2. **JavaScript 钩子**：需要一个元素来挂载交互逻辑
3. **没有任何语义标签能表达的场景**

```html
<!-- 不好：用 div 做布局但有语义含义 -->
<div class="header">
  <div class="nav">...</div>
</div>
<div class="main">
  <div class="article">...</div>
</div>

<!-- 好：语义标签替代 -->
<header>
  <nav>...</nav>
</header>
<main>
  <article>...</article>
</main>
```

::: tip 选择标签的决策树
```
内容可以独立分发？ → <article>
需要按主题分组且有标题？ → <section>
是导航链接区域？ → <nav>
是头部/尾部？ → <header>/<footer>
是侧边补充？ → <aside>
以上都不是？ → <div>
```
:::

## 语义化的三大价值

### 1. 可访问性（Accessibility）

屏幕阅读器依赖语义标签来提供正确的导航体验：

- 用户可以按 `<nav>` 跳过导航区
- 用户可以按 `<article>` 跳到文章主体
- `<h1>`-`<h6>` 形成页面大纲，用户可以按标题层级跳转
- `<button>` 自动可被键盘聚焦和激活，而 `<div onclick>` 不行

```html
<!-- 屏幕阅读器可以识别这是一个导航区 -->
<nav aria-label="主导航">
  <ul>
    <li><a href="/">首页</a></li>
  </ul>
</nav>

<!-- 屏幕阅读器无法识别这个 div 是什么 -->
<div class="nav">
  <div class="link" onclick="location='/'">首页</div>
</div>
```

### 2. SEO（搜索引擎优化）

搜索引擎爬虫使用语义标签来理解页面结构：

- `<title>` 和 `<h1>` 告诉搜索引擎页面的核心主题
- `<article>` 告诉搜索引擎这是独立内容
- `<nav>` 告诉搜索引擎这是导航，可能降低其内容权重
- 结构化数据（Schema.org）依赖语义 HTML 来提取信息

### 3. 可维护性

语义化的 HTML 比 `<div>` 堆叠更易阅读和维护：

```html
<!-- 难以理解 -->
<div class="header">
  <div class="title">...</div>
  <div class="nav">...</div>
</div>
<div class="content">
  <div class="post">...</div>
  <div class="sidebar">...</div>
</div>

<!-- 一眼就懂 -->
<header>
  <h1>...</h1>
  <nav>...</nav>
</header>
<main>
  <article>...</article>
  <aside>...</aside>
</main>
```

## 标题层级

```html
<!-- 正确：从 h1 开始，不跳级 -->
<h1>C++ 学习指南</h1>
  <h2>基础语法</h2>
    <h3>变量与类型</h3>
    <h3>控制流</h3>
  <h2>面向对象</h2>
    <h3>类与对象</h3>

<!-- 错误：跳过层级 -->
<h1>C++ 学习指南</h1>
  <h3>变量与类型</h3>  <!-- 跳过了 h2 -->
```

::: warning 每个页面只有一个 h1
`<h1>` 应该是页面的主标题，每个页面只使用一个。搜索引擎用 `<h1>` 来判断页面的主题。
:::

## 详细内容元素 details/summary

`<details>` 和 `<summary>` 是原生的折叠/展开组件，不需要 JavaScript：

```html
<details>
  <summary>常见问题：HTML 和 XHTML 有什么区别？</summary>
  <p>HTML5 是 HTML 的最新版本，不需要闭合所有标签，不需要引号包裹属性值。</p>
  <p>XHTML 是基于 XML 的 HTML，要求严格的语法（所有标签必须闭合、属性必须加引号）。</p>
  <p>HTML5 已经成为主流，XHTML 基本被废弃。</p>
</details>

<!-- details 可以嵌套 -->
<details>
  <summary>高级话题</summary>
  <details>
    <summary>Web Components</summary>
    <p>自定义元素和 Shadow DOM...</p>
  </details>
</details>

<!-- 用 CSS 美化 summary 的指示器 -->
<style>
  details > summary {
    cursor: pointer;
    font-weight: bold;
    list-style-type: none;
  }
  details > summary::marker,
  details > summary::-webkit-details-marker {
    display: none;
  }
  details > summary::before {
    content: '▸ ';
    transition: transform 0.2s;
  }
  details[open] > summary::before {
    content: '▾ ';
  }
</style>
```

## figure 与 figcaption

`<figure>` 不只用于图片，它可以包裹任何自包含的引用内容：

```html
<!-- 图片 -->
<figure>
  <img src="architecture.png" alt="系统架构图">
  <figcaption>图 2：微服务架构总览</figcaption>
</figure>

<!-- 代码片段 -->
<figure>
  <pre><code>function hello() {
  console.log('Hello, World!')
}</code></pre>
  <figcaption>代码清单 1：Hello World 函数</figcaption>
</figure>

<!-- 引用 -->
<figure>
  <blockquote>
    <p>任何可以用 JavaScript 编写的应用，最终都将用 JavaScript 编写。</p>
  </blockquote>
  <figcaption>— Jeff Atwood（阿特伍德定律）</figcaption>
</figure>
```
