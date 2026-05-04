<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 6

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察主从复制流程',
    '主库执行写操作 (INSERT/UPDATE/DELETE)',
    '写入 Binlog (二进制日志)',
    '从库 IO 线程拉取 Binlog',
    '写入 Relay Log (中继日志)',
    '从库 SQL 线程回放 Relay Log',
  ]
  return texts[step.value]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="repl-demo">
    <div class="servers">
      <!-- Master -->
      <div class="server master">
        <div class="server-label">主库 (Master)</div>
        <div class="server-box" :class="{ active: step >= 1 }">
          <div class="server-icon">🗄️</div>
          <div class="server-name">Master</div>
        </div>
        <div v-if="step >= 1" class="step-box sql-step">
          <span class="step-icon">✏️</span>
          写入 SQL
        </div>
        <div v-if="step >= 2" class="step-box binlog-step">
          <span class="step-icon">📝</span>
          Binlog
        </div>
      </div>

      <!-- Arrow / Flow -->
      <div class="flow-center">
        <div v-if="step >= 3" class="flow-arrow">
          <div class="arrow-line"></div>
          <div class="arrow-head">→</div>
          <div class="flow-label">IO Thread</div>
        </div>
        <div v-else class="flow-placeholder">—</div>
      </div>

      <!-- Slave -->
      <div class="server slave">
        <div class="server-label">从库 (Slave)</div>
        <div class="server-box" :class="{ active: step >= 3 }">
          <div class="server-icon">🗄️</div>
          <div class="server-name">Slave</div>
        </div>
        <div v-if="step >= 4" class="step-box relay-step">
          <span class="step-icon">📋</span>
          Relay Log
        </div>
        <div v-if="step >= 5" class="step-box sql-thread-step">
          <span class="step-icon">⚡</span>
          SQL Thread
        </div>
      </div>
    </div>

    <!-- Pipeline summary -->
    <div v-if="step >= 2" class="pipeline">
      <div class="pipeline-stage" :class="{ done: step >= 1 }">
        <span class="stage-num">1</span>
        <span>写 SQL</span>
      </div>
      <span class="pipe-arrow">→</span>
      <div class="pipeline-stage" :class="{ done: step >= 2 }">
        <span class="stage-num">2</span>
        <span>Binlog</span>
      </div>
      <span class="pipe-arrow">→</span>
      <div class="pipeline-stage" :class="{ done: step >= 3 }">
        <span class="stage-num">3</span>
        <span>IO Thread</span>
      </div>
      <span class="pipe-arrow">→</span>
      <div class="pipeline-stage" :class="{ done: step >= 4 }">
        <span class="stage-num">4</span>
        <span>Relay Log</span>
      </div>
      <span class="pipe-arrow">→</span>
      <div class="pipeline-stage" :class="{ done: step >= 5 }">
        <span class="stage-num">5</span>
        <span>SQL Thread</span>
      </div>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.repl-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.servers {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: start;
}

.server {
  text-align: center;
}

.server-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}

.server-box {
  padding: 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  transition: border-color 0.3s, background 0.3s;
}

.server-box.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

.server-icon {
  font-size: 24px;
}

.server-name {
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
}

.step-box {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-icon {
  margin-right: 4px;
}

.sql-step {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.binlog-step {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.relay-step {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.sql-thread-step {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.flow-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

.flow-placeholder {
  color: var(--vp-c-text-2);
  font-size: 20px;
}

.flow-arrow {
  text-align: center;
  animation: fadeIn 0.3s ease;
}

.arrow-line {
  width: 40px;
  height: 2px;
  background: #3b82f6;
  margin: 0 auto;
}

.arrow-head {
  color: #3b82f6;
  font-size: 18px;
  font-weight: 700;
}

.flow-label {
  font-size: 11px;
  color: #3b82f6;
  font-weight: 600;
}

.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.pipeline-stage {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  font-size: 11px;
  color: var(--vp-c-text-2);
  transition: border-color 0.3s, color 0.3s;
}

.pipeline-stage.done {
  border-color: #22c55e;
  color: #22c55e;
}

.stage-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--vp-c-border);
  color: var(--vp-c-bg);
  font-size: 10px;
  font-weight: 700;
}

.pipeline-stage.done .stage-num {
  background: #22c55e;
}

.pipe-arrow {
  color: var(--vp-c-text-2);
  font-size: 12px;
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
  .servers {
    grid-template-columns: 1fr;
  }
  .flow-center {
    min-width: unset;
  }
}
</style>
