<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

function next() {
  step.value = Math.min(step.value + 1, totalSteps)
}

function reset() {
  step.value = 0
}

interface Ptr {
  name: string
  type: 'unique' | 'shared' | 'weak'
  value: string | null
  count?: number
}

const pointers = computed<Ptr[]>(() => {
  if (step.value === 0) return []
  if (step.value === 1) return [
    { name: 'p1', type: 'unique', value: '42' }
  ]
  if (step.value === 2) return [
    { name: 'p1', type: 'unique', value: null },
    { name: 'p2', type: 'unique', value: '42' }
  ]
  if (step.value === 3) return [
    { name: 's1', type: 'shared', value: '100', count: 1 }
  ]
  if (step.value === 4) return [
    { name: 's1', type: 'shared', value: '100', count: 2 },
    { name: 's2', type: 'shared', value: '100', count: 2 }
  ]
  if (step.value === 5) return [
    { name: 's2', type: 'shared', value: '100', count: 1 }
  ]
  if (step.value === 6) return [
    { name: 's2', type: 'shared', value: null, count: 0 }
  ]
  return []
})

const code = computed(() => {
  const lines = [
    'unique_ptr<int> p1 = make_unique<int>(42);',
    'unique_ptr p2 = move(p1);  // p1 变空，p2 获得所有权',
    'shared_ptr<int> s1 = make_shared<int>(100);',
    'shared_ptr s2 = s1;  // 引用计数=2',
    '// s1 销毁，引用计数=1，对象仍在',
    '// s2 销毁，引用计数=0，对象释放',
    '// weak_ptr 不增加引用计数，打破循环引用'
  ]
  return step.value > 0 ? lines[step.value - 1] : ''
})

const status = computed(() => {
  const msgs = [
    '点击"下一步"观察智能指针的生命周期',
    '创建 unique_ptr<int> p1，独占值 42',
    'move(p1) 转移所有权给 p2，p1 变为 nullptr',
    '创建 shared_ptr<int> s1，引用计数=1',
    's2 = s1，两个指针共享同一对象，引用计数=2',
    's1 销毁，引用计数减为 1，对象仍然存活',
    's2 销毁，引用计数减为 0，对象被释放'
  ]
  return msgs[step.value]
})

const cyclicRefs = computed(() => {
  if (step.value < 7) return null
  return {
    aToB: 'shared_ptr<B>',
    bToA: 'weak_ptr<A>'
  }
})
</script>

<template>
  <div class="smart-demo">
    <div class="code-line" v-if="code">
      <code>{{ code }}</code>
    </div>

    <div class="pointers">
      <div v-if="pointers.length === 0" class="empty">尚未创建任何智能指针</div>
      <div
        v-for="ptr in pointers"
        :key="ptr.name"
        class="ptr-card"
        :class="[ptr.type, { empty: ptr.value === null }]"
      >
        <div class="ptr-name">{{ ptr.name }}</div>
        <div class="ptr-type">
          {{ ptr.type === 'unique' ? 'unique_ptr' : ptr.type === 'shared' ? 'shared_ptr' : 'weak_ptr' }}
        </div>
        <div class="ptr-value">
          {{ ptr.value !== null ? `*${ptr.name} = ${ptr.value}` : 'nullptr' }}
        </div>
        <div v-if="ptr.count !== undefined" class="ptr-count">
          引用计数: {{ ptr.count }}
        </div>
      </div>
    </div>

    <div v-if="cyclicRefs" class="cyclic-section">
      <h4>循环引用解决方案</h4>
      <div class="cyclic-diagram">
        <div class="cyclic-node">
          <strong>A</strong>
          <span class="cyclic-label">shared_ptr&lt;B&gt;</span>
        </div>
        <div class="cyclic-arrow">→</div>
        <div class="cyclic-node">
          <strong>B</strong>
          <span class="cyclic-label weak">weak_ptr&lt;A&gt;</span>
        </div>
        <div class="cyclic-arrow">→</div>
        <div class="cyclic-node">
          <strong>A</strong>
        </div>
      </div>
      <p class="cyclic-note">B 使用 weak_ptr 引用 A，不增加 A 的引用计数，打破循环</p>
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
.smart-demo {
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

.pointers {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.ptr-card {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  min-width: 140px;
  text-align: center;
}

.ptr-card.unique {
  border-color: #10b981;
}

.ptr-card.shared {
  border-color: #3b82f6;
}

.ptr-card.weak {
  border-color: #f59e0b;
}

.ptr-card.empty {
  opacity: 0.5;
  text-decoration: line-through;
}

.ptr-name {
  font-weight: bold;
  font-size: 16px;
}

.ptr-type {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin: 2px 0;
}

.ptr-value {
  font-size: 13px;
  margin-top: 4px;
}

.ptr-count {
  font-size: 12px;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
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

.cyclic-section {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  margin-bottom: 12px;
}

.cyclic-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.cyclic-diagram {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.cyclic-node {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  text-align: center;
}

.cyclic-label {
  display: block;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.cyclic-label.weak {
  color: #f59e0b;
}

.cyclic-arrow {
  color: var(--vp-c-text-2);
  font-size: 18px;
}

.cyclic-note {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-align: center;
}

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
