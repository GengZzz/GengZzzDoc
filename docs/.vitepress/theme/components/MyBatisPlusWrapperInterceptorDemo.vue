<script setup lang="ts">
import { computed, ref } from 'vue';

const page = ref(true);
const tenant = ref(true);
const logicDelete = ref(true);

const sql = computed(() => {
  const where = ['status = ?'];
  if (tenant.value) where.unshift('tenant_id = ?');
  if (logicDelete.value) where.push('deleted = 0');
  const suffix = page.value ? ' limit ?, ?' : '';
  return `select id,nickname,status from sys_user where ${where.join(' and ')} order by created_at desc${suffix}`;
});
</script>

<template>
  <div class="mp-sql-demo">
    <div class="toggles">
      <label><input v-model="tenant" type="checkbox" /> 租户插件</label>
      <label><input v-model="logicDelete" type="checkbox" /> 逻辑删除</label>
      <label><input v-model="page" type="checkbox" /> 分页插件</label>
    </div>
    <div class="builder">
      <div class="box">
        <strong>Wrapper 条件</strong>
        <code>.eq(User::getStatus, ENABLED)</code>
        <code>.orderByDesc(User::getCreatedAt)</code>
      </div>
      <div class="arrow">→</div>
      <div class="box">
        <strong>InnerInterceptor</strong>
        <span :class="{ on: tenant }">tenant_id</span>
        <span :class="{ on: logicDelete }">deleted = 0</span>
        <span :class="{ on: page }">limit</span>
      </div>
    </div>
    <pre><code>{{ sql }}</code></pre>
  </div>
</template>

<style scoped>
.mp-sql-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.toggles label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.builder {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.box {
  min-height: 132px;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.box strong,
.box code,
.box span {
  display: block;
}

.box strong {
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.box code,
.box span {
  margin-top: 6px;
  padding: 5px 7px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
}

.box span.on {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.arrow {
  text-align: center;
  color: var(--vp-c-brand-1);
  font-size: 22px;
  font-weight: 700;
}

pre {
  margin: 12px 0 0;
  white-space: pre-wrap;
}

@media (max-width: 720px) {
  .builder {
    grid-template-columns: 1fr;
  }

  .arrow {
    transform: rotate(90deg);
  }
}
</style>
