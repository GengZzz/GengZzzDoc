<script setup lang="ts">
import { computed, ref } from 'vue';

type PosType = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
const selected = ref<PosType>('relative');

const posTop = ref(20);
const posLeft = ref(30);

const descriptions: Record<PosType, string> = {
  static:
    'static（默认定位）：元素按正常文档流排列，top/left/right/bottom 和 z-index 均无效。绝大多数元素不需要设置定位。',
  relative:
    'relative（相对定位）：元素仍在文档流中占据原始空间，但可以通过 top/left 偏移。偏移不影响其他元素位置。常用作 absolute 子元素的定位参考。',
  absolute:
    'absolute（绝对定位）：元素脱离文档流，不占据空间。相对于最近的 position 非 static 祖先元素定位。如果没有这样的祖先，相对于初始包含块（通常是 <html>）。',
  fixed:
    'fixed（固定定位）：元素脱离文档流，相对于视口（viewport）定位。滚动页面时位置不变。常用于固定导航栏、回到顶部按钮。',
  sticky:
    'sticky（粘性定位）：元素在滚动到指定阈值前表现为 relative，到达阈值后表现为 fixed。必须指定 top/left/right/bottom 中至少一个值。常用于表头固定。',
};
</script>

<template>
  <div class="pos-demo">
    <div class="tabs">
      <button
        v-for="pos in ['static', 'relative', 'absolute', 'fixed', 'sticky'] as PosType[]"
        :key="pos"
        :class="{ active: selected === pos }"
        @click="selected = pos"
      >
        {{ pos }}
      </button>
    </div>

    <div class="viewport">
      <div class="parent-label">父元素 position: relative</div>
      <div class="parent-box">
        <div
          class="target-box"
          :class="selected"
          :style="selected !== 'static' ? { top: posTop + 'px', left: posLeft + 'px' } : {}"
        >
          {{ selected }}<br />
          <small v-if="selected !== 'static'">top:{{ posTop }} left:{{ posLeft }}</small>
        </div>
        <div class="sibling-box">兄弟元素</div>
      </div>
      <div v-if="selected === 'fixed'" class="fixed-hint">元素相对于视口固定</div>
    </div>

    <div class="controls" v-if="selected !== 'static'">
      <label
        >top: <input type="range" min="-30" max="100" v-model.number="posTop" /><span
          >{{ posTop }}px</span
        ></label
      >
      <label
        >left: <input type="range" min="-30" max="200" v-model.number="posLeft" /><span
          >{{ posLeft }}px</span
        ></label
      >
    </div>
    <div class="controls disabled-hint" v-else>static 定位下 top/left 无效</div>

    <div class="status-bar">{{ descriptions[selected] }}</div>
  </div>
</template>

<style scoped>
.pos-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.tabs button {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
}

.tabs button.active {
  border-color: #14b8a6;
  color: #14b8a6;
  background: rgba(20, 184, 166, 0.08);
}

.viewport {
  position: relative;
  height: 200px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  margin-bottom: 12px;
  overflow: hidden;
}

.parent-label {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

.parent-box {
  position: relative;
  margin: 24px 12px 12px;
  border: 2px dashed #14b8a6;
  border-radius: 6px;
  padding: 8px;
  height: 150px;
}

.target-box {
  width: 100px;
  height: 50px;
  border: 2px solid #14b8a6;
  border-radius: 6px;
  background: rgba(20, 184, 166, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #0d9488;
  font-family: var(--vp-font-family-mono);
  z-index: 2;
}

.target-box.relative,
.target-box.static {
  position: relative;
}

.target-box.absolute {
  position: absolute;
}

.target-box.fixed {
  position: fixed;
  bottom: 20px;
  right: 20px;
  top: auto;
  left: auto;
  z-index: 100;
  background: rgba(20, 184, 166, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.target-box.sticky {
  position: sticky;
  top: 10px;
  left: auto;
}

.target-box small {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.7;
}

.sibling-box {
  width: 100px;
  height: 50px;
  border: 2px dashed var(--vp-c-text-3);
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-top: 8px;
}

.fixed-hint {
  position: absolute;
  bottom: 6px;
  right: 6px;
  font-size: 10px;
  color: #14b8a6;
  font-style: italic;
}

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

.controls input[type='range'] {
  width: 120px;
}

.controls span {
  font-size: 12px;
  color: #14b8a6;
  min-width: 40px;
}

.disabled-hint {
  padding: 6px 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

@media (max-width: 560px) {
  .viewport {
    height: 160px;
  }
  .controls {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
