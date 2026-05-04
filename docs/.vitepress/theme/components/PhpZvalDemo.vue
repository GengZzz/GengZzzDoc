<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const stepData = [
  {
    code: '$a = "hello";',
    desc: '创建变量 $a，Zend Engine 为其分配一个 zval 结构体',
    zvals: [
      { var: '$a', type: 'string', refcount: 1, is_ref: 0, value: '"hello"', highlight: true }
    ],
    note: 'zval 包含 type（类型标记）、value（实际值或指针）、refcount（引用计数）、is_ref（是否引用）'
  },
  {
    code: '$b = $a;',
    desc: '赋值操作触发写时复制（COW），但值相同，共享同一份字符串',
    zvals: [
      { var: '$a', type: 'string', refcount: 2, is_ref: 0, value: '"hello"', highlight: false },
      { var: '$b', type: 'string', refcount: 2, is_ref: 0, value: '→ 同一字符串', highlight: true }
    ],
    note: 'refcount 从 1 变为 2，$a 和 $b 指向同一个 zval，节省内存'
  },
  {
    code: '$b = "world";',
    desc: '修改 $b 时 COW 机制触发，$b 创建独立副本',
    zvals: [
      { var: '$a', type: 'string', refcount: 1, is_ref: 0, value: '"hello"', highlight: false },
      { var: '$b', type: 'string', refcount: 1, is_ref: 0, value: '"world"', highlight: true }
    ],
    note: 'COW：修改前检查 refcount > 1 则先复制，再修改自己的副本。各 refcount 回到 1'
  },
  {
    code: '$c = &$a;',
    desc: '引用赋值，$c 和 $a 指向同一个 zval，is_ref 标记为 1',
    zvals: [
      { var: '$a', type: 'string', refcount: 2, is_ref: 1, value: '"hello"', highlight: true },
      { var: '$c', type: 'string', refcount: 2, is_ref: 1, value: '→ 同一 zval', highlight: true }
    ],
    note: '引用赋值不同于普通赋值：is_ref=1 表示真正的引用关系，修改任一变量都会影响另一个'
  },
  {
    code: '$c = 42;',
    desc: '通过引用修改 $c，$a 的值也随之改变',
    zvals: [
      { var: '$a', type: 'int', refcount: 2, is_ref: 1, value: '42', highlight: false },
      { var: '$c', type: 'int', refcount: 2, is_ref: 1, value: '42', highlight: true }
    ],
    note: '因为 is_ref=1，直接修改原 zval，不触发 COW。$a 和 $c 同时变为整数 42'
  },
  {
    code: '$a = []; $a[] = &$a;',
    desc: '循环引用：数组 $a 包含对自身的引用，引用计数无法自动回收',
    zvals: [
      { var: '$a', type: 'array', refcount: 2, is_ref: 1, value: '[0 => &$a]', highlight: true }
    ],
    note: '循环引用导致 refcount 永远不为 0。PHP GC 通过根缓冲区算法检测并回收此类循环引用'
  }
]

const current = computed(() => stepData[step.value])

function next() {
  if (step.value < totalSteps - 1) step.value++
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="zval-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: step === i - 1 }"
      />
    </div>

    <div class="code-block">
      <code>{{ current.code }}</code>
    </div>

    <p class="desc">{{ current.desc }}</p>

    <div class="zval-grid">
      <div
        v-for="z in current.zvals"
        :key="z.var"
        class="zval-card"
        :class="{ highlight: z.highlight }"
      >
        <div class="zval-header">
          <span class="var-name">{{ z.var }}</span>
          <span class="type-badge">{{ z.type }}</span>
        </div>
        <div class="zval-body">
          <div class="field"><span class="label">refcount</span><span class="val">{{ z.refcount }}</span></div>
          <div class="field"><span class="label">is_ref</span><span class="val">{{ z.is_ref }}</span></div>
          <div class="field"><span class="label">value</span><span class="val">{{ z.value }}</span></div>
        </div>
      </div>
    </div>

    <div class="note-box">
      {{ current.note }}
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span class="step-label">{{ step + 1 }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.zval-demo {
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
}

.code-block {
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  margin-bottom: 10px;
}

.code-block code {
  font-size: 14px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
}

.zval-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.zval-card {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow: hidden;
  transition: border-color 0.3s;
}

.zval-card.highlight {
  border-color: var(--vp-c-brand-1);
}

.zval-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-border);
}

.var-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.type-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.zval-body {
  padding: 8px 12px;
}

.field {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}

.label {
  color: var(--vp-c-text-2);
}

.val {
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.note-box {
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-left: auto;
}
</style>
