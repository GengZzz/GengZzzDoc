<script setup lang="ts">
import { ref, computed } from 'vue';

type Mode = 'no-pipeline' | 'pipeline' | 'pipeline-hazard';
const mode = ref<Mode>('no-pipeline');
const step = ref(0);

const stages = ['IF', 'ID', 'EX', 'MEM', 'WB'];

const instructions = [
  { name: 'I1', type: 'normal' },
  { name: 'I2', type: 'normal' },
  { name: 'I3', type: 'normal' },
  { name: 'I4', type: 'normal' },
  { name: 'I5', type: 'normal' },
  { name: 'I6', type: 'normal' },
];

const instructionsWithHazard = [
  { name: 'ADD R1,R2,R3', type: 'normal' },
  { name: 'SUB R4,R1,R5', type: 'hazard', dependsOn: 0, desc: '数据冲突: 依赖 R1' },
  { name: 'AND R6,R7,R8', type: 'normal' },
  { name: 'OR  R9,R10,R11', type: 'normal' },
  { name: 'XOR R12,R13,R14', type: 'normal' },
  { name: 'LOAD R15,[R16]', type: 'normal' },
];

const stallCount = 2; // stalls introduced by hazard

// Total time slots
const noPipeTotal = instructions.length * stages.length;
const pipeTotal = stages.length + instructions.length - 1;
const hazardTotal = pipeTotal + stallCount;

const maxSteps = computed(() => {
  if (mode.value === 'no-pipeline') return noPipeTotal;
  if (mode.value === 'pipeline') return pipeTotal;
  return hazardTotal;
});

function getCellState(instrIdx: number, timeSlot: number): string {
  if (mode.value === 'no-pipeline') {
    // Sequential: each instruction takes 5 slots
    const start = instrIdx * stages.length;
    const offset = timeSlot - start;
    if (offset >= 0 && offset < stages.length) return stages[offset];
    return '';
  }

  if (mode.value === 'pipeline') {
    // Ideal pipeline
    const offset = timeSlot - instrIdx;
    if (offset >= 0 && offset < stages.length) return stages[offset];
    return '';
  }

  // Pipeline with hazard: I2 is stalled for 2 cycles
  if (instrIdx === 0) {
    const offset = timeSlot;
    if (offset >= 0 && offset < stages.length) return stages[offset];
    return '';
  }
  if (instrIdx === 1) {
    // I2 starts 2 slots later due to stall
    const actualStart = 1 + stallCount;
    const offset = timeSlot - actualStart;
    if (offset >= 0 && offset < stages.length) return stages[offset];
    if (timeSlot >= 1 && timeSlot < actualStart) return 'stall';
    return '';
  }
  // Other instructions shifted by stallCount
  const shiftedStart = instrIdx + stallCount;
  const offset = timeSlot - shiftedStart;
  if (offset >= 0 && offset < stages.length) return stages[offset];
  return '';
}

function next() {
  step.value++;
  if (step.value > maxSteps.value) {
    step.value = 0;
  }
}

function reset() {
  step.value = 0;
}

function switchMode(m: Mode) {
  mode.value = m;
  reset();
}

const currentInstructions = computed(() => {
  return mode.value === 'pipeline-hazard' ? instructionsWithHazard : instructions;
});

const efficiency = computed(() => {
  if (step.value === 0) return '—';
  const n = currentInstructions.value.length;
  const k = stages.length;
  const completed =
    mode.value === 'no-pipeline'
      ? Math.floor(step.value / stages.length)
      : Math.max(0, step.value - stages.length + 1);
  const theoretical = n * k;
  const actual = step.value;
  return actual > 0 ? ((((theoretical / actual) * 100) / n) * 100).toFixed(0) + '%' : '—';
});

const stageColors: Record<string, string> = {
  IF: '#3b82f6',
  ID: '#8b5cf6',
  EX: '#22c55e',
  MEM: '#f59e0b',
  WB: '#ef4444',
  stall: '#6b7280',
};
</script>

