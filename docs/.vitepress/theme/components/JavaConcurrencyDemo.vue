<script setup lang="ts">
import { computed, ref } from 'vue'

interface ThreadState {
  id: string
  label: string
  description: string
  transitions: { target: string; label: string }[]
  x: number
  y: number
}

const states: ThreadState[] = [
  {
    id: 'New',
    label: 'New',
    description: '线程已创建但尚未调用 start()',
    transitions: [{ target: 'Runnable', label: 'start()' }],
    x: 50, y: 40,
  },
  {
    id: 'Runnable',
    label: 'Runnable',
    description: '就绪状态，等待 CPU 调度',
    transitions: [
      { target: 'Running', label: '被调度' },
      { target: 'Terminated', label: 'stop' },
    ],
    x: 220, y: 40,
  },
  {
    id: 'Running',
    label: 'Running',
    description: '正在执行 run() 方法体',
    transitions: [
      { target: 'Runnable', label: '时间片用完' },
      { target: 'Blocked', label: '等待锁' },
      { target: 'Waiting', label: 'wait/join' },
      { target: 'Timed_Waiting', label: 'sleep' },
      { target: 'Terminated', label: '执行完毕' },
    ],
    x: 390, y: 40,
  },
  {
    id: 'Blocked',
    label: 'Blocked',
    description: '等待获取监视器锁 (synchronized)',
    transitions: [{ target: 'Runnable', label: '获得锁' }],
    x: 390, y: 180,
  },
  {
    id: 'Waiting',
    label: 'Waiting',
    description: '等待其他线程通知 (wait/join)',
    transitions: [{ target: 'Runnable', label: 'notify/notifyAll' }],
    x: 220, y: 180,
  },
  {
    id: 'Timed_Waiting',
    label: 'Timed_Waiting',
    description: '限时等待 (sleep/带超时的 join)',
    transitions: [{ target: 'Runnable', label: '超时/通知' }],
    x: 50, y: 180,
  },
  {
    id: 'Terminated',
    label: 'Terminated',
    description: '线程执行完毕或异常终止',
    transitions: [],
    x: 560, y: 40,
  },
]

const selected = ref<string>('Running')

const currentState = computed(() => {
  return states.find(s => s.id === selected.value) ?? states[2]
})

function select(id: string) {
  selected.value = id
}
</script>

<template>
  <div class="concurrency-demo">
    <div class="diagram">
      <div
        v-for="state in states"
        :key="state.id"
        class="state-node"
        :class="{ active: selected === state.id }"
        :style="{ left: state.x + 'px', top: state.y + 'px' }"
        @click="select(state.id)"
      >
        {{ state.label }}
      </div>
    </div>
    <div class="detail-panel">
      <div class="detail-header">
        <span class="state-badge" :class="selected.toLowerCase()">{{ selected }}</span>
      </div>
      <p class="detail-desc">{{ currentState.description }}</p>
      <div v-if="currentState.transitions.length > 0" class="transitions">
        <h4>可转换为：</h4>
        <div class="trans-list">
          <button
            v-for="t in currentState.transitions"
            :key="t.target"
            type="button"
            class="trans-btn"
            @click="select(t.target)"
          >
            <span class="trans-target">{{ t.target }}</span>
            <span class="trans-label">{{ t.label }}</span>
          </button>
        </div>
      </div>
      <div v-else class="terminated-note">终态，不可转换</div>
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

.diagram {
  position: relative;
  height: 260px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.state-node {
  position: absolute;
  padding: 10px 16px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  user-select: none;
  white-space: nowrap;
}

.state-node:hover {
  border-color: var(--vp-c-brand-1);
}

.state-node.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  color: var(--vp-c-brand-1);
}

.detail-panel {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.detail-header {
  margin-bottom: 8px;
}

.state-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.state-badge.new { color: #8b5cf6; }
.state-badge.runnable { color: #3b82f6; }
.state-badge.running { color: #22c55e; }
.state-badge.blocked { color: #f59e0b; }
.state-badge.waiting { color: #ec4899; }
.state-badge.timed_waiting { color: #06b6d4; }
.state-badge.terminated { color: #ef4444; }

.detail-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.transitions h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.trans-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trans-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 12px;
  transition: border-color 0.2s ease;
}

.trans-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.trans-target {
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.trans-label {
  color: var(--vp-c-text-2);
}

.terminated-note {
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-style: italic;
}
</style>
