<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

interface NarrowingCase {
  code: string
  originalType: string
  guard: string
  narrowedType: string
  description: string
}

const cases: NarrowingCase[] = [
  {
    code: 'function printLen(x: string | string[]) {\n  if (typeof x === "string") {\n    console.log(x.length)\n  } else {\n    console.log(x.reduce(...))\n  }\n}',
    originalType: 'string | string[]',
    guard: 'typeof x === "string"',
    narrowedType: 'x: string',
    description: 'typeof 守卫将联合类型收窄为 string'
  },
  {
    code: 'function process(val: Date | string) {\n  if (val instanceof Date) {\n    console.log(val.getFullYear())\n  }\n}',
    originalType: 'Date | string',
    guard: 'val instanceof Date',
    narrowedType: 'val: Date',
    description: 'instanceof 守卫将类型收窄为 Date'
  },
  {
    code: 'type Fish = { swim: () => void }\ntype Bird = { fly: () => void }\nfunction move(animal: Fish | Bird) {\n  if ("swim" in animal) {\n    animal.swim()\n  }\n}',
    originalType: 'Fish | Bird',
    guard: '"swim" in animal',
    narrowedType: 'animal: Fish',
    description: 'in 操作符守卫收窄为 Fish'
  },
  {
    code: 'type Circle = { kind: "circle", r: number }\ntype Rect = { kind: "rect", w: number, h: number }\nfunction area(s: Circle | Rect) {\n  switch (s.kind) {\n    case "circle": return Math.PI * s.r ** 2\n    case "rect": return s.w * s.h\n  }\n}',
    originalType: 'Circle | Rect',
    guard: 'switch (s.kind)',
    narrowedType: '每个分支自动收窄',
    description: '判别联合类型通过 switch 自动收窄'
  },
  {
    code: 'function assertNever(x: never): never {\n  throw new Error("Unexpected")\n}\nfunction handle(s: Circle | Rect) {\n  switch (s.kind) {\n    case "circle": break\n    case "rect": break\n    default: assertNever(s)\n  }\n}',
    originalType: 'Circle | Rect',
    guard: 'default: assertNever(s)',
    narrowedType: '穷尽检查',
    description: 'never 类型实现穷尽检查，新增类型时编译报错'
  }
]

const currentCase = computed(() => cases[step.value])

function next() {
  step.value = (step.value + 1) % totalSteps
}

function prev() {
  step.value = (step.value - 1 + totalSteps) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="ts-inference-demo">
    <div class="case-nav">
      <button
        v-for="(c, i) in cases"
        :key="i"
        type="button"
        class="tab"
        :class="{ active: step === i }"
        @click="step = i"
      >
        {{ i === 0 ? 'typeof' : i === 1 ? 'instanceof' : i === 2 ? 'in' : i === 3 ? '判别联合' : '穷尽检查' }}
      </button>
    </div>
    <div class="narrowing-flow">
      <div class="flow-step">
        <div class="flow-label">原始类型</div>
        <code>{{ currentCase.originalType }}</code>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-step guard">
        <div class="flow-label">类型守卫</div>
        <code>{{ currentCase.guard }}</code>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-step narrowed">
        <div class="flow-label">收窄结果</div>
        <code>{{ currentCase.narrowedType }}</code>
      </div>
    </div>
    <div class="code-area">
      <pre><code>{{ currentCase.code }}</code></pre>
    </div>
    <div class="status-bar">{{ currentCase.description }}</div>
    <div class="actions">
      <button type="button" @click="prev">上一步</button>
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.ts-inference-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.case-nav {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tab {
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  border-color: #3178c6;
  background: rgba(49, 120, 198, 0.1);
  color: #3178c6;
}

.narrowing-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.flow-step {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  text-align: center;
}

.flow-step.guard {
  border-color: #f59e0b;
}

.flow-step.narrowed {
  border-color: #10b981;
}

.flow-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.flow-step code {
  font-size: 12px;
}

.flow-arrow {
  color: var(--vp-c-text-2);
  font-size: 18px;
  font-weight: 700;
}

.code-area {
  margin-top: 12px;
}

.code-area pre {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-x: auto;
  min-height: 80px;
  white-space: pre-wrap;
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
