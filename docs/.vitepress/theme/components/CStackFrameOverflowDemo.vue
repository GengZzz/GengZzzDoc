<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const states = [
  { input: '', used: 0, secret: '42', ret: '0x401180', desc: 'buf[8]、secret、返回地址在同一个栈帧附近。' },
  { input: 'HELLO', used: 5, secret: '42', ret: '0x401180', desc: '输入 5 个字符加 \\0，仍然落在 buf 边界内。' },
  { input: 'AAAAAAAA', used: 8, secret: '42', ret: '0x401180', desc: '8 个字符已经填满 buf，再写终止符就会越界。' },
  { input: 'AAAAAAAABBBB', used: 12, secret: 'BBBB', ret: '0x401180', desc: '继续写入会覆盖相邻变量 secret。' },
  { input: 'AAAAAAAABBBBBBBBCCCC', used: 20, secret: 'BBBB', ret: 'CCCCCCCC', desc: '更长输入可能覆盖保存的返回地址，形成严重漏洞。' }
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
  <div class="stack-overflow-demo">
    <div class="header">
      <strong>栈缓冲区溢出</strong>
      <span>输入：{{ current.input || '空' }}</span>
    </div>

    <div class="frame">
      <div class="slot buf" :class="{ full: current.used >= 8 }">
        buf[8]
        <span>{{ Math.min(current.used, 8) }} / 8 bytes</span>
      </div>
      <div class="slot secret" :class="{ corrupted: current.secret !== '42' }">
        secret
        <span>{{ current.secret }}</span>
      </div>
      <div class="slot saved">saved rbp</div>
      <div class="slot ret" :class="{ corrupted: current.ret !== '0x401180' }">
        return address
        <span>{{ current.ret }}</span>
      </div>
    </div>

    <p class="desc">{{ current.desc }}</p>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.stack-overflow-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.header span {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.frame {
  display: grid;
  grid-template-columns: 1.2fr .9fr .9fr 1.2fr;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.slot {
  display: grid;
  min-height: 84px;
  place-items: center;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  text-align: center;
  font-family: var(--vp-font-family-mono);
}

.slot span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.buf.full {
  border-color: #f59e0b;
  color: #d97706;
}

.corrupted {
  border-color: #ef4444;
  color: #dc2626;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, .12);
}

.desc {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
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

@media (max-width: 760px) {
  .frame { grid-template-columns: 1fr; }
}
</style>
