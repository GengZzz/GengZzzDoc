<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const steps = [
  {
    title: '定义生成器函数',
    code: `def fib():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b`,
    desc: 'fib() 使用 yield 关键字，它是一个生成器函数。函数体不会立即执行。',
    highlight: 'yield',
    states: { genCreated: false, value: null, suspended: false, locals: null }
  },
  {
    title: '创建生成器对象',
    code: `g = fib()`,
    desc: '调用 fib() 返回一个生成器对象。函数体内的代码一行都没有执行！',
    highlight: 'g = fib()',
    states: { genCreated: true, value: null, suspended: false, locals: null }
  },
  {
    title: '第一次 next(g)',
    code: `next(g)  # 返回 0`,
    desc: '执行到 yield a 暂停，返回 a 的值(0)。局部状态 {a=0, b=1} 被保存。',
    highlight: 'yield a',
    states: { genCreated: true, value: 0, suspended: true, locals: 'a=0, b=1' }
  },
  {
    title: '第二次 next(g)',
    code: `next(g)  # 返回 1`,
    desc: '从上次暂停处继续，执行 a,b = b,a+b，然后到 yield a 返回 1。状态 {a=1, b=1}。',
    highlight: 'yield a',
    states: { genCreated: true, value: 1, suspended: true, locals: 'a=1, b=1' }
  },
  {
    title: 'for 循环内部机制',
    code: `for x in fib():\n    if x > 10: break\n    print(x)\n# 0, 1, 1, 2, 3, 5, 8`,
    desc: 'for 循环自动调用 __next__() 直到 StopIteration。生成器永不抛出（无限序列），需手动 break。',
    highlight: '__next__()',
    states: { genCreated: true, value: '0,1,1,2,3,5,8', suspended: false, locals: null }
  },
  {
    title: 'yield from 委托',
    code: `def outer():\n    yield from inner_gen()\n    yield "done"\n\n# yield from 将生成操作\n# 委托给子生成器`,
    desc: 'yield from 将值的产出和 send() 的传递委托给子生成器，简化了嵌套 yield 的写法。',
    highlight: 'yield from',
    states: { genCreated: true, value: '委托', suspended: false, locals: null }
  }
]

const currentStep = computed(() => steps[step.value])

function next() {
  if (step.value < totalSteps - 1) step.value++
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="generator-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: step === i - 1, done: step > i - 1 }"
      />
    </div>

    <div class="step-title">步骤 {{ step + 1 }}：{{ currentStep.title }}</div>

    <pre class="code-block"><code>{{ currentStep.code }}</code></pre>

    <div class="desc">{{ currentStep.desc }}</div>

    <div class="state-panel">
      <div class="state-row">
        <span class="label">生成器对象</span>
        <span class="value" :class="{ on: currentStep.states.genCreated }">
          {{ currentStep.states.genCreated ? '已创建 fib()' : '未创建' }}
        </span>
      </div>
      <div class="state-row" v-if="currentStep.states.locals">
        <span class="label">局部状态</span>
        <span class="value locals">{{ currentStep.states.locals }}</span>
      </div>
      <div class="state-row" v-if="currentStep.states.value !== null">
        <span class="label">返回值</span>
        <span class="value result">{{ currentStep.states.value }}</span>
      </div>
      <div class="state-row" v-if="currentStep.states.suspended">
        <span class="label">执行状态</span>
        <span class="value suspended">已暂停 (yield)</span>
      </div>
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.generator-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-border);
  transition: background 0.3s;
}

.dot.active {
  background: var(--vp-c-brand-1);
  transform: scale(1.2);
}

.dot.done {
  background: #22c55e;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}

.code-block {
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  margin-bottom: 10px;
}

.code-block code {
  white-space: pre;
  color: var(--vp-c-text-1);
}

.desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
  line-height: 1.6;
}

.state-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  margin-bottom: 12px;
}

.state-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.label {
  color: var(--vp-c-text-2);
  min-width: 70px;
  flex-shrink: 0;
}

.value {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.value.on {
  color: #22c55e;
}

.value.locals {
  color: #f59e0b;
  font-family: monospace;
}

.value.result {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.value.suspended {
  color: #ef4444;
}

.actions {
  display: flex;
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
  font-size: 13px;
  transition: border-color 0.2s;
}

button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
