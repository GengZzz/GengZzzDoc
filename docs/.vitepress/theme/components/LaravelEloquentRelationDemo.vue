<script setup lang="ts">
import { computed, ref } from 'vue'

const eager = ref(false)

const queries = computed(() => {
  if (eager.value) {
    return [
      'select * from orders limit 5',
      'select id,name from users where id in (1,2,3)',
    ]
  }
  return [
    'select * from orders limit 5',
    'select * from users where id = 1',
    'select * from users where id = 2',
    'select * from users where id = 3',
    'select * from users where id = 1',
    'select * from users where id = 2',
  ]
})
</script>

<template>
  <div class="eloquent-demo">
    <div class="toolbar">
      <button type="button" :class="{ active: !eager }" @click="eager = false">懒加载</button>
      <button type="button" :class="{ active: eager }" @click="eager = true">with 预加载</button>
    </div>

    <div class="columns">
      <div class="orders">
        <div v-for="id in [101, 102, 103, 104, 105]" :key="id" class="row">
          <span>Order #{{ id }}</span>
          <code>user</code>
        </div>
      </div>
      <div class="arrow" :class="{ eager }">{{ eager ? '批量加载关联' : '循环触发查询' }}</div>
      <div class="sql-list">
        <div v-for="(sql, index) in queries" :key="sql + index" class="sql">
          <b>{{ index + 1 }}</b>
          <code>{{ sql }}</code>
        </div>
      </div>
    </div>

    <p class="summary">
      {{ eager ? '预加载把关联查询合并成一次 in 查询，列表页 SQL 数量稳定。' : '懒加载在循环中访问关系，SQL 数量会随着订单行数增长。' }}
    </p>
  </div>
</template>

<style scoped>
.eloquent-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.toolbar button.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.columns {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 120px minmax(240px, 1.4fr);
  gap: 12px;
  align-items: center;
}

.row,
.sql {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.row span {
  flex: 1;
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.arrow {
  padding: 10px;
  border-radius: 6px;
  background: rgba(234, 179, 8, 0.14);
  color: #a16207;
  text-align: center;
  font-weight: 700;
  transition: background 0.25s ease, color 0.25s ease;
}

.arrow.eager {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.sql b {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
}

.sql code {
  white-space: normal;
  word-break: break-word;
}

.summary {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

@media (max-width: 760px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
