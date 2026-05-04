<script setup lang="ts">
import { computed, ref } from 'vue'

type AnimType = 'fadeIn' | 'slideBounce' | 'pulse' | 'spin' | 'shimmer'
const selectedAnim = ref<AnimType>('fadeIn')
const iteration = ref<number | 'infinite'>('infinite')
const direction = ref<'normal' | 'reverse' | 'alternate' | 'alternate-reverse'>('normal')
const fillMode = ref<'none' | 'forwards' | 'backwards' | 'both'>('none')
const playing = ref(true)

const anims: Record<AnimType, { name: string; desc: string; css: string }> = {
  fadeIn: {
    name: 'fadeIn',
    desc: '淡入：opacity 从 0 到 1，最基础的入场效果。配合 forwards 保持终态。',
    css: `@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}`
  },
  slideBounce: {
    name: 'slideBounce',
    desc: '滑入回弹：多关键帧实现弹性效果。60% 时过冲，80% 时回弹，100% 归位。',
    css: `@keyframes slideBounce {
  0%   { transform: translateX(-100%); opacity: 0; }
  60%  { transform: translateX(10px); opacity: 1; }
  80%  { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}`
  },
  pulse: {
    name: 'pulse',
    desc: '脉冲：scale 在 1 和 1.1 之间循环，常用于按钮强调、通知提醒。',
    css: `@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}`
  },
  spin: {
    name: 'spin',
    desc: '旋转加载：持续旋转 360 度。border-top-color 配合圆形边框实现经典加载器。',
    css: `@keyframes spin {
  to { transform: rotate(360deg); }
}`
  },
  shimmer: {
    name: 'shimmer',
    desc: '骨架屏闪烁：渐变背景在水平方向滚动，模拟内容加载中的占位效果。',
    css: `@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}`
  }
}

const animStyle = computed(() => {
  const a = anims[selectedAnim.value]
  const count = iteration.value === 'infinite' ? 'infinite' : String(iteration.value)
  return {
    animation: playing.value
      ? `${a.name} 1.5s ease-in-out ${count} ${direction.value} ${fillMode.value}`
      : 'none'
  }
})

const description = computed(() => {
  const a = anims[selectedAnim.value]
  const parts = [a.desc]
  if (iteration.value === 'infinite') parts.push('当前无限循环。')
  if (direction.value === 'alternate') parts.push('alternate 使奇数次正向、偶数次反向播放。')
  if (fillMode.value === 'forwards') parts.push('forwards 保持动画最后一帧的样式，不会闪回初始状态。')
  return parts.join(' ')
})

function reset() {
  selectedAnim.value = 'fadeIn'
  iteration.value = 'infinite'
  direction.value = 'normal'
  fillMode.value = 'none'
  playing.value = true
}
</script>

<template>
  <div class="anim-playground">
    <div class="anim-tabs">
      <button
        v-for="(a, key) in anims"
        :key="key"
        :class="{ active: selectedAnim === key }"
        @click="selectedAnim = key as AnimType"
      >{{ a.name }}</button>
    </div>

    <div class="preview">
      <div class="anim-box" :style="animStyle">
        {{ selectedAnim === 'spin' ? '⏳' : selectedAnim === 'shimmer' ? '' : 'A' }}
      </div>
    </div>

    <div class="controls-row">
      <div class="control-group">
        <label>循环次数</label>
        <select v-model="iteration">
          <option :value="1">1 次</option>
          <option :value="3">3 次</option>
          <option :value="'infinite'">无限</option>
        </select>
      </div>
      <div class="control-group">
        <label>方向</label>
        <select v-model="direction">
          <option value="normal">normal</option>
          <option value="reverse">reverse</option>
          <option value="alternate">alternate</option>
          <option value="alternate-reverse">alternate-reverse</option>
        </select>
      </div>
      <div class="control-group">
        <label>填充模式</label>
        <select v-model="fillMode">
          <option value="none">none</option>
          <option value="forwards">forwards</option>
          <option value="backwards">backwards</option>
          <option value="both">both</option>
        </select>
      </div>
    </div>

    <div class="code-ref">
      <pre><code>{{ anims[selectedAnim].css }}</code></pre>
    </div>

    <div class="status-bar">{{ description }}</div>
    <div class="actions">
      <button class="action-btn" @click="playing = !playing">{{ playing ? '暂停' : '播放' }}</button>
      <button class="action-btn" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideBounce {
  0%   { transform: translateX(-100%); opacity: 0; }
  60%  { transform: translateX(10px); opacity: 1; }
  80%  { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.anim-playground {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.anim-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.anim-tabs button {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
}

.anim-tabs button.active {
  border-color: #f59e0b;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.preview {
  height: 130px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.anim-box {
  width: 70px;
  height: 70px;
  background: #f59e0b;
  border-radius: 8px;
  color: white;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 700;
}

.anim-box[style*="shimmer"] {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  width: 160px;
  height: 24px;
  border-radius: 4px;
}

.controls-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-group label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.control-group select {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
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
  white-space: pre-wrap;
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

@media (max-width: 560px) {
  .preview { height: 100px; }
  .controls-row { flex-direction: column; }
}
</style>
