<script setup lang="ts">
import { computed, ref } from 'vue';

const currentStep = ref(0);

const stages = [
  {
    name: 'Mapper 接口',
    role: '业务代码调用接口方法',
    detail: 'userMapper.selectById(42L)',
    note: '开发者面对的是普通 Java 接口，没有手写实现类。',
  },
  {
    name: 'MapperProxy',
    role: 'JDK 动态代理接管调用',
    detail: 'namespace + methodName',
    note: '根据接口全限定名和方法名定位 MappedStatement。',
  },
  {
    name: 'MappedStatement',
    role: 'SQL 声明元数据',
    detail: 'UserMapper.selectById',
    note: '保存 SQL、参数映射、结果映射、缓存配置和超时设置。',
  },
  {
    name: 'Executor',
    role: '执行入口与缓存协调',
    detail: 'SIMPLE / REUSE / BATCH',
    note: '先看一级缓存，再决定是否创建 JDBC 语句并执行。',
  },
  {
    name: 'StatementHandler',
    role: '创建并执行 JDBC Statement',
    detail: 'PreparedStatement',
    note: '生成最终 SQL，委托 ParameterHandler 设置占位符参数。',
  },
  {
    name: 'JDBC',
    role: '数据库驱动执行 SQL',
    detail: 'ResultSet',
    note: 'SQL 真正到达数据库，返回结果集或影响行数。',
  },
  {
    name: 'ResultSetHandler',
    role: '结果集映射',
    detail: 'ResultMap / TypeHandler',
    note: '把列值转换为 Java 属性，处理嵌套对象和集合。',
  },
  {
    name: 'Java 对象',
    role: '返回业务层',
    detail: 'UserDO',
    note: 'Mapper 方法返回对象、列表、游标或影响行数。',
  },
];

const totalSteps = stages.length + 1;
const activeIndex = computed(() => currentStep.value - 1);
const currentStage = computed(() => stages[activeIndex.value]);
const progressWidth = computed(() => {
  if (currentStep.value === 0) return '0%';
  return `${(activeIndex.value / (stages.length - 1)) * 100}%`;
});

const statusText = computed(() => {
  if (currentStep.value === 0) return '点击"下一步"观察 Mapper 方法如何穿过 MyBatis 执行链路';
  return `${currentStage.value.name}: ${currentStage.value.role}`;
});

function next() {
  currentStep.value = (currentStep.value + 1) % totalSteps;
}

function reset() {
  currentStep.value = 0;
}
</script>

<template>
  <div class="mybatis-flow-demo">
    <div class="flow-track" aria-label="MyBatis executor flow">
      <div class="track-line">
        <span class="track-progress" :style="{ width: progressWidth }" />
      </div>

      <div
        v-for="(stage, index) in stages"
        :key="stage.name"
        class="stage"
        :class="{ active: currentStep > index, current: activeIndex === index }"
      >
        <div class="stage-marker">{{ index + 1 }}</div>
        <div class="stage-card">
          <strong>{{ stage.name }}</strong>
          <span>{{ stage.role }}</span>
          <code>{{ stage.detail }}</code>
        </div>
      </div>
    </div>

    <div class="handler-panel">
      <div v-if="currentStage" class="panel-content">
        <span class="panel-kicker">步骤 {{ currentStep }}/{{ stages.length }}</span>
        <h4>{{ currentStage.name }}</h4>
        <p>{{ currentStage.note }}</p>
      </div>
      <div v-else class="panel-content muted">
        <span class="panel-kicker">准备开始</span>
        <h4>从 Mapper 接口调用开始</h4>
        <p>每一步都会高亮 MyBatis 内部的关键对象，以及它在执行链路中的职责。</p>
      </div>
    </div>

    <div class="handler-grid">
      <div class="handler-chip" :class="{ on: currentStep >= 5 }">
        ParameterHandler
        <small>设置 #{ } 参数</small>
      </div>
      <div class="handler-chip" :class="{ on: currentStep >= 7 }">
        ResultSetHandler
        <small>读取 ResultSet</small>
      </div>
      <div class="handler-chip" :class="{ on: currentStep >= 7 }">
        TypeHandler
        <small>Java/JDBC 类型转换</small>
      </div>
    </div>

    <div class="status-bar">{{ statusText }}</div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.mybatis-flow-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.flow-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, minmax(112px, 1fr));
  gap: 10px;
  overflow-x: auto;
  padding: 18px 2px 10px;
}

.track-line {
  position: absolute;
  left: 58px;
  right: 58px;
  top: 35px;
  height: 2px;
  background: var(--vp-c-border);
}

.track-progress {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  transition: width 0.3s ease;
}

.stage {
  position: relative;
  min-width: 112px;
}

.stage-marker {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  margin: 0 auto 8px;
  border: 2px solid var(--vp-c-border);
  border-radius: 50%;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 700;
  transition:
    border-color 0.25s ease,
    background 0.25s ease,
    color 0.25s ease;
}

.stage-card {
  min-height: 112px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease;
}

.stage-card strong,
.stage-card span,
.stage-card code {
  display: block;
}

.stage-card strong {
  margin-bottom: 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.stage-card span {
  min-height: 34px;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.4;
}

.stage-card code {
  margin-top: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 11px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.stage.active .stage-marker {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.stage.current .stage-marker {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.stage.current .stage-card {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.handler-panel {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.panel-content {
  animation: fadeIn 0.25s ease;
}

.panel-kicker {
  display: inline-block;
  margin-bottom: 4px;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.panel-content h4 {
  margin: 0 0 4px;
  color: var(--vp-c-text-1);
  font-size: 15px;
}

.panel-content p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.5;
}

.muted {
  opacity: 0.85;
}

.handler-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.handler-chip {
  padding: 9px 10px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  transition:
    border-color 0.25s ease,
    background 0.25s ease,
    color 0.25s ease;
}

.handler-chip small {
  display: block;
  margin-top: 3px;
  font-weight: 400;
  line-height: 1.35;
}

.handler-chip.on {
  border-style: solid;
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  color: var(--vp-c-text-1);
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
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

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 760px) {
  .flow-track {
    grid-template-columns: repeat(8, 116px);
  }

  .handler-grid {
    grid-template-columns: 1fr;
  }
}
</style>
