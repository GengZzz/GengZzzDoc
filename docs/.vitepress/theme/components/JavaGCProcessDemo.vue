<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

interface Obj {
  id: string
  label: string
  refs: string[]
}

const objects: Obj[] = [
  { id: 'obj1', label: 'Obj1', refs: ['obj2', 'obj3'] },
  { id: 'obj2', label: 'Obj2', refs: ['obj4'] },
  { id: 'obj3', label: 'Obj3', refs: [] },
  { id: 'obj4', label: 'Obj4', refs: [] },
  { id: 'obj5', label: 'Obj5', refs: ['obj6'] },
  { id: 'obj6', label: 'Obj6', refs: [] },
  { id: 'obj7', label: 'Obj7', refs: ['obj8'] },
  { id: 'obj8', label: 'Obj8', refs: [] },
]

// GC Roots reference obj1 and obj5
const gcRoots = ['obj1', 'obj5']
// Reachable from roots: obj1 -> obj2,obj3,obj4; obj5 -> obj6 => obj7,obj8 unreachable
const reachable = new Set(['obj1', 'obj2', 'obj3', 'obj4', 'obj5', 'obj6'])
const unreachable = new Set(['obj7', 'obj8'])

type Status = 'default' | 'root' | 'reachable' | 'unreachable'

function getStatus(objId: string): Status {
  if (step.value <= 1) return 'default'
  if (step.value === 2) {
    if (gcRoots.includes(objId)) return 'root'
    return 'default'
  }
  if (step.value === 3) {
    if (gcRoots.includes(objId)) return 'root'
    if (reachable.has(objId)) return 'reachable'
    return 'default'
  }
  if (step.value >= 4) {
    if (gcRoots.includes(objId)) return 'root'
    if (reachable.has(objId)) return 'reachable'
    if (unreachable.has(objId)) return 'unreachable'
  }
  return 'default'
}

const visibleObjects = computed(() => {
  if (step.value === 0) return []
  // In compacted state (step 5), only show reachable objects
  if (step.value === 5) return objects.filter(o => reachable.has(o.id))
  return objects
})

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 GC 过程',
    '初始状态：对象在堆中分配',
    '标记阶段开始：从 GC Roots 出发',
    '遍历可达对象，标记为存活',
    '清除阶段：回收不可达对象的内存',
    '压缩阶段：整理内存碎片 (部分 GC 算法)',
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
    <div v-if="step >= 1" class="gc-roots">
      <h4>GC Roots</h4>
      <div class="roots-row">
        <span class="root-item">局部变量</span>
        <span class="root-item">静态字段</span>
      </div>
    </div>
    <div class="heap-area">
      <h4>堆 Heap</h4>
      <div v-if="visibleObjects.length === 0" class="empty">等待对象分配...</div>
      <div class="obj-grid" :class="{ compacted: step === 5 }">
        <div
          v-for="obj in visibleObjects"
          :key="obj.id"
          class="obj-box"
          :class="getStatus(obj.id)"
        >
          {{ obj.label }}
          <div v-if="step >= 3" class="ref-info">
            <template v-for="ref in obj.refs" :key="ref">
              <span v-if="visibleObjects.some(o => o.id === ref)" class="ref-tag">→ {{ ref }}</span>
            </template>
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
.gc-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.gc-roots {
  margin-bottom: 12px;
}

h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.roots-row {
  display: flex;
  gap: 8px;
}

.root-item {
  padding: 6px 12px;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: #8b5cf6;
  font-size: 13px;
  font-weight: 600;
}

.heap-area {
  margin-bottom: 12px;
}

.obj-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.obj-grid.compacted {
  grid-template-columns: repeat(3, 1fr);
}

.obj-box {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.3s ease, background 0.3s ease, opacity 0.3s ease;
}

.obj-box.default {
  border-color: var(--vp-c-border);
}

.obj-box.root {
  border-color: #8b5cf6;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}

.obj-box.reachable {
  border-color: #22c55e;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.obj-box.unreachable {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  text-decoration: line-through;
  opacity: 0.6;
}

.ref-info {
  margin-top: 4px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.ref-tag {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.8;
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

@media (max-width: 560px) {
  .obj-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .obj-grid.compacted {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
