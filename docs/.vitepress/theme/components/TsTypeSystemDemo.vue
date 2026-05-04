<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const stages = computed(() => {
  const s = step.value
  return {
    source: s >= 0,
    compiler: s >= 1,
    typeCheck: s >= 2,
    emit: s >= 3,
    output: s >= 4
  }
})

const description = computed(() => {
  const descs = [
    '点击"下一步"观察 TypeScript 编译流程',
    'TypeScript 编译器（tsc）读取 .ts 源文件',
    '编译器进行类型检查，发现类型错误则报错',
    '类型检查通过后，擦除类型注解，生成 .js 文件',
    '最终输出可在浏览器或 Node.js 中运行的 JavaScript'
  ]
  return descs[step.value]
})

const codeSnippet = computed(() => {
  const snippets = [
    `// source.ts\nfunction greet(name: string): string {\n  return "Hello, " + name;\n}`,
    `// tsc 读取 source.ts\n// 解析 AST，提取类型信息`,
    `// 类型检查\n// name: string ✓\n// 返回值: string ✓`,
    `// 擦除类型，生成 source.js\nfunction greet(name) {\n  return "Hello, " + name;\n}`,
    `// node source.js\n// > "Hello, World"`
  ]
  return snippets[step.value]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="ts-type-system-demo">
    <div class="pipeline">
      <div
        v-for="(active, key) in stages"
        :key="key"
        class="stage"
        :class="{ active }"
      >
        <div class="stage-icon">
          {{ key === 'source' ? 'TS' : key === 'compiler' ? 'tsc' : key === 'typeCheck' ? '✓' : key === 'emit' ? 'JS' : '▶' }}
        </div>
        <div class="stage-label">
          {{ key === 'source' ? '源码' : key === 'compiler' ? '编译器' : key === 'typeCheck' ? '类型检查' : key === 'emit' ? '输出' : '运行' }}
        </div>
        <div v-if="active" class="arrow">→</div>
      </div>
    </div>
    <div class="code-area">
      <pre><code>{{ codeSnippet }}</code></pre>
    </div>
    <div class="status-bar">{{ description }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.ts-type-system-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  opacity: 0.4;
  transition: all 0.3s;
}

.stage.active {
  opacity: 1;
  border-color: #3178c6;
  box-shadow: 0 0 8px rgba(49, 120, 198, 0.3);
}

.stage-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #3178c6;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
}

.stage-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.arrow {
  color: #3178c6;
  font-size: 18px;
  font-weight: 700;
}

.code-area {
  margin-top: 12px;
}

.code-area pre {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  overflow-x: auto;
  min-height: 80px;
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
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
</style>
