<script setup lang="ts">
import { ref, computed } from 'vue'

const step = ref(0)
const totalSteps = 6

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 B+ 树索引结构',
    '根节点包含 3 个键 [10, 30, 50]，用于路由定位',
    '叶子节点存储实际数据记录',
    '叶子节点形成双向链表，支持范围查询',
    '查找 key=25: 根节点定位 → 叶子节点',
    '范围查询: 沿链表顺序扫描 [10-29] → [30-49]',
  ]
  return texts[step.value]
})

const leaves = [
  { range: '1-9', min: 1, max: 9 },
  { range: '10-29', min: 10, max: 29 },
  { range: '30-49', min: 30, max: 49 },
  { range: '50-99', min: 50, max: 99 },
]

const highlightPath = computed(() => {
  if (step.value === 4) return [1] // key 25 falls in [10-29]
  if (step.value === 5) return [1, 2] // range 15-35 spans [10-29] and [30-49]
  return [] as number[]
})

const rootHighlighted = computed(() => step.value === 4 || step.value === 5)

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="bptree-demo">
    <!-- Root node -->
    <div v-if="step >= 1" class="tree-level">
      <div class="label">根节点</div>
      <div class="node root-node" :class="{ highlighted: rootHighlighted }">
        <span class="key">10</span>
        <span class="key">30</span>
        <span class="key">50</span>
      </div>
    </div>

    <!-- Arrows from root to leaves -->
    <div v-if="step >= 2" class="connector-down">
      <div v-for="i in 4" :key="i" class="arrow-down-line"></div>
    </div>

    <!-- Leaf nodes -->
    <div v-if="step >= 2" class="tree-level leaves">
      <div class="label">叶子节点存储实际数据</div>
      <div class="leaf-row">
        <div
          v-for="(leaf, idx) in leaves"
          :key="idx"
          class="node leaf-node"
          :class="{ highlighted: highlightPath.includes(idx), 'leaf-highlight-range': step === 5 && highlightPath.includes(idx) }"
        >
          <span class="key">{{ leaf.range }}</span>
        </div>
      </div>
      <!-- Linked list arrows -->
      <div v-if="step >= 3" class="chain-row">
        <div v-for="idx in 3" :key="idx" class="chain-arrow">
          <span class="chain-line">⇄</span>
        </div>
      </div>
      <div v-if="step >= 3" class="label chain-label">叶子节点形成双向链表，支持范围查询</div>
    </div>

    <!-- Query path overlay -->
    <div v-if="step === 4" class="query-info">
      <span class="query-tag">key = 25</span>
      <span class="query-desc">根节点 [10, 30, 50] → 10 &lt; 25 &lt; 30 → 定位到 [10-29]</span>
    </div>
    <div v-if="step === 5" class="query-info">
      <span class="query-tag">15 ≤ key ≤ 35</span>
      <span class="query-desc">从 [10-29] 找到 15，沿链表扫描到 [30-49] 的 35</span>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.bptree-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.tree-level {
  text-align: center;
  margin-bottom: 8px;
}

.label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}

.node {
  display: inline-flex;
  gap: 0;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
  transition: border-color 0.3s, background 0.3s;
}

.root-node {
  border-color: #3b82f6;
}

.root-node.highlighted {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.key {
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 600;
  border-right: 1px solid var(--vp-c-border);
}

.key:last-child {
  border-right: none;
}

.connector-down {
  display: flex;
  justify-content: center;
  gap: 36px;
  margin: 4px 0;
}

.arrow-down-line {
  width: 2px;
  height: 16px;
  background: var(--vp-c-border);
}

.leaves {
  margin-bottom: 4px;
}

.leaf-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.leaf-node {
  border-color: #22c55e;
}

.leaf-node.highlighted {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.leaf-highlight-range {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}

.chain-row {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-top: 2px;
}

.chain-arrow {
  width: 70px;
  text-align: center;
}

.chain-line {
  color: #8b5cf6;
  font-size: 16px;
}

.chain-label {
  margin-top: 4px;
}

.query-info {
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid #f59e0b;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.06);
  font-size: 13px;
}

.query-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f59e0b;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
}

.query-desc {
  color: var(--vp-c-text-1);
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
  .leaf-row {
    gap: 6px;
  }
  .chain-arrow {
    width: 50px;
  }
}
</style>
