# 文本元素

HTML 提供了丰富的文本级语义标签。它们不只是改变外观，更重要的是赋予文本**机器可读的含义**。

## 强调与重要性

```html
<!-- strong：重要的内容，屏幕阅读器会加重语气 -->
<p>操作前<strong>必须备份数据</strong>。</p>

<!-- em：强调，改变句子含义 -->
<p>我<em>确实</em>认为这个方案可行。</p>
<p>我说的是<em>他</em>，不是她。</p>

<!-- strong 和 em 可以嵌套 -->
<p><strong>警告：<em>切勿</em>在生产环境直接执行此操作。</strong></p>
```

::: tip strong/b 与 em/i 的区别
`<strong>` 和 `<em>` 是**语义标签**，表达重要性和强调。`<b>` 和 `<i>` 是**表现标签**，只加粗/斜体但不传达额外含义。

- `<b>`：关键词、产品名称等需要视觉突出但无语义的内容
- `<i>`：术语、外语短语、思想等
:::

## 删除与插入

```html
<!-- del：已删除的内容，带删除线 -->
<!-- ins：新插入的内容，带下划线 -->
<p>原价 <del>¥299</del>，现价 <ins>¥99</ins>。</p>

<!-- cite 属性指向修改原因的链接 -->
<del cite="/changelog#v2">旧的 API 端点</del>

<!-- datetime 属性记录修改时间 -->
<ins datetime="2026-05-04T10:00:00Z">新增的功能说明</ins>
```

## 标记与高亮

```html
<!-- mark：搜索结果高亮、相关性标记 -->
<p>搜索"HTML"的结果：<mark>HTML</mark>是构建网页的基础。</p>

<!-- 在搜索结果页的用法 -->
<article>
  <h2>什么是 <mark>HTML</mark>？</h2>
  <p><mark>HTML</mark>（HyperText Markup Language）是...</p>
</article>
```

## 上标、下标与代码

```html
<!-- sub：下标 -->
<p>H<sub>2</sub>O 是水的化学式。</p>
<p>CO<sub>2</sub> 是二氧化碳。</p>

<!-- sup：上标 -->
<p>E = mc<sup>2</sup></p>
<p>这是第 1<sup>st</sup> 条。</p>

<!-- code：行内代码 -->
<p>使用 <code>console.log()</code> 输出调试信息。</p>

<!-- pre：预格式化文本（保留空格和换行） -->
<pre><code>function factorial(n) {
  if (n <= 1) return 1
  return n * factorial(n - 1)
}</code></pre>

<!-- kbd：键盘输入 -->
<p>按 <kbd>Ctrl</kbd> + <kbd>S</kbd> 保存文件。</p>

<!-- samp：程序输出 -->
<p>程序输出：<samp>Hello, World!</samp></p>

<!-- var：变量名 -->
<p>设 <var>x</var> 为方程的解。</p>
```

::: tip code 与 pre 的区别
`<code>` 是行内代码，外观上会使用等宽字体。`<pre>` 是预格式化块，保留空白字符。通常嵌套使用 `<pre><code>` 来展示代码块。
:::

## 引用

```html
<!-- blockquote：块级引用，引用大段内容 -->
<blockquote cite="https://example.com/source">
  <p>任何可以用 JavaScript 编写的应用，最终都将用 JavaScript 编写。</p>
</blockquote>

<!-- cite 属性是来源 URL，不会显示，但机器可读 -->

<!-- q：行内短引用，浏览器自动加引号 -->
<p>W3C 说：<q>Web 的力量在于其普遍性。</q></p>

<!-- cite 标签：引用来源的标题 -->
<p>出自 <cite>《JavaScript 权威指南》</cite>。</p>
```

## 缩写与时间

```html
<!-- abbr：缩写 -->
<p><abbr title="HyperText Markup Language">HTML</abbr> 是网页的基础。</p>
<p><abbr title="World Wide Web Consortium">W3C</abbr> 制定 Web 标准。</p>

<!-- time：机器可读的时间 -->
<p>发布于 <time datetime="2026-05-04">2026 年 5 月 4 日</time>。</p>
<p>会议时长 <time datetime="PT2H30M">2 小时 30 分钟</time>。</p>
<p>最后更新：<time datetime="2026-05-04T14:30:00+08:00">今天下午 2:30</time>。</p>

<!-- data：机器可读的数据值 -->
<data value="398">产品 A</data>
<data value="599">产品 B</data>
```

## 列表

### 有序列表 ol

