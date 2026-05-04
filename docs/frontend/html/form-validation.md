# 表单验证

浏览器原生提供了一套完整的表单验证能力。在引入任何 JavaScript 验证库之前，先了解原生方案能做什么。

## 验证属性

### required

```html
<!-- 必填字段 -->
<input type="text" name="username" required>
<input type="email" name="email" required>
<input type="checkbox" name="agree" required>

<!-- select 必选 -->
<select name="city" required>
  <option value="">请选择</option>
  <option value="bj">北京</option>
</select>

<!-- radio 组只需要一个 required -->
<fieldset>
  <legend>性别</legend>
  <label><input type="radio" name="gender" value="male" required> 男</label>
  <label><input type="radio" name="gender" value="female"> 女</label>
</fieldset>
```

### minlength / maxlength

```html
<!-- 最小/最大字符长度 -->
<input type="text" name="username" minlength="2" maxlength="20">
<textarea name="bio" minlength="10" maxlength="500"></textarea>
```

::: tip minlength 与 required 的区别
- `required`：字段不能为空
- `minlength="2"`：字段可以为空，但如果有值则至少 2 个字符
- 两者可以组合使用
:::

### min / max / step

```html
<!-- 数值范围 -->
<input type="number" name="age" min="0" max="120" step="1">
<input type="range" name="score" min="0" max="100" step="5">

<!-- 日期范围 -->
<input type="date" name="event-date" min="2026-01-01" max="2026-12-31">

<!-- 时间范围 -->
<input type="time" name="alarm" min="08:00" max="18:00" step="900">
<!-- step=900 表示以 15 分钟为步进 -->
```

### pattern

```html
<!-- 正则表达式验证 -->
<!-- 只允许字母和数字 -->
<input type="text" name="username" pattern="[A-Za-z0-9]+" title="只允许字母和数字">

<!-- 中国手机号 -->
<input type="tel" name="phone" pattern="1[3-9]\d{9}" title="请输入 11 位手机号">

<!-- 密码：至少 8 位，包含大小写字母和数字 -->
<input type="password" name="pwd"
  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
  title="密码至少 8 位，包含大小写字母和数字">

<!-- 邮政编码 -->
<input type="text" name="zipcode" pattern="\d{6}" title="请输入 6 位邮编">
```

::: warning pattern 的注意事项
- `pattern` 默认匹配整个值（隐式 `^...$`）
- 如果值为空且没有 `required`，不会触发验证
- `pattern` 仅对 `text`、`search`、`url`、`tel`、`email`、`password` 类型有效
:::

### inputmode

```html
<!-- 控制虚拟键盘类型（不影响验证，但改善移动端体验） -->
<input type="text" inputmode="numeric" pattern="\d*">
<!-- 弹出数字键盘 -->

<input type="text" inputmode="decimal">
<!-- 弹出带小数点的数字键盘 -->

<input type="text" inputmode="email">
<!-- 弹出带 @ 的键盘 -->

<input type="text" inputmode="tel">
<!-- 弹出电话键盘 -->

<input type="text" inputmode="url">
<!-- 弹出带 / 和 .com 的键盘 -->

<input type="text" inputmode="search">
<!-- 弹出搜索键盘 -->
```

::: tip inputmode vs type
- `type="email"` 会触发邮箱格式验证
- `inputmode="email"` 只改变键盘布局，不触发验证
- 当你需要自定义键盘但不想用浏览器的验证时，用 `inputmode`
:::

## Constraint Validation API

浏览器提供了一组 JavaScript API 来操作验证状态：

### checkValidity() / reportValidity()

```html
<form id="myForm">
  <input type="email" id="email" required>
  <button type="submit">提交</button>
</form>

<script>
const form = document.getElementById('myForm')
const email = document.getElementById('email')

// checkValidity：返回布尔值，不显示提示
form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault()
    console.log('表单验证失败')
    // 可以自定义错误处理逻辑
  }
})

// reportValidity：返回布尔值，且显示浏览器默认错误提示
document.querySelector('button').addEventListener('click', () => {
  form.reportValidity() // 验证失败时浏览器会自动显示错误气泡
})

// 单个字段的验证
email.checkValidity() // true/false
email.reportValidity() // 显示该字段的错误提示
</script>
```

### setCustomValidity()

```html
<form>
  <label for="password">密码：</label>
  <input type="password" id="password" required minlength="8">

  <label for="confirm">确认密码：</label>
  <input type="password" id="confirm" required>

  <button type="submit">注册</button>
</form>

<script>
const pwd = document.getElementById('password')
const confirm = document.getElementById('confirm')

// 设置自定义错误消息
confirm.addEventListener('input', () => {
  if (confirm.value !== pwd.value) {
    confirm.setCustomValidity('两次输入的密码不一致')
  } else {
    confirm.setCustomValidity('') // 清除错误，必须传空字符串
  }
})

// 自定义异步验证
pwd.addEventListener('input', () => {
  if (pwd.value.length < 8) {
    pwd.setCustomValidity('密码至少 8 位')
  } else if (!/[A-Z]/.test(pwd.value)) {
    pwd.setCustomValidity('密码需包含大写字母')
  } else {
    pwd.setCustomValidity('')
  }
})
</script>
```

