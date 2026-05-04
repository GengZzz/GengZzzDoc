<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 async/await 状态机执行过程',
    '调用方调用 await DownloadAsync()，方法开始执行，遇到第一个 await 时挂起',
    '控制权返回调用者，主线程继续执行其他工作（UI 不阻塞）',
    'IO 操作完成 → SynchronizationContext 恢复上下文，调度回调',
    '从 await 之后继续执行，拿到下载结果',
    'Task.WhenAll 并发执行多个异步操作，等待最慢的一个完成',
    '对比同步阻塞 vs 异步等待的时间线'
  ]
  return texts[step.value]
})

const showMain = computed(() => step.value >= 1)
const showMethod = computed(() => step.value >= 1)
const methodState = computed(() => {
  if (step.value === 1) return 'running'
  if (step.value === 2) return 'suspended'
  if (step.value === 3) return 'resuming'
  if (step.value >= 4) return 'completed'
  return 'idle'
})

const mainThreadItems = computed(() => {
  if (step.value <= 1) return []
  if (step.value === 2) return ['UI 响应用户点击', '更新进度条', '处理其他事件']
  if (step.value >= 3) return ['UI 响应用户点击', '更新进度条', '处理其他事件']
  return []
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="async-demo">
    <!-- Step 6: Sync vs Async timeline -->
    <div v-if="step === 6" class="timeline">
      <div class="timeline-row">
        <span class="timeline-label">同步阻塞</span>
        <div class="timeline-bar sync-bar">
          <span>下载 2s</span><span>处理 1s</span><span>写入 1s</span>
        </div>
      </div>
      <div class="timeline-row">
        <span class="timeline-label">异步 await</span>
        <div class="timeline-bar async-bar">
          <span>下载 2s</span><span class="overlap">处理+写入 并行</span>
        </div>
      </div>
      <div class="timeline-row">
        <span class="timeline-label">ConfigureAwait(false)</span>
        <div class="timeline-bar config-bar">
          <span>下载 2s（不恢复上下文，直接在线程池继续）</span>
        </div>
      </div>
    </div>

    <!-- Normal steps -->
    <div v-else class="panels">
      <section v-if="showMain" class="panel">
        <h4>主线程 / 调用者</h4>
        <div class="thread-area">
          <div class="thread-item call-site" :class="{ active: step >= 1 }">
            <code>await DownloadAsync()</code>
          </div>
          <template v-if="step >= 2">
            <div
              v-for="(item, i) in mainThreadItems"
              :key="i"
              class="thread-item"
              :class="{ active: step >= 2 }"
            >
              {{ item }}
            </div>
          </template>
        </div>
      </section>

      <section v-if="showMethod" class="panel">
        <h4>DownloadAsync() 状态机</h4>
        <div class="state-machine">
          <div class="state-item" :class="{ current: methodState === 'running' }">
            <span class="state-dot running" /> 执行：发起 HTTP 请求
          </div>
          <div class="state-arrow">→ await →</div>
          <div class="state-item" :class="{ current: methodState === 'suspended' }">
            <span class="state-dot suspended" /> 挂起：释放线程
          </div>
          <div class="state-arrow">→ IO 完成 →</div>
          <div class="state-item" :class="{ current: methodState === 'resuming' }">
            <span class="state-dot resuming" /> 恢复：上下文回调
          </div>
          <div class="state-arrow">→ 继续 →</div>
          <div class="state-item" :class="{ current: methodState === 'completed' }">
            <span class="state-dot completed" /> 完成：返回结果
          </div>
        </div>
      </section>
    </div>

    <!-- Step 5: WhenAll -->
    <div v-if="step === 5" class="whenall-demo">
      <h4>Task.WhenAll 并发</h4>
      <div class="whenall-row">
        <div class="whenall-task" style="border-color: #3b82f6">
          <span>API A</span>
          <span class="task-time">200ms</span>
        </div>
        <div class="whenall-task" style="border-color: #8b5cf6">
          <span>API B</span>
          <span class="task-time">500ms</span>
        </div>
        <div class="whenall-task" style="border-color: #22c55e">
          <span>API C</span>
          <span class="task-time">300ms</span>
        </div>
      </div>
      <div class="whenall-note">→ 等待最慢的完成，总耗时 ≈ 500ms（非 1000ms）</div>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
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

.panels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.thread-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.thread-item {
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  transition: all 0.3s ease;
}

.thread-item.active {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
}

.thread-item.call-site.active {
  background: rgba(59, 130, 246, 0.08);
}

.thread-item code {
  color: var(--vp-c-brand-1);
  font-size: 12px;
}

.state-machine {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.state-item {
  padding: 6px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.state-item.current {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
  background: rgba(59, 130, 246, 0.08);
}

.state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-border);
  flex-shrink: 0;
}

.state-dot.running { background: #3b82f6; }
.state-dot.suspended { background: #f59e0b; }
.state-dot.resuming { background: #8b5cf6; }
.state-dot.completed { background: #22c55e; }

.state-arrow {
  text-align: center;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.whenall-demo {
  margin-bottom: 12px;
}

.whenall-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.whenall-task {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.task-time {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}

.whenall-note {
  font-size: 12px;
  color: var(--vp-c-text-2);
  text-align: center;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-label {
  width: 120px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.timeline-bar {
  flex: 1;
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  font-size: 11px;
}

.timeline-bar span {
  padding: 6px 8px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
}

.sync-bar span { background: rgba(239, 68, 68, 0.08); border-color: #ef4444; color: #ef4444; }
.async-bar span { background: rgba(34, 197, 94, 0.08); border-color: #22c55e; color: #22c55e; }
.async-bar .overlap { background: rgba(139, 92, 246, 0.08); border-color: #8b5cf6; color: #8b5cf6; }
.config-bar span { background: rgba(59, 130, 246, 0.08); border-color: #3b82f6; color: #3b82f6; width: 100%; }

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
  .panels {
    grid-template-columns: 1fr;
  }
  .whenall-row {
    flex-direction: column;
  }
  .timeline-label {
    width: 80px;
  }
}
</style>
