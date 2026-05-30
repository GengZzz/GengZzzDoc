<script setup lang="ts">
import { computed, ref } from 'vue';

const currentStep = ref(0);

const scenarios = [
  {
    title: '准备查询',
    sessionA: '空',
    sessionB: '空',
    secondLevel: '空',
    result: 'Mapper 方法即将执行 selectById(42)。',
    cacheKey: ['statementId', 'offset/limit', 'SQL', 'params', 'environment'],
    hit: 'none',
  },
  {
    title: 'SqlSession A 第一次查询',
    sessionA: '写入 CacheKey#42',
    sessionB: '空',
    secondLevel: '提交前不可见',
    result: '一级缓存未命中，Executor 访问 JDBC，并把结果放入 Session A 本地缓存。',
    cacheKey: ['UserMapper.selectById', '0/2147483647', 'select ... where id = ?', '42', 'dev'],
    hit: 'jdbc',
  },
  {
    title: 'SqlSession A 再查同一 SQL',
    sessionA: '命中 CacheKey#42',
    sessionB: '空',
    secondLevel: '提交前不可见',
    result: '同一 SqlSession 内 CacheKey 完全一致，直接命中一级缓存。',
    cacheKey: ['UserMapper.selectById', '0/2147483647', 'select ... where id = ?', '42', 'dev'],
    hit: 'local',
  },
  {
    title: 'SqlSession B 查询同一 SQL',
    sessionA: '保留 CacheKey#42',
    sessionB: '未命中',
    secondLevel: '可按 namespace 读取',
    result: '一级缓存是会话级的，Session B 不能读取 Session A 的本地缓存。',
    cacheKey: ['UserMapper.selectById', '0/2147483647', 'select ... where id = ?', '42', 'dev'],
    hit: 'miss',
  },
  {
    title: '提交后进入二级缓存',
    sessionA: '会话关闭',
    sessionB: '可查询',
    secondLevel: 'UserMapper namespace: CacheKey#42',
    result: '开启二级缓存时，提交或关闭会话后结果才进入 namespace 级缓存。',
    cacheKey: ['UserMapper.selectById', '0/2147483647', 'select ... where id = ?', '42', 'dev'],
    hit: 'second',
  },
  {
    title: '写操作触发失效',
    sessionA: '清空',
    sessionB: '清空',
    secondLevel: 'UserMapper namespace 被刷新',
    result: '同 namespace 下 insert/update/delete 默认 flushCache，避免读到旧数据。',
    cacheKey: [
      'UserMapper.updateStatus',
      '0/2147483647',
      'update user set status = ?',
      '42,0',
      'dev',
    ],
    hit: 'flush',
  },
];

const totalSteps = scenarios.length;
const current = computed(() => scenarios[currentStep.value]);

const statusText = computed(() => {
  const labels: Record<string, string> = {
    none: '点击"下一步"观察一级缓存、CacheKey 与二级缓存边界',
    jdbc: '一级缓存未命中，访问数据库后写入 SqlSession A',
    local: '同一 SqlSession + 相同 CacheKey，命中一级缓存',
    miss: '不同 SqlSession 的一级缓存互不共享',
    second: '二级缓存以 namespace 为边界，提交后才对其他会话可见',
    flush: '写操作刷新缓存，下一次读取需要重新查询',
  };
  return labels[current.value.hit];
});

function next() {
  currentStep.value = (currentStep.value + 1) % totalSteps;
}

function reset() {
  currentStep.value = 0;
}
</script>

<template>
  <div class="cache-demo">
    <div class="step-indicator">
      <span
        v-for="(_, index) in scenarios"
        :key="index"
        class="dot"
        :class="{ active: currentStep === index }"
        @click="currentStep = index"
      />
    </div>

    <div class="cache-layout">
      <div class="query-card" :class="current.hit">
        <span class="query-label">当前动作</span>
        <strong>{{ current.title }}</strong>
        <code>{{ current.cacheKey[0] }}</code>
      </div>

      <div class="sessions">
        <div
          class="cache-box"
          :class="{ active: ['jdbc', 'local', 'second', 'flush'].includes(current.hit) }"
        >
          <span>SqlSession A 一级缓存</span>
          <strong>{{ current.sessionA }}</strong>
        </div>
        <div
          class="cache-box"
          :class="{ active: ['miss', 'second', 'flush'].includes(current.hit) }"
        >
          <span>SqlSession B 一级缓存</span>
          <strong>{{ current.sessionB }}</strong>
        </div>
      </div>

      <div
        class="second-level"
        :class="{
          active: ['second', 'flush'].includes(current.hit),
          flush: current.hit === 'flush',
        }"
      >
        <span>二级缓存 namespace 边界</span>
        <strong>{{ current.secondLevel }}</strong>
      </div>
    </div>

    <div class="key-panel">
      <div class="key-title">CacheKey 组成</div>
      <div class="key-parts">
        <span v-for="(part, index) in current.cacheKey" :key="`${part}-${index}`" class="key-part">
          {{ part }}
        </span>
      </div>
    </div>

    <div class="result-panel">
      <strong>{{ statusText }}</strong>
      <p>{{ current.result }}</p>
    </div>

    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.cache-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vp-c-border);
  cursor: pointer;
  transition: background 0.2s ease;
}

.dot.active {
  background: var(--vp-c-brand-1);
}

.cache-layout {
  display: grid;
  grid-template-columns: minmax(160px, 0.8fr) minmax(220px, 1.2fr) minmax(170px, 0.9fr);
  gap: 10px;
  align-items: stretch;
}

.query-card,
.cache-box,
.second-level {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  min-height: 96px;
  transition:
    border-color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.query-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.query-card.jdbc {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.query-card.local {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

.query-card.miss {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.07);
}

.query-card.second {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.07);
}

.query-card.flush {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.08);
}

.query-label,
.cache-box span,
.second-level span,
.key-title {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.query-card strong {
  margin: 5px 0 8px;
  color: var(--vp-c-text-1);
  font-size: 15px;
}

.query-card code {
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 11px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.sessions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.cache-box,
.second-level {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.cache-box strong,
.second-level strong {
  margin-top: 7px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  line-height: 1.4;
}

.cache-box.active {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.12);
}

.second-level.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
}

.second-level.flush {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.08);
}

.key-panel {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.key-title {
  margin-bottom: 8px;
}

.key-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.key-part {
  padding: 5px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.key-part:not(:last-child)::after {
  content: '+';
  margin-left: 8px;
  color: var(--vp-c-text-2);
}

.result-panel {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.result-panel strong {
  display: block;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.result-panel p {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.5;
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
  .cache-layout {
    grid-template-columns: 1fr;
  }

  .sessions {
    grid-template-columns: 1fr;
  }
}
</style>
