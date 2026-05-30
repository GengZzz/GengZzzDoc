---
title: "排版与文本"
description: "CSS3 提供了丰富的排版和文本控制能力，包括自定义字体、文字特效、多列布局、书写模式等。"
---

# 排版与文本

CSS3 提供了丰富的排版和文本控制能力，包括自定义字体、文字特效、多列布局、书写模式等。

## @font-face 自定义字体

`@font-face` 允许加载和使用自定义字体文件，摆脱系统字体限制。

```css
/* 基础用法 */
@font-face {
  font-family: 'MyFont';
  src: url('myfont.woff2') format('woff2'),
       url('myfont.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;  /* 字体加载策略 */
}

/* 可变字体（Variable Font） */
@font-face {
  font-family: 'Inter';
  src: url('Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;  /* 支持的字重范围 */
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'MyFont', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

### font-display 策略

`font-display` 控制字体加载期间的显示行为。

```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;       /* 先显示后备字体，加载完后交换（最常用） */
  font-display: fallback;   /* 短阻塞期 + 短交换期 */
  font-display: optional;   /* 极短阻塞期，不保证交换 */
  font-display: block;      /* 长阻塞期（不推荐用于正文） */
}
```

> 注意：`woff2` 是目前最优的字体格式，压缩率比 `woff` 高约 30%。实际项目中推荐只加载需要的字重和字形子集（subsetting），减少文件大小。Google Fonts 会自动处理这些。

## 字体相关属性

### font-size

```css
/* 绝对值 */
.text-px   { font-size: 16px; }
.text-rem  { font-size: 1rem; }      /* 相对于根元素 */
.text-em   { font-size: 1.5em; }     /* 相对于父元素 */

/* 相对值 */
.text-larger  { font-size: larger; }  /* 比父元素大一级 */
.text-smaller { font-size: smaller; }

/* 流体字号（响应式） */
.fluid-text {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
}
```

### font-weight

```css
.fw-100 { font-weight: 100; }  /* Thin */
.fw-300 { font-weight: 300; }  /* Light */
.fw-400 { font-weight: 400; }  /* Regular（正常） */
.fw-500 { font-weight: 500; }  /* Medium */
.fw-600 { font-weight: 600; }  /* Semi-Bold */
.fw-700 { font-weight: 700; }  /* Bold */
.fw-900 { font-weight: 900; }  /* Black */
```

### line-height

```css
/* 无单位值（推荐）：相对 font-size 的倍数 */
body {
  line-height: 1.6;  /* 适合正文阅读 */
}

/* 固定值 */
.tight { line-height: 1.2; }  /* 适合标题 */
.loose { line-height: 2; }    /* 适合松散排版 */

/* 实际场景：单行文本垂直居中 */
.button {
  height: 40px;
  line-height: 40px;  /* 等于 height 实现垂直居中 */
}
```

> 注意：`line-height` 使用无单位值（如 `1.6`）是最佳实践，因为它会根据当前 `font-size` 自动计算。使用固定单位（如 `24px`）可能导致字号变化后行高不协调。

### letter-spacing 和 word-spacing

```css
/* 字间距 */
.spaced {
  letter-spacing: 0.1em;  /* 适合大写标题 */
}

.tight {
  letter-spacing: -0.02em;  /* 负值缩小字距 */
}

/* 词间距（对英文有效） */
.word-spaced {
  word-spacing: 0.2em;
}
```

## 文本效果

### text-overflow

`text-overflow` 控制文本溢出时的显示方式。

```css
/* 单行省略号（最常用） */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 实际场景：表格单元格文本截断 */
.table-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 多行省略号

CSS 没有原生的多行省略属性，但可以用 `-webkit-line-clamp` 实现。

```css
/* 多行省略（3 行） */
.clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 实际场景：商品描述截断 */
.product-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}
```

> 注意：`-webkit-line-clamp` 虽然是 WebKit 前缀属性，但已被所有现代浏览器支持（Chrome、Firefox、Safari、Edge）。

### text-shadow

```css
/* 文字阴影 */
.shadow-text {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 发光效果 */
.glow {
  text-shadow: 0 0 10px #1a73e8, 0 0 20px #1a73e8;
}

/* 凹陷效果 */
.inset {
  text-shadow: 1px 1px 1px #fff, -1px -1px 1px #000;
}
```

