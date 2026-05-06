<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

const accounts = computed(() => {
  const a = { id: 'A', balance: 1000, locked: false }
  const b = { id: 'B', balance: 300, locked: false }
  if (step.value >= 2) a.locked = true
  if (step.value >= 3) a.balance = 900
  if (step.value >= 4) b.locked = true
  if (step.value >= 5) b.balance = 400
  if (step.value >= 6) {
    a.locked = false
    b.locked = false
  }
  return [a, b]
})

const log = computed(() => {
  const list = []
  if (step.value >= 1) list.push('beginTransaction()')
  if (step.value >= 2) list.push('UPDATE A ... WHERE balance >= 100')
  if (step.value >= 3) list.push('rowCount() === 1, A 扣款成功')
  if (step.value >= 4) list.push('UPDATE B SET balance = balance + 100')
  if (step.value >= 5) list.push('两条写入都成功，准备提交')
  if (step.value >= 6) list.push('commit(), 锁释放')
  if (step.value >= 7) list.push('异常路径：任一步失败都 rollBack()')
  return list
})

const status = computed(() => {
  const list = [
    '点击"下一步"观察一次转账事务如何保证一致性',
    '事务开始：后续 SQL 要么全部成功，要么全部回滚',
    '先扣 A 账户，并用 balance >= amount 避免扣成负数',
    '检查 rowCount，不满足条件就抛异常并回滚',
    '再给 B 账户加款，两个写操作仍处在同一事务中',
    '业务写入全部完成，此时还没有真正对外提交',
    'commit 后数据生效并释放锁；其他请求才能看到最终结果',
    '异常路径要进入 catch，rollBack 后不要继续发送邮件或调用外部接口'
  ]
  return list[step.value]
})

function next() {
  step.value = Math.min(step.value + 1, totalSteps)
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="pdo-demo">
    <div class="accounts">
      <div v-for="account in accounts" :key="account.id" class="account" :class="{ locked: account.locked }">
        <strong>Account {{ account.id }}</strong>
        <span>balance: {{ account.balance }}</span>
        <small>{{ account.locked ? 'row locked' : 'unlocked' }}</small>
      </div>
    </div>
    <div class="timeline">
      <div v-if="log.length === 0" class="empty">尚未开启事务</div>
      <div v-for="(item, index) in log" :key="item" class="log-item">
        <span>{{ index + 1 }}</span>
        <code>{{ item }}</code>
      </div>
    </div>
    <div class="status-bar">{{ status }}</div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span>{{ step }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.pdo-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.accounts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.account {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.account.locked {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.account strong,
.account span,
.account small {
  display: block;
}

.account span {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 700;
}

.account small {
  margin-top: 4px;
  color: var(--vp-c-text-2);
}

.timeline {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.log-item,
.empty {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.log-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-item span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: white;
  font-size: 12px;
}

.log-item code {
  font-size: 12px;
}

.empty {
  color: var(--vp-c-text-2);
  border-style: dashed;
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: center;
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

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.actions span {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

@media (max-width: 560px) {
  .accounts {
    grid-template-columns: 1fr;
  }
}
</style>
