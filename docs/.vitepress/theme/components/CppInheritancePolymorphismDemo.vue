<script setup lang="ts">
import { ref } from 'vue'

const selectedClass = ref<'Animal' | 'Dog' | 'Cat'>('Animal')
const classes = {
  Animal: {
    name: 'Animal',
    color: '#6b7280',
    members: ['name: string', 'eat(): void', 'speak(): void'],
    speakText: '动物发出声音'
  },
  Dog: {
    name: 'Dog',
    color: '#3b82f6',
    members: ['(继承) name: string', '(继承) eat(): void', 'bark(): void', 'speak(): 汪汪'],
    speakText: '汪汪'
  },
  Cat: {
    name: 'Cat',
    color: '#10b981',
    members: ['(继承) name: string', '(继承) eat(): void', 'meow(): void', 'speak(): 喵喵'],
    speakText: '喵喵'
  }
}

function selectClass(name: 'Animal' | 'Dog' | 'Cat') {
  selectedClass.value = name
}
</script>

<template>
  <div class="inheritance-demo">
    <div class="class-diagram">
      <div class="level">
        <button
          type="button"
          class="class-box base"
          :class="{ active: selectedClass === 'Animal' }"
          @click="selectClass('Animal')"
        >
          <strong>Animal</strong>
          <span>基类</span>
        </button>
      </div>
      <div class="arrow">▲ 继承</div>
      <div class="level">
        <button
          type="button"
          class="class-box"
          :class="{ active: selectedClass === 'Dog' }"
          @click="selectClass('Dog')"
        >
          <strong>Dog</strong>
          <span>子类</span>
        </button>
        <button
          type="button"
          class="class-box"
          :class="{ active: selectedClass === 'Cat' }"
          @click="selectClass('Cat')"
        >
          <strong>Cat</strong>
          <span>子类</span>
        </button>
      </div>
    </div>
    <div class="class-detail">
      <div class="detail-header">
        <strong :style="{ color: classes[selectedClass].color }">{{ selectedClass }} 类成员</strong>
      </div>
      <ul>
        <li v-for="member in classes[selectedClass].members" :key="member">{{ member }}</li>
      </ul>
      <div class="demo-call">
        <code>shape.speak()</code> → 
        <strong :style="{ color: classes[selectedClass].color }">{{ classes[selectedClass].speakText }}</strong>
      </div>
      <p class="hint">
        <span v-if="selectedClass === 'Animal'">基类定义虚函数，子类override重写实现</span>
        <span v-else>通过父类指针调用时，会触发多态</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.inheritance-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.class-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.level {
  display: flex;
  gap: 12px;
}

.arrow {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.class-box {
  min-width: 72px;
  padding: 10px 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.class-box strong {
  display: block;
  font-size: 14px;
}

.class-box span {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.class-box.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}

.class-box.base {
  background: var(--vp-c-bg-soft);
}

.class-detail {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.detail-header {
  margin-bottom: 8px;
  font-size: 14px;
}

.class-detail ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.class-detail li {
  margin-top: 4px;
}

.demo-call {
  margin-top: 12px;
  padding: 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}

.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

@media (max-width: 560px) {
  .inheritance-demo {
    grid-template-columns: 1fr;
  }
}
</style>