<template>
  <div class="pipe-demo">
    <div class="mode-tabs">
      <button :class="{ active: mode === 'no-pipeline' }" @click="switchMode('no-pipeline')">
        顺序执行
      </button>
      <button :class="{ active: mode === 'pipeline' }" @click="switchMode('pipeline')">
        理想流水线
      </button>
      <button
        :class="{ active: mode === 'pipeline-hazard' }"
        @click="switchMode('pipeline-hazard')"
      >
        数据冲突
      </button>
    </div>

    <div class="info-bar">
      <span v-if="mode === 'no-pipeline'">无流水线：每条指令执行完才开始下一条</span>
      <span v-else-if="mode === 'pipeline'">理想情况：5 级流水线，指令并行执行</span>
      <span v-else>I2 依赖 I1 的 R1，需要插入 2 个 stall 等待结果</span>
    </div>

    <!-- Stage legend -->
    <div class="legend">
      <span v-for="s in stages" :key="s" class="legend-item">
        <span class="legend-dot" :style="{ background: stageColors[s] }"></span>
        {{ s }}
      </span>
      <span v-if="mode === 'pipeline-hazard'" class="legend-item">
        <span class="legend-dot" :style="{ background: stageColors.stall }"></span>
        Stall
      </span>
    </div>

    <!-- Pipeline grid -->
    <div class="pipeline-grid">
      <table>
        <thead>
          <tr>
            <th class="inst-col">指令</th>
            <th v-for="t in maxSteps" :key="t" :class="{ 'active-col': t - 1 === step - 1 }">
              T{{ t }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(inst, ii) in currentInstructions" :key="ii">
            <td class="inst-name" :class="{ hazard: inst.type === 'hazard' }">
              {{ inst.name }}
              <small v-if="inst.type === 'hazard'">{{ (inst as any).desc }}</small>
            </td>
            <td
              v-for="t in maxSteps"
              :key="t"
              class="cell"
              :class="{
                filled: !!getCellState(ii, t - 1),
                'active-col': t - 1 === step - 1,
              }"
            >
              <span
                v-if="getCellState(ii, t - 1)"
                class="stage-badge"
                :class="{ stall: getCellState(ii, t - 1) === 'stall' }"
                :style="{
                  background: stageColors[getCellState(ii, t - 1)] || 'transparent',
                  color: '#fff',
                }"
                >{{ getCellState(ii, t - 1) === 'stall' ? '⏸' : getCellState(ii, t - 1) }}</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Metrics -->
    <div v-if="step > 0" class="metrics">
      <span>时钟周期: {{ step }} / {{ maxSteps }}</span>
      <span
        >完成指令: {{ mode === 'no-pipeline' ? Math.floor(step / 5) : Math.max(0, step - 4) }} /
        {{ currentInstructions.length }}</span
      >
    </div>

    <div class="actions">
      <button @click="next">{{ step >= maxSteps ? '重置' : '下一步' }}</button>
      <button @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.pipe-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
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
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-weight: 600;
}

.info-bar {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 10px;
  padding: 6px 10px;
  background: var(--vp-c-bg);
  border-radius: 6px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.pipeline-grid {
  overflow-x: auto;
  margin-bottom: 10px;
}

table {
  border-collapse: collapse;
  font-size: 12px;
}

th {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  font-weight: 600;
  text-align: center;
  font-size: 11px;
  color: var(--vp-c-text-2);
  min-width: 36px;
}

td {
  padding: 4px 6px;
  border: 1px solid var(--vp-c-border);
  text-align: center;
  min-width: 36px;
  height: 36px;
}

.active-col {
  background: rgba(245, 158, 11, 0.08) !important;
}

.inst-col {
  min-width: 120px;
}

.inst-name {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  min-width: 120px;
}

.inst-name.hazard {
  color: #ef4444;
}

.inst-name small {
  display: block;
  font-weight: 400;
  font-size: 10px;
  color: #ef4444;
}

.stage-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

.stage-badge.stall {
  background: #6b7280 !important;
}

.metrics {
  display: flex;
  gap: 16px;
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

@media (max-width: 560px) {
  .inst-col {
    min-width: 80px;
  }
  .inst-name {
    min-width: 80px;
    font-size: 10px;
  }
}
</style>
