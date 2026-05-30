<script setup lang="ts">
import { computed, ref } from 'vue';

interface Stage {
  title: string;
  detail: string;
}

const step = ref(0);

const stages: Stage[] = [
  { title: '扫描配置类 / 组件', detail: '@Configuration、@ComponentScan、@Service 被解析' },
  { title: '注册 BeanDefinition', detail: '保存 class、scope、构造参数、初始化方法等元数据' },
  { title: '实例化', detail: '通过构造方法或工厂方法创建原始对象' },
  { title: '依赖注入', detail: '填充构造参数、属性、@Autowired 依赖和配置值' },
  { title: '初始化', detail: '执行 Aware、BeanPostProcessor、@PostConstruct、init 方法' },
  { title: '单例池', detail: '完整 Bean 放入 singletonObjects，后续可复用' },
  { title: '获取 Bean', detail: '业务代码从容器拿到可用对象，可能是代理对象' },
];

const currentStage = computed(() => stages[step.value]);
const progress = computed(() => `${(step.value / (stages.length - 1)) * 100}%`);

function next() {
  step.value = (step.value + 1) % stages.length;
}

function reset() {
  step.value = 0;
}

function stateFor(index: number) {
  if (index < step.value) return 'done';
  if (index === step.value) return 'active';
  return 'pending';
}
</script>

<template>
  <div class="spring-demo">
    <div class="demo-head">
      <span class="badge">IoC Container</span>
      <span class="step-count">Step {{ step + 1 }} / {{ stages.length }}</span>
    </div>

    <div class="flow">
      <div class="progress-line">
        <span :style="{ width: progress }"></span>
      </div>
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="stage"
        :class="stateFor(index)"
      >
        <div class="dot">{{ index + 1 }}</div>
        <div class="stage-text">
          <strong>{{ stage.title }}</strong>
          <small>{{ stage.detail }}</small>
        </div>
      </div>
    </div>

    <div class="workbench">
      <div class="source-area" :class="{ active: step === 0 }">
        <span class="area-title">配置来源</span>
        <code>@Service OrderService</code>
        <code>@Repository OrderRepository</code>
        <code>@Bean paymentClient()</code>
      </div>

      <div class="arrow" :class="{ active: step >= 1 }">→</div>

      <div class="bean-area" :class="{ active: step >= 1 && step <= 4 }">
        <span class="area-title">BeanFactory</span>
        <div class="definition" :class="{ active: step === 1 }">BeanDefinition</div>
        <div class="instance" :class="{ active: step === 2 }">new OrderService(...)</div>
        <div class="injection" :class="{ active: step === 3 }">inject repository / client</div>
        <div class="init" :class="{ active: step === 4 }">@PostConstruct + BPP</div>
      </div>

      <div class="arrow" :class="{ active: step >= 5 }">→</div>

      <div class="pool-area" :class="{ active: step >= 5 }">
        <span class="area-title">singletonObjects</span>
        <div class="bean-card" :class="{ pulsing: step === 5 }">orderService</div>
        <div class="bean-card">orderRepository</div>
      </div>

      <div class="arrow" :class="{ active: step === 6 }">→</div>

      <div class="client-area" :class="{ active: step === 6 }">
        <span class="area-title">业务调用</span>
        <div class="client-box">context.getBean()</div>
      </div>
    </div>

    <div class="status">
      <strong>{{ currentStage.title }}</strong>
      <span>{{ currentStage.detail }}</span>
    </div>

    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.spring-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.demo-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.step-count {
  font-family: monospace;
}

.flow {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.progress-line {
  position: absolute;
  top: 18px;
  left: 18px;
  right: 18px;
  height: 3px;
  border-radius: 999px;
  background: var(--vp-c-border);
  overflow: hidden;
}

.progress-line span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--vp-c-brand-1);
  transition: width 0.25s ease;
}

.stage {
  position: relative;
  z-index: 1;
  min-width: 0;
  text-align: center;
}

.dot {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  margin: 0 auto 6px;
  border: 2px solid var(--vp-c-border);
  border-radius: 50%;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 700;
  transition: all 0.25s ease;
}

.stage.done .dot,
.stage.active .dot {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.stage.active .dot {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--vp-c-brand-1) 20%, transparent);
}

.stage-text {
  display: grid;
  gap: 3px;
}

.stage-text strong {
  color: var(--vp-c-text-1);
  font-size: 12px;
  line-height: 1.35;
}

.stage-text small {
  color: var(--vp-c-text-2);
  font-size: 11px;
  line-height: 1.35;
}

.workbench {
  display: grid;
  grid-template-columns: 1.1fr auto 1.3fr auto 1fr auto 0.9fr;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 12px;
}

.source-area,
.bean-area,
.pool-area,
.client-area {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.source-area.active,
.bean-area.active,
.pool-area.active,
.client-area.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 14%, transparent);
}

.area-title {
  display: block;
  margin-bottom: 8px;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

code,
.definition,
.instance,
.injection,
.init,
.bean-card,
.client-box {
  display: block;
  min-width: 0;
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 5px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.definition.active,
.instance.active,
.injection.active,
.init.active {
  outline: 2px solid #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.bean-card.pulsing {
  outline: 2px solid #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.arrow {
  display: grid;
  place-items: center;
  color: var(--vp-c-text-3);
  font-size: 18px;
  font-weight: 700;
}

.arrow.active {
  color: var(--vp-c-brand-1);
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
  .flow {
    grid-template-columns: 1fr;
  }

  .progress-line {
    display: none;
  }

  .stage {
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 10px;
    text-align: left;
    align-items: center;
  }

  .dot {
    margin: 0;
  }

  .workbench {
    grid-template-columns: 1fr;
  }

  .arrow {
    transform: rotate(90deg);
  }
}
</style>
