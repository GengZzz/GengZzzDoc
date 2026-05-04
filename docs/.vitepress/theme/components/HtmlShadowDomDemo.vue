<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const maxStep = 6

const steps = [
  { label: '定义 Custom Element', desc: '创建 MyCard 类，继承 HTMLElement' },
  { label: 'attachShadow', desc: '调用 attachShadow({mode:"open"}) 创建 Shadow Root' },
  { label: '添加内容与样式', desc: '向 Shadow Root 添加模板内容和隔离样式' },
  { label: '样式隔离', desc: '外部 CSS 无法影响 Shadow DOM 内部样式' },
  { label: 'Slot 插槽', desc: 'Light DOM 子元素通过 slot 投射到 Shadow DOM 中' },
  { label: '::part() 选择器', desc: '从外部选择性地样式化 Shadow DOM 内部元素' }
]

const stepInfo = computed(() => steps[step.value] || steps[0])

function next() {
  if (step.value < maxStep) step.value++
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="shadow-demo">
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
      <!-- Step 0: 定义类 -->
      <div v-if="step === 0" class="panel">
        <div class="code-block">
          <div class="code-line"><span class="kw">class</span> <span class="cls">MyCard</span> <span class="kw">extends</span> <span class="cls">HTMLElement</span> {</div>
          <div class="code-line indent"><span class="cm">// 定义自定义元素的类</span></div>
          <div class="code-line indent"><span class="cm">// 继承 HTMLElement 获得所有 DOM 元素能力</span></div>
          <div class="code-line">}</div>
          <div class="code-line">&nbsp;</div>
          <div class="code-line"><span class="fn">customElements.define</span>(<span class="str">'my-card'</span>, MyCard)</div>
        </div>
      </div>

      <!-- Step 1: attachShadow -->
      <div v-if="step === 1" class="panel">
        <div class="shadow-visual">
          <div class="host-box">
            <div class="host-label">&lt;my-card&gt;</div>
            <div class="host-label-sub">Light DOM</div>
            <div class="shadow-root-box">
              <div class="sr-label">Shadow Root (open)</div>
              <div class="sr-status">host.shadowRoot → 可访问 ✓</div>
            </div>
          </div>
        </div>
        <div class="code-block">
          <div class="code-line"><span class="fn">connectedCallback</span>() {</div>
          <div class="code-line indent"><span class="kw">this</span>.<span class="fn">attachShadow</span>({ <span class="prop">mode</span>: <span class="str">'open'</span> })</div>
          <div class="code-line">}</div>
        </div>
      </div>

      <!-- Step 2: 添加内容 -->
      <div v-if="step === 2" class="panel">
        <div class="shadow-visual">
          <div class="host-box filled">
            <div class="host-label">&lt;my-card&gt;</div>
            <div class="shadow-root-box filled">
              <div class="sr-label">Shadow Root</div>
              <div class="sr-content">
                <div class="sr-style">
                  &lt;style&gt;<br>
                  &nbsp;&nbsp;.card { border: 1px solid #e5e7eb; }<br>
                  &nbsp;&nbsp;.title { color: #4f46e5; }<br>
                  &lt;/style&gt;
                </div>
                <div class="sr-html">
                  &lt;div class="card"&gt;<br>
                  &nbsp;&nbsp;&lt;h3 class="title"&gt;...&lt;/h3&gt;<br>
                  &nbsp;&nbsp;&lt;p&gt;内容&lt;/p&gt;<br>
                  &lt;/div&gt;
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: 样式隔离 -->
      <div v-if="step === 3" class="panel">
        <div class="isolation-visual">
          <div class="external-css">
            <div class="css-label">外部 CSS</div>
            <div class="css-rule">p { color: red; }</div>
            <div class="css-rule">.card { background: yellow; }</div>
            <div class="css-result fail">✗ 无法影响 Shadow DOM 内部</div>
          </div>
          <div class="host-box">
            <div class="host-label">&lt;my-card&gt;</div>
            <div class="shadow-root-box isolated">
              <div class="sr-label">Shadow DOM</div>
              <div class="isolated-content">
                <div class="isolated-card">
                  <div class="isolated-title">卡片标题</div>
                  <div class="isolated-text">这里的样式完全独立</div>
                </div>
                <div class="css-rule-internal">样式由 Shadow DOM 内部的 &lt;style&gt; 控制</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Slot -->
      <div v-if="step === 4" class="panel">
        <div class="slot-visual">
          <div class="light-dom">
            <div class="light-label">Light DOM (用户提供的内容)</div>
            <div class="light-item">
              &lt;span slot="title"&gt;我的标题&lt;/span&gt;
            </div>
            <div class="light-item">
              &lt;p&gt;一些内容&lt;/p&gt;
            </div>
          </div>
          <div class="slot-arrow">↓ 投射 (project) ↓</div>
          <div class="shadow-root-box">
            <div class="sr-label">Shadow DOM</div>
            <div class="slot-receiver">
              <div class="named-slot">
                <span class="slot-tag">slot[name="title"]</span>
                <span class="slot-result">← "我的标题"</span>
              </div>
              <div class="default-slot">
                <span class="slot-tag">slot (默认)</span>
                <span class="slot-result">← &lt;p&gt;一些内容&lt;/p&gt;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: ::part -->
      <div v-if="step === 5" class="panel">
        <div class="part-visual">
          <div class="external-css">
            <div class="css-label">外部 CSS (通过 ::part)</div>
            <div class="css-rule success">my-card::part(header) { background: #4f46e5; }</div>
            <div class="css-rule success">my-card::part(body) { font-size: 14px; }</div>
            <div class="css-result pass">✓ 通过 ::part() 可以选择性穿透</div>
          </div>
          <div class="host-box">
            <div class="host-label">&lt;my-card&gt;</div>
            <div class="shadow-root-box">
              <div class="sr-label">Shadow DOM</div>
              <div class="part-content">
                <div class="part-element exposed">
                  <span class="part-attr">part="header"</span>
                  <span class="part-status">可被 ::part(header) 选中 ✓</span>
                </div>
                <div class="part-element exposed">
                  <span class="part-attr">part="body"</span>
                  <span class="part-status">可被 ::part(body) 选中 ✓</span>
                </div>
                <div class="part-element hidden">
                  <span class="part-attr">footer (无 part)</span>
                  <span class="part-status">外部无法选中 ✗</span>
                </div>
              </div>
            </div>
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
.shadow-demo {
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
  min-height: 180px;
  margin-bottom: 12px;
}

.panel {
  padding: 12px;
  background: var(--vp-c-bg);
  border-radius: 6px;
  overflow: auto;
}

/* Code block */
.code-block {
  font-family: monospace;
  font-size: 12px;
  line-height: 1.8;
  padding: 12px;
  background: #1e1e1e;
  border-radius: 4px;
  color: #d4d4d4;
}

.code-line { display: block; }
.code-line.indent { padding-left: 20px; }
.kw { color: #569cd6; }
.cls { color: #4ec9b0; }
.fn { color: #dcdcaa; }
.str { color: #ce9178; }
.prop { color: #9cdcfe; }
.cm { color: #6a9955; }

/* Shadow visual */
.shadow-visual, .isolation-visual, .slot-visual, .part-visual {
  margin-bottom: 12px;
}

.host-box {
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
}

.host-box.filled { border-color: #8b5cf6; }

.host-label {
  font-size: 13px;
  font-weight: bold;
  color: #8b5cf6;
  margin-bottom: 6px;
}

.host-label-sub {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.shadow-root-box {
  border: 2px dashed #3b82f6;
  border-radius: 4px;
  padding: 10px;
  margin-top: 8px;
  background: rgba(59, 130, 246, 0.05);
}

.shadow-root-box.filled { background: rgba(59, 130, 246, 0.1); }
.shadow-root-box.isolated { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }

.sr-label {
  font-size: 11px;
  font-weight: bold;
  color: #3b82f6;
  margin-bottom: 6px;
}

.sr-status {
  font-size: 11px;
  color: #22c55e;
}

.sr-content {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sr-style, .sr-html {
  flex: 1;
  min-width: 200px;
  padding: 8px;
  background: #1e1e1e;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #d4d4d4;
}

/* Isolation */
.external-css {
  margin-bottom: 10px;
}

.css-label {
  font-size: 11px;
  font-weight: bold;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.css-rule {
  padding: 4px 8px;
  margin: 2px 0;
  font-family: monospace;
  font-size: 11px;
  background: #1e1e1e;
  border-radius: 3px;
  color: #d4d4d4;
}

.css-rule.success { border-left: 3px solid #22c55e; }

.css-result {
  font-size: 11px;
  padding: 4px 8px;
  margin-top: 4px;
  border-radius: 3px;
}

.css-result.fail {
  background: #fef2f2;
  color: #dc2626;
}

.css-result.pass {
  background: #f0fdf4;
  color: #16a34a;
}

.isolated-content {
  padding: 8px;
}

.isolated-card {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
  background: #fff;
}

.isolated-title {
  font-size: 14px;
  font-weight: bold;
  color: #4f46e5;
}

.isolated-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.css-rule-internal {
  font-size: 10px;
  color: var(--vp-c-text-2);
  margin-top: 6px;
  font-style: italic;
}

/* Slot */
.light-dom {
  border: 2px solid #22c55e;
  border-radius: 6px;
  padding: 10px;
  background: rgba(34, 197, 94, 0.05);
}

.light-label {
  font-size: 11px;
  font-weight: bold;
  color: #22c55e;
  margin-bottom: 6px;
}

.light-item {
  padding: 4px 8px;
  margin: 4px 0;
  font-family: monospace;
  font-size: 11px;
  background: #f0fdf4;
  border-radius: 3px;
  color: #166534;
}

.slot-arrow {
  text-align: center;
  padding: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.slot-receiver {
  padding: 6px;
}

.named-slot, .default-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.slot-tag {
  font-family: monospace;
  font-size: 10px;
  padding: 2px 6px;
  background: #dbeafe;
  border-radius: 3px;
  color: #1d4ed8;
}

.slot-result {
  font-size: 11px;
  color: #22c55e;
}

/* Part */
.part-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.part-element {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.part-element.exposed {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
}

.part-element.hidden {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
}

.part-attr {
  font-family: monospace;
  font-weight: bold;
}

.part-status {
  font-size: 10px;
  color: var(--vp-c-text-2);
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
  .sr-content { flex-direction: column; }
  .named-slot, .default-slot { flex-direction: column; align-items: flex-start; }
  .part-element { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>
