<script setup lang="ts">
import { computed, ref } from 'vue'

const mode = ref<'write' | 'election' | 'readpref'>('write')
const step = ref(0)
const maxSteps = 4
const primaryFailed = ref(false)
const newPrimary = ref<number | null>(null)
const readPref = ref('primary')

const nodes = computed(() => {
  if (mode.value === 'election' && primaryFailed.value) {
    return [
      { id: 0, role: 'Down', label: 'Primary (故障)' },
      { id: 1, role: newPrimary.value === 1 ? 'Primary' : 'Secondary', label: newPrimary.value === 1 ? '新 Primary' : 'Secondary' },
      { id: 2, role: newPrimary.value === 2 ? 'Primary' : 'Secondary', label: newPrimary.value === 2 ? '新 Primary' : 'Secondary' }
    ]
  }
  return [
    { id: 0, role: 'Primary', label: 'Primary' },
    { id: 1, role: 'Secondary', label: 'Secondary 1' },
    { id: 2, role: 'Secondary', label: 'Secondary 2' }
  ]
})

const stepDesc = computed(() => {
  if (mode.value === 'write') {
    const descs = [
      '副本集处于空闲状态，所有数据已同步',
      '客户端向 Primary 发起写入操作',
      'Primary 将操作写入 Oplog',
      'Secondary 异步拉取 Oplog 并重放操作',
      '写入完成，数据在所有节点保持一致'
    ]
    return descs[step.value] || descs[0]
  }
  if (mode.value === 'election') {
    if (!primaryFailed.value) return '点击"模拟故障"按钮触发 Primary 故障'
    if (newPrimary.value === null) return 'Secondary 检测到 Primary 无响应，开始选举...'
    return `选举完成，节点 ${newPrimary.value + 1} 成为新 Primary（获得多数票）`
  }
  const prefDescs: Record<string, string> = {
    primary: '只从 Primary 读取。强一致性，但 Primary 压力大',
    primaryPreferred: 'Primary 可用时从 Primary 读，否则从 Secondary 读',
    secondary: '只从 Secondary 读取。分流读压力，但可能读到旧数据',
    secondaryPreferred: 'Secondary 可用时从 Secondary 读，否则从 Primary 读',
    nearest: '从网络延迟最低的节点读取'
  }
  return prefDescs[readPref.value] || ''
})

function next() {
  if (step.value < maxSteps) step.value++
}
function reset() {
  step.value = 0
}
function switchMode(m: 'write' | 'election' | 'readpref') {
  mode.value = m
  step.value = 0
  primaryFailed.value = false
  newPrimary.value = null
}
function simulateFailure() {
  primaryFailed.value = true
  setTimeout(() => { newPrimary.value = 1 }, 800)
}
function recover() {
  primaryFailed.value = false
  newPrimary.value = null
}

function nodeClass(node: { role: string }) {
  if (node.role === 'Primary') return 'node primary'
  if (node.role === 'Down') return 'node down'
  if (node.role === 'Secondary') return 'node secondary'
  return 'node secondary'
}

function arrowClass(idx: number) {
  if (mode.value === 'write' && step.value >= 1 && idx === 0) return 'arrow active'
  if (mode.value === 'write' && step.value >= 2 && idx === 1) return 'arrow active'
  if (mode.value === 'write' && step.value >= 3 && idx === 2) return 'arrow active'
  return 'arrow'
}
</script>

<template>
  <div class="replica-demo">
    <div class="mode-tabs">
      <button type="button" :class="{ active: mode === 'write' }" @click="switchMode('write')">写入流程</button>
      <button type="button" :class="{ active: mode === 'election' }" @click="switchMode('election')">故障选举</button>
      <button type="button" :class="{ active: mode === 'readpref' }" @click="switchMode('readpref')">读偏好</button>
    </div>

    <div class="cluster">
      <div v-for="node in nodes" :key="node.id" :class="nodeClass(node)">
        <div class="node-icon">{{ node.role === 'Primary' || node.role === 'Down' ? '★' : '●' }}</div>
        <div class="node-label">{{ node.label }}</div>
        <div class="node-id">节点 {{ node.id + 1 }}</div>
      </div>
    </div>

    <div v-if="mode === 'write'" class="arrows">
      <div :class="arrowClass(0)">客户端 → Primary</div>
      <div :class="arrowClass(1)">Primary → Oplog</div>
      <div :class="arrowClass(2)">Secondary 拉取 Oplog</div>
    </div>

    <div class="status-bar">{{ stepDesc }}</div>

    <div class="actions">
      <template v-if="mode === 'write'">
        <button type="button" @click="next" :disabled="step >= maxSteps">下一步</button>
        <button type="button" @click="reset">重置</button>
      </template>
      <template v-else-if="mode === 'election'">
        <button type="button" @click="simulateFailure" :disabled="primaryFailed">模拟 Primary 故障</button>
        <button type="button" @click="recover" :disabled="!primaryFailed">恢复原 Primary</button>
      </template>
      <template v-else>
        <div class="read-pref-options">
          <label v-for="pref in ['primary', 'primaryPreferred', 'secondary', 'secondaryPreferred', 'nearest']" :key="pref">
            <input type="radio" :value="pref" v-model="readPref" />
            {{ pref }}
          </label>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.replica-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-tabs button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}

.mode-tabs button.active {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.cluster {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.node.primary {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.node.secondary {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.node.down {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  opacity: 0.7;
}

.node-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.node.primary .node-icon { color: #22c55e; }
.node.secondary .node-icon { color: #3b82f6; }
.node.down .node-icon { color: #ef4444; }

.node-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.node-id {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 2px;
}

.arrows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 12px;
}

.arrow {
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
  transition: all 0.3s;
}

.arrow.active {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border-color: #22c55e;
}

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.actions button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.read-pref-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.read-pref-options label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

@media (max-width: 560px) {
  .cluster {
    grid-template-columns: 1fr;
  }
  .read-pref-options {
    flex-direction: column;
  }
}
</style>
