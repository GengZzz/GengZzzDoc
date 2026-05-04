<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

interface MethodInfo {
  name: string
  body: string
  active: boolean
}

const currentAnimal = computed(() => {
  if (step.value <= 3) return 'dog'
  return 'cat'
})

const referenceName = 'Animal animal'

const objects = computed(() => {
  if (step.value < 3) return []
  if (currentAnimal.value === 'dog') {
    return [{ type: 'Dog', name: 'Buddy', highlight: step.value === 3 }]
  }
  if (step.value === 4) {
    return [
      { type: 'Dog', name: 'Buddy', highlight: false },
      { type: 'Cat', name: 'Whiskers', highlight: true },
    ]
  }
  if (step.value === 5) {
    return [
      { type: 'Dog', name: 'Buddy', highlight: false },
      { type: 'Cat', name: 'Whiskers', highlight: true },
    ]
  }
  return []
})

const dogMethods = computed<MethodInfo[]>(() => {
  const active = step.value === 3 || step.value === 5 && currentAnimal.value === 'dog'
  return [
    { name: 'speak()', body: 'print "Woof!"', active: active && currentAnimal.value === 'dog' },
  ]
})

const catMethods = computed<MethodInfo[]>(() => {
  const active = (step.value === 4 || step.value === 5) && currentAnimal.value === 'cat'
  return [
    { name: 'speak()', body: 'print "Meow!"', active },
  ]
})

const snippet = computed(() => {
  if (step.value === 1) return 'Animal animal = new Dog("Buddy");'
  if (step.value === 2 || step.value === 3) return 'animal.speak();'
  if (step.value === 4) return 'animal = new Cat("Whiskers");'
  if (step.value === 5) return 'animal.speak();'
  return ''
})

const explanation = computed(() => {
  if (step.value === 1) return '父类引用指向子类对象'
  if (step.value === 2) return '调用 speak() 方法'
  if (step.value === 3) return '运行时确定：实际调用的是 Dog.speak()'
  if (step.value === 4) return '同一引用变量，重新指向 Cat 对象'
  if (step.value === 5) return '同一个变量，不同的行为'
  return ''
})

const dispatchTarget = computed(() => {
  if (step.value === 3) return 'dog'
  if (step.value === 5) return currentAnimal.value
  return null
})

function next() {
  step.value = (step.value + 1) % 6
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="poly-demo">
    <div v-if="step === 0" class="empty-state">
      点击"下一步"观察多态调用过程
    </div>
    <template v-else>
      <div class="code-snippet">
        <code>{{ snippet }}</code>
      </div>
      <p class="explanation">{{ explanation }}</p>
      <div class="visual">
        <div class="ref-panel">
          <h4>引用变量</h4>
          <div class="ref-box">
            <strong>{{ referenceName }}</strong>
            <span v-if="step >= 3" class="arrow">→</span>
            <span v-if="step >= 3" class="ref-target">
              {{ currentAnimal === 'dog' ? 'Dog' : 'Cat' }} 对象
            </span>
          </div>
        </div>
        <div class="objects-panel">
          <h4>对象 & 方法</h4>
          <div v-if="objects.length === 0" class="empty">暂无对象</div>
          <div
            v-for="obj in objects"
            :key="obj.type"
            class="obj-card"
            :class="{ active: obj.highlight }"
          >
            <div class="obj-title">{{ obj.type }}: {{ obj.name }}</div>
            <div
              v-for="m in (obj.type === 'Dog' ? dogMethods : catMethods)"
              :key="m.name"
              class="method"
              :class="{ dispatched: dispatchTarget === obj.type.toLowerCase() && m.active }"
            >
              <span class="method-name">{{ m.name }}</span>
              <span class="method-body">{{ m.body }}</span>
              <span
                v-if="dispatchTarget === obj.type.toLowerCase() && m.active"
                class="dispatch-tag"
              >
                ← 实际调用
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.poly-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.empty-state {
  min-height: 80px;
  display: grid;
  place-items: center;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.code-snippet {
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
}

.code-snippet code {
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.explanation {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.visual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.ref-panel {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.ref-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #8b5cf6;
  border-radius: 6px;
  color: #8b5cf6;
  font-size: 13px;
}

.arrow {
  font-size: 16px;
}

.ref-target {
  color: #f59e0b;
  font-size: 12px;
}

.objects-panel {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.empty {
  min-height: 60px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.obj-card {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  margin-top: 8px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.obj-card.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.obj-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
}

.method {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  transition: background 0.3s ease;
}

.method.dispatched {
  background: var(--vp-c-brand-soft);
}

.method-name {
  font-weight: 600;
}

.method-body {
  color: var(--vp-c-text-2);
}

.dispatch-tag {
  font-size: 11px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
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

@media (max-width: 560px) {
  .visual {
    grid-template-columns: 1fr;
  }
}
</style>
