<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const steps = [
  {
    title: '定义原始函数',
    code: `def add(a, b):\n    return a + b`,
    desc: '一个简单的加法函数，没有任何装饰。',
    layers: ['add(a, b)'],
    callFlow: [],
    meta: { __name__: 'add', __doc__: null }
  },
  {
    title: '定义装饰器',
    code: `import functools, time\n\ndef timer(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        start = time.perf_counter()\n        result = func(*args, **kwargs)\n        elapsed = time.perf_counter() - start\n        print(f"耗时: {elapsed:.4f}s")\n        return result\n    return wrapper`,
    desc: 'timer 装饰器：包装函数，记录执行时间。',
    layers: ['add(a, b)', 'timer'],
    callFlow: [],
    meta: { __name__: 'add', __doc__: null }
  },
  {
    title: '@timer 应用到 add',
    code: `@timer\ndef add(a, b):\n    return a + b\n\n# 等价于: add = timer(add)`,
    desc: 'add 现在指向 timer 返回的 wrapper 函数。原始 add 被闭包捕获。',
    layers: ['wrapper → 原始 add', 'timer 包装完成'],
    callFlow: [],
    meta: { __name__: 'add', __doc__: null, __wrapped__: 'add (原函数)' }
  },
  {
    title: '@log 双层装饰',
    code: `def log(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        print(f"调用 {func.__name__}")\n        return func(*args, **kwargs)\n    return wrapper\n\n@log\n@timer\ndef add(a, b):\n    return a + b\n\n# 等价于: add = log(timer(add))`,
    desc: '双层包装：add → log的wrapper → timer的wrapper → 原始add。调用时从外到内。',
    layers: ['log 的 wrapper', 'timer 的 wrapper', '原始 add'],
    callFlow: [],
    meta: { __name__: 'add', __doc__: null, __wrapped__: 'timer wrapper' }
  },
  {
    title: '调用 add(1, 2)',
    code: `add(1, 2)\n\n# 执行流程:\n# 1. log wrapper: 打印 "调用 add"\n# 2. timer wrapper: 开始计时\n# 3. 原始 add: return 1 + 2 = 3\n# 4. timer wrapper: 打印 "耗时: 0.0000s"\n# 5. 返回 3`,
    desc: '调用链：log → timer → 原始函数 → timer → 返回结果。functools.wraps 保留了 __name__ 和 __doc__。',
    layers: ['log 的 wrapper', 'timer 的 wrapper', '原始 add'],
    callFlow: [
      { step: 'log wrapper', action: '打印 "调用 add"', color: '#8b5cf6' },
      { step: 'timer wrapper', action: 'start = perf_counter()', color: '#f59e0b' },
      { step: '原始 add', action: 'return 1 + 2 = 3', color: '#22c55e' },
      { step: 'timer wrapper', action: '打印 "耗时: 0.0000s"', color: '#f59e0b' },
      { step: '返回', action: '3', color: '#8b5cf6' }
    ],
    meta: { __name__: 'add', __doc__: null, __wrapped__: 'add (原函数)' }
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
  <div class="decorator-demo">
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

    <div class="layer-panel">
      <div class="panel-title">包装层级</div>
      <div class="layer" v-for="(layer, i) in currentStep.layers" :key="i"
           :style="{ marginLeft: (currentStep.layers.length - 1 - i) * 16 + 'px' }">
        <span class="layer-icon">{{ i === 0 ? '→' : '↓' }}</span>
        {{ layer }}
      </div>
    </div>

    <div class="call-flow" v-if="currentStep.callFlow.length">
      <div class="panel-title">调用链执行顺序</div>
      <div class="flow-step" v-for="(f, i) in currentStep.callFlow" :key="i">
        <span class="flow-badge" :style="{ background: f.color }">{{ i + 1 }}</span>
        <span class="flow-name">{{ f.step }}</span>
        <span class="flow-arrow">→</span>
        <span class="flow-action">{{ f.action }}</span>
      </div>
    </div>

    <div class="meta-panel">
      <div class="panel-title">函数元信息</div>
      <div class="meta-row" v-for="(val, key) in currentStep.meta" :key="key">
        <span class="meta-key">{{ key }}</span>
        <span class="meta-val">{{ val ?? 'N/A' }}</span>
      </div>
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.decorator-demo {
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

.dot.active { background: var(--vp-c-brand-1); transform: scale(1.2); }
.dot.done { background: #22c55e; }

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

.code-block code { white-space: pre; color: var(--vp-c-text-1); }

.desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
  line-height: 1.6;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.layer-panel, .call-flow, .meta-panel {
  padding: 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  margin-bottom: 10px;
}

.layer {
  font-size: 13px;
  font-family: monospace;
  color: var(--vp-c-text-1);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.layer-icon { color: var(--vp-c-brand-1); }

.flow-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
}

.flow-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.flow-name { color: var(--vp-c-text-1); font-weight: 500; min-width: 90px; }
.flow-arrow { color: var(--vp-c-text-2); }
.flow-action { color: var(--vp-c-text-2); font-family: monospace; font-size: 12px; }

.meta-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 2px 0;
}

.meta-key {
  color: #f59e0b;
  font-family: monospace;
  min-width: 90px;
}

.meta-val {
  color: var(--vp-c-text-2);
  font-family: monospace;
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

button:hover:not(:disabled) { border-color: var(--vp-c-brand-1); }
button:disabled { opacity: 0.5; cursor: default; }
</style>
