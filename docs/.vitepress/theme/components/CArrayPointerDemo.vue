<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const descriptions = [
  'int arr[5] = {1, 2, 3, 4, 5} — 5 个 int 在连续内存中',
  '数组名 arr 衰退为指向首元素的指针 *(arr+i) 等价于 arr[i]',
  '指针运算 p++ — 指针按 sizeof(int) = 4 字节步长移动',
  'sizeof(arr) = 20（整个数组大小）vs sizeof(p) = 8（指针大小）',
  '二维数组 int mat[3][4] — 行优先存储，12 个元素连续排列'
]

const codeLines = [
  ['int arr[5] = {1, 2, 3, 4, 5};'],
  ['int *p = arr;', 'arr[2] == *(arr + 2)  // 都是 3'],
  ['int *p = arr;', 'p++;  // p 现在指向 arr[1]', '*p == 2'],
  ['int *p = arr;', 'sizeof(arr)  // 20', 'sizeof(p)    // 8 (64位系统)'],
  ['int mat[3][4] = {', '  {1,2,3,4}, {5,6,7,8}, {9,10,11,12}', '};']
]

const memoryState = computed(() => {
  switch (step.value) {
    case 0:
      return {
        cells: [
          { index: 0, value: 1, addr: '0x10' },
          { index: 1, value: 2, addr: '0x14' },
          { index: 2, value: 3, addr: '0x18' },
          { index: 3, value: 4, addr: '0x1c' },
          { index: 4, value: 5, addr: '0x20' }
        ],
        pointer: null as null | { label: string; target: number; addr: string },
        highlight: null as null | number
      }
    case 1:
      return {
        cells: [
          { index: 0, value: 1, addr: '0x10' },
          { index: 1, value: 2, addr: '0x14' },
          { index: 2, value: 3, addr: '0x18' },
          { index: 3, value: 4, addr: '0x1c' },
          { index: 4, value: 5, addr: '0x20' }
        ],
        pointer: { label: 'arr (p)', target: 0, addr: '0x10' },
        highlight: 2
      }
    case 2:
      return {
        cells: [
          { index: 0, value: 1, addr: '0x10' },
          { index: 1, value: 2, addr: '0x14' },
          { index: 2, value: 3, addr: '0x18' },
          { index: 3, value: 4, addr: '0x1c' },
          { index: 4, value: 5, addr: '0x20' }
        ],
        pointer: { label: 'p (p++)', target: 1, addr: '0x14' },
        highlight: null as null
      }
    case 3:
      return {
        cells: [
          { index: 0, value: 1, addr: '0x10' },
          { index: 1, value: 2, addr: '0x14' },
          { index: 2, value: 3, addr: '0x18' },
          { index: 3, value: 4, addr: '0x1c' },
          { index: 4, value: 5, addr: '0x20' }
        ],
        pointer: null as null | { label: string; target: number; addr: string },
        highlight: null as null,
        sizes: { arr: 20, p: 8 }
      }
    case 4:
      return {
        cells: [
          { index: 0, value: 1, addr: '0x10', row: 0 },
          { index: 1, value: 2, addr: '0x14', row: 0 },
          { index: 2, value: 3, addr: '0x18', row: 0 },
          { index: 3, value: 4, addr: '0x1c', row: 0 },
          { index: 4, value: 5, addr: '0x20', row: 1 },
          { index: 5, value: 6, addr: '0x24', row: 1 },
          { index: 6, value: 7, addr: '0x28', row: 1 },
          { index: 7, value: 8, addr: '0x2c', row: 1 },
          { index: 8, value: 9, addr: '0x30', row: 2 },
          { index: 9, value: 10, addr: '0x34', row: 2 },
          { index: 10, value: 11, addr: '0x38', row: 2 },
          { index: 11, value: 12, addr: '0x3c', row: 2 }
        ],
        pointer: null as null,
        highlight: null as null,
        matrix: true
      }
    default:
      return { cells: [], pointer: null, highlight: null }
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
  <div class="array-demo">
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
    <div class="memory-view">
      <div v-if="step < 4" class="linear-cells">
        <div
          v-for="cell in memoryState.cells"
          :key="cell.index"
          class="cell"
          :class="{ highlighted: memoryState.highlight === cell.index }"
        >
          <span class="cell-index">arr[{{ cell.index }}]</span>
          <span class="cell-value">{{ cell.value }}</span>
          <span class="cell-addr">{{ cell.addr }}</span>
        </div>
      </div>
      <div v-if="step === 3" class="size-compare">
        <div class="size-box">
          <strong>sizeof(arr)</strong>
          <span>20 bytes</span>
          <small>整个数组 5 × 4</small>
        </div>
        <div class="size-box">
          <strong>sizeof(p)</strong>
          <span>8 bytes</span>
          <small>一个指针 (64-bit)</small>
        </div>
      </div>
      <div v-if="step === 4" class="matrix-view">
        <div v-for="row in 3" :key="row" class="matrix-row">
          <div
            v-for="col in 4"
            :key="col"
            class="cell"
          >
            <span class="cell-index">[{{ row-1 }}][{{ col-1 }}]</span>
            <span class="cell-value">{{ memoryState.cells[(row-1)*4+(col-1)]?.value }}</span>
          </div>
        </div>
        <div class="row-labels">
          <span>Row 0</span>
          <span>Row 1</span>
          <span>Row 2</span>
        </div>
      </div>
      <div
        v-if="memoryState.pointer"
        class="pointer-indicator"
      >
        {{ memoryState.pointer.label }} → [{{ memoryState.pointer.target }}]
      </div>
    </div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.array-demo {
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

.memory-view {
  margin: 12px 0;
}

.linear-cells {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.cell.highlighted {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.cell-index {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.cell-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 4px 0;
}

.cell-addr {
  font-size: 10px;
  color: var(--vp-c-text-2);
}

.pointer-indicator {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--vp-c-bg);
  border: 1px solid #8b5cf6;
  border-radius: 6px;
  color: #8b5cf6;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}

.size-compare {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.size-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.size-box strong {
  color: var(--vp-c-text-1);
  font-size: 14px;
}

.size-box span {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 4px 0;
}

.size-box small {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.matrix-view {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.matrix-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.matrix-row .cell {
  border-color: #10b981;
}

.matrix-row .cell-value {
  color: #10b981;
}

.row-labels {
  display: flex;
  justify-content: space-around;
  margin-top: 4px;
  font-size: 11px;
  color: var(--vp-c-text-2);
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
  .linear-cells {
    grid-template-columns: repeat(3, 1fr);
  }
  .size-compare {
    grid-template-columns: 1fr;
  }
}
</style>
