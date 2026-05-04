# 无障碍访问（Accessibility）

Web 无障碍（通常缩写为 a11y）确保所有用户——包括视障、听障、运动障碍、认知障碍用户——都能访问和使用 Web 内容。

## WCAG 四原则

WCAG（Web Content Accessibility Guidelines）是 W3C 制定的无障碍标准，基于四个原则（POUR）：

### 1. 可感知（Perceivable）

信息必须能被用户感知到：

```html
<!-- 图片必须有 alt -->
<img src="chart.png" alt="2025年销售额趋势图，逐月增长">

<!-- 视频必须有字幕 -->
<video controls>
  <source src="/video.mp4" type="video/mp4">
  <track kind="captions" src="/captions.vtt" srclang="zh" default>
</video>

<!-- 颜色不是传达信息的唯一方式 -->
<!-- 不好：仅用红色表示错误 -->
<span style="color: red">必填</span>

<!-- 好：颜色 + 图标 + 文字 -->
<span style="color: red" aria-label="必填">* 必填</span>

<!-- 文本对比度至少 4.5:1（普通文本）或 3:1（大文本） -->
<p style="color: #767676; background: #ffffff;">
  对比度不足的文字难以阅读
</p>
<p style="color: #595959; background: #ffffff;">
  对比度足够的文字清晰可读
</p>
```

### 2. 可操作（Operable）

界面组件必须能被操作：

```html
<!-- 所有交互元素必须可通过键盘操作 -->
<!-- 不好 -->
<div onclick="submit()">提交</div>

<!-- 好 -->
<button type="submit" onclick="submit()">提交</button>

<!-- 提供足够的操作时间 -->
<!-- 自动播放的内容应该能暂停 -->
<video autoplay>
  <source src="/video.mp4" type="video/mp4">
</video>
<button aria-label="暂停视频">⏸</button>

<!-- 避免闪烁内容（可能引发癫痫） -->
<!-- 闪烁不超过 3 次/秒 -->
```

### 3. 可理解（Understandable）

内容和操作必须是可理解的：

```html
<!-- 页面语言必须声明 -->
<html lang="zh-CN">

<!-- 表单必须有清晰的标签和错误提示 -->
<label for="email">邮箱地址</label>
<input type="email" id="email" required aria-describedby="email-help">
<span id="email-help">我们不会分享您的邮箱</span>

<!-- 导航方式一致 -->
<!-- 所有页面的主导航位置和结构保持一致 -->
```

### 4. 健壮（Robust）

内容必须兼容各种用户代理（浏览器、屏幕阅读器）：

```html
<!-- 使用有效的 HTML -->
<!-- 标签必须正确闭合，ID 必须唯一 -->

<!-- ARIA 属性必须正确使用 -->
<button aria-expanded="false" aria-controls="menu">
  菜单
</button>
<ul id="menu" hidden>
  <li><a href="/">首页</a></li>
</ul>
```

## ARIA 角色分类

### Landmark 角色

```html
<!-- HTML5 语义标签自带 landmark 角色 -->
<header>        → role="banner"
<nav>           → role="navigation"
<main>          → role="main"
<aside>         → role="complementary"
<footer>        → role="contentinfo"
<form>          → role="form"（需要有 name/aria-label/aria-labelledby）
<section>       → role="region"（需要有 name/aria-label/aria-labelledby）

<!-- 当语义标签无法使用时，显式声明角色 -->
<div role="banner">
  <div role="navigation">...</div>
</div>
<div role="main">...</div>
<div role="contentinfo">...</div>
```

### Widget 角色

```html
<!-- 按钮 -->
<div role="button" tabindex="0">自定义按钮</div>
<!-- 但更好的做法是直接用 <button> -->

<!-- 对话框 -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">确认删除</h2>
  <p>此操作不可撤销，确定要删除吗？</p>
  <button>确认</button>
  <button>取消</button>
</div>

<!-- 标签页 -->
<div role="tablist" aria-label="设置">
  <button role="tab" aria-selected="true" aria-controls="panel-1">通用</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">隐私</button>
</div>
<div role="tabpanel" id="panel-1">通用设置内容</div>
<div role="tabpanel" id="panel-2" hidden>隐私设置内容</div>
```

### Live Region

```html
<!-- aria-live：动态内容更新时通知屏幕阅读器 -->
<div aria-live="polite" aria-atomic="true">
  剩余时间：<span id="timer">30</span> 秒
</div>

<!-- aria-live 值 -->
<!-- off：不通知（默认） -->
<!-- polite：等待用户空闲后通知 -->
<!-- assertive：立即打断用户通知（谨慎使用） -->

<!-- 常见用法：表单验证错误 -->
<form>
  <input type="email" id="email" aria-describedby="email-error">
  <div id="email-error" role="alert" aria-live="assertive">
    <!-- JavaScript 动态填入错误信息 -->
  </div>
</form>

<!-- 加载状态 -->
<button aria-busy="true" aria-disabled="true">
  加载中...
</button>
```

