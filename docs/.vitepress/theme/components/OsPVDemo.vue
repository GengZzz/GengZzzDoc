<script setup lang="ts">
import { ref, computed } from 'vue';

type Mode = 'producer-consumer' | 'readers-writers';
const mode = ref<Mode>('producer-consumer');
const step = ref(0);

// Producer-Consumer state
const bufferSize = 4;
const pcBuffer = ref<number[]>([]);
const pcSemaphore = ref({ mutex: 1, empty: bufferSize, full: 0 });
const pcItemCounter = ref(0);

interface PCAction {
  who: 'P' | 'C';
  action: string;
  buffer: number[];
  sem: { mutex: number; empty: number; full: number };
  status: string;
}

const pcHistory = ref<PCAction[]>([]);

const pcSteps: { who: 'P' | 'C'; action: string }[] = [
  { who: 'P', action: 'P(empty): empty--' },
  { who: 'P', action: 'P(mutex): 进入临界区' },
  { who: 'P', action: '放入数据 item₁' },
  { who: 'P', action: 'V(mutex): 离开临界区' },
  { who: 'P', action: 'V(full): full++' },
  { who: 'C', action: 'P(full): full--' },
  { who: 'C', action: 'P(mutex): 进入临界区' },
  { who: 'C', action: '取出数据 item₁' },
  { who: 'C', action: 'V(mutex): 离开临界区' },
  { who: 'C', action: 'V(empty): empty++' },
];

// Readers-Writers state
const rwReaders = ref(0);
const rwWriting = ref(false);
const rwCount = ref(0);

interface RWAction {
  who: 'R' | 'W';
  action: string;
  readers: number;
  writing: boolean;
  status: string;
}

const rwHistory = ref<RWAction[]>([]);

const rwSteps: { who: 'R' | 'W'; action: string }[] = [
  { who: 'R', action: 'P(mutex): 保护 count' },
  { who: 'R', action: 'count++ → count=1, P(rw_mutex)' },
  { who: 'R', action: 'V(mutex)' },
  { who: 'R', action: '读取数据...' },
  { who: 'R', action: 'P(mutex): 保护 count' },
  { who: 'R', action: 'count-- → count=0, V(rw_mutex)' },
  { who: 'R', action: 'V(mutex)' },
  { who: 'W', action: 'P(rw_mutex): 独占写入' },
  { who: 'W', action: '写入数据...' },
  { who: 'W', action: 'V(rw_mutex): 释放' },
];

function nextPC() {
  const s = pcSteps[step.value % pcSteps.length];
  const sem = { ...pcSemaphore.value };
  let status = '';
  const buf = [...pcBuffer.value];

  if (s.action.startsWith('P(empty)')) {
    sem.empty--;
    status = sem.empty < 0 ? '阻塞! empty < 0' : `empty = ${sem.empty}`;
  } else if (s.action.startsWith('P(mutex)')) {
    sem.mutex--;
    status = sem.mutex < 0 ? '阻塞!' : '进入临界区';
  } else if (s.action.startsWith('放入数据')) {
    pcItemCounter.value++;
    buf.push(pcItemCounter.value);
    status = `缓冲区: [${buf.join(', ')}]`;
  } else if (s.action.startsWith('V(mutex)')) {
    sem.mutex++;
    status = '离开临界区';
  } else if (s.action.startsWith('V(full)')) {
    sem.full++;
    status = `full = ${sem.full}`;
  } else if (s.action.startsWith('P(full)')) {
    sem.full--;
    status = sem.full < 0 ? '阻塞! full < 0' : `full = ${sem.full}`;
  } else if (s.action.startsWith('取出数据')) {
    buf.shift();
    status = `缓冲区: [${buf.join(', ')}]`;
  } else if (s.action.startsWith('V(empty)')) {
    sem.empty++;
    status = `empty = ${sem.empty}`;
  }

  pcSemaphore.value = sem;
  pcBuffer.value = buf;
  pcHistory.value.push({
    who: s.who,
    action: s.action,
    buffer: [...buf],
    sem: { ...sem },
    status,
  });
  step.value++;
}

