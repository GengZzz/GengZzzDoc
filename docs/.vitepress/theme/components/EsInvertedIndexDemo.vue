<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const docs = [
  { id: 1, text: 'Elasticsearch 是一个搜索引擎' },
  { id: 2, text: 'MySQL 是关系型数据库' },
  { id: 3, text: 'Elasticsearch 基于 Lucene 实现' }
]

const tokenizedDocs = computed(() => {
  if (step.value < 2) return []
  return docs.map(d => ({
    id: d.id,
    terms: d.id === 1
      ? ['elasticsearch', '是', '一个', '搜索引擎']
      : d.id === 2
        ? ['mysql', '是', '关系型', '数据库']
        : ['elasticsearch', '基于', 'lucene', '实现']
  }))
})

interface Posting {
  docId: number
  freq: number
  positions: number[]
}

interface InvertedEntry {
  term: string
  postings: Posting[]
}

const invertedIndex = computed<InvertedEntry[]>(() => {
  if (step.value < 3) return []
  return [
    { term: 'elasticsearch', postings: [
      { docId: 1, freq: 1, positions: [0] },
      { docId: 3, freq: 1, positions: [0] }
    ]},
    { term: '是', postings: [
      { docId: 1, freq: 1, positions: [1] },
      { docId: 2, freq: 1, positions: [1] }
    ]},
    { term: '一个', postings: [{ docId: 1, freq: 1, positions: [2] }] },
    { term: '搜索引擎', postings: [{ docId: 1, freq: 1, positions: [3] }] },
    { term: 'mysql', postings: [{ docId: 2, freq: 1, positions: [0] }] },
    { term: '关系型', postings: [{ docId: 2, freq: 1, positions: [2] }] },
    { term: '数据库', postings: [{ docId: 2, freq: 1, positions: [3] }] },
    { term: '基于', postings: [{ docId: 3, freq: 1, positions: [1] }] },
    { term: 'lucene', postings: [{ docId: 3, freq: 1, positions: [2] }] },
    { term: '实现', postings: [{ docId: 3, freq: 1, positions: [3] }] }
  ]
})

const queryResult = computed(() => {
  if (step.value < 4) return null
  const entry = invertedIndex.value.find(e => e.term === 'elasticsearch')
  return entry ? entry.postings : []
})

const skipListEntries = computed(() => {
  if (step.value < 5) return null
  // Simulate a longer posting list with skip pointers
  return {
    term: 'java',
    list: [
      { docId: 1, skip: true },
      { docId: 3, skip: false },
      { docId: 5, skip: false },
      { docId: 8, skip: true },
      { docId: 10, skip: false },
      { docId: 12, skip: false },
      { docId: 15, skip: true },
      { docId: 18, skip: false },
      { docId: 20, skip: false },
      { docId: 22, skip: false }
    ]
  }
})

const fstDemo = computed(() => {
  if (step.value < 6) return null
  return {
    uncompressed: 420,
    compressed: 68,
    ratio: '84%'
  }
})

function next() {
  if (step.value < totalSteps) step.value++
}

function reset() {
  step.value = 0
}

const stepLabels = [
  '原始文档',
  '分词',
  '构建倒排索引',
  '查询匹配',
  '跳表加速',
  'FST 压缩'
]
</script>

