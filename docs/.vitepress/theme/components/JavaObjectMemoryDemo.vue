<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

interface HeapBlock {
  addr: string
  data: string
  gc?: boolean
}

const stackFrames = computed(() => {
  if (step.value === 0) return []
  if (step.value === 1) return ['main()']
  if (step.value === 2) return ['main()', 'Person person']
  if (step.value === 3) return ['main()', 'Person person → 0x1000']
  if (step.value === 4) return ['main()', 'Person person → 0x1000', 'sayHello()']
  if (step.value === 5) return ['main()', 'person = null']
  return []
})

const heapBlocks = computed<HeapBlock[]>(() => {
  if (step.value < 3) return []
  if (step.value <= 4) return [{ addr: '0x1000', data: 'Person{name:"Alice",age:25}' }]
  return [{ addr: '0x1000', data: 'Person{name:"Alice",age:25}', gc: true }]
})

const statusMessages = [
  '点击"下一步"开始观察对象创建过程',
  'main() 方法启动，在栈上创建栈帧',
  '声明局部变量 person，类型为 Person',
  'new 在堆上创建对象，栈上的引用指向堆中实例',
  '调用 sayHello() 方法，新的栈帧入栈',
  '方法返回栈帧弹出，person = null 后堆对象变为不可达，等待 GC 回收',
]

function next() {
  step.value = (step.value + 1) % 6
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="memory-demo">
    <div class="panels">
      <section>
        <h4>栈 Stack <span class="badge">自动管理</span></h4>
        <div v-if="stackFrames.length === 0" class="empty">等待调用...</div>
        <div class="block stack" v-for="frame in stackFrames" :key="frame">{{ frame }}</div>
      </section>
      <section>
        <h4>堆 Heap <span class="badge gc">自动管理 (GC)</span></h4>
        <div v-if="heapBlocks.length === 0" class="empty">暂无对象实例</div>
        <div
          class="block heap"
          v-for="block in heapBlocks"
          :key="block.addr"
          :class="{ unreachable: block.gc }"
        >
          <small>{{ block.addr }}</small>
          <strong>{{ block.data }}</strong>
          <span v-if="block.gc" class="gc-label">待 GC 回收</span>
        </div>
      </section>
    </div>
    <div class="status-bar">
      {{ statusMessages[step] }}
    </div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.memory-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.panels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
}

.badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.badge.gc {
  color: #f59e0b;
}

.block {
  min-height: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  transition: opacity 0.3s ease;
}

.block.stack {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.block.heap {
  border-color: #f59e0b;
  color: #f59e0b;
}

.block.unreachable {
  opacity: 0.5;
  border-style: dashed;
}

.block small {
  font-size: 11px;
  opacity: 0.7;
}

.block strong {
  font-size: 12px;
  margin-top: 4px;
}

.gc-label {
  font-size: 11px;
  margin-top: 4px;
  color: var(--vp-c-text-2);
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
  .panels {
    grid-template-columns: 1fr;
  }
}
</style>
