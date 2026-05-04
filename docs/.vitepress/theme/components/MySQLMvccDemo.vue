<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 6

interface Version {
  id: number
  name: string
  age: number
  trxId: number
}

const versions = computed((): Version[] => {
  if (step.value === 0) return []
  if (step.value === 1) return [{ id: 1, name: 'Alice', age: 20, trxId: 100 }]
  if (step.value === 2) return [
    { id: 1, name: 'Alice', age: 25, trxId: 101 },
    { id: 1, name: 'Alice', age: 20, trxId: 100 },
  ]
  if (step.value >= 3) return [
    { id: 1, name: 'Alice', age: 30, trxId: 102 },
    { id: 1, name: 'Alice', age: 25, trxId: 101 },
    { id: 1, name: 'Alice', age: 20, trxId: 100 },
  ]
  return []
})

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 MVCC 版本链',
    '初始数据，事务 100 插入行',
    '事务 101 更新 age=25，旧版本保留',
    '版本链越来越长，每次更新追加新版本',
    '事务 103 的 ReadView: 看到 age=25 的版本',
    'purge 级程清理不再需要的旧版本',
  ]
  return texts[step.value]
})

const visibleVersionIdx = computed(() => {
  if (step.value === 4) return 1 // trx 103 sees age=25
  return -1
})

const purgedIdx = computed(() => {
  if (step.value === 5) return 2 // oldest version purged
  return -1
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="mvcc-demo">
    <div v-if="versions.length === 0" class="empty">等待数据操作...</div>

    <div v-else class="version-chain">
      <div
        v-for="(v, idx) in versions"
        :key="idx"
        class="version-box"
        :class="{
          current: idx === 0,
          old: idx > 0,
          visible: visibleVersionIdx === idx,
          purged: purgedIdx === idx,
        }"
      >
        <div class="trx-label">trx_id: {{ v.trxId }}</div>
        <div class="row-data">
          <span>id={{ v.id }}</span>
          <span>name={{ v.name }}</span>
          <span>age={{ v.age }}</span>
        </div>
        <div v-if="idx === 0 && step >= 2" class="roll-ptr">roll_ptr →</div>
        <div v-if="idx > 0" class="roll-ptr">↑ roll_ptr</div>
      </div>
    </div>

    <!-- Arrow between versions -->
    <div v-if="versions.length > 1" class="chain-annotation">
      <span v-if="step === 2">当前版本 → 旧版本</span>
      <span v-else-if="step === 3">版本链: current → v2 → v1</span>
      <span v-else-if="step === 4" class="readview-note">
        ReadView (trx 103): up_limit_id=101, 只能看到 trx_id ≤ 101 的版本 → age=25
      </span>
      <span v-else-if="step === 5" class="purge-note">
        purge: trx_id=100 &lt; oldest_active_trx, 该版本可被回收
      </span>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.mvcc-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.empty {
  min-height: 60px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.version-chain {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-box {
  padding: 10px 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  transition: border-color 0.3s, background 0.3s, opacity 0.3s;
}

.version-box.current {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

.version-box.old {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.06);
}

.version-box.visible {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
}

.version-box.purged {
  border-color: #ef4444;
  opacity: 0.5;
  text-decoration: line-through;
}

.trx-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.row-data {
  display: flex;
  gap: 12px;
  font-weight: 600;
}

.roll-ptr {
  font-size: 11px;
  color: #8b5cf6;
  margin-top: 4px;
}

.chain-annotation {
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-align: center;
}

.readview-note {
  color: #22c55e;
  font-weight: 600;
}

.purge-note {
  color: #ef4444;
  font-weight: 600;
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
</style>
