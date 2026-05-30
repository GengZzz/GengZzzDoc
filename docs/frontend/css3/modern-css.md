# 现代 CSS

现代 CSS 包括近年来浏览器新增的选择器、层级管理、滚动驱动动画等特性。这些特性大幅减少了对 JavaScript 和预处理器的依赖。

## 结构化伪类函数

### :is()（匹配任意选择器）

`:is()` 接受一个选择器列表，匹配其中任意一个。简化重复的选择器前缀。

```css
/* 传统写法 */
header p,
main p,
footer p {
  line-height: 1.6;
}

/* 使用 :is() 简化 */
:is(header, main, footer) p {
  line-height: 1.6;
}

/* 实际场景：标题元素统一间距 */
:is(h1, h2, h3, h4, h5, h6) {
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

/* 实际场景：链接样式 */
:is(a, .link):hover {
  text-decoration: underline;
}
```

> 注意：`:is()` 的优先级取决于参数中优先级最高的选择器。如果列表中有 `#id`，整个 `:is()` 的优先级就是 ID 级别，即使其他选择器优先级更低。这是与 `:where()` 的核心区别。

### :where()（零优先级匹配）

`:where()` 语法与 `:is()` 相同，但优先级始终为 0。适合定义可被轻松覆盖的默认样式。

```css
/* :where() 的优先级为 0，容易被覆盖 */
:where(article, section, aside) p {
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* 这条规则优先级 (0,1,0)，可以轻松覆盖上面的规则 */
.special-paragraph {
  margin-bottom: 2rem;
}

/* 实际场景：组件库默认样式 */
:where(.btn) {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}
/* 使用 :where 后，.btn-primary 不需要 !important 或更高优先级 */
.btn-primary {
  background: #1a73e8;  /* 轻松覆盖 :where 的默认样式 */
  color: #fff;
}
```

### :has()（关系选择器）

`:has()` 匹配包含特定子元素或满足特定条件的父元素，被称为"父选择器"。

```css
/* 包含 <img> 的 card 添加特殊样式 */
.card:has(img) {
  display: grid;
  grid-template-columns: 200px 1fr;
}

/* 不包含 <img> 的 card */
.card:not(:has(img)) {
  padding: 24px;
}

/* 实际场景：表单验证状态 */
.form-group:has(.input:invalid) .error-message {
  display: block;
  color: #e53935;
}
.form-group:has(.input:valid) .error-message {
  display: none;
}

/* 实际场景：选中复选框后高亮整行 */
.item:has(input:checked) {
  background: #e3f2fd;
  border-color: #1a73e8;
}

/* 实际场景：链接悬停时改变卡片整体样式 */
.card:has(a:hover) {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* 实际场景：相邻兄弟高亮 */
.sidebar-item:has(+ .sidebar-item:hover),
.sidebar-item:hover + .sidebar-item {
  opacity: 0.8;
}
```

> 注意：`:has()` 是 CSS 选择器历史上最重大的更新之一。Chrome 105+、Safari 15.4+、Firefox 121+ 支持。以前需要 JavaScript 实现的"根据子元素状态改变父元素样式"现在纯 CSS 可以做到。

## 层叠层 @layer

`@layer` 允许开发者显式控制样式表的优先级层级，解决第三方库样式覆盖困难的问题。

### 基本用法

```css
/* 定义层的优先级（后声明的层优先级更高） */
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}

@layer base {
  body {
    font-family: system-ui, sans-serif;
    line-height: 1.6;
  }
}

@layer components {
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
  }
}

@layer utilities {
  .mt-4 { margin-top: 1rem; }
  .text-center { text-align: center; }
}
```

> 注意：`@layer` 中的样式优先级低于非层样式（unlayered styles）。这意味着任何不在 `@layer` 中的样式都可以覆盖层内的样式，不管层的顺序如何。这是设计上的有意为之——让"临时覆写"变得简单。

### 嵌套层

```css
@layer components {
  @layer buttons {
    .btn { padding: 8px 16px; }
  }
  @layer forms {
    .input { padding: 8px 12px; }
  }
}

/* 引用嵌套层 */
@layer components.buttons {
  .btn-primary { background: blue; }
}
```

### 第三方库样式管理

```css
/* 引入第三方库并指定层级 */
@layer third-party {
  @import url('bootstrap.min.css');
}

/* 自己的样式始终优先于第三方库 */
@layer custom {
  .btn {
    /* 轻松覆盖 bootstrap 的 .btn 样式 */
    border-radius: 8px;
  }
}

/* 或者：让非层样式直接覆盖一切 */
/* 不包裹在 @layer 中的样式优先级最高 */
.my-overrides .btn {
  border-radius: 8px;
}
```

## 滚动驱动动画（Scroll-Driven Animations）

滚动驱动动画将 CSS 动画与滚动位置绑定，无需 JavaScript 监听 scroll 事件。

### animation-timeline: scroll()

