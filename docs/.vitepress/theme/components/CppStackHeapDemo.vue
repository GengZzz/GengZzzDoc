<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

const stackFrames = computed(() => {
  if (step.value === 0) return ['main()']
  if (step.value === 1) return ['main()', 'createUser()']
  if (step.value === 2) return ['main()', 'createUser()', 'age = 18']
  return ['main()']
})

const heapBlocks = computed(() => {
  if (step.value < 2) return []
  if (step.value === 2) return ['new User']
  return ['悬空风险：指针还在，资源已释放']
})

function next() {
  step.value = (step.value + 1) % 4
}
</script>

<template>
  <div class="memory-demo">
    <div class="memory-panels">
      <section>
        <h4>栈 stack</h4>
        <div class="block" v-for="frame in stackFrames" :key="frame">{{ frame }}</div>
      </section>
      <section>
        <h4>堆 heap</h4>
        <div v-if="heapBlocks.length === 0" class="empty">暂无动态资源</div>
        <div class="block heap" v-for="block in heapBlocks" :key="block">{{ block }}</div>
      </section>
    </div>
    <p>
      第 {{ step + 1 }} 步：
      <span v-if="step === 0">程序从 main 开始。</span>
      <span v-else-if="step === 1">函数调用会压入栈。</span>
      <span v-else-if="step === 2">局部变量在栈上，new 出来的对象在堆上。</span>
      <span v-else>函数返回后栈帧消失，堆资源需要正确释放。</span>
    </p>
    <button type="button" @click="next">下一步</button>
  </div>
</template>

<style scoped>
.memory-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.memory-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

h4 {
  margin: 0 0 8px;
}

.block,
.empty {
  min-height: 36px;
  display: grid;
  place-items: center;
  margin-top: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.heap {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.empty {
  color: var(--vp-c-text-2);
  border-style: dashed;
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
  .memory-panels {
    grid-template-columns: 1fr;
  }
}
</style>
