<script setup lang="ts">
import { computed, ref } from 'vue'

const currentStep = ref(0)
const totalSteps = 7

interface StepData {
  title: string
  mode: 'rdb' | 'aof' | 'hybrid'
  desc: string
  components: { label: string; detail: string; color: string }[]
  note?: string
}

const steps: StepData[] = [
  {
    title: 'RDB 步骤 1: fork 子进程',
    mode: 'rdb',
    desc: 'Redis 主进程收到 BGSAVE 命令后，调用 fork() 创建子进程。父子进程共享同一份物理内存（COW）。',
    components: [
      { label: '主进程', detail: '继续处理客户端请求', color: '#8b5cf6' },
      { label: '子进程 (fork)', detail: '准备写入 RDB 文件', color: '#10b981' },
      { label: '共享内存页', detail: 'Page Table 标记为只读', color: '#f59e0b' }
    ]
  },
  {
    title: 'RDB 步骤 2: COW 写入',
    mode: 'rdb',
    desc: '子进程遍历内存数据，写入临时 RDB 文件。主进程的写操作触发 Copy-On-Write，不影响子进程看到的数据。',
    components: [
      { label: '主进程', detail: '修改数据 → 触发 COW → 复制页', color: '#8b5cf6' },
      { label: '子进程', detail: '读取原始共享页 → 写入 dump.rdb.tmp', color: '#10b981' },
      { label: 'COW 风险', detail: '写操作越多，复制的页越多，内存占用越高', color: '#ef4444' }
    ],
    note: '如果 BGSAVE 期间写操作很密集，实际内存可能接近 2 倍。'
  },
  {
    title: 'RDB 步骤 3: 替换旧文件',
    mode: 'rdb',
    desc: '子进程写完后，原子地 rename 临时文件替换旧的 dump.rdb，然后退出。主进程回收子进程。',
    components: [
      { label: 'dump.rdb.tmp', detail: '写入完成', color: '#10b981' },
      { label: 'rename', detail: 'dump.rdb.tmp → dump.rdb', color: '#f59e0b' },
      { label: '主进程', detail: '回收子进程，BGSAVE 完成', color: '#8b5cf6' }
    ]
  },
  {
    title: 'AOF 步骤 1: 命令追加',
    mode: 'aof',
    desc: '每个写命令执行后，追加到 aof_buf 缓冲区。AOF 记录的是 RESP 协议格式的命令。',
    components: [
      { label: '写命令', detail: 'SET name "hello"', color: '#8b5cf6' },
      { label: '执行命令', detail: '修改内存数据', color: '#f59e0b' },
      { label: 'aof_buf', detail: '追加 RESP 格式命令到缓冲区', color: '#10b981' }
    ]
  },
  {
    title: 'AOF 步骤 2: fsync 策略',
    mode: 'aof',
    desc: '根据 appendfsync 配置，决定何时将缓冲区写入磁盘。',
    components: [
      { label: 'always', detail: '每次写命令后 fsync — 最安全，最慢', color: '#ef4444' },
      { label: 'everysec', detail: '每秒一次 fsync — 推荐，最多丢 1 秒', color: '#f59e0b' },
      { label: 'no', detail: '由 OS 决定（~30s）— 最快，最不安全', color: '#8b5cf6' }
    ],
    note: 'everysec 是大多数生产环境的选择，兼顾安全性和性能。'
  },
  {
    title: 'AOF 步骤 3: AOF 重写',
    mode: 'aof',
    desc: 'AOF 文件过大时触发重写。fork 子进程读取当前内存，生成精简命令序列，替换旧 AOF。',
    components: [
      { label: '旧 AOF', detail: 'RPUSH list a → RPUSH list b → ... (1000 条)', color: '#8b5cf6' },
      { label: '新 AOF', detail: 'RPUSH list a b c ... (1 条)', color: '#10b981' },
      { label: '重写缓冲区', detail: '重写期间的新命令同时写入旧 AOF 和缓冲区', color: '#f59e0b' }
    ]
  },
  {
    title: '混合持久化: RDB 头 + AOF 尾',
    mode: 'hybrid',
    desc: 'Redis 4.0+ 支持混合持久化。AOF 重写时以 RDB 格式存储全量数据，之后的增量命令以 AOF 格式追加。',
    components: [
      { label: 'RDB 部分', detail: '全量数据的二进制快照（紧凑、加载快）', color: '#8b5cf6' },
      { label: 'AOF 部分', detail: '重写后的增量命令（RESP 格式）', color: '#10b981' },
      { label: '优势', detail: '恢复速度接近 RDB，数据安全接近 AOF', color: '#f59e0b' }
    ],
    note: '配置 aof-use-rdb-preamble yes 开启混合持久化，这是目前生产环境推荐方案。'
  }
]

const current = computed(() => steps[currentStep.value])

const modeColor = computed(() => {
  switch (current.value.mode) {
    case 'rdb': return '#8b5cf6'
    case 'aof': return '#10b981'
    case 'hybrid': return '#f59e0b'
  }
})

const modeLabel = computed(() => {
  switch (current.value.mode) {
    case 'rdb': return 'RDB'
    case 'aof': return 'AOF'
    case 'hybrid': return '混合持久化'
  }
})

function next() {
  currentStep.value = (currentStep.value + 1) % totalSteps
}

function prev() {
  currentStep.value = (currentStep.value - 1 + totalSteps) % totalSteps
}

function reset() {
  currentStep.value = 0
}
</script>

<template>
  <div class="persist-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: currentStep === i - 1 }"
        :style="currentStep === i - 1 ? { background: steps[i - 1].mode === 'rdb' ? '#8b5cf6' : steps[i - 1].mode === 'aof' ? '#10b981' : '#f59e0b' } : {}"
        @click="currentStep = i - 1"
      />
    </div>

    <div class="step-header">
      <span class="mode-badge" :style="{ background: modeColor }">{{ modeLabel }}</span>
      <span class="step-title">{{ current.title }}</span>
    </div>

    <p class="step-desc">{{ current.desc }}</p>

    <div class="components-list">
      <div
        v-for="(comp, i) in current.components"
        :key="i"
        class="comp-card"
        :style="{ borderColor: comp.color }"
      >
        <strong :style="{ color: comp.color }">{{ comp.label }}</strong>
        <small>{{ comp.detail }}</small>
      </div>
    </div>

    <div v-if="current.note" class="step-note">
      <span class="note-icon">i</span>
      {{ current.note }}
    </div>

    <div class="actions">
      <button type="button" @click="prev">上一步</button>
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.persist-demo {
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
  transition: background 0.2s;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.mode-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  font-weight: 600;
}

.step-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.step-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
  line-height: 1.5;
}

.components-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comp-card {
  padding: 8px 12px;
  border: 1px solid;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comp-card strong {
  font-size: 13px;
}

.comp-card small {
  color: var(--vp-c-text-2);
}

.step-note {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  color: var(--vp-c-text-2);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.note-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
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
</style>
