<script setup lang="ts">
import { computed, ref } from 'vue'

const mode = ref<'esm' | 'cjs'>('esm')
const step = ref(0)

const esmSteps = [
  ['解析 import/export', '先不执行代码，只收集依赖关系。'],
  ['实例化模块记录', '为导入导出建立 live binding。'],
  ['按依赖顺序执行', '执行模块顶层代码并填充值。'],
  ['导入方读取绑定', '读取的是同一个绑定的最新值。']
]

const cjsSteps = [
  ['遇到 require()', '运行到这一行才开始加载目标模块。'],
  ['执行目标文件', '模块顶层代码立即执行。'],
  ['填充 module.exports', '导出的是 exports 对象。'],
  ['缓存并返回', '下次 require 直接返回缓存对象。']
]

const currentSteps = computed(() => (mode.value === 'esm' ? esmSteps : cjsSteps))
const current = computed(() => currentSteps.value[step.value])

function setMode(nextMode: 'esm' | 'cjs') {
  mode.value = nextMode
  step.value = 0
}

function next() {
  step.value = (step.value + 1) % currentSteps.value.length
}
</script>

<template>
  <div class="module-demo">
    <div class="switcher">
      <button :class="{ active: mode === 'esm' }" type="button" @click="setMode('esm')">ESM</button>
      <button :class="{ active: mode === 'cjs' }" type="button" @click="setMode('cjs')">CommonJS</button>
    </div>

    <div class="pipeline" :class="mode">
      <div
        v-for="(item, index) in currentSteps"
        :key="item[0]"
        class="stage"
        :class="{ active: index === step, done: index < step }"
      >
        <span>{{ index + 1 }}</span>
        <strong>{{ item[0] }}</strong>
      </div>
    </div>

    <div class="explain">
      <strong>{{ current[0] }}</strong>
      <p>{{ current[1] }}</p>
    </div>

    <button type="button" @click="next">下一步</button>
  </div>
</template>

<style scoped>
.module-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stage {
  min-height: 82px;
  display: grid;
  place-items: center;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  text-align: center;
}

.stage span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  font-size: 12px;
}

.stage strong {
  font-size: 13px;
}

.stage.done {
  border-color: #10b981;
  color: #059669;
}

.stage.active {
  border-color: #f59e0b;
  color: #d97706;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, .14);
}

.explain {
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.explain p {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

@media (max-width: 720px) {
  .pipeline { grid-template-columns: 1fr; }
}
</style>
