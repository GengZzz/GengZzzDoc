---
title: "响应式设计"
description: "响应式设计（Responsive Design）让网页能够自适应不同屏幕尺寸和设备，提供一致的用户体验。核心技术包括弹性单位、流体布局、响应式图片等。"
---

# 响应式设计

响应式设计（Responsive Design）让网页能够自适应不同屏幕尺寸和设备，提供一致的用户体验。核心技术包括弹性单位、流体布局、响应式图片等。

## 相对单位

### rem（相对于根元素字体大小）

`rem`（root em）相对于 `<html>` 元素的 `font-size`。常用于实现整体缩放的响应式方案。

```css
/* 设置根字体大小 */
html {
  font-size: 16px;  /* 浏览器默认值 */
}

/* 使用 rem */
.title {
  font-size: 2rem;    /* 32px */
  margin-bottom: 1rem; /* 16px */
}

/* 实际场景：响应式根字体（clamp 方案） */
html {
  font-size: clamp(14px, 1.5vw, 18px);
  /* 最小 14px，理想值为视口宽度的 1.5%，最大 18px */
}

/* 实际场景：基于设计稿换算（750px 设计稿） */
/* 设计稿上 24px → 24 / 37.5 = 0.64rem */
/* 其中 html { font-size: 100/375 * 100vw = 26.67vw } */
```

### em（相对于父元素字体大小）

`em` 相对于当前元素（或父元素）的 `font-size`。用于 `font-size` 时相对于父元素，用于其他属性时相对于自身字体大小。

```css
.parent {
  font-size: 20px;
}
.child {
  font-size: 1.2em;     /* 24px（相对于父元素） */
  padding: 0.5em;       /* 12px（相对于自身 font-size: 24px） */
  margin-bottom: 0.8em; /* 19.2px（相对于自身 font-size: 24px） */
}
```

> 注意：`em` 的嵌套会产生累积效应（`font-size: 1.2em` 内部再设 `font-size: 1.2em` 会变成 1.44 倍）。需要避免累积时使用 `rem`。

### vw / vh（相对于视口）

`vw` 和 `vh` 分别是视口宽度和高度的 1%。

```css
/* 全屏容器 */
.hero {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 实际场景：响应式字体（纯 CSS 方案） */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
  /* 最小 1.5rem，理想为视口宽度 4%，最大 3rem */
}

/* 实际场景：移动端顶部安全区域 */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
  /* 配合 viewport-fit=cover 使用 */
}
```

### vmin / vmax

`vmin` 取 `vw` 和 `vh` 中较小的值，`vmax` 取较大的值。

```css
/* 实际场景：正方形响应式元素 */
.square {
  width: 50vmin;
  height: 50vmin;
  /* 在横屏和竖屏中都保持正方形，且不超过较短边的 50% */
}
```

### 百分比

百分比单位的参考对象因属性而异：

```css
/* width/height：相对于父元素的 content 区域 */
.child {
  width: 50%;        /* 父元素宽度的 50% */
}

/* padding/margin：相对于父元素的宽度（包括 padding-top/bottom） */
.responsive-padding {
  padding-top: 56.25%;  /* 16:9 比例的容器 */
  position: relative;
}

/* font-size：相对于父元素的 font-size */
.small { font-size: 80%; }

/* border-radius：相对于元素自身尺寸 */
.circle { border-radius: 50%; }
```

## clamp() 函数

`clamp(min, preferred, max)` 设置属性值的范围，浏览器在最小值和最大值之间选择最佳值。

```css
/* 响应式字体 */
h1 {
  font-size: clamp(1.5rem, 3vw + 0.5rem, 3rem);
}

/* 响应式容器宽度 */
.container {
  width: clamp(320px, 90%, 1200px);
  margin: 0 auto;
}

/* 响应式间距 */
.section {
  padding: clamp(24px, 5vw, 80px) clamp(16px, 4vw, 48px);
}

/* 实际场景：卡片自适应宽度 */
.card {
  flex: 1 1 clamp(280px, 30%, 400px);
}
```

