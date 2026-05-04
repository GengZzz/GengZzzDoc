<script setup lang="ts">
import { ref } from 'vue'

const active = ref(false)
const selectedCurve = ref('ease')
const duration = ref(0.5)

const curves: Record<string, string> = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  'cubic-bezier(0.68,-0.55,0.265,1.55)': '弹性'
}

const descriptions: Record<string, string> = {
  linear: '线性匀速：每秒速度恒定，适合加载进度条等需要匀速运动的场景。',
  ease: 'ease（默认值）：慢→快→慢，模拟物体自然加速减速，最通用的缓动曲线。',
  'ease-in': 'ease-in：缓慢开始，逐渐加速。适合元素离开视图（如收起、淡出）。',
  'ease-out': 'ease-out：快速开始，逐渐减速。适合元素进入视图（如弹出、滑入），感觉更灵敏。',
  'ease-in-out': 'ease-in-out：开始和结束都慢，中间快。适合来回往返的动画。',
  'cubic-bezier(0.68,-0.55,0.265,1.55)': 'cubic-bezier 自定义弹性曲线：值可以超出 0-1 范围，产生回弹/过冲效果。'
}

function toggle() {
  active.value = !active.value
}

function reset() {
  active.value = false
  selectedCurve.value = 'ease'
  duration.value = 0.5
}
</script>

<template>
  <div class="transition-demo">
    <div class="curve-tabs">
      <button
        v-for="(_, curve) in curves"
        :key="curve"
        :class="{ active: selectedCurve === curve }"
        @click="selectedCurve = curve"
      >{{ curves[curve] }}</button>
    </div>

    <div class="duration-control">
      <label>持续时间：<input type="range" min="0.1" max="3" step="0.1" v-model.number="duration" /><span>{{ duration }}s</span></label>
    </div>

    <div class="preview">
      <div
        class="box"
        :class="{ active }"
        :style="{
          transition: `transform ${duration}s ${selectedCurve}, background-color ${duration}s ${selectedCurve}, border-radius ${duration}s ${selectedCurve}`
        }"
        @click="toggle"
      >
        {{ active ? '还原' : '点击我' }}
      </div>
    </div>

    <div class="code-ref">
      <pre><code>transition: transform {{ duration }}s {{ selectedCurve }};
/* 点击上方色块观察不同缓动曲线的区别 */</code></pre>
    </div>

    <div class="status-bar">{{ descriptions[selectedCurve] }}</div>
    <div class="actions">
      <button class="action-btn" @click="toggle">{{ active ? '还原' : '触发过渡' }}</button>
      <button class="action-btn" @click="reset">重置全部</button>
    </div>
  </div>
</template>

<style scoped>
.transition-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.curve-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.curve-tabs button {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
}

.curve-tabs button.active {
  border-color: #10b981;
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.duration-control {
  margin-bottom: 12px;
}

.duration-control label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.duration-control input[type="range"] {
  width: 160px;
}

.duration-control span {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: #10b981;
}

.preview {
  height: 120px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.box {
  width: 80px;
  height: 80px;
  background: #10b981;
  border-radius: 8px;
  color: white;
  display: grid;
  place-items: center;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}

.box.active {
  transform: translateX(120px) rotate(180deg) scale(1.3);
  background: #f59e0b;
  border-radius: 50%;
}

.code-ref {
  margin-bottom: 12px;
}

.code-ref pre {
  margin: 0;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-x: auto;
}

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}
</style>
