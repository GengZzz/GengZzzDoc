<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

interface PipelineStage {
  label: string
  code: string
  executed: boolean
}

const stages = computed<PipelineStage[]>(() => {
  const all: PipelineStage[] = [
    { label: 'source', code: 'new[]{1,2,3,4,5}', executed: step.value >= 1 },
    { label: 'Where', code: '.Where(x => x > 2)', executed: step.value >= 2 },
    { label: 'Select', code: '.Select(x => x * x)', executed: step.value >= 3 },
    { label: 'foreach', code: 'foreach(var x in q)', executed: step.value >= 4 },
    { label: 'IQueryable', code: 'Expression<Func<>>', executed: step.value >= 5 },
    { label: 'ToSql', code: 'EF Core → SQL', executed: step.value >= 6 },
  ]
  return all
})

const sourceData = [1, 2, 3, 4, 5]
const whereResult = computed(() => sourceData.filter(x => x > 2))
const selectResult = computed(() => whereResult.value.map(x => x * x))

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 LINQ 延迟执行 + IQueryable 翻译过程',
    '步骤 1：定义 IEnumerable 数据源（内存集合，5 个元素）',
    '步骤 2：Where() 不执行，只创建 WhereEnumerableIterator（延迟执行）',
    '步骤 3：Select() 不执行，嵌套迭代器叠加（仍在构建管道）',
    '步骤 4：foreach 触发执行 → 逐元素穿透多层迭代器（流式处理，一次一个元素）',
    '步骤 5：切换到 IQueryable → 表达式树构建（Lambda 变为可分析的数据结构）',
    '步骤 6：ToListAsync() → EF Core 遍历表达式树 → 翻译为 SQL → 数据库执行',
    '步骤 7：IEnumerable（内存过滤 1000 行取 10 行）vs IQueryable（数据库只返回 10 行）',
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
  <div class="linq-demo">
    <!-- Pipeline visualization -->
    <div class="pipeline">
      <div
        v-for="(stage, i) in stages"
        :key="i"
        class="stage"
        :class="{ active: stage.executed, current: (step === i + 1) || (step === 7 && i >= 4) }"
      >
        <span class="stage-label">{{ stage.label }}</span>
        <code class="stage-code">{{ stage.code }}</code>
      </div>
    </div>

    <!-- Steps 1-4: IEnumerable flow -->
    <div class="data-flow" v-if="step >= 1 && step <= 4">
      <div class="flow-row">
        <span class="flow-header">Source</span>
        <div class="flow-items">
          <div
            v-for="(n, i) in sourceData"
            :key="i"
            class="flow-item"
            :class="{ highlighted: step >= 1, dimmed: step >= 2 && n <= 2 }"
          >
            {{ n }}
          </div>
        </div>
      </div>

      <div class="flow-row" v-if="step >= 2">
        <span class="flow-header">Where</span>
        <div class="flow-items">
          <div
            v-for="(n, i) in whereResult"
            :key="i"
            class="flow-item where-item"
            :class="{ highlighted: step >= 2, dimmed: step >= 3 }"
          >
            {{ n }}
          </div>
        </div>
      </div>

      <div class="flow-row" v-if="step >= 3">
        <span class="flow-header">Select</span>
        <div class="flow-items">
          <div
            v-for="(n, i) in selectResult"
            :key="i"
            class="flow-item select-item"
            :class="{ highlighted: step >= 3, yielded: step >= 4 }"
          >
            {{ n }}
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5-6: IQueryable expression tree -->
    <div v-if="step === 5" class="expr-tree">
      <h4>表达式树构建</h4>
      <div class="tree-box">
        <code>Expression&lt;Func&lt;User, bool&gt;&gt;</code>
        <div class="tree-structure">
          <div class="tree-node">BinaryExpression (GreaterThan)</div>
          <div class="tree-children">
            <div class="tree-node leaf">MemberAccess: u.Age</div>
            <div class="tree-node leaf">Constant: 18</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="step === 6" class="sql-output">
      <h4>EF Core SQL 翻译</h4>
      <div class="sql-box">
        <code>SELECT [u].[Id], [u].[Name]</code>
        <code>FROM [Users] AS [u]</code>
        <code>WHERE [u].[Age] > @__p_0</code>
      </div>
      <div class="sql-note">参数化查询，防止 SQL 注入</div>
    </div>

    <!-- Step 7: Comparison -->
    <div v-if="step === 7" class="comparison">
      <div class="compare-card">
        <h5>IEnumerable（内存过滤）</h5>
        <div class="compare-flow">
          <span class="compare-step">数据库</span>
          <span class="compare-arrow">→</span>
          <span class="compare-step bad">传输 1000 行</span>
          <span class="compare-arrow">→</span>
          <span class="compare-step">内存过滤取 10 行</span>
        </div>
        <div class="compare-cost bad">传输：1000 行，内存：过滤全部</div>
      </div>
      <div class="compare-card">
        <h5>IQueryable（数据库过滤）</h5>
        <div class="compare-flow">
          <span class="compare-step">数据库</span>
          <span class="compare-arrow">→</span>
          <span class="compare-step good">SQL WHERE 过滤</span>
          <span class="compare-arrow">→</span>
          <span class="compare-step">传输 10 行</span>
        </div>
        <div class="compare-cost good">传输：10 行，内存：0</div>
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
.linq-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pipeline {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stage {
  flex: 1;
  min-width: 100px;
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  text-align: center;
  transition: all 0.3s ease;
  opacity: 0.4;
}

.stage.active {
  opacity: 1;
}

.stage.current {
  border-color: var(--vp-c-brand-1);
  background: rgba(59, 130, 246, 0.08);
}

.stage-label {
  display: block;
  font-weight: 600;
  font-size: 12px;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.stage-code {
  font-size: 10px;
  color: var(--vp-c-text-2);
}

.data-flow {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.flow-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-header {
  width: 60px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.flow-items {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.flow-item {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: var(--vp-c-bg);
  transition: all 0.3s ease;
  opacity: 0.3;
}

.flow-item.highlighted { opacity: 1; }
.flow-item.dimmed { opacity: 0.2; border-style: dashed; }

.where-item.highlighted { border-color: #3b82f6; color: #3b82f6; }
.select-item.highlighted { border-color: #8b5cf6; color: #8b5cf6; }
.select-item.yielded { border-color: #22c55e; color: #22c55e; background: rgba(34, 197, 94, 0.08); }

.expr-tree { margin-bottom: 12px; }
.expr-tree h4 { margin: 0 0 8px; font-size: 14px; }

.tree-box {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.tree-box > code {
  display: block;
  margin-bottom: 8px;
  color: var(--vp-c-brand-1);
  font-size: 12px;
}

.tree-structure { padding-left: 16px; }

.tree-node {
  padding: 4px 8px;
  margin: 2px 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 11px;
  display: inline-block;
}

.tree-children { padding-left: 24px; }
.tree-node.leaf { border-color: #22c55e; color: #22c55e; }

.sql-output { margin-bottom: 12px; }
.sql-output h4 { margin: 0 0 8px; font-size: 14px; }

.sql-box {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.sql-box code {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-1);
}

.sql-note {
  margin-top: 6px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.comparison {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.compare-card {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.compare-card h5 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--vp-c-brand-1);
}

.compare-flow {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.compare-step {
  padding: 2px 6px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 11px;
}

.compare-step.bad { border-color: #ef4444; color: #ef4444; }
.compare-step.good { border-color: #22c55e; color: #22c55e; }
.compare-arrow { color: var(--vp-c-text-2); font-size: 11px; }

.compare-cost {
  font-size: 11px;
  text-align: center;
  padding: 4px;
  border-radius: 4px;
}

.compare-cost.bad { color: #ef4444; background: rgba(239, 68, 68, 0.05); }
.compare-cost.good { color: #22c55e; background: rgba(34, 197, 94, 0.05); }

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
  .pipeline { flex-direction: column; }
  .comparison { grid-template-columns: 1fr; }
  .compare-flow { flex-direction: column; }
}
</style>
