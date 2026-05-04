<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const maxStep = 8

const steps = [
  { label: '字节流', desc: '浏览器从服务器接收 HTTP 响应的原始字节流' },
  { label: '解码', desc: '根据 charset (UTF-8) 将字节流解码为字符串' },
  { label: '词法分析', desc: 'Tokenizer 将字符串切分为 Token 序列' },
  { label: 'DOM 树', desc: 'Token 被处理为 Node，构建 DOM 树' },
  { label: 'CSSOM 树', desc: 'CSS 文件被解析为 CSSOM 树' },
  { label: '渲染树', desc: 'DOM + CSSOM 合并为 Render Tree (跳过 display:none)' },
  { label: '布局', desc: '计算每个节点的几何位置 (x, y, width, height)' },
  { label: '绘制', desc: '将像素填充到多个图层，由 GPU 合成到屏幕' }
]

const currentStep = computed(() => step.value)
const stepInfo = computed(() => steps[step.value] || steps[0])

const tokens = computed(() => {
  if (step.value < 3) return []
  return [
    { type: 'StartTag', value: '<html>' },
    { type: 'StartTag', value: '<body>' },
    { type: 'StartTag', value: '<h1>' },
    { type: 'Text', value: '"Hello"' },
    { type: 'EndTag', value: '</h1>' },
    { type: 'EndTag', value: '</body>' },
    { type: 'EndTag', value: '</html>' }
  ]
})

const domNodes = computed(() => {
  if (step.value < 4) return []
  return [
    { label: 'html', children: [
      { label: 'body', children: [
        { label: 'h1', children: [{ label: 'Hello', leaf: true }] }
      ]}
    ]}
  ]
})

const cssomNodes = computed(() => {
  if (step.value < 5) return []
  return [
    { label: 'body', rule: 'margin: 0' },
    { label: 'h1', rule: 'font-size: 24px; color: #1f2937' }
  ]
})

const renderTreeNodes = computed(() => {
  if (step.value < 6) return []
  return [
    { label: 'body', box: '0,0 800×600' },
    { label: 'h1', box: '0,0 800×32' }
  ]
})

const layoutBoxes = computed(() => {
  if (step.value < 7) return []
  return [
    { label: 'body', x: 0, y: 0, w: 800, h: 600 },
    { label: 'h1', x: 0, y: 0, w: 800, h: 32 }
  ]
})

function next() {
  if (step.value < maxStep) step.value++
}

function reset() {
  step.value = 0
}

const bytesRaw = '3C 68 74 6D 6C 3E 3C 62 6F 64 79 3E 3C 68 31 3E 48 65 6C 6C 6F 3C 2F 68 31 3E'
const decodedStr = '<html><body><h1>Hello</h1></body></html>'
</script>

