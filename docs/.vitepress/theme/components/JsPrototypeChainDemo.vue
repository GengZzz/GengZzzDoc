<script setup lang="ts">
import { computed, ref } from 'vue'

const selected = ref<'person' | 'student' | 'access'>('person')

const personProto = {
  label: 'Person.prototype',
  members: ['constructor', 'sayHello()'],
  description: '所有 Person 实例共享的方法'
}

const studentProto = {
  label: 'Student.prototype',
  members: ['constructor', 'study()'],
  description: 'Student 特有方法，__proto__ 指向 Person.prototype'
}

const instance = {
  label: 'alice (实例)',
  members: ['name: "Alice"', 'age: 20', 'grade: "A"'],
  description: '实例的 __proto__ 指向 Student.prototype'
}

const accessChain = [
  { step: 1, target: 'alice.name', found: true, location: '实例自身' },
  { step: 2, target: 'alice.grade', found: true, location: '实例自身' },
  { step: 3, target: 'alice.study()', found: true, location: 'Student.prototype' },
  { step: 4, target: 'alice.sayHello()', found: true, location: 'Person.prototype' },
  { step: 5, target: 'alice.toString()', found: true, location: 'Object.prototype' },
  { step: 6, target: 'alice.xyz', found: false, location: '查找到头，返回 undefined' }
]

const activeStep = ref(0)

const description = computed(() => {
  if (selected.value === 'person') {
    return 'Person.prototype：所有 Person 实例共享的原型对象，包含 constructor 和 sayHello 方法'
  }
  if (selected.value === 'student') {
    return 'Student.prototype：继承自 Person.prototype，添加 study 方法'
  }
  if (activeStep.value === 0) {
    return 'alice 实例：点击不同步骤观察属性查找过程'
  }
  return accessChain[activeStep.value - 1].found
    ? `${accessChain[activeStep.value - 1].target} → 在 ${accessChain[activeStep.value - 1].location} 中找到`
    : `${accessChain[activeStep.value - 1].target} → ${accessChain[activeStep.value - 1].location}`
})

function selectNode(node: 'person' | 'student' | 'access') {
  selected.value = node
  if (node !== 'access') {
    activeStep.value = 0
  }
}
</script>

<template>
  <div class="proto-demo">
    <div class="chain-visual">
      <div class="node-row">
        <div
          class="node"
          :class="{ active: selected === 'access' }"
          @click="selectNode('access')"
        >
          <div class="node-label">alice</div>
          <div class="node-type">实例</div>
        </div>
        <div class="arrow-right">→</div>
        <div
          class="node"
          :class="{ active: selected === 'student' }"
          @click="selectNode('student')"
        >
          <div class="node-label">Student.prototype</div>
          <div class="node-type">原型</div>
        </div>
        <div class="arrow-right">→</div>
        <div
          class="node"
          :class="{ active: selected === 'person' }"
          @click="selectNode('person')"
        >
          <div class="node-label">Person.prototype</div>
          <div class="node-type">原型</div>
        </div>
        <div class="arrow-right">→</div>
        <div class="node">
          <div class="node-label">Object.prototype</div>
          <div class="node-type">原型</div>
        </div>
        <div class="arrow-right">→</div>
        <div class="node null-node">
          <div class="node-label">null</div>
          <div class="node-type">终点</div>
        </div>
      </div>
    </div>

    <div class="detail-panel">
      <div v-if="selected === 'person'">
        <h4>{{ personProto.label }}</h4>
        <div class="member-list">
          <div v-for="m in personProto.members" :key="m" class="member">{{ m }}</div>
        </div>
        <p class="detail-desc">{{ personProto.description }}</p>
      </div>
      <div v-else-if="selected === 'student'">
        <h4>{{ studentProto.label }}</h4>
        <div class="member-list">
          <div v-for="m in studentProto.members" :key="m" class="member">{{ m }}</div>
        </div>
        <p class="detail-desc">{{ studentProto.description }}</p>
      </div>
      <div v-else>
        <h4>{{ instance.label }}</h4>
        <div class="member-list">
          <div v-for="m in instance.members" :key="m" class="member">{{ m }}</div>
        </div>
        <div class="access-steps">
          <h5>属性查找过程</h5>
          <div
            v-for="s in accessChain"
            :key="s.step"
            class="access-step"
            :class="{ active: activeStep === s.step, found: s.found, 'not-found': !s.found }"
            @click="activeStep = s.step"
          >
            <span class="step-num">{{ s.step }}</span>
            <span class="step-target">{{ s.target }}</span>
            <span class="step-location">{{ s.location }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="status-bar">{{ description }}</div>
  </div>
</template>

<style scoped>
.proto-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.chain-visual {
  overflow-x: auto;
  padding-bottom: 8px;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.node {
  padding: 10px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.node:hover {
  border-color: #8b5cf6;
}

.node.active {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.08);
}

.null-node {
  opacity: 0.5;
  cursor: default;
}

.node-label {
  font-weight: 600;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
}

.node-type {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 2px;
}

.arrow-right {
  color: var(--vp-c-text-3);
  font-size: 16px;
  flex-shrink: 0;
}

.detail-panel {
  margin-top: 14px;
}

.detail-panel h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-family: var(--vp-font-family-mono);
}

.detail-panel h5 {
  margin: 12px 0 6px;
  font-size: 13px;
}

.member-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.member {
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: #8b5cf6;
}

.detail-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.access-steps {
  margin-top: 4px;
}

.access-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin-top: 4px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.access-step:hover {
  border-color: #8b5cf6;
}

.access-step.active.found {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.access-step.active.not-found {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.step-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--vp-c-text-3);
  color: var(--vp-c-bg);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.access-step.active .step-num {
  background: var(--vp-c-text-1);
}

.step-target {
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  color: var(--vp-c-text-1);
  min-width: 120px;
}

.step-location {
  color: var(--vp-c-text-2);
  font-size: 11px;
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

@media (max-width: 560px) {
  .node-row { flex-direction: column; }
  .arrow-right { transform: rotate(90deg); }
}
</style>
