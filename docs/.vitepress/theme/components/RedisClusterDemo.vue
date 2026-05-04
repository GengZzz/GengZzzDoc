<script setup lang="ts">
import { computed, ref } from 'vue'

interface Node {
  id: string
  name: string
  color: string
  slots: [number, number][]
}

const nodes: Node[] = [
  { id: 'A', name: 'Master A', color: '#8b5cf6', slots: [[0, 5460]] },
  { id: 'B', name: 'Master B', color: '#f59e0b', slots: [[5461, 10922]] },
  { id: 'C', name: 'Master C', color: '#10b981', slots: [[10923, 16383]] }
]

const sampleKeys = [
  { key: 'user:1001', slot: 0 },
  { key: 'order:20240115', slot: 0 },
  { key: 'session:abc123', slot: 0 },
  { key: 'product:5001', slot: 0 },
  { key: 'cache:config', slot: 0 }
]

// Calculate CRC16 and slot for demo keys
function crc16(s: string): number {
  let crc = 0
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc &= 0xFFFF
    }
  }
  return crc
}

function getSlot(key: string): number {
  // Handle hash tags
  let hashKey = key
  const start = key.indexOf('{')
  if (start !== -1) {
    const end = key.indexOf('}', start)
    if (end !== -1 && end > start + 1) {
      hashKey = key.substring(start + 1, end)
    }
  }
  return crc16(hashKey) % 16384
}

// Initialize sample key slots
sampleKeys.forEach(k => { k.slot = getSlot(k.key) })

const selectedKeyIndex = ref<number | null>(null)
const showMigration = ref(false)

const selectedSlot = computed(() => {
  if (selectedKeyIndex.value === null) return null
  return sampleKeys[selectedKeyIndex.value].slot
})

const targetNode = computed(() => {
  if (selectedSlot.value === null) return null
  return nodes.find(n =>
    n.slots.some(([start, end]) => selectedSlot.value! >= start && selectedSlot.value! <= end)
  ) || null
})

function selectKey(index: number) {
  if (showMigration.value) {
    showMigration.value = false
  }
  selectedKeyIndex.value = selectedKeyIndex.value === index ? null : index
}

function toggleMigration() {
  showMigration.value = !showMigration.value
  if (showMigration.value) {
    selectedKeyIndex.value = 1 // order key
  }
}

function getNodeForSlot(slot: number): Node | null {
  return nodes.find(n =>
    n.slots.some(([start, end]) => slot >= start && slot <= end)
  ) || null
}
</script>

<template>
  <div class="cluster-demo">
    <div class="cluster-info">
      <span class="info-badge">Redis Cluster</span>
      <span>16384 个槽位分配到 3 个 Master 节点</span>
    </div>

    <!-- Slot bar visualization -->
    <div class="slot-bar">
      <div
        v-for="node in nodes"
        :key="node.id"
        class="slot-segment"
        :style="{
          flex: node.slots.reduce((sum, [s, e]) => sum + (e - s + 1), 0),
          background: node.color
        }"
      >
        <span class="slot-label">{{ node.id }}: {{ node.slots[0][0] }}-{{ node.slots[0][1] }}</span>
      </div>
    </div>

    <!-- Nodes display -->
    <div class="nodes-grid">
      <div
        v-for="node in nodes"
        :key="node.id"
        class="node-card"
        :class="{ highlighted: targetNode?.id === node.id }"
        :style="{ borderColor: node.color }"
      >
        <div class="node-header" :style="{ background: node.color }">
          {{ node.name }}
        </div>
        <div class="node-body">
          <div class="slot-range">Slots: {{ node.slots[0][0] }} - {{ node.slots[0][1] }}</div>
          <div class="slot-count">{{ node.slots[0][1] - node.slots[0][0] + 1 }} 个槽位</div>
        </div>
      </div>
    </div>

    <!-- Key routing -->
    <div class="key-section">
      <h4>点击 Key 查看路由</h4>
      <div class="key-list">
        <button
          v-for="(item, i) in sampleKeys"
          :key="i"
          class="key-btn"
          :class="{ selected: selectedKeyIndex === i }"
          @click="selectKey(i)"
        >
          {{ item.key }}
          <small>slot {{ item.slot }}</small>
        </button>
      </div>

      <div v-if="selectedKeyIndex !== null && !showMigration" class="routing-result">
        <div class="route-path">
          <span class="route-key">{{ sampleKeys[selectedKeyIndex].key }}</span>
          <span class="route-arrow">→</span>
          <span>CRC16 % 16384 = </span>
          <span class="route-slot">{{ selectedSlot }}</span>
          <span class="route-arrow">→</span>
          <span v-if="targetNode" class="route-node" :style="{ color: targetNode.color }">
            {{ targetNode.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Migration demo -->
    <div class="migration-section">
      <button type="button" class="migrate-btn" @click="toggleMigration">
        {{ showMigration ? '关闭迁移演示' : '演示槽位迁移' }}
      </button>

      <div v-if="showMigration" class="migration-visual">
        <div class="migration-step">
          <h4>槽位 5461-5470 从 Master B 迁移到 Master A</h4>
          <div class="migration-flow">
            <div class="migrate-node" style="border-color: #f59e0b;">
              <strong>Master B</strong>
              <small>MIGRATING 5461-5470</small>
            </div>
            <div class="migrate-arrow">
              <span>MIGRATE key by key</span>
              <span class="arrow-icon">→</span>
            </div>
            <div class="migrate-node" style="border-color: #8b5cf6;">
              <strong>Master A</strong>
              <small>IMPORTING 5461-5470</small>
            </div>
          </div>
          <div class="migration-note">
            迁移期间，客户端访问迁移中的 key 会收到 <code>ASK 5461 MasterA:6379</code> 重定向
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cluster-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.cluster-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.info-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.slot-bar {
  display: flex;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.slot-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.slot-label {
  font-size: 11px;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.node-card {
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.node-card.highlighted {
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
}

.node-header {
  padding: 6px 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.node-body {
  padding: 8px 10px;
  background: var(--vp-c-bg);
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.slot-range {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.slot-count {
  margin-top: 2px;
}

.key-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.key-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.key-btn {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;
}

.key-btn small {
  color: var(--vp-c-text-2);
  font-size: 10px;
}

.key-btn.selected {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.key-btn.selected small {
  color: rgba(255, 255, 255, 0.8);
}

.key-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.routing-result {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.route-path {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.route-key {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.route-arrow {
  color: var(--vp-c-text-2);
}

.route-slot {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-family: monospace;
  font-weight: 600;
}

.route-node {
  font-weight: 600;
}

.migration-section {
  margin-top: 12px;
}

.migrate-btn {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  margin-bottom: 10px;
}

.migrate-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.migration-visual {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.migration-step h4 {
  margin: 0 0 10px;
  font-size: 13px;
}

.migration-flow {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.migrate-node {
  padding: 10px 14px;
  border: 2px solid;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  text-align: center;
}

.migrate-node strong {
  display: block;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.migrate-node small {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.migrate-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.arrow-icon {
  font-size: 20px;
}

.migration-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.migration-note code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}

@media (max-width: 560px) {
  .nodes-grid {
    grid-template-columns: 1fr;
  }
  .migration-flow {
    flex-direction: column;
  }
}
</style>
