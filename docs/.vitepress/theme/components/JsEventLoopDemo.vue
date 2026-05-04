<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

const callStack = computed(() => {
  if (step.value === 0) return []
  if (step.value === 1) return ['main()']
  if (step.value === 2) return ['main()', 'console.log("start")']
  if (step.value === 3) return ['main()']
  if (step.value === 4) return ['main()']
  if (step.value === 5) return ['main()', 'Promise.then()']
  if (step.value === 6) return ['main()']
  return []
})

const macroQueue = computed(() => {
  if (step.value < 3) return []
  if (step.value === 3) return ['setTimeout(cb, 0)']
  if (step.value === 4) return ['setTimeout(cb, 0)']
  if (step.value === 5) return []
  if (step.value === 6) return ['setTimeout callback']
  return []
})

const microQueue = computed(() => {
  if (step.value < 4) return []
  if (step.value === 4) return ['Promise.then()']
  if (step.value === 5) return []
  if (step.value === 6) return []
  return []
})

const output = computed(() => {
  if (step.value === 0) return []
  if (step.value === 1) return []
  if (step.value === 2) return ['> start']
  if (step.value === 3) return ['> start']
  if (step.value === 4) return ['> start']
  if (step.value === 5) return ['> start', '> promise']
  if (step.value === 6) return ['> start', '> promise', '> timeout']
  return []
})

const description = computed(() => {
  const descs = [
    '点击"下一步"观察事件循环执行过程',
    '调用栈压入 main() 函数',
    '执行 console.log("start")，输出 "start"',
    '遇到 setTimeout，回调进入宏任务队列',
    '遇到 Promise.then()，回调进入微任务队列',
    '同步代码执行完，清空微任务队列（微任务优先）',
    '微任务清空后，执行一个宏任务'
  ]
  return descs[step.value]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="event-loop-demo">
    <div class="panels">
      <section>
        <h4>调用栈 <span class="badge stack-badge">Call Stack</span></h4>
        <div v-if="callStack.length === 0" class="empty">空</div>
        <div
          v-for="(frame, i) in callStack"
          :key="i"
          class="block stack"
        >{{ frame }}</div>
      </section>
      <section>
        <h4>宏任务队列 <span class="badge macro-badge">Macro Task</span></h4>
        <div v-if="macroQueue.length === 0" class="empty">空</div>
        <div
          v-for="(task, i) in macroQueue"
          :key="i"
          class="block macro"
        >{{ task }}</div>
      </section>
      <section>
        <h4>微任务队列 <span class="badge micro-badge">Micro Task</span></h4>
        <div v-if="microQueue.length === 0" class="empty">空</div>
        <div
          v-for="(task, i) in microQueue"
          :key="i"
          class="block micro"
        >{{ task }}</div>
      </section>
      <section>
        <h4>输出 <span class="badge">Console</span></h4>
        <div v-if="output.length === 0" class="empty">无输出</div>
        <div
          v-for="(line, i) in output"
          :key="i"
          class="block output"
        >{{ line }}</div>
      </section>
    </div>
    <div class="code-ref">
      <pre><code>console.log('start');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('end');</code></pre>
    </div>
    <div class="status-bar">{{ description }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.event-loop-demo {
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
  font-size: 14px;
}

.badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.stack-badge { color: #8b5cf6; }
.macro-badge { color: #f59e0b; }
.micro-badge { color: #10b981; }

.block {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}

.block.stack { border-color: #8b5cf6; color: #8b5cf6; }
.block.macro { border-color: #f59e0b; color: #f59e0b; }
.block.micro { border-color: #10b981; color: #10b981; }
.block.output { border-color: #6b7280; color: var(--vp-c-text-1); }

.empty {
  min-height: 48px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.code-ref {
  margin-top: 12px;
}

.code-ref pre {
  margin: 0;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-x: auto;
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
  .panels { grid-template-columns: 1fr; }
}
</style>
