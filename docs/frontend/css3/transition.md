# 过渡

CSS 过渡（Transition）让属性值的变化以平滑动画的方式呈现，而不是瞬间跳变。过渡是被动的——由用户交互（如 hover）或类名切换触发。

## transition-property

`transition-property` 指定哪些 CSS 属性参与过渡。可以是具体属性名、`all`（所有可过渡属性）或 `none`。

```css
/* 单个属性过渡 */
.button {
  transition-property: background-color;
}

/* 多个属性过渡 */
.button {
  transition-property: background-color, transform, box-shadow;
}

/* 所有可过渡属性（性能开销较大，谨慎使用） */
.element {
  transition-property: all;
}

/* 实际场景：只过渡特定属性 */
.card {
  transition-property: box-shadow, transform;
}
```

> 注意：不是所有 CSS 属性都可以过渡。颜色、长度、百分比、数值、变换、阴影等可以过渡；`display`、`font-family` 等不能过渡。完整的可过渡属性列表参考 MDN 文档。

## transition-duration

`transition-duration` 设置过渡动画持续的时间，单位为秒（s）或毫秒（ms）。

```css
/* 秒为单位 */
.fast { transition-duration: 0.15s; }
.normal { transition-duration: 0.3s; }
.slow { transition-duration: 0.5s; }

/* 毫秒为单位 */
.quick { transition-duration: 200ms; }

/* 不同属性不同时间 */
.element {
  transition-property: opacity, transform;
  transition-duration: 0.2s, 0.4s;
  /* opacity 用 0.2s，transform 用 0.4s */
}
```

## transition-timing-function

`transition-timing-function` 定义过渡的速度曲线，控制动画在持续时间内的加速和减速方式。

### 预设值

```css
/* 线性匀速 */
.linear { transition-timing-function: linear; }

/* 默认：先慢后快再慢 */
.ease { transition-timing-function: ease; }

/* 缓慢开始 */
.ease-in { transition-timing-function: ease-in; }

/* 缓慢结束 */
.ease-out { transition-timing-function: ease-out; }

/* 缓慢开始和结束 */
.ease-in-out { transition-timing-function: ease-in-out; }
```

### 贝塞尔曲线

`cubic-bezier(x1, y1, x2, y2)` 自定义速度曲线，四个参数控制两个控制点的位置。

```css
/* 弹性效果：超过目标再回弹 */
.bouncy {
  transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* 快速启动 */
.snappy {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Material Design 标准曲线 */
.material {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### steps() 阶梯函数

`steps(n)` 将过渡分成 n 个等距的步骤，产生逐帧效果。

```css
/* 实际场景：打字机效果 */
.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid;
  width: 0;
  animation: typing 2s steps(30) forwards, blink 0.5s step-end infinite;
}
@keyframes typing { to { width: 30ch; } }
@keyframes blink { 50% { border-color: transparent; } }
```

## transition-delay

`transition-delay` 设置过渡开始前的延迟时间。

```css
/* 延迟 0.2 秒开始 */
.delayed {
  transition-delay: 0.2s;
}

/* 实际场景：级联动画（依次出现） */
.list-item {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.list-item:nth-child(1) { transition-delay: 0s; }
.list-item:nth-child(2) { transition-delay: 0.05s; }
.list-item:nth-child(3) { transition-delay: 0.1s; }
.list-item:nth-child(4) { transition-delay: 0.15s; }
```

## transition 简写

`transition` 是以上四个属性的简写，语法为：`property duration timing-function delay`。

```css
/* 基础简写 */
.element {
  transition: all 0.3s ease;
}

/* 多个属性的过渡 */
.button {
  transition:
    background-color 0.2s ease,
    transform 0.15s ease-out,
    box-shadow 0.3s ease;
}

/* 实际场景：导航菜单项 */
.nav-item {
  color: #666;
  transition: color 0.2s ease, background-color 0.2s ease;
}
.nav-item:hover {
  color: #1a73e8;
  background-color: #e8f0fe;
}

/* 实际场景：模态框弹出 */
.modal {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.modal.active {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* 实际场景：下拉菜单展开 */
.dropdown-menu {
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dropdown-menu.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
```

## 常见的可过渡属性

以下属性是最常用于过渡的：

```css
/* 颜色类 */
color
background-color
border-color
box-shadow
text-shadow

/* 尺寸类 */
width / height
padding / margin
border-width
font-size
line-height

/* 变换类 */
transform
opacity

/* 位置类 */
top / right / bottom / left
```

## 注意事项

1. **性能优化**：优先使用 `transform` 和 `opacity` 做动画，这两个属性可以被 GPU 合成，不触发重排。避免对 `width`、`height`、`top`、`left` 等属性做过渡动画。
2. **过渡 vs 动画**：过渡是被动的、一次性的（从 A 到 B），动画（animation）是主动的、可循环的、支持多关键帧。简单的状态变化用过渡，复杂的序列动画用 animation。
3. **首次加载**：页面加载时如果元素已经有终态类名，不会触发过渡。过渡只在属性值**发生变化**时生效。
4. **display 切换**：`display: none` 到 `display: block` 无法过渡。解决方案是先设 `display: block`，下一帧再改变可过渡属性（如 `opacity`），或者使用 `visibility` 替代。
5. **transitionend 事件**：过渡结束后会触发 `transitionend` 事件，可以用 JS 监听执行后续逻辑。多属性过渡时每个属性都会触发一次。
