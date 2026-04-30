<script setup lang="ts">
import { ref } from 'vue'

const values = [12, 25, 37, 49, 58]
const active = ref(0)
</script>

<template>
  <div class="array-demo">
    <div class="array-row">
      <button
        v-for="(value, index) in values"
        :key="index"
        type="button"
        class="array-cell"
        :class="{ active: index === active }"
        @click="active = index"
      >
        <strong>{{ value }}</strong>
        <span>下标 {{ index }}</span>
      </button>
    </div>
    <p>当前访问：<code>scores[{{ active }}]</code>，得到 {{ values[active] }}。</p>
  </div>
</template>

<style scoped>
.array-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.array-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.array-cell {
  min-height: 72px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.array-cell span {
  display: block;
  margin-top: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.array-cell.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}
</style>
