<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const source = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const filtered = source.filter(n => n % 2 === 0)
const mapped = filtered.map(n => n * n)
const collected = [...mapped]

const stages = computed(() => {
  const s: { label: string; code: string; data: number[]; visible: boolean }[] = [
    {
      label: '数据源 (source)',
      code: '',
      data: source,
      visible: step.value >= 1,
    },
    {
      label: 'filter',
      code: '.filter(n -> n % 2 == 0)',
      data: filtered,
      visible: step.value >= 2,
    },
    {
      label: 'map',
      code: '.map(n -> n * n)',
      data: mapped,
      visible: step.value >= 3,
    },
    {
      label: 'collect',
      code: '.collect(Collectors.toList())',
      data: collected,
      visible: step.value >= 4,
    },
  ]
  return s
})

const statusText = computed(() => {
  const texts = [
    '点击"下一步"观察 Stream 管道操作',
    '数据源 (source)',
    '中间操作：惰性求值，不会立即执行',
    '中间操作：转换每个元素',
    '终端操作：触发整个管道执行',
    '完整的 Stream 管道',
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
  <div class="stream-demo">
    <div class="pipeline">
      <template v-for="(stage, idx) in stages" :key="idx">
        <div v-if="stage.visible" class="stage-block" :class="{ highlight: step === 5 }">
          <div v-if="idx > 0" class="arrow">→</div>
          <div class="stage-card">
            <div class="stage-data">
              <span v-for="(val, vi) in stage.data" :key="vi" class="data-box">{{ val }}</span>
            </div>
            <div class="stage-label">
              <template v-if="stage.code"><code>{{ stage.code }}</code></template>
              <template v-else>{{ stage.label }}</template>
            </div>
          </div>
        </div>
      </template>
    </div>
    <div v-if="step === 0" class="empty">等待管道操作...</div>
    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.stream-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pipeline {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 8px;
}

.stage-block {
  display: flex;
  align-items: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

.arrow {
  margin: 0 6px;
  font-size: 20px;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.stage-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  flex-shrink: 0;
}

.stage-block.highlight .stage-card {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.stage-data {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 8px;
}

.data-box {
  min-width: 28px;
  padding: 4px 6px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-1);
}

.stage-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.stage-label code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 11px;
  color: var(--vp-c-brand-1);
}

.empty {
  min-height: 60px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  margin-bottom: 12px;
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
