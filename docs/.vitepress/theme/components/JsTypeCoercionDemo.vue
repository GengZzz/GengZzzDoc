<script setup lang="ts">
import { computed, ref } from 'vue'

const cases = [
  { expr: '"5" + 1', steps: ['遇到 +', '存在字符串', '转为字符串拼接', '"51"'] },
  { expr: '"5" - 1', steps: ['遇到 -', '只能数值运算', '转为数字', '4'] },
  { expr: '[] == false', steps: ['宽松相等', '对象转原始值', '[] -> "" -> 0', 'true'] },
  { expr: 'null == undefined', steps: ['特殊规则', '两者宽松相等', '不转数字', 'true'] }
]

const index = ref(0)
const current = computed(() => cases[index.value])

function next() {
  index.value = (index.value + 1) % cases.length
}
</script>

<template>
  <div class="coercion-demo">
    <div class="expr">{{ current.expr }}</div>
    <div class="steps">
      <span v-for="step in current.steps" :key="step">{{ step }}</span>
    </div>
    <button type="button" @click="next">切换例子</button>
  </div>
</template>

<style scoped>
.coercion-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.expr {
  display: inline-grid;
  min-height: 40px;
  place-items: center;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: #8b5cf6;
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
}

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.steps span {
  position: relative;
  display: grid;
  min-height: 56px;
  place-items: center;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
  font-size: 13px;
  animation: step-pop 1.8s ease-in-out infinite;
}

.steps span:nth-child(2) { animation-delay: .15s; }
.steps span:nth-child(3) { animation-delay: .3s; }
.steps span:nth-child(4) {
  animation-delay: .45s;
  border-color: #10b981;
  color: #059669;
  font-weight: 700;
}

button {
  min-height: 34px;
  margin-top: 12px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

@keyframes step-pop {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@media (max-width: 720px) {
  .steps { grid-template-columns: 1fr; }
}
</style>
