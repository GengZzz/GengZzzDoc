<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

interface GcObject {
  id: string
  label: string
  size: number // bytes
  alive: boolean
}

interface Generation {
  name: string
  color: string
  objects: GcObject[]
}

const gen0Color = '#3b82f6'
const gen1Color = '#8b5cf6'
const gen2Color = '#ef4444'
const lohColor = '#f59e0b'

function makeObjects(ids: string[], aliveSet: Set<string>): GcObject[] {
  return ids.map(id => ({
    id,
    label: id,
    size: Math.floor(Math.random() * 40) + 8,
    alive: aliveSet.has(id)
  }))
}

const alive1 = new Set(['o1', 'o3', 'o5'])
const alive2 = new Set(['o1', 'o5'])

const gen0: GcObject[] = makeObjects(['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'], new Set(['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8']))
const gen1: GcObject[] = []
const gen2: GcObject[] = []
const loh: GcObject[] = [
  { id: 'loh1', label: 'byte[128KB]', size: 128, alive: true },
  { id: 'loh2', label: 'byte[200KB]', size: 200, alive: true }
]

const generations = computed<Generation[]>(() => {
  if (step.value === 0) return []

  if (step.value === 1) {
    // 初始：Gen0 有所有对象
    return [
      { name: 'Gen0', color: gen0Color, objects: gen0.map(o => ({ ...o, alive: true })) },
      { name: 'Gen1', color: gen1Color, objects: [] },
      { name: 'Gen2', color: gen2Color, objects: [] },
      { name: 'LOH', color: lohColor, objects: [] }
    ]
  }

  if (step.value === 2) {
    // Gen0 GC：存活对象提升到 Gen1
    return [
      { name: 'Gen0', color: gen0Color, objects: gen0.map(o => ({ ...o, alive: alive1.has(o.id) })).filter(o => !alive1.has(o.id) ? true : false) },
      { name: 'Gen1', color: gen1Color, objects: gen0.filter(o => alive1.has(o.id)).map(o => ({ ...o, alive: true })) },
      { name: 'Gen2', color: gen2Color, objects: [] },
      { name: 'LOH', color: lohColor, objects: [] }
    ]
  }

  if (step.value === 3) {
    // Gen1 GC：存活对象提升到 Gen2
    return [
      { name: 'Gen0', color: gen0Color, objects: gen0.filter(o => !alive1.has(o.id)).map(o => ({ ...o, alive: false })) },
      { name: 'Gen1', color: gen1Color, objects: gen0.filter(o => alive1.has(o.id) && !alive2.has(o.id)).map(o => ({ ...o, alive: false })) },
      { name: 'Gen2', color: gen2Color, objects: gen0.filter(o => alive2.has(o.id)).map(o => ({ ...o, alive: true })) },
      { name: 'LOH', color: lohColor, objects: [] }
    ]
  }

  if (step.value === 4) {
    // Full GC（Gen2 回收）
    return [
      { name: 'Gen0', color: gen0Color, objects: [] },
      { name: 'Gen1', color: gen1Color, objects: [] },
      { name: 'Gen2', color: gen2Color, objects: gen0.filter(o => alive2.has(o.id)).map(o => ({ ...o, alive: true })) },
      { name: 'LOH', color: lohColor, objects: [] }
    ]
  }

  if (step.value === 5) {
    // 展示 LOH
    return [
      { name: 'Gen0', color: gen0Color, objects: [] },
      { name: 'Gen1', color: gen1Color, objects: [] },
      { name: 'Gen2', color: gen2Color, objects: gen0.filter(o => alive2.has(o.id)).map(o => ({ ...o, alive: true })) },
      { name: 'LOH (>85KB)', color: lohColor, objects: loh.map(o => ({ ...o, alive: true })) }
    ]
  }

  return []
})

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 .NET GC 代机制',
    '程序启动：新对象分配到 Gen0（大多数对象生命周期极短）',
    'Gen0 满了 → 触发 GC，存活对象提升到 Gen1（耗时极短）',
    'Gen1 满了 → 触发 GC，存活对象提升到 Gen2（存活越久越不容易被回收）',
    'Gen2 GC = Full GC（耗时最长，应尽量减少 Full GC 频率）',
    '大对象（>85KB）直接分配到 LOH，LOH 随 Gen2 一起回收'
  ]
  return texts[step.value]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="gc-demo">
    <div v-if="step === 5" class="using-note">
      <code>using var file = File.OpenRead("data.bin");</code> —— using 语句在作用域结束时自动调用 Dispose 释放非托管资源
    </div>
    <div class="gen-grid">
      <section v-for="gen in generations" :key="gen.name" class="gen-section">
        <h4 :style="{ borderColor: gen.color, color: gen.color }">
          {{ gen.name }}
        </h4>
        <div class="obj-row">
          <div
            v-for="obj in gen.objects"
            :key="obj.id"
            class="obj-box"
            :class="{ dead: !obj.alive }"
            :style="{ borderColor: gen.color }"
          >
            <span class="obj-label">{{ obj.label }}</span>
            <span class="obj-size">{{ obj.size }}B</span>
          </div>
          <div v-if="gen.objects.length === 0" class="empty-slot">空</div>
        </div>
      </section>
    </div>
    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.gc-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.using-note {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.using-note code {
  color: var(--vp-c-brand-1);
  font-size: 12px;
}

.gen-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

h4 {
  margin: 0 0 8px;
  font-size: 14px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--vp-c-border);
}

.obj-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 44px;
}

.obj-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  transition: all 0.3s ease;
}

.obj-box.dead {
  opacity: 0.35;
  text-decoration: line-through;
}

.obj-label {
  font-weight: 600;
}

.obj-size {
  font-size: 10px;
  color: var(--vp-c-text-2);
}

.empty-slot {
  padding: 6px 8px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 12px;
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

@media (max-width: 560px) {
  .gen-grid {
    grid-template-columns: 1fr;
  }
}
</style>
