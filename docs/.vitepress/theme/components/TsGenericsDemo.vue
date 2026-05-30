<script setup lang="ts">
import { computed, ref } from 'vue';

const selectedConstraint = ref<string | null>(null);

const constraints = [
  {
    id: 'extends-string',
    generic: 'T extends string',
    input: 'hello',
    result: 'T = "hello"',
    accepted: true,
  },
  {
    id: 'extends-object',
    generic: 'T extends { length: number }',
    input: 'string[]',
    result: 'T = string[]',
    accepted: true,
  },
  {
    id: 'extends-object-reject',
    generic: 'T extends { length: number }',
    input: 'number',
    result: '错误：number 没有 length 属性',
    accepted: false,
  },
  {
    id: 'keyof',
    generic: 'K keyof T',
    input: 'T = { name: string, age: number }',
    result: 'K = "name" | "age"',
    accepted: true,
  },
  {
    id: 'extends-record',
    generic: 'T extends Record<string, unknown>',
    input: '{ id: 1, title: "doc" }',
    result: 'T = { id: number, title: string }',
    accepted: true,
  },
];

const activeConstraint = computed(() => {
  return constraints.find((c) => c.id === selectedConstraint.value) || null;
});

const inferenceSteps = computed(() => {
  if (!activeConstraint.value) return [];
  const c = activeConstraint.value;
  return [
    { label: '泛型约束', value: c.generic },
    { label: '传入类型', value: c.input },
    { label: c.accepted ? '类型推导' : '类型检查', value: c.result },
  ];
});
</script>

<template>
  <div class="ts-generics-demo">
    <div class="constraint-list">
      <h4>点击选择泛型约束场景</h4>
      <div class="buttons">
        <button
          v-for="c in constraints"
          :key="c.id"
          type="button"
          class="constraint-btn"
          :class="{ selected: selectedConstraint === c.id, error: !c.accepted }"
          @click="selectedConstraint = c.id"
        >
          {{ c.generic }}
        </button>
      </div>
    </div>
    <div v-if="activeConstraint" class="inference">
      <div
        v-for="(step, i) in inferenceSteps"
        :key="i"
        class="step"
        :class="{ error: !activeConstraint.accepted && i === 2 }"
      >
        <div class="step-num">{{ i + 1 }}</div>
        <div class="step-content">
          <div class="step-label">{{ step.label }}</div>
          <code>{{ step.value }}</code>
        </div>
      </div>
    </div>
    <div v-else class="empty">请选择一个泛型约束场景查看推导过程</div>
  </div>
</template>

<style scoped>
.ts-generics-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.constraint-btn {
  min-height: 32px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  transition: all 0.2s;
}

.constraint-btn.selected {
  border-color: #3178c6;
  background: rgba(49, 120, 198, 0.1);
  color: #3178c6;
}

.constraint-btn.error.selected {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.inference {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
}

.step.error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.step-num {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #3178c6;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.step.error .step-num {
  background: #ef4444;
}

.step-content {
  flex: 1;
}

.step-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.step-content code {
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.empty {
  margin-top: 14px;
  padding: 20px;
  text-align: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