## aria-label / aria-labelledby / aria-describedby

```html
<!-- aria-label：直接提供可访问名称 -->
<button aria-label="关闭对话框">
  <svg aria-hidden="true"><!-- X 图标 --></svg>
</button>

<!-- aria-labelledby：引用其他元素作为可访问名称 -->
<h2 id="section-title">销售报表</h2>
<section aria-labelledby="section-title">
  <!-- 屏幕阅读器会说："销售报表，区域" -->
</section>

<!-- aria-describedby：提供补充描述 -->
<input type="password" id="pwd" aria-describedby="pwd-help">
<div id="pwd-help">密码必须至少 8 位，包含大小写字母和数字</div>
<!-- 屏幕阅读器会在输入框后读出描述 -->
```

::: tip 三者的区别
- `aria-label`：元素的可访问名称（替代 visible text）
- `aria-labelledby`：引用其他元素的文本作为名称
- `aria-describedby`：补充描述（不影响名称，只附加额外信息）
:::

## 键盘导航

### tabindex

```html
<!-- tabindex="0"：按 DOM 顺序加入 Tab 序列 -->
<div tabindex="0">可以通过 Tab 聚焦</div>

<!-- tabindex="-1"：可通过 JavaScript 聚焦，但不在 Tab 序列中 -->
<div tabindex="-1" id="target">只能通过 JS 聚焦</div>
<button onclick="document.getElementById('target').focus()">
  聚焦目标元素
</button>

<!-- tabindex="正整数"：指定 Tab 顺序（不推荐） -->
<div tabindex="1">第一个</div>
<div tabindex="2">第二个</div>
<!-- 不推荐：打乱自然 Tab 顺序，维护困难 -->
```

::: warning 不要使用 tabindex > 0
正整数的 `tabindex` 会覆盖浏览器默认的 Tab 顺序，导致维护困难。始终使用 `tabindex="0"` 或 `tabindex="-1"`，让 Tab 顺序遵循 DOM 顺序。
:::

### focus-visible vs focus

```css
/* :focus：任何聚焦状态（包括鼠标点击） */
button:focus {
  outline: 2px solid #4f46e5;
}

/* :focus-visible：只有键盘 Tab 导航时显示焦点指示器 */
button:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

/* 鼠标点击时不显示焦点框，Tab 导航时显示 */
button:focus:not(:focus-visible) {
  outline: none;
}
```

### 焦点管理陷阱

```html
<!-- 模态对话框必须 trap 焦点 -->
<div role="dialog" aria-modal="true" id="modal">
  <button>确认</button>
  <button>取消</button>
</div>

<script>
const modal = document.getElementById('modal')
const focusableElements = modal.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
)
const firstElement = focusableElements[0]
const lastElement = focusableElements[focusableElements.length - 1]

modal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      // Shift+Tab：从第一个元素回退到最后一个
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab：从最后一个元素回到第一个
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }
  // Escape 关闭模态框
  if (e.key === 'Escape') {
    closeModal()
  }
})
</script>
```

::: tip 焦点管理规则
1. 模态框打开时，焦点移入模态框
2. 模态框内，焦点不能逃逸到模态框外（trap focus）
3. 模态框关闭时，焦点回到触发元素
4. 使用 `inert` 属性（HTML5.2+）可以将模态框外的内容设为不可交互
:::

## 屏幕阅读器测试

### 常用工具

| 平台 | 工具 | 说明 |
|------|------|------|
| macOS | VoiceOver | 系统自带，`Cmd + F5` 开关 |
| Windows | NVDA | 免费开源 |
| Windows | JAWS | 商业软件 |
| iOS | VoiceOver | 系统自带 |
| Android | TalkBack | 系统自带 |

### 快速检查清单

1. 所有图片有适当的 `alt`
2. 表单控件都有可见的 `<label>`
3. 页面有正确的标题层级（h1-h6）
4. 可通过 Tab 键访问所有交互元素
5. 焦点指示器可见
6. 颜色对比度满足 WCAG AA 标准
7. 动态内容更新有 `aria-live` 通知
8. 模态框正确管理焦点

## Lighthouse 可访问性审计

Chrome DevTools 内置 Lighthouse，可以自动检测常见的无障碍问题：

1. 打开 Chrome DevTools（F12）
2. 切换到 Lighthouse 标签
3. 选择 Accessibility 类别
4. 点击 Analyze page load

Lighthouse 会检测：
- 缺失的 `alt` 属性
- 缺失的表单标签
- 低对比度文本
- 不正确的 ARIA 使用
- 缺少的 document title
- 等等
