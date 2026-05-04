<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

interface Task {
  name: string
  label: string
  duration: string
  status: 'pending' | 'running' | 'waiting' | 'done'
  color: string
}

const steps: { title: string; desc: string; tasks: Task[]; elapsed: string; note?: string }[] = [
  {
    title: '事件循环启动',
    desc: 'asyncio.run(main()) 创建事件循环，task_a 开始执行。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'running', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'pending', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'pending', color: '#22c55e' }
    ],
    elapsed: '0s'
  },
  {
    title: 'task_a 遇到 await',
    desc: 'task_a 的网络请求发出，遇到 await 挂起。事件循环调度 task_b。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'waiting', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'running', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'pending', color: '#22c55e' }
    ],
    elapsed: '~0s'
  },
  {
    title: 'task_b 遇到 await',
    desc: 'task_b 的数据库查询发出，遇到 await 挂起。事件循环调度 task_c。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'waiting', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'waiting', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'running', color: '#22c55e' }
    ],
    elapsed: '~0s'
  },
  {
    title: 'task_c 完成',
    desc: 'task_c 计算完成（0.5s），结果就绪。检查其他任务：task_b 的 DB 响应也到了。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'waiting', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'running', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'done', color: '#22c55e' }
    ],
    elapsed: '0.5s'
  },
  {
    title: 'task_b 完成',
    desc: 'task_b 处理完数据库结果（1s）。等待 task_a 的网络响应。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'running', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'done', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'done', color: '#22c55e' }
    ],
    elapsed: '1s'
  },
  {
    title: 'task_a 完成',
    desc: 'task_a 的网页下载完成（2s）。所有任务结束，总耗时 2s。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'done', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'done', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'done', color: '#22c55e' }
    ],
    elapsed: '2s'
  },
  {
    title: '并发 vs 顺序',
    desc: '并发执行总耗时 = max(2, 1, 0.5) = 2s。顺序执行总耗时 = 2 + 1 + 0.5 = 3.5s。',
    tasks: [
      { name: 'task_a', label: '下载网页 (2s)', duration: '2s', status: 'done', color: '#8b5cf6' },
      { name: 'task_b', label: '查询数据库 (1s)', duration: '1s', status: 'done', color: '#f59e0b' },
      { name: 'task_c', label: '计算 (0.5s)', duration: '0.5s', status: 'done', color: '#22c55e' }
    ],
    elapsed: '2s (并发) vs 3.5s (顺序)',
    note: 'GIL 不影响异步 IO 密集型任务，因为 await 时释放 GIL。CPU 密集型需用 ProcessPoolExecutor。'
  }
]

const currentStep = computed(() => steps[step.value])

function next() {
  if (step.value < totalSteps - 1) step.value++
}

function reset() {
  step.value = 0
}

function statusLabel(s: string) {
  switch (s) {
    case 'running': return '运行中'
    case 'waiting': return '等待 IO'
    case 'done': return '完成'
    default: return '待执行'
  }
}
</script>

<template>
  <div class="async-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: step === i - 1, done: step > i - 1 }"
      />
    </div>

    <div class="step-title">步骤 {{ step + 1 }}：{{ currentStep.title }}</div>
    <div class="desc">{{ currentStep.desc }}</div>

    <div class="task-list">
      <div
        v-for="task in currentStep.tasks"
        :key="task.name"
        class="task-row"
        :class="task.status"
      >
        <div class="task-bar" :style="{ background: task.color, opacity: task.status === 'pending' ? 0.2 : task.status === 'waiting' ? 0.4 : task.status === 'done' ? 0.7 : 1 }">
          <span class="task-label">{{ task.label }}</span>
        </div>
        <span class="task-status" :class="task.status">
          {{ statusLabel(task.status) }}
        </span>
      </div>
    </div>

    <div class="elapsed-bar">
      <span class="elapsed-label">总耗时</span>
      <span class="elapsed-value">{{ currentStep.elapsed }}</span>
    </div>

    <div class="note" v-if="currentStep.note">
      {{ currentStep.note }}
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.async-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-border);
  transition: background 0.3s;
}

.dot.active { background: var(--vp-c-brand-1); transform: scale(1.2); }
.dot.done { background: #22c55e; }

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 6px;
}

.desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
  line-height: 1.6;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-bar {
  flex: 1;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  transition: opacity 0.3s;
  border: 1px solid transparent;
}

.task-bar .task-label {
  color: white;
  font-size: 13px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.task-status {
  font-size: 12px;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.task-status.pending { color: var(--vp-c-text-2); }
.task-status.running { color: var(--vp-c-brand-1); animation: pulse 1s infinite; }
.task-status.waiting { color: #f59e0b; }
.task-status.done { color: #22c55e; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.elapsed-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  margin-bottom: 10px;
}

.elapsed-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.elapsed-value {
  font-size: 14px;
  color: var(--vp-c-brand-1);
  font-weight: 700;
  font-family: monospace;
}

.note {
  padding: 10px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.2s;
}

button:hover:not(:disabled) { border-color: var(--vp-c-brand-1); }
button:disabled { opacity: 0.5; cursor: default; }
</style>
