<script setup lang="ts">
import { computed, ref } from 'vue';

const step = ref(0);
const totalSteps = 6;

interface Subscriber {
  name: string;
  state: string;
  kind: 'mail' | 'log' | 'cache';
}

const subscribers = computed(() => {
  const list: Subscriber[] = [];
  if (step.value >= 2) list.push({ name: 'SendEmail', state: '订阅中', kind: 'mail' });
  if (step.value >= 3) list.push({ name: 'WriteAuditLog', state: '订阅中', kind: 'log' });
  if (step.value >= 4) list.push({ name: 'RefreshCache', state: '订阅中', kind: 'cache' });
  if (step.value >= 6) return list.filter((item) => item.name !== 'RefreshCache');
  return list;
});

const invocation = computed(() => {
  if (step.value < 5) return [];
  return ['OrderCreated?.Invoke(sender, args)', ...subscribers.value.map((item) => item.name)];
});

const status = computed(() => {
  const list = [
    '点击"下一步"观察事件如何把发布者和订阅者解耦',
    '定义 event EventHandler<OrderCreatedEventArgs> OrderCreated；外部不能直接 Invoke',
    '邮件模块通过 += 订阅事件，委托链出现第一个处理器',
    '审计模块继续订阅；多播委托链按订阅顺序保存处理器',
    '缓存模块也订阅，同一个业务事件可以触发多个后续动作',
    '订单创建完成，发布者复制委托到局部变量后 Invoke，处理器按链路依次执行',
    '缓存模块 -= 取消订阅，长生命周期发布者不再持有该订阅者引用，降低泄漏风险',
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
  <div class="delegate-demo">
    <div class="topology">
      <section class="publisher">
        <h4>OrderService</h4>
        <code>event OrderCreated</code>
        <span>只负责发布业务事实</span>
      </section>
      <section class="chain">
        <h4>多播委托链</h4>
        <div class="handlers">
          <div v-if="subscribers.length === 0" class="empty">尚未订阅</div>
          <div
            v-for="subscriber in subscribers"
            :key="subscriber.name"
            class="handler"
            :class="subscriber.kind"
          >
            <strong>{{ subscriber.name }}</strong>
            <span>{{ subscriber.state }}</span>
          </div>
        </div>
      </section>
    </div>

    <div class="invoke-flow" v-if="invocation.length">
      <div v-for="(item, index) in invocation" :key="item" class="invoke-item">
        <span class="order">{{ index }}</span>
        <code>{{ item }}</code>
      </div>
    </div>

    <div class="code-line">
      <code v-if="step === 1"
        >public event EventHandler&lt;OrderCreatedEventArgs&gt; OrderCreated;</code
      >
      <code v-else-if="step === 2">service.OrderCreated += SendEmail;</code>
      <code v-else-if="step === 3">service.OrderCreated += WriteAuditLog;</code>
      <code v-else-if="step === 4">service.OrderCreated += RefreshCache;</code>
      <code v-else-if="step === 5">var handler = OrderCreated; handler?.Invoke(this, args);</code>
      <code v-else-if="step === 6">service.OrderCreated -= RefreshCache;</code>
      <code v-else>事件让发布者只说明“发生了什么”，订阅者各自决定“怎么响应”。</code>
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
.delegate-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.topology {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
}

.publisher,
.chain {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.publisher code {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--vp-c-brand-1);
}

.publisher span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.handlers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 76px;
}

.handler {
  min-width: 132px;
  padding: 9px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  transition: all 0.25s ease;
}

.handler.mail {
  border-color: #3b82f6;
}
.handler.log {
  border-color: #22c55e;
}
.handler.cache {
  border-color: #f59e0b;
}

.handler strong,
.handler span {
  display: block;
}

.handler span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.empty {
  width: 100%;
  display: grid;
  place-items: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.invoke-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.invoke-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
}

.order {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: white;
  font-size: 11px;
}

.code-line,
.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.code-line {
  margin-top: 12px;
  overflow-x: auto;
}

.status-bar {
  margin-top: 8px;
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

@media (max-width: 680px) {
  .topology {
    grid-template-columns: 1fr;
  }
}
</style>
