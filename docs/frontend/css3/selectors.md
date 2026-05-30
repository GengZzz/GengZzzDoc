---
title: "CSS 选择器"
description: "选择器是 CSS 匹配 HTML 元素的规则，决定了样式规则作用于哪些元素。掌握选择器是编写高效、可维护 CSS 的基础。"
---

# CSS 选择器

选择器是 CSS 匹配 HTML 元素的规则，决定了样式规则作用于哪些元素。掌握选择器是编写高效、可维护 CSS 的基础。

<CssSelectorDemo />

## 基础选择器

### 标签选择器

`标签选择器` 通过 HTML 标签名匹配元素，会选中页面中所有该类型的标签。

```css
/* 选中所有 <p> 元素 */
p {
  line-height: 1.8;
  color: #333;
}

/* 选中所有 <a> 元素 */
a {
  text-decoration: none;
  color: #1a73e8;
}
```

> 注意：标签选择器的优先级最低（0,0,1），适合做全局重置或基础样式，不适合精细控制。

### 类选择器

`类选择器` 通过 class 属性匹配元素，是实际开发中使用频率最高的选择器。

```css
/* 选中所有 class="btn" 的元素 */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* 一个元素可以有多个类 */
.btn-primary {
  background: #1a73e8;
  color: #fff;
}

.btn-danger {
  background: #e53935;
  color: #fff;
}
```

```html
<button class="btn btn-primary">确认</button>
<button class="btn btn-danger">删除</button>
```

> 注意：类选择器优先级为 0,1,0。推荐使用 BEM 命名规范（Block\_\_Element--Modifier）避免类名冲突。

### ID 选择器

`ID 选择器` 通过 id 属性匹配元素，一个页面中 id 应唯一。

```css
/* 选中 id="main-content" 的元素 */
#main-content {
  max-width: 1200px;
  margin: 0 auto;
}
```

> 注意：ID 选择器优先级为 1,0,0，优先级很高。实际开发中不推荐大量使用 ID 选择器，因为它的高优先级会导致样式难以覆盖。通常只在锚点跳转或 JS 选择元素时使用 id。

## 组合器选择器

### 后代选择器（空格）

`后代选择器` 匹配某个元素内部的所有后代元素（不限层级深度）。

```css
/* .nav 内部的所有 <a> 标签 */
.nav a {
  color: #666;
  padding: 8px 12px;
}
```

### 子选择器（>）

`子选择器` 只匹配直接子元素，不匹配更深层级的后代。

```css
/* 只匹配 .menu 的直接子级 <li> */
.menu > li {
  display: inline-block;
}

/* 实际场景：卡片组件中只给直接子元素加间距 */
.card > * + * {
  margin-top: 16px;
}
```

> 注意：子选择器和后代选择器的区别在于是否穿透中间层级。子选择器性能略好，语义更明确。

### 相邻兄弟选择器（+）

`相邻兄弟选择器` 匹配紧跟在某元素后的第一个兄弟元素。

```css
/* <h2> 后面紧跟的第一个 <p> */
h2 + p {
  font-size: 1.1em;
  color: #666;
  margin-top: 8px;
}

/* 实际场景：表单错误提示紧跟输入框 */
.input-error + .error-message {
  color: #e53935;
  font-size: 12px;
  margin-top: 4px;
}
```

### 通用兄弟选择器（~）

`通用兄弟选择器` 匹配某元素后面的所有兄弟元素（不要求紧邻）。

```css
/* <h2> 后面的所有 <p> 兄弟 */
h2 ~ p {
  text-indent: 2em;
}

/* 实际场景：选中状态后的所有同级项 */
.tab.active ~ .tab {
  opacity: 0.6;
}
```

## 属性选择器

### 精确匹配 [attr="value"]

```css
/* 选中 type="submit" 的按钮 */
input[type="submit"] {
  background: #1a73e8;
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
}
```

### 包含匹配 [attr*="value"]

```css
/* href 中包含 "example" 的链接 */
a[href*="example"] {
  color: #e53935;
}

/* 实际场景：匹配所有 CDN 资源链接 */
script[src*="cdn.jsdelivr"] {
  /* 对 CDN 资源加 crossorigin 属性 */
}
```

### 前缀匹配 [attr^="value"]

```css
/* 所有 https 开头的链接 */
a[href^="https"]::before {
  content: "🔒 ";
  font-size: 12px;
}

/* 实际场景：外部链接图标 */
a[href^="http"]:not([href*="mysite.com"])::after {
  content: "↗";
  margin-left: 4px;
}
```

### 后缀匹配 [attr$="value"]

```css
/* 匹配所有 PDF 文件链接 */
a[href$=".pdf"]::after {
  content: " [PDF]";
  color: #e53935;
  font-size: 12px;
}

/* 匹配所有 .jpg 图片 */
img[src$=".jpg"] {
  border-radius: 8px;
}
```

### 空格分隔匹配 [attr~="value"]

```css
/* class 属性中包含独立单词 "active" 的元素 */
[class~="active"] {
  border-color: #1a73e8;
}
```

