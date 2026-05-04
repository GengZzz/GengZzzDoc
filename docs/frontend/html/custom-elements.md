# 自定义元素（Custom Elements）

Custom Elements 是 Web Components 的核心 API 之一，它允许开发者创建自定义的 HTML 标签，拥有自己的行为和封装。

## Custom Elements API

### 自治元素（Autonomous Custom Elements）

```html
<!-- 使用自定义元素 -->
<my-greeting name="World"></my-greeting>

<script>
// 定义自定义元素
class MyGreeting extends HTMLElement {
  // 构造函数
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  // 组件挂载到 DOM 时调用
  connectedCallback() {
    const name = this.getAttribute('name') || 'Guest'
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
          background: #f0f9ff;
          border-radius: 8px;
          font-family: sans-serif;
        }
        span { color: #2563eb; font-weight: bold; }
      </style>
      <p>Hello, <span>${name}</span>!</p>
    `
  }
}

// 注册自定义元素
// 名称必须包含连字符（kebab-case），避免与原生标签冲突
customElements.define('my-greeting', MyGreeting)
</script>
```

::: warning 自定义元素命名规则
- 名称必须包含至少一个连字符（`-`），如 `my-component`、`user-card`
- 不能以连字符开头或结尾
- 不能包含大写字母
- 不能与原生 HTML 标签名冲突
- 这是为了区分原生元素和自定义元素
:::

### 内置扩展元素（Customized Built-in Elements）

```html
<!-- 扩展原生 button 元素 -->
<fancy-button>点击我</fancy-button>

<script>
class FancyButton extends HTMLButtonElement {
  connectedCallback() {
    this.style.cssText = `
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `
    this.addEventListener('click', () => {
      this.style.transform = 'scale(0.95)'
      setTimeout(() => this.style.transform = '', 150)
    })
  }
}

customElements.define('fancy-button', FancyButton, { extends: 'button' })
</script>

<!-- 使用时需要 is 属性 -->
<button is="fancy-button">点击我</button>
```

::: tip 自治 vs 内置扩展
- **自治元素**：从零创建，继承 `HTMLElement`，使用自定义标签名
- **内置扩展**：继承原生元素（如 `HTMLButtonElement`），使用 `is` 属性
- 内置扩展继承了原生元素的所有行为（表单提交、键盘可访问性等）
- 内置扩展的浏览器支持不如自治元素广泛
:::

## 生命周期回调

```html
<life-cycle-demo></life-cycle-demo>

<script>
class LifeCycleDemo extends HTMLElement {
  static observedAttributes = ['color', 'size']

  constructor() {
    super()
    console.log('1. constructor：元素被创建')
    // 可以在此初始化状态、创建 Shadow DOM
    // 不要在此读取属性或子元素
  }

  connectedCallback() {
    console.log('2. connectedCallback：元素插入 DOM')
    // 可以安全地读取属性、设置内容、添加事件监听
    this.render()
    this.addEventListener('click', this._handleClick)
  }

  disconnectedCallback() {
    console.log('3. disconnectedCallback：元素从 DOM 移除')
    // 清理事件监听、定时器、WebSocket 连接等
    this.removeEventListener('click', this._handleClick)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`4. attributeChangedCallback：${name} 从 ${oldValue} 变为 ${newValue}`)
    // 只有在 observedAttributes 中声明的属性才会触发
    if (oldValue !== newValue) {
      this.render()
    }
  }

  adoptedCallback() {
    console.log('5. adoptedCallback：元素被移动到新文档')
    // 使用 document.adoptNode() 时触发，较少使用
  }

  // 必须声明要观察的属性
  static get observedAttributes() {
    return ['color', 'size']
  }

  // 属性访问器（getter/setter）
  get color() {
    return this.getAttribute('color') || '#4f46e5'
  }

  set color(value) {
    this.setAttribute('color', value)
  }

  render() {
    this.textContent = `颜色：${this.color}，大小：${this.getAttribute('size') || 'medium'}`
  }

  _handleClick = () => {
    console.log('被点击了！')
  }
}

