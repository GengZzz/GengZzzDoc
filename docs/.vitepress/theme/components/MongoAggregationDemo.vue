<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

interface Order {
  _id: string
  userId: string
  status: string
  amount: number
}

interface GroupResult {
  userId: string
  total: number
  count: number
}

interface FinalResult {
  userId: string
  userName: string
  total: number
  count: number
}

const allOrders: Order[] = [
  { _id: '1', userId: 'u1', status: 'completed', amount: 120 },
  { _id: '2', userId: 'u2', status: 'completed', amount: 85 },
  { _id: '3', userId: 'u1', status: 'pending', amount: 45 },
  { _id: '4', userId: 'u3', status: 'completed', amount: 200 },
  { _id: '5', userId: 'u2', status: 'completed', amount: 60 }
]

const users: Record<string, string> = { u1: '张三', u2: '李四', u3: '王五' }

const filtered = computed(() => allOrders.filter(o => o.status === 'completed'))

const grouped = computed<GroupResult[]>(() => {
  const map: Record<string, GroupResult> = {}
  for (const o of filtered.value) {
    if (!map[o.userId]) map[o.userId] = { userId: o.userId, total: 0, count: 0 }
    map[o.userId].total += o.amount
    map[o.userId].count++
  }
  return Object.values(map)
})

const lookedUp = computed<FinalResult[]>(() => {
  return grouped.value.map(g => ({
    ...g,
    userName: users[g.userId] || g.userId
  }))
})

const sorted = computed<FinalResult[]>(() => {
  return [...lookedUp.value].sort((a, b) => b.total - a.total)
})

const stepTitle = computed(() => {
  const titles = [
    '原始集合 orders（5 条文档）',
    '$match：过滤 status = "completed"',
    '$group：按 userId 分组，计算总金额',
    '$lookup：关联 users 集合',
    '$sort：按总金额降序',
    '最终输出结果'
  ]
  return titles[step.value] || titles[0]
})

function next() {
  if (step.value < totalSteps - 1) step.value++
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="agg-demo">
    <div class="step-indicator">
      <div v-for="i in totalSteps" :key="i" class="step-dot" :class="{ active: step >= i - 1, current: step === i - 1 }">
        {{ i }}
      </div>
    </div>

    <div class="stage-title">
      <span class="stage-badge">{{ ['数据源', '$match', '$group', '$lookup', '$sort', '输出'][step] }}</span>
      {{ stepTitle }}
    </div>

    <!-- Step 0: All orders -->
    <div v-if="step === 0" class="data-table">
      <div class="row header"><span>_id</span><span>userId</span><span>status</span><span>amount</span></div>
      <div v-for="o in allOrders" :key="o._id" class="row">
        <span>{{ o._id }}</span><span>{{ o.userId }}</span><span>{{ o.status }}</span><span>{{ o.amount }}</span>
      </div>
    </div>

    <!-- Step 1: Filtered -->
    <div v-if="step === 1" class="data-table">
      <div class="row header"><span>_id</span><span>userId</span><span>status</span><span>amount</span></div>
      <div v-for="o in allOrders" :key="o._id" class="row" :class="{ dimmed: o.status !== 'completed' }">
        <span>{{ o._id }}</span><span>{{ o.userId }}</span><span>{{ o.status }}</span><span>{{ o.amount }}</span>
      </div>
      <div class="filter-note">保留 {{ filtered.length }} 条，过滤掉 {{ allOrders.length - filtered.length }} 条</div>
    </div>

    <!-- Step 2: Grouped -->
    <div v-if="step === 2" class="data-table">
      <div class="row header"><span>userId (_id)</span><span>total</span><span>count</span></div>
      <div v-for="g in grouped" :key="g.userId" class="row highlight">
        <span>{{ g.userId }}</span><span>{{ g.total }}</span><span>{{ g.count }}</span>
      </div>
    </div>

    <!-- Step 3: Lookup -->
    <div v-if="step === 3" class="data-table">
      <div class="row header"><span>userId</span><span>userName</span><span>total</span><span>count</span></div>
      <div v-for="g in lookedUp" :key="g.userId" class="row highlight">
        <span>{{ g.userId }}</span><span>{{ g.userName }}</span><span>{{ g.total }}</span><span>{{ g.count }}</span>
      </div>
    </div>

    <!-- Step 4: Sorted -->
    <div v-if="step === 4" class="data-table">
      <div class="row header"><span>排名</span><span>userName</span><span>total</span><span>count</span></div>
      <div v-for="(g, idx) in sorted" :key="g.userId" class="row highlight">
        <span>#{{ idx + 1 }}</span><span>{{ g.userName }}</span><span>{{ g.total }}</span><span>{{ g.count }}</span>
      </div>
    </div>

    <!-- Step 5: Final -->
    <div v-if="step === 5" class="data-table">
      <div class="row header"><span>排名</span><span>用户</span><span>总金额</span><span>订单数</span></div>
      <div v-for="(g, idx) in sorted" :key="g.userId" class="row final">
        <span>#{{ idx + 1 }}</span><span>{{ g.userName }}</span><span>{{ g.total }}</span><span>{{ g.count }}</span>
      </div>
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.agg-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.step-dot {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid var(--vp-c-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.step-dot.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.step-dot.current {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.stage-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-weight: 600;
}

.data-table {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 6px 10px;
  font-size: 13px;
  border-bottom: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
}

.row:last-child { border-bottom: none; }

.row.header {
  background: var(--vp-c-bg);
  font-weight: 600;
  font-size: 12px;
}

.row.dimmed {
  opacity: 0.3;
  text-decoration: line-through;
}

.row.highlight {
  background: rgba(34, 197, 94, 0.08);
}

.row.final {
  background: rgba(59, 130, 246, 0.08);
}

.filter-note {
  padding: 6px 10px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  border-top: 1px dashed var(--vp-c-border);
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .row {
    grid-template-columns: repeat(2, 1fr);
    font-size: 12px;
  }
}
</style>
