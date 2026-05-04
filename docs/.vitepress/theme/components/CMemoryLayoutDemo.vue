<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 6

const descriptions = [
  '程序启动：加载代码段(.text)、只读数据(.rodata)、已初始化数据(.data)、BSS 段',
  '声明局部变量 → 在栈上分配空间',
  'malloc() → 在堆上分配内存块',
  '函数调用 → 新栈帧压入栈顶',
  '函数返回 → 栈帧弹出，局部变量失效',
  '危险情况：栈溢出(递归过深) 与 堆溢出(缓冲区越界)'
]

const segments = computed(() => {
  const s = step.value
  return [
    { name: '.text (代码段)', color: '#6366f1', show: true, detail: '机器指令，只读' },
    { name: '.rodata (只读数据)', color: '#8b5cf6', show: true, detail: '字符串常量、const 变量' },
    { name: '.data (已初始化)', color: '#a855f7', show: true, detail: '全局初始化变量' },
    { name: 'BSS (未初始化)', color: '#c084fc', show: true, detail: '全局未初始化变量，默认零' },
    {
      name: 'Heap (堆)',
      color: '#f59e0b',
      show: true,
      detail: s >= 2 ? 'malloc 分配 → 向高地址增长' : '空闲，向高地址增长 ↑',
      highlight: s === 2,
      blocks: s >= 2 ? [{ label: 'malloc(64)', size: '64 bytes' }] : [],
      overflow: s === 5
    },
    {
      name: 'Stack (栈)',
      color: '#8b5cf6',
      show: true,
      detail: s >= 3 ? '函数调用 → 向低地址增长' : 'main() 栈帧，向低地址增长 ↓',
      highlight: s === 1 || s === 3,
      frames: s >= 3 ? ['main()', 'func()'] : s >= 1 ? ['main()'] : [],
      overflow: s === 5
    }
  ]
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="layout-demo">
    <div class="step-indicator">
      步骤 {{ step + 1 }} / {{ totalSteps }}
    </div>
    <p class="desc">{{ descriptions[step] }}</p>
    <div class="memory-map">
      <div class="addr-labels">
        <span>高地址 0xffff</span>
        <span>低地址 0x0000</span>
      </div>
      <div class="segments">
        <div
          v-for="seg in segments"
          :key="seg.name"
          class="segment"
          :class="{ highlight: seg.highlight, overflow: seg.overflow }"
          :style="{ borderColor: seg.color }"
        >
          <div class="seg-header" :style="{ background: seg.color + '22', color: seg.color }">
            {{ seg.name }}
          </div>
          <div class="seg-body">
            <span class="seg-detail">{{ seg.detail }}</span>
            <div v-if="seg.frames && seg.frames.length" class="frames">
              <div
                v-for="frame in seg.frames"
                :key="frame"
                class="frame"
                :style="{ borderColor: seg.color }"
              >{{ frame }}</div>
            </div>
            <div v-if="seg.blocks && seg.blocks.length" class="blocks">
              <div
                v-for="block in seg.blocks"
                :key="block.label"
                class="heap-block"
              >
                <span>{{ block.label }}</span>
                <small>{{ block.size }}</small>
              </div>
            </div>
            <div v-if="seg.overflow" class="overflow-warn">
              溢出！写入越界区域
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.layout-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.desc {
  margin: 0 0 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.memory-map {
  position: relative;
}

.addr-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-bottom: 4px;
}

.segments {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.segment {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.3s;
}

.segment.highlight {
  box-shadow: 0 0 0 2px var(--vp-c-brand-1);
}

.segment.overflow {
  box-shadow: 0 0 0 2px #ef4444;
}

.seg-header {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
}

.seg-body {
  padding: 8px 12px;
  background: var(--vp-c-bg);
  font-size: 12px;
}

.seg-detail {
  color: var(--vp-c-text-2);
}

.frames {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.frame {
  padding: 4px 10px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(139, 92, 246, 0.08);
  color: #8b5cf6;
}

.blocks {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.heap-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.08);
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
}

.heap-block small {
  font-size: 10px;
  opacity: 0.7;
  font-weight: 400;
}

.overflow-warn {
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
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
</style>
