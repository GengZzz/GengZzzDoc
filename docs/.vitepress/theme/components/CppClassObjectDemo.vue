<script setup lang="ts">
import { ref } from 'vue'

const hp = ref(100)
const log = ref('对象创建：GameRole hero("Ada")')

function attack() {
  hp.value = Math.max(0, hp.value - 20)
  log.value = '调用成员函数：hero.takeDamage(20)'
}

function reset() {
  hp.value = 100
  log.value = '构造函数重新初始化对象状态'
}
</script>

<template>
  <div class="class-demo">
    <div class="object-card">
      <div class="object-title">对象 hero</div>
      <div class="field"><span>name</span><strong>Ada</strong></div>
      <div class="field"><span>hp</span><strong>{{ hp }}</strong></div>
      <div class="hp-bar"><i :style="{ width: hp + '%' }"></i></div>
    </div>
    <p>{{ log }}</p>
    <div class="actions">
      <button type="button" @click="attack">调用成员函数</button>
      <button type="button" @click="reset">重新创建</button>
    </div>
  </div>
</template>

<style scoped>
.class-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.object-card {
  max-width: 320px;
  padding: 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.object-title {
  margin-bottom: 10px;
  font-weight: 700;
}

.field {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.field span {
  color: var(--vp-c-text-2);
}

.hp-bar {
  height: 10px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--vp-c-default-soft);
}

.hp-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--vp-c-brand-1);
  transition: width 0.25s ease;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
</style>
