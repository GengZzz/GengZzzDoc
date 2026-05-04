<script setup lang="ts">
import { ref, computed } from 'vue'

type LockType = 'record' | 'gap' | 'next-key' | 'intention'

const selected = ref<LockType>('record')

const lockInfo: Record<LockType, { name: string; desc: string; code: string }> = {
  record: {
    name: '行锁 (Record Lock)',
    desc: '锁定索引上的具体记录',
    code: 'SELECT * FROM t WHERE id = 3 FOR UPDATE',
  },
  gap: {
    name: '间隙锁 (Gap Lock)',
    desc: '锁定两个索引值之间的间隙，防止幻读',
    code: 'SELECT * FROM t WHERE id > 10 AND id < 20 FOR UPDATE',
  },
  'next-key': {
    name: '临键锁 (Next-Key Lock)',
    desc: '行锁 + 间隙锁的组合，InnoDB 默认的行锁算法',
    code: 'SELECT * FROM t WHERE id <= 20 FOR UPDATE\n-- 锁定范围: (-∞, 20]',
  },
  intention: {
    name: '意向锁 (Intention Lock)',
    desc: '表级锁，标记事务打算在表中加什么类型的行锁',
    code: '-- 自动管理，无需手动操作\n-- IS: 意向共享锁\n-- IX: 意向排他锁',
  },
}

const rows = [
  { id: 1, name: 'Alice', age: 20 },
  { id: 5, name: 'Bob', age: 25 },
  { id: 10, name: 'Carol', age: 30 },
  { id: 15, name: 'Dave', age: 35 },
  { id: 20, name: 'Eve', age: 40 },
]

const current = computed(() => lockInfo[selected.value])

function select(type: LockType) {
  selected.value = type
}

function isRowLocked(idx: number): boolean {
  if (selected.value === 'record') return idx === 2 // id=10
  if (selected.value === 'next-key') return idx === 2 || idx === 3 // id=10,15
  return false
}

function isGapAfter(idx: number): boolean {
  if (selected.value === 'gap') return idx === 2 // gap after id=10
  if (selected.value === 'next-key') return idx === 2 // gap after id=10
  return false
}
</script>

<template>
  <div class="lock-demo">
    <div class="lock-tabs">
      <button
        v-for="(info, key) in lockInfo"
        :key="key"
        type="button"
        class="tab-btn"
        :class="{ active: selected === key }"
        @click="select(key as LockType)"
      >
        {{ info.name }}
      </button>
    </div>

    <div class="lock-content">
      <div class="desc-text">{{ current.desc }}</div>

      <div class="lock-visual">
        <!-- Table view -->
        <div class="table-view">
          <div class="table-header">
            <span>id</span>
            <span>name</span>
            <span>age</span>
          </div>
          <div v-for="(row, idx) in rows" :key="idx" class="table-row-wrapper">
            <div class="table-row" :class="{ locked: isRowLocked(idx) }">
              <span>{{ row.id }}</span>
              <span>{{ row.name }}</span>
              <span>{{ row.age }}</span>
              <span v-if="isRowLocked(idx)" class="lock-icon">🔒</span>
            </div>
            <div v-if="isGapAfter(idx)" class="gap-zone">
              <span class="gap-label">间隙 (Gap)</span>
            </div>
          </div>
        </div>

        <!-- Lock visualization -->
        <div class="lock-viz">
          <div v-if="selected === 'record'" class="viz-box record-viz">
            <div class="viz-title">行锁</div>
            <div class="viz-row locked">
              id=10 🔒
            </div>
            <div class="viz-note">仅锁定匹配的行</div>
          </div>
          <div v-else-if="selected === 'gap'" class="viz-box gap-viz">
            <div class="viz-title">间隙锁</div>
            <div class="viz-gap-zone">
              <span>(10, 15) 被锁定</span>
            </div>
            <div class="viz-note">禁止在间隙中插入新记录</div>
          </div>
          <div v-else-if="selected === 'next-key'" class="viz-box nk-viz">
            <div class="viz-title">临键锁</div>
            <div class="viz-row locked">id=10 🔒</div>
            <div class="viz-gap-zone">(10, 15) 🔒</div>
            <div class="viz-note">行锁 + 前开后闭间隙锁</div>
          </div>
          <div v-else class="viz-box intention-viz">
            <div class="viz-title">意向锁</div>
            <div class="table-lock">📋 表级 IX 锁</div>
            <div class="row-locks">
              <span>🔒 行1</span>
              <span>🔒 行2</span>
              <span>...</span>
            </div>
            <div class="viz-note">加行锁前自动加意向锁</div>
          </div>
        </div>
      </div>

      <div class="code-block">
        <pre>{{ current.code }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lock-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.lock-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tab-btn {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 12px;
  transition: border-color 0.2s, background 0.2s;
}

.tab-btn.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  font-weight: 600;
}

.desc-text {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
}

.lock-visual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.table-view {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 13px;
}

.table-header {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  gap: 8px;
  padding: 6px 10px;
  background: var(--vp-c-bg);
  font-weight: 600;
  font-size: 12px;
  border-bottom: 1px solid var(--vp-c-border);
}

.table-row-wrapper {
  position: relative;
}

.table-row {
  display: grid;
  grid-template-columns: 40px 1fr 40px 20px;
  gap: 8px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--vp-c-border);
  font-size: 12px;
  transition: background 0.3s;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row.locked {
  background: rgba(245, 158, 11, 0.12);
}

.lock-icon {
  font-size: 11px;
}

.gap-zone {
  padding: 3px 10px;
  background: rgba(139, 92, 246, 0.1);
  border-bottom: 1px solid var(--vp-c-border);
  text-align: center;
}

.gap-label {
  font-size: 11px;
  color: #8b5cf6;
  font-weight: 600;
}

.lock-viz {
  display: flex;
  align-items: center;
  justify-content: center;
}

.viz-box {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  width: 100%;
  text-align: center;
}

.viz-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.viz-row {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 4px;
}

.viz-row.locked {
  background: rgba(245, 158, 11, 0.12);
}

.viz-gap-zone {
  padding: 6px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #8b5cf6;
  margin-bottom: 4px;
}

.viz-note {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 6px;
}

.table-lock {
  padding: 6px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 6px;
}

.row-locks {
  display: flex;
  gap: 6px;
  justify-content: center;
  font-size: 12px;
}

.code-block {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  color: var(--vp-c-text-1);
}

@media (max-width: 560px) {
  .lock-visual {
    grid-template-columns: 1fr;
  }
}
</style>
