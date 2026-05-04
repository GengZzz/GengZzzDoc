# 媒体查询

媒体查询（Media Queries）根据设备特性（如屏幕宽度、分辨率、方向等）应用不同的样式，是响应式设计的核心技术。

## 基本语法

```css
@media 媒体类型 and (媒体特性) {
  /* 满足条件时生效的样式 */
}
```

### 媒体类型

| 值 | 说明 |
| --- | --- |
| `all` | 所有设备（默认） |
| `screen` | 屏幕设备（最常用） |
| `print` | 打印模式 |
| `speech` | 屏幕阅读器 |

```css
/* 仅屏幕设备生效 */
@media screen {
  body { font-family: 'Inter', sans-serif; }
}

/* 打印样式 */
@media print {
  .no-print { display: none; }
  body { color: #000; font-size: 12pt; }
  a[href]::after { content: " (" attr(href) ")"; }
}
```

### 常用媒体特性

| 特性 | 说明 |
| --- | --- |
| `width` / `min-width` / `max-width` | 视口宽度 |
| `height` / `min-height` / `max-height` | 视口高度 |
| `orientation` | `portrait`（竖屏）/ `landscape`（横屏） |
| `aspect-ratio` | 视口宽高比 |
| `resolution` | 设备分辨率 |
| `prefers-color-scheme` | 用户主题偏好 |
| `prefers-reduced-motion` | 用户减少动画偏好 |

## 断点策略

### 常见断点

```css
/* 移动优先（min-width）：从小到大 */
@media (min-width: 576px)  { /* 小平板 */ }
@media (min-width: 768px)  { /* 平板 */ }
@media (min-width: 992px)  { /* 小桌面 */ }
@media (min-width: 1200px) { /* 桌面 */ }
@media (min-width: 1400px) { /* 大桌面 */ }
```

> 注意：断点应该基于内容而非设备。当布局在某个宽度"撑不住"或"太空"时，就是加断点的时机。不要为每一款设备单独设置断点。

### 桌面优先（max-width）

```css
/* 桌面优先（max-width）：从大到小 */
@media (max-width: 1199px) { /* 小桌面 */ }
@media (max-width: 991px)  { /* 平板 */ }
@media (max-width: 767px)  { /* 手机横屏 */ }
@media (max-width: 575px)  { /* 手机竖屏 */ }
```

## 移动优先

移动优先（Mobile First）是一种开发策略：先写移动端样式，再用 `min-width` 媒体查询逐步适配大屏。

```css
/* 基础样式（移动端） */
.container {
  padding: 16px;
  font-size: 14px;
}

.nav {
  flex-direction: column;
}

.content-grid {
  grid-template-columns: 1fr;
}

/* 平板及以上 */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    font-size: 16px;
  }

  .nav {
    flex-direction: row;
  }

  .content-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 桌面及以上 */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .content-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

> 注意：移动优先的优势是移动端样式作为"兜底"，代码量通常比桌面端少，加载更快。桌面端样式是渐进增强的。

## 组合查询

```css
/* and：同时满足 */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 只在 768px - 1023px 区间生效（平板） */
}

/* ,（逗号）：或关系 */
@media (max-width: 575px), (orientation: portrait) {
  /* 手机竖屏或小宽度时生效 */
}

/* not：取反 */
@media not all and (min-width: 768px) {
  /* 小于 768px 时生效 */
}

/* only：仅在支持媒体查询的浏览器中生效 */
@media only screen and (min-width: 768px) {
  /* 旧浏览器会忽略 only 关键字 */
}
```

## 容器查询（Container Queries）

容器查询根据父容器的尺寸而非视口尺寸来应用样式，解决了组件在不同容器中需要不同布局的问题。

### @container 语法

```css
/* 1. 定义查询容器 */
.card-wrapper {
  container-name: card;
  container-type: inline-size;
  /* container-type: inline-size 表示查询宽度 */
}

/* 2. 使用容器查询 */
@container card (min-width: 400px) {
  .card {
    flex-direction: row;
  }
  .card-image {
    width: 200px;
    flex-shrink: 0;
  }
}

@container card (max-width: 399px) {
  .card {
    flex-direction: column;
  }
  .card-image {
    width: 100%;
  }
}

/* 简写 */
.card-wrapper {
  container: card / inline-size;
}
```

```html
<!-- 同一个卡片组件放在不同宽度的容器中，自动适配布局 -->
<div style="width: 600px;">
  <div class="card-wrapper">
    <div class="card"><!-- 横向布局 --></div>
  </div>
</div>
<div style="width: 300px;">
  <div class="card-wrapper">
    <div class="card"><!-- 纵向布局 --></div>
  </div>
</div>
```

> 注意：容器查询解决了组件化开发中的一个核心痛点——组件应该根据自身所在容器的大小来决定布局，而非依赖全局视口。这使得组件在任何上下文中都能正确展示。Chrome 105+、Firefox 110+、Safari 16+ 支持。

## 用户偏好媒体查询

```css
/* 深色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a2e;
    --text-primary: #e0e0e0;
  }
  body {
    background: var(--bg-primary);
    color: var(--text-primary);
  }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* 高对比度 */
@media (prefers-contrast: high) {
  body { border-color: #000; }
}

/* 实际场景：暗黑模式按钮 */
.btn-primary {
  background: #1a73e8;
  color: #fff;
}
@media (prefers-color-scheme: dark) {
  .btn-primary {
    background: #8ab4f8;
    color: #202124;
  }
}
```

## 注意事项

1. **min-width vs max-width**：`min-width` 是"大于等于"，`max-width` 是"小于等于"。两者在临界值上都生效，要注意避免冲突。通常一种策略（移动优先或桌面优先）贯穿整个项目。
2. **媒体查询不能嵌套**：CSS 原生不支持媒体查询嵌套。使用预处理器（Sass/Less）或原生 CSS 嵌套（Chrome 120+）可以实现嵌套写法。
3. **link 标签中的媒体查询**：可以在 `<link>` 标签中通过 media 属性按条件加载 CSS 文件，但这不是"不满足条件就不加载"——文件仍会被下载，只是不应用样式。
4. **容器查询优先级**：容器查询和媒体查询可以混合使用。组件内部用容器查询，页面级别用媒体查询。
