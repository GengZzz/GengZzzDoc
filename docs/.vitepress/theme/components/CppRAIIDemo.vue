<script setup lang="ts">
import { computed, ref } from 'vue';

const step = ref(0);
const totalSteps = 6;

interface StackFrame {
  name: string;
  note: string;
}

interface ResourceState {
  name: string;
  owner: string;
  state: string;
}

const frames = computed(() => {
  const stack: StackFrame[] = [];
  const resources: ResourceState[] = [];
  if (step.value >= 1) stack.push({ name: 'main()', note: '进入业务流程' });
  if (step.value >= 2) {
    stack.push({ name: 'FileGuard log', note: '构造函数打开文件' });
    resources.push({ name: 'log.txt', owner: 'FileGuard', state: '已获取' });
  }
  if (step.value >= 3) stack.push({ name: 'writeOrder()', note: '写入订单日志' });
  if (step.value >= 4) stack.push({ name: 'throw', note: '写入失败，开始栈展开' });
  if (step.value >= 5) {
    stack.splice(2);
    resources[0].state = '析构中';
  }
  if (step.value >= 6) {
    stack.splice(1);
    resources[0].state = '已释放';
    resources[0].owner = '无';
  }
  return { stack, resources };
});

const status = computed(() => {
  const list = [
    '点击"下一步"观察 RAII 如何在异常路径中释放资源',
    '进入 main()，准备执行一段需要文件资源的业务逻辑',
    'FileGuard 构造函数打开文件，资源所有权绑定到对象生命周期',
    'writeOrder() 使用文件写日志，此时不需要手写 finally/delete',
    '业务代码抛出异常，函数无法按普通路径继续执行',
    '栈展开开始，局部对象按逆序析构，FileGuard::~FileGuard() 被自动调用',
    '文件句柄释放完成；异常继续向外传播，但资源没有泄漏',
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
  <div class="raii-demo">
    <div class="scene">
      <section class="panel">
        <h4>调用栈</h4>
        <div class="stack">
          <div v-if="frames.stack.length === 0" class="empty">尚未进入函数</div>
          <div v-for="frame in frames.stack" :key="frame.name" class="frame">
            <strong>{{ frame.name }}</strong>
            <span>{{ frame.note }}</span>
          </div>
        </div>
      </section>
      <section class="panel">
        <h4>资源所有权</h4>
        <div class="resource-board">
          <div v-if="frames.resources.length === 0" class="empty">暂无资源</div>
          <div
            v-for="resource in frames.resources"
            :key="resource.name"
            class="resource"
            :class="{
              releasing: resource.state === '析构中',
              released: resource.state === '已释放',
            }"
          >
            <span class="resource-name">{{ resource.name }}</span>
            <span>所有者：{{ resource.owner }}</span>
            <span>状态：{{ resource.state }}</span>
          </div>
        </div>
      </section>
    </div>
    <div class="flow">
      <span :class="{ active: step >= 2 }">构造获取</span>
      <span :class="{ active: step >= 4 }">异常发生</span>
      <span :class="{ active: step >= 5 }">栈展开</span>
      <span :class="{ active: step >= 6 }">析构释放</span>
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
.raii-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.scene {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.stack,
.resource-board {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  min-height: 148px;
}

.frame,
.resource {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.25s ease;
}

.frame span,
.resource span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.resource.releasing {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.resource.released {
  border-color: #22c55e;
  opacity: 0.72;
}

.resource-name {
  font-weight: 700;
  color: var(--vp-c-text-1) !important;
}

.empty {
  display: grid;
  place-items: center;
  min-height: 72px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.flow {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.flow span {
  padding: 7px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
}

.flow span.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.status-bar {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
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
  .scene,
  .flow {
    grid-template-columns: 1fr;
  }
}
</style>
