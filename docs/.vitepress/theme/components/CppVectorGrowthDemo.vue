<script setup lang="ts">
import { computed, ref } from 'vue'

const size = ref(3)
const capacity = computed(() => (size.value <= 4 ? 4 : 8))

function push() {
  if (size.value < 8) size.value += 1
}

function reset() {
  size.value = 3
}
</script>

<template>
  <div class="vector-demo">
    <div class="vector-bar">
      <span
        v-for="index in capacity"
        :key="index"
        class="vector-slot"
        :class="{ used: index <= size }"
      >
        {{ index <= size ? index : '' }}
      </span>
    </div>
    <p><code>size</code> 是 {{ size }}，<code>capacity</code> 是 {{ capacity }}。</p>
    <div class="vector-actions">
      <button type="button" @click="push">push_back</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.vector-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.vector-bar {
  display: grid;
  grid-template-columns: repeat(8, minmax(28px, 1fr));
  gap: 6px;
}

.vector-slot {
  min-height: 36px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
}

.vector-slot.used {
  border-style: solid;
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.vector-actions {
  display: flex;
  gap: 8px;
}

.vector-actions button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
</style>