<template>
  <div class="render-demo">
    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <div
        v-for="(s, i) in steps"
        :key="i"
        class="step-dot"
        :class="{ active: i === step, done: i < step }"
        @click="step = i"
      >
        <span class="dot-num">{{ i + 1 }}</span>
      </div>
    </div>

    <!-- 步骤描述 -->
    <div class="step-desc">
      <strong>步骤 {{ step + 1 }}/{{ maxStep }}：{{ stepInfo.label }}</strong>
      <p>{{ stepInfo.desc }}</p>
    </div>

    <!-- 可视化区域 -->
    <div class="viz-area">
      <!-- Step 0: 字节流 -->
      <div v-if="step === 0" class="panel">
        <div class="bytes-box">
          <span class="byte" v-for="(b, i) in bytesRaw.split(' ')" :key="i">{{ b }}</span>
        </div>
        <div class="arrow-down">↓ 原始字节</div>
      </div>

      <!-- Step 1: 解码 -->
      <div v-if="step === 1" class="panel">
        <div class="decode-box">
          <div class="decode-from">
            <span class="byte" v-for="(b, i) in bytesRaw.split(' ')" :key="i">{{ b }}</span>
          </div>
          <div class="decode-arrow">→ UTF-8 解码 →</div>
          <div class="decode-to">{{ decodedStr }}</div>
        </div>
      </div>

      <!-- Step 2: Tokenize -->
      <div v-if="step === 2" class="panel">
        <div class="str-box">{{ decodedStr }}</div>
        <div class="arrow-down">↓ Tokenize</div>
        <div class="token-list">
          <span class="token start">&lt;html&gt;</span>
          <span class="token start">&lt;body&gt;</span>
          <span class="token start">&lt;h1&gt;</span>
          <span class="token text">"Hello"</span>
          <span class="token end">&lt;/h1&gt;</span>
          <span class="token end">&lt;/body&gt;</span>
          <span class="token end">&lt;/html&gt;</span>
        </div>
      </div>

      <!-- Step 3: DOM Tree -->
      <div v-if="step >= 3 && step < 5" class="panel">
        <div class="tree">
          <div class="tree-node root" v-for="node in domNodes" :key="node.label">
            <div class="node-label dom-node">{{ node.label }}</div>
            <div class="tree-children" v-if="node.children">
              <div v-for="child in node.children" :key="child.label">
                <div class="node-label dom-node">{{ child.label }}</div>
                <div class="tree-children" v-if="child.children">
                  <div v-for="grand in child.children" :key="grand.label">
                    <div class="node-label" :class="grand.leaf ? 'leaf-node' : 'dom-node'">
                      {{ grand.label }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: CSSOM -->
      <div v-if="step === 4" class="panel dual">
        <div class="tree">
          <div class="node-label dom-node">DOM 树</div>
          <div class="tree-children">
            <div class="node-label dom-node">html</div>
            <div class="tree-children">
              <div class="node-label dom-node">body</div>
              <div class="tree-children">
                <div class="node-label dom-node">h1</div>
                <div class="tree-children">
                  <div class="node-label leaf-node">Hello</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="tree">
          <div class="node-label cssom-node">CSSOM 树</div>
          <div class="tree-children">
            <div v-for="n in cssomNodes" :key="n.label" class="cssom-item">
              <span class="node-label cssom-node">{{ n.label }}</span>
              <span class="cssom-rule">{{ n.rule }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: Render Tree -->
      <div v-if="step === 5" class="panel">
        <div class="tree">
          <div class="node-label render-node">Render Tree</div>
          <div class="tree-children">
            <div v-for="n in renderTreeNodes" :key="n.label" class="render-item">
              <span class="node-label render-node">{{ n.label }}</span>
              <span class="render-box">{{ n.box }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6: Layout -->
      <div v-if="step === 6" class="panel">
        <div class="layout-canvas">
          <div
            v-for="box in layoutBoxes"
            :key="box.label"
            class="layout-box"
            :style="{
              left: (box.x / 800 * 100) + '%',
              top: (box.y / 600 * 100) + '%',
              width: (box.w / 800 * 100) + '%',
              height: box.label === 'h1' ? '32px' : '100%'
            }"
          >
            <span>{{ box.label }} ({{ box.w }}x{{ box.h }})</span>
          </div>
        </div>
      </div>

      <!-- Step 7: Paint + Composite -->
      <div v-if="step === 7" class="panel">
        <div class="paint-result">
          <div class="paint-layers">
            <div class="paint-layer layer-bg">Layer 1: 背景</div>
            <div class="paint-layer layer-text">Layer 2: 文字 "Hello"</div>
            <div class="paint-layer layer-composite">↓ GPU 合成 ↓</div>
          </div>
          <div class="final-screen">
            <div class="screen-content">Hello</div>
            <div class="screen-label">最终画面</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作 -->
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= maxStep">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.render-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--vp-c-border);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.step-dot.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.step-dot.done {
  border-color: #22c55e;
  background: #22c55e;
  color: #fff;
}

.step-desc {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--vp-c-bg);
  border-radius: 6px;
  font-size: 13px;
}

.step-desc p {
  margin: 4px 0 0;
  color: var(--vp-c-text-2);
}

.viz-area {
  min-height: 160px;
  margin-bottom: 12px;
}

.panel {
  padding: 12px;
  background: var(--vp-c-bg);
  border-radius: 6px;
  overflow: auto;
}

.panel.dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.bytes-box, .decode-from, .str-box, .token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #d4d4d4;
}

.byte {
  padding: 2px 4px;
  background: #2d2d2d;
  border-radius: 2px;
}

.arrow-down, .decode-arrow {
  text-align: center;
  padding: 6px;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.decode-to {
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #4ec9b0;
}

.token {
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.token.start { background: #3b82f6; color: #fff; }
.token.end { background: #ef4444; color: #fff; }
.token.text { background: #f59e0b; color: #000; }

.tree {
  padding: 8px;
}

.tree-children {
  margin-left: 20px;
  padding-left: 12px;
  border-left: 2px solid var(--vp-c-border);
}

.node-label {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin: 4px 0;
}

.dom-node { background: #dbeafe; color: #1d4ed8; }
.cssom-node { background: #fce7f3; color: #be185d; }
.render-node { background: #d1fae5; color: #065f46; }
.leaf-node { background: #fef3c7; color: #92400e; }

.cssom-item, .render-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.cssom-rule, .render-box {
  font-size: 11px;
  font-family: monospace;
  color: var(--vp-c-text-2);
}

.layout-canvas {
  position: relative;
  width: 100%;
  height: 200px;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  overflow: hidden;
}

.layout-box {
  position: absolute;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  border-radius: 4px;
}

.layout-box:first-child {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
  height: 100%;
}

.layout-box:last-child {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  height: 32px;
}

.paint-result {
  display: flex;
  gap: 16px;
  align-items: center;
}

.paint-layers {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.paint-layer {
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
}

.layer-bg { background: #e0e7ff; color: #3730a3; }
.layer-text { background: #fce7f3; color: #9d174d; }
.layer-composite {
  background: #d1fae5;
  color: #065f46;
  font-weight: bold;
}

.final-screen {
  width: 200px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.screen-content {
  padding: 40px 16px;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
}

.screen-label {
  padding: 4px;
  text-align: center;
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
}

.actions {
  display: flex;
  gap: 8px;
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

@media (max-width: 560px) {
  .panel.dual {
    grid-template-columns: 1fr;
  }
  .paint-result {
    flex-direction: column;
  }
}
</style>
