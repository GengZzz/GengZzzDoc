<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const descriptions = [
  'outer() 还没有执行，只有全局上下文。',
  '调用 outer()，创建 outer 词法环境，count 被初始化为 0。',
  '创建 increment 函数，它记录了外层词法环境的引用。',
  'outer() 返回后，调用栈清空，但 increment 仍然引用 count。',
  '调用 increment()，沿闭包引用找到 count，并把它更新为 1。'
]

const stack = computed(() => {
  if (step.value === 1 || step.value === 2) return ['outer()']
  if (step.value === 4) return ['increment()']
  return []
})

const hasOuterEnv = computed(() => step.value >= 1)
const hasClosureLink = computed(() => step.value >= 2)
const countValue = computed(() => (step.value >= 4 ? 1 : 0))

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="closure-demo">
    <div class="demo-grid">
      <section class="panel">
        <h4>调用栈</h4>
        <div v-if="stack.length === 0" class="empty">空</div>
        <div v-for="frame in stack" :key="frame" class="frame">{{ frame }}</div>
      </section>

      <section class="panel env-panel">
        <h4>词法环境</h4>
        <div class="env global">Global Env<br><span>counter -> increment</span></div>
        <div class="link" :class="{ active: hasClosureLink }"></div>
        <div class="env outer" :class="{ active: hasOuterEnv }">
          Outer Env<br><span>count = {{ countValue }}</span>
        </div>
      </section>

      <section class="panel function-panel">
        <h4>返回的函数</h4>
        <div class="fn" :class="{ active: hasClosureLink }">increment()</div>
        <p>函数对象保存对 Outer Env 的引用。</p>
      </section>
    </div>

    <div class="status">{{ descriptions[step] }}</div>
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

.demo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.panel {
  min-height: 180px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.empty,
.frame,
.fn,
.env {
  display: grid;
  place-items: center;
  min-height: 42px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-2);
  text-align: center;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.frame {
  border-style: solid;
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.env {
  border-style: solid;
  transition: transform .3s ease, border-color .3s ease, box-shadow .3s ease;
}

.env span {
  margin-top: 4px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-base);
}

.outer {
  opacity: .35;
}

.outer.active {
  opacity: 1;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, .15);
}

.link {
  height: 26px;
  margin: 8px auto;
  width: 3px;
  border-radius: 999px;
  background: var(--vp-c-divider);
}

.link.active {
  background: #10b981;
  animation: pulse-line 1.2s ease-in-out infinite;
}

.fn.active {
  border-style: solid;
  border-color: #f59e0b;
  color: #f59e0b;
}

.function-panel p {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
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

@keyframes pulse-line {
  0%, 100% { opacity: .4; transform: scaleY(.8); }
  50% { opacity: 1; transform: scaleY(1.2); }
}

@media (max-width: 720px) {
  .demo-grid { grid-template-columns: 1fr; }
}
</style>
