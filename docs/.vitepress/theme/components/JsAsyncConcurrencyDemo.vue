<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6
const tasks = ['A', 'B', 'C', 'D', 'E']

const running = computed(() => {
  if (step.value === 0) return []
  if (step.value === 1) return ['A', 'B']
  if (step.value === 2) return ['B', 'C']
  if (step.value === 3) return ['C', 'D']
  if (step.value === 4) return ['D', 'E']
  return []
})

const done = computed(() => {
  if (step.value <= 1) return []
  if (step.value === 2) return ['A']
  if (step.value === 3) return ['A', 'B']
  if (step.value === 4) return ['A', 'B', 'C']
  return ['A', 'B', 'C', 'D', 'E']
})

const waiting = computed(() => tasks.filter(task => !running.value.includes(task) && !done.value.includes(task)))

const description = computed(() => {
  const text = [
    '任务还在等待队列中，并发池最多同时运行 2 个任务。',
    'Runner 1 和 Runner 2 分别领取 A、B。',
    'A 完成后释放一个位置，Runner 1 继续领取 C。',
    'B 完成后释放一个位置，Runner 2 继续领取 D。',
    'C 完成后继续领取 E，始终保持最多 2 个任务运行。',
    '全部任务完成，结果按原任务顺序汇总。'
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
  <div class="concurrency-demo">
    <div class="lanes">
      <section>
        <h4>等待队列</h4>
        <div class="task-row">
          <span v-for="task in waiting" :key="task" class="task wait">{{ task }}</span>
          <span v-if="waiting.length === 0" class="empty">空</span>
        </div>
      </section>
      <section>
        <h4>运行中 limit = 2</h4>
        <div class="task-row running-zone">
          <span v-for="task in running" :key="task" class="task run">{{ task }}</span>
          <span v-if="running.length === 0" class="empty">空</span>
        </div>
      </section>
      <section>
        <h4>已完成</h4>
        <div class="task-row">
          <span v-for="task in done" :key="task" class="task done">{{ task }}</span>
          <span v-if="done.length === 0" class="empty">空</span>
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
.concurrency-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.lanes {
  display: grid;
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

.task-row {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.running-zone {
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  padding: 8px;
}

.task {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
}

.wait { background: rgba(148, 163, 184, .18); color: var(--vp-c-text-2); }
.run {
  background: rgba(245, 158, 11, .18);
  color: #d97706;
  animation: working 1s ease-in-out infinite;
}
.done { background: rgba(16, 185, 129, .18); color: #059669; }

.empty {
  color: var(--vp-c-text-2);
  font-size: 13px;
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

@keyframes working {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
