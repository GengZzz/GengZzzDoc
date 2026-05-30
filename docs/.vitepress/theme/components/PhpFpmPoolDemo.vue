<script setup lang="ts">
import { computed, ref } from 'vue';

const step = ref(0);
const totalSteps = 6;

const workers = computed(() => {
  const list = [
    { id: 1, state: 'idle', mem: 48 },
    { id: 2, state: 'idle', mem: 52 },
    { id: 3, state: 'idle', mem: 50 },
    { id: 4, state: 'idle', mem: 49 },
    { id: 5, state: 'idle', mem: 55 },
  ];
  if (step.value >= 1) list[0].state = 'busy';
  if (step.value >= 2) list[1].state = 'busy';
  if (step.value >= 3) list[2].state = 'busy';
  if (step.value >= 4) list[3].state = 'busy';
  if (step.value >= 5) list[4].state = 'busy';
  if (step.value >= 6) list[0].state = 'recycle';
  return list;
});

const queue = computed(() => {
  if (step.value < 5) return 0;
  if (step.value === 5) return 3;
  return 1;
});

const memory = computed(() => workers.value.reduce((sum, worker) => sum + worker.mem, 0));

const status = computed(() => {
  const list = [
    '点击"下一步"观察 dynamic 模式下 PHP-FPM 如何处理并发请求',
    '第 1 个请求进入，master 分配一个空闲 worker',
    '并发增加，FPM 继续把请求交给空闲 worker',
    '空闲 worker 逐步减少，min/max spare_servers 开始影响扩缩容',
    '接近 pm.max_children 时，需要关注单进程内存和总内存预算',
    '所有 worker 忙碌后，新请求只能排队，Nginx 等太久就可能出现 502/504',
    '达到 pm.max_requests 后 worker 回收重启，用来缓解长生命周期内存泄漏',
  ];
  return list[step.value];
});

function next() {
  step.value = Math.min(step.value + 1, totalSteps);
}

function reset() {
  step.value = 0;
}
</script>

<template>
  <div class="fpm-demo">
    <div class="summary">
      <div><strong>pm</strong><span>dynamic</span></div>
      <div><strong>max_children</strong><span>5</span></div>
      <div>
        <strong>queue</strong><span>{{ queue }}</span>
      </div>
      <div>
        <strong>memory</strong><span>{{ memory }} MB</span>
      </div>
    </div>
    <div class="workers">
      <div v-for="worker in workers" :key="worker.id" class="worker" :class="worker.state">
        <strong>worker {{ worker.id }}</strong>
        <span>{{ worker.state }}</span>
        <small>{{ worker.mem }} MB</small>
      </div>
    </div>
    <div class="formula">
      <code>pm.max_children = floor((可用内存 - 系统预留) / 单 worker 内存)</code>
    </div>
    <div class="status-bar">{{ status }}</div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span>{{ step }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.fpm-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.summary div {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.summary strong,
.summary span {
  display: block;
}

.summary strong {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.summary span {
  margin-top: 4px;
  font-weight: 700;
}

.workers {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.worker {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  text-align: center;
}

.worker.busy {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.worker.recycle {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.worker strong,
.worker span,
.worker small {
  display: block;
}

.worker span,
.worker small {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.formula,
.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.formula {
  overflow-x: auto;
}

.actions {
  display: flex;
  align-items: center;
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

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.actions span {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

@media (max-width: 720px) {
  .summary,
  .workers {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
