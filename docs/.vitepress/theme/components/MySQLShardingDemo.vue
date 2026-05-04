<script setup lang="ts">
import { ref, computed } from 'vue'

type Strategy = 'vertical-db' | 'vertical-table' | 'horizontal-db' | 'horizontal-table'

const selected = ref<Strategy>('vertical-db')

interface StrategyInfo {
  name: string
  desc: string
  detail: string
}

const strategies: Record<Strategy, StrategyInfo> = {
  'vertical-db': {
    name: '垂直分库',
    desc: '按业务模块拆分到不同数据库',
    detail: '不同业务的表拆到不同库，例如用户、订单、商品分别独立部署',
  },
  'vertical-table': {
    name: '垂直分表',
    desc: '将宽表按字段拆分成多张表',
    detail: '冷热数据分离，减少 IO，例如把大文本字段拆到扩展表',
  },
  'horizontal-db': {
    name: '水平分库',
    desc: '将数据按分片规则分布到多个库',
    detail: '解决单库容量和性能瓶颈，每个库结构相同，数据不同',
  },
  'horizontal-table': {
    name: '水平分表',
    desc: '将大表按行拆分成多张子表',
    detail: '单表数据量过大时拆分，如 t_order → t_order_0, t_order_1, t_order_2',
  },
}

const current = computed(() => strategies[selected.value])

function select(s: Strategy) {
  selected.value = s
}
</script>

<template>
  <div class="sharding-demo">
    <div class="strategy-tabs">
      <button
        v-for="(info, key) in strategies"
        :key="key"
        type="button"
        class="tab-btn"
        :class="{ active: selected === key }"
        @click="select(key as Strategy)"
      >
        {{ info.name }}
      </button>
    </div>

    <div class="desc-text">{{ current.desc }}</div>

    <!-- Vertical DB -->
    <div v-if="selected === 'vertical-db'" class="viz-area">
      <div class="app-box">应用程序</div>
      <div class="arrow-down">↓</div>
      <div class="db-row">
        <div class="db-box user-db">
          <div class="db-name">user_db</div>
          <div class="db-tables">users, roles</div>
        </div>
        <div class="db-box order-db">
          <div class="db-name">order_db</div>
          <div class="db-tables">orders, payments</div>
        </div>
        <div class="db-box product-db">
          <div class="db-name">product_db</div>
          <div class="db-tables">products, inventory</div>
        </div>
      </div>
    </div>

    <!-- Vertical Table -->
    <div v-else-if="selected === 'vertical-table'" class="viz-area">
      <div class="split-label">宽表拆分</div>
      <div class="vtable-row">
        <div class="orig-table wide">
          <div class="th">原始宽表</div>
          <div class="td">id, name, age, avatar(BLOB), bio(TEXT), address(VARCHAR)</div>
        </div>
      </div>
      <div class="arrow-down">↓ 拆分</div>
      <div class="vtable-row split">
        <div class="split-table main-table">
          <div class="th">主表 (热数据)</div>
          <div class="td">id, name, age</div>
        </div>
        <div class="fk-link">id ←→</div>
        <div class="split-table ext-table">
          <div class="th">扩展表 (冷数据)</div>
          <div class="td">id, avatar, bio, address</div>
        </div>
      </div>
    </div>

    <!-- Horizontal DB -->
    <div v-else-if="selected === 'horizontal-db'" class="viz-area">
      <div class="app-box">分片规则: user_id % 2</div>
      <div class="arrow-down">↓</div>
      <div class="db-row">
        <div class="db-box shard-db">
          <div class="db-name">db_0</div>
          <div class="db-tables">
            <div>users (偶数id)</div>
            <div>orders (偶数id)</div>
          </div>
        </div>
        <div class="db-box shard-db">
          <div class="db-name">db_1</div>
          <div class="db-tables">
            <div>users (奇数id)</div>
            <div>orders (奇数id)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Horizontal Table -->
    <div v-else class="viz-area">
      <div class="app-box">t_order (5000万行)</div>
      <div class="arrow-down">↓ 按 order_id % 4 拆分</div>
      <div class="htable-row">
        <div class="sub-table">
          <div class="th">t_order_0</div>
          <div class="td">order_id % 4 = 0</div>
        </div>
        <div class="sub-table">
          <div class="th">t_order_1</div>
          <div class="td">order_id % 4 = 1</div>
        </div>
        <div class="sub-table">
          <div class="th">t_order_2</div>
          <div class="td">order_id % 4 = 2</div>
        </div>
        <div class="sub-table">
          <div class="th">t_order_3</div>
          <div class="td">order_id % 4 = 3</div>
        </div>
      </div>
    </div>

    <div class="detail-text">{{ current.detail }}</div>
  </div>
</template>

<style scoped>
.sharding-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.strategy-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tab-btn {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 12px;
  transition: border-color 0.2s, background 0.2s;
}

.tab-btn.active {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  font-weight: 600;
}

.desc-text {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
}

.viz-area {
  text-align: center;
  padding: 8px 0;
}

.app-box {
  display: inline-block;
  padding: 8px 16px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.08);
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
}

.arrow-down {
  margin: 8px 0;
  font-size: 16px;
  color: var(--vp-c-text-2);
}

.db-row {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.db-box {
  padding: 10px 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  min-width: 100px;
  transition: border-color 0.3s;
}

.db-box:hover {
  border-color: #3b82f6;
}

.db-name {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}

.db-tables {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.user-db { border-color: #22c55e; }
.order-db { border-color: #f59e0b; }
.product-db { border-color: #8b5cf6; }
.shard-db { border-color: #3b82f6; }

/* Vertical table styles */
.vtable-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.orig-table, .split-table, .sub-table {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  font-size: 12px;
}

.orig-table.wide {
  max-width: 360px;
}

.th {
  padding: 6px 10px;
  background: var(--vp-c-bg);
  font-weight: 600;
  font-size: 11px;
  border-bottom: 1px solid var(--vp-c-border);
}

.td {
  padding: 6px 10px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.main-table { border-color: #f59e0b; }
.ext-table { border-color: #8b5cf6; }

.fk-link {
  font-size: 12px;
  color: #22c55e;
  font-weight: 600;
}

.split-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}

/* Horizontal table styles */
.htable-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sub-table {
  min-width: 90px;
}

.sub-table .th {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
}

.detail-text {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-align: center;
}
</style>