> 注意：`[attr*="value"]` 和 `[attr~="value"]` 的区别：前者匹配子字符串，后者匹配以空格分隔的完整单词。例如 `class="navigation"` 会被 `[class*="nav"]` 匹配，但不会被 `[class~="nav"]` 匹配。

## 伪类

### 用户交互伪类

`:hover`、`:active`、`:focus` 是最常用的交互伪类，分别表示鼠标悬停、鼠标按下、元素获得焦点的状态。

```css
/* 按钮悬停效果 */
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 输入框聚焦效果 */
.form-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2);
}

/* 按钮按下效果 */
.btn:active {
  transform: translateY(0);
  box-shadow: none;
}
```

> 注意：在移动设备上 `:hover` 表现不稳定，不要依赖它传递关键信息。`:focus` 搭配 `:focus-visible` 可以只在键盘导航时显示焦点样式。

### 结构伪类

`:first-child`、`:last-child`、`:nth-child()`、`:nth-of-type()` 等根据元素在 DOM 中的位置匹配。

```css
/* 列表第一项去掉上边框 */
.nav-item:first-child {
  border-top: none;
}

/* 表格隔行变色（斑马纹） */
tbody tr:nth-child(even) {
  background: #f5f5f5;
}

/* 每三个元素一组，第一个加粗 */
.list-item:nth-child(3n+1) {
  font-weight: 600;
}

/* 实际场景：卡片网格，前三项高亮 */
.product-card:nth-child(-n+3) {
  border: 2px solid #1a73e8;
}
```

> 注意：`:nth-child()` 计数所有兄弟元素，`:nth-of-type()` 只计数同类型元素。混用不同标签时，两者结果不同。

### 否定伪类 :not()

`:not()` 排除匹配给定选择器的元素。

```css
/* 所有非最后一个子元素加右边框 */
.breadcrumb > li:not(:last-child)::after {
  content: "/";
  margin: 0 8px;
  color: #999;
}

/* 实际场景：列表项之间的分隔线 */
.list-item + .list-item {
  border-top: 1px solid #eee;
}
```

## 伪元素

### ::before 和 ::after

`::before` 和 `::after` 在元素内容前后插入生成内容，必须设置 `content` 属性。

```css
/* 清除浮动（经典用法） */
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}

/* 实际场景：价格标签 */
.price::before {
  content: "¥";
  font-size: 0.8em;
  margin-right: 2px;
}

.price {
  font-size: 24px;
  font-weight: 700;
  color: #e53935;
}
```

```html
<span class="price">99.00</span>
<!-- 渲染结果：¥99.00 -->
```

### ::first-line 和 ::first-letter

`::first-line` 匹配元素的第一行文本，`::first-letter` 匹配第一个字母（或汉字）。

```css
/* 文章首字下沉 */
.article p:first-of-type::first-letter {
  font-size: 3em;
  float: left;
  line-height: 1;
  margin-right: 8px;
  color: #1a73e8;
  font-weight: 700;
}

/* 第一行加粗 */
.intro::first-line {
  font-weight: 600;
  color: #333;
}
```

### ::selection

`::selection` 控制用户选中文本时的样式。

```css
/* 自定义文本选中颜色 */
::selection {
  background: #1a73e8;
  color: #fff;
}

/* 代码块选中色 */
code::selection {
  background: #ffab40;
  color: #000;
}
```

> 注意：`::selection` 中只能使用 `color`、`background`、`text-shadow`、`cursor` 等少数属性。

## 优先级计算

选择器的优先级（Specificity）用四位表示：`inline, ID, class/pseudo-class/attribute, element/pseudo-element`。

| 选择器类型 | 示例 | 权重 |
| --- | --- | --- |
| 内联样式 | `style="color:red"` | 1,0,0,0 |
| ID 选择器 | `#header` | 0,1,0,0 |
| 类/伪类/属性 | `.btn`、`:hover`、`[type="text"]` | 0,0,1,0 |
| 标签/伪元素 | `div`、`::before` | 0,0,0,1 |
| 通配符/组合器 | `*`、`>`、`+`、`~` | 0,0,0,0 |

```css
/* 优先级计算示例 */

#nav .item a:hover    /* 0,1,2,1 → ID + 类 + 伪类 + 标签 */
div.box p.text        /* 0,0,2,2 → 两个类 + 两个标签 */
a.link                /* 0,0,1,1 → 类 + 标签 */
div                   /* 0,0,0,1 → 标签 */
```

```css
/* 实际开发中的优先级陷阱 */

/* 这条规则优先级 (0,1,1) */
.nav a { color: gray; }

/* 这条规则优先级也是 (0,1,1)，但排在后面所以生效 */
.footer a { color: blue; }

/* 使用 !important 强制覆盖（不推荐） */
.override { color: red !important; }
```

> 注意：`!important` 可以无视优先级强制生效，但会破坏层叠机制的可预测性。如果发现自己在频繁使用 `!important`，通常意味着选择器结构需要重构。实际项目中应通过提高选择器特异性来解决优先级问题，而非依赖 `!important`。
