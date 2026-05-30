<script setup lang="ts">
import { computed, ref } from 'vue';

interface Frame {
  phase: 'goal' | 'think' | 'act' | 'observe' | 'done';
  actor: string;
  text: string;
}

// 一个「让测试跑通」任务在智能体循环里的推进
const frames: Frame[] = [
  { phase: 'goal', actor: '用户', text: '目标：把这个项目的测试跑通' },
  { phase: 'think', actor: '模型（大脑）', text: '我还不知道项目结构，先读一下测试文件' },
  { phase: 'act', actor: 'Harness', text: '执行工具 read_file("test/app.test.ts")' },
  { phase: 'observe', actor: '环境', text: '返回文件内容 → 喂回给模型' },
  { phase: 'think', actor: '模型（大脑）', text: '看懂了，跑一下测试命令看结果' },
  { phase: 'act', actor: 'Harness', text: '执行工具 run("npm test")' },
  { phase: 'observe', actor: '环境', text: '返回报错：TypeError at utils.ts:12 → 喂回模型' },
  { phase: 'think', actor: '模型（大脑）', text: '定位到 utils.ts:12 的类型错误，修改它' },
  { phase: 'act', actor: 'Harness', text: '执行工具 edit_file + run("npm test")' },
  { phase: 'observe', actor: '环境', text: '返回：测试全部通过 ✓' },
  { phase: 'done', actor: '完成', text: '目标达成，结束循环' },
];

const phaseMeta: Record<Frame['phase'], { label: string; color: string }> = {
  goal: { label: '目标', color: '#64748b' },
  think: { label: '思考', color: '#6366f1' },
  act: { label: '行动（工具）', color: '#f59e0b' },
  observe: { label: '观察（反馈）', color: '#10b981' },
  done: { label: '完成', color: '#22c55e' },
};

const step = ref(0);
const total = frames.length;
const current = computed(() => frames[step.value]);
// 循环三相高亮：思考 → 行动 → 观察
const cyclePhase = computed(() => current.value.phase);

function next() {
  step.value = (step.value + 1) % total;
}
function reset() {
  step.value = 0;
}
</script>

<template>
  <div class="loop-demo">
    <div class="step-indicator">第 {{ step + 1 }} / {{ total }} 步</div>

    <div class="cycle">
      <div
        class="node"
        :class="{ active: cyclePhase === 'think' }"
        :style="{ borderColor: phaseMeta.think.color }"
      >
        思考
      </div>
      <span class="sep">→</span>
      <div
        class="node"
        :class="{ active: cyclePhase === 'act' }"
        :style="{ borderColor: phaseMeta.act.color }"
      >
        行动
      </div>
      <span class="sep">→</span>
      <div
        class="node"
        :class="{ active: cyclePhase === 'observe' }"
        :style="{ borderColor: phaseMeta.observe.color }"
      >
        观察
      </div>
      <span class="loop-back">↺ 循环</span>
    </div>

    <div class="frame" :style="{ borderColor: phaseMeta[current.phase].color }">
      <span class="badge" :style="{ background: phaseMeta[current.phase].color }">
        {{ phaseMeta[current.phase].label }}
      </span>
      <span class="actor">{{ current.actor }}</span>
      <p class="text">{{ current.text }}</p>
    </div>

    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.loop-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 10px;
}

.cycle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.node {
  padding: 6px 14px;
  border: 2px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition: all 0.25s;
}

.node.active {
  color: var(--vp-c-text-1);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
}

.sep {
  color: var(--vp-c-text-3);
  font-weight: 700;
}

.loop-back {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-left: 4px;
}

.frame {
  position: relative;
  padding: 12px 14px;
  border: 1px solid var(--vp-c-border);
  border-left-width: 4px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.actor {
  margin-left: 8px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.text {
  margin: 8px 0 0;
  font-size: 14px;
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

@media (max-width: 560px) {
  .loop-back {
    width: 100%;
    margin-left: 0;
  }
}
</style>
