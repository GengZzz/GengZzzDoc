# 图片与响应式

图片是网页中最重的资源之一。正确使用 `<img>` 标签、响应式图片技术、以及选择合适的图片格式，对性能和用户体验都有巨大影响。

## img 标签完整属性

```html
<img
  src="/images/photo.jpg"
  alt="日落时分的海岸线"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
  fetchpriority="low"
>
```

| 属性 | 说明 | 用途 |
|------|------|------|
| `src` | 图片 URL | 必填 |
| `alt` | 替代文本 | 图片无法加载时显示，屏幕阅读器朗读 |
| `width` | 图片宽度（像素） | 浏览器预留空间，避免布局偏移 |
| `height` | 图片高度（像素） | 浏览器预留空间，避免布局偏移 |
| `loading` | 加载策略 | `lazy`（懒加载）/ `eager`（立即加载） |
| `decoding` | 解码方式 | `async`（异步解码，不阻塞渲染） |
| `fetchpriority` | 获取优先级 | `high` / `low` / `auto` |
| `crossorigin` | 跨域设置 | `anonymous` / `use-credentials` |
| `referrerpolicy` | Referer 策略 | `no-referrer` 等 |
| `sizes` | 尺寸描述（配合 srcset） | 媒体查询描述 |
| `srcset` | 响应式图片源 | 多分辨率图片列表 |

### alt 属性

```html
<!-- 信息性图片：描述图片内容 -->
<img src="chart.png" alt="2025 年各月销售额柱状图，最高值出现在 12 月">

<!-- 装饰性图片：空 alt -->
<img src="decorative-border.png" alt="">

<!-- 功能性图片（如按钮图标）：描述功能 -->
<img src="search-icon.png" alt="搜索">

<!-- 复杂图片：提供详细描述 -->
<figure>
  <img src="architecture.png" alt="系统架构图">
  <figcaption>
    图 1：微服务架构图（详细描述见下方）
  </figcaption>
</figure>
```

::: warning alt 必须填写
- 信息性图片：用简短文字描述图片内容
- 装饰性图片：设 `alt=""`（空字符串，不是省略属性）
- 永远不要用 `alt="图片"` 或 `alt="image"` 这种无意义文本
- 不要包含"图片"、"照片"等前缀
:::

### width 和 height

```html
<!-- 显式设置宽高，防止 Cumulative Layout Shift (CLS) -->
<img src="photo.jpg" alt="风景" width="800" height="600">

<!-- CSS 控制显示尺寸，HTML 属性告诉浏览器原始比例 -->
<style>
img {
  width: 100%;
  height: auto;
}
</style>
<img src="photo.jpg" alt="风景" width="800" height="600">
```

::: tip 为什么 width/height 对性能很重要
浏览器在解析 HTML 时就能知道图片的宽高比，从而在图片加载完成前预留正确的空间。如果没有宽高，图片加载时会导致页面布局偏移（Layout Shift），影响 CLS（Cumulative Layout Shift）指标。
:::

## 响应式图片

### srcset + sizes

```html
<img
  src="/images/photo-800.jpg"
  srcset="
    /images/photo-400.jpg  400w,
    /images/photo-800.jpg  800w,
    /images/photo-1200.jpg 1200w,
    /images/photo-1600.jpg 1600w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 50vw,
    33vw
  "
  alt="响应式图片示例"
  width="1600"
  height="900"
>
```

工作原理：
1. `srcset` 列出多个图片源及其**固有宽度**（`400w` 表示图片宽度 400px）
2. `sizes` 描述图片在不同视口下的**显示宽度**
3. 浏览器根据设备像素比（DPR）和当前视口宽度，自动选择最合适的图片

```
屏幕宽度 375px (DPR=2)：
  → sizes 说图片显示 100vw = 375px
  → 需要 375 × 2 = 750px 的图片
  → 选择 800w 的图片

屏幕宽度 1440px (DPR=1)：
  → sizes 说图片显示 33vw = 480px
  → 需要 480px 的图片
  → 选择 400w 的图片
```

### picture + source

`<picture>` 元素用于**艺术方向**（不同布局裁剪）或**格式切换**：

```html
<!-- 不同格式：优先 AVIF，其次 WebP，最后 JPEG -->
<picture>
  <source srcset="/images/photo.avif" type="image/avif">
  <source srcset="/images/photo.webp" type="image/webp">
  <img src="/images/photo.jpg" alt="照片" width="800" height="600">
</picture>

<!-- 艺术方向：不同屏幕显示不同裁剪 -->
<picture>
  <source
    media="(min-width: 800px)"
    srcset="/images/landscape-wide.jpg"
  >
  <source
    media="(min-width: 400px)"
    srcset="/images/landscape-medium.jpg"
  >
  <img
    src="/images/landscape-narrow.jpg"
    alt="风景"
    width="400"
    height="600"
  >
</picture>

<!-- 综合：不同格式 + 不同分辨率 -->
<picture>
  <source
    type="image/avif"
    srcset="
      /images/photo-400.avif  400w,
      /images/photo-800.avif  800w,
      /images/photo-1200.avif 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
  >
  <source
    type="image/webp"
    srcset="
      /images/photo-400.webp  400w,
      /images/photo-800.webp  800w,
      /images/photo-1200.webp 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
  >
  <img
    src="/images/photo-800.jpg"
    srcset="
      /images/photo-400.jpg  400w,
      /images/photo-800.jpg  800w,
      /images/photo-1200.jpg 1200w
    "
    sizes="(max-width: 600px) 100vw, 50vw"
    alt="照片"
    width="1200"
    height="800"
  >
</picture>
```

