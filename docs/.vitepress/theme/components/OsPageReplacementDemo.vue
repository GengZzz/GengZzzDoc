<script setup lang="ts">
import { ref, computed } from 'vue'

type Algo = 'FIFO' | 'LRU' | 'OPT'
const algo = ref<Algo>('FIFO')
const frameCount = ref(3)
const step = ref(0)

const pages = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]

interface HistoryStep {
  page: number
  frames: number[]
  hit: boolean
  replaced: number | null
  label: string
}

const history = ref<HistoryStep[]>([])
const currentFrames = ref<number[]>([])

function findVictimFIFO(frames: number[]): number {
  // FIFO: find the frame that was loaded earliest
  // We track by the earliest insertion in history
  const frameAge = new Map<number, number>()
  for (const h of history.value) {
    for (const f of h.frames) {
      if (!frameAge.has(f)) frameAge.set(f, frameAge.size)
    }
  }
  let oldest = Infinity
  let victim = 0
  for (const f of frames) {
    const age = frameAge.get(f) ?? 0
    if (age < oldest) {
      oldest = age
      victim = f
    }
  }
  return victim
}

function findVictimLRU(frames: number[]): number {
  // LRU: find the frame used least recently
  let lastUsed = new Map<number, number>()
  for (let i = 0; i < history.value.length; i++) {
    const h = history.value[i]
    if (frames.includes(h.page)) {
      lastUsed.set(h.page, i)
    }
  }
  let oldest = Infinity
  let victim = 0
  for (const f of frames) {
    const last = lastUsed.get(f) ?? -1
    if (last < oldest) {
      oldest = last
      victim = f
    }
  }
  return victim
}

function findVictimOPT(frames: number[]): number {
  // OPT: replace the page used farthest in the future
  const future = pages.slice(step.value + 1)
  let farthest = -1
  let victim = frames[0]
  for (const f of frames) {
    const nextUse = future.indexOf(f)
    if (nextUse === -1) return f // never used again
    if (nextUse > farthest) {
      farthest = nextUse
      victim = f
    }
  }
  return victim
}

function next() {
  if (step.value >= pages.length) {
    reset()
    return
  }
  const page = pages[step.value]
  const hit = currentFrames.value.includes(page)
  let replaced: number | null = null

  if (hit) {
    // Update LRU position
    const newFrames = currentFrames.value.filter(f => f !== page)
    newFrames.push(page)
    currentFrames.value = newFrames
  } else if (currentFrames.value.length < frameCount.value) {
    currentFrames.value.push(page)
  } else {
    let victim: number
    if (algo.value === 'FIFO') victim = findVictimFIFO(currentFrames.value)
    else if (algo.value === 'LRU') victim = findVictimLRU(currentFrames.value)
    else victim = findVictimOPT(currentFrames.value)

    replaced = victim
    const idx = currentFrames.value.indexOf(victim)
    currentFrames.value[idx] = page
  }

  const label = hit ? '命中' : (replaced !== null ? `替换块${replaced}` : '装入')
  history.value.push({
    page,
    frames: [...currentFrames.value],
    hit,
    replaced,
    label,
  })
  step.value++
}

function reset() {
  step.value = 0
  currentFrames.value = []
  history.value = []
}

function switchAlgo(a: Algo) {
  algo.value = a
  reset()
}

const faultCount = computed(() => history.value.filter(h => !h.hit).length)
const hitCount = computed(() => history.value.filter(h => h.hit).length)
const faultRate = computed(() => {
  const total = history.value.length
  return total > 0 ? ((faultCount.value / total) * 100).toFixed(1) : '0.0'
})

const algoLabels: Record<Algo, string> = {
  FIFO: '先进先出',
  LRU: '最近最久未使用',
  OPT: '最优置换',
}
</script>

<template>
  <div class="pr-demo">
    <div class="controls">
      <div class="algo-tabs">
        <button
          v-for="a in (['FIFO', 'LRU', 'OPT'] as Algo[])"
          :key="a"
          :class="{ active: algo === a }"
          @click="switchAlgo(a)"
        >{{ a }} <small>{{ algoLabels[a] }}</small></button>
      </div>
      <div class="frame-select">
        <label>物理块数:</label>
        <select v-model.number="frameCount" @change="reset">
          <option :value="2">2</option>
          <option :value="3">3</option>
          <option :value="4">4</option>
        </select>
      </div>
    </div>

    <!-- Page reference string -->
    <div class="page-string">
      <span class="ps-label">页面访问序列:</span>
      <span
        v-for="(p, i) in pages"
        :key="i"
        class="ps-item"
        :class="{ done: i < step, current: i === step - 1, pending: i >= step }"
      >{{ p }}</span>
    </div>

    <!-- History table -->
    <div v-if="history.length > 0" class="history-table">
      <table>
        <thead>
          <tr>
            <th>步骤</th>
            <th>访问页</th>
            <th v-for="f in frameCount" :key="f">块 {{ f - 1 }}</th>
            <th>结果</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(h, i) in history"
            :key="i"
            :class="{ 'row-hit': h.hit, 'row-miss': !h.hit, 'row-last': i === history.length - 1 }"
          >
            <td>{{ i + 1 }}</td>
            <td class="page-cell">{{ h.page }}</td>
            <td
              v-for="f in frameCount"
              :key="f"
              class="frame-cell"
              :class="{ 'just-placed': h.frames[f - 1] === h.page && !h.hit }"
            >{{ h.frames[f - 1] !== undefined ? h.frames[f - 1] : '—' }}</td>
            <td>
              <span :class="h.hit ? 'tag-hit' : 'tag-miss'">
                {{ h.hit ? '命中' : '缺页' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="history.length === 0" class="empty-state">
      点击"下一步"开始模拟页面置换过程
    </div>

    <!-- Stats -->
    <div v-if="history.length > 0" class="stats">
      <span>缺页: {{ faultCount }}</span>
      <span>命中: {{ hitCount }}</span>
      <span>缺页率: {{ faultRate }}%</span>
    </div>

    <div class="actions">
      <button @click="next">{{ step >= pages.length ? '重置' : '下一步' }}</button>
      <button @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pr-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.algo-tabs {
  display: flex;
  gap: 6px;
}

.algo-tabs button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}

.algo-tabs button small {
  font-size: 10px;
  color: var(--vp-c-text-2);
  margin-left: 4px;
}

.algo-tabs button.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-weight: 600;
}

.frame-select {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.frame-select select {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.page-string {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
}

.ps-label {
  color: var(--vp-c-text-2);
  margin-right: 4px;
}

.ps-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.ps-item.done {
  opacity: 0.5;
}

.ps-item.current {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  opacity: 1;
}

.ps-item.pending {
  opacity: 0.25;
}

.history-table {
  overflow-x: auto;
  margin-bottom: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th {
  padding: 6px 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

td {
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  text-align: center;
}

.row-hit {
  background: rgba(34, 197, 94, 0.05);
}

.row-miss {
  background: rgba(239, 68, 68, 0.05);
}

.row-last {
  border-bottom: 2px solid #f59e0b;
}

.page-cell {
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.frame-cell.just-placed {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  font-weight: 700;
}

.tag-hit {
  color: #22c55e;
  font-weight: 700;
  font-size: 12px;
}

.tag-miss {
  color: #ef4444;
  font-weight: 700;
  font-size: 12px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  margin-bottom: 8px;
}

.stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  margin-bottom: 8px;
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
</style>
