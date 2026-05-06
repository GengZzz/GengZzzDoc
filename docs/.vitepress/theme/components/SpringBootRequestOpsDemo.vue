<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

const nodes = [
  { title: '内嵌容器', tag: 'Tomcat / Jetty', note: '监听端口、接收连接、解析 HTTP 请求。' },
  { title: 'DispatcherServlet', tag: 'MVC front controller', note: '查找 HandlerMapping，执行拦截器和参数绑定。' },
  { title: 'Controller', tag: '@RestController', note: '调用业务服务，返回对象、状态码或异常。' },
  { title: '响应写回', tag: 'HttpMessageConverter', note: 'JSON 序列化，交给容器写回客户端。' },
  { title: 'Actuator 观测', tag: 'health / metrics', note: '同一运行时暴露健康、指标、info、日志级别等端点。' },
]

const active = computed(() => nodes[step.value])

const metrics = computed(() => ({
  requests: step.value >= 1 ? 1284 + step.value * 17 : 1284,
  latency: step.value >= 3 ? 42 : 18 + step.value * 6,
  health: step.value >= 4 ? 'UP' : 'READY',
}))

function next() {
  step.value = (step.value + 1) % nodes.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="ops-demo">
    <div class="request-line">
      <span class="method">GET</span>
      <code>/api/orders/1001</code>
    </div>

    <div class="flow">
      <template v-for="(node, index) in nodes" :key="node.title">
        <div class="node" :class="{ active: step === index, done: step > index }">
          <span class="node-tag">{{ node.tag }}</span>
          <strong>{{ node.title }}</strong>
        </div>
        <div v-if="index < nodes.length - 1" class="arrow" :class="{ active: step > index }">→</div>
      </template>
    </div>

    <div class="detail-grid">
      <div class="runtime-card">
        <div class="card-title">{{ active.title }}</div>
        <p>{{ active.note }}</p>
      </div>
      <div class="runtime-card metrics">
        <div class="metric-row">
          <span>http.server.requests</span>
          <strong>{{ metrics.requests }}</strong>
        </div>
        <div class="metric-row">
          <span>p95 latency</span>
          <strong>{{ metrics.latency }}ms</strong>
        </div>
        <div class="metric-row">
          <span>health</span>
          <strong :class="{ up: step >= 4 }">{{ metrics.health }}</strong>
        </div>
      </div>
    </div>

    <div class="actuator-strip" :class="{ active: step >= 4 }">
      <span>/actuator/health</span>
      <span>/actuator/metrics</span>
      <span>/actuator/loggers</span>
    </div>

    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.ops-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.request-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.method {
  padding: 3px 8px;
  border-radius: 4px;
  background: #16a34a;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.request-line code {
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  word-break: break-all;
}

.flow {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.node {
  min-width: 132px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
}

.node.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.node.done {
  opacity: 0.82;
}

.node-tag {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 11px;
  line-height: 1.35;
}

.node strong {
  display: block;
  margin-top: 4px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.arrow {
  display: grid;
  place-items: center;
  flex: 0 0 20px;
  color: var(--vp-c-border);
  font-size: 20px;
  transition: color 0.25s ease;
}

.arrow.active {
  color: var(--vp-c-brand-1);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.runtime-card {
  min-height: 112px;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.runtime-card p {
  margin: 6px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.metric-row strong {
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.metric-row strong.up {
  color: #16a34a;
}

.actuator-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  opacity: 0.55;
  transition: opacity 0.25s ease;
}

.actuator-strip.active {
  opacity: 1;
}

.actuator-strip span {
  padding: 5px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
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

@media (max-width: 640px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .node {
    min-width: 120px;
  }
}
</style>