```html
<!-- type 属性控制编号样式 -->
<ol>
  <li>第一步：分析需求</li>
  <li>第二步：设计方案</li>
  <li>第三步：编码实现</li>
</ol>

<!-- start 属性指定起始编号 -->
<ol start="5">
  <li>第五步</li>
  <li>第六步</li>
</ol>

<!-- reversed 属性倒序编号 -->
<ol reversed>
  <li>第三名</li>
  <li>第二名</li>
  <li>第一名</li>
</ol>

<!-- value 属性设置单项编号值 -->
<ol>
  <li value="10">第十项</li>
  <li>第十一项（自动递增）</li>
</ol>
```

### 无序列表 ul

```html
<ul>
  <li>HTML</li>
  <li>CSS</li>
  <li>JavaScript</li>
</ul>
```

### 描述列表 dl

`<dl>` 用于术语-定义对，比 `<p>` + `<strong>` 更语义化：

```html
<dl>
  <dt>HTML</dt>
  <dd>超文本标记语言，用于定义网页结构。</dd>

  <dt>CSS</dt>
  <dd>层叠样式表，用于定义网页样式。</dd>

  <dt>JavaScript</dt>
  <dd>脚本语言，用于定义网页行为。</dd>
</dl>

<!-- 一个术语多个定义 -->
<dl>
  <dt>语义化</dt>
  <dd>使用正确的标签表达正确的含义。</dd>
  <dd>让机器（浏览器、屏幕阅读器、搜索引擎）理解页面结构。</dd>
</dl>

<!-- 多个术语一个定义 -->
<dl>
  <dt>HTTP</dt>
  <dt>HTTPS</dt>
  <dd>超文本传输协议（HTTPS 是加密版本）。</dd>
</dl>
```

### 列表嵌套规则

```html
<!-- 嵌套列表必须放在 li 内部 -->
<ul>
  <li>
    前端
    <ul>
      <li>HTML</li>
      <li>CSS</li>
      <li>
        JavaScript
        <ul>
          <li>ES6+</li>
          <li>TypeScript</li>
        </ul>
      </li>
    </ul>
  </li>
  <li>后端</li>
</ul>

<!-- ol 和 ul 可以互相嵌套 -->
<ol>
  <li>
    学习基础
    <ul>
      <li>HTML 标签</li>
      <li>CSS 选择器</li>
    </ul>
  </li>
  <li>
    进阶
    <ul>
      <li>JavaScript DOM 操作</li>
      <li>响应式设计</li>
    </ul>
  </li>
</ol>
```

::: warning 列表嵌套规则
嵌套的 `<ul>` 或 `<ol>` 必须放在 `<li>` 内部，不能直接放在另一个 `<ul>/<ol>` 下面。这是 HTML 规范的要求，不遵守会导致意外的渲染结果。
:::

## 换行与分隔

```html
<!-- br：强制换行（用于地址、诗歌等有意义的换行） -->
<address>
  北京市海淀区<br>
  中关村大街 1 号<br>
  100080
</address>

<!-- hr：主题分隔线 -->
<section>
  <h2>第一部分</h2>
  <p>内容...</p>
</section>
<hr>
<section>
  <h2>第二部分</h2>
  <p>内容...</p>
</section>

<!-- wbr：建议换行点（长单词或 URL 中） -->
<p>文件路径：<wbr>/very/long/path/to/some/deeply/nested/file.txt</p>
```

::: warning 不要用 br 来布局
`<br>` 不应该用于在段落间创建间距，那是 CSS 的工作。`<br>` 只用于有语义意义的换行（地址、诗歌）。
:::

## 文本级标签速查表

| 标签 | 语义 | 视觉效果 | 典型用途 |
|------|------|----------|----------|
| `<strong>` | 重要内容 | 粗体 | 警告、关键信息 |
| `<em>` | 强调 | 斜体 | 改变句子含义 |
| `<mark>` | 相关/高亮 | 黄色背景 | 搜索结果高亮 |
| `<del>` | 已删除 | 删除线 | 旧价格、修改记录 |
| `<ins>` | 新插入 | 下划线 | 新增内容 |
| `<sub>` | 下标 | 下标 | 化学式 |
| `<sup>` | 上标 | 上标 | 数学公式、序数 |
| `<code>` | 代码 | 等宽字体 | 行内代码 |
| `<kbd>` | 键盘输入 | 等宽+边框 | 快捷键说明 |
| `<abbr>` | 缩写 | 点状下划线 | 首次出现的缩写 |
| `<time>` | 时间 | 无特殊样式 | 发布日期、时间 |
