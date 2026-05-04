# 表单与输入

HTML 表单是用户与 Web 应用交互的核心机制。浏览器原生提供了丰富的输入类型、表单关联和提交能力，远比很多人以为的强大。

## form 标签属性

```html
<form
  action="/api/submit"
  method="POST"
  enctype="multipart/form-data"
  target="_blank"
  autocomplete="on"
  novalidate
>
  <!-- 表单内容 -->
</form>
```

| 属性 | 说明 | 默认值 |
|------|------|--------|
| `action` | 提交目标 URL | 当前页面 URL |
| `method` | HTTP 方法 | `GET` |
| `enctype` | 编码类型 | `application/x-www-form-urlencoded` |
| `target` | 响应打开位置 | `_self` |
| `autocomplete` | 自动填充 | `on` |
| `novalidate` | 禁用原生验证 | 无（默认启用验证） |

### GET vs POST

```html
<!-- GET：参数附加在 URL 上，适合搜索等幂等操作 -->
<form action="/search" method="GET">
  <input type="search" name="q" placeholder="搜索...">
  <button type="submit">搜索</button>
</form>
<!-- 提交后 URL: /search?q=HTML -->

<!-- POST：参数在请求体中，适合数据修改 -->
<form action="/api/users" method="POST">
  <input type="text" name="username">
  <input type="password" name="password">
  <button type="submit">注册</button>
</form>
```

### enctype 类型

```html
<!-- 默认：URL 编码 -->
<form method="POST" enctype="application/x-www-form-urlencoded">
  <!-- name=value&key=data -->
</form>

<!-- 文件上传：必须用 multipart/form-data -->
<form method="POST" enctype="multipart/form-data">
  <input type="file" name="avatar">
</form>

<!-- 纯文本 -->
<form method="POST" enctype="text/plain">
  <!-- 不编码，直接发送文本 -->
</form>
```

::: tip 文件上传必须用 POST + multipart/form-data
GET 请求有 URL 长度限制，无法传输文件。`enctype="multipart/form-data"` 会将表单数据分割为多个部分（part），每个字段独立编码。
:::

## input type 完整列表

### 文本类

```html
<!-- 文本输入 -->
<input type="text" name="username" placeholder="用户名" maxlength="20">

<!-- 密码 -->
<input type="password" name="pwd" minlength="8" placeholder="密码">

<!-- 搜索（会显示清除按钮） -->
<input type="search" name="q" placeholder="搜索...">

<!-- 邮箱（自带格式验证） -->
<input type="email" name="email" placeholder="you@example.com">

<!-- URL（自带格式验证） -->
<input type="url" name="website" placeholder="https://example.com">

<!-- 电话（移动端弹出数字键盘） -->
<input type="tel" name="phone" pattern="[0-9]{11}" placeholder="手机号">
```

### 数值类

```html
<!-- 数字 -->
<input type="number" name="age" min="0" max="120" step="1">

<!-- 范围滑块 -->
<input type="range" name="volume" min="0" max="100" step="5" value="50">
<!-- range 不显示值，需要配合 output -->
<label>音量：<input type="range" id="vol" min="0" max="100"></label>
<output for="vol">50</output>
```

### 日期时间类

```html
<!-- 日期 -->
<input type="date" name="birthday">
<!-- 值格式：2026-05-04 -->

<!-- 时间 -->
<input type="time" name="alarm">
<!-- 值格式：14:30 -->

<!-- 日期时间（本地） -->
<input type="datetime-local" name="meeting">
<!-- 值格式：2026-05-04T14:30 -->

<!-- 月份 -->
<input type="month" name="report-month">
<!-- 值格式：2026-05 -->

<!-- 周 -->
<input type="week" name="report-week">
<!-- 值格式：2026-W18 -->
```

### 选择类

```html
<!-- 复选框 -->
<input type="checkbox" name="agree" id="agree" required>
<label for="agree">我同意服务条款</label>

<!-- 复选框组 -->
<fieldset>
  <legend>感兴趣的领域</legend>
  <label><input type="checkbox" name="interests" value="html"> HTML</label>
  <label><input type="checkbox" name="interests" value="css"> CSS</label>
  <label><input type="checkbox" name="interests" value="js"> JavaScript</label>
</fieldset>

<!-- 单选按钮 -->
<fieldset>
  <legend>性别</legend>
  <label><input type="radio" name="gender" value="male"> 男</label>
  <label><input type="radio" name="gender" value="female"> 女</label>
  <label><input type="radio" name="gender" value="other"> 其他</label>
</fieldset>

<!-- 颜色选择 -->
<input type="color" name="theme-color" value="#4f46e5">
<!-- 值格式：#rrggbb -->
```

