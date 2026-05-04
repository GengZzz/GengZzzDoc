# 音视频与 Canvas

HTML5 原生支持多媒体（audio/video）和绘图（canvas/SVG），不再需要 Flash 等插件。

## audio 标签

```html
<!-- 基础用法 -->
<audio src="/audio/bgm.mp3" controls>
  您的浏览器不支持 audio 标签。
</audio>

<!-- 多格式兼容 -->
<audio controls preload="metadata">
  <source src="/audio/bgm.ogg" type="audio/ogg">
  <source src="/audio/bgm.mp3" type="audio/mpeg">
  <source src="/audio/bgm.wav" type="audio/wav">
  您的浏览器不支持 audio 标签。
</audio>

<!-- 带属性的完整用法 -->
<audio
  controls
  autoplay
  loop
  muted
  preload="metadata"
  crossorigin="anonymous"
>
  <source src="/audio/bgm.mp3" type="audio/mpeg">
</audio>
```

| 属性 | 说明 |
|------|------|
| `controls` | 显示播放控件 |
| `autoplay` | 自动播放（多数浏览器要求同时设 `muted`） |
| `loop` | 循环播放 |
| `muted` | 静音 |
| `preload` | `none`/`metadata`/`auto`（预加载策略） |
| `crossorigin` | 跨域设置 |

::: warning autoplay 策略
现代浏览器限制自动播放：只有静音的音频/视频可以自动播放。如果需要带声音自动播放，必须先让用户与页面交互（如点击按钮）。
:::

## video 标签

```html
<!-- 基础用法 -->
<video src="/video/demo.mp4" controls width="640" height="360">
  您的浏览器不支持 video 标签。
</video>

<!-- 多格式 + 字幕 -->
<video controls width="640" height="360" poster="/video/poster.jpg">
  <source src="/video/demo.webm" type="video/webm">
  <source src="/video/demo.mp4" type="video/mp4">
  <track
    kind="subtitles"
    src="/video/subtitles-zh.vtt"
    srclang="zh"
    label="中文"
    default
  >
  <track
    kind="subtitles"
    src="/video/subtitles-en.vtt"
    srclang="en"
    label="English"
  >
  您的浏览器不支持 video 标签。
</video>

<!-- 响应式视频 -->
<style>
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
}
.video-container video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
<div class="video-container">
  <video controls>
    <source src="/video/demo.mp4" type="video/mp4">
  </video>
</div>
```

| 属性 | 说明 |
|------|------|
| `poster` | 视频加载前显示的封面图 |
| `width` / `height` | 视频尺寸 |
| `playsinline` | iOS Safari 中内联播放而非全屏 |

### track 字幕

```html
<video controls>
  <source src="/video/demo.mp4" type="video/mp4">
  <track kind="subtitles" src="/subs/zh.vtt" srclang="zh" label="中文" default>
  <track kind="captions" src="/subs/en.vtt" srclang="en" label="English">
  <track kind="descriptions" src="/subs/desc.vtt" srclang="zh" label="音频描述">
</video>
```

`kind` 值说明：

| 值 | 用途 |
|------|------|
| `subtitles` | 翻译字幕 |
| `captions` | 隐藏式字幕（含音效描述，面向听障用户） |
| `descriptions` | 视频内容的文字描述（面向视障用户） |
| `chapters` | 章节导航 |
| `metadata` | 元数据，脚本可用 |

## Canvas 2D API 基础

```html
<canvas id="myCanvas" width="400" height="300">
  您的浏览器不支持 Canvas。
</canvas>

<script>
const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

// 填充矩形
ctx.fillStyle = '#4f46e5'
ctx.fillRect(10, 10, 100, 80)

// 描边矩形
ctx.strokeStyle = '#dc2626'
ctx.lineWidth = 2
ctx.strokeRect(130, 10, 100, 80)

// 画线
ctx.beginPath()
ctx.moveTo(10, 120)
ctx.lineTo(240, 120)
ctx.lineTo(125, 200)
ctx.closePath()
ctx.stroke()

// 填充圆形
ctx.beginPath()
ctx.arc(300, 50, 40, 0, Math.PI * 2)
ctx.fillStyle = '#22c55e'
ctx.fill()

// 文字
ctx.font = '16px sans-serif'
ctx.fillStyle = '#1f2937'
ctx.fillText('Hello Canvas!', 10, 260)
</script>
```

### drawImage

```html
<canvas id="imgCanvas" width="400" height="300"></canvas>

<script>
const canvas = document.getElementById('imgCanvas')
const ctx = canvas.getContext('2d')
const img = new Image()

img.onload = () => {
  // 基础绘制
  ctx.drawImage(img, 0, 0)

  // 缩放绘制
  ctx.drawImage(img, 200, 0, 100, 75)

  // 裁剪绘制：从原图 (sx, sy, sw, sh) 裁剪，绘制到 (dx, dy, dw, dh)
  ctx.drawImage(img, 50, 50, 200, 150, 0, 150, 200, 150)
}

img.src = '/images/photo.jpg'
</script>
```

### requestAnimationFrame

```html
<canvas id="animCanvas" width="400" height="100"></canvas>

<script>
const canvas = document.getElementById('animCanvas')
const ctx = canvas.getContext('2d')
let x = 0

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.beginPath()
  ctx.arc(x, 50, 20, 0, Math.PI * 2)
  ctx.fillStyle = '#4f46e5'
  ctx.fill()

  x += 2
  if (x > canvas.width + 20) x = -20

  requestAnimationFrame(draw)
}

requestAnimationFrame(draw)
</script>
```

## SVG 内联 vs 外部引用

### 内联 SVG

```html
<!-- 内联 SVG：可被 CSS 和 JavaScript 控制 -->
<svg viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="圆形图标">
  <circle cx="50" cy="50" r="45" fill="#4f46e5" stroke="#1e1b4b" stroke-width="2"/>
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="16">SVG</text>
</svg>

<!-- 内联 SVG 可以用 CSS 修改样式 -->
<style>
.icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}
</style>
<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
</svg>
```

### 外部引用 SVG

```html
<!-- img 标签 -->
<img src="/icons/logo.svg" alt="Logo" width="120" height="40">

<!-- object 标签（可被 CSS 和 JavaScript 部分控制） -->
<object type="image/svg+xml" data="/icons/illustration.svg" width="400" height="300">
  <p>您的浏览器不支持 SVG</p>
</object>

<!-- SVG sprite（推荐用于图标系统） -->
<svg style="display:none">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
    <line x1="15" y1="15" x2="21" y2="21" stroke="currentColor" stroke-width="2"/>
  </symbol>
</svg>

<!-- 使用 sprite -->
<svg class="icon" aria-hidden="true"><use href="#icon-home"></svg>
<svg class="icon" aria-hidden="true"><use href="#icon-search"></svg>
```

::: tip SVG 选择策略
- **内联 SVG**：需要 CSS/JS 控制、需要继承 `currentColor`、小图标
- **img 标签引用**：不需要交互控制、浏览器可以缓存
- **SVG sprite**：大量图标时推荐，减少 HTTP 请求
- **外部 CSS 背景图**：纯装饰性图标
:::
