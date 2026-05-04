<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const steps = [
  {
    title: '首次请求：完整编译',
    desc: 'PHP 收到请求，执行完整的编译流程：词法分析 → 语法分析 → AST → Opcodes → 执行。没有缓存，每个请求都要编译',
    phases: [
      { name: '词法分析', status: 'active', note: '源码 → Token 流' },
      { name: '语法分析', status: 'active', note: 'Token → AST' },
      { name: '编译', status: 'active', note: 'AST → Opcodes' },
      { name: '执行', status: 'active', note: 'Zend VM 执行' }
    ],
    perf: { label: '耗时', value: '~50ms（含编译）' }
  },
  {
    title: 'Opcodes 缓存到共享内存',
    desc: '首次编译后的 Opcodes 存入 OPcache 共享内存（shm），后续请求直接使用，无需重复编译',
    phases: [
      { name: '词法分析', status: 'skip', note: '跳过' },
      { name: '语法分析', status: 'skip', note: '跳过' },
      { name: '编译', status: 'cached', note: 'Opcodes 已缓存' },
      { name: '执行', status: 'active', note: 'Zend VM 执行' }
    ],
    perf: { label: 'OPcache 状态', value: '已缓存到 shm' }
  },
  {
    title: '第二次请求：命中缓存',
    desc: '第二次请求同一文件，OPcache 命中共享内存缓存，直接取出 Opcodes 执行，跳过全部编译步骤',
    phases: [
      { name: '词法分析', status: 'skip', note: '跳过' },
      { name: '语法分析', status: 'skip', note: '跳过' },
      { name: '编译', status: 'skip', note: '缓存命中' },
      { name: '执行', status: 'active', note: '直接执行' }
    ],
    perf: { label: '耗时', value: '~15ms（提升 70%）' }
  },
  {
    title: '文件修改：时间戳校验',
    desc: '当 opcache.validate_timestamps=1 时，每次请求检查文件修改时间。文件被修改则缓存失效，重新编译',
    phases: [
      { name: '时间戳检查', status: 'active', note: '文件 mtime 对比' },
      { name: '缓存失效', status: 'warn', note: '文件已修改' },
      { name: '重新编译', status: 'active', note: '生成新 Opcodes' },
      { name: '执行', status: 'active', note: 'Zend VM 执行' }
    ],
    perf: { label: 'validate_timestamps', value: '生产环境建议关闭' }
  },
  {
    title: 'Preloading 预加载（PHP 7.4+）',
    desc: '在 php.ini 中配置 opcache.preload，PHP 启动时预加载框架核心代码到共享内存，所有请求共享，永不回收',
    phases: [
      { name: '启动阶段', status: 'active', note: '加载 preload 脚本' },
      { name: '框架代码', status: 'cached', note: '永久驻留 shm' },
      { name: '请求处理', status: 'active', note: '直接使用已加载类' },
      { name: '内存优化', status: 'cached', note: '减少重复加载' }
    ],
    perf: { label: '收益', value: 'Laravel 启动快 30-50%' }
  },
  {
    title: 'JIT 编译（PHP 8.0+）',
    desc: 'JIT 将热点 Opcodes 编译为机器码，绕过 Zend VM 解释执行。Tracing JIT 追踪热路径，适合 CPU 密集场景',
    phases: [
      { name: '热点检测', status: 'active', note: '函数调用计数' },
      { name: 'JIT 编译', status: 'active', note: 'Opcodes → 机器码' },
      { name: 'CPU 缓存', status: 'cached', note: '机器码缓存' },
      { name: '原生执行', status: 'active', note: 'CPU 直接执行' }
    ],
    perf: { label: '适用场景', value: 'CPU 密集型计算' }
  }
]

const current = computed(() => steps[step.value])

const statusClass = (s: string) => {
  if (s === 'active') return 'phase-active'
  if (s === 'cached') return 'phase-cached'
  if (s === 'skip') return 'phase-skip'
  if (s === 'warn') return 'phase-warn'
  return ''
}

function next() {
  if (step.value < totalSteps - 1) step.value++
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="opcache-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: step === i - 1 }"
      />
    </div>

    <h4>{{ current.title }}</h4>
    <p class="desc">{{ current.desc }}</p>

    <div class="phases">
      <div
        v-for="phase in current.phases"
        :key="phase.name"
        class="phase"
        :class="statusClass(phase.status)"
      >
        <div class="phase-name">{{ phase.name }}</div>
        <div class="phase-note">{{ phase.note }}</div>
      </div>
    </div>

    <div class="perf-bar">
      <span class="perf-label">{{ current.perf.label }}</span>
      <span class="perf-value">{{ current.perf.value }}</span>
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span class="step-label">{{ step + 1 }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.opcache-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-border);
  transition: background 0.3s;
}

.dot.active {
  background: var(--vp-c-brand-1);
}

h4 {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
  line-height: 1.6;
}

.phases {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.phase {
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  text-align: center;
  transition: all 0.3s;
}

.phase-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

.phase-cached {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.phase-skip {
  border-color: var(--vp-c-border);
  opacity: 0.5;
}

.phase-warn {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.phase-name {
  font-weight: 600;
  font-size: 12px;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.phase-note {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.perf-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  margin-bottom: 12px;
  font-size: 13px;
}

.perf-label {
  color: var(--vp-c-text-2);
}

.perf-value {
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

.step-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-left: auto;
}

@media (max-width: 560px) {
  .phases {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
