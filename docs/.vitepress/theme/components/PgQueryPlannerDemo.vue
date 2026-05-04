<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 5

interface PathInfo {
  name: string
  cost: string
  rows: string
  desc: string
  selected: boolean
}

const paths = computed((): PathInfo[] => {
  if (step.value < 2) return []
  if (step.value === 2) {
    return [
      { name: 'Seq Scan', cost: '1920.00', rows: '50000', desc: '扫描全部 50000 行，过滤 user_id=42', selected: false },
      { name: 'Index Scan (idx_user_id)', cost: '163.50', rows: '150', desc: '通过 B-Tree 定位 user_id=42 的 150 行', selected: false },
      { name: 'Index Scan (idx_created_at)', cost: '4580.00', rows: '50000', desc: 'created_at 索引无法过滤 user_id=42', selected: false },
    ]
  }
  return [
    { name: 'Seq Scan', cost: '1920.00', rows: '50000', desc: '扫描全部 50000 行', selected: false },
    { name: 'Index Scan (idx_user_id)', cost: '163.50', rows: '150', desc: '通过 B-Tree 定位 user_id=42 的 150 行', selected: true },
    { name: 'Index Scan (idx_created_at)', cost: '4580.00', rows: '50000', desc: 'created_at 索引无法过滤', selected: false },
  ]
})

const planTree = computed(() => {
  if (step.value < 3) return []
  return [
    { depth: 0, node: 'Limit', cost: '0.29..0.32', rows: '10', actual: '10' },
    { depth: 1, node: 'Sort', cost: '163.50..163.88', rows: '150', actual: '150' },
    { depth: 2, node: '  -> Index Scan using idx_user_id on orders', cost: '4.42..163.50', rows: '150', actual: '148' },
  ]
})

const estimationCompare = computed(() => {
  if (step.value < 4) return null
  return [
    { node: 'Index Scan', estimated: 150, actual: 148, ratio: '0.99x' },
    { node: 'Sort', estimated: 150, actual: 150, ratio: '1.00x' },
    { node: 'Limit (10)', estimated: 10, actual: 10, ratio: '1.00x' },
  ]
})

const statusText = computed(() => {
  const texts = [
    '输入 SQL：SELECT * FROM orders WHERE user_id=42 ORDER BY created_at LIMIT 10',
    '优化器收集统计信息：orders 表 50000 行，user_id 列有 1000 个不同值，42 出现约 150 次',
    '优化器评估 3 条执行路径的成本',
    '选择成本最低的路径：Index Scan on idx_user_id（成本 163.50）',
    '执行计划验证：估算行数与实际行数偏差很小，计划有效',
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
  <div class="pg-query-planner-demo">
    <!-- Step 0: SQL Input -->
    <div v-if="step >= 0" class="sql-box">
      <div class="sql-label">SQL 查询</div>
      <pre class="sql-text">SELECT * FROM orders
WHERE user_id = 42
ORDER BY created_at
LIMIT 10;</pre>
    </div>

    <!-- Step 1: Statistics -->
    <div v-if="step === 1" class="stats-box">
      <div class="stats-title">统计信息 (pg_statistic)</div>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">orders 表</span>
          <span class="stat-value">50,000 行</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">user_id 不同值</span>
          <span class="stat-value">1,000</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">user_id=42 行数</span>
          <span class="stat-value">~150 行</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">选择性</span>
          <span class="stat-value">150/50000 = 0.3%</span>
        </div>
      </div>
    </div>

    <!-- Step 2-3: Path evaluation -->
    <div v-if="step >= 2" class="paths-box">
      <div class="paths-title">候选执行路径</div>
      <div class="path-list">
        <div
          v-for="(p, idx) in paths"
          :key="idx"
          class="path-item"
          :class="{ selected: p.selected }"
        >
          <div class="path-header">
            <span class="path-name">{{ p.name }}</span>
            <span v-if="p.selected" class="path-badge">最优</span>
          </div>
          <div class="path-desc">{{ p.desc }}</div>
          <div class="path-cost">
            <span>成本: {{ p.cost }}</span>
            <span>估算行数: {{ p.rows }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3-4: Plan tree -->
    <div v-if="step >= 3" class="plan-tree">
      <div class="plan-title">执行计划</div>
      <div class="tree-nodes">
        <div
          v-for="(n, idx) in planTree"
          :key="idx"
          class="tree-node"
          :style="{ paddingLeft: n.depth * 24 + 'px' }"
        >
          <div class="node-content">
            <span class="node-name">{{ n.node }}</span>
            <span class="node-cost">cost={{ n.cost }}</span>
            <span class="node-rows">rows={{ n.rows }}</span>
            <span v-if="step >= 4" class="node-actual">actual={{ n.actual }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 4: Estimation comparison -->
    <div v-if="estimationCompare" class="compare-box">
      <div class="compare-title">估算 vs 实际</div>
      <table class="compare-table">
        <thead>
          <tr>
            <th>节点</th>
            <th>估算行数</th>
            <th>实际行数</th>
            <th>偏差</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in estimationCompare" :key="row.node">
            <td>{{ row.node }}</td>
            <td>{{ row.estimated }}</td>
            <td>{{ row.actual }}</td>
            <td :class="{ good: parseFloat(row.ratio) < 1.1 && parseFloat(row.ratio) > 0.9 }">
              {{ row.ratio }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pg-query-planner-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.sql-box {
  margin-bottom: 12px;
}

.sql-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.sql-text {
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-family: monospace;
  margin: 0;
  overflow-x: auto;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}

.stats-box {
  margin-bottom: 12px;
}

.stats-title, .paths-title, .plan-title, .compare-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.paths-box {
  margin-bottom: 12px;
}

.path-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.path-item {
  padding: 10px 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  transition: border-color 0.3s;
}

.path-item.selected {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.06);
}

.path-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.path-name {
  font-weight: 600;
}

.path-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #22c55e;
  color: white;
}

.path-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.path-cost {
  display: flex;
  gap: 16px;
  font-family: monospace;
  font-size: 12px;
}

.plan-tree {
  margin-bottom: 12px;
}

.tree-nodes {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tree-node {
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  font-size: 13px;
  font-family: monospace;
}

.node-content {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.node-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.node-cost {
  color: #8b5cf6;
}

.node-rows {
  color: #3b82f6;
}

.node-actual {
  color: #22c55e;
  font-weight: 600;
}

.compare-box {
  margin-bottom: 12px;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.compare-table th,
.compare-table td {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  text-align: left;
}

.compare-table th {
  background: var(--vp-c-bg);
  font-weight: 600;
}

.compare-table td.good {
  color: #22c55e;
  font-weight: 600;
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