::: tip setCustomValidity 必须清空
调用 `setCustomValidity('some message')` 后，该字段永远处于无效状态，直到调用 `setCustomValidity('')` 清除。这是新手常犯的错误。
:::

### ValidityState 对象

```html
<input type="number" id="age" min="0" max="120" required>

<script>
const age = document.getElementById('age')

age.addEventListener('invalid', () => {
  const v = age.validity
  console.log('valueMissing:', v.valueMissing)       // 有 required 但值为空
  console.log('typeMismatch:', v.typeMismatch)       // 类型不匹配（如 email 输入了 "abc"）
  console.log('patternMismatch:', v.patternMismatch) // 不满足 pattern
  console.log('tooLong:', v.tooLong)                 // 超过 maxlength
  console.log('tooShort:', v.tooShort)               // 小于 minlength
  console.log('rangeUnderflow:', v.rangeUnderflow)   // 小于 min
  console.log('rangeOverflow:', v.rangeOverflow)     // 大于 max
  console.log('stepMismatch:', v.stepMismatch)       // 不满足 step
  console.log('badInput:', v.badInput)               // 无法解析（如 number 输入了 "abc"）
  console.log('customError:', v.customError)         // 有自定义错误
  console.log('valid:', v.valid)                     // 以上都为 false 时为 true
})
</script>
```

### 自定义验证 UI

```html
<form id="signup">
  <div class="field">
    <label for="email">邮箱：</label>
    <input type="email" id="email" required>
    <span class="error-msg" aria-live="polite"></span>
  </div>
  <button type="submit">注册</button>
</form>

<style>
.field { margin-bottom: 1em; }
.error-msg {
  display: block;
  color: #dc2626;
  font-size: 0.875rem;
  min-height: 1.25em;
}
input:invalid:not(:placeholder-shown) {
  border-color: #dc2626;
}
</style>

<script>
const form = document.getElementById('signup')
const email = document.getElementById('email')
const errorMsg = form.querySelector('.error-msg')

// 禁用浏览器默认气泡
form.setAttribute('novalidate', '')

email.addEventListener('input', () => {
  if (email.validity.valueMissing) {
    errorMsg.textContent = '请输入邮箱地址'
  } else if (email.validity.typeMismatch) {
    errorMsg.textContent = '请输入有效的邮箱地址'
  } else {
    errorMsg.textContent = ''
  }
})

form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault()
    email.dispatchEvent(new Event('input')) // 触发错误显示
  }
})
</script>
```

## 验证伪类

```html
<style>
/* 有效字段 */
input:valid {
  border-color: #22c55e;
}

/* 无效字段 */
input:invalid {
  border-color: #dc2626;
}

/* 必填字段 */
input:required {
  border-left: 3px solid #f59e0b;
}

/* 选填字段 */
input:optional {
  border-left: 3px solid #94a3b8;
}

/* 用户交互过的无效字段（推荐的 UX 模式） */
input:invalid:not(:placeholder-shown):not(:focus) {
  border-color: #dc2626;
}

/* 提交后显示所有错误 */
form.submitted input:invalid {
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
}
</style>
```

::: tip :invalid 的行为
`:invalid` 伪类在页面加载时就生效。这意味着用户还没开始输入，必填字段就已经显示红色边框。使用 `:not(:placeholder-shown)` 可以只在用户输入了内容后才显示错误状态。
:::

## novalidate 和 formnovalidate

```html
<!-- form 级别禁用验证 -->
<form action="/save" method="POST" novalidate>
  <!-- 所有验证被禁用，但仍可通过 JavaScript API 验证 -->
  <input type="email" name="email" required>
  <button type="submit">保存</button>
</form>

<!-- 按钮级别禁用验证 -->
<form action="/api/update" method="POST">
  <input type="email" name="email" required>
  <input type="text" name="name" required>

  <!-- 这个按钮会触发验证 -->
  <button type="submit">提交并验证</button>

  <!-- 这个按钮跳过验证 -->
  <button type="submit" formnovalidate>保存草稿（不验证）</button>
</form>

<!-- 多个按钮有不同行为 -->
<form id="draft-form">
  <input type="email" name="email" required>
  <input type="text" name="content" required>

  <button type="submit">发布（验证）</button>
  <button type="submit" formnovalidate>暂存（不验证）</button>
  <button type="button" id="preview">预览</button>
</form>
```

## 验证事件

```html
<form>
  <input type="email" id="email" required>
  <button type="submit">提交</button>
</form>

<script>
const email = document.getElementById('email')

// invalid 事件：字段验证失败时触发
email.addEventListener('invalid', (e) => {
  e.preventDefault() // 阻止默认气泡
  console.log('验证失败，原因:', email.validity)
})

// submit 事件中检查整体验证
document.querySelector('form').addEventListener('submit', (e) => {
  // checkValidity 对所有字段触发 invalid 事件
  if (!e.target.checkValidity()) {
    e.preventDefault()
  }
})
</script>
```
