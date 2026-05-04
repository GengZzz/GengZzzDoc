# Shadow DOM 与模板

Shadow DOM 提供了真正的 DOM 和样式封装，是 Web Components 实现组件化的关键。

## Shadow DOM 基础

```html
<div id="host"></div>

<script>
const host = document.getElementById('host')

// 创建 Shadow Root
const shadowRoot = host.attachShadow({ mode: 'open' })

// 向 Shadow Root 中添加内容
shadowRoot.innerHTML = `
  <style>
    /* 这些样式只影响 Shadow DOM 内部 */
    p { color: red; }
  </style>
  <p>这段文字是红色的，外部样式无法影响它。</p>
`

// 外部的 p { color: blue } 不会影响 Shadow DOM 内的 p
</script>

<p>这段文字是默认颜色，不受 Shadow DOM 内样式影响。</p>
```

### open vs closed

```html
<script>
// open 模式：外部可以通过 host.shadowRoot 访问
const openHost = document.getElementById('open-host')
const openRoot = openHost.attachShadow({ mode: 'open' })
openHost.shadowRoot // → ShadowRoot 对象，可访问

// closed 模式：外部无法访问 shadowRoot
const closedHost = document.getElementById('closed-host')
const closedRoot = closedHost.attachShadow({ mode: 'closed' })
closedHost.shadowRoot // → null，无法访问
</script>
```

::: tip open vs closed 的选择
- **open**：调试方便，外部可以检查 Shadow DOM 内容，大多数场景使用
- **closed**：更强的封装，但不能阻止用户通过 DevTools 查看
- `<video>`、`<input>` 等浏览器原生元素使用 closed Shadow DOM
- 推荐使用 `open`，`closed` 的实际安全收益有限
:::

## 样式隔离

### :host 伪类

```html
<my-card></my-card>

<script>
class MyCard extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        /* 选择宿主元素 */
        :host {
          display: block;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        /* 宿主元素的特定状态 */
        :host(.highlighted) {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        /* 宿主在特定上下文中的样式 */
        :host(.dark-theme) {
          background: #1f2937;
          color: #f9fafb;
          border-color: #374151;
        }

        /* :host-context 匹配宿主的祖先元素 */
        :host-context(.dark-mode) {
          background: #1f2937;
          color: #f9fafb;
        }

        /* 内部样式 */
        .title {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 8px;
        }
      </style>
      <h3 class="title"><slot name="title">默认标题</slot></h3>
      <div class="content">
        <slot></slot>
      </div>
    `
  }
}
customElements.define('my-card', MyCard)
</script>

<!-- 使用 -->
<my-card>
  <span slot="title">卡片标题</span>
  <p>卡片内容</p>
</my-card>

<!-- 添加 class 控制样式 -->
<my-card class="highlighted">...</my-card>
<my-card class="dark-theme">...</my-card>
```

### ::part 和 ::slotted

```html
<style>
/* 从外部选择 Shadow DOM 内部的 ::part */
my-card::part(header) {
  background: #4f46e5;
  color: white;
}

my-card::part(body) {
  font-size: 14px;
}

/* ::slotted 选择投射到 Shadow DOM 的 Light DOM 元素 */
/* 注意：只能选择直接子元素，不能选择后代 */
</style>

<my-card>
  <span slot="title">标题</span>
  <p>这是一段被 ::slotted 选中的内容</p>
</my-card>

<script>
class MyCard extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        /* slotted 样式：只对投射的 Light DOM 子元素生效 */
        ::slotted(p) {
          color: #6b7280;
          line-height: 1.6;
        }
        ::slotted(*) {
          margin: 8px 0;
        }
      </style>
      <div part="header">
        <slot name="title"></slot>
      </div>
      <div part="body">
        <slot></slot>
      </div>
    `
  }
}
customElements.define('my-card', MyCard)
</script>
```

::: tip ::part 的优势
`::part` 允许组件暴露特定元素给外部样式化，同时保持其余元素的封装。这是一种"受控的样式穿透"：
```css
/* 只能样式化带有 part 属性的元素 */
my-card::part(header) { }  /* ✓ 有效 */
my-card::part(body) { }    /* ✓ 有效 */
my-card .title { }         /* ✗ 无效，Shadow DOM 内部不可选择 */
```
:::

## slot 插槽

### 默认插槽

```html
<my-widget>
  <p>这些内容会被投射到默认 slot 中</p>
  <p>可以放任意内容</p>
</my-widget>

<script>
class MyWidget extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; border: 1px solid #ccc; padding: 16px; }
        ::slotted(p) { margin: 0 0 8px; }
      </style>
      <header>组件头部（Shadow DOM 内容）</header>
      <slot><!-- 没有 name 的 slot 是默认插槽 --></slot>
      <footer>组件尾部（Shadow DOM 内容）</footer>
    `
  }
}
customElements.define('my-widget', MyWidget)
</script>
```

### 具名插槽

```html
<app-layout>
  <header slot="header">页面头部</header>
  <nav slot="sidebar">
    <ul>
      <li><a href="/">首页</a></li>
      <li><a href="/docs">文档</a></li>
    </ul>
  </nav>
  <main>主内容区域</main>
  <footer slot="footer">页面底部</footer>
