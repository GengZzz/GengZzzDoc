<script setup lang="ts">
import { computed, ref } from 'vue'

const index = ref(0)
const cases = [
  {
    call: 'obj.greet()',
    rule: '隐式绑定',
    target: 'obj',
    reason: '调用点左侧有 obj，this 指向这个调用者。'
  },
  {
    call: 'const fn = obj.greet; fn()',
    rule: '默认绑定',
    target: 'undefined / window',
    reason: '函数被赋值后丢失调用者，调用点只剩 fn()。'
  },
  {
    call: 'greet.call(obj)',
    rule: '显式绑定',
    target: 'obj',
    reason: 'call/apply/bind 直接指定 this。'
  },
  {
    call: 'new Person()',
    rule: 'new 绑定',
    target: '新实例',
    reason: 'new 创建对象，并让构造函数中的 this 指向它。'
  },
  {
    call: '() => this.name',
    rule: '词法绑定',
    target: '外层 this',
    reason: '箭头函数没有自己的 this，从定义位置捕获外层 this。'
  }
]

const current = computed(() => cases[index.value])

function next() {
  index.value = (index.value + 1) % cases.length
}
</script>

<template>
  <div class="this-demo">
    <div class="cards">
      <section>
        <span>调用点</span>
        <strong>{{ current.call }}</strong>
      </section>
      <section class="rule">
        <span>匹配规则</span>
        <strong>{{ current.rule }}</strong>
      </section>
      <section class="target">
        <span>this 指向</span>
        <strong>{{ current.target }}</strong>
      </section>
    </div>
    <div class="reason">{{ current.reason }}</div>
    <button type="button" @click="next">切换场景</button>
  </div>
</template>

<style scoped>
.this-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

section {
  min-height: 92px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

span {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

strong {
  display: block;
  margin-top: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
}

.rule {
  border-color: #f59e0b;
}

.rule strong {
  color: #d97706;
}

.target {
  border-color: #10b981;
}

.target strong {
  color: #059669;
}

.reason {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

button {
  min-height: 34px;
  margin-top: 12px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

@media (max-width: 720px) {
  .cards { grid-template-columns: 1fr; }
}
</style>
