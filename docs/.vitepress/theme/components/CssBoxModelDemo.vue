<script setup lang="ts">
import { computed, ref } from 'vue'

const padding = ref(20)
const border = ref(5)
const margin = ref(20)
const boxSizing = ref<'content-box' | 'border-box'>('content-box')

const contentW = 200

const totalWidth = computed(() => {
  if (boxSizing.value === 'content-box') {
    return contentW + padding.value * 2 + border.value * 2
  }
  return contentW
})

const contentDisplay = computed(() => {
  if (boxSizing.value === 'content-box') {
    return contentW
  }
  return contentW - padding.value * 2 - border.value * 2
})

const description = computed(() => {
  if (boxSizing.value === 'content-box') {
    return `content-box（标准盒模型）：width = ${contentW}px 只定义内容区。总宽度 = ${contentW} + ${padding.value * 2}（padding） + ${border.value * 2}（border） = ${totalWidth.value}px。width 变大，元素也变大。`
  }
  return `border-box（IE 盒模型）：width = ${contentW}px 包含 padding + border。内容区实际 = ${contentW} - ${padding.value * 2}（padding） - ${border.value * 2}（border） = ${contentDisplay.value}px。width 不变，元素大小固定。`
})
</script>

<template>
  <div class="box-model-demo">
    <div class="sizing-toggle">
      <button
        :class="{ active: boxSizing === 'content-box' }"
        @click="boxSizing = 'content-box'"
      >content-box</button>
      <button
        :class="{ active: boxSizing === 'border-box' }"
        @click="boxSizing = 'border-box'"
      >border-box</button>
    </div>

    <div class="layers">
      <div class="layer margin-layer">
        <span class="label">margin</span>
        <div class="layer border-layer">
          <span class="label">border</span>
          <div class="layer padding-layer">
            <span class="label">padding</span>
            <div class="layer content-layer">
              {{ contentDisplay }}px
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="controls">
      <label>padding: <input type="range" min="0" max="50" v-model.number="padding" /><span>{{ padding }}px</span></label>
      <label>border: <input type="range" min="0" max="20" v-model.number="border" /><span>{{ border }}px</span></label>
      <label>margin: <input type="range" min="0" max="50" v-model.number="margin" /><span>{{ margin }}px</span></label>
    </div>

    <div class="info-bar">
      <span>width: {{ contentW }}px</span>
      <span>总宽度: <strong>{{ totalWidth }}px</strong></span>
    </div>

    <div class="status-bar">{{ description }}</div>
  </div>
</template>

<style scoped>
.box-model-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.sizing-toggle {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.sizing-toggle button {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}

.sizing-toggle button.active {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.layers {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.layer {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 4px;
}

.margin-layer {
  background: #fde68a;
  padding: v-bind('margin + "px"');
}

.border-layer {
  background: #a78bfa;
  padding: v-bind('border + "px"');
}

.padding-layer {
  background: #6ee7b7;
  padding: v-bind('padding + "px"');
}

.content-layer {
  background: #93c5fd;
  width: v-bind('contentDisplay + "px"');
  min-width: 40px;
  height: 50px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
  font-family: var(--vp-font-family-mono);
}

.label {
  position: absolute;
  top: 2px;
  left: 6px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.7;
}

.margin-layer > .label { color: #92400e; }
.border-layer > .label { color: #5b21b6; }
.padding-layer > .label { color: #065f46; }

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.controls input[type="range"] { width: 100px; }

.controls span {
  font-size: 12px;
  color: #ef4444;
  min-width: 40px;
}

.info-bar {
  display: flex;
  gap: 16px;
  padding: 6px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
  margin-bottom: 10px;
}

.info-bar strong { color: #ef4444; }

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

@media (max-width: 560px) {
  .controls { flex-direction: column; gap: 8px; }
}
</style>
