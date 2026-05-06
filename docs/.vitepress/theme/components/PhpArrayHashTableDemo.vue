<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

interface Bucket {
  key: string
  value: string
  slot: number
  state: 'new' | 'shared' | 'copied' | 'packed' | 'hash'
}

const buckets = computed<Bucket[]>(() => {
  if (step.value === 0) return []
  if (step.value === 1) return [
    { key: '0', value: 'apple', slot: 0, state: 'packed' },
    { key: '1', value: 'banana', slot: 1, state: 'packed' },
    { key: '2', value: 'cherry', slot: 2, state: 'packed' }
  ]
  if (step.value === 2) return [
    { key: '0', value: 'apple', slot: 0, state: 'hash' },
    { key: 'name', value: 'Alice', slot: 3, state: 'new' },
    { key: '1', value: 'banana', slot: 1, state: 'hash' },
    { key: 'role', value: 'admin', slot: 5, state: 'new' }
  ]
  if (step.value === 3) return [
    { key: '$a', value: 'HashTable refcount=2', slot: 0, state: 'shared' },
    { key: '$b', value: 'shares same table', slot: 0, state: 'shared' }
  ]
  if (step.value === 4) return [
    { key: '$a[name]', value: 'Alice', slot: 3, state: 'shared' },
    { key: '$b[name]', value: 'Bob', slot: 3, state: 'copied' }
  ]
  if (step.value === 5) return [
    { key: '10', value: 'first', slot: 10, state: 'hash' },
    { key: '20', value: 'second', slot: 20, state: 'hash' },
    { key: '30', value: 'third', slot: 30, state: 'hash' }
  ]
  return [
    { key: '0', value: 'first', slot: 0, state: 'packed' },
    { key: '1', value: 'second', slot: 1, state: 'packed' },
    { key: '2', value: 'third', slot: 2, state: 'packed' }
  ]
})

const status = computed(() => {
  const list = [
    '点击"下一步"观察 PHP 数组如何在 list、map、写时复制之间切换',
    '连续整数键从 0 开始时，PHP 使用 packed array：内存紧凑，遍历更快',
    '混入字符串键或稀疏整数键后，数组退化为 HashTable + Bucket',
    '$b = $a 只增加 HashTable 引用计数，不立即复制所有元素',
    '修改 $b["name"] 时触发 Copy-on-Write，只有写入方复制一份结构',
    '稀疏数字键不是 list，很多 list 操作前需要 array_values() 重新索引',
    'array_values() 让键重新连续，适合 JSON 数组输出和列表遍历'
  ]
  return list[step.value]
})

const code = computed(() => {
  const list = [
    '$items = [];',
    "$items = ['apple', 'banana', 'cherry'];",
    "$items = [0 => 'apple', 'name' => 'Alice', 1 => 'banana'];",
    '$b = $a; // COW: share first',
    "$b['name'] = 'Bob'; // copy on write",
    "$ids = [10 => 'first', 20 => 'second', 30 => 'third'];",
    '$ids = array_values($ids);'
  ]
  return list[step.value]
})

function next() {
  step.value = Math.min(step.value + 1, totalSteps - 1)
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="php-array-demo">
    <div class="code-line"><code>{{ code }}</code></div>
    <div class="bucket-grid">
      <div v-if="buckets.length === 0" class="empty">尚未创建数组</div>
      <div v-for="bucket in buckets" :key="bucket.key + bucket.value" class="bucket" :class="bucket.state">
        <strong>{{ bucket.key }}</strong>
        <span>{{ bucket.value }}</span>
        <small>slot {{ bucket.slot }}</small>
      </div>
    </div>
    <div class="legend">
      <span class="packed">packed list</span>
      <span class="hash">HashTable</span>
      <span class="shared">shared</span>
      <span class="copied">copied</span>
    </div>
    <div class="status-bar">{{ status }}</div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span>{{ step + 1 }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.php-array-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.code-line {
  padding: 9px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow-x: auto;
}

.code-line code {
  color: var(--vp-c-brand-1);
  font-size: 13px;
}

.bucket-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
  min-height: 112px;
  margin-top: 12px;
}

.bucket,
.empty {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.bucket {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bucket strong {
  font-size: 14px;
}

.bucket span,
.bucket small {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.bucket.packed { border-color: #22c55e; }
.bucket.hash { border-color: #3b82f6; }
.bucket.shared { border-color: #f59e0b; }
.bucket.copied { border-color: #ef4444; }
.bucket.new { border-color: var(--vp-c-brand-1); }

.empty {
  display: grid;
  place-items: center;
  color: var(--vp-c-text-2);
  border-style: dashed;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.legend span {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 12px;
  background: var(--vp-c-bg);
}

.legend .packed { border-color: #22c55e; }
.legend .hash { border-color: #3b82f6; }
.legend .shared { border-color: #f59e0b; }
.legend .copied { border-color: #ef4444; }

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: center;
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

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.actions span {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-size: 12px;
}
</style>
