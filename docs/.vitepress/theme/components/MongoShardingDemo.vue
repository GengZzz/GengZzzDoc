<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const shards = ref([
  { id: 0, name: 'Shard1', chunks: 2, docs: 0 },
  { id: 1, name: 'Shard2', chunks: 2, docs: 0 },
  { id: 2, name: 'Shard3', chunks: 2, docs: 0 }
])

const insertedDocs = ref<{ key: string; shard: number; hash: string }[]>([])
const balancerActive = ref(false)
const hotSpot = ref(false)

const stepDesc = computed(() => {
  const descs = [
    '分片集群架构：mongos 路由请求 → Config Server 存储元数据 → 3 个 Shard 存储数据',
    '插入文档：根据 Shard Key 计算哈希值，路由到对应 Shard',
    'Chunk 达到 64MB 阈值，触发分裂（Split），一个 Chunk 分为两个',
    'Balancer 检测 Shard 间 Chunk 数量不均衡，自动迁移 Chunk',
    'Shard Key 选择不当（如单调递增的时间戳）：所有写入集中到单个 Shard，形成热点'
  ]
  return descs[step.value] || descs[0]
})

function next() {
  if (step.value < totalSteps - 1) {
    step.value++
    if (step.value === 1) simulateInsert()
    if (step.value === 2) simulateSplit()
    if (step.value === 3) simulateBalance()
    if (step.value === 4) simulateHotSpot()
  }
}

function reset() {
  step.value = 0
  shards.value = [
    { id: 0, name: 'Shard1', chunks: 2, docs: 0 },
    { id: 1, name: 'Shard2', chunks: 2, docs: 0 },
    { id: 2, name: 'Shard3', chunks: 2, docs: 0 }
  ]
  insertedDocs.value = []
  balancerActive.value = false
  hotSpot.value = false
}

function hashShard(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 3
}

function simulateInsert() {
  insertedDocs.value = []
  shards.value.forEach(s => s.docs = 0)
  for (let i = 1; i <= 12; i++) {
    const key = `user${i * 1000}`
    const shard = hashShard(key)
    insertedDocs.value.push({ key, shard, hash: `h(${key})` })
    shards.value[shard].docs++
  }
}

function simulateSplit() {
  shards.value[0].chunks += 1
  shards.value[1].chunks += 1
}

function simulateBalance() {
  balancerActive.value = true
  // move one chunk from shard1 to shard3
  setTimeout(() => {
    shards.value[0].chunks -= 1
    shards.value[2].chunks += 1
    balancerActive.value = false
  }, 600)
}

function simulateHotSpot() {
  hotSpot.value = true
  shards.value.forEach(s => s.docs = 0)
  insertedDocs.value = []
  // monotonic keys all go to same shard
  for (let i = 1; i <= 12; i++) {
    const key = `ts${Date.now()}${i}`
    const shard = 0 // all go to shard 0 (simulated)
    insertedDocs.value.push({ key, shard, hash: `h(${key})` })
    shards.value[0].docs++
  }
}
</script>

<template>
  <div class="sharding-demo">
    <div class="step-indicator">
      <div v-for="i in totalSteps" :key="i" class="step-dot" :class="{ active: step >= i - 1, current: step === i - 1 }">
        {{ i }}
      </div>
    </div>

    <!-- Step 0: Architecture -->
    <div v-if="step >= 0" class="arch-layer">
      <div class="arch-row">
        <div class="arch-box router">mongos (路由)</div>
      </div>
      <div class="arch-row">
        <div class="arch-box config">Config Server (副本集)</div>
      </div>
      <div class="arch-row shards-row">
        <div v-for="s in shards" :key="s.id" class="arch-box shard" :class="{ hotspot: hotSpot && s.id === 0 }">
          <div class="shard-name">{{ s.name }}</div>
          <div class="shard-meta">{{ s.chunks }} chunks | {{ s.docs }} docs</div>
        </div>
      </div>
    </div>

    <!-- Step 1: Inserted docs -->
    <div v-if="step >= 1" class="doc-table">
      <div class="doc-row header">
        <span>Shard Key</span><span>Hash</span><span>路由到</span>
      </div>
      <div v-for="doc in insertedDocs" :key="doc.key" class="doc-row">
        <span>{{ doc.key }}</span>
        <span>{{ doc.hash }}</span>
        <span :class="'shard-label shard-' + doc.shard">{{ shards[doc.shard].name }}</span>
      </div>
    </div>

    <!-- Step 3: Balancer -->
    <div v-if="step === 3" class="balancer-status" :class="{ active: balancerActive }">
      {{ balancerActive ? 'Balancer 正在迁移 Chunk...' : 'Balancer 完成均衡' }}
    </div>

    <!-- Step 4: Hotspot warning -->
    <div v-if="step === 4" class="hotspot-warning">
      热点警告：所有写入集中到 Shard1，Shard2 和 Shard3 完全空闲。应使用 Hashed Shard Key 或复合 Shard Key 避免此问题。
    </div>

    <div class="status-bar">{{ stepDesc }}</div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.sharding-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.step-dot {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid var(--vp-c-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.step-dot.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.step-dot.current {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.arch-layer {
  margin-bottom: 16px;
}

.arch-row {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.arch-box {
  padding: 8px 16px;
  border-radius: 6px;
  border: 2px solid var(--vp-c-border);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.arch-box.router { border-color: #f59e0b; }
.arch-box.config { border-color: #8b5cf6; }

.shards-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.arch-box.shard {
  border-color: #3b82f6;
}

.arch-box.shard.hotspot {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}

.shard-name {
  font-weight: 600;
  font-size: 13px;
}

.shard-meta {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 2px;
}

.doc-table {
  margin: 12px 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.doc-row {
  display: grid;
  grid-template-columns: 1fr 1fr 80px;
  padding: 4px 8px;
  font-size: 12px;
  border-bottom: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
}

.doc-row.header {
  background: var(--vp-c-bg);
  font-weight: 600;
}

.shard-label {
  font-weight: 600;
  font-size: 11px;
}

.shard-0 { color: #3b82f6; }
.shard-1 { color: #22c55e; }
.shard-2 { color: #f59e0b; }

.balancer-status {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}

.balancer-status.active {
  border-color: #f59e0b;
  color: #f59e0b;
  animation: pulse-gold 1s infinite;
}

@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0); }
}

.hotspot-warning {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border: 1px solid #ef4444;
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

@media (max-width: 560px) {
  .shards-row {
    grid-template-columns: 1fr;
  }
}
</style>
