<script setup lang="ts">
import { ref } from 'vue'

const mode = ref<'esm' | 'cjs'>('esm')
</script>

<template>
  <div class="module-demo">
    <div class="switcher">
      <button :class="{ active: mode === 'esm' }" type="button" @click="mode = 'esm'">ESM</button>
      <button :class="{ active: mode === 'cjs' }" type="button" @click="mode = 'cjs'">CommonJS</button>
    </div>
    <div class="pipeline" :class="mode">
      <div class="stage">解析依赖</div>
      <div class="stage">建立模块记录</div>
      <div class="stage">执行模块</div>
      <div class="stage final">{{ mode === 'esm' ? 'live binding' : 'exports 快照/对象' }}</div>
    </div>
    <p>{{ mode === 'esm' ? 'ESM 先静态分析依赖，再执行模块，导出是实时绑定。' : 'CommonJS 在运行时 require，首次执行后缓存 module.exports。' }}</p>
  </div>
</template>

<style scoped>
.module-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stage {
  position: relative;
  min-height: 64px;
  display: grid;
  place-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
  font-size: 13px;
}

.stage::after {
  position: absolute;
  right: -12px;
  content: ">";
  color: var(--vp-c-text-3);
}

.stage.final::after {
  content: "";
}

.esm .stage {
  border-color: rgba(16, 185, 129, .5);
  animation: module-flow 1.6s ease-in-out infinite;
}

.cjs .stage {
  border-color: rgba(245, 158, 11, .55);
  animation: module-flow 1.6s ease-in-out infinite;
}

p {
  margin: 12px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

@keyframes module-flow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@media (max-width: 720px) {
  .pipeline { grid-template-columns: 1fr; }
  .stage::after { content: ""; }
}
</style>
