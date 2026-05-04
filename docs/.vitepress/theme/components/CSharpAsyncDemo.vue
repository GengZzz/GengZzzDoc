<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 async/await 状态机执行时序',
    '步骤 1：主线程调用 await DownloadAsync()，状态机启动，开始执行异步方法',
    '步骤 2：遇到第一个 await → 挂起，控制权返回主线程（主线程继续做其他工作）',
    '步骤 3：IO 完成 → 线程池线程处理回调（IO 完成端口通知）',
    '步骤 4：SynchronizationContext 恢复上下文（UI 线程/请求上下文/ThreadPool）',
    '步骤 5：从 await 位置继续执行，拿到下载结果',
    '步骤 6：Task.WhenAll 并发时间线（3 个 API 并发 vs 串行，总耗时 = 最慢的）',
    '步骤 7：反面案例 —— 同步调用 .Result 导致死锁（主线程等 Task，Task 等主线程上下文）',
  ]
  return texts[step.value]
})

const methodState = computed(() => {
  if (step.value === 1) return 'running'
  if (step.value === 2) return 'suspended'
  if (step.value === 3 || step.value === 4) return 'resuming'
  if (step.value >= 5) return 'completed'
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
    <!-- Step 7: Deadlock scenario -->
    <div v-if="step === 7" class="deadlock-demo">
      <h4>异步死锁场景</h4>
      <div class="deadlock-scene">
        <div class="dlk-box dlk-main">
          <span class="dlk-title">主线程</span>
          <code>.Result</code>
          <span class="dlk-desc">阻塞等待 Task 完成</span>
        </div>
        <div class="dlk-arrow">⇄ 死锁</div>
        <div class="dlk-box dlk-task">
          <span class="dlk-title">Task 回调</span>
          <code>SynchronizationContext.Post</code>
          <span class="dlk-desc">等待主线程空闲以恢复上下文</span>
        </div>
      </div>
      <div class="deadlock-solution">
        <code>// 解决方案：全链路 async，永不阻塞</code>
        <code>var result = await DownloadAsync();  // 不阻塞</code>
      </div>
    </div>

    <!-- Step 6: WhenAll -->
    <div v-else-if="step === 6" class="whenall-demo">
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
      <div class="whenall-note">→ 总耗时 ≈ 500ms（最慢的 API B），串行则需要 1000ms</div>
    </div>

    <!-- Normal steps -->
    <div v-else class="panels">
      <section class="panel">
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

      <section class="panel">
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

.deadlock-demo {
  margin-bottom: 12px;
}

.deadlock-scene {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.dlk-box {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
}

.dlk-main {
  border-color: #ef4444;
}

.dlk-task {
  border-color: #f59e0b;
}

.dlk-title {
  display: block;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
}

.dlk-box code {
  display: block;
  font-size: 12px;
  color: var(--vp-c-brand-1);
  margin-bottom: 4px;
}

.dlk-desc {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.dlk-arrow {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  flex-shrink: 0;
}

.deadlock-solution {
  padding: 10px;
  border: 1px dashed #22c55e;
  border-radius: 6px;
  background: rgba(34, 197, 94, 0.05);
}

.deadlock-solution code {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

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
  .deadlock-scene {
    flex-direction: column;
  }
}
</style>