## 响应式图片

### 使用 max-width

```css
/* 图片最大不超过容器宽度 */
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### 使用 srcset 和 sizes

```html
<!-- 根据屏幕宽度加载不同分辨率的图片 -->
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg 400w,
    photo-800.jpg 800w,
    photo-1200.jpg 1200w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="响应式图片"
/>
```

### 使用 picture 元素

```html
<!-- 不同屏幕加载不同裁剪的图片 -->
<picture>
  <source media="(min-width: 1024px)" srcset="hero-desktop.jpg" />
  <source media="(min-width: 768px)" srcset="hero-tablet.jpg" />
  <img src="hero-mobile.jpg" alt="响应式英雄图" />
</picture>

<!-- 现代图片格式降级 -->
<picture>
  <source type="image/avif" srcset="photo.avif" />
  <source type="image/webp" srcset="photo.webp" />
  <img src="photo.jpg" alt="格式降级" />
</picture>
```

### aspect-ratio 保持比例

```css
/* 固定宽高比 */
.video-wrapper {
  aspect-ratio: 16 / 9;
  width: 100%;
  background: #000;
}

/* 实际场景：响应式卡片图片 */
.card-image {
  aspect-ratio: 4 / 3;
  object-fit: cover;
  width: 100%;
}
```

## 流体排版

流体排版让字号和行高随视口平滑变化，而非断点跳变。

```css
/* clamp 流体排版方案 */
:root {
  --fs-sm:   clamp(0.8rem, 0.17vw + 0.76rem, 0.89rem);
  --fs-base: clamp(1rem, 0.34vw + 0.91rem, 1.19rem);
  --fs-md:   clamp(1.25rem, 0.61vw + 1.1rem, 1.58rem);
  --fs-lg:   clamp(1.56rem, 1vw + 1.31rem, 2.11rem);
  --fs-xl:   clamp(1.95rem, 1.56vw + 1.56rem, 2.81rem);
  --fs-2xl:  clamp(2.44rem, 2.38vw + 1.85rem, 3.75rem);
}

body    { font-size: var(--fs-base); line-height: 1.6; }
h1      { font-size: var(--fs-2xl); }
h2      { font-size: var(--fs-xl); }
h3      { font-size: var(--fs-lg); }
small   { font-size: var(--fs-sm); }
```

> 注意：`clamp()` 在所有现代浏览器中支持良好（Chrome 79+、Firefox 75+、Safari 13.1+）。对于老浏览器，可以提供固定值作为降级：`font-size: 16px; font-size: clamp(...)`。

## 实际响应式布局示例

```css
/* 响应式导航栏 */
.navbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.nav-links {
  display: none;  /* 移动端隐藏 */
}

@media (min-width: 768px) {
  .nav-links {
    display: flex;
    gap: 24px;
  }
  .hamburger {
    display: none;  /* 桌面端隐藏汉堡菜单 */
  }
}

/* 响应式网格 */
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;  /* 移动端：单列 */
}

@media (min-width: 640px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

/* 或者用 auto-fit 无媒体查询方案 */
.grid-fluid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
```

## 注意事项

1. **rem vs em vs vw**：`rem` 适合全局统一缩放（字体、间距），`vw` 适合视口相关的尺寸（全屏宽度、流体字号），`em` 适合组件内部自适应（按钮内间距）。
2. **不要用固定像素做布局**：`width: 1200px` 在小屏上会溢出。使用 `max-width` 或百分比配合 `max-width`。
3. **移动端 300ms 延迟**：旧版移动端浏览器有 300ms 点击延迟（等待双击缩放判断）。设置 `<meta name="viewport" content="width=device-width">` 已在现代浏览器中消除此延迟。
4. **测试工具**：使用 Chrome DevTools 的设备模拟器测试响应式效果，但不能完全替代真机测试。
