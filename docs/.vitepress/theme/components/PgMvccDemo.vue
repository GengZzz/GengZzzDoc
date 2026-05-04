<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 5

interface Tuple {
  id: number
  name: string
  age: number
  xmin: number
  xmax: number
  dead: boolean
  label?: string
}

const tuples = computed((): Tuple[] => {
  switch (step.value) {
    case 0:
      return [
        { id: 1, name: 'Alice', age: 20, xmin: 100, xmax: 0, dead: false },
        { id: 2, name: 'Bob', age: 30, xmin: 100, xmax: 0, dead: false },
        { id: 3, name: 'Carol', age: 25, xmin: 100, xmax: 0, dead: false },
      ]
    case 1:
      return [
        { id: 1, name: 'Alice', age: 20, xmin: 100, xmax: 101, dead: false, label: '旧版本' },
        { id: 1, name: 'Alice', age: 25, xmin: 101, xmax: 0, dead: false, label: '新版本（事务A更新）' },
        { id: 2, name: 'Bob', age: 30, xmin: 100, xmax: 0, dead: false },
        { id: 3, name: 'Carol', age: 25, xmin: 100, xmax: 0, dead: false },
      ]
    case 2:
      return [
        { id: 1, name: 'Alice', age: 20, xmin: 100, xmax: 101, dead: false, label: '事务B看到此版本（事务A未提交）' },
        { id: 1, name: 'Alice', age: 25, xmin: 101, xmax: 0, dead: false, label: '事务B看不到（事务A未提交）' },
        { id: 2, name: 'Bob', age: 30, xmin: 100, xmax: 0, dead: false },
        { id: 3, name: 'Carol', age: 25, xmin: 100, xmax: 0, dead: false },
      ]
    case 3:
      return [
        { id: 1, name: 'Alice', age: 20, xmin: 100, xmax: 101, dead: false, label: '事务B仍看到此版本（可重复读）' },
        { id: 1, name: 'Alice', age: 25, xmin: 101, xmax: 0, dead: false, label: '新事务看到此版本（事务A已提交）' },
        { id: 2, name: 'Bob', age: 30, xmin: 100, xmax: 0, dead: false },
        { id: 3, name: 'Carol', age: 25, xmin: 100, xmax: 0, dead: false },
      ]
    case 4:
      return [
        { id: 1, name: 'Alice', age: 20, xmin: 100, xmax: 101, dead: true, label: 'Dead Tuple（VACUUM 清理）' },
        { id: 1, name: 'Alice', age: 25, xmin: 101, xmax: 0, dead: false, label: '当前版本' },
        { id: 2, name: 'Bob', age: 30, xmin: 100, xmax: 0, dead: false },
        { id: 3, name: 'Carol', age: 25, xmin: 100, xmax: 0, dead: false },
      ]
    default:
      return []
  }
})

const statusText = computed(() => {
  const texts = [
    '初始状态：3 行数据，xmin=100 表示由事务 100 插入，xmax=0 表示未被删除',
    '事务 A (trx_id=101) 更新 id=1：旧行 xmax=101，新行 xmin=101',
    '事务 B 开始（快照：xmin=100, xmax=102, xip=[101]）：看到旧行（事务A未提交）',
    '事务 A 提交后：事务 B 仍看到旧行（可重复读快照），新事务看到新行',
    'VACUUM 清理 Dead Tuple：旧行对任何活跃事务不再可见，空间可回收',
  ]
  return texts[step.value]
})

const snapshotInfo = computed(() => {
  if (step.value === 2) return { xmin: 100, xmax: 102, xip: [101] }
  if (step.value === 3) return { xmin: 100, xmax: 102, xip: [] }
  return null
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="pg-mvcc-demo">
    <div v-if="snapshotInfo" class="snapshot-box">
      <span class="snapshot-label">事务 B 快照：</span>
      <span>xmin={{ snapshotInfo.xmin }}</span>
      <span>xmax={{ snapshotInfo.xmax }}</span>
      <span v-if="snapshotInfo.xip.length > 0">活跃事务={{ snapshotInfo.xip.join(', ') }}</span>
      <span v-else>无活跃事务</span>
    </div>

    <div class="tuple-list">
      <div
        v-for="(t, idx) in tuples"
        :key="idx"
        class="tuple-box"
        :class="{
          'dead-tuple': t.dead,
          'new-version': t.label?.includes('新版本') || t.label?.includes('当前版本'),
          'visible': t.label?.includes('看到'),
          'hidden': t.label?.includes('看不到'),
        }"
      >
        <div class="tuple-header">
          <span class="tuple-ctid">ctid=(0,{{ idx + 1 }})</span>
          <span v-if="t.label" class="tuple-label">{{ t.label }}</span>
        </div>
        <div class="tuple-body">
          <div class="tuple-meta">
            <span class="xmin">xmin={{ t.xmin }}</span>
            <span class="xmax">xmax={{ t.xmax === 0 ? '0（有效）' : t.xmax }}</span>
          </div>
          <div class="tuple-data">
            <span>id={{ t.id }}</span>
            <span>name={{ t.name }}</span>
            <span>age={{ t.age }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pg-mvcc-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.snapshot-box {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-2);
  flex-wrap: wrap;
}

.snapshot-label {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.tuple-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tuple-box {
  padding: 10px 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  transition: border-color 0.3s, opacity 0.3s;
}

.tuple-box.new-version {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

.tuple-box.visible {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
}

.tuple-box.hidden {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.06);
  opacity: 0.7;
}

.tuple-box.dead-tuple {
  border-color: #ef4444;
  opacity: 0.5;
  text-decoration: line-through;
}

.tuple-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.tuple-ctid {
  font-family: monospace;
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  padding: 1px 6px;
  border-radius: 4px;
}

.tuple-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.tuple-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tuple-meta {
  display: flex;
  gap: 12px;
}

.xmin {
  color: #3b82f6;
  font-weight: 600;
  font-family: monospace;
}

.xmax {
  color: #ef4444;
  font-weight: 600;
  font-family: monospace;
}

.tuple-data {
  display: flex;
  gap: 12px;
  font-weight: 500;
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
