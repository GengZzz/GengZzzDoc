<script setup lang="ts">
import { computed, ref } from 'vue';

const caseIndex = ref(0);
const step = ref(0);
const cases = [
  {
    expr: '"5" + 1',
    result: '"51"',
    steps: ['看到 +', '一侧是字符串', '另一侧转字符串', '执行拼接'],
  },
  {
    expr: '"5" - 1',
    result: '4',
    steps: ['看到 -', '没有字符串拼接语义', '两侧转数字', '执行减法'],
  },
  {
    expr: '[] == false',
    result: 'true',
    steps: ['对象与布尔比较', '布尔转数字 false -> 0', '对象 ToPrimitive [] -> ""', '"" 转数字 0'],
  },
  {
    expr: 'null == undefined',
    result: 'true',
    steps: ['宽松相等', '命中特殊规则', '不执行 ToNumber', '直接返回 true'],
  },
];

const current = computed(() => cases[caseIndex.value]);

function nextStep() {
  step.value = (step.value + 1) % current.value.steps.length;
}

function nextCase() {
  caseIndex.value = (caseIndex.value + 1) % cases.length;
  step.value = 0;
}
</script>

<template>
  <div class="coercion-demo">
    <div class="topline">
      <div class="expr">{{ current.expr }}</div>
      <div class="result">结果：{{ current.result }}</div>
    </div>

    <div class="steps">
      <div
        v-for="(item, index) in current.steps"
        :key="item"
        class="step"
        :class="{ active: index === step, done: index < step }"
      >
        <span>{{ index + 1 }}</span>
        {{ item }}
      </div>
    </div>

    <div class="actions">
      <button type="button" @click="nextStep">下一步</button>
      <button type="button" @click="nextCase">切换例子</button>
    </div>
  </div>
</template>

<style scoped>
.coercion-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.topline {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.expr,
.result {
  min-height: 40px;
  display: inline-grid;
  place-items: center;
  padding: 0 14px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
}

.expr {
  color: #8b5cf6;
}

.result {
  color: #059669;
}

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.step {
  min-height: 70px;
  display: grid;
  place-items: center;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  text-align: center;
  font-size: 13px;
}

.step span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
}

.step.done {
  border-color: #10b981;
  color: #059669;
}

.step.active {
  border-color: #f59e0b;
  color: #d97706;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14);
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

@media (max-width: 720px) {
  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
