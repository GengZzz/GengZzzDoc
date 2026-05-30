---
title: "盒模型"
description: "盒模型（Box Model）是 CSS 布局的基石，每个 HTML 元素都被渲染为一个矩形盒子，由内到外依次是内容区（content）、内边距（padding）、边框（border）、外边距（margin）。"
---

# 盒模型

盒模型（Box Model）是 CSS 布局的基石，每个 HTML 元素都被渲染为一个矩形盒子，由内到外依次是内容区（content）、内边距（padding）、边框（border）、外边距（margin）。

<CssBoxModelDemo />

## 标准盒模型 vs IE 盒模型

### content-box（标准盒模型）

`content-box` 是 CSS 的默认盒模型，`width` 和 `height` 只定义内容区的尺寸，padding 和 border 在宽度之外额外增加。

```css
.box {
  width: 200px;
  padding: 20px;
  border: 5px solid #333;
  /* 实际占用宽度 = 200 + 20*2 + 5*2 = 250px */
}
```

### border-box（IE 盒模型）

`border-box` 中 `width` 和 `height` 包含了 content + padding + border，内容区会自动收缩。

```css
.box {
  box-sizing: border-box;
  width: 200px;
  padding: 20px;
  border: 5px solid #333;
  /* 实际占用宽度 = 200px，内容区宽度 = 200 - 20*2 - 5*2 = 150px */
}
```

### box-sizing 属性

`box-sizing` 决定元素使用哪种盒模型计算方式。取值有 `content-box`（默认）和 `border-box`。

```css
/* 全局重置：所有元素使用 border-box（推荐） */
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

> 注意：在实际项目中，绝大多数团队都会全局设置 `box-sizing: border-box`，因为 border-box 更符合直觉——设定多宽就是多宽，不会因为加了 padding 导致布局溢出。Bootstrap、Tailwind 等主流框架都采用 border-box。

## 内边距 padding

`padding` 定义内容区与边框之间的空间，不能为负值，百分比值相对于**父元素的宽度**计算（不是高度）。

```css
/* 四个方向分别设置 */
.card {
  padding-top: 16px;
  padding-right: 24px;
  padding-bottom: 16px;
  padding-left: 24px;
}

/* 简写：上 右 下 左（顺时针） */
.card {
  padding: 16px 24px;        /* 上下 16px，左右 24px */
}

/* 实际场景：响应式内边距 */
.container {
  padding: 0 clamp(16px, 5vw, 48px);
}
```

> 注意：padding 会继承背景色但不会继承其他样式。给 `<a>` 等内联元素设置 padding 时，上下 padding 会撑开视觉空间但不影响行高计算，可能导致行高不一致。

## 外边距 margin

`margin` 定义元素与其他元素之间的间距，可以为负值。auto 值可用于水平居中。

```css
/* 水平居中 */
.container {
  width: 1200px;
  margin: 0 auto;
}

/* 负 margin：元素向外扩展 */
.overlap {
  margin-top: -20px;  /* 向上偏移 20px */
}

/* 实际场景：卡片之间的间距 */
.card + .card {
  margin-top: 24px;
}
```

## 外边距合并（Margin Collapsing）

外边距合并是 CSS 中最容易踩坑的规则之一。在**垂直方向**上，相邻的 margin 会合并为一个 margin，取两者中的较大值。

### 合并的三种情况

```css
/* 情况 1：相邻兄弟元素 */
.box-a { margin-bottom: 30px; }
.box-b { margin-top: 20px; }
/* 两者之间的间距是 30px（取较大值），不是 50px */

/* 情况 2：父元素与第一个/最后一个子元素 */
.parent { margin-top: 20px; }
.parent > .child:first-child { margin-top: 30px; }
/* 父元素的顶部间距是 30px（取较大值），
   子元素的 margin "穿透" 了父元素 */

/* 情况 3：空块元素自身的上下 margin 合并 */
.empty-block {
  margin-top: 20px;
  margin-bottom: 30px;
  /* 自身上下 margin 合并为 30px */
}
```

### 阻止外边距合并

```css
/* 方法 1：创建 BFC（见下文） */
.parent {
  overflow: hidden;  /* 或 auto */
}

/* 方法 2：使用 padding 代替 */
.parent {
  padding-top: 1px;  /* 加一个极小的 padding 阻止合并 */
}

/* 方法 3：使用 flex/grid 布局 */
.parent {
  display: flex;
  flex-direction: column;
}
/* flex/grid 容器的子元素不会发生 margin 合并 */
```

> 注意：外边距合并在**水平方向不会发生**，只发生在垂直方向。浮动元素、绝对定位元素、inline-block 元素的 margin 也不会合并。

## BFC（Block Formatting Context）

BFC（块级格式化上下文）是一个独立的渲染区域，内部元素的布局不会影响外部，外部也不会影响内部。

### 触发 BFC 的条件

```css
/* 以下任一条件都会创建新的 BFC */
.bfc {
  overflow: hidden;       /* 最常用 */
  overflow: auto;
  display: flow-root;     /* 专门为创建 BFC 设计的值 */
  float: left;            /* 不推荐 */
  position: absolute;     /* 不推荐 */
  display: inline-block;  /* 不推荐 */
  display: flex;          /* flex 容器自带 BFC */
  display: grid;          /* grid 容器自带 BFC */
}
```

### BFC 的实际用途

```css
/* 用途 1：清除浮动（父元素包含浮动子元素） */
.float-parent {
  overflow: hidden;  /* 创建 BFC，父元素会包裹住浮动子元素 */
}

/* 用途 2：阻止外边距合并 */
.prevent-collapse {
  overflow: hidden;
}

/* 用途 3：阻止被浮动元素覆盖 */
.main {
  overflow: hidden;  /* 创建 BFC，不与左侧浮动元素重叠 */
}
```

```html
<!-- 实际场景：两栏布局，右侧不被左侧浮动元素覆盖 -->
<div class="sidebar" style="float:left; width:200px;">侧边栏</div>
<div class="main" style="overflow:hidden;">主内容区不会被覆盖</div>
```

> 注意：`display: flow-root` 是专门为创建 BFC 设计的值，它不会像 `overflow: hidden` 那样隐藏溢出内容，是语义最准确的 BFC 触发方式。但兼容性略差（Chrome 58+），实际项目中 `overflow: hidden` 仍是主流选择。

## 实际开发中的盒模型实践

```css
/* 全局盒模型重置（推荐放在 CSS 文件最顶部） */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 卡片组件 */
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
  /* border-box 下，width: 300px 就是最终宽度 */
  width: 300px;
}

/* 表单输入框占满容器宽度 */
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  /* border-box 确保 100% 宽度包含 padding 和 border */
  box-sizing: border-box;
}
```