### text-decoration（CSS3 增强）

```css
/* 下划线样式 */
.link {
  text-decoration: underline;
  text-decoration-color: #1a73e8;
  text-decoration-thickness: 2px;
  text-decoration-style: wavy;  /* solid | double | dotted | dashed | wavy */
  text-underline-offset: 4px;   /* 下划线与文字的间距 */
}

/* 实际场景：hover 时出现下划线 */
a {
  text-decoration: none;
  text-underline-offset: 3px;
}
a:hover {
  text-decoration: underline;
  text-decoration-color: currentColor;
  text-decoration-thickness: 2px;
}
```

### writing-mode

`writing-mode` 控制文本的书写方向。

```css
/* 水平排列（默认） */
.horizontal-tb {
  writing-mode: horizontal-tb;  /* 从左到右，从上到下 */
}

/* 垂直排列 */
.vertical-rl {
  writing-mode: vertical-rl;    /* 从上到下，从右到左（传统中文竖排） */
}

.vertical-lr {
  writing-mode: vertical-lr;    /* 从上到下，从左到右 */
}

/* 实际场景：侧边竖排标题 */
.vertical-title {
  writing-mode: vertical-rl;
  text-orientation: upright;    /* 字符保持正立 */
  letter-spacing: 0.2em;
  font-weight: 600;
}
```

> 注意：`writing-mode` 改变后，`width`/`height` 的含义也会改变——`width` 变成垂直方向的尺寸。这会影响布局计算。

## 多列布局

### column-count / column-width

```css
/* 指定列数 */
.multi-col {
  column-count: 3;
  column-gap: 24px;
  column-rule: 1px solid #e0e0e0;  /* 列之间的分隔线 */
}

/* 指定列宽（自动决定列数） */
.multi-col-fluid {
  column-width: 250px;
  column-gap: 24px;
}

/* 简写 */
.multi-col-shorthand {
  columns: 3 250px;  /* 最多 3 列，每列最小 250px */
}
```

### 控制元素跨列

```css
/* 标题跨所有列 */
.multi-col h2 {
  column-span: all;
  margin-bottom: 16px;
}

/* 防止元素被分割到两列 */
.multi-col figure {
  break-inside: avoid;
  page-break-inside: avoid;  /* 兼容写法 */
}
```

> 注意：多列布局适合文本密集型内容（如文章、新闻列表），不适合复杂布局。复杂布局应使用 Flex 或 Grid。多列布局中图片可能被截断，需配合 `break-inside: avoid`。

## hyphens（断字）

```css
/* 自动断字（需要 lang 属性） */
.auto-hyphens {
  hyphens: auto;
  word-break: break-word;  /* 兜底方案 */
}
```

```html
<p lang="en" class="auto-hyphens">
  Supercalifragilisticexpialidocious is a very long word.
</p>
```

## 实际开发中的排版系统

```css
/* 排版系统设计令牌 */
:root {
  --font-sans: 'Inter', -apple-system, system-ui, sans-serif;
  --font-mono: 'Fira Code', 'Cascadia Code', monospace;
  --font-serif: 'Noto Serif SC', 'Source Han Serif', serif;

  --leading-tight: 1.25;
  --leading-normal: 1.6;
  --leading-relaxed: 1.75;

  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
}

body {
  font-family: var(--font-sans);
  font-size: clamp(1rem, 0.5vw + 0.875rem, 1.125rem);
  line-height: var(--leading-normal);
  letter-spacing: var(--tracking-normal);
  -webkit-font-smoothing: antialiased;     /* macOS 字体平滑 */
  -moz-osx-font-smoothing: grayscale;
}

code, pre {
  font-family: var(--font-mono);
}

/* 文章排版 */
.prose h1 { font-size: 2.25rem; line-height: var(--leading-tight); margin-bottom: 1rem; }
.prose h2 { font-size: 1.5rem;  line-height: var(--leading-tight); margin: 2rem 0 0.75rem; }
.prose p  { margin-bottom: 1.25rem; }
.prose p + p { text-indent: 2em; margin-top: 0; }  /* 首行缩进 */
.prose blockquote {
  border-left: 3px solid #1a73e8;
  padding-left: 1rem;
  color: #555;
  font-style: italic;
}
```
