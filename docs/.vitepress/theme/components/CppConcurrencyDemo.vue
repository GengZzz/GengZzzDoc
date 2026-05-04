<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

function next() {
  step.value = Math.min(step.value + 1, totalSteps)
}

function reset() {
  step.value = 0
}

const status = computed(() => {
  const msgs = [
    '点击"下一步"观察多线程同步问题',
    '数据竞争：两个线程同时 counter++，结果可能不正确',
    '加 mutex 保护临界区：正确结果，但有锁开销',
    '使用 atomic<int>：无锁原子操作，既正确又高效',
    '死锁场景与解决方案'
  ]
  return msgs[step.value]
})

const code = computed(() => {
  const lines = [
    '',
    'counter++;  // 非原子操作：读-改-写三步可能交叉执行',
    'lock_guard<mutex> lock(m); counter++;  // 串行化访问',
    'atomic<int> counter{0}; counter.fetch_add(1);  // 原子操作',
    'lock_guard<mutex> l1(m1, adopt_lock); lock_guard<mutex> l2(m2, adopt_lock);'
  ]
  return step.value > 0 ? lines[step.value] : ''
})

interface ThreadState {
  id: string
  action: string
  result: string | null
}

const threads = computed<ThreadState[]>(() => {
  if (step.value === 0) return []
  if (step.value === 1) return [
    { id: 'T1', action: 'counter++ (读=0, 改=1, 写=1)', result: null },
    { id: 'T2', action: 'counter++ (读=0, 改=1, 写=1)', result: null }
  ]
  if (step.value === 2) return [
    { id: 'T1', action: 'lock(m); counter++', result: '1' },
    { id: 'T2', action: '等待锁... lock(m); counter++', result: '2' }
  ]
  if (step.value === 3) return [
    { id: 'T1', action: 'fetch_add(1) 原子操作', result: '1' },
    { id: 'T2', action: 'fetch_add(1) 原子操作', result: '2' }
  ]
  if (step.value === 4) return [
    { id: 'T1', action: '持有 m1，等待 m2...', result: '阻塞' },
    { id: 'T2', action: '持有 m2，等待 m1...', result: '阻塞' }
  ]
  return []
})

const deadlockFixed = computed(() => {
  return step.value === 4
})
</script>

<template>
  <div class="concurrency-demo">
    <div class="code-line" v-if="code">
      <code>{{ code }}</code>
    </div>

    <div class="threads">
      <div v-if="threads.length === 0" class="empty">尚未启动任何线程</div>
      <div
        v-for="t in threads"
        :key="t.id"
        class="thread-card"
        :class="{ deadlock: step === 4 }"
      >
        <div class="thread-id">{{ t.id }}</div>
        <div class="thread-action">{{ t.action }}</div>
        <div v-if="t.result" class="thread-result">
          counter = {{ t.result }}
        </div>
      </div>
    </div>

    <div v-if="step === 1" class="warning-box">
      <strong>数据竞争!</strong> T1 和 T2 同时读到 counter=0，各自写入 1，最终结果是 1 而非 2。
    </div>

    <div v-if="step === 2" class="info-box">
      mutex 保证同一时间只有一个线程进入临界区。但锁有开销：等待、上下文切换。
    </div>

    <div v-if="step === 3" class="success-box">
      atomic 操作由 CPU 指令保证原子性，不需要锁，开销更低。
    </div>

    <div v-if="deadlockFixed" class="deadlock-section">
      <h4>死锁解决方案</h4>
      <div class="solution">
        <div class="solution-item">
          <strong>方法 1</strong>：统一锁顺序
          <code>lock(m1); lock(m2);</code>
        </div>
        <div class="solution-item">
          <strong>方法 2</strong>：std::lock + lock_guard
          <code>lock(m1, m2); lock_guard(m1, adopt_lock); lock_guard(m2, adopt_lock);</code>
        </div>
      </div>
    </div>

    <div class="status-bar">{{ status }}</div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span class="step-indicator">{{ step }} / {{ totalSteps }}</span>
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

.code-line {
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  overflow-x: auto;
}

.code-line code {
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.threads {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.thread-card {
  flex: 1;
  padding: 12px;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
}

.thread-card.deadlock {
  border-color: #ef4444;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.thread-id {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 4px;
}

.thread-action {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}

.thread-result {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
}

.empty {
  min-height: 60px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  width: 100%;
}

.warning-box {
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 13px;
}

.info-box {
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 13px;
}

.success-box {
  padding: 10px 14px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-size: 13px;
}

.deadlock-section {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  margin-bottom: 12px;
}

.deadlock-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.solution {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.solution-item {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 13px;
}

.solution-item code {
  display: block;
  margin-top: 4px;
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
  align-items: center;
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

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.step-indicator {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-left: auto;
}
</style>
