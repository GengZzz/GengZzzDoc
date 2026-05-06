<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

const stages = [
  { title: 'public/index.php', tag: '入口', note: '加载 Composer autoload，创建应用实例，把请求交给 HTTP Kernel。' },
  { title: 'Bootstrap', tag: '启动', note: '加载配置、环境、异常处理和服务提供者，准备容器能力。' },
  { title: 'Global Middleware', tag: '全局', note: '处理 CORS、代理、维护模式、字符串清理等跨请求能力。' },
  { title: 'Route Match', tag: '路由', note: '根据 method、path、domain、prefix 定位路由和控制器。' },
  { title: 'Route Middleware', tag: '路由组', note: '执行认证、授权、限流、租户、签名校验等规则。' },
  { title: 'Controller / Action', tag: '业务入口', note: '接收已校验输入，调用应用服务，返回 Resource 或 Response。' },
  { title: 'Response', tag: '回程', note: '中间件回程可追加 header、日志和响应包装，最终发送给客户端。' },
  { title: 'Terminate', tag: '收尾', note: '响应发送后执行轻量收尾逻辑，重任务应进入队列。' },
]

const active = computed(() => stages[step.value])
const progress = computed(() => `${(step.value / (stages.length - 1)) * 100}%`)

function next() {
  step.value = (step.value + 1) % stages.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="framework-demo">
    <div class="flow-line">
      <span :style="{ width: progress }" />
    </div>
    <div class="stage-grid">
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="stage-card"
        :class="{ active: step === index, done: step > index }"
      >
        <b>{{ index + 1 }}</b>
        <strong>{{ stage.title }}</strong>
        <small>{{ stage.tag }}</small>
      </div>
    </div>
    <div class="detail">
      <span>当前阶段</span>
      <h4>{{ active.title }}</h4>
      <p>{{ active.note }}</p>
    </div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.framework-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.flow-line {
  height: 3px;
  margin: 4px 10px 16px;
  border-radius: 999px;
  background: var(--vp-c-border);
}

.flow-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--vp-c-brand-1);
  transition: width 0.28s ease;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.stage-card {
  min-height: 94px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.stage-card.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.stage-card.done {
  opacity: 0.78;
}

.stage-card b,
.stage-card strong,
.stage-card small {
  display: block;
}

.stage-card b {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
}

.stage-card strong {
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.stage-card small {
  margin-top: 6px;
  font-size: 12px;
}

.detail {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.detail span {
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
}

.detail h4 {
  margin: 4px 0;
  color: var(--vp-c-text-1);
}

.detail p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.7;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.actions button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff;
  cursor: pointer;
}

.actions button + button {
  background: transparent;
  color: var(--vp-c-brand-1);
}

@media (max-width: 720px) {
  .stage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
