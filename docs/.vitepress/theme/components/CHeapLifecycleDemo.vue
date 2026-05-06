<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const states = [
  { ptr: 'NULL', old: false, next: false, freed: false, desc: '初始状态：指针 arr 为 NULL，没有堆块。' },
  { ptr: '0x6000', old: true, next: false, freed: false, desc: 'malloc 分配 5 个 int，arr 指向旧堆块。' },
  { ptr: '0x6000', old: true, next: true, freed: false, desc: 'realloc 需要扩容，可能先申请更大的新块。' },
  { ptr: '0x9000', old: false, next: true, freed: true, desc: 'realloc 成功后拷贝旧数据，释放旧块，返回新地址。' },
  { ptr: '0x9000 (dangling)', old: false, next: false, freed: true, desc: 'free 后内存归还分配器，但指针变量仍保存旧地址，必须置为 NULL。' }
]

const current = computed(() => states[step.value])

function next() {
  step.value = (step.value + 1) % states.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="heap-demo">
    <div class="header">
      <strong>堆内存生命周期</strong>
      <span>step {{ step + 1 }} / {{ states.length }}</span>
    </div>

    <div class="layout">
      <section>
        <h4>栈上指针</h4>
        <div class="ptr" :class="{ danger: current.ptr.includes('dangling') }">
          arr<br><span>{{ current.ptr }}</span>
        </div>
      </section>

      <section>
        <h4>堆 Heap</h4>
        <div class="blocks">
          <div class="block" :class="{ active: current.old, freed: current.freed && !current.old }">
            旧块 5 * int<br><span>0x6000</span>
          </div>
          <div class="block next" :class="{ active: current.next }">
            新块 10 * int<br><span>0x9000</span>
          </div>
        </div>
      </section>
    </div>

    <p class="desc">{{ current.desc }}</p>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.heap-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header span {
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 12px;
}

section {
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.ptr,
.block {
  display: grid;
  min-height: 74px;
  place-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  text-align: center;
  font-family: var(--vp-font-family-mono);
}

.ptr span,
.block span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.ptr.danger {
  border-color: #ef4444;
  color: #dc2626;
  border-style: dashed;
}

.blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.block {
  opacity: .35;
}

.block.active {
  opacity: 1;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, .14);
}

.block.freed {
  opacity: .45;
  border-color: #ef4444;
  color: #dc2626;
  border-style: dashed;
}

.desc {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
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

@media (max-width: 720px) {
  .layout,
  .blocks { grid-template-columns: 1fr; }
}
</style>
