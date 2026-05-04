<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const codeLines = [
  ['int a = 10;', 'int *p = &a;'],
  ['*p = 20;'],
  ['int **pp = &p;'],
  ['p = malloc(sizeof(int));', '*p = 42;'],
  ['free(p);', '// p 现在是悬空指针']
]

const descriptions = [
  '在栈上声明变量 a，指针 p 存储 a 的地址 &a',
  '通过解引用 *p 修改 a 的值为 20 —— 间接访问',
  '二级指针 pp 存储指针 p 的地址，**pp 可以访问 a',
  'malloc 在堆上分配内存，p 指向堆地址，存储值 42',
  'free 释放堆内存，p 成为悬空指针（指向已释放内存）'
]

const memoryState = computed(() => {
  switch (step.value) {
    case 0:
      return {
        stack: [
          { label: 'a', value: '10', addr: '0x7ffc10' },
          { label: 'p', value: '→ 0x7ffc10', addr: '0x7ffc18' }
        ],
        heap: []
      }
    case 1:
      return {
        stack: [
          { label: 'a', value: '20 (被 *p 修改)', addr: '0x7ffc10' },
          { label: 'p', value: '→ 0x7ffc10', addr: '0x7ffc18' }
        ],
        heap: []
      }
    case 2:
      return {
        stack: [
          { label: 'a', value: '20', addr: '0x7ffc10' },
          { label: 'p', value: '→ 0x7ffc10', addr: '0x7ffc18' },
          { label: 'pp', value: '→ 0x7ffc18 → 0x7ffc10', addr: '0x7ffc20' }
        ],
        heap: []
      }
    case 3:
      return {
        stack: [
          { label: 'a', value: '20', addr: '0x7ffc10' },
          { label: 'p', value: '→ 0x5a2000', addr: '0x7ffc18' }
        ],
        heap: [
          { label: 'heap block', value: '42', addr: '0x5a2000' }
        ]
      }
    case 4:
      return {
        stack: [
          { label: 'a', value: '20', addr: '0x7ffc10' },
          { label: 'p', value: '→ 0x5a2000 (悬空!)', addr: '0x7ffc18', dangling: true }
        ],
        heap: [
          { label: '已释放', value: '???', addr: '0x5a2000', freed: true }
        ]
      }
    default:
      return { stack: [], heap: [] }
  }
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="pointer-demo">
    <div class="step-indicator">
      步骤 {{ step + 1 }} / {{ totalSteps }}
    </div>
    <div class="code-panel">
      <div
        v-for="(line, i) in codeLines[step]"
        :key="i"
        class="code-line"
      >{{ line }}</div>
    </div>
    <p class="desc">{{ descriptions[step] }}</p>
    <div class="panels">
      <section>
        <h4>栈 Stack</h4>
        <div v-if="memoryState.stack.length === 0" class="empty">暂无变量</div>
        <div
          v-for="item in memoryState.stack"
          :key="item.label"
          class="block stack"
          :class="{ dangling: (item as any).dangling }"
        >
          <span class="var-name">{{ item.label }}</span>
          <span class="var-addr">{{ item.addr }}</span>
          <span class="var-val">{{ item.value }}</span>
        </div>
      </section>
      <section>
        <h4>堆 Heap</h4>
        <div v-if="memoryState.heap.length === 0" class="empty">暂无动态分配</div>
        <div
          v-for="item in memoryState.heap"
          :key="item.addr"
          class="block heap"
          :class="{ freed: (item as any).freed }"
        >
          <span class="var-name">{{ item.label }}</span>
          <span class="var-addr">{{ item.addr }}</span>
          <span class="var-val">{{ item.value }}</span>
        </div>
      </section>
    </div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pointer-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.code-panel {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  margin-bottom: 8px;
}

.code-line {
  line-height: 1.6;
}

.desc {
  margin: 8px 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.panels {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.panels h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  margin-top: 6px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.block.stack {
  border-color: #8b5cf6;
}

.block.stack .var-name {
  color: #8b5cf6;
  font-weight: 700;
}

.block.heap {
  border-color: #f59e0b;
}

.block.heap .var-name {
  color: #f59e0b;
  font-weight: 700;
}

.block.dangling {
  border-color: #ef4444;
  border-style: dashed;
}

.block.freed {
  border-color: #6b7280;
  opacity: 0.6;
}

.var-addr {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 2px;
}

.var-val {
  margin-top: 2px;
  font-weight: 600;
}

.empty {
  min-height: 60px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
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

@media (max-width: 560px) {
  .panels {
    grid-template-columns: 1fr;
  }
}
</style>
