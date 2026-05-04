<script setup lang="ts">
import { computed, ref } from 'vue'

type SelectorType = 'basic' | 'combinator' | 'pseudo-class' | 'pseudo-element' | 'priority'

const selected = ref<SelectorType>('basic')

const examples: Record<SelectorType, { title: string; items: { css: string; match: string; desc: string }[] }> = {
  basic: {
    title: '基础选择器',
    items: [
      { css: 'p', match: '所有 <p> 元素', desc: '标签选择器，优先级最低 (0,0,1)' },
      { css: '.card', match: 'class="card" 的元素', desc: '类选择器，优先级 (0,1,0)，最常用' },
      { css: '#header', match: 'id="header" 的元素', desc: 'ID 选择器，优先级 (1,0,0)，一个页面中应唯一' },
      { css: '[type="text"]', match: 'type="text" 的元素', desc: '属性选择器，优先级 (0,1,0)，常用于表单' },
      { css: '*', match: '所有元素', desc: '通配符选择器，优先级 (0,0,0)，常用于重置' }
    ]
  },
  combinator: {
    title: '组合器',
    items: [
      { css: 'div p', match: 'div 内的所有 p（任意层级）', desc: '后代选择器（空格），最常用' },
      { css: 'div > p', match: 'div 的直接子元素 p', desc: '子代选择器（>），只匹配直接子级' },
      { css: 'h2 + p', match: '紧跟在 h2 后面的第一个 p', desc: '相邻兄弟选择器（+），紧邻的下一个' },
      { css: 'h2 ~ p', match: 'h2 后面的所有 p 同级', desc: '通用兄弟选择器（~），后面的同级兄弟' }
    ]
  },
  'pseudo-class': {
    title: '伪类',
    items: [
      { css: 'a:hover', match: '鼠标悬停时的链接', desc: ':hover 鼠标悬停，最常用的交互状态' },
      { css: 'input:focus', match: '获得焦点的输入框', desc: ':focus 获得焦点，用于表单样式' },
      { css: 'li:first-child', match: '第一个 li 元素', desc: ':first-child 父元素下的第一个子元素' },
      { css: 'li:nth-child(2n)', match: '第 2、4、6... 个 li', desc: ':nth-child() 支持公式，实现斑马纹' },
      { css: 'a:not(.btn)', match: 'class 不是 btn 的链接', desc: ':not() 否定伪类，排除特定元素' }
    ]
  },
  'pseudo-element': {
    title: '伪元素',
    items: [
      { css: 'p::first-line', match: '段落的第一行', desc: '::first-line 选中第一行文本' },
      { css: 'p::first-letter', match: '段落的首字母', desc: '::first-letter 选中首字母，杂志风格' },
      { css: '.tip::before', match: '在 .tip 内容前插入', desc: '::before 在元素内部最前面插入内容' },
      { css: '.tip::after', match: '在 .tip 内容后插入', desc: '::after 在元素内部最后面插入内容' },
      { css: '::selection', match: '用户选中的文本', desc: '::selection 自定义文本选中高亮色' }
    ]
  },
  priority: {
    title: '优先级计算',
    items: [
      { css: 'style=""', match: '1,0,0,0', desc: '内联样式，最高优先级' },
      { css: '#id', match: '1,0,0', desc: 'ID 选择器 ×1' },
      { css: '.class / [attr] / :pseudo', match: '0,1,0', desc: '类/属性/伪类 各×1' },
      { css: 'div / ::pseudo-elem', match: '0,0,1', desc: '标签/伪元素 各×1' },
      { css: '* / 组合器', match: '0,0,0', desc: '通配符和组合器不计入优先级' }
    ]
  }
}

const description = computed(() => {
  const ex = examples[selected.value]
  return `${ex.title}：${ex.items.map(i => i.desc).join('；')}。`
})
</script>

<template>
  <div class="selector-demo">
    <div class="tabs">
      <button
        v-for="(ex, key) in examples"
        :key="key"
        :class="{ active: selected === key }"
        @click="selected = key as SelectorType"
      >{{ ex.title }}</button>
    </div>

    <div class="table">
      <div class="row header">
        <span class="col-css">选择器</span>
        <span class="col-match">匹配</span>
      </div>
      <div
        v-for="(item, i) in examples[selected].items"
        :key="i"
        class="row"
      >
        <span class="col-css"><code>{{ item.css }}</code></span>
        <span class="col-match">{{ item.desc }}</span>
      </div>
    </div>

    <div class="status-bar">{{ description }}</div>
  </div>
</template>

<style scoped>
.selector-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.tabs button {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 13px;
}

.tabs button.active {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.table {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.row {
  display: grid;
  grid-template-columns: 200px 1fr;
  border-bottom: 1px solid var(--vp-c-border);
}

.row:last-child { border-bottom: none; }

.row.header {
  background: var(--vp-c-bg);
  font-weight: 600;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.row:not(.header):hover {
  background: rgba(59, 130, 246, 0.04);
}

.col-css, .col-match {
  padding: 8px 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
}

.col-css code {
  font-family: var(--vp-font-family-mono);
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.col-match {
  color: var(--vp-c-text-1);
  line-height: 1.5;
}

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

@media (max-width: 560px) {
  .row { grid-template-columns: 1fr; }
  .col-css { padding-bottom: 0; }
}
</style>
