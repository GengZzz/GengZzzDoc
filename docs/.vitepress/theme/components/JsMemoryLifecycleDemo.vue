<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const states = [
  { refs: ['user'], removed: false, desc: '变量 user 指向堆对象，对象可达。' },
  { refs: ['user', 'listener'], removed: false, desc: '事件监听器闭包也引用对象，引用路径增加。' },
  { refs: ['user', 'listener', 'timer'], removed: false, desc: '定时器引用回调，回调继续引用对象。' },
  { refs: ['listener', 'timer'], removed: true, desc: '把 user 设为 null 后，对象仍可从监听器和定时器到达。' },
  { refs: [], removed: true, desc: '清理监听器和定时器后，对象不可达，等待 GC 回收。' }
]

const current = computed(() => states[step.value])
const reachable = computed(() => current.value.refs.length > 0)

function next() {
  step.value = (step.value + 1) % states.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="memory-demo">
    <div class="memory-grid">
      <section>
        <h4>引用路径</h4>
        <div class="ref" :class="{ active: current.refs.includes('user'), removed: current.removed }">user 变量</div>
        <div class="ref" :class="{ active: current.refs.includes('listener') }">click listener</div>
        <div class="ref" :class="{ active: current.refs.includes('timer') }">setInterval callback</div>
      </section>

      <section>
        <h4>堆对象</h4>
        <div class="object" :class="{ unreachable: !reachable }">
          <strong>{ name: "Alice" }</strong>
          <span>{{ reachable ? 'reachable' : 'unreachable' }}</span>
        </div>
      </section>

      <section>
        <h4>GC 结论</h4>
        <div class="decision" :class="{ collect: !reachable }">
          {{ reachable ? '保留：仍有引用路径' : '可回收：无引用路径' }}
        </div>
      </section>
    </div>

    <div class="status">{{ current.desc }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.memory-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.memory-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

section {
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.ref,
.object,
.decision {
  min-height: 42px;
  display: grid;
  place-items: center;
  margin-top: 8px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  color: var(--vp-c-text-2);
  text-align: center;
  font-size: 13px;
}

.ref.active {
  border-style: solid;
  border-color: #38bdf8;
  color: #0284c7;
  background: rgba(56, 189, 248, .08);
}

.ref.removed {
  text-decoration: line-through;
  opacity: .45;
}

.object {
  min-height: 132px;
  border-style: solid;
  border-color: #f59e0b;
}

.object strong {
  font-family: var(--vp-font-family-mono);
  color: #d97706;
}

.object span {
  color: var(--vp-c-text-2);
}

.object.unreachable {
  border-color: #10b981;
  background: rgba(16, 185, 129, .08);
}

.object.unreachable strong {
  color: #059669;
}

.decision {
  min-height: 132px;
  border-style: solid;
  border-color: #f59e0b;
  color: #d97706;
  font-weight: 700;
}

.decision.collect {
  border-color: #10b981;
  color: #059669;
  background: rgba(16, 185, 129, .08);
}

.status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
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

@media (max-width: 720px) {
  .memory-grid { grid-template-columns: 1fr; }
}
</style>
