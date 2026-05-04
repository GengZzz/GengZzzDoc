<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

interface PipelineStage {
  label: string
  code: string
  executed: boolean
}

const stages = computed<PipelineStage[]>(() => {
  const all: PipelineStage[] = [
    {
      label: 'source',
      code: 'Enumerable.Range(1, 10)',
      executed: step.value >= 1
    },
    {
      label: 'Where',
      code: '.Where(x => x % 2 == 0)',
      executed: step.value >= 2
    },
    {
      label: 'Select',
      code: '.Select(x => x * x)',
      executed: step.value >= 3
    },
    {
      label: 'foreach',
      code: 'foreach(var x in result)',
      executed: step.value >= 4
    }
  ]
  return all
})

const sourceData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const whereResult = computed(() => sourceData.filter(x => x % 2 === 0))
const selectResult = computed(() => whereResult.value.map(x => x * x))

const activeElements = computed(() => {
  if (step.value === 0) return []
  if (step.value === 1) return sourceData.map((v, i) => ({ source: v }))
  if (step.value === 2) return whereResult.value.map((v, i) => ({ source: v, where: true }))
  if (step.value === 3) return selectResult.value.map((v, i) => ({ source: whereResult.value[i], where: true, select: v }))
  if (step.value === 4) return selectResult.value.map((v, i) => ({ source: whereResult.value[i], where: true, select: v, yielded: true }))
  return []
})

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 LINQ 延迟求值过程',
    'source 定义完成 —— Enumerable.Range(1, 10) 产生序列，尚未执行任何操作',
    '.Where() 只是构建查询表达式（返回迭代器），**没有遍历任何元素**',
    '.Select() 同样不执行，只是在管道上再叠加一层转换',
    'foreach 触发执行！逐元素求值（惰性求值），每个元素依次通过整个管道',
  ]
  return texts[step.value]
})

const showComparison = computed(() => step.value === 4)

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
        :class="{ active: stage.executed, current: (step === i + 1) }"
      >
        <span class="stage-label">{{ stage.label }}</span>
        <code class="stage-code">{{ stage.code }}</code>
      </div>
    </div>

    <!-- Data flow -->
    <div class="data-flow" v-if="step >= 1">
      <div class="flow-row">
        <span class="flow-header">Source</span>
        <div class="flow-items">
          <div
            v-for="(n, i) in sourceData"
            :key="i"
            class="flow-item"
            :class="{ highlighted: step >= 1, dimmed: step >= 2 && n % 2 !== 0 }"
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

    <!-- IEnumerable vs IQueryable comparison -->
    <div v-if="showComparison" class="comparison">
      <div class="compare-card">
        <h5>IEnumerable&lt;T&gt;</h5>
        <code>内存中逐元素处理</code>
        <p>适用于：集合、数组、LINQ to Objects</p>
      </div>
      <div class="compare-card">
        <h5>IQueryable&lt;T&gt;</h5>
        <code>翻译为 SQL/查询语言</code>
        <p>适用于：EF Core、数据库、远程数据源</p>
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
  min-width: 120px;
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
  font-size: 13px;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.stage-code {
  font-size: 11px;
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

.flow-item.highlighted {
  opacity: 1;
}

.flow-item.dimmed {
  opacity: 0.2;
  border-style: dashed;
}

.where-item.highlighted {
  border-color: #3b82f6;
  color: #3b82f6;
}

.select-item.highlighted {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.select-item.yielded {
  border-color: #22c55e;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
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
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--vp-c-brand-1);
}

.compare-card code {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.compare-card p {
  margin: 4px 0 0;
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
  .pipeline {
    flex-direction: column;
  }
  .comparison {
    grid-template-columns: 1fr;
  }
}
</style>
