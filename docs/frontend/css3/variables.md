# CSS 变量

CSS 变量（Custom Properties，自定义属性）允许在 CSS 中定义可复用的值，并通过 `var()` 函数引用。它们支持级联、继承和运行时修改，是构建主题系统和设计令牌的基础。

## 定义与使用

### 基本语法

自定义属性以 `--` 开头定义，通过 `var()` 引用。

```css
:root {
  --primary-color: #1a73e8;
  --font-size-base: 16px;
  --spacing-unit: 8px;
  --border-radius: 4px;
}

.button {
  background: var(--primary-color);
  font-size: var(--font-size-base);
  padding: calc(var(--spacing-unit) * 2) calc(var(--spacing-unit) * 4);
  border-radius: var(--border-radius);
}
```

> 注意：CSS 变量区分大小写（`--primary` 和 `--Primary` 是不同的变量）。变量名推荐使用 kebab-case（小写加连字符）。

### 备用值（Fallback）

`var()` 函数的第二个参数是备用值，当变量未定义时使用。

```css
.element {
  color: var(--text-color, #333);
  /* 如果 --text-color 未定义，使用 #333 */

  background: var(--bg, var(--fallback-bg, #fff));
  /* 嵌套备用值：先尝试 --bg，再尝试 --fallback-bg，最后 #fff */
}
```

## 作用域与继承

### 局部作用域

在某个选择器内定义的变量只在该选择器及其后代中有效。

```css
/* 全局变量 */
:root {
  --card-bg: #fff;
  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 组件级覆盖 */
.dark-section {
  --card-bg: #2d2d2d;
  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 使用变量（在不同上下文中自动取不同值） */
.card {
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}
```

### 继承

CSS 变量遵循常规的 CSS 继承规则——子元素继承父元素的变量值。

```css
.parent {
  --theme-color: #1a73e8;
}

.child {
  color: var(--theme-color);  /* 继承父元素的值 #1a73e8 */
}

.override {
  --theme-color: #e53935;    /* 覆盖为新值 */
  color: var(--theme-color);  /* 使用 #e53935 */
}
```

> 注意：普通 CSS 属性的值是"计算后"继承的（子元素拿到的是计算结果），但 CSS 变量的值是"原封不动"继承的（子元素拿到的是变量表达式）。这使得 CSS 变量可以在子元素中被重新计算。

## 主题系统

```css
/* 亮色主题（默认） */
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-primary: #1a73e8;
  --color-border: #e0e0e0;
}

/* 暗色主题 */
[data-theme="dark"] {
  --color-bg: #121212;
  --color-bg-secondary: #1e1e1e;
  --color-text: #e0e0e0;
  --color-text-secondary: #a0a0a0;
  --color-primary: #8ab4f8;
  --color-border: #333333;
}

/* 使用主题变量 */
body {
  background: var(--color-bg);
  color: var(--color-text);
}

.card {
  background: var(--color-bg-secondary);
  border-color: var(--color-border);
}

/* 实际场景：系统主题自动跟随 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #121212;
    --color-bg-secondary: #1e1e1e;
    --color-text: #e0e0e0;
  }
}
```

## 设计令牌（Design Tokens）

```css
:root {
  /* 颜色 */
  --blue-50:  #e3f2fd;
  --blue-100: #bbdefb;
  --blue-500: #1a73e8;
  --blue-900: #0d47a1;

  /* 间距（8px 网格） */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* 字号 */
  --text-xs:  0.75rem;
  --text-sm:  0.875rem;
  --text-base: 1rem;
  --text-lg:  1.125rem;
  --text-xl:  1.25rem;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

/* 使用设计令牌 */
.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-sm);
}

.btn-primary {
  background: var(--blue-500);
  color: #fff;
}
```

## 与 JavaScript 交互

### 读取变量

```javascript
// 获取计算后的变量值
const style = getComputedStyle(element)
const primary = style.getPropertyValue('--primary-color')
console.log(primary.trim())  // "#1a73e8"

// 获取根元素的变量
const root = getComputedStyle(document.documentElement)
const spacing = root.getPropertyValue('--spacing')
```

### 设置变量

```javascript
// 设置根元素变量
document.documentElement.style.setProperty('--primary-color', '#e53935')

// 设置特定元素变量
element.style.setProperty('--card-bg', '#f0f0f0')

// 移除变量（恢复继承或默认值）
element.style.removeProperty('--card-bg')
```

### 实际场景：动态主题切换

```javascript
// 主题切换
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

// 读取存储的主题
const saved = localStorage.getItem('theme')
if (saved) {
  document.documentElement.setAttribute('data-theme', saved)
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark')
}
```

## calc() 与变量配合

```css
:root {
  --base-space: 8px;
  --columns: 3;
}

.grid-item {
  /* 动态计算间距 */
  padding: calc(var(--base-space) * 2);

  /* 动态计算宽度 */
  width: calc(100% / var(--columns) - var(--base-space) * 2);

  /* 实际场景：响应式侧边栏宽度 */
  --sidebar-width: clamp(200px, 20vw, 320px);
  margin-left: var(--sidebar-width);
}

.content {
  width: calc(100% - var(--sidebar-width));
}
```

## 注意事项

1. **不能用在媒体查询中**：CSS 变量不能用在 `@media` 的条件表达式中（因为媒体查询在 CSS 解析阶段就需要确定值，而变量在渲染阶段才计算）。
   ```css
   /* 错误：不能这样写 */
   :root { --breakpoint: 768px; }
   @media (min-width: var(--breakpoint)) { }  /* 无效 */

   /* 正确：直接写值 */
   @media (min-width: 768px) { }
   ```

2. **不能拼接字符串**：CSS 变量不能直接与字符串拼接来构建属性值。但在部分场景下 `url()` 和逗号分隔值是支持的。
   ```css
   /* 不能直接拼接 */
   .icon { background: url('/icons/' var(--name) '.svg'); }  /* 无效 */

   /* 但整个值作为变量是可行的 */
   :root { --icon-url: url('/icons/home.svg'); }
   .icon { background: var(--icon-url); }
   ```

3. **var() 不是万能的**：不能用在 `@media`、`@keyframes`（部分场景）、`@import`、`@font-face` 中。属性名也不能用变量。

4. **性能**：CSS 变量的修改会触发重新计算，但只影响使用该变量的元素及其后代，影响范围可控。不要在动画中频繁修改 CSS 变量。
