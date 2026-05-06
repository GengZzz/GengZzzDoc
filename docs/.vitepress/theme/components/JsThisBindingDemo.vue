<script setup lang="ts">
import { computed, ref } from 'vue'

const modes = ['obj.greet()', 'const fn = obj.greet; fn()', 'greet.call(obj)', 'new Person()', 'arrow callback']
const index = ref(0)

const result = computed(() => {
  return [
    'this -> obj',
    'this -> undefined / window',
    'this -> obj',
    'this -> 新实例',
    'this -> 外层 this'
  ][index.value]
})

function next() {
  index.value = (index.value + 1) % modes.length
}
</script>

<template>
  <div class="this-demo">
    <div class="callsite">
      <div class="label">调用方式</div>
      <div class="code">{{ modes[index] }}</div>
    </div>
    <div class="arrow">决定</div>
    <div class="binding">
      <div class="label">this 绑定</div>
      <div class="result">{{ result }}</div>
    </div>
    <button type="button" @click="next">切换场景</button>
  </div>
</template>

<style scoped>
.this-demo {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.callsite,
.binding {
  min-height: 84px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.label {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.code,
.result {
  margin-top: 10px;
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
}

.result {
  color: #059669;
  animation: blink 1.1s ease-in-out infinite;
}

.arrow {
  color: #f59e0b;
  font-weight: 700;
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

@keyframes blink {
  0%, 100% { opacity: .65; }
  50% { opacity: 1; }
}

@media (max-width: 720px) {
  .this-demo { grid-template-columns: 1fr; }
  .arrow { text-align: center; }
}
</style>
