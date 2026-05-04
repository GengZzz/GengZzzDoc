<script setup lang="ts">
import { ref } from 'vue'

type Tab = 'abstract' | 'interface'

const selected = ref<Tab>('abstract')

const tabs: Record<Tab, {
  title: string
  color: string
  allows: string[]
  inheritance: string
  scenario: string
  code: string
}> = {
  abstract: {
    title: '抽象类 Abstract Class',
    color: '#8b5cf6',
    allows: [
      '构造器 (constructor)',
      '实例字段 (instance fields)',
      '静态字段 (static fields)',
      '具体方法 (concrete methods)',
      '抽象方法 (abstract methods)',
      'static 方法'
    ],
    inheritance: '单继承 (extends)',
    scenario: '有共同状态和行为的类族，如 AbstractList',
    code: 'abstract class Shape {\n  protected String color;\n  abstract double area();\n  void setColor(String c) { this.color = c; }\n}'
  },
  interface: {
    title: '接口 Interface',
    color: '#f59e0b',
    allows: [
      '常量 (constants)',
      '抽象方法 (abstract methods)',
      'default 方法 (Java 8+)',
      'static 方法 (Java 8+)',
      'private 方法 (Java 9+)'
    ],
    inheritance: '多实现 (implements)',
    scenario: '定义行为契约，如 Comparable, Serializable',
    code: 'interface Drawable {\n  void draw();\n  default void clear() {\n    System.out.println("cleared");\n  }\n}'
  }
}

const tableRows = [
  {
    label: '字段',
    abstract: '实例字段、静态字段',
    interface: '仅 public static final 常量',
    diff: true
  },
  {
    label: '构造器',
    abstract: '可以有构造器',
    interface: '不能有构造器',
    diff: true
  },
  {
    label: '方法实现',
    abstract: '可以有具体方法和抽象方法',
    interface: '默认全部抽象 (Java 8 前)',
    diff: true
  },
  {
    label: '继承关系',
    abstract: '单继承 extends',
    interface: '多实现 implements',
    diff: true
  },
  {
    label: '默认方法',
    abstract: '所有方法天然可有实现',
    interface: 'default 方法 (Java 8+)',
    diff: true
  },
  {
    label: '使用场景',
    abstract: '有共同状态和行为的类族',
    interface: '定义行为契约',
    diff: false
  }
]

function select(tab: Tab) {
  selected.value = tab
}
</script>

<template>
  <div class="interface-demo">
    <div class="card-row">
      <button
        type="button"
        class="card"
        :class="{ active: selected === 'abstract' }"
        @click="select('abstract')"
      >
        <div class="card-title" :style="{ color: tabs.abstract.color }">抽象类 Abstract Class</div>
        <div class="card-sub">extends 单继承</div>
      </button>
      <button
        type="button"
        class="card"
        :class="{ active: selected === 'interface' }"
        @click="select('interface')"
      >
        <div class="card-title" :style="{ color: tabs.interface.color }">接口 Interface</div>
        <div class="card-sub">implements 多实现</div>
      </button>
    </div>
    <div class="detail-panel">
      <div class="detail-header">
        <strong :style="{ color: tabs[selected].color }">{{ tabs[selected].title }}</strong>
      </div>
      <div class="detail-section">
        <div class="section-title">可以包含</div>
        <ul>
          <li v-for="item in tabs[selected].allows" :key="item">{{ item }}</li>
        </ul>
      </div>
      <div class="detail-section">
        <div class="section-title">继承规则</div>
        <p>{{ tabs[selected].inheritance }}</p>
      </div>
      <div class="detail-section">
        <div class="section-title">使用场景</div>
        <p>{{ tabs[selected].scenario }}</p>
      </div>
      <div class="code-block">
        <pre><code>{{ tabs[selected].code }}</code></pre>
      </div>
    </div>
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th>对比项</th>
            <th>抽象类</th>
            <th>接口</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.label" :class="{ highlight: row.diff }">
            <td class="row-label">{{ row.label }}</td>
            <td>{{ row.abstract }}</td>
            <td>{{ row.interface }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.interface-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.card-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.card {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.card.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
}

.card-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.detail-panel {
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

.detail-section {
  margin-bottom: 10px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.detail-panel ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.detail-panel li {
  margin-top: 3px;
}

.detail-panel p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.code-block {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
}

.code-block code {
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.comparison-table th,
.comparison-table td {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-border);
  text-align: left;
}

.comparison-table th {
  background: var(--vp-c-bg);
  font-weight: 600;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.comparison-table td {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.comparison-table .row-label {
  font-weight: 600;
  white-space: nowrap;
}

.comparison-table tr.highlight td {
  background: var(--vp-c-bg-soft);
}

@media (max-width: 480px) {
  .card-row {
    grid-template-columns: 1fr;
  }

  .comparison-table {
    overflow-x: auto;
  }
}
</style>