```css
/* 进度条：随页面滚动填充 */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: #1a73e8;
  transform-origin: left;
  transform: scaleX(0);
  animation: progressBar linear;
  animation-timeline: scroll();  /* 绑定到根滚动容器 */
}

@keyframes progressBar {
  to { transform: scaleX(1); }
}

/* 实际场景：元素进入视口时淡入 */
.fade-in-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  animation: fadeSlideIn linear both;
  animation-timeline: view();          /* 绑定到元素在视口中的可见性 */
  animation-range: entry 0% entry 100%; /* 元素进入视口期间执行 */
}

@keyframes fadeSlideIn {
  to { opacity: 1; transform: translateY(0); }
}

/* 实际场景：图片视差滚动 */
.parallax-image {
  animation: parallax linear;
  animation-timeline: view();
  animation-range: entry 0% exit 100%;
}

@keyframes parallax {
  from { transform: translateY(-20%); }
  to   { transform: translateY(20%); }
}
```

### animation-timeline: view()

`view()` 将动画绑定到元素在滚动容器中的可见性。

```css
/* 元素在视口中出现到消失的完整过程 */
.scroll-reveal {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
  /* entry 0% = 元素开始进入视口 */
  /* cover 50% = 元素覆盖视口 50% 时 */
}

@keyframes reveal {
  from { opacity: 0; scale: 0.8; }
  to   { opacity: 1; scale: 1; }
}

/* 实际场景：列表项依次入场 */
.list-item {
  animation: slideIn linear both;
  animation-timeline: view();
  animation-range: entry 10% cover 30%;
}

@keyframes slideIn {
  from { opacity: 0; translate: 0 50px; }
  to   { opacity: 1; translate: 0 0; }
}
```

> 注意：滚动驱动动画在 Chrome 115+ 支持，Firefox 110+ 部分支持，Safari 尚未支持（截至 2025 年）。需要检测支持性或提供降级方案。

## CSS 嵌套

原生 CSS 嵌套（Chrome 120+、Firefox 117+、Safari 17.2+）允许在选择器中直接嵌套子选择器，无需预处理器。

```css
/* 原生 CSS 嵌套 */
.card {
  padding: 16px;
  border-radius: 8px;
  background: #fff;

  & .title {
    font-size: 1.25rem;
    font-weight: 700;
  }

  & .body {
    margin-top: 12px;
    color: #555;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  @media (min-width: 768px) {
    padding: 24px;
  }
}

/* & 符号引用父选择器 */
.btn {
  &-primary { background: #1a73e8; }  /* 生成 .btn-primary */
  &-danger  { background: #e53935; }  /* 生成 .btn-danger */
  &:hover   { opacity: 0.9; }         /* 生成 .btn:hover */
}
```

> 注意：原生 CSS 嵌套中的 `&` 是可选的（Sass 中必须用 `&`）。当嵌套选择器以字母开头时，浏览器会自动在其前面加空格（后代选择器）。

## color-mix()

`color-mix()` 在两种颜色之间按指定比例混合。

```css
/* 混合两种颜色 */
.mixed {
  color: color-mix(in srgb, #1a73e8 70%, #ffffff 30%);
  /* 70% 的蓝色 + 30% 的白色 */
}

/* 实际场景：生成透明色变体 */
.btn-primary {
  --color: #1a73e8;
  background: var(--color);
}
.btn-primary:hover {
  background: color-mix(in srgb, var(--color) 85%, white);
}
.btn-primary:active {
  background: color-mix(in srgb, var(--color) 70%, black);
}

/* 实际场景：动态 hover 状态 */
.link {
  color: #1a73e8;
}
.link:hover {
  color: color-mix(in srgb, #1a73e8, black 20%);
}
```

## :popover-open

```css
/* 弹出层样式 */
[popover] {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* 弹出层打开时的样式 */
[popover]:popover-open {
  opacity: 1;
  transform: translateY(0);
}
```

```html
<button popovertarget="my-popover">打开弹窗</button>
<div id="my-popover" popover>弹窗内容</div>
```

## 新增伪类

### :focus-visible

```css
/* 仅在键盘导航时显示焦点样式（不响应鼠标点击） */
.btn:focus-visible {
  outline: 3px solid rgba(26, 115, 232, 0.5);
  outline-offset: 2px;
}

/* 鼠标点击时不显示焦点框 */
.btn:focus:not(:focus-visible) {
  outline: none;
}
```

### :placeholder-shown

```css
/* 输入框 placeholder 可见时（即输入框为空）的样式 */
.input-group:has(.input:placeholder-shown) .label {
  transform: translateY(0);
  font-size: 1rem;
  color: #999;
}

.input-group:has(.input:not(:placeholder-shown)) .label {
  transform: translateY(-24px);
  font-size: 0.75rem;
  color: #1a73e8;
}
```

## 注意事项

1. **渐进增强**：现代 CSS 特性应作为增强使用。核心功能必须不依赖这些特性，使用 `@supports` 检测支持性。

   ```css
   @supports (animation-timeline: scroll()) {
     /* 滚动驱动动画 */
   }
   @supports selector(:has(*)) {
     /* :has() 相关样式 */
   }
   ```

2. **浏览器兼容性**：`:has()` 和滚动驱动动画的兼容性相对较新，上线前务必在 Can I Use 上确认目标用户的浏览器支持情况。

3. **性能**：`:has()` 的性能开销高于普通选择器，尤其在复杂 DOM 中。避免在大型页面上对通用选择器使用 `:has()`（如 `div:has(p)`）。

4. **预处理器的未来**：原生 CSS 嵌套、`@layer`、`color-mix()` 等特性减少了对 Sass/Less 的需求。新项目可以考虑只使用原生 CSS。
