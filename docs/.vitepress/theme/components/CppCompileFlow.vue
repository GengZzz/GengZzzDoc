<script setup lang="ts">
import { computed, ref } from 'vue'

const steps = [
  { title: '源码', desc: '写在 .cpp 文件里的文本' },
  { title: '编译', desc: '检查语法，翻译成目标文件' },
  { title: '链接', desc: '把标准库和自己的代码合在一起' },
  { title: '运行', desc: '操作系统启动可执行程序' }
]

const active = ref(0)
const activeStep = computed(() => steps[active.value])

function next() {
  active.value = (active.value + 1) % steps.length
}
</script>

<template>
  <div class="cpp-demo">
    <div class="cpp-demo-steps">
      <button
        v-for="(step, index) in steps"
        :key="step.title"
        class="cpp-demo-step"
        :class="{ active: index === active }"
        type="button"
        @click="active = index"
      >
        {{ step.title }}
      </button>
    </div>
    <p class="cpp-demo-desc">{{ activeStep.desc }}</p>
    <button class="cpp-demo-action" type="button" @click="next">下一步</button>
  </div>
</template>

<style scoped>
.cpp-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.cpp-demo-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.cpp-demo-step,
.cpp-demo-action {
  min-height: 36px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.cpp-demo-step.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.cpp-demo-desc {
  margin: 14px 0;
  color: var(--vp-c-text-2);
}

@media (max-width: 520px) {
  .cpp-demo-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
