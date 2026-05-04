# HTML

HTML（HyperText Markup Language）是构建 Web 页面的基石。它不是编程语言，而是一种描述文档结构的标记语言。浏览器通过解析 HTML 构建 DOM 树，再结合 CSSOM 渲染出用户看到的页面。

本系列文档不只介绍标签用法，而是从浏览器解析机制、语义化的可访问性意义、表单验证的底层 API、Web Components 的隔离原理、到性能优化与 SEO 实践，深入 HTML 技术的每个层面。

## 学习路径

| 阶段 | 主题 | 说明 |
|------|------|------|
| 入门 | [文档结构](./document-structure) | DOCTYPE 演变、head 标签深度、字符编码 |
| 入门 | [语义化元素](./semantic-elements) | HTML5 语义标签、ARIA 可访问性 |
| 文本 | [文本元素](./text-elements) | 文本级标签、列表、引用 |
| 文本 | [链接与导航](./links-navigation) | href 协议、rel 属性、导航语义 |
| 表单 | [表单与输入](./forms-inputs) | input 类型、label 关联、select/textarea |
| 表单 | [表单验证](./form-validation) | 原生验证、Constraint Validation API |
| 多媒体 | [图片与响应式](./images-figures) | srcset/sizes/picture、图片格式选择 |
| 多媒体 | [音视频与 Canvas](./audio-video-canvas) | audio/video/track、Canvas 2D、SVG |
| 数据 | [表格](./tables-data) | table 结构、合并单元格、可访问性 |
| 可访问性 | [无障碍访问](./accessibility) | WCAG 四原则、ARIA、键盘导航 |
| Web Components | [自定义元素](./custom-elements) | Custom Elements API、生命周期 |
| Web Components | [Shadow DOM](./shadow-dom-templates) | 样式隔离、slot 插槽、template |
| 性能 | [性能与加载](./performance-loading) | 关键渲染路径、资源加载优先级 |
| SEO | [SEO 与元标签](./seo-meta) | Open Graph、结构化数据、canonical |

## 浏览器解析 HTML 的流程

理解 HTML 的前提是理解浏览器如何处理它：

```
字节流 → 解码为字符串 → 词法分析(Tokenize) → 构建 DOM 树
                                                ↓
CSS 文件 → 构建 CSSOM 树 ──────────────────→ 合并为 Render Tree
                                                          ↓
                                                  Layout(布局) → Paint(绘制) → Composite(合成)
```

这个流程决定了很多 HTML 最佳实践的原因：为什么 `<script>` 会阻塞渲染？为什么要把 CSS 放在 `<head>`？为什么要用语义化标签？

::: tip 交互演示
本章包含两个 Vue 交互动画组件：`HtmlRenderPipelineDemo` 展示浏览器渲染管线的 8 个步骤，`HtmlShadowDomDemo` 展示 Shadow DOM 的隔离机制。你可以在对应章节中看到它们。
:::

## 核心概念速览

**DOCTYPE**：告诉浏览器使用哪个 HTML 标准进行解析。HTML5 简化为 `<!DOCTYPE html>`，不再需要冗长的 DTD 声明。

**语义化**：不是为了好看，而是为了让屏幕阅读器、搜索引擎、开发者工具都能理解页面结构。

**表单验证**：浏览器原生提供了完整的验证能力，不需要引入 JavaScript 库就能处理大多数验证场景。

**Web Components**：浏览器原生的组件化方案，通过 Custom Elements + Shadow DOM 实现封装和复用。

**性能**：HTML 的编写方式直接影响关键渲染路径（Critical Rendering Path），决定了页面首次加载的速度。
