---
title: "Grid 布局"
description: "CSS Grid 是一种二维布局系统，可以同时控制行和列，适合构建复杂的页面结构。与 Flexbox 的一维排列互补，Grid 擅长宏观布局，Flex 擅长组件内部排列。"
---

# Grid 布局

CSS Grid 是一种二维布局系统，可以同时控制行和列，适合构建复杂的页面结构。与 Flexbox 的一维排列互补，Grid 擅长宏观布局，Flex 擅长组件内部排列。

<CssGridLayoutDemo />

## 基本概念

```css
.container {
  display: grid;         /* 块级 grid 容器 */
  display: inline-grid;  /* 行内 grid 容器 */
}
```

Grid 布局的核心概念包括：**网格线（grid line）**、**网格轨道（grid track）**、**网格单元（grid cell）**、**网格区域（grid area）**。

## 定义行列

### grid-template-columns / grid-template-rows

`grid-template-columns` 和 `grid-template-rows` 分别定义列和行的尺寸。

```css
/* 固定像素 */
.grid {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  grid-template-rows: 100px 200px;
  gap: 16px;
}
```

### fr 单位

`fr`（fraction）是 Grid 专用单位，表示剩余空间的份数。类似 Flex 中的 `flex-grow`。

```css
/* 三列：第一列 1fr，第二列 2fr，第三列 1fr */
.grid {
  grid-template-columns: 1fr 2fr 1fr;
  /* 第二列占剩余空间的 50%，第一和第三列各占 25% */
}

/* 固定列 + 自适应列 */
.grid {
  grid-template-columns: 250px 1fr;
  /* 侧边栏固定 250px，主内容区填满剩余空间 */
}

/* 三等分（等同于 1fr 1fr 1fr） */
.grid {
  grid-template-columns: repeat(3, 1fr);
}
```

### repeat() 函数

`repeat()` 简化重复定义，接受重复次数和轨道大小。

```css
/* 重复 4 次 1fr */
.grid {
  grid-template-columns: repeat(4, 1fr);
}

/* 实际场景：混合固定和弹性列 */
.grid {
  grid-template-columns: 200px repeat(3, 1fr) 100px;
}
```

### auto-fill 和 auto-fit

`auto-fill` 和 `auto-fit` 配合 `minmax()` 实现自适应列数，容器宽度变化时自动增减列数。

```css
/* 自动填充：尽可能多的列，每列最小 200px */
.grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* 自动适配：类似 auto-fill，但空轨道会折叠 */
.grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

> 注意：`auto-fill` 在容器空间足够时会保留空的轨道（即使没有内容），`auto-fit` 会把空轨道折叠为零宽度，让有内容的列拉伸填满。实际开发中 `auto-fit` 更常用。

### minmax() 函数

`minmax()` 定义轨道尺寸的范围，接受最小值和最大值。

```css
.grid {
  grid-template-rows: minmax(100px, auto);
  /* 行高最小 100px，最大随内容撑开 */
}

/* 实际场景：响应式卡片网格 */
.grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
```

## 网格线编号

Grid 网格线从 1 开始编号（也可以使用负数从末尾计数），用于精确定位项目的位置。

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: 80px 1fr 60px;
}

/* 通过网格线编号定位项目 */
.header {
  grid-column: 1 / 4;    /* 从第 1 条线到第 4 条线（跨越三列） */
  grid-row: 1;
}
.sidebar {
  grid-column: 1;
  grid-row: 2;
}
.main {
  grid-column: 2;
  grid-row: 2;
}
.footer {
  grid-column: 1 / -1;   /* -1 表示最后一条线，即跨越所有列 */
  grid-row: 3;
}
```

## grid-template-areas

`grid-template-areas` 通过命名区域来定义布局，语义清晰、直观。

```css
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 64px 1fr 48px;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}

/* 通过 grid-area 关联区域名 */
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

```html
<div class="layout">
  <header class="header">顶部导航</header>
  <aside class="sidebar">侧边栏</aside>
  <main class="main">主内容</main>
  <footer class="footer">底部</footer>
</div>
```

> 注意：区域名可以用 `.` 表示空单元格。区域必须形成矩形，不能是 L 形或不规则形状。`grid-template-areas` 在响应式设计中特别有用，配合媒体查询可以重排区域布局。

## 对齐方式

### 容器级对齐

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 200px);

  /* 项目在单元格内的水平对齐 */
  justify-items: stretch;   /* 默认：拉伸填满 | start | end | center */

  /* 项目在单元格内的垂直对齐 */
  align-items: stretch;     /* 默认：拉伸填满 | start | end | center */

  /* 整个网格在容器中的水平分布 */
  justify-content: start;   /* | end | center | space-between | space-around | space-evenly */

  /* 整个网格在容器中的垂直分布 */
  align-content: start;     /* | end | center | space-between | space-around | space-evenly */
}
```

### 项目级对齐

```css
.item {
  /* 单个项目覆盖 justify-items */
  justify-self: center;

  /* 单个项目覆盖 align-items */
  align-self: end;
}

/* 实际场景：网格中的图标居中 */
.icon-cell {
  justify-self: center;
  align-self: center;
}
```

## 隐式网格

当项目数量超出 `grid-template` 定义的显式网格时，浏览器会自动创建额外的行或列，称为隐式网格。

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* 只定义了列，没有定义行 */

  /* 控制隐式行的大小 */
  grid-auto-rows: 150px;

  /* 控制隐式列的大小 */
  grid-auto-columns: 1fr;

  /* 隐式网格的排列方向 */
  grid-auto-flow: row;          /* 默认：按行排列 */
  grid-auto-flow: column;       /* 按列排列 */
  grid-auto-flow: dense;        /* 尽量填满空洞 */
}
```

```css
/* 实际场景：瀑布流布局（通过 dense 填补空隙） */
.masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 80px;
  grid-auto-flow: dense;
  gap: 12px;
}

.masonry .item-wide { grid-column: span 2; }
.masonry .item-tall { grid-row: span 3; }
```

## 实际开发场景

### 响应式卡片网格

```css
/* 无媒体查询的响应式网格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* 每张卡片内部用 flex 排列 */
.card {
  display: flex;
  flex-direction: column;
}
.card-body {
  flex: 1;
}
```

### 杂志排版布局

```css
.magazine {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}
.magazine .featured { grid-column: 1 / 8; grid-row: 1 / 3; }
.magazine .sidebar  { grid-column: 8 / 13; }
.magazine .article  { grid-column: span 4; }
```

## 注意事项

1. **Grid 和 Flex 的选择**：二维布局用 Grid（同时控制行和列），一维排列用 Flex（单行或单列）。两者可以嵌套使用。
2. **gap 属性共享**：Grid 和 Flex 都支持 `gap` 属性，但 Grid 的 gap 不会在边缘产生间距，仅在轨道之间。
3. **grid 与 float**：Grid 容器中 `float`、`clear`、`vertical-align` 无效。
4. **子元素 display**：Grid 的子元素的 `display` 属性仍然有效，子元素也可以是 grid 或 flex 容器。
