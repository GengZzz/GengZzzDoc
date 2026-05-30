<script setup lang="ts">
import { computed, ref } from 'vue';

const mode = ref<'db' | 'model' | 'transaction'>('model');

const cards = computed(() => {
  if (mode.value === 'db') {
    return ['Db::name("order")', 'where + order', 'paginate', 'array result'];
  }
  if (mode.value === 'transaction') {
    return ['Db::transaction', 'create order', 'write log', 'commit / rollback'];
  }
  return ['Order Model', 'scopePaid', 'with user', 'model collection'];
});
</script>

<template>
  <div class="tp-orm-demo">
    <div class="switcher">
      <button :class="{ active: mode === 'db' }" @click="mode = 'db'">Db 查询</button>
      <button :class="{ active: mode === 'model' }" @click="mode = 'model'">模型查询</button>
      <button :class="{ active: mode === 'transaction' }" @click="mode = 'transaction'">
        事务写入
      </button>
    </div>
    <div class="chain">
      <template v-for="(card, index) in cards" :key="card">
        <div class="card">
          <span>{{ index + 1 }}</span>
          <strong>{{ card }}</strong>
        </div>
        <div v-if="index < cards.length - 1" class="arrow">→</div>
      </template>
    </div>
    <p>
      {{
        mode === 'db'
          ? 'Db 查询适合简单列表、统计和明确 SQL 片段。'
          : mode === 'model'
            ? '模型查询适合表达表关系、查询范围和领域含义。'
            : '事务把多表写入放进一个一致性边界，异常时整体回滚。'
      }}
    </p>
  </div>
</template>

<style scoped>
.tp-orm-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.switcher button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.switcher .active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.chain {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.card {
  min-width: 142px;
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.card span {
  display: block;
  color: var(--vp-c-brand-1);
  font-size: 12px;
  font-weight: 700;
}

.card strong {
  display: block;
  margin-top: 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.arrow {
  display: grid;
  place-items: center;
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

p {
  margin: 12px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
