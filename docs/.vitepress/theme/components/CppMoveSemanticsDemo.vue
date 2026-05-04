<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 4

function next() {
  step.value = Math.min(step.value + 1, totalSteps)
}

function reset() {
  step.value = 0
}

const elements = 5

interface VecState {
  name: string
  label: string
  items: (string | null)[]
  active: boolean
}

const vectors = computed<VecState[]>(() => {
  const data = Array.from({ length: elements }, (_, i) => `data${i}`)
  if (step.value === 0) return []
  if (step.value === 1) {
    return [
      { name: 'v1', label: '原始', items: data, active: true },
      { name: 'v2', label: '拷贝构造', items: [...data], active: true }
    ]
  }
  if (step.value === 2) {
    return [
      { name: 'v1', label: '移动后', items: data.map(() => null), active: false },
      { name: 'v2', label: '拷贝构造', items: [...data], active: true },
      { name: 'v3', label: '移动构造', items: [...data], active: true }
    ]
  }
  if (step.value === 3) {
    return [
      { name: 'v1', label: '移动后', items: data.map(() => null), active: false },
      { name: 'v2', label: '拷贝构造', items: [...data], active: true },
      { name: 'v3', label: '移动构造', items: [...data], active: true }
    ]
  }
  return []
})

const code = computed(() => {
  const lines = [
    '',
    'vector<string> v2 = v1;  // 拷贝构造：深拷贝所有元素',
    'vector<string> v3 = move(v1);  // 移动构造：指针转移，v1 变空',
    'forward<T>(arg)  // 引用折叠：T& → 左值，T&& → 右值'
  ]
  return step.value > 0 ? lines[step.value] : ''
})

const status = computed(() => {
  const msgs = [
    '点击"下一步"观察拷贝 vs 移动的区别',
    '拷贝构造：为 v2 分配新内存，复制 v1 的全部元素（O(n)）',
    '移动构造：v3 窃取 v1 的内部指针，v1 变为空（O(1)）',
    '引用折叠规则：T& && → T&，T&& && → T&&，完美转发保持值类别'
  ]
  return msgs[step.value]
})

const performanceData = computed(() => {
  if (step.value < 4) return null
  return [
    { size: '1,000', copyTime: '0.12ms', moveTime: '<0.001ms' },
    { size: '100,000', copyTime: '8.5ms', moveTime: '<0.001ms' },
    { size: '1,000,000', copyTime: '95ms', moveTime: '<0.001ms' }
  ]
})

const foldRules = computed(() => {
  if (step.value < 4) return null
  return [
    { input: 'T = int&, T&& →', result: 'int& (左值引用)', rule: '& && → &' },
    { input: 'T = int&&, T&& →', result: 'int&& (右值引用)', rule: '&& && → &&' },
    { input: 'T = int, T&& →', result: 'int&& (右值引用)', rule: '无折叠' }
  ]
})
</script>

<template>
  <div class="move-demo">
    <div class="code-line" v-if="code">
      <code>{{ code }}</code>
    </div>

    <div class="vectors">
      <div v-if="vectors.length === 0" class="empty">尚未创建任何对象</div>
      <div
        v-for="vec in vectors"
        :key="vec.name"
        class="vec-card"
        :class="{ inactive: !vec.active }"
      >
        <div class="vec-header">
          <strong>{{ vec.name }}</strong>
          <span class="vec-label">{{ vec.label }}</span>
        </div>
        <div class="vec-items">
          <div
            v-for="(item, idx) in vec.items"
            :key="idx"
            class="vec-item"
            :class="{ null: item === null }"
          >
            {{ item ?? 'null' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="foldRules" class="fold-section">
      <h4>引用折叠规则</h4>
      <table class="fold-table">
        <thead>
          <tr><th>输入</th><th>结果</th><th>规则</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in foldRules" :key="r.input">
            <td><code>{{ r.input }}</code></td>
            <td>{{ r.result }}</td>
            <td><code>{{ r.rule }}</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="performanceData" class="perf-section">
      <h4>性能对比</h4>
      <table class="perf-table">
        <thead>
          <tr><th>元素数量</th><th>拷贝耗时</th><th>移动耗时</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in performanceData" :key="row.size">
            <td>{{ row.size }}</td>
            <td class="slow">{{ row.copyTime }}</td>
            <td class="fast">{{ row.moveTime }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="status-bar">{{ status }}</div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span class="step-indicator">{{ step }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.move-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.code-line {
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.code-line code {
  color: var(--vp-c-text-1);
}

.vectors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.vec-card {
  padding: 12px;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  background: var(--vp-c-bg);
  min-width: 180px;
}

.vec-card.inactive {
  border-color: var(--vp-c-border);
  opacity: 0.5;
}

.vec-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.vec-label {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.vec-items {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.vec-item {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.vec-item.null {
  opacity: 0.3;
  text-decoration: line-through;
}

.empty {
  min-height: 60px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  width: 100%;
}

.fold-section,
.perf-section {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  margin-bottom: 12px;
}

.fold-section h4,
.perf-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.fold-table,
.perf-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.fold-table th,
.fold-table td,
.perf-table th,
.perf-table td {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  text-align: center;
}

.slow { color: #ef4444; }
.fast { color: #10b981; }

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.step-indicator {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-left: auto;
}
</style>
