<script setup lang="ts">
import { ref } from 'vue'

const values = ref([12, 25, 37, 49, 58])
const active = ref(0)
const showBoundary = ref(false)

function highlightIndex(index: number) {
  active.value = index
}

const maxIndex = values.value.length - 1
</script>

<template>
  <div class="array-demo">
    <div class="index-labels">
      <span v-for="(v, i) in values" :key="i" class="label" :class="{ error: i > maxIndex && showBoundary }">{{ i }}</span>
    </div>
    <div class="array-row">
      <button
        v-for="(value, index) in values"
        :key="index"
        type="button"
        class="array-cell"
        :class="{ active: index === active, error: showBoundary && index > maxIndex }"
        @click="highlightIndex(index)"
      >
        <strong>{{ value }}</strong>
      </button>
    </div>
    <div class="code-show">
      <code>scores[{{ active }}]</code> → <strong>{{ values[active] }}</strong>
    </div>
    <p class="hint" v-if="active === maxIndex">
      下标 {{ maxIndex }} 是最后一个合法位置，再往后就越界了!
    </p>
  </div>
</template>

<style scoped>
.array-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.index-labels {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 4px;
}

.label {
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.label.error {
  color: #ef4444;
}

.array-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.array-cell {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: border-color 0.2s;
}

.array-cell strong {
  font-size: 20px;
}

.array-cell.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}

.array-cell.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.code-show {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 14px;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #ef4444;
}

@media (max-width: 480px) {
  .array-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
