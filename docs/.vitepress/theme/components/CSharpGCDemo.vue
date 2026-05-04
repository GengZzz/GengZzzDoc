<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

interface GcObject {
  id: string
  label: string
  size: number
  alive: boolean
}

interface Generation {
  name: string
  color: string
  objects: GcObject[]
}

const gen0Color = '#22c55e'  // 绿色
const gen1Color = '#f59e0b'  // 黄色
const gen2Color = '#ef4444'  // 红色
const lohColor = '#8b5cf6'   // 紫色

const generations = computed<Generation[]>(() => {
  if (step.value === 0) return []

  if (step.value === 1) {
    // 程序启动，对象在 Gen0 分配
    return [
      { name: 'Gen0（256KB-4MB）', color: gen0Color, objects: [
        { id: 'a', label: '临时变量', size: 16, alive: true },
        { id: 'b', label: '查询结果', size: 32, alive: true },
        { id: 'c', label: '中间对象', size: 24, alive: true },
        { id: 'd', label: '字符串', size: 48, alive: true },
        { id: 'e', label: '委托实例', size: 32, alive: true },
        { id: 'f', label: '闭包对象', size: 40, alive: true },
      ]},
      { name: 'Gen1', color: gen1Color, objects: [] },
      { id: 'g', name: 'Gen2', color: gen2Color, objects: [] } as any,
      { name: 'LOH（>85KB）', color: lohColor, objects: [] },
    ]
  }

  if (step.value === 2) {
    // Gen0 填满，大量对象创建
    return [
      { name: 'Gen0（接近阈值）', color: gen0Color, objects: [
        { id: 'a', label: '临时变量', size: 16, alive: false },
        { id: 'b', label: '查询结果', size: 32, alive: true },
        { id: 'c', label: '中间对象', size: 24, alive: false },
        { id: 'd', label: '字符串', size: 48, alive: true },
        { id: 'e', label: '委托实例', size: 32, alive: false },
        { id: 'f', label: '闭包对象', size: 40, alive: true },
        { id: 'g', label: '临时列表', size: 64, alive: false },
        { id: 'h', label: '迭代器', size: 32, alive: false },
      ]},
      { name: 'Gen1', color: gen1Color, objects: [] },
      { name: 'Gen2', color: gen2Color, objects: [] },
      { name: 'LOH（>85KB）', color: lohColor, objects: [] },
    ]
  }

  if (step.value === 3) {
    // Gen0 GC 触发，存活对象提升到 Gen1
    return [
      { name: 'Gen0（已回收）', color: gen0Color, objects: [
        { id: 'x1', label: '新对象1', size: 16, alive: true },
        { id: 'x2', label: '新对象2', size: 24, alive: true },
      ]},
      { name: 'Gen1', color: gen1Color, objects: [
        { id: 'b', label: '查询结果', size: 32, alive: true },
        { id: 'd', label: '字符串', size: 48, alive: true },
        { id: 'f', label: '闭包对象', size: 40, alive: true },
      ]},
      { name: 'Gen2', color: gen2Color, objects: [] },
      { name: 'LOH（>85KB）', color: lohColor, objects: [] },
    ]
  }

  if (step.value === 4) {
    // Gen1 积累后触发 GC，存活对象提升到 Gen2
    return [
      { name: 'Gen0', color: gen0Color, objects: [
        { id: 'y1', label: '新分配', size: 20, alive: true },
      ]},
      { name: 'Gen1（部分回收）', color: gen1Color, objects: [
        { id: 'f', label: '闭包对象', size: 40, alive: false },
      ]},
      { name: 'Gen2', color: gen2Color, objects: [
        { id: 'b', label: '查询结果', size: 32, alive: true },
        { id: 'd', label: '字符串', size: 48, alive: true },
      ]},
      { name: 'LOH（>85KB）', color: lohColor, objects: [] },
    ]
  }

  if (step.value === 5) {
    // Background GC 展示
    return [
      { name: 'Gen0（可继续分配）', color: gen0Color, objects: [
        { id: 'y1', label: '新分配', size: 20, alive: true },
        { id: 'y2', label: '并发中创建', size: 32, alive: true },
      ]},
      { name: 'Gen1', color: gen1Color, objects: [] },
      { name: 'Gen2（后台回收中...）', color: gen2Color, objects: [
        { id: 'b', label: '查询结果', size: 32, alive: true },
        { id: 'd', label: '字符串', size: 48, alive: true },
      ]},
      { name: 'LOH（>85KB）', color: lohColor, objects: [] },
    ]
  }

  if (step.value === 6) {
    // LOH 碎片化 + Pinned 对象
    return [
      { name: 'Gen0', color: gen0Color, objects: [] },
      { name: 'Gen1', color: gen1Color, objects: [] },
      { name: 'Gen2', color: gen2Color, objects: [
        { id: 'b', label: '长期对象', size: 32, alive: true },
      ]},
      { name: 'LOH（碎片化）', color: lohColor, objects: [
        { id: 'loh1', label: '128KB 数组', size: 128, alive: true },
        { id: 'pin', label: 'Pinned', size: 64, alive: true },
        { id: 'loh2', label: '200KB 数组', size: 200, alive: false },
        { id: 'loh3', label: '256KB 缓冲', size: 256, alive: true },
      ]},
    ]
  }

  return []
})

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 .NET GC 三代回收完整生命周期',
    '步骤 1：程序启动，所有新对象分配到 Gen0（大多数对象生命周期极短，很快死亡）',
    '步骤 2：Gen0 填满 → 灰色对象已无引用，等待回收（Gen0 阈值约 256KB-4MB，动态调整）',
    '步骤 3：Gen0 GC 触发 → 死亡对象被回收，存活对象提升到 Gen1（耗时约 0.1-1ms）',
    '步骤 4：Gen1 积累后触发 GC → 存活对象提升到 Gen2（Gen1 是 Gen0/Gen2 的缓冲区）',
    '步骤 5：Background GC 在后台回收 Gen2，不阻塞主线程，Gen0 仍可继续分配对象',
    '步骤 6：大对象（>85KB）直接进 LOH，LOH 随 Gen2 回收且默认不压缩 → Pinned 对象导致碎片',
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
            :class="{ dead: !obj.alive, pinned: obj.id === 'pin' }"
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

.gen-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

h4 {
  margin: 0 0 8px;
  font-size: 13px;
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
  opacity: 0.3;
  text-decoration: line-through;
}

.obj-box.pinned {
  border-style: dashed;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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
