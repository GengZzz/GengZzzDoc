<script setup lang="ts">
import { computed, ref } from 'vue'

const currentStep = ref(0)
const totalSteps = 5

const steps = [
  {
    title: 'String: int 编码',
    desc: '值为整数 100 时，Redis 直接将整数存储在 redisObject 的 ptr 指针中，无需额外分配 SDS。',
    type: 'string',
    encoding: 'int',
    value: '100',
    memory: [
      { label: 'redisObject', detail: 'type=STRING, encoding=INT', color: '#8b5cf6' },
      { label: 'ptr', detail: '直接存储整数 100（无需 SDS）', color: '#a78bfa' }
    ]
  },
  {
    title: 'String: embstr 编码',
    desc: '值变为 "hello world"（11 字节，≤44 字节），redisObject 和 sdshdr 在同一块连续内存中分配。',
    type: 'string',
    encoding: 'embstr',
    value: '"hello world"',
    memory: [
      { label: 'redisObject (16B)', detail: 'type=STRING, encoding=EMBSTR', color: '#8b5cf6' },
      { label: 'sdshdr8 (3B)', detail: 'len=11, alloc=11, flags', color: '#c4b5fd' },
      { label: 'buf (12B)', detail: '"hello world\\0"', color: '#a78bfa' }
    ]
  },
  {
    title: 'String: raw 编码',
    desc: '值超过 44 字节，redisObject 和 sdshdr 分开分配内存，需要两次 malloc。',
    type: 'string',
    encoding: 'raw',
    value: '"a very long string that exceeds 44 bytes threshold value test"',
    memory: [
      { label: 'redisObject', detail: 'type=STRING, encoding=RAW', color: '#8b5cf6' },
      { label: '→ sdshdr16', detail: 'len=62, alloc=124', color: '#c4b5fd' },
      { label: '  buf (63B)', detail: '实际字符串数据', color: '#a78bfa' }
    ]
  },
  {
    title: 'Hash: listpack → hashtable',
    desc: '字段数从 2 增长到 129（超过 hash-max-listpack-entries=128），编码从 listpack 转换为 hashtable。',
    type: 'hash',
    before: { encoding: 'listpack', fields: 2, desc: '紧凑存储，字段-值交替排列' },
    after: { encoding: 'hashtable', fields: 129, desc: 'O(1) 查找，渐进式 rehash' }
  },
  {
    title: 'ZSet: listpack → skiplist',
    desc: '元素数超过 128 或值超过 64 字节，使用 skiplist + hashtable 双编码。',
    type: 'zset',
    before: { encoding: 'listpack', members: 128, desc: '紧凑存储，score 相邻' },
    after: { encoding: 'skiplist+hashtable', members: 129, desc: 'skiplist 范围查询 + dict O(1) 查分' }
  }
]

const current = computed(() => steps[currentStep.value])

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
  <div class="redis-struct-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: currentStep === i - 1 }"
        @click="currentStep = i - 1"
      />
    </div>

    <div class="step-header">
      <span class="step-num">步骤 {{ currentStep + 1 }}/{{ totalSteps }}</span>
      <span class="step-title">{{ current.title }}</span>
    </div>

    <p class="step-desc">{{ current.desc }}</p>

    <!-- String 类型展示 -->
    <div v-if="current.type === 'string'" class="mem-layout">
      <div class="enc-badge">{{ current.encoding }}</div>
      <div class="mem-blocks">
        <div
          v-for="(block, i) in current.memory"
          :key="i"
          class="mem-block"
          :style="{ borderColor: block.color, color: block.color }"
        >
          <strong>{{ block.label }}</strong>
          <small>{{ block.detail }}</small>
        </div>
      </div>
      <div class="value-preview">
        value = <code>{{ current.value }}</code>
      </div>
    </div>

    <!-- Hash/ZSet 类型展示 -->
    <div v-else class="compare-layout">
      <div class="compare-panel before">
        <h4>转换前</h4>
        <div class="enc-badge">{{ current.before!.encoding }}</div>
        <p>{{ current.before!.desc }}</p>
        <span class="field-count">{{ current.type === 'hash' ? current.before!.fields + ' 个字段' : current.before!.members + ' 个元素' }}</span>
      </div>
      <div class="arrow">→</div>
      <div class="compare-panel after">
        <h4>转换后</h4>
        <div class="enc-badge">{{ current.after!.encoding }}</div>
        <p>{{ current.after!.desc }}</p>
        <span class="field-count">{{ current.type === 'hash' ? current.after!.fields + ' 个字段' : current.after!.members + ' 个元素' }}</span>
      </div>
    </div>

    <div class="actions">
      <button type="button" @click="prev">上一步</button>
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.redis-struct-demo {
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

.dot.active {
  background: var(--vp-c-brand-1);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.step-num {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
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

.mem-layout {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.enc-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-brand-1);
  color: #fff;
  margin-bottom: 10px;
}

.mem-blocks {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mem-block {
  padding: 8px 12px;
  border: 1px solid;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mem-block strong {
  font-size: 13px;
}

.value-preview {
  margin-top: 10px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.value-preview code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.compare-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}

.compare-panel {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.compare-panel h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.compare-panel p {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin: 6px 0;
}

.field-count {
  font-size: 12px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.arrow {
  font-size: 24px;
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

button:hover {
  border-color: var(--vp-c-brand-1);
}

@media (max-width: 560px) {
  .compare-layout {
    grid-template-columns: 1fr;
  }
  .arrow {
    text-align: center;
  }
}
</style>
