---
title: "动画"
description: "CSS 动画（Animation）通过 @keyframes 定义关键帧序列，比过渡更强大——支持多步骤、循环播放、延迟触发等。适合做加载动画、入场效果、持续运动等场景。"
---

# 动画

CSS 动画（Animation）通过 `@keyframes` 定义关键帧序列，比过渡更强大——支持多步骤、循环播放、延迟触发等。适合做加载动画、入场效果、持续运动等场景。

<CssAnimationPlayground />

## @keyframes

`@keyframes` 定义动画的关键帧序列，指定动画在不同时间点的样式。

```css
/* 使用 from/to（等同于 0% / 100%） */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* 使用百分比定义多关键帧 */
@keyframes slideBounce {
  0%   { transform: translateX(-100%); opacity: 0; }
  60%  { transform: translateX(10px); opacity: 1; }
  80%  { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}

/* 实际场景：脉冲动画 */
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

> 注意：`@keyframes` 中的 `!important` 会被忽略。如果关键帧中没有指定某个属性，该属性会使用过渡值而非跳变。

## animation 属性

### animation-name

`animation-name` 指定要使用的 `@keyframes` 名称。

```css
.element {
  animation-name: fadeIn;
}
```

### animation-duration

`animation-duration` 设置动画完成一个周期的时间。

```css
.element {
  animation-duration: 0.5s;   /* 500 毫秒 */
  animation-duration: 2s;     /* 2 秒 */
}
```

### animation-timing-function

`animation-timing-function` 定义动画的速度曲线，与 `transition-timing-function` 取值相同。

```css
.element {
  animation-timing-function: ease-in-out;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  animation-timing-function: steps(10);  /* 10 步阶梯动画 */
}
```

### animation-delay

`animation-delay` 设置动画开始前的延迟时间。负值可以让动画从中间开始。

```css
.element {
  animation-delay: 0.3s;     /* 延迟 300ms 开始 */
  animation-delay: -1s;      /* 从第 1 秒处开始（跳过前 1 秒） */
}
```

### animation-iteration-count

`animation-iteration-count` 定义动画播放次数。取值为数字或 `infinite`（无限循环）。

```css
/* 播放 3 次 */
.element {
  animation-iteration-count: 3;
}

/* 无限循环（最常用于加载动画） */
.spinner {
  animation-iteration-count: infinite;
}
```

### animation-direction

`animation-direction` 控制动画的播放方向。

```css
.normal      { animation-direction: normal; }       /* 默认：正向 */
.reverse     { animation-direction: reverse; }      /* 反向 */
.alternate   { animation-direction: alternate; }     /* 奇数次正向，偶数次反向 */
.alt-reverse { animation-direction: alternate-reverse; }

/* 实际场景：呼吸灯效果 */
@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}
.indicator {
  animation: breathe 2s ease-in-out infinite;
  /* 使用 alternate 更简洁： */
  /* animation: breathe 1s ease-in-out infinite alternate; */
}
```

### animation-fill-mode

`animation-fill-mode` 控制动画执行前和执行后元素的样式。

```css
/* 默认：动画前后使用元素自身样式 */
.none { animation-fill-mode: none; }

/* 动画结束后保持最后一帧的样式（最常用） */
.forwards { animation-fill-mode: forwards; }

/* 动画开始前应用第一帧的样式 */
.backwards { animation-fill-mode: backwards; }

/* 同时应用 forwards 和 backwards */
.both { animation-fill-mode: both; }

/* 实际场景：入场动画 */
@keyframes slideIn {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.slide-in {
  animation: slideIn 0.4s ease forwards;
  /* 动画结束后保持 opacity: 1，不会闪回 */
}
```

### animation-play-state

`animation-play-state` 控制动画的播放和暂停。

```css
.playing  { animation-play-state: running; }  /* 默认：播放中 */
.paused   { animation-play-state: paused; }   /* 暂停 */

/* 实际场景：hover 暂停动画 */
.marquee:hover {
  animation-play-state: paused;
}
```

### animation 简写

`animation` 简写属性按以下顺序：`name duration timing-function delay iteration-count direction fill-mode play-state`。

```css
/* 基础简写 */
.element {
  animation: fadeIn 0.3s ease forwards;
}

/* 完整简写 */
.element {
  animation: slideIn 0.5s ease-out 0.2s 1 normal forwards;
}

/* 多个动画（逗号分隔） */
.element {
  animation:
    fadeIn 0.3s ease forwards,
    slideIn 0.5s ease-out forwards;
}

/* 实际场景：加载指示器 */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loader {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #1a73e8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 实际场景：骨架屏闪烁 */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

## steps() 阶梯函数

`steps(n, jump-type)` 将动画分成 n 个等距的步长，常用于精灵图动画。

```css
/* steps(n) 等同于 steps(n, end) */
/* steps(n, start) 第一步立即跳变 */
/* steps(n, end) 最后一步立即跳变 */

/* 实际场景：CSS 精灵图动画 */
@keyframes sprite-walk {
  from { background-position: 0 0; }
  to   { background-position: -1200px 0; }
}
.character {
  width: 120px;
  height: 120px;
  background: url('sprite.png') no-repeat;
  animation: sprite-walk 0.8s steps(10) infinite;
  /* 精灵图有 10 帧，分成 10 步 */
}
```

## 动画事件

通过 JS 可以监听 CSS 动画的关键事件。

```javascript
// 动画开始
element.addEventListener('animationstart', (e) => {
  console.log('动画开始:', e.animationName)
})

// 动画每迭代一次触发一次
element.addEventListener('animationiteration', (e) => {
  console.log('新一轮迭代:', e.animationName)
})

// 动画结束
element.addEventListener('animationend', (e) => {
  console.log('动画结束:', e.animationName)
  element.classList.remove('animating')
})

// 动画取消
element.addEventListener('animationcancel', (e) => {
  console.log('动画被取消:', e.animationName)
})
```

## 实际开发场景

```css
/* 场景 1：Toast 弹窗动画 */
@keyframes toastIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes toastOut {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}
.toast { animation: toastIn 0.3s ease forwards; }
.toast.hide { animation: toastOut 0.3s ease forwards; }

/* 场景 2：列表交错入场 */
@keyframes itemEnter {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.list-item {
  animation: itemEnter 0.4s ease forwards;
  animation-delay: calc(var(--index) * 0.05s);
  opacity: 0;  /* 初始隐藏，等待动画开始 */
}

/* 场景 3：数字滚动 */
@keyframes countUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.count-digit {
  display: inline-block;
  animation: countUp 0.6s ease-out forwards;
}
```

## 注意事项

1. **性能**：`transform` 和 `opacity` 的动画性能最好（GPU 合成），避免动画化 `width`、`height`、`margin`、`top/left` 等会触发重排的属性。
2. **减少动画**：尊重用户偏好，使用 `prefers-reduced-motion` 媒体查询为敏感用户减少动画。

   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

3. **animation 与 transition 的选择**：单次状态变化用 transition，需要循环、多步骤或自动触发的用 animation。
4. **will-change 提示**：对即将动画化的元素使用 `will-change: transform` 可以提前创建合成层，但不要滥用（会导致额外的内存开销）。
