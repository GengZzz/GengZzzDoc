<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const steps = [
  {
    title: '准备阶段',
    desc: '全局作用域里只有 createCounter 函数声明，还没有 count。',
    stack: ['global'],
    active: 'global'
  },
  {
    title: '调用 createCounter',
    desc: '函数入栈，创建词法环境，局部变量 count 初始化为 0。',
    stack: ['global', 'createCounter()'],
    active: 'outer'
  },
  {
    title: '创建 increment',
    desc: 'increment 函数在 createCounter 内部创建，因此记录了 Outer Lexical Env 的引用。',
    stack: ['global', 'createCounter()'],
    active: 'function'
  },
  {
    title: '返回函数',
    desc: 'createCounter 出栈，但返回的 increment 仍然被 counter 变量引用。',
    stack: ['global'],
    active: 'closure'
  },
  {
    title: '再次调用',
    desc: 'counter() 入栈，通过闭包引用找到 count，把 0 更新为 1。',
    stack: ['global', 'counter()'],
    active: 'count'
  }
]

const current = computed(() => steps[step.value])
const countValue = computed(() => (step.value === 4 ? 1 : 0))

function next() {
  step.value = (step.value + 1) % steps.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="closure-demo">
    <div class="step-header">
      <strong>{{ current.title }}</strong>
      <span>{{ step + 1 }} / {{ steps.length }}</span>
    </div>

    <div class="demo-grid">
      <section class="panel">
        <h4>调用栈</h4>
        <div class="stack">
          <div v-for="frame in current.stack" :key="frame" class="frame">{{ frame }}</div>
        </div>
      </section>

      <section class="panel env-panel">
        <h4>词法环境</h4>
        <div class="env" :class="{ active: current.active === 'global' }">
          Global Lexical Env
          <span>counter -> increment</span>
        </div>
        <div class="connector" :class="{ active: step >= 2 }">
          <span>[[Environment]]</span>
        </div>
        <div class="env outer" :class="{ active: ['outer', 'closure', 'count'].includes(current.active) }">
          Outer Lexical Env
          <span :class="{ changed: current.active === 'count' }">count = {{ countValue }}</span>
        </div>
      </section>

      <section class="panel">
        <h4>函数对象</h4>
        <div class="fn" :class="{ active: ['function', 'closure', 'count'].includes(current.active) }">
          increment()
          <span>读取并更新 count</span>
        </div>
        <div class="note" :class="{ active: current.active === 'closure' }">函数返回后，环境没有被释放</div>
      </section>
    </div>

    <div class="status">{{ current.desc }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.closure-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
}

.step-header span {
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.panel {
  min-height: 210px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.stack {
  display: flex;
  min-height: 150px;
  flex-direction: column-reverse;
  gap: 8px;
  justify-content: flex-start;
}

.frame,
.env,
.fn,
.note {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.frame {
  padding: 10px;
  font-family: var(--vp-font-family-mono);
}

.env,
.fn {
  display: grid;
  min-height: 58px;
  place-items: center;
  padding: 10px;
  text-align: center;
  font-family: var(--vp-font-family-mono);
}

.env span,
.fn span {
  display: block;
  margin-top: 4px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
}

.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .14);
}

.outer .changed {
  color: #059669;
  font-weight: 700;
}

.connector {
  position: relative;
  margin: 12px auto;
  width: 2px;
  height: 34px;
  background: var(--vp-c-divider);
}

.connector span {
  position: absolute;
  left: 10px;
  top: 6px;
  white-space: nowrap;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.connector.active {
  background: #10b981;
}

.note {
  margin-top: 12px;
  padding: 10px;
  text-align: center;
}

.status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

@media (max-width: 720px) {
  .demo-grid { grid-template-columns: 1fr; }
}
</style>
