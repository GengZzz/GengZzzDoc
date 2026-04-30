<script setup lang="ts">
import { ref } from 'vue'

const selected = ref('roomA')
const pointer = ref('roomA')
const showValue = ref(true)

const rooms = {
  roomA: { address: '0x0010', value: 18, label: 'age' },
  roomB: { address: '0x0014', value: 20, label: 'score' },
  roomC: { address: '0x0018', value: 23, label: 'height' }
}

function selectRoom(key: string) {
  selected.value = key
  pointer.value = key
}
</script>

<template>
  <div class="pointer-demo">
    <div class="rooms-row">
      <div
        v-for="(room, key) in rooms"
        :key="key"
        class="memory-cell"
        :class="{ active: key === pointer }"
      >
        <span class="addr">{{ room.address }}</span>
        <span class="label">{{ room.label }}</span>
        <strong class="value">{{ room.value }}</strong>
      </div>
    </div>
    <div class="code-row">
      <code>int* p = &{{ rooms[pointer as keyof typeof rooms].label }};</code>
      <code>*p = {{ showValue ? rooms[pointer as keyof typeof rooms].value : '???' }}</code>
    </div>
    <p class="desc">
      指针 <code>p</code> 保存地址 <code>{{ rooms[pointer as keyof typeof rooms].address }}</code>，
      解引用 <code>*p</code> 访问到值 <strong>{{ rooms[pointer as keyof typeof rooms].value }}</strong>
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

.rooms-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.memory-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 90px;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition: border-color 0.2s;
}

.memory-cell.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}

.addr {
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-family: monospace;
}

.label {
  font-size: 12px;
  margin-top: 4px;
  color: var(--vp-c-text-2);
}

.value {
  font-size: 22px;
  margin-top: 8px;
}

.code-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.code-row code {
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.desc {
  margin-top: 12px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

@media (max-width: 480px) {
  .rooms-row {
    grid-template-columns: 1fr;
  }
}
</style>
