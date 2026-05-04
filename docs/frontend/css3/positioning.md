# 定位

CSS 定位（Positioning）控制元素在页面中的位置和层叠顺序。理解五种定位模式和层叠上下文是掌握复杂布局的前提。

## 定位类型

### static（默认定位）

`static` 是元素的默认定位方式，元素按照正常文档流排列，`top`、`right`、`bottom`、`left`、`z-index` 属性无效。

```css
.element {
  position: static;  /* 默认值，通常不需要显式设置 */
}
```

### relative（相对定位）

`relative` 相对于元素自身在文档流中的原始位置进行偏移，**原始空间仍保留**，不会影响其他元素的布局。

```css
/* 元素向下偏移 20px，向右偏移 10px */
.offset {
  position: relative;
  top: 20px;
  left: 10px;
  /* 原始位置仍被占据，其他元素不会补上来 */
}

/* 实际场景：为绝对定位子元素建立定位上下文 */
.dropdown-wrapper {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
}
```

> 注意：`relative` 最常见的用途不是偏移自身，而是作为 `absolute` 定位子元素的参考容器。

### absolute（绝对定位）

`absolute` 将元素从文档流中完全移除，相对于最近的**非 static 定位祖先元素**定位。如果没有这样的祖先，则相对于初始包含块（通常是 `<html>`）。

```css
/* 相对于最近的 relative/absolute/fixed 定位祖先 */
.tooltip {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 实际场景：图片上的角标 */
.badge-wrapper {
  position: relative;
}
.badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #e53935;
  color: #fff;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

/* 实际场景：覆盖层（overlay） */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}
.modal-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}
```

> 注意：`absolute` 元素会将父元素的 padding 也算作定位参考范围。如果需要让 absolute 元素撑满父元素，可以设置 `top/right/bottom/left: 0`。

### fixed（固定定位）

`fixed` 相对于**视口（viewport）**定位，元素脱离文档流，滚动页面时位置不变。

```css
/* 固定顶部导航栏 */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

/* 固定右下角回到顶部按钮 */
.back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1a73e8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 实际场景：移动端底部操作栏 */
.mobile-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
}
```

> 注意：`fixed` 在移动端有兼容性问题。iOS Safari 中，如果 `fixed` 元素的祖先有 `transform`、`perspective`、`filter` 属性，`fixed` 会退化为 `absolute`（相对于该祖先定位）。`position: sticky` 是解决部分 fixed 问题的替代方案。

### sticky（粘性定位）

`sticky` 是 `relative` 和 `fixed` 的混合体。元素在滚动到指定阈值前表现为 `relative`，到达阈值后表现为 `fixed`。

```css
/* 粘性表头 */
.sticky-header {
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
  border-bottom: 2px solid #eee;
}

/* 实际场景：字母索引粘性定位 */
.alpha-index {
  position: sticky;
  top: 64px;  /* 位于固定导航栏下方 */
  background: #f5f5f5;
  padding: 8px 16px;
  font-weight: 600;
}

/* 实际场景：侧边栏目录粘性 */
.toc {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
```

> 注意：`sticky` 要生效，必须设置 `top`/`right`/`bottom`/`left` 中至少一个阈值。`sticky` 元素不会脱离文档流，它的参考范围是最近的可滚动祖先。如果祖先元素设置了 `overflow: hidden/auto/scroll`，`sticky` 可能不生效。

## z-index 与层叠上下文

### z-index 基础

`z-index` 控制定位元素的层叠顺序，值越大越靠上。只有 `position` 不是 `static` 的元素设置 `z-index` 才有效。

```css
.modal-overlay {
  position: fixed;
  z-index: 1000;
}
.modal-content {
  position: fixed;
  z-index: 1001;  /* 在 overlay 之上 */
}
```

### 层叠上下文（Stacking Context）

层叠上下文是 z-index 作用的范围。每个层叠上下文独立计算 z-index，子元素的 z-index 不会与外部元素比较。

```css
/* 创建新的层叠上下文的条件 */
.new-context {
  position: relative;
  z-index: 0;           /* z-index 不为 auto 的定位元素 */
  /* 或 */
  opacity: 0.99;        /* opacity < 1 */
  /* 或 */
  transform: translateZ(0);  /* transform 不为 none */
  /* 或 */
  filter: blur(0);      /* filter 不为 none */
  /* 或 */
  will-change: opacity; /* will-change 指定了上述属性 */
  /* 或 */
  isolation: isolate;   /* 专门为创建层叠上下文设计 */
}
```

```css
/* 实际场景：为什么 z-index: 9999 不生效 */
.parent-a {
  position: relative;
  z-index: 1;  /* 创建了层叠上下文 A */
}
.parent-b {
  position: relative;
  z-index: 2;  /* 创建了层叠上下文 B（更高） */
}
/* parent-a 的子元素即使 z-index: 99999，
   也无法超过 parent-b（因为 parent-b 整体更高） */
```

> 注意：层叠上下文的嵌套是 z-index 不生效的最常见原因。调试时检查祖先元素是否创建了独立的层叠上下文。推荐使用 Chrome DevTools 的 Layers 面板可视化层叠结构。

## 定位实战技巧

```css
/* 技巧 1：absolute 填满父容器 */
.fill-parent {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

/* 技巧 2：水平垂直居中（transform 方案） */
.center-transform {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 技巧 3：水平垂直居中（inset + margin: auto 方案） */
.center-margin {
  position: absolute;
  inset: 0;        /* 等同于 top/right/bottom/left: 0 */
  width: 300px;
  height: 200px;
  margin: auto;
}

/* 技巧 4：sticky footer（粘性底部） */
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.page .content {
  flex: 1;
}
```