## 图片格式选择

| 格式 | 透明 | 动画 | 压缩率 | 浏览器支持 | 适用场景 |
|------|------|------|--------|-----------|----------|
| JPEG | 否 | 否 | 中 | 全部 | 照片、复杂图像 |
| PNG | 是 | 否 | 低 | 全部 | 需要透明的照片、截图 |
| WebP | 是 | 是 | 高 | 现代浏览器 | 替代 JPEG/PNG 的首选 |
| AVIF | 是 | 是 | 最高 | Chrome/Firefox/Edge | 追求极致压缩 |
| SVG | 是 | 是 | 高 | 全部 | 图标、Logo、简单图形 |
| GIF | 是 | 是 | 低 | 全部 | 简单动画（用 CSS/JS 替代） |

::: tip 格式选择策略
1. 照片：AVIF > WebP > JPEG（使用 `<picture>` 提供降级方案）
2. 图标/Logo：SVG（矢量，无限缩放）
3. 截图/图表：PNG（无损）或 WebP（更小）
4. 简单动画：CSS 动画 > Lottie > GIF
:::

## 懒加载

```html
<!-- 原生懒加载 -->
<img src="photo.jpg" alt="照片" loading="lazy" width="800" height="600">

<!-- 立即加载（首屏关键图片） -->
<img src="hero.jpg" alt="首屏大图" loading="eager" fetchpriority="high">

<!-- fetchpriority 提示浏览器加载优先级 -->
<img src="hero.jpg" alt="主图" fetchpriority="high" width="1200" height="600">
<img src="sidebar.jpg" alt="侧边栏图" loading="lazy" fetchpriority="low" width="300" height="200">
```

::: warning 懒加载的注意事项
- 首屏可见的图片不应该用 `loading="lazy"`，否则浏览器会延迟加载
- 懒加载的图片**必须**设置 `width` 和 `height`，否则懒加载触发前没有预留空间
- `loading="lazy"` 对 `<img>` 和 `<iframe>` 有效
:::

## figure 与 figcaption

```html
<!-- 单张图片 -->
<figure>
  <img src="architecture.png" alt="微服务架构图" width="800" height="400">
  <figcaption>图 1：系统微服务架构总览</figcaption>
</figure>

<!-- 响应式图片 -->
<figure>
  <picture>
    <source srcset="/photo.avif" type="image/avif">
    <source srcset="/photo.webp" type="image/webp">
    <img src="/photo.jpg" alt="风景照片" width="800" height="600">
  </picture>
  <figcaption>拍摄于 2026 年 5 月，使用 f/2.8 光圈</figcaption>
</figure>

<!-- 多张图片组合 -->
<figure>
  <img src="before.png" alt="优化前" width="400" height="300">
  <img src="after.png" alt="优化后" width="400" height="300">
  <figcaption>优化前后对比：加载时间从 3.2s 降至 0.8s</figcaption>
</figure>
```

## 防止布局偏移的最佳实践

```html
<!-- 方案一：显式设置 width/height -->
<img src="photo.jpg" alt="照片" width="800" height="600">

<!-- 方案二：使用 aspect-ratio CSS -->
<style>
.img-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.img-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

<!-- 方案三：使用 CSS 占位 -->
<style>
.img-placeholder {
  background: #e5e7eb;
  aspect-ratio: 16 / 9;
}
</style>
<div class="img-placeholder">
  <img src="photo.jpg" alt="照片" width="800" height="450">
</div>
```

## HTML 实体与安全

```html
<!-- 常用 HTML 实体 -->
<p>&lt;div&gt; 标签用于分组</p>        <!-- <div> -->
<p>版权 &copy; 2026</p>                 <!-- © -->
<p>&amp; 用于连接</p>                    <!-- & -->
<p>引号 &quot;text&quot;</p>            <!-- "text" -->
<p>不换行空格 &nbsp;</p>                 <!-- non-breaking space -->
<p>箭头 &rarr; &larr; &uarr; &darr;</p> <!-- → ← ↑ ↓ -->

<!-- XSS 防御：永远不要将用户输入直接插入 HTML -->
<!-- 危险 -->
<div id="output"></div>
<script>
// 不要这样做！
output.innerHTML = userInput // 如果 userInput 包含 <script> 就是 XSS
</script>

<!-- 安全：使用 textContent -->
<script>
output.textContent = userInput
</script>
```

::: warning XSS 防御基础
HTML 实体编码是防御 XSS（跨站脚本攻击）的基础：
- 用户输入在 HTML 中显示时，必须转义 `<`、`>`、`&`、`"`、`'`
- 在属性中使用用户输入时，用引号包裹并转义引号字符
- 使用 `textContent` 而非 `innerHTML` 来设置纯文本
- 在模板引擎中确保开启自动转义
:::
