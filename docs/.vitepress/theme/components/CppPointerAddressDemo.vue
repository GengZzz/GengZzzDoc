<script setup lang="ts">
import { ref } from 'vue'

const selected = ref('roomA')
const rooms = {
  roomA: { address: '0x100', value: 18 },
  roomB: { address: '0x104', value: 20 },
  roomC: { address: '0x108', value: 23 }
}
</script>

<template>
  <div class="pointer-demo">
    <div class="memory-row">
      <button
        v-for="(room, key) in rooms"
        :key="key"
        type="button"
        class="memory-cell"
        :class="{ active: key === selected }"
        @click="selected = String(key)"
      >
        <span>{{ room.address }}</span>
        <strong>{{ room.value }}</strong>
      </button>
    </div>
    <p>
      指针保存的是地址。现在 <code>p</code> 保存
      <code>{{ rooms[selected as keyof typeof rooms].address }}</code>，
      所以 <code>*p</code> 读到
      {{ rooms[selected as keyof typeof rooms].value }}。
    </p>
  </div>
</template>

<style scoped>
.pointer-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.memory-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.memory-cell {
  min-height: 78px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.memory-cell span {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.memory-cell strong {
  display: block;
  margin-top: 8px;
  font-size: 20px;
}

.memory-cell.active {
  border-color: var(--vp-c-brand-1);
}
</style>
