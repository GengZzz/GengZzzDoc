<script setup lang="ts">
import { computed, ref } from 'vue';

const step = ref(0);
const cells = [10, 20, 30, 40, 50];
const states = [
  {
    index: 0,
    expr: 'int *p = arr;',
    desc: '数组名 arr 在表达式中退化为 &arr[0]，p 指向第 0 个 int。',
  },
  { index: 1, expr: 'p + 1', desc: 'p + 1 不是地址加 1 字节，而是前进 sizeof(int) 个字节。' },
  { index: 3, expr: '*(p + 3)', desc: 'p + 3 指向 arr[3]，解引用后得到 40。' },
  { index: 5, expr: '&arr[5]', desc: '末尾后一位指针可以用于比较边界，但不能解引用。' },
];

const current = computed(() => states[step.value]);

function next() {
  step.value = (step.value + 1) % states.length;
}

function reset() {
  step.value = 0;
}
</script>

<template>
  <div class="c-pointer-arithmetic">
    <div class="header">
      <strong>{{ current.expr }}</strong>
      <span>step {{ step + 1 }} / {{ states.length }}</span>
    </div>

    <div class="memory-row">
      <div
        v-for="(cell, index) in cells"
        :key="index"
        class="cell"
        :class="{ active: current.index === index }"
      >
        <span>arr[{{ index }}]</span>
        <strong>{{ cell }}</strong>
        <em>0x{{ (1000 + index * 4).toString(16) }}</em>
      </div>
      <div class="cell sentinel" :class="{ active: current.index === 5 }">
        <span>&arr[5]</span>
        <strong>边界</strong>
        <em>不可解引用</em>
      </div>
    </div>

    <div class="scale">
      <span>每移动 1 格 = sizeof(int) = 4 字节</span>
    </div>

    <p class="desc">{{ current.desc }}</p>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.c-pointer-arithmetic {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.header strong {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}

.header span {
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.memory-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(88px, 1fr));
  gap: 8px;
}

.cell {
  min-height: 94px;
  display: grid;
  place-items: center;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
}

.cell span,
.cell em {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-style: normal;
}

.cell strong {
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
}

.cell.active {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}

.sentinel {
  border-style: dashed;
}

.scale,
.desc {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.desc {
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

@media (max-width: 760px) {
  .memory-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
