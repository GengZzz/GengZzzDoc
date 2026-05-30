<script setup lang="ts">
import { computed, ref } from 'vue';

const step = ref(0);
const totalSteps = 7;

const stages = computed(() => [
  {
    name: 'push main',
    detail: '触发 workflow',
    active: step.value >= 1,
    status: step.value >= 1 ? 'done' : 'wait',
  },
  {
    name: 'build job',
    detail: 'checkout / setup-node / npm ci',
    active: step.value >= 2,
    status: step.value >= 4 ? 'done' : step.value >= 2 ? 'run' : 'wait',
  },
  {
    name: 'cache',
    detail: '复用 npm 缓存',
    active: step.value >= 3,
    status: step.value >= 3 ? 'done' : 'wait',
  },
  {
    name: 'artifact',
    detail: '上传 dist 产物',
    active: step.value >= 4,
    status: step.value >= 4 ? 'done' : 'wait',
  },
  {
    name: 'deploy job',
    detail: 'needs: build 后执行',
    active: step.value >= 5,
    status: step.value >= 6 ? 'done' : step.value >= 5 ? 'run' : 'wait',
  },
  {
    name: 'environment',
    detail: 'github-pages 环境记录 URL',
    active: step.value >= 6,
    status: step.value >= 6 ? 'done' : 'wait',
  },
  {
    name: 'concurrency',
    detail: '同组发布排队',
    active: step.value >= 7,
    status: step.value >= 7 ? 'done' : 'wait',
  },
]);

const visibleJobs = computed(() => {
  const jobs = [];
  if (step.value >= 2) jobs.push({ name: 'build', deps: '无', output: 'docs/.vitepress/dist' });
  if (step.value >= 5) jobs.push({ name: 'deploy', deps: 'needs: build', output: 'Pages URL' });
  return jobs;
});

const status = computed(() => {
  const list = [
    '点击"下一步"观察一次文档发布工作流如何跑完',
    'push 到 main 或手动 workflow_dispatch 会触发 Deploy Docs',
    'build job 在 ubuntu-latest 上运行，先拉代码、装 Node、安装依赖',
    'setup-node 的 cache: npm 会按 lockfile 复用依赖缓存，加快后续构建',
    'npm run docs:build 生成静态文件，再通过 upload-pages-artifact 上传 dist',
    'deploy job 通过 needs: build 等待构建成功，失败时不会发布旧产物',
    'deploy-pages 写入 github-pages 环境，并把最终 page_url 暴露到环境面板',
    'concurrency: pages 让同一发布组串行执行，避免多个部署互相覆盖',
  ];
  return list[step.value];
});

function next() {
  step.value = Math.min(step.value + 1, totalSteps);
}

function reset() {
  step.value = 0;
}
</script>

<template>
  <div class="gha-demo">
    <div class="pipeline">
      <div
        v-for="(stage, index) in stages"
        :key="stage.name"
        class="stage"
        :class="[stage.status, { active: stage.active }]"
      >
        <span class="index">{{ index + 1 }}</span>
        <strong>{{ stage.name }}</strong>
        <small>{{ stage.detail }}</small>
      </div>
    </div>

    <div class="jobs">
      <section class="job-panel">
        <h4>Jobs 依赖</h4>
        <div v-if="visibleJobs.length === 0" class="empty">尚未创建 job</div>
        <div v-for="job in visibleJobs" :key="job.name" class="job-card">
          <strong>{{ job.name }}</strong>
          <span>依赖：{{ job.deps }}</span>
          <span>输出：{{ job.output }}</span>
        </div>
      </section>

      <section class="job-panel">
        <h4>关键保护</h4>
        <div class="guard" :class="{ active: step >= 4 }">
          <strong>artifact 边界</strong>
          <span>deploy 只消费 build 上传的产物，不重新构建</span>
        </div>
        <div class="guard" :class="{ active: step >= 7 }">
          <strong>concurrency</strong>
          <span>同一发布组排队，降低并发发布冲突</span>
        </div>
      </section>
    </div>

    <div class="status-bar">{{ status }}</div>
    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span>{{ step }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.gha-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(7, minmax(92px, 1fr));
  gap: 8px;
  overflow-x: auto;
}

.stage {
  min-height: 94px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  transition: all 0.25s ease;
}

.stage.active {
  color: var(--vp-c-text-1);
}

.stage.run {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.stage.done {
  border-color: #22c55e;
}

.index {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-bottom: 8px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.stage.done .index {
  background: #22c55e;
  color: white;
}

.stage.run .index {
  background: #f59e0b;
  color: white;
}

.stage strong,
.stage small {
  display: block;
}

.stage strong {
  font-size: 13px;
}

.stage small {
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.45;
}

.jobs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.job-panel {
  padding: 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.job-card,
.guard {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  font-size: 13px;
}

.job-card + .job-card,
.guard + .guard {
  margin-top: 8px;
}

.job-card span,
.guard span {
  color: var(--vp-c-text-2);
  font-size: 12px;
}

.guard.active {
  border-color: var(--vp-c-brand-1);
}

.empty {
  display: grid;
  place-items: center;
  min-height: 76px;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.status-bar {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: center;
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
  cursor: default;
}

.actions span {
  margin-left: auto;
  color: var(--vp-c-text-2);
  font-size: 12px;
}

@media (max-width: 760px) {
  .pipeline {
    grid-template-columns: repeat(7, 128px);
  }

  .jobs {
    grid-template-columns: 1fr;
  }
}
</style>
