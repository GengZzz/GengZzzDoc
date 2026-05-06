<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const tasks = ['A', 'B', 'C', 'D', 'E']
const states = [
  { pointer: 0, runner1: '', runner2: '', done: [] as string[], desc: '等待队列中有 5 个任务，两个 runner 都空闲。' },
  { pointer: 2, runner1: 'A', runner2: 'B', done: [] as string[], desc: '两个 runner 同时领取任务 A、B，nextIndex 指向 C。' },
  { pointer: 3, runner1: 'C', runner2: 'B', done: ['A'], desc: 'A 完成后进入结果区，Runner 1 继续领取 C。' },
  { pointer: 4, runner1: 'C', runner2: 'D', done: ['A', 'B'], desc: 'B 完成，Runner 2 继续领取 D，并发数仍然不超过 2。' },
  { pointer: 5, runner1: 'E', runner2: 'D', done: ['A', 'B', 'C'], desc: 'C 完成后领取最后一个任务 E，等待队列已经耗尽。' },
  { pointer: 5, runner1: '', runner2: '', done: ['A', 'B', 'C', 'D', 'E'], desc: '所有任务完成，结果仍按原始任务顺序汇总。' }
]

const current = computed(() => states[step.value])
const waiting = computed(() => {
  const active = [current.value.runner1, current.value.runner2].filter(Boolean)
  return tasks.filter(task => !active.includes(task) && !current.value.done.includes(task))
})

function next() {
  step.value = (step.value + 1) % states.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="concurrency-demo">
    <div class="header">
      <strong>并发池 limit = 2</strong>
      <span>nextIndex = {{ current.pointer }}</span>
    </div>

    <div class="queue">
      <div v-for="task in tasks" :key="task" class="task" :class="{
        done: current.done.includes(task),
        running: task === current.runner1 || task === current.runner2,
        waiting: waiting.includes(task)
      }">
        {{ task }}
      </div>
    </div>

    <div class="runners">
      <section>
        <h4>Runner 1</h4>
        <div class="slot" :class="{ active: current.runner1 }">{{ current.runner1 || '空闲' }}</div>
      </section>
      <section>
        <h4>Runner 2</h4>
        <div class="slot" :class="{ active: current.runner2 }">{{ current.runner2 || '空闲' }}</div>
      </section>
      <section>
        <h4>结果区</h4>
        <div class="result-row">
          <span v-for="task in current.done" :key="task">{{ task }}</span>
          <em v-if="current.done.length === 0">暂无</em>
        </div>
      </section>
    </div>

    <div class="status">{{ current.desc }}</div>
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

.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.header span {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.queue {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.task {
  display: grid;
  min-height: 50px;
  place-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-weight: 700;
}

.task.running {
  border-color: #f59e0b;
  color: #d97706;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, .15);
}

.task.done {
  border-color: #10b981;
  color: #059669;
  background: rgba(16, 185, 129, .1);
}

.runners {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

.slot {
  display: grid;
  min-height: 56px;
  place-items: center;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-2);
}

.slot.active {
  border-style: solid;
  border-color: #f59e0b;
  color: #d97706;
  font-weight: 700;
}

.result-row {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-row span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 6px;
  background: rgba(16, 185, 129, .14);
  color: #059669;
  font-weight: 700;
}

.result-row em {
  color: var(--vp-c-text-2);
  font-style: normal;
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

@media (max-width: 720px) {
  .queue,
  .runners { grid-template-columns: 1fr; }
}
</style>
