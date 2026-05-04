# 变换

CSS 变换（Transform）允许对元素进行位移、旋转、缩放、倾斜等操作。变换不改变文档流布局，元素的原始空间仍被保留。

<CssTransformDemo />

## 2D 变换

### translate（位移）

`translate(x, y)` 将元素从原始位置移动指定距离。正值向右/下，负值向左/上。

```css
/* 水平位移 */
.move-right {
  transform: translateX(50px);
}

/* 垂直位移 */
.move-down {
  transform: translateY(20px);
}

/* 同时水平和垂直位移 */
.move-diagonal {
  transform: translate(50px, 20px);
}

/* 百分比相对于自身尺寸 */
.center-ab {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 经典的绝对定位居中方案 */
}

/* 实际场景：hover 上浮效果 */
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-4px);
}
```

> 注意：`translate` 的百分比是相对于元素自身宽高计算的，而 `margin` 的百分比是相对于父元素宽度计算的。这是 `translate(-50%, -50%)` 能实现居中的原因。

### rotate（旋转）

`rotate(angle)` 将元素绕中心点旋转指定角度。正值顺时针，负值逆时针。

```css
/* 顺时针旋转 45 度 */
.rotate-45 {
  transform: rotate(45deg);
}

/* 逆时针旋转 */
.rotate-ccw {
  transform: rotate(-90deg);
}

/* 实际场景：展开/收起箭头 */
.collapse-arrow {
  transition: transform 0.3s ease;
}
.collapse-arrow.expanded {
  transform: rotate(180deg);
}

/* 实际场景：加载旋转动画 */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinner {
  animation: spin 1s linear infinite;
}
```

### scale（缩放）

`scale(x, y)` 缩放元素。1 为原始大小，大于 1 放大，小于 1 缩小。

```css
/* 等比缩放 */
.scale-up {
  transform: scale(1.2);  /* 放大到 120% */
}

/* 不等比缩放 */
.scale-x {
  transform: scaleX(0.8);  /* 水平缩小到 80% */
}

/* 实际场景：图片 hover 放大 */
.img-zoom {
  overflow: hidden;
}
.img-zoom img {
  transition: transform 0.4s ease;
}
.img-zoom:hover img {
  transform: scale(1.1);
}

/* 实际场景：按钮点击缩小反馈 */
.btn:active {
  transform: scale(0.95);
}
```

> 注意：`scale` 不影响文档流，放大后的元素可能会覆盖相邻元素。`scale(0)` 会将元素完全隐藏，但仍然可以被点击。使用 `opacity: 0` 或 `visibility: hidden` 可以同时隐藏交互。

### skew（倾斜）

`skew(x, y)` 将元素沿 X 轴和 Y 轴倾斜指定角度。

```css
/* X 轴倾斜 */
.skew-x {
  transform: skewX(15deg);
}

/* 实际场景：倾斜的横幅背景 */
.banner {
  transform: skewX(-5deg);
  margin: 0 -20px;  /* 补偿倾斜产生的空白 */
}
.banner > * {
  transform: skewX(5deg);  /* 内容反向倾斜保持正立 */
}
```

### 变换组合

多个变换函数可以组合使用，按顺序执行。

```css
/* 组合变换 */
.combined {
  transform: translateX(50px) rotate(45deg) scale(1.2);
  /* 先位移，再旋转，最后缩放 */
}

/* 实际场景：悬浮卡片 */
.floating-card {
  transition: transform 0.3s ease;
}
.floating-card:hover {
  transform: translateY(-8px) scale(1.02);
}
```

> 注意：变换的顺序很重要。`rotate(45deg) translateX(100px)` 和 `translateX(100px) rotate(45deg)` 结果不同——前者先旋转坐标系再沿旋转后的 X 轴位移。

## 3D 变换

### perspective（透视）

`perspective` 设置 3D 变换的透视距离，值越小透视效果越强烈。

```css
/* 在父元素上设置透视 */
.scene {
  perspective: 800px;  /* 常用范围 500px - 1000px */
}

/* 或使用 perspective() 函数 */
.card-3d {
  transform: perspective(800px) rotateY(30deg);
}
```

### rotateX / rotateY / rotateZ

```css
/* 绕 X 轴旋转（上下翻转） */
.flip-x {
  transform: rotateX(45deg);
}

/* 绕 Y 轴旋转（左右翻转） */
.flip-y {
  transform: rotateY(180deg);
}

/* 实际场景：3D 翻转卡片 */
.flip-card {
  perspective: 1000px;
}
.flip-card-inner {
  transition: transform 0.6s;
  transform-style: preserve-3d;  /* 关键：保持 3D 空间 */
}
.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-front,
.flip-card-back {
  backface-visibility: hidden;  /* 背面不可见 */
  position: absolute;
  inset: 0;
}
.flip-card-back {
  transform: rotateY(180deg);
}
```

### translateZ 和 translate3d

```css
/* 沿 Z 轴移动（靠近/远离观察者） */
.push-back {
  transform: translateZ(-200px);  /* 向后移动，看起来变小 */
}
.pull-front {
  transform: translateZ(100px);   /* 向前移动，看起来变大 */
}

/* 3D 位移 */
.move-3d {
  transform: translate3d(50px, 30px, -100px);
}
```

## transform-origin

`transform-origin` 设置变换的原点，默认是元素中心（`50% 50%`）。

```css
/* 左上角旋转 */
.rotate-top-left {
  transform-origin: top left;
  transform: rotate(45deg);
}

/* 右下角旋转 */
.rotate-bottom-right {
  transform-origin: 100% 100%;
  transform: rotate(-30deg);
}

/* 实际场景：门的开合效果 */
.door {
  transform-origin: left center;  /* 左边缘为转轴 */
  transition: transform 0.4s ease;
}
.door.open {
  transform: perspective(600px) rotateY(-75deg);
}
```

## 注意事项

1. **变换不影响布局**：`transform` 不改变元素在文档流中的位置，不会触发重排（reflow），只会触发合成（composite），性能优于使用 `top/left` 定位。
2. **GPU 加速**：`transform` 和 `opacity` 变化可以被 GPU 加速，适合做动画。推荐使用 `will-change: transform` 提示浏览器优化。
3. **变换创建新的层叠上下文**：设置 `transform`（非 none）的元素会创建新的包含块和层叠上下文，影响子元素的 `position: fixed` 和 `z-index` 表现。
4. **内联元素**：`transform` 对内联非替换元素（如 `<span>`）无效，需要先改为 `display: inline-block` 或 `block`。
