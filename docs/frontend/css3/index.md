# CSS3

CSS3 是层叠样式表（Cascading Style Sheets）的第三个主要版本，在 CSS2.1 基础上引入了 Flexbox、Grid、动画、变换、变量、媒体查询等现代特性，使前端布局和视觉表现能力大幅提升。

<CssSelectorCascadeDemo />

## 学习路径

| 章节 | 内容 |
| --- | --- |
| [选择器](./selectors) | 基础选择器、组合器、伪类、伪元素、属性选择器、优先级计算 |
| [盒模型](./box-model) | 标准盒模型 vs IE 盒模型、box-sizing、外边距合并、BFC |
| [Flex 布局](./flexbox) | 容器属性、项目属性、常见布局模式（居中、等分、圣杯） |
| [Grid 布局](./grid) | 网格定义、区域命名、fr 单位、auto-fill/auto-fit |
| [定位](./positioning) | static/relative/absolute/fixed/sticky、层叠上下文 |
| [背景与边框](./background-border) | 渐变、多背景、background-size/clip、圆角、阴影、outline |
| [变换](./transform) | 2D/3D 变换：translate/rotate/scale/skew、transform-origin |
| [过渡](./transition) | transition-property/duration/timing-function/delay、可过渡属性 |
| [动画](./animation) | @keyframes、animation 属性、steps()、动画事件 |
| [媒体查询](./media-queries) | 断点策略、移动优先、容器查询 |
| [响应式设计](./responsive-design) | rem/em/vw/vh、图片响应式、流体排版 |
| [CSS 变量](./variables) | 自定义属性、var()、作用域、与 JS 交互 |
| [排版与文本](./typography-text) | @font-face、文字效果、多列布局、writing-mode |
| [现代 CSS](./modern-css) | :has()、:is()、:where()、@layer、scroll-driven animations |

<CssFlexboxDemo />

## CSS3 核心概念

### 层叠与继承

CSS 的全称是"Cascading Style Sheets"，层叠是其核心机制。当多条规则作用于同一元素时，浏览器按以下顺序决定最终样式：

1. **来源重要性**：`!important` > 内联样式 > 嵌入/外部样式表 > 浏览器默认样式
2. **选择器特异性**：ID > 类/伪类/属性 > 标签/伪元素
3. **源码顺序**：特异性相同时，后声明的覆盖前声明的

```css
/* 优先级：1,0,0 > 0,1,0 > 0,0,1 */
#header { color: red; }       /* 1,0,0 */
.title  { color: blue; }      /* 0,1,0 */
h1      { color: green; }     /* 0,0,1 */
```

### 盒模型

每个 HTML 元素都是一个矩形盒子，由四层组成：content -> padding -> border -> margin。CSS3 通过 `box-sizing: border-box` 解决了传统盒模型计算宽度不便的问题。

### 布局演进

CSS 布局经历了 table -> float -> flexbox -> grid 的演进。现代项目中，**Grid 负责宏观页面布局，Flex 负责组件内部排列**，两者互补而非替代。

<CssGridLayoutDemo />

## 浏览器兼容性概览

| 特性 | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| Flexbox | 29+ | 28+ | 9+ | 12+ |
| Grid | 57+ | 52+ | 10.1+ | 16+ |
| CSS 变量 | 49+ | 31+ | 9.1+ | 15+ |
| @layer | 99+ | 97+ | 15.4+ | 99+ |
| :has() | 105+ | 121+ | 15.4+ | 105+ |