function nextRW() {
  const s = rwSteps[step.value % rwSteps.length];
  let status = '';
  const r = rwReaders.value;
  const w = rwWriting.value;

  if (s.action.includes('P(mutex)') && s.who === 'R') {
    status = '获取 mutex 保护 count';
  } else if (s.action.includes('count++')) {
    rwReaders.value++;
    if (rwReaders.value === 1) {
      status = '第一个读者，阻塞写者 (P rw_mutex)';
    } else {
      status = `已有 ${rwReaders.value} 个读者在读`;
    }
  } else if (s.action.includes('V(mutex)') && s.who === 'R') {
    status = '释放 mutex';
  } else if (s.action.includes('读取数据')) {
    status = `正在读取... (${rwReaders.value} 个读者并发)`;
  } else if (s.action.includes('count--')) {
    rwReaders.value--;
    if (rwReaders.value === 0) {
      status = '最后一个读者离开，释放 rw_mutex';
    } else {
      status = `剩余 ${rwReaders.value} 个读者`;
    }
  } else if (s.action.includes('P(rw_mutex)') && s.who === 'W') {
    rwWriting.value = true;
    status = '获取 rw_mutex，独占写入';
  } else if (s.action.includes('写入数据')) {
    status = '正在写入... (读者被阻塞)';
  } else if (s.action.includes('V(rw_mutex)') && s.who === 'W') {
    rwWriting.value = false;
    status = '释放 rw_mutex，允许读者/写者';
  }

  rwHistory.value.push({
    who: s.who,
    action: s.action,
    readers: rwReaders.value,
    writing: s.who === 'W' ? s.action.includes('P(rw_mutex)') : rwWriting.value,
    status,
  });
  step.value++;
}

function next() {
  if (mode.value === 'producer-consumer') nextPC();
  else nextRW();
}

function reset() {
  step.value = 0;
  if (mode.value === 'producer-consumer') {
    pcBuffer.value = [];
    pcSemaphore.value = { mutex: 1, empty: bufferSize, full: 0 };
    pcItemCounter.value = 0;
    pcHistory.value = [];
  } else {
    rwReaders.value = 0;
    rwWriting.value = false;
    rwHistory.value = [];
  }
}

function switchMode(m: Mode) {
  mode.value = m;
  reset();
}

const currentHistory = computed(() => {
  return mode.value === 'producer-consumer' ? pcHistory.value : rwHistory.value;
});
</script>

