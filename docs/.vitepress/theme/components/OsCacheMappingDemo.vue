<script setup lang="ts">
import { ref, computed } from 'vue'

type Mode = 'direct' | 'full' | 'set'
const mode = ref<Mode>('direct')
const step = ref(0)

const cacheSize = 8
const setSize = 4
const blocksPerSet = 2

const accessSequence = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11, 0, 8]

interface CacheEntry {
  tag: number
  valid: boolean
}

// Direct mapped: line = block % cacheSize
const directCache = ref<(CacheEntry | null)[]>(Array(cacheSize).fill(null))
// Full associative: list of tags
const fullCache = ref<CacheEntry[]>([])
// Set associative: set[setIdx] = CacheEntry[]
const setCache = ref<CacheEntry[][]>(Array.from({ length: setSize }, () => []))

const results = ref<{ block: number; hit: boolean; dest: string }[]>([])

function reset() {
  step.value = 0
  directCache.value = Array(cacheSize).fill(null)
  fullCache.value = []
  setCache.value = Array.from({ length: setSize }, () => [])
  results.value = []
}

function next() {
  if (step.value >= accessSequence.length) {
    reset()
    return
  }
  const block = accessSequence[step.value]

  if (mode.value === 'direct') {
    const line = block % cacheSize
    const hit = directCache.value[line]?.tag === block
    directCache.value[line] = { tag: block, valid: true }
    results.value.push({ block, hit, dest: `行 ${line}` })
  } else if (mode.value === 'full') {
    const hit = fullCache.value.some(e => e.tag === block)
    if (!hit) {
      if (fullCache.value.length >= cacheSize) fullCache.value.shift()
      fullCache.value.push({ tag: block, valid: true })
    }
    results.value.push({ block, hit, dest: hit ? '命中' : '任意空位' })
  } else {
    const setIdx = block % setSize
    const set = setCache.value[setIdx]
    const hit = set.some(e => e.tag === block)
    if (!hit) {
      if (set.length >= blocksPerSet) set.shift()
      set.push({ tag: block, valid: true })
    }
    results.value.push({ block, hit, dest: `组 ${setIdx}` })
  }

  step.value++
}

function resetAndSwitch(m: Mode) {
  mode.value = m
  reset()
}

const currentAccess = computed(() => {
  if (step.value > 0 && step.value <= accessSequence.length) {
    return accessSequence[step.value - 1]
  }
  return null
})

const hitCount = computed(() => results.value.filter(r => r.hit).length)
const missCount = computed(() => results.value.filter(r => !r.hit).length)
const hitRate = computed(() => {
  const total = results.value.length
  return total > 0 ? ((hitCount.value / total) * 100).toFixed(1) : '0.0'
})

const modeLabels: Record<Mode, string> = {
  direct: '直接映射',
  full: '全相联映射',
  set: '2 路组相联',
}

function isCurrentEntry(tag: number): boolean {
  return currentAccess.value === tag
}

const lastResult = computed(() => {
  if (results.value.length === 0) return null
  return results.value[results.value.length - 1]
})
</script>

