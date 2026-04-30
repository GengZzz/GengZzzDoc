<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const selected = ref<'stack' | 'heap'>('stack')

const stackFrames = computed(() => {
  if (step.value === 0) return []
  if (step.value === 1) return ['main() ✓']
  if (step.value === 2) return ['main()', 'createUser()']
  if (step.value === 3) return ['main()', 'createUser()', 'age = 18']
  return []
})

const heapBlocks = computed(() => {
  if (step.value < 3) return []
  if (step.value === 3) return [{ addr: '0x100', data: 'User{name:"Ada",age:18}' }]
  return [{ addr: '0x100', data: '已释放(悬空风险!)' }]
})

function next() {
  step.value = (step.value + 1) % 5
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
        <h4>堆 Heap <span class="badge">需手动释放</span></h4>
        <div v-if="heapBlocks.length === 0" class="empty">暂无动态资源</div>
        <div class="block heap" v-for="block in heapBlocks" :key="block.addr">
          <small>{{ block.addr }}</small>
          <strong>{{ block.data }}</strong>
        </div>
      </section>
    </div>
    <div class="status-bar">
      <span v-if="step === 0">点击"下一步"开始观察函数调用</span>
      <span v-else-if="step === 1">程序从 main() 开始执行</span>
      <span v-else-if="step === 2">调用 createUser() 函数，压入新栈帧</span>
      <span v-else-if="step === 3">局部变量在栈上，new在堆上申请资源</span>
      <span v-else>函数返回栈帧弹出，堆资源需手动 delete!</span>
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
}

.block.stack {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.block.heap {
  border-color: #f59e0b;
  color: #f59e0b;
}

.block small {
  font-size: 11px;
  opacity: 0.7;
}

.block strong {
  font-size: 12px;
  margin-top: 4px;
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
