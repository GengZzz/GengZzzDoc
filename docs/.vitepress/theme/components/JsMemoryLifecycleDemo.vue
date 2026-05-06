<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const reachable = computed(() => step.value < 4)
const hasTimer = computed(() => step.value >= 2 && step.value < 4)

const description = computed(() => {
  const text = [
    '创建对象后，变量 user 指向堆中的对象。',
    'DOM 监听器闭包也引用了 user，对象仍然可达。',
    '定时器继续引用回调，回调又引用 user。',
    '即使页面节点移除，只要监听器或定时器还在，user 仍然不能回收。',
    '清理监听器和定时器后，对象不可达，等待 GC 回收。'
  ]
  return text[step.value]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="memory-demo">
    <div class="memory-grid">
      <section>
        <h4>引用来源</h4>
        <div class="ref" :class="{ active: step >= 0 && step < 4 }">变量 user</div>
        <div class="ref" :class="{ active: step >= 1 && step < 4 }">事件监听器</div>
        <div class="ref" :class="{ active: hasTimer }">定时器回调</div>
      </section>

      <section class="heap">
        <h4>堆对象</h4>
        <div class="object" :class="{ collectable: !reachable }">
          {{ reachable ? '{ name: "Alice" }' : '不可达对象' }}
        </div>
      </section>

      <section>
        <h4>GC 判断</h4>
        <div class="gc" :class="{ ready: !reachable }">
          {{ reachable ? '仍然可达，不回收' : '不可达，可回收' }}
        </div>
      </section>
    </div>
    <div class="status">{{ description }}</div>
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

.memory-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

section {
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.ref,
.object,
.gc {
  min-height: 40px;
  display: grid;
  place-items: center;
  margin-top: 8px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-2);
  text-align: center;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}

.ref.active {
  border-style: solid;
  border-color: #38bdf8;
  color: #0284c7;
  animation: ref-pulse 1.4s ease-in-out infinite;
}

.object {
  min-height: 116px;
  border-style: solid;
  border-color: #f59e0b;
  color: #d97706;
}

.object.collectable {
  border-color: #10b981;
  color: #059669;
  opacity: .55;
}

.gc.ready {
  border-style: solid;
  border-color: #10b981;
  color: #059669;
}

.status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
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

@keyframes ref-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, .2); }
  50% { box-shadow: 0 0 0 4px rgba(56, 189, 248, .18); }
}

@media (max-width: 720px) {
  .memory-grid { grid-template-columns: 1fr; }
}
</style>