<template>
  <div class="cache-demo">
    <div class="mode-tabs">
      <button
        v-for="m in (['direct', 'full', 'set'] as Mode[])"
        :key="m"
        :class="{ active: mode === m }"
        @click="resetAndSwitch(m)"
      >{{ modeLabels[m] }}</button>
    </div>

    <!-- Access sequence display -->
    <div class="sequence">
      <span class="seq-label">访问序列:</span>
      <span
        v-for="(b, i) in accessSequence"
        :key="i"
        class="seq-item"
        :class="{
          done: i < step,
          current: i === step - 1,
          pending: i >= step
        }"
      >{{ b }}</span>
    </div>

    <!-- Direct mapped -->
    <div v-if="mode === 'direct'" class="cache-view">
      <div class="cache-label">Cache（{{ cacheSize }} 行）</div>
      <div class="cache-grid direct-grid">
        <div
          v-for="(entry, idx) in directCache"
          :key="idx"
          class="cache-cell"
          :class="{ filled: entry, highlight: entry && isCurrentEntry(entry.tag) }"
        >
          <div class="cell-idx">行 {{ idx }}</div>
          <div class="cell-tag">{{ entry ? `块 ${entry.tag}` : '—' }}</div>
        </div>
      </div>
      <div class="rule-hint">映射规则: 行号 = 主存块号 mod {{ cacheSize }}</div>
    </div>

    <!-- Full associative -->
    <div v-if="mode === 'full'" class="cache-view">
      <div class="cache-label">Cache（{{ cacheSize }} 行，任意位置）</div>
      <div class="cache-grid full-grid">
        <div
          v-for="(entry, idx) in fullCache"
          :key="idx"
          class="cache-cell filled"
          :class="{ highlight: isCurrentEntry(entry.tag) }"
        >
          <div class="cell-idx">槽 {{ idx }}</div>
          <div class="cell-tag">块 {{ entry.tag }}</div>
        </div>
        <div
          v-for="i in (cacheSize - fullCache.length)"
          :key="'e' + i"
          class="cache-cell"
        >
          <div class="cell-idx">槽 {{ fullCache.length + i - 1 }}</div>
          <div class="cell-tag">—</div>
        </div>
      </div>
      <div class="rule-hint">映射规则: 可放入任意空闲槽位</div>
    </div>

    <!-- Set associative -->
    <div v-if="mode === 'set'" class="cache-view">
      <div class="cache-label">Cache（{{ setSize }} 组，每组 {{ blocksPerSet }} 行）</div>
      <div class="sets-grid">
        <div v-for="(set, si) in setCache" :key="si" class="set-group">
          <div class="set-label">组 {{ si }}</div>
          <div class="set-entries">
            <div
              v-for="(entry, ei) in set"
              :key="ei"
              class="cache-cell filled"
              :class="{ highlight: isCurrentEntry(entry.tag) }"
            >
              <div class="cell-tag">块 {{ entry.tag }}</div>
            </div>
            <div
              v-for="i in (blocksPerSet - set.length)"
              :key="'e' + i"
              class="cache-cell"
            >
              <div class="cell-tag">—</div>
            </div>
          </div>
        </div>
      </div>
      <div class="rule-hint">映射规则: 组号 = 主存块号 mod {{ setSize }}，组内任意</div>
    </div>

    <!-- Last result -->
    <div v-if="lastResult" class="result-bar">
      <span :class="lastResult.hit ? 'hit' : 'miss'">
        {{ lastResult.hit ? '命中 (Hit)' : '未命中 (Miss)' }}
      </span>
      访问块 {{ lastResult.block }} → {{ lastResult.dest }}
    </div>

    <!-- Stats -->
    <div v-if="results.length > 0" class="stats">
      <span>命中: {{ hitCount }}</span>
      <span>未命中: {{ missCount }}</span>
      <span>命中率: {{ hitRate }}%</span>
    </div>

    <div class="actions">
      <button @click="next">{{ step >= accessSequence.length ? '重置' : '下一步' }}</button>
      <button @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.cache-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-tabs button {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}

.mode-tabs button.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-weight: 600;
}

.sequence {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
}

.seq-label {
  color: var(--vp-c-text-2);
}

.seq-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.seq-item.done {
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-1);
  opacity: 0.6;
}

.seq-item.current {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  opacity: 1;
}

.seq-item.pending {
  opacity: 0.35;
}

.cache-label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.cache-grid.direct-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.cache-grid.full-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.cache-cell {
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  text-align: center;
  background: var(--vp-c-bg);
  font-size: 12px;
  transition: all 0.2s;
}

.cache-cell.filled {
  border-color: #3b82f6;
}

.cache-cell.highlight {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.cell-idx {
  font-size: 10px;
  color: var(--vp-c-text-2);
  margin-bottom: 2px;
}

.cell-tag {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.filled .cell-tag {
  color: #3b82f6;
}

.highlight .cell-tag {
  color: #f59e0b;
}

.sets-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.set-group {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 8px;
  background: var(--vp-c-bg);
}

.set-label {
  font-size: 11px;
  font-weight: 600;
  color: #8b5cf6;
  margin-bottom: 6px;
  text-align: center;
}

.set-entries {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.result-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.hit {
  color: #22c55e;
  font-weight: 700;
}

.miss {
  color: #ef4444;
  font-weight: 700;
}

.stats {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
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

@media (max-width: 560px) {
  .cache-grid.direct-grid,
  .cache-grid.full-grid,
  .sets-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