### 文件与按钮

```html
<!-- 文件上传 -->
<input type="file" name="avatar" accept="image/*">
<!-- accept 示例：image/png, image/jpeg, .pdf, image/* -->

<!-- 多文件 -->
<input type="file" name="photos" accept="image/*" multiple>

<!-- 隐藏字段 -->
<input type="hidden" name="csrf_token" value="abc123">

<!-- 提交按钮 -->
<input type="submit" value="提交">

<!-- 重置按钮 -->
<input type="reset" value="重置">

<!-- 普通按钮 -->
<input type="button" value="点击" onclick="handleClick()">
```

::: tip input type 选择指南
| 场景 | 推荐 type |
|------|-----------|
| 搜索框 | `search` |
| 邮箱地址 | `email` |
| 手机号 | `tel` |
| 数量/年龄 | `number` |
| 音量/亮度 | `range` |
| 日期选择 | `date` / `datetime-local` |
| 文件上传 | `file` |
| 颜色选择 | `color` |
| 密码输入 | `password` |
:::

## label 关联方式

### 方式一：for/id 关联

```html
<label for="email">邮箱地址</label>
<input type="email" id="email" name="email">
```

### 方式二：包裹关联

```html
<label>
  邮箱地址
  <input type="email" name="email">
</label>
```

### 方式三：aria-label（无可见标签）

```html
<input type="search" name="q" aria-label="搜索">
```

::: warning label 必须关联
每个表单控件都应该有可访问的名称（accessible name）。没有 `label` 的 `<input>` 对屏幕阅读器用户来说是不可理解的。使用 `for/id` 关联是最可靠的方式。
:::

## select/optgroup/option

```html
<!-- 基础 select -->
<select name="city">
  <option value="">请选择城市</option>
  <option value="bj">北京</option>
  <option value="sh">上海</option>
  <option value="gz">广州</option>
</select>

<!-- 带分组的 select -->
<select name="language">
  <optgroup label="前端">
    <option value="html">HTML</option>
    <option value="css">CSS</option>
    <option value="js">JavaScript</option>
  </optgroup>
  <optgroup label="后端">
    <option value="java">Java</option>
    <option value="python">Python</option>
    <option value="go">Go</option>
  </optgroup>
</select>

<!-- 多选 -->
<select name="skills" multiple size="5">
  <option value="html">HTML</option>
  <option value="css">CSS</option>
  <option value="js">JavaScript</option>
  <option value="ts">TypeScript</option>
  <option value="vue">Vue</option>
</select>

<!-- 预选 -->
<select name="role">
  <option value="user">普通用户</option>
  <option value="admin" selected>管理员</option>
</select>
```

## textarea

```html
<!-- 基础 textarea -->
<textarea name="bio" rows="5" cols="40" placeholder="自我介绍..."></textarea>

<!-- 设置最大长度 -->
<textarea name="comment" maxlength="500"></textarea>

<!-- resize 控制 -->
<style>
  textarea { resize: vertical; } /* 只允许垂直缩放 */
  /* 可选值：none | both | horizontal | vertical | block | inline */
</style>
```

## datalist

`<datalist>` 为 `<input>` 提供预定义选项列表，用户可以自由输入也可以从列表中选择：

```html
<label for="browser">浏览器：</label>
<input type="text" id="browser" name="browser" list="browsers">
<datalist id="browsers">
  <option value="Chrome">
  <option value="Firefox">
  <option value="Safari">
  <option value="Edge">
</datalist>

<!-- 配合 type="url" -->
<label for="homepage">主页：</label>
<input type="url" id="homepage" name="homepage" list="popular-sites">
<datalist id="popular-sites">
  <option value="https://github.com">
  <option value="https://stackoverflow.com">
  <option value="https://developer.mozilla.org">
</datalist>
```

::: tip datalist vs select
- `<select>`：强制用户从预定义列表中选择
- `<datalist>`：提供自动补全建议，用户可以输入任意值
:::

## output 和 meter/progress

```html
<!-- output：计算结果 -->
<form oninput="result.value = parseInt(a.value) + parseInt(b.value)">
  <input type="number" name="a" value="0"> +
  <input type="number" name="b" value="0"> =
  <output name="result">0</output>
</form>

<!-- meter：度量值（已知范围） -->
<label>磁盘使用量：
  <meter value="0.7" min="0" max="1" low="0.3" high="0.8" optimum="0.5">70%</meter>
</label>
<!-- low/high 定义阈值，optimum 定义最优值 -->

<!-- progress：任务进度（未知终点也可） -->
<label>下载进度：
  <progress value="65" max="100">65%</progress>
</label>

<!-- 不确定进度 -->
<progress>加载中...</progress>
```