<template>
  <div class="pv-demo">
    <div class="mode-tabs">
      <button
        :class="{ active: mode === 'producer-consumer' }"
        @click="switchMode('producer-consumer')"
      >
        生产者-消费者
      </button>
      <button
        :class="{ active: mode === 'readers-writers' }"
        @click="switchMode('readers-writers')"
      >
        读者-写者
      </button>
    </div>

    <!-- Producer-Consumer -->
    <div v-if="mode === 'producer-consumer'" class="scenario">
      <div class="sem-row">
        <div class="sem-item">
          <span class="sem-name">mutex</span>
          <span class="sem-val" :class="{ zero: pcSemaphore.mutex <= 0 }">{{
            pcSemaphore.mutex
          }}</span>
        </div>
        <div class="sem-item">
          <span class="sem-name">empty</span>
          <span class="sem-val" :class="{ zero: pcSemaphore.empty <= 0 }">{{
            pcSemaphore.empty
          }}</span>
        </div>
        <div class="sem-item">
          <span class="sem-name">full</span>
          <span class="sem-val" :class="{ zero: pcSemaphore.full <= 0 }">{{
            pcSemaphore.full
          }}</span>
        </div>
      </div>

      <div class="buffer-view">
        <div class="buf-label">缓冲区 ({{ pcBuffer.length }} / {{ bufferSize }})</div>
        <div class="buf-slots">
          <div
            v-for="i in bufferSize"
            :key="i"
            class="buf-slot"
            :class="{ filled: i <= pcBuffer.length }"
          >
            {{ i <= pcBuffer.length ? `item${pcBuffer[i - 1]}` : '空' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Readers-Writers -->
    <div v-if="mode === 'readers-writers'" class="scenario">
      <div class="sem-row">
        <div class="sem-item">
          <span class="sem-name">rw_mutex</span>
          <span class="sem-val" :class="{ zero: rwWriting }">{{ rwWriting ? 0 : 1 }}</span>
        </div>
        <div class="sem-item">
          <span class="sem-name">读者数</span>
          <span class="sem-val">{{ rwReaders }}</span>
        </div>
        <div class="sem-item" v-if="rwWriting">
          <span class="sem-name">状态</span>
          <span class="sem-val writing">写入中</span>
        </div>
        <div class="sem-item" v-else-if="rwReaders > 0">
          <span class="sem-name">状态</span>
          <span class="sem-val reading">读取中 ({{ rwReaders }})</span>
        </div>
        <div class="sem-item" v-else>
          <span class="sem-name">状态</span>
          <span class="sem-val idle">空闲</span>
        </div>
      </div>
    </div>

    <!-- History -->
    <div v-if="currentHistory.length > 0" class="history">
      <div
        v-for="(h, i) in currentHistory"
        :key="i"
        class="history-item"
        :class="{
          producer: h.who === 'P' || h.who === 'R',
          consumer: h.who === 'C' || h.who === 'W',
          latest: i === currentHistory.length - 1,
        }"
      >
        <span class="who">{{
          h.who === 'P' ? '生产者' : h.who === 'C' ? '消费者' : h.who === 'R' ? '读者' : '写者'
        }}</span>
        <span class="action">{{ h.action }}</span>
        <span class="status">{{ h.status }}</span>
      </div>
    </div>

    <div v-if="currentHistory.length === 0" class="empty-state">点击"下一步"观察 PV 操作过程</div>

    <div class="actions">
      <button @click="next">下一步</button>
      <button @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pv-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-tabs button {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}

.mode-tabs button.active {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  font-weight: 600;
}

.scenario {
  margin-bottom: 12px;
}

.sem-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.sem-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  min-width: 70px;
}

.sem-name {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.sem-val {
  font-size: 20px;
  font-weight: 700;
  color: #22c55e;
}

.sem-val.zero {
  color: #ef4444;
}

.sem-val.writing {
  color: #ef4444;
  font-size: 14px;
}

.sem-val.reading {
  color: #3b82f6;
  font-size: 14px;
}

.sem-val.idle {
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.buf-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}

.buf-slots {
  display: flex;
  gap: 6px;
}

.buf-slot {
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  transition: all 0.2s;
}

.buf-slot.filled {
  border-color: #3b82f6;
  border-style: solid;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  font-weight: 600;
}

.history {
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.history-item {
  display: flex;
  gap: 10px;
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  font-size: 12px;
  background: var(--vp-c-bg);
  border-left: 3px solid var(--vp-c-border);
}

.history-item.producer {
  border-left-color: #22c55e;
}

.history-item.consumer {
  border-left-color: #f59e0b;
}

.history-item.latest {
  background: rgba(245, 158, 11, 0.08);
  border-left-color: #f59e0b;
  border-left-width: 4px;
}

.who {
  font-weight: 700;
  min-width: 50px;
}

.producer .who {
  color: #22c55e;
}

.consumer .who {
  color: #f59e0b;
}

.action {
  min-width: 160px;
  color: var(--vp-c-text-1);
}

.status {
  color: var(--vp-c-text-2);
}

.empty-state {
  padding: 30px;
  text-align: center;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  margin-bottom: 8px;
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
</style>