<template>
  <div class="es-demo">
    <div class="step-indicator">
      <div
        v-for="(label, i) in stepLabels"
        :key="i"
        class="step-dot"
        :class="{ active: step === i, done: step > i }"
      >
        {{ i + 1 }}
      </div>
    </div>
    <div class="step-label">{{ stepLabels[step] || '开始' }}</div>

    <!-- Step 0: Raw Documents -->
    <div v-if="step === 0" class="section">
      <h4>原始文档</h4>
      <div class="doc-card" v-for="doc in docs" :key="doc.id">
        <span class="doc-id">Doc{{ doc.id }}</span>
        <span class="doc-text">{{ doc.text }}</span>
      </div>
    </div>

    <!-- Step 1: Tokenization -->
    <div v-if="step === 1" class="section">
      <h4>分词过程</h4>
      <div class="doc-card" v-for="doc in docs" :key="doc.id">
        <span class="doc-id">Doc{{ doc.id }}</span>
        <div class="token-arrow">→</div>
        <div class="token-list">
          <span
            v-for="(token, ti) in (doc.id === 1
              ? ['elasticsearch', '是', '一个', '搜索引擎']
              : doc.id === 2
                ? ['mysql', '是', '关系型', '数据库']
                : ['elasticsearch', '基于', 'lucene', '实现'])"
            :key="ti"
            class="token"
          >{{ token }}</span>
        </div>
      </div>
    </div>

    <!-- Step 2: Build Inverted Index -->
    <div v-if="step === 2" class="section">
      <h4>倒排索引</h4>
      <div class="inverted-index">
        <div class="inv-row" v-for="entry in invertedIndex" :key="entry.term">
          <span class="inv-term">{{ entry.term }}</span>
          <span class="inv-arrow">→</span>
          <span class="inv-posting" v-for="p in entry.postings" :key="p.docId">
            Doc{{ p.docId }}<small>({{ p.freq }})</small>
          </span>
        </div>
      </div>
    </div>

    <!-- Step 3: Query -->
    <div v-if="step === 3" class="section">
      <h4>查询 "elasticsearch"</h4>
      <div class="query-path">
        <div class="query-step">
          <span class="badge">1</span> 在 Term Dictionary 中查找 "elasticsearch"
        </div>
        <div class="query-step">
          <span class="badge">2</span> 找到 Posting List → Doc1, Doc3
        </div>
        <div class="query-step">
          <span class="badge">3</span> 返回匹配文档
        </div>
      </div>
      <div class="result-box" v-if="queryResult">
        <strong>匹配结果：</strong>
        <span v-for="p in queryResult" :key="p.docId" class="result-tag">
          Doc{{ p.docId }}（词频 {{ p.freq }}）
        </span>
      </div>
    </div>

    <!-- Step 4: Skip List -->
    <div v-if="step === 4 && skipListEntries" class="section">
      <h4>跳表加速</h4>
      <p class="hint">Posting List: term = "{{ skipListEntries.term }}"，长度较长时跳表可跳跃查找</p>
      <div class="skip-list">
        <div class="skip-level">
          <span class="level-label">Level 1 (跳)</span>
          <span
            v-for="(item, i) in skipListEntries.list.filter(e => e.skip)"
            :key="'s' + i"
            class="skip-node"
          >Doc{{ item.docId }}</span>
        </div>
        <div class="skip-level">
          <span class="level-label">Level 0 (顺序)</span>
          <span
            v-for="(item, i) in skipListEntries.list"
            :key="'l' + i"
            class="skip-node base"
            :class="{ highlighted: item.skip }"
          >Doc{{ item.docId }}</span>
        </div>
      </div>
      <div class="hint">查找 Doc10 时：Level1 跳过 Doc1~Doc8，直接从 Doc8 开始 → 快速定位 Doc10</div>
    </div>

    <!-- Step 5: FST -->
    <div v-if="step === 5 && fstDemo" class="section">
      <h4>FST 压缩 Term Dictionary</h4>
      <p class="hint">FST（有限状态转换器）通过前缀和后缀共享大幅压缩词典体积</p>
      <div class="fst-compare">
        <div class="fst-bar">
          <div class="fst-label">未压缩</div>
          <div class="fst-track">
            <div class="fst-fill uncompressed" :style="{ width: '100%' }">{{ fstDemo.uncompressed }}KB</div>
          </div>
        </div>
        <div class="fst-bar">
          <div class="fst-label">FST 压缩</div>
          <div class="fst-track">
            <div class="fst-fill compressed" :style="{ width: '16%' }">{{ fstDemo.compressed }}KB</div>
          </div>
        </div>
      </div>
      <div class="hint">压缩率：{{ fstDemo.ratio }}，百万级 Term 的词典可压缩到几十 MB</div>
    </div>

    <div class="status-bar">
      <span v-if="step === 0">3 篇原始文档，等待构建倒排索引</span>
      <span v-else-if="step === 1">分词将文本拆分为 Term 列表</span>
      <span v-else-if="step === 2">Term → Posting List 的映射关系</span>
      <span v-else-if="step === 3">直接定位 Term，无需逐行扫描文档</span>
      <span v-else-if="step === 4">跳表在长 Posting List 上实现 O(√n) 查找</span>
      <span v-else>FST 实现前缀/后缀共享，压缩率可达 80%+</span>
    </div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.es-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--vp-c-border);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition: all 0.3s;
}

.step-dot.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.step-dot.done {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.step-label {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
}

.section {
  margin-bottom: 16px;
}

.section h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.doc-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.doc-id {
  font-weight: 600;
  color: var(--vp-c-brand-1);
  min-width: 36px;
}

.doc-text {
  color: var(--vp-c-text-1);
}

.token-arrow {
  color: var(--vp-c-text-2);
}

.token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.token {
  padding: 2px 8px;
  border-radius: 4px;
  background: #dbeafe;
  color: #1e40af;
  font-size: 12px;
}

.inverted-index {
  max-height: 240px;
  overflow-y: auto;
}

.inv-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 13px;
  border-bottom: 1px solid var(--vp-c-border);
}

.inv-term {
  font-weight: 600;
  min-width: 110px;
  color: #059669;
}

.inv-arrow {
  color: var(--vp-c-text-2);
}

.inv-posting {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  margin-right: 4px;
  font-size: 12px;
}

.inv-posting small {
  color: var(--vp-c-text-2);
}

.query-path {
  margin-bottom: 12px;
}

.query-step {
  padding: 6px 0;
  font-size: 13px;
}

.badge {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  margin-right: 6px;
}

.result-box {
  padding: 10px;
  border: 1px solid #059669;
  border-radius: 6px;
  background: #ecfdf5;
  font-size: 13px;
}

.result-tag {
  display: inline-block;
  margin: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #059669;
  color: #fff;
  font-size: 12px;
}

.skip-list {
  margin-bottom: 8px;
}

.skip-level {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.level-label {
  font-size: 12px;
  font-weight: 600;
  min-width: 90px;
  color: var(--vp-c-text-2);
}

.skip-node {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  font-size: 12px;
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.skip-node.highlighted {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #b45309;
}

.skip-node.base {
  min-width: 44px;
  text-align: center;
}

.fst-compare {
  margin: 12px 0;
}

.fst-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.fst-label {
  font-size: 12px;
  min-width: 80px;
  color: var(--vp-c-text-2);
}

.fst-track {
  flex: 1;
  height: 24px;
  background: var(--vp-c-border);
  border-radius: 4px;
  overflow: hidden;
}

.fst-fill {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.fst-fill.uncompressed {
  background: #ef4444;
}

.fst-fill.compressed {
  background: #059669;
}

.hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin: 4px 0;
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  color: var(--vp-c-text-1);
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

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
