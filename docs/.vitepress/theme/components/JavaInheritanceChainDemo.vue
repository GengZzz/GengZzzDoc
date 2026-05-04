<script setup lang="ts">
import { ref } from 'vue'

type ClassName = 'Animal' | 'Dog' | 'Cat'

const selected = ref<ClassName>('Animal')

interface ClassInfo {
  name: string
  color: string
  description: string
  fields: { name: string; inherited: boolean }[]
  methods: { name: string; inherited: boolean; overridden: boolean }[]
  speakText: string
}

const classes: Record<ClassName, ClassInfo> = {
  Animal: {
    name: 'Animal',
    color: '#6b7280',
    description: '基类，定义所有动物共有的属性和方法',
    fields: [
      { name: 'String name', inherited: false },
      { name: 'int age', inherited: false }
    ],
    methods: [
      { name: 'void speak()', inherited: false, overridden: false },
      { name: 'void eat()', inherited: false, overridden: false },
      { name: 'String getName()', inherited: false, overridden: false }
    ],
    speakText: '动物发出声音'
  },
  Dog: {
    name: 'Dog',
    color: '#3b82f6',
    description: '继承 Animal，添加品种属性和 fetch 行为',
    fields: [
      { name: 'String name', inherited: true },
      { name: 'int age', inherited: true },
      { name: 'String breed', inherited: false }
    ],
    methods: [
      { name: 'void speak()', inherited: false, overridden: true },
      { name: 'void eat()', inherited: true, overridden: false },
      { name: 'String getName()', inherited: true, overridden: false },
      { name: 'void fetch()', inherited: false, overridden: false }
    ],
    speakText: '汪汪!'
  },
  Cat: {
    name: 'Cat',
    color: '#10b981',
    description: '继承 Animal，区分室内/室外猫',
    fields: [
      { name: 'String name', inherited: true },
      { name: 'int age', inherited: true },
      { name: 'boolean indoor', inherited: false }
    ],
    methods: [
      { name: 'void speak()', inherited: false, overridden: true },
      { name: 'void eat()', inherited: true, overridden: false },
      { name: 'String getName()', inherited: true, overridden: false },
      { name: 'void purr()', inherited: false, overridden: false }
    ],
    speakText: '喵~'
  }
}

function select(name: ClassName) {
  selected.value = name
}
</script>

<template>
  <div class="inheritance-demo">
    <div class="class-diagram">
      <div class="level">
        <button
          type="button"
          class="class-box base"
          :class="{ active: selected === 'Animal' }"
          @click="select('Animal')"
        >
          <strong>Animal</strong>
          <span>基类</span>
        </button>
      </div>
      <div class="connector">
        <div class="line"></div>
        <div class="branches">
          <div class="branch-line"></div>
          <div class="branch-line"></div>
        </div>
      </div>
      <div class="level">
        <button
          type="button"
          class="class-box"
          :class="{ active: selected === 'Dog' }"
          @click="select('Dog')"
        >
          <strong>Dog</strong>
          <span>子类</span>
        </button>
        <button
          type="button"
          class="class-box"
          :class="{ active: selected === 'Cat' }"
          @click="select('Cat')"
        >
          <strong>Cat</strong>
          <span>子类</span>
        </button>
      </div>
    </div>
    <div class="class-detail">
      <div class="detail-header">
        <strong :style="{ color: classes[selected].color }">{{ selected }}</strong>
        <span class="desc">{{ classes[selected].description }}</span>
      </div>
      <div class="member-section">
        <div class="section-title">字段 Fields</div>
        <ul>
          <li
            v-for="f in classes[selected].fields"
            :key="f.name"
            :class="{ inherited: f.inherited }"
          >
            <span v-if="f.inherited" class="tag">继承</span>
            <span :class="{ own: !f.inherited }">{{ f.name }}</span>
          </li>
        </ul>
      </div>
      <div class="member-section">
        <div class="section-title">方法 Methods</div>
        <ul>
          <li
            v-for="m in classes[selected].methods"
            :key="m.name"
            :class="{ inherited: m.inherited }"
          >
            <span v-if="m.overridden" class="tag override">@Override</span>
            <span v-else-if="m.inherited" class="tag">继承</span>
            <span :class="{ own: !m.inherited }">{{ m.name }}</span>
          </li>
        </ul>
      </div>
      <div class="demo-call">
        <code>animal.speak()</code> &rarr;
        <strong :style="{ color: classes[selected].color }">{{ classes[selected].speakText }}</strong>
      </div>
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
  gap: 4px;
}

.level {
  display: flex;
  gap: 12px;
}

.connector {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.line {
  width: 2px;
  height: 16px;
  background: var(--vp-c-border);
}

.branches {
  display: flex;
  width: 160px;
  justify-content: space-between;
}

.branch-line {
  width: 2px;
  height: 16px;
  background: var(--vp-c-border);
}

.class-box {
  min-width: 80px;
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
  margin-bottom: 10px;
  font-size: 14px;
}

.detail-header strong {
  font-size: 16px;
}

.desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.member-section {
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.class-detail ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.class-detail li {
  margin-top: 3px;
}

.class-detail li.inherited {
  color: var(--vp-c-text-2);
}

.own {
  font-weight: 700;
}

.tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  margin-right: 4px;
  vertical-align: middle;
}

.tag.override {
  background: #fef3c7;
  color: #92400e;
}

.demo-call {
  margin-top: 12px;
  padding: 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}

@media (max-width: 560px) {
  .inheritance-demo {
    grid-template-columns: 1fr;
  }
}
</style>
