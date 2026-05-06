<script setup lang="ts">
import { computed, ref } from 'vue'

const current = ref(0)

const stages = [
  { name: '入口文件', detail: 'public/index.php 接收请求' },
  { name: '应用初始化', detail: '加载配置、服务、路由' },
  { name: '路由匹配', detail: '匹配 path、method、参数' },
  { name: '中间件前置', detail: '认证、限流、租户、CORS' },
  { name: '控制器', detail: '校验输入并调用服务' },
  { name: '模型/服务', detail: '查询、事务、业务流程' },
  { name: '响应返回', detail: 'JSON、模板、重定向' },
  { name: '中间件回程', detail: '日志、header、收尾' },
]

const active = computed(() => stages[current.value])

function next() {
  current.value = (current.value + 1) % stages.length
}
</script>

<template>
  <div class="tp-demo">
    <div class="pipeline">
      <div
        v-for="(stage, index) in stages"
        :key="stage.name"
        class="node"
        :class="{ active: current === index, done: current > index }"
      >
        <span>{{ index + 1 }}</span>
        <strong>{{ stage.name }}</strong>
      </div>
    </div>
    <div class="detail">
      <h4>{{ active.name }}</h4>
      <p>{{ active.detail }}</p>
    </div>
    <button type="button" @click="next">下一步</button>
  </div>
</template>

<style scoped>
.tp-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.node {
  min-height: 84px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.node.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.node.done {
  opacity: 0.78;
}

.node span {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
}

.node strong {
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.detail {
  margin: 12px 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.detail h4 {
  margin: 0 0 4px;
}

.detail p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff;
  cursor: pointer;
}

@media (max-width: 720px) {
  .pipeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