</app-layout>

<script>
class AppLayout extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-areas:
            "header header"
            "sidebar main"
            "footer footer";
          grid-template-columns: 200px 1fr;
          min-height: 100vh;
        }
        ::slotted([slot="header"]) { grid-area: header; }
        ::slotted([slot="sidebar"]) { grid-area: sidebar; }
        ::slotted([slot="footer"]) { grid-area: footer; }
        slot:not([name])::slotted(*) { grid-area: main; }
      </style>
      <slot name="header"></slot>
      <slot name="sidebar"></slot>
      <slot><!-- 默认插槽 --></slot>
      <slot name="footer"></slot>
    `
  }
}
customElements.define('app-layout', AppLayout)
</script>
```

### slot 事件

```html
<my-tabs>
  <div slot="tab-1">Tab 1 内容</div>
  <div slot="tab-2">Tab 2 内容</div>
</my-tabs>

<script>
class MyTabs extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <slot name="tab-1"></slot>
      <slot name="tab-2"></slot>
    `

    // 监听 slotchange 事件
    this.shadowRoot.querySelectorAll('slot').forEach(slot => {
      slot.addEventListener('slotchange', () => {
        console.log(`Slot "${slot.name}" 的内容变化了`)
        console.log('分配的节点:', slot.assignedNodes())
      })
    })
  }
}
customElements.define('my-tabs', MyTabs)
</script>
```

## template 标签

`<template>` 包含的 HTML 不会被浏览器解析和渲染，可以被 JavaScript 克隆使用：

```html
<!-- 定义模板 -->
<template id="card-template">
  <article class="card">
    <header class="card-header">
      <h3 class="card-title"></h3>
    </header>
    <div class="card-body">
      <p class="card-content"></p>
    </div>
    <footer class="card-footer">
      <button class="card-action">详情</button>
    </footer>
  </article>
</template>

<!-- 使用模板 -->
<div id="card-container"></div>

<script>
const template = document.getElementById('card-template')
const container = document.getElementById('card-container')

const cards = [
  { title: 'HTML 基础', content: '学习 HTML 文档结构' },
  { title: 'CSS 布局', content: '掌握 Flexbox 和 Grid' },
  { title: 'JavaScript', content: 'ES6+ 语法特性' },
]

cards.forEach(data => {
  // 克隆模板内容（DocumentFragment）
  const clone = template.content.cloneNode(true)

  // 填充数据
  clone.querySelector('.card-title').textContent = data.title
  clone.querySelector('.card-content').textContent = data.content

  // 插入到页面
  container.appendChild(clone)
})
</script>

<style>
/* 模板中的样式可以写在外部 */
.card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}
.card-title {
  margin: 0 0 8px;
}
</style>
```

::: tip template + Custom Elements
`<template>` 常与 Custom Elements 结合使用，在 `connectedCallback` 中克隆模板而不是拼接 HTML 字符串，性能更好且更安全：
```js
class MyCard extends HTMLElement {
  static template = document.getElementById('card-template')

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    const clone = MyCard.template.content.cloneNode(true)
    this.shadowRoot.appendChild(clone)
  }
}
```
:::

## DocumentFragment

```html
<script>
// DocumentFragment 是轻量的 DOM 容器，不会产生额外的 DOM 节点
const fragment = document.createDocumentFragment()

for (let i = 0; i < 100; i++) {
  const li = document.createElement('li')
  li.textContent = `项目 ${i + 1}`
  fragment.appendChild(li)
}

// 一次性插入，只触发一次回流
document.querySelector('ul').appendChild(fragment)
</script>
```

## CSS 变量穿透 Shadow DOM

```html
<style>
  /* 外部定义 CSS 变量 */
  :root {
    --card-bg: #ffffff;
    --card-border: #e5e7eb;
    --card-text: #1f2937;
    --card-accent: #4f46e5;
  }

  .dark {
    --card-bg: #1f2937;
    --card-border: #374151;
    --card-text: #f9fafb;
    --card-accent: #818cf8;
  }
</style>

<my-card>默认主题</my-card>
<div class="dark">
  <my-card>暗色主题</my-card>
</div>

<script>
class MyCard extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        /* Shadow DOM 内部可以使用外部定义的 CSS 变量 */
        :host {
          display: block;
          padding: 16px;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--card-border, #e5e7eb);
          color: var(--card-text, #1f2937);
          border-radius: 8px;
        }
        .accent {
          color: var(--card-accent, #4f46e5);
        }
      </style>
      <h3 class="accent"><slot name="title">默认标题</slot></h3>
      <slot></slot>
    `
  }
}
customElements.define('my-card', MyCard)
</script>
```

::: tip CSS 变量是穿透 Shadow DOM 的最佳方式
CSS 自定义属性（CSS 变量）是唯一能自然穿透 Shadow DOM 的 CSS 特性。这是实现主题系统和设计令牌（Design Tokens）的理想方案：
- 外部定义变量值
- Shadow DOM 内部使用变量
- 改变外部变量值，Shadow DOM 内部自动跟随
:::
