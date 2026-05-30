---
title: "背景与边框"
description: "CSS3 大幅扩展了背景和边框的能力，包括渐变、多背景图、背景裁剪、圆角边框、阴影效果等。"
---

# 背景与边框

CSS3 大幅扩展了背景和边框的能力，包括渐变、多背景图、背景裁剪、圆角边框、阴影效果等。

## 渐变

### linear-gradient（线性渐变）

`linear-gradient` 沿一条直线创建颜色过渡效果。接受方向参数和至少两个颜色节点。

```css
/* 从上到下（默认） */
.gradient-down {
  background: linear-gradient(#1a73e8, #0d47a1);
}

/* 指定方向 */
.gradient-right {
  background: linear-gradient(to right, #1a73e8, #0d47a1);
}

/* 对角线方向 */
.gradient-diagonal {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

/* 多色渐变 + 颜色节点位置 */
.gradient-multi {
  background: linear-gradient(
    90deg,
    #ff6b6b 0%,
    #feca57 30%,
    #48dbfb 60%,
    #ff9ff3 100%
  );
}

/* 实际场景：渐变按钮 */
.btn-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 12px 32px;
  border-radius: 6px;
  cursor: pointer;
}

/* 实际场景：文字渐变 */
.gradient-text {
  background: linear-gradient(90deg, #f7971e, #ffd200);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 32px;
  font-weight: 700;
}
```

> 注意：渐变是 image，不是 color。所以要用在 `background-image` 或 `background` 简写中，不能用在 `color` 属性里。文字渐变需要配合 `background-clip: text`。

### radial-gradient（径向渐变）

`radial-gradient` 从中心向外创建圆形或椭圆形渐变。

```css
/* 圆形径向渐变 */
.radial {
  background: radial-gradient(circle, #fff 0%, #1a73e8 100%);
}

/* 椭圆形 + 指定大小 */
.radial-ellipse {
  background: radial-gradient(ellipse at center, #ff6b6b, #ee5a24);
}

/* 实际场景：聚光灯效果 */
.spotlight {
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 60%
  );
}

/* 实际场景：磨砂玻璃背景 */
.glass-card {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
}
```

### conic-gradient（锥形渐变）

`conic-gradient` 围绕中心点旋转创建锥形渐变。

```css
/* 基础锥形渐变 */
.conic {
  background: conic-gradient(#ff6b6b, #feca57, #48dbfb, #ff6b6b);
}

/* 实际场景：饼图 */
.pie-chart {
  background: conic-gradient(
    #4caf50 0deg 120deg,    /* 33% */
    #2196f3 120deg 240deg,  /* 33% */
    #ff9800 240deg 360deg   /* 33% */
  );
  border-radius: 50%;
  width: 200px;
  height: 200px;
}
```

## 多背景

CSS 允许为一个元素设置多张背景图，用逗号分隔，前面的层级更高。

```css
/* 多背景叠加 */
.hero {
  background:
    linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
    url('hero-image.jpg') center/cover no-repeat;
}

/* 实际场景：网格纹理 + 渐变 */
.grid-bg {
  background:
    linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 19px,
      #e0e0e0 19px,
      #e0e0e0 20px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 19px,
      #e0e0e0 19px,
      #e0e0e0 20px
    );
}
```

## background-size

`background-size` 控制背景图的尺寸。取值有具体长度、百分比、`cover`（覆盖整个容器，可能裁剪）、`contain`（完整显示，可能留白）。

```css
/* cover：覆盖整个容器（最常用） */
.hero {
  background: url('photo.jpg') center/cover no-repeat;
  /* background 简写中 / 后面是 background-size */
}

/* contain：完整显示背景图 */
.logo-bg {
  background: url('logo.svg') center/contain no-repeat;
}

/* 实际场景：SVG 图标作为背景 */
.icon {
  width: 24px;
  height: 24px;
  background: url('icon.svg') center/contain no-repeat;
}

/* 实际场景：多分辨率适配 */
.hero {
  background-image: url('hero.jpg');
  background-size: cover;
  /* 配合媒体查询切换图片 */
}
@media (min-resolution: 2dppx) {
  .hero { background-image: url('hero@2x.jpg'); }
}
```

## background-clip

`background-clip` 控制背景的绘制区域。取值有 `border-box`（默认）、`padding-box`、`content-box`、`text`。

```css
/* 背景只在内容区显示 */
.content-clip {
  background-clip: content-box;
  padding: 20px;
  border: 10px solid transparent;
}

/* 实际场景：文字渐变（前面已提到） */
.gradient-text {
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## background-origin

`background-origin` 定义背景图的定位原点。取值有 `border-box`、`padding-box`（默认）、`content-box`。

```css
/* 背景图从内容区开始排列 */
.tile-pattern {
  background: url('tile.png') repeat;
  background-origin: content-box;
  padding: 20px;
}
```

## 边框圆角 border-radius

`border-radius` 设置元素的圆角，可以为四个角分别设置不同的值。

```css
/* 四个角统一 */
.rounded {
  border-radius: 8px;
}

/* 椭圆角（水平半径 / 垂直半径） */
.ellipse-corner {
  border-radius: 50px / 20px;
}

/* 四个角分别设置：左上 右上 右下 左下（顺时针） */
.custom-corners {
  border-radius: 10px 20px 30px 40px;
}

/* 圆形 */
.circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}

/* 胶囊形 */
.pill {
  border-radius: 9999px;  /* 或 50% / 100px 等足够大的值 */
  padding: 8px 24px;
}

/* 实际场景：头像 */
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

/* 实际场景：卡片上半部分圆角 */
.card-header {
  border-radius: 8px 8px 0 0;
}
```

> 注意：`border-radius` 是相对于元素自身尺寸的，所以 `border-radius: 50%` 在正方形元素上是圆形，在长方形上是椭圆。使用具体像素值可以更精确地控制圆角大小。

## 阴影

### box-shadow（盒阴影）

`box-shadow` 为元素添加阴影效果。语法：`x偏移 y偏移 模糊 扩散 颜色 内阴影`。

```css
/* 基础阴影 */
.shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* 多层阴影（更自然的效果） */
.elevated {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.06);
}

/* 内阴影 */
.inset-shadow {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 实际场景：Material Design 阴影层级 */
.elevation-1 { box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24); }
.elevation-2 { box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23); }
.elevation-3 { box-shadow: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23); }

/* 实际场景：卡片悬浮效果 */
.card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}
.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
```

> 注意：`box-shadow` 不影响布局（不占据空间），与 `outline` 类似。需要阴影影响布局时，可以用 `margin` 预留空间。

### text-shadow（文字阴影）

```css
/* 基础文字阴影 */
.title-shadow {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 发光效果 */
.glow-text {
  text-shadow: 0 0 10px #1a73e8, 0 0 20px #1a73e8;
}
```

## outline

`outline` 在元素边框外围绘制轮廓线，不占据空间，不影响布局。

```css
/* 基础 outline */
.focus-ring:focus {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;  /* 轮廓与边框之间的间距 */
}

/* 实际场景：自定义焦点样式替代默认虚线框 */
.btn:focus-visible {
  outline: 3px solid rgba(26, 115, 232, 0.5);
  outline-offset: 2px;
}
```

> 注意：`outline` 与 `border` 的区别：outline 不占据空间、不跟随圆角（部分浏览器已支持）、不能单独设置各边。`outline-offset` 可以为负值（轮廓线向内偏移）。
