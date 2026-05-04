<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const stepLabels = [
  '请求到达协调节点',
  '路由到 Primary Shard',
  '写入 Buffer + Translog',
  'Refresh 生成 Segment',
  'Flush 持久化',
  '同步到 Replica Shard'
]

const shards = computed(() => {
  if (step.value < 6) return { primary: true, replicas: false }
  return { primary: true, replicas: true }
})

const bufferState = computed(() => {
  if (step.value < 3) return 'empty'
  if (step.value === 3) return 'writing'
  if (step.value >= 4) return 'refreshed'
  return 'empty'
})

const translogState = computed(() => {
  if (step.value < 3) return 'empty'
  if (step.value < 5) return 'active'
  return 'flushed'
})

const segmentState = computed(() => {
  if (step.value < 4) return 'none'
  if (step.value === 4) return 'new'
  return 'merged'
})

function next() {
  if (step.value < totalSteps) step.value++
}

function prev() {
  if (step.value > 0) step.value--
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="write-demo">
    <div class="step-indicator">
      <div
        v-for="(label, i) in stepLabels"
        :key="i"
        class="step-dot"
        :class="{ active: step === i, done: step > i }"
      >{{ i + 1 }}</div>
    </div>
    <div class="step-label">{{ stepLabels[step] || '开始' }}</div>

    <div class="flow-diagram">
      <!-- Client -->
      <div class="node client" :class="{ highlight: step === 0 }">
        <span class="node-icon">C</span>
        <span class="node-name">Client</span>
      </div>

      <!-- Arrow -->
      <div class="arrow" :class="{ active: step >= 0 }">→</div>

      <!-- Coordinating Node -->
      <div class="node coord" :class="{ highlight: step === 0 }">
        <span class="node-icon">CN</span>
        <span class="node-name">协调节点</span>
      </div>

      <!-- Arrow -->
      <div class="arrow" :class="{ active: step >= 1 }">→</div>

      <!-- Primary Shard -->
      <div class="node primary" :class="{ highlight: step >= 1 }">
        <span class="node-icon">P</span>
        <span class="node-name">Primary Shard</span>
      </div>
    </div>

    <!-- Internal State -->
    <div class="state-panels">
      <!-- Buffer -->
      <div class="state-card">
        <h4>Memory Buffer</h4>
        <div
          class="state-content"
          :class="{ active: bufferState !== 'empty', writing: bufferState === 'writing' }"
        >
          <template v-if="bufferState === 'empty' && step < 2">等待写入...</template>
          <template v-else-if="bufferState === 'writing'">
            <div class="data-item">Doc1: { title: "ES入门", price: 99 }</div>
          </template>
          <template v-else-if="bufferState === 'refreshed'">
            <div class="data-item done">已清空 → Segment</div>
          </template>
          <template v-else>等待写入...</template>
        </div>
      </div>

      <!-- Translog -->
      <div class="state-card">
        <h4>Translog</h4>
        <div
          class="state-content"
          :class="{ active: translogState !== 'empty', flushed: translogState === 'flushed' }"
        >
          <template v-if="translogState === 'empty' && step < 2">等待写入...</template>
          <template v-else-if="translogState === 'active'">
            <div class="data-item">操作: index, Doc1</div>
            <div class="data-item status-ok">状态: fsync 到磁盘 ✓</div>
          </template>
          <template v-else-if="translogState === 'flushed'">
            <div class="data-item done">Flush 后已清空</div>
          </template>
          <template v-else>等待写入...</template>
        </div>
      </div>

      <!-- Segments -->
      <div class="state-card">
        <h4>Segments</h4>
        <div
          class="state-content"
          :class="{ active: segmentState !== 'none' }"
        >
          <template v-if="segmentState === 'none'">尚无 Segment</template>
          <template v-else-if="segmentState === 'new'">
            <div class="seg seg-new">Segment_0 (新)</div>
            <div class="data-item status-ok">数据可搜索 ✓</div>
          </template>
          <template v-else>
            <div class="seg seg-0">Segment_0</div>
            <div class="seg seg-1">Segment_1</div>
            <div class="data-item">定期 Merge 合并</div>
          </template>
        </div>
      </div>
    </div>

    <!-- Replica Sync (Step 6) -->
    <div v-if="step >= 5" class="replica-panel">
      <h4>Replica 同步</h4>
      <div class="replica-shards">
        <div class="shard replica" :class="{ synced: shards.replicas }">R1</div>
        <div class="shard replica" :class="{ synced: shards.replicas }">R2</div>
      </div>
      <div class="hint" v-if="shards.replicas">Primary Shard 将请求转发给所有 Replica，全部确认后返回客户端</div>
    </div>

    <!-- Status -->
    <div class="status-bar">
      <span v-if="step === 0">客户端发送写入请求（POST /index/_doc）</span>
      <span v-else-if="step === 1">协调节点根据 hash(_id) % num_shards 路由到 Primary Shard</span>
      <span v-else-if="step === 2">文档写入内存 Buffer，同时写入 Translog（WAL）</span>
      <span v-else-if="step === 3">每秒 Refresh：Buffer → Segment，数据变为可搜索</span>
      <span v-else-if="step === 4">Flush：Segment fsync 到磁盘，清空 Translog</span>
      <span v-else>Primary Shard 同步给所有 Replica Shard，确认后返回成功</span>
    </div>

    <div class="actions">
      <button type="button" @click="prev" :disabled="step <= 0">上一步</button>
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.write-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--vp-c-border);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition: all 0.3s;
}

.step-dot.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.step-dot.done {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.step-label {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
}

.flow-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.node.highlight {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}

.node-icon {
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.node.client .node-icon { color: #8b5cf6; }
.node.coord .node-icon { color: #f59e0b; }
.node.primary .node-icon { color: #ef4444; }

.node-name {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.arrow {
  font-size: 20px;
  color: var(--vp-c-border);
  transition: color 0.3s;
}

.arrow.active {
  color: var(--vp-c-brand-1);
}

.state-panels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.state-card {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
}

.state-card h4 {
  margin: 0;
  padding: 6px 10px;
  background: var(--vp-c-bg);
  font-size: 13px;
  border-bottom: 1px solid var(--vp-c-border);
}

.state-content {
  padding: 10px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  min-height: 60px;
  transition: all 0.3s;
}

.state-content.active {
  color: var(--vp-c-text-1);
}

.state-content.writing {
  background: #eff6ff;
}

.state-content.flushed {
  background: #f0fdf4;
}

.data-item {
  padding: 3px 0;
  font-size: 12px;
}

.data-item.status-ok {
  color: #059669;
}

.data-item.done {
  color: var(--vp-c-text-2);
  font-style: italic;
}

.seg {
  padding: 4px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid var(--vp-c-border);
}

.seg-new {
  border-color: #059669;
  background: #ecfdf5;
  color: #059669;
}

.replica-panel {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;
}

.replica-panel h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.replica-shards {
  display: flex;
  gap: 8px;
}

.shard {
  padding: 8px 16px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.3s;
}

.shard.replica {
  color: #059669;
}

.shard.synced {
  border-color: #059669;
  background: #ecfdf5;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--vp-c-text-2);
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
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .state-panels {
    grid-template-columns: 1fr;
  }
}
</style>
