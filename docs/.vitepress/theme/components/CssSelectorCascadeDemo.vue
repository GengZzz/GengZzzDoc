<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 6

const scenarios = [
  {
    title: '基础选择器',
    rules: [
      { selector: 'p', specificity: '0,0,1', color: '#e3f2fd' },
      { selector: '.text', specificity: '0,1,0', color: '#fff3e0' },
      { selector: '#main', specificity: '1,0,0', color: '#e8f5e9' }
    ],
    winner: '#main (1,0,0)',
    explanation: 'ID 选择器权重最高，覆盖类选择器和标签选择器。'
  },
  {
    title: '组合选择器 vs 单一选择器',
    rules: [
      { selector: '.nav a', specificity: '0,1,1', color: '#e3f2fd' },
      { selector: 'a.link', specificity: '0,1,1', color: '#fff3e0' },
      { selector: '.link', specificity: '0,1,0', color: '#e8f5e9' }
    ],
    winner: '.nav a 和 a.link 并列 (0,1,1)',
    explanation: '两个选择器权重相同，后声明的规则生效（源码顺序决定）。'
  },
  {
    title: '伪类与伪元素',
    rules: [
      { selector: 'a:hover', specificity: '0,1,1', color: '#e3f2fd' },
      { selector: 'a::before', specificity: '0,0,2', color: '#fff3e0' },
      { selector: 'a', specificity: '0,0,1', color: '#e8f5e9' }
    ],
    winner: 'a:hover (0,1,1)',
    explanation: '伪类 (:hover) 算一个类权重，伪元素 (::before) 算一个标签权重。'
  },
  {
    title: '内联样式',
    rules: [
      { selector: '#header .title', specificity: '1,1,0', color: '#e3f2fd' },
      { selector: 'style="color:red"', specificity: '1,0,0,0', color: '#fce4ec' },
      { selector: '.title', specificity: '0,1,0', color: '#e8f5e9' }
    ],
    winner: '内联样式 (1,0,0,0)',
    explanation: '内联样式的权重高于任何选择器，但它低于 !important。'
  },
  {
    title: '!important 规则',
    rules: [
      { selector: '#btn { color: blue !important }', specificity: '∞', color: '#fce4ec' },
      { selector: '.btn { color: green }', specificity: '0,1,0', color: '#e8f5e9' },
      { selector: 'button { color: red }', specificity: '0,0,1', color: '#e3f2fd' }
    ],
    winner: '!important 规则',
    explanation: '!important 可以无视权重强制生效，但应尽量避免使用。'
  }
]

const current = computed(() => scenarios[step.value])

function next() {
  step.value = (step.value + 1) % totalSteps
}
function prev() {
  step.value = (step.value - 1 + totalSteps) % totalSteps
}
</script>

<template>
  <div class="cascade-demo">
    <h4>选择器优先级计算演示</h4>
    <div class="step-info">
      场景 {{ step + 1 }} / {{ totalSteps }}：<strong>{{ current.title }}</strong>
    </div>
    <div class="rules">
      <div
        v-for="(rule, i) in current.rules"
        :key="i"
        class="rule-card"
        :style="{ borderLeftColor: rule.color === '#fce4ec' ? '#e53935' : rule.color === '#fff3e0' ? '#fb8c00' : rule.color === '#e8f5e9' ? '#43a047' : '#1e88e5', background: rule.color }"
      >
        <code class="selector">{{ rule.selector }}</code>
        <span class="specificity">权重: {{ rule.specificity }}</span>
      </div>
    </div>
    <div class="result">
      <span class="winner-label">生效规则：</span>
      <code>{{ current.winner }}</code>
    </div>
    <p class="explanation">{{ current.explanation }}</p>
    <div class="controls">
      <button @click="prev" :disabled="step === 0">上一步</button>
      <button @click="next" :disabled="step === totalSteps - 1">下一步</button>
    </div>
  </div>
</template>

<style scoped>
.cascade-demo {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
  background: #fafafa;
}
.step-info {
  margin-bottom: 12px;
  color: #555;
}
.rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.rule-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 6px;
  border-left: 4px solid #ccc;
}
.selector {
  font-size: 14px;
  font-weight: 600;
}
.specificity {
  font-size: 13px;
  color: #666;
  font-family: monospace;
}
.result {
  background: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid #e0e0e0;
}
.winner-label {
  font-weight: 600;
  margin-right: 6px;
}
.explanation {
  color: #666;
  font-size: 14px;
  margin: 8px 0 16px;
}
.controls {
  display: flex;
  gap: 10px;
}
.controls button {
  padding: 6px 18px;
  border: 1px solid #1a73e8;
  border-radius: 4px;
  background: #fff;
  color: #1a73e8;
  cursor: pointer;
  font-size: 14px;
}
.controls button:hover:not(:disabled) {
  background: #1a73e8;
  color: #fff;
}
.controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
