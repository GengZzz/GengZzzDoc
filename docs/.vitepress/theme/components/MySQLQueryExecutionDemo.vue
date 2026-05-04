<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 6

const stages = [
  { icon: '💻', label: '客户端', title: '客户端发送 SQL' },
  { icon: '🔗', label: '连接器', title: '连接器检查权限' },
  { icon: '📖', label: '分析器', title: '分析器解析 SQL 为 AST' },
  { icon: '⚙️', label: '优化器', title: '优化器选择最优执行方案' },
  { icon: '🚀', label: '执行器', title: '执行器调用引擎接口获取数据' },
]

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 SELECT 查询执行流程',
    '客户端发送 SQL 语句到 MySQL 服务器',
    '连接器验证身份和权限 (MySQL 8.0 已移除查询缓存)',
    '分析器进行词法分析、语法分析、语义分析，生成 AST',
    '优化器选择索引、确定执行计划',
    '执行器调用存储引擎 API，返回结果集给客户端',
  ]
  return texts[step.value]
})

const detailText = computed(() => {
  if (step.value === 1) return 'SELECT name, age FROM users WHERE age > 20 ORDER BY age'
  if (step.value === 2) return '连接器 → 权限验证 → 查询缓存(MySQL 8.0 已移除)'
  if (step.value === 3) return '词法分析 → 语法分析 → 语义分析 → 生成抽象语法树(AST)'
  if (step.value === 4) return '选择索引 → 确定 JOIN 顺序 → 估算成本 → 生成执行计划'
  if (step.value === 5) return '调用存储引擎 API → 调用 handler 接口 → 逐行返回结果集'
  return ''
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="query-demo">
    <!-- SQL text -->
    <div v-if="step >= 1" class="sql-box">
      <code>SELECT name, age FROM users WHERE age &gt; 20 ORDER BY age</code>
    </div>

    <!-- Pipeline -->
    <div class="pipeline">
      <div
        v-for="(stage, idx) in stages"
        :key="idx"
        class="stage"
        :class="{ active: step > idx, current: step === idx + 1 }"
      >
        <div class="stage-icon">{{ stage.icon }}</div>
        <div class="stage-label">{{ stage.label }}</div>
      </div>
    </div>

    <!-- Detail panel -->
    <div v-if="step >= 2" class="detail-panel">
      <div class="detail-title">{{ stages[step - 1]?.title }}</div>
      <div class="detail-text">{{ detailText }}</div>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.query-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.sql-box {
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.06);
  text-align: center;
}

.sql-box code {
  font-size: 13px;
  color: #3b82f6;
  font-weight: 600;
}

.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  position: relative;
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  min-width: 72px;
  position: relative;
  transition: border-color 0.3s, background 0.3s;
}

.stage:not(:last-child) {
  margin-right: 16px;
}

.stage:not(:last-child)::after {
  content: '→';
  position: absolute;
  right: -14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.stage.active {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.06);
}

.stage.current {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.stage-icon {
  font-size: 20px;
}

.stage-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.stage.active .stage-label,
.stage.current .stage-label {
  color: var(--vp-c-text-1);
}

.detail-panel {
  margin-top: 12px;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.detail-text {
  font-size: 12px;
  color: var(--vp-c-text-2);
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
  .pipeline {
    gap: 6px;
  }
  .stage {
    min-width: 56px;
    padding: 8px;
  }
}
</style>
