# Flex 布局

Flexbox（弹性盒布局）是一种一维布局模型，专为在一条轴线上排列和对齐元素而设计。它解决了传统布局中垂直居中困难、等高列难以实现等问题。

<CssFlexboxDemo />

## 基本概念

Flex 布局包含**容器（flex container）**和**项目（flex item）**两个角色。设置 `display: flex` 的元素成为容器，其直接子元素自动成为项目。

```css
.container {
  display: flex;         /* 块级 flex 容器 */
  display: inline-flex;  /* 行内 flex 容器 */
}
```

> 注意：设为 flex 容器后，子元素的 `float`、`clear`、`vertical-align` 属性将失效。

## 容器属性

### flex-direction

`flex-direction` 定义主轴方向，决定项目的排列方向。取值有 `row`（默认，水平从左到右）、`row-reverse`、`column`（垂直从上到下）、`column-reverse`。

```css
.container {
  flex-direction: row;            /* 默认：水平排列 */
  flex-direction: column;         /* 垂直排列 */
  flex-direction: row-reverse;    /* 水平反向排列 */
}
```

### justify-content

`justify-content` 定义项目在**主轴**上的对齐方式。取值有 `flex-start`（默认）、`flex-end`、`center`、`space-between`（两端对齐）、`space-around`（等间距）、`space-evenly`（完全等分）。

```css
/* 导航栏：logo 在左，菜单在右 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 卡片居中 */
.card-container {
  display: flex;
  justify-content: center;
}

/* 实际场景：按钮组右对齐 */
.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

### align-items

`align-items` 定义项目在**交叉轴**上的对齐方式。取值有 `stretch`（默认，拉伸填满）、`flex-start`、`flex-end`、`center`、`baseline`（基线对齐）。

```css
/* 经典垂直居中 */
.center-box {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

/* 实际场景：列表图标和文字对齐 */
.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}
```

### flex-wrap

`flex-wrap` 控制项目是否换行。默认值 `nowrap` 不换行，项目会被压缩；`wrap` 允许换行。

```css
/* 标签列表自动换行 */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 实际场景：商品网格 */
.product-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.product-grid > .card {
  flex: 0 0 calc(25% - 12px);  /* 四列布局 */
}
```

### gap

`gap` 定义项目之间的间距，替代传统的 margin 方案。分为 `row-gap` 和 `column-gap`。

```css
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;            /* 行列间距都是 16px */
  row-gap: 24px;        /* 行间距 24px */
  column-gap: 16px;     /* 列间距 16px */
}
```

> 注意：`gap` 属性不会在容器边缘产生间距，只在项目之间。Chrome 84+ 支持 flex 的 gap，老版本需要通过 margin 或 padding 模拟。

### align-content

`align-content` 定义多行项目在交叉轴上的分布方式（仅在 `flex-wrap: wrap` 且有多行时生效）。取值与 `justify-content` 类似。

```css
.container {
  display: flex;
  flex-wrap: wrap;
  height: 400px;
  align-content: space-between;  /* 多行之间等距分布 */
}
```

## 项目属性

### flex-grow / flex-shrink / flex-basis

这三个属性共同决定项目在主轴上如何分配空间。`flex` 是它们的简写属性。

```css
/* flex 简写：flex-grow flex-shrink flex-basis */
.item {
  flex: 0 1 auto;   /* 默认值：不放大、可缩小、基准为自身大小 */
  flex: 1;          /* 等同于 flex: 1 1 0%，等分剩余空间 */
  flex: none;       /* 等同于 flex: 0 0 auto，完全不伸缩 */
  flex: auto;       /* 等同于 flex: 1 1 auto */
}

/* 实际场景：左侧固定宽度，右侧自适应 */
.sidebar { flex: 0 0 250px; }
.main    { flex: 1; }

/* 实际场景：三栏等宽 */
.col { flex: 1; }

/* 实际场景：中间列占两倍空间 */
.col-1 { flex: 1; }
.col-2 { flex: 2; }
.col-3 { flex: 1; }
```

> 注意：`flex-basis` 的默认值是 `auto`（参考元素自身的 width/height），不是 `0`。当设置 `flex: 1` 时，实际等同于 `flex: 1 1 0%`，项目从零开始分配空间。如果希望项目以自身内容为基准参与分配，应使用 `flex: auto`。

### align-self

`align-self` 允许单个项目覆盖容器的 `align-items` 设置。

```css
.container {
  display: flex;
  align-items: flex-start;  /* 默认顶部对齐 */
}

/* 让最后一个项目底部对齐 */
.container > .item:last-child {
  align-self: flex-end;
}

/* 实际场景：表单中让提交按钮撑满高度 */
.form-row {
  display: flex;
  align-items: center;
}
.form-row > .submit-btn {
  align-self: stretch;
}
```

### order

`order` 定义项目的排列顺序，默认为 0，值越小越靠前。

```css
/* 实际场景：移动端优先，调整视觉顺序 */
.nav-home    { order: 2; }
.nav-content { order: 3; }
.nav-menu    { order: 1; }  /* 移到最前面 */

/* 实际场景：促销商品置顶 */
.product-card.featured {
  order: -1;
}
```

## 常见布局模式

### 水平垂直居中

```css
/* 最简洁的居中方案 */
.parent {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

/* 使用 margin: auto 也能实现 */
.parent {
  display: flex;
}
.child {
  margin: auto;
}
```

### 圣杯布局（Holy Grail）

```html
<div class="holy-grail">
  <header>Header</header>
  <div class="body">
    <nav>Nav</nav>
    <main>Main Content</main>
    <aside>Aside</aside>
  </div>
  <footer>Footer</footer>
</div>
```

```css
.holy-grail {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.holy-grail .body {
  display: flex;
  flex: 1;           /* 主体区填满剩余空间 */
}
.holy-grail nav    { flex: 0 0 200px; order: -1; }
.holy-grail main   { flex: 1; }
.holy-grail aside  { flex: 0 0 200px; }
.holy-grail header,
.holy-grail footer { flex: 0 0 60px; }
```

### 粘性底部（Footer 始终在底部）

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.page .content {
  flex: 1;  /* 内容区撑满，footer 被推到底部 */
}
.page footer {
  flex-shrink: 0;
}
```

### 等高列

```css
.row {
  display: flex;
}
.col {
  flex: 1;
  /* 两列自动等高，无需设置固定高度 */
}
```

## 注意事项

1. **flex 容器的百分比高度**：子元素使用 `height: 100%` 前，父容器链上必须有明确高度，或者使用 `flex: 1` 替代百分比高度。
2. **min-width 默认值**：flex 项目的 `min-width` 默认为 `auto`（不是 0），这意味着项目内容不会被压缩到比内容更窄。需要手动设 `min-width: 0` 来允许收缩。
3. **flex: 1 不等于 width: 100%**：`flex: 1` 按比例分配剩余空间，不会超出容器；`width: 100%` 加上 padding 可能溢出。
4. **文本溢出**：flex 项目中的长文本需要配合 `overflow: hidden` 和 `text-overflow: ellipsis` 使用，同时父元素需设 `min-width: 0`。

```css
/* flex 项目中文字溢出省略 */
.flex-item {
  min-width: 0;           /* 关键：允许收缩到内容宽度以下 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```
