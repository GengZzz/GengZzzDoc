<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

const stages = [
  {
    title: 'starter 引入',
    note: 'pom.xml 加入 spring-boot-starter-web，依赖树带入 MVC、JSON、校验和内嵌容器。',
    tag: 'starter-web',
  },
  {
    title: '读取 imports',
    note: '启动时加载 META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports。',
    tag: 'AutoConfiguration.imports',
  },
  {
    title: '条件匹配',
    note: '@ConditionalOnClass、@ConditionalOnProperty、@ConditionalOnMissingBean 决定配置是否生效。',
    tag: '@Conditional',
  },
  {
    title: '默认 Bean',
    note: '缺少用户定义时，自动配置创建默认 DispatcherServlet、ObjectMapper、Tomcat 等 Bean。',
    tag: 'default Bean',
  },
  {
    title: '用户覆盖',
    note: '业务代码声明同类型 Bean 或配置属性，自动配置退让，保留约定同时允许定制。',
    tag: 'custom Bean',
  },
]

const active = computed(() => stages[step.value])

function next() {
  step.value = (step.value + 1) % stages.length
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="boot-demo">
    <div class="step-indicator" aria-label="Spring Boot 自动配置步骤">
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="step-dot"
        :class="{ active: step === index, done: step > index }"
      >
        {{ index + 1 }}
      </div>
    </div>

    <div class="flow">
      <template v-for="(stage, index) in stages" :key="stage.title">
        <div class="stage" :class="{ active: step === index, done: step > index }">
          <div class="stage-tag">{{ stage.tag }}</div>
          <div class="stage-title">{{ stage.title }}</div>
        </div>
        <div v-if="index < stages.length - 1" class="arrow" :class="{ active: step > index }">→</div>
      </template>
    </div>

    <div class="detail-panel">
      <div class="detail-title">{{ active.title }}</div>
      <p>{{ active.note }}</p>
    </div>

    <div class="bean-board">
      <div class="bean-card framework" :class="{ active: step >= 3, muted: step >= 4 }">
        <span class="bean-label">Spring Boot 默认 Bean</span>
        <strong>Jackson2ObjectMapperBuilder</strong>
        <small v-if="step < 4">条件满足后注册</small>
        <small v-else>发现用户 Bean 后退让</small>
      </div>
      <div class="bean-card user" :class="{ active: step >= 4 }">
        <span class="bean-label">用户自定义 Bean</span>
        <strong>@Bean ObjectMapper</strong>
        <small>覆盖序列化规则、时区、模块</small>
      </div>
    </div>

    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.boot-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}

.step-dot {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 2px solid var(--vp-c-border);
  border-radius: 50%;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 700;
  transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
}

.step-dot.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.step-dot.done {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.flow {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.stage {
  min-width: 128px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
}

.stage.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.stage.done {
  opacity: 0.82;
}

.stage-tag {
  font-size: 11px;
  color: var(--vp-c-brand-1);
  word-break: break-word;
}

.stage-title {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
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

.detail-panel {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.detail-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.detail-panel p {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.6;
}

.bean-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.bean-card {
  min-height: 96px;
  padding: 12px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  opacity: 0.65;
  transition: border-color 0.25s ease, opacity 0.25s ease, transform 0.25s ease;
}

.bean-card.active {
  opacity: 1;
  border-style: solid;
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.bean-card.muted {
  border-color: #f59e0b;
}

.bean-card strong {
  display: block;
  margin-top: 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  word-break: break-word;
}

.bean-card small {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
}

.bean-label {
  font-size: 12px;
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

@media (max-width: 640px) {
  .bean-board {
    grid-template-columns: 1fr;
  }

  .stage {
    min-width: 116px;
  }
}
</style>