customElements.define('life-cycle-demo', LifeCycleDemo)
</script>
```

### 生命周期执行顺序

```
1. constructor()
   ↓
2. connectedCallback()   ← 元素插入页面时
   ↓
3. attributeChangedCallback()  ← 属性变化时（可多次触发）
   ↓
4. disconnectedCallback()  ← 元素从页面移除时

adoptedCallback() 在 document.adoptNode() 时触发（较少使用）
```

## observedAttributes

```html
<user-avatar size="48" status="online" src="/avatar.jpg"></user-avatar>

<script>
class UserAvatar extends HTMLElement {
  // 静态 getter 声明观察的属性
  static get observedAttributes() {
    return ['size', 'status', 'src']
  }

  connectedCallback() {
    this.render()
  }

  attributeChangedCallback(name, oldVal, newVal) {
    // 统一处理属性变化
    switch (name) {
      case 'size':
        this.style.setProperty('--avatar-size', `${newVal}px`)
        break
      case 'status':
        this.querySelector('.status-dot')?.className = `status-dot ${newVal}`
        break
      case 'src':
        this.querySelector('img')?.setAttribute('src', newVal)
        break
    }
  }

  render() {
    const size = this.getAttribute('size') || 40
    const status = this.getAttribute('status') || 'offline'
    const src = this.getAttribute('src') || '/default-avatar.png'

    this.innerHTML = `
      <style>
        :host {
          position: relative;
          display: inline-block;
          width: ${size}px;
          height: ${size}px;
        }
        img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }
        .status-dot.online { background: #22c55e; }
        .status-dot.offline { background: #94a3b8; }
        .status-dot.busy { background: #ef4444; }
      </style>
      <img src="${src}" alt="用户头像">
      <span class="status-dot ${status}"></span>
    `
  }
}

customElements.define('user-avatar', UserAvatar)
</script>
```

## Custom Elements 与框架集成

### Vue 集成

```vue
<!-- 在 Vue 中使用自定义元素 -->
<template>
  <div>
    <!-- 直接使用自定义标签 -->
    <my-greeting name="Vue"></my-greeting>
  </div>
</template>

<script setup>
// 在 Vue 组件中注册自定义元素
import { onMounted } from 'vue'

onMounted(() => {
  // 确保自定义元素已注册
  if (!customElements.get('my-greeting')) {
    class MyGreeting extends HTMLElement {
      connectedCallback() {
        this.textContent = `Hello from Custom Element!`
      }
    }
    customElements.define('my-greeting', MyGreeting)
  }
})
</script>
```

::: tip Vue 中使用 Custom Elements
在 Vue 项目中，需要在 `vite.config.ts` 中配置 `compilerOptions.isCustomElement`，告诉 Vue 编译器将自定义标签作为原生元素处理：
```ts
// vite.config.ts
export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('my-')
        }
      }
    })
  ]
}
```
:::

### React 集成

```jsx
// React 中使用自定义元素
function App() {
  const ref = useRef()

  useEffect(() => {
    // 通过 ref 添加事件监听
    ref.current?.addEventListener('custom-event', (e) => {
      console.log('收到自定义事件:', e.detail)
    })
  }, [])

  // React 无法直接传递 props 到自定义元素
  // 需要用 setAttribute 或 property
  return <my-greeting ref={ref} name="React" />
}
```

## 自定义元素的限制

1. **不能自闭合**：必须写成 `<my-el></my-el>`，不能写 `<my-el />`
2. **生命周期不确定**：`connectedCallback` 可能在 `constructor` 之前调用（服务端渲染场景）
3. **属性类型全是字符串**：`getAttribute` 返回的都是字符串，需要手动转换
4. **样式穿透有限**：外部样式无法影响 Shadow DOM 内部（除非使用 CSS 变量或 `::part`）
5. **浏览器兼容**：现代浏览器均支持，IE 不支持（需要 polyfill）
