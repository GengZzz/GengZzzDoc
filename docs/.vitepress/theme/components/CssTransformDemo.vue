<script setup lang="ts">
import { computed, ref } from 'vue'

type TransformType = 'translate' | 'rotate' | 'scale' | 'skew' | 'combined'
const selected = ref<TransformType>('translate')

const translateX = ref(50)
const translateY = ref(0)
const rotateDeg = ref(45)
const scaleX = ref(1.5)
const scaleY = ref(1.5)
const skewX = ref(20)
const skewY = ref(0)

const style = computed(() => {
  switch (selected.value) {
    case 'translate':
      return { transform: `translate(${translateX.value}px, ${translateY.value}px)` }
    case 'rotate':
      return { transform: `rotate(${rotateDeg.value}deg)` }
    case 'scale':
      return { transform: `scale(${scaleX.value}, ${scaleY.value})` }
    case 'skew':
      return { transform: `skew(${skewX.value}deg, ${skewY.value}deg)` }
    case 'combined':
      return {
        transform: `translate(${translateX.value}px, 0) rotate(${rotateDeg.value}deg) scale(${scaleX.value})`
      }
  }
})

const description = computed(() => {
  switch (selected.value) {
    case 'translate':
      return `translate(${translateX.value}px, ${translateY.value}px)：元素从原始位置移动。百分比相对于自身尺寸计算，这是 translate(-50%,-50%) 能实现居中的原因。`
    case 'rotate':
      return `rotate(${rotateDeg.value}deg)：绕中心点旋转。正值顺时针，负值逆时针。常用于箭头展开/收起、加载旋转。`
    case 'scale':
      return `scale(${scaleX.value}, ${scaleY.value})：缩放元素。1=原始大小，>1 放大，<1 缩小。不影响文档流，放大后可能覆盖相邻元素。`
    case 'skew':
      return `skew(${skewX.value}deg, ${skewY.value}deg)：沿 X/Y 轴倾斜。常用于倾斜横幅背景，内容反向倾斜可保持文字正立。`
    case 'combined':
      return '组合变换：多个变换函数按顺序执行。顺序不同结果不同——先旋转再位移是沿旋转后的坐标轴移动。'
  }
})

function reset() {
  translateX.value = 50
  translateY.value = 0
  rotateDeg.value = 45
  scaleX.value = 1.5
  scaleY.value = 1.5
  skewX.value = 20
  skewY.value = 0
}
</script>

<template>
  <div class="transform-demo">
    <div class="tabs">
      <button
        v-for="t in (['translate', 'rotate', 'scale', 'skew', 'combined'] as TransformType[])"
        :key="t"
        :class="{ active: selected === t }"
        @click="selected = t"
      >{{ t }}</button>
    </div>

    <div class="preview">
      <div class="origin-box">原始</div>
      <div class="transformed-box" :style="style">变换后</div>
    </div>

    <div class="controls" v-if="selected === 'translate'">
      <label>X: <input type="range" min="-100" max="100" v-model.number="translateX" /><span>{{ translateX }}px</span></label>
      <label>Y: <input type="range" min="-100" max="100" v-model.number="translateY" /><span>{{ translateY }}px</span></label>
    </div>
    <div class="controls" v-else-if="selected === 'rotate'">
      <label>角度: <input type="range" min="-360" max="360" v-model.number="rotateDeg" /><span>{{ rotateDeg }}deg</span></label>
    </div>
    <div class="controls" v-else-if="selected === 'scale'">
      <label>缩放X: <input type="range" min="0" max="3" step="0.1" v-model.number="scaleX" /><span>{{ scaleX }}</span></label>
      <label>缩放Y: <input type="range" min="0" max="3" step="0.1" v-model.number="scaleY" /><span>{{ scaleY }}</span></label>
    </div>
    <div class="controls" v-else-if="selected === 'skew'">
      <label>倾斜X: <input type="range" min="-60" max="60" v-model.number="skewX" /><span>{{ skewX }}deg</span></label>
      <label>倾斜Y: <input type="range" min="-60" max="60" v-model.number="skewY" /><span>{{ skewY }}deg</span></label>
    </div>
    <div class="controls" v-else>
      <label>X: <input type="range" min="-100" max="100" v-model.number="translateX" /><span>{{ translateX }}px</span></label>
      <label>角度: <input type="range" min="-180" max="180" v-model.number="rotateDeg" /><span>{{ rotateDeg }}deg</span></label>
      <label>缩放: <input type="range" min="0.2" max="2" step="0.1" v-model.number="scaleX" /><span>{{ scaleX }}</span></label>
    </div>

    <div class="status-bar">{{ description }}</div>
    <div class="actions">
      <button class="reset-btn" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.transform-demo {
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
  border-color: #8b5cf6;
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}

.preview {
  position: relative;
  height: 180px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.origin-box {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 2px dashed var(--vp-c-text-3);
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.transformed-box {
  width: 80px;
  height: 80px;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.1);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #8b5cf6;
  transition: transform 0.2s ease;
  z-index: 1;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.controls input[type="range"] {
  width: 120px;
}

.controls span {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  min-width: 60px;
  color: #8b5cf6;
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

.reset-btn {
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
  .preview { height: 140px; }
  .controls { flex-direction: column; }
}
</style>
