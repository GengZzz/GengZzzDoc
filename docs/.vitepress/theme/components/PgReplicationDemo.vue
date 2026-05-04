<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 5

const mode = ref<'async' | 'sync'>('async')
const showFailover = ref(false)

const primaryStatus = computed(() => {
  if (step.value === 0) return '空闲'
  if (step.value === 1) return '生成 WAL 记录'
  if (step.value === 2) return mode.value === 'sync' ? '等待 Standby 确认...' : '已提交（异步发送 WAL）'
  if (step.value === 3) return 'WAL 发送中'
  if (step.value === 4) return showFailover.value ? '（已宕机）' : '正常运行'
  return '正常运行'
})

const standby1Status = computed(() => {
  if (step.value <= 1) return '等待接收 WAL'
  if (step.value === 2) return mode.value === 'sync' ? '接收 WAL，刷入磁盘，回复确认' : '接收 WAL 中'
  if (step.value === 3) return '重放 WAL 完成'
  if (step.value === 4 && showFailover.value) return '已提升为新 Primary'
  return '正常同步'
})

const standby2Status = computed(() => {
  if (step.value <= 1) return '等待接收 WAL'
  if (step.value === 2) return mode.value === 'sync' ? '等待中（非同步 standby）' : '接收 WAL 中'
  if (step.value === 3) return '重放 WAL 中'
  if (step.value === 4 && showFailover.value) return '切换到新 Primary'
  return '正常同步'
})

const statusText = computed(() => {
  const texts = [
    '流复制架构：1 个 Primary + 2 个 Standby',
    '点击 Primary：事务产生 WAL 日志',
    mode.value === 'sync'
      ? '同步模式：Primary 等待 Standby 确认 WAL 已持久化后才返回提交成功'
      : '异步模式：Primary 提交后立即返回，异步发送 WAL 到 Standby',
    'WAL 在 Standby 上重放，数据保持同步',
    '模拟故障转移：Standby 1 提升为新 Primary',
  ]
  return texts[step.value]
})

const walProgress = computed(() => {
  if (step.value === 0) return 0
  if (step.value === 1) return 30
  if (step.value === 2) return mode.value === 'sync' ? 60 : 80
  if (step.value === 3) return 100
  if (step.value === 4) return 100
  return 0
})

function handlePrimaryClick() {
  if (step.value < 4) {
    step.value = Math.min(step.value + 1, totalSteps - 1)
  }
}

function handleFailover() {
  showFailover.value = true
}

function toggleMode() {
  mode.value = mode.value === 'async' ? 'sync' : 'async'
}

function reset() {
  step.value = 0
  showFailover.value = false
  mode.value = 'async'
}
</script>

<template>
  <div class="pg-replication-demo">
    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <span class="mode-label">复制模式：</span>
      <button
        type="button"
        class="mode-btn"
        :class="{ active: mode === 'async' }"
        @click="toggleMode"
      >
        {{ mode === 'async' ? '异步' : '同步' }}
      </button>
    </div>

    <!-- Architecture Diagram -->
    <div class="arch-diagram">
      <!-- Primary -->
      <div
        class="node primary-node"
        :class="{ active: step >= 1, crashed: step === 4 && showFailover }"
        @click="handlePrimaryClick"
      >
        <div class="node-icon">P</div>
        <div class="node-role">Primary</div>
        <div class="node-status">{{ primaryStatus }}</div>
        <div v-if="step >= 1 && step < 4 && !showFailover" class="wal-bar">
          <div class="wal-progress" :style="{ width: walProgress + '%' }"></div>
        </div>
      </div>

      <!-- Connection Lines -->
      <div class="connections">
        <div class="conn-line" :class="{ 'wal-flowing': step >= 1 }">
          <div class="arrow-down"></div>
        </div>
        <div class="conn-line" :class="{ 'wal-flowing': step >= 1 }">
          <div class="arrow-down"></div>
        </div>
      </div>

      <!-- Standby Nodes -->
      <div class="standby-row">
        <div
          class="node standby-node"
          :class="{ active: step >= 2, promoted: step === 4 && showFailover }"
        >
          <div class="node-icon">S1</div>
          <div class="node-role">{{ step === 4 && showFailover ? 'New Primary' : 'Standby 1' }}</div>
          <div class="node-status">{{ standby1Status }}</div>
          <div v-if="mode === 'sync' && step >= 2 && step < 4" class="sync-badge">同步</div>
        </div>

        <div
          class="node standby-node"
          :class="{ active: step >= 2 }"
        >
          <div class="node-icon">S2</div>
          <div class="node-role">Standby 2</div>
          <div class="node-status">{{ standby2Status }}</div>
          <div v-if="mode === 'sync' && step >= 2 && step < 4" class="async-badge">异步</div>
        </div>
      </div>

      <!-- Replication Slot Info -->
      <div v-if="step >= 3" class="slot-info">
        <div class="slot-title">复制槽状态</div>
        <div class="slot-detail">
          <span>Slot standby1: lag 0 bytes</span>
          <span>Slot standby2: lag 128 bytes</span>
        </div>
      </div>
    </div>

    <!-- Failover Button -->
    <div v-if="step >= 3 && !showFailover" class="failover-section">
      <button type="button" class="failover-btn" @click="handleFailover">
        模拟故障转移
      </button>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="step = Math.min(step + 1, totalSteps - 1)">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pg-replication-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.mode-btn {
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.mode-btn.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.arch-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
}

.node {
  padding: 12px 16px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  text-align: center;
  min-width: 140px;
  transition: all 0.3s;
  cursor: pointer;
  position: relative;
}

.primary-node {
  background: var(--vp-c-bg);
}

.primary-node.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.06);
}

.primary-node.crashed {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.06);
  opacity: 0.6;
  cursor: not-allowed;
}

.standby-node {
  background: var(--vp-c-bg);
}

.standby-node.active {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.06);
}

.standby-node.promoted {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.node-icon {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.primary-node .node-icon {
  color: #3b82f6;
}

.standby-node .node-icon {
  color: #8b5cf6;
}

.standby-node.promoted .node-icon {
  color: #22c55e;
}

.node-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.node-status {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.wal-bar {
  margin-top: 8px;
  height: 4px;
  background: var(--vp-c-border);
  border-radius: 2px;
  overflow: hidden;
}

.wal-progress {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.sync-badge, .async-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  color: white;
}

.sync-badge {
  background: #22c55e;
}

.async-badge {
  background: #94a3b8;
}

.connections {
  display: flex;
  gap: 80px;
}

.conn-line {
  width: 2px;
  height: 24px;
  background: var(--vp-c-border);
  position: relative;
  transition: background 0.3s;
}

.conn-line.wal-flowing {
  background: #3b82f6;
}

.arrow-down {
  position: absolute;
  bottom: -4px;
  left: -3px;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--vp-c-border);
  transition: border-top-color 0.3s;
}

.conn-line.wal-flowing .arrow-down {
  border-top-color: #3b82f6;
}

.standby-row {
  display: flex;
  gap: 24px;
}

.slot-info {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  font-size: 11px;
  width: 100%;
}

.slot-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.slot-detail {
  display: flex;
  gap: 16px;
  color: var(--vp-c-text-2);
  font-family: monospace;
}

.failover-section {
  margin-top: 12px;
  text-align: center;
}

.failover-btn {
  min-height: 34px;
  padding: 0 16px;
  border: 1px solid #ef4444;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  font-weight: 600;
}

.failover-btn:hover {
  background: rgba(239, 68, 68, 0.2);
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
</style>
