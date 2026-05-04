<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const stages = computed(() => {
  const s = step.value
  return [
    { label: 'new Promise', active: s >= 1, desc: '创建 Promise 对象' },
    { label: 'executor 同步执行', active: s >= 1, desc: 'executor 函数立即执行' },
    { label: 'resolve(value)', active: s >= 2, desc: '调用 resolve，状态变为 fulfilled' },
    { label: 'then(onFulfilled)', active: s >= 3, desc: '注册 onFulfilled 回调' },
    { label: '回调入微任务队列', active: s >= 4, desc: 'onFulfilled 进入微任务队列等待执行' },
    { label: '执行回调返回值', active: s >= 5, desc: '微任务阶段执行，返回值传递给下一个 then' }
  ]
})

const chainDisplay = computed(() => {
  const s = step.value
  return {
    pending: s === 0,
    executor: s >= 1,
    resolved: s >= 2,
    thenRegistered: s >= 3,
    callbackQueued: s >= 4,
    callbackExecuted: s >= 5
  }
})

const description = computed(() => {
  const descs = [
    'Promise 从 new Promise() 开始，点击"下一步"观察链式调用过程',
    'executor 同步执行，Promise 处于 pending 状态',
    'resolve 被调用，Promise 状态变为 fulfilled，保存 value',
    'then 注册 onFulfilled 回调',
    '回调进入微任务队列，等待同步代码和微任务清空',
    '微任务阶段执行回调，返回值作为下一个 then 的输入'
  ]
  return descs[step.value]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="promise-demo">
    <div class="pipeline">
      <div
        v-for="(stage, i) in stages"
        :key="i"
        class="stage"
        :class="{ active: stage.active }"
      >
        <div class="stage-num">{{ i + 1 }}</div>
        <div class="stage-content">
          <div class="stage-label">{{ stage.label }}</div>
          <div class="stage-desc">{{ stage.desc }}</div>
        </div>
        <div v-if="i < stages.length - 1" class="arrow" :class="{ active: stage.active }">→</div>
      </div>
    </div>

    <div class="state-panel">
      <h4>Promise 状态变化</h4>
      <div class="states">
        <span class="state" :class="{ current: step === 0 }">pending</span>
        <span class="state-arrow">→</span>
        <span class="state fulfilled" :class="{ current: step >= 2 }">fulfilled</span>
        <span class="state rejected" :class="{ dimmed: true }">rejected</span>
      </div>
    </div>

    <div class="code-ref">
      <pre><code>const p = new Promise((resolve, reject) => {
  resolve('data');    // ← 同步调用
});

p.then(value => {     // ← 回调注册
  console.log(value); // ← 微任务执行
});</code></pre>
    </div>

    <div class="status-bar">{{ description }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.promise-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pipeline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.stage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  opacity: 0.4;
  transition: all 0.2s;
  font-size: 12px;
}

.stage.active {
  opacity: 1;
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.stage-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  color: var(--vp-c-bg);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.stage.active .stage-num {
  background: #10b981;
}

.stage-label {
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

.stage-desc {
  color: var(--vp-c-text-2);
  font-size: 11px;
  margin-top: 2px;
}

.arrow {
  color: var(--vp-c-text-3);
  font-size: 16px;
  flex-shrink: 0;
}

.arrow.active {
  color: #10b981;
}

.state-panel {
  margin-top: 14px;
}

.state-panel h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.states {
  display: flex;
  align-items: center;
  gap: 8px;
}

.state {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  opacity: 0.4;
  transition: all 0.2s;
}

.state.current {
  opacity: 1;
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
}

.state.fulfilled { color: #10b981; }
.state.rejected { color: #ef4444; }
.state.dimmed { opacity: 0.25; }

.state-arrow {
  color: var(--vp-c-text-3);
}

.code-ref {
  margin-top: 12px;
}

.code-ref pre {
  margin: 0;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-x: auto;
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
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

@media (max-width: 560px) {
  .pipeline { flex-direction: column; }
  .arrow { transform: rotate(90deg); }
}
</style>
