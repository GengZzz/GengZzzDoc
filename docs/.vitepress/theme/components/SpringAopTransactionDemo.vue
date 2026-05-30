<script setup lang="ts">
import { computed, ref } from 'vue';

interface TxStep {
  title: string;
  detail: string;
}

const step = ref(0);
const mode = ref<'commit' | 'rollback' | 'self'>('commit');

const normalSteps: TxStep[] = [
  { title: '调用代理对象', detail: 'Controller 或其他 Bean 调用的是 Spring 暴露的代理' },
  {
    title: '进入 TransactionInterceptor',
    detail: '读取 @Transactional 的传播行为、隔离级别、回滚规则',
  },
  { title: '开启或加入事务', detail: 'TransactionManager 获取连接并绑定到当前线程' },
  { title: '调用目标方法', detail: '执行业务代码、Repository、SQL 或 ORM 操作' },
  { title: '提交事务', detail: '目标方法正常返回，拦截器提交事务并释放资源' },
];

const rollbackSteps: TxStep[] = [
  { title: '调用代理对象', detail: '调用先经过代理，事务增强有机会生效' },
  { title: '进入 TransactionInterceptor', detail: '创建事务状态并记录回滚规则' },
  { title: '开启或加入事务', detail: '数据库连接参与当前事务上下文' },
  { title: '目标方法抛异常', detail: 'RuntimeException 或匹配 rollbackFor 的异常向外抛出' },
  { title: '回滚事务', detail: '拦截器执行 rollback，撤销未提交数据' },
];

const selfSteps: TxStep[] = [
  { title: '调用普通方法', detail: '外部只调用了未标注事务的 outer()' },
  { title: 'this.inner()', detail: '同类内部自调用直接走 this，不经过代理对象' },
  { title: '跳过拦截器', detail: 'TransactionInterceptor 没有被触发' },
  { title: '@Transactional 未生效', detail: 'inner() 上的事务配置不会开启新事务' },
  { title: '重构调用边界', detail: '把 inner() 放到另一个 Bean，或通过代理 Bean 调用' },
];

const steps = computed(() => {
  if (mode.value === 'rollback') return rollbackSteps;
  if (mode.value === 'self') return selfSteps;
  return normalSteps;
});

const current = computed(() => steps.value[step.value]);

function next() {
  step.value = (step.value + 1) % steps.value.length;
}

function reset() {
  step.value = 0;
}

function setMode(nextMode: 'commit' | 'rollback' | 'self') {
  mode.value = nextMode;
  step.value = 0;
}

function stateFor(index: number) {
  if (index < step.value) return 'done';
  if (index === step.value) return 'active';
  return 'pending';
}
</script>

<template>
  <div class="tx-demo">
    <div class="demo-head">
      <span class="badge">AOP Transaction</span>
      <div class="modes" aria-label="事务演示模式">
        <button type="button" :class="{ selected: mode === 'commit' }" @click="setMode('commit')">
          commit
        </button>
        <button
          type="button"
          :class="{ selected: mode === 'rollback' }"
          @click="setMode('rollback')"
        >
          rollback
        </button>
        <button type="button" :class="{ selected: mode === 'self' }" @click="setMode('self')">
          自调用
        </button>
      </div>
    </div>

    <div class="pipeline" :class="mode">
      <div
        v-for="(item, index) in steps"
        :key="`${mode}-${item.title}`"
        class="pipe-node"
        :class="stateFor(index)"
      >
        <div class="node-index">{{ index + 1 }}</div>
        <strong>{{ item.title }}</strong>
        <small>{{ item.detail }}</small>
      </div>
    </div>

    <div v-if="mode !== 'self'" class="tx-stage">
      <div class="caller" :class="{ active: step === 0 }">调用方</div>
      <div class="proxy" :class="{ active: step >= 0 && step <= 1 }">
        <span>代理对象</span>
        <small>JDK / CGLIB</small>
      </div>
      <div class="interceptor" :class="{ active: step === 1 || step === 2 || step === 4 }">
        <span>TransactionInterceptor</span>
        <small>begin / commit / rollback</small>
      </div>
      <div class="target" :class="{ active: step === 3 }">
        <span>目标方法</span>
        <small>orderService.pay()</small>
      </div>
      <div
        class="database"
        :class="{
          committed: mode === 'commit' && step === 4,
          rolled: mode === 'rollback' && step === 4,
        }"
      >
        <span>Database</span>
        <small>{{ mode === 'rollback' && step === 4 ? 'rollback' : 'transaction context' }}</small>
      </div>
    </div>

    <div v-else class="self-stage">
      <div class="class-box">
        <span class="method" :class="{ active: step === 0 }">outer()</span>
        <span class="self-arrow" :class="{ active: step >= 1 }">this.inner()</span>
        <span class="method transactional" :class="{ active: step >= 3 }"
          >@Transactional inner()</span
        >
      </div>
      <div class="bypass" :class="{ active: step >= 2 }">
        <strong>没有经过代理</strong>
        <span>事务拦截器无法读取 inner() 的事务元数据</span>
      </div>
    </div>

    <div class="status">
      <strong>{{ current.title }}</strong>
      <span>{{ current.detail }}</span>
    </div>

    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.tx-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.demo-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.modes button {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.modes button.selected {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.pipe-node {
  min-width: 0;
  min-height: 112px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition:
    border-color 0.25s ease,
    background 0.25s ease,
    transform 0.25s ease;
}

.pipe-node.active {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent);
}

.pipe-node.done {
  border-color: #22c55e;
}

.rollback .pipe-node.done {
  border-color: #f59e0b;
}

.self .pipe-node.done {
  border-color: #64748b;
}

.node-index {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  margin-bottom: 8px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 700;
}

.pipe-node.active .node-index {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.pipe-node strong {
  display: block;
  margin-bottom: 5px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.35;
}

.pipe-node small {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.45;
}

.tx-stage {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  align-items: stretch;
  margin-bottom: 12px;
}

.caller,
.proxy,
.interceptor,
.target,
.database {
  min-width: 0;
  min-height: 78px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-align: center;
  transition: all 0.25s ease;
}

.tx-stage span,
.self-stage span {
  font-size: 13px;
  font-weight: 700;
}

.tx-stage small {
  color: var(--vp-c-text-2);
  font-size: 11px;
}

.tx-stage .active {
  border-color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, var(--vp-c-bg));
}

.database.committed {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.database.rolled {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.self-stage {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.class-box,
.bypass {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.class-box {
  display: grid;
  gap: 8px;
}

.method,
.self-arrow {
  padding: 8px 10px;
  border-radius: 5px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.transactional {
  border: 1px dashed #ef4444;
}

.method.active,
.self-arrow.active,
.bypass.active {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.bypass {
  display: grid;
  align-content: center;
  gap: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  transition: all 0.25s ease;
}

.bypass strong {
  color: var(--vp-c-text-1);
}

.status {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.status strong {
  color: var(--vp-c-text-1);
}

.status span {
  color: var(--vp-c-text-2);
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

button:hover {
  border-color: var(--vp-c-brand-1);
}

@media (max-width: 760px) {
  .demo-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .pipeline,
  .tx-stage,
  .self-stage {
    grid-template-columns: 1fr;
  }

  .pipe-node {
    min-height: 0;
  }
}
</style>
