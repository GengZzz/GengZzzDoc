<script setup lang="ts">
import { computed, ref } from 'vue'

const original = [5, 2, 8, 1, 4]
const step = ref(0)

const states = [
  [5, 2, 8, 1, 4],
  [2, 5, 8, 1, 4],
  [2, 5, 1, 8, 4],
  [2, 1, 5, 8, 4],
  [1, 2, 4, 5, 8]
]

const values = computed(() => states[step.value])

function next() {
  step.value = (step.value + 1) % states.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="sort-demo">
    <div class="bars">
      <span
        v-for="(value, index) in values"
        :key="index"
        class="bar"
        :style="{ height: 24 + value * 10 + 'px' }"
      >
        {{ value }}
      </span>
    </div>
    <p>
      <code>sort(nums.begin(), nums.end())</code>
      会不断调整元素位置，最终得到有序范围。
    </p>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置 {{ original.join(', ') }}</button>
    </div>
  </div>
</template>

<style scoped>
.sort-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.bars {
  min-height: 120px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.bar {
  width: 44px;
  display: grid;
  place-items: end center;
  padding-bottom: 6px;
  border-radius: 6px 6px 0 0;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 700;
  transition: height 0.25s ease;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
