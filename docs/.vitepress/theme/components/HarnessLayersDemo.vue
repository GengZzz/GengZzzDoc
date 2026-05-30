<script setup lang="ts">
import { computed, ref } from 'vue';

interface Layer {
  name: string;
  when: string;
  speed: string;
  cost: number; // 1-4，漏过此层后的修复成本
  catches: string;
  example: string;
}

const layers: Layer[] = [
  {
    name: '编辑器',
    when: '保存时',
    speed: '即时',
    cost: 1,
    catches: '缩进、行尾、基础格式（EditorConfig / 保存时格式化）',
    example: '把 Tab 自动转成空格、补上文件末尾换行',
  },
  {
    name: '提交钩子',
    when: 'git commit',
    speed: '秒级',
    cost: 2,
    catches: '暂存文件的格式与提交信息规范（lint-staged / commitlint）',
    example: '提交信息不符合 Conventional Commits → 直接打回',
  },
  {
    name: 'CI 流水线',
    when: 'push / PR',
    speed: '分钟级',
    cost: 3,
    catches: '全量 lint、构建、死链检查（不可被本地 --no-verify 绕过）',
    example: '本地跳过了钩子，CI 用同一套规则再拦一次',
  },
  {
    name: '部署门禁',
    when: '合并到主分支',
    speed: '部署级',
    cost: 4,
    catches: '构建失败即不发布——最后的兜底',
    example: '构建不通过，线上保持旧版本，坏内容上不了线',
  },
];

const selected = ref(1);
const current = computed(() => layers[selected.value]);
const costLabel = ['', '几乎为零', '低', '中', '高（已接近线上）'];
</script>

<template>
  <div class="harness-demo">
    <p class="lead">
      一个改动从左到右穿过各层，<strong>越靠左拦截越便宜</strong>（shift-left）。点击某一层查看它拦什么。
    </p>

    <div class="layers">
      <template v-for="(layer, i) in layers" :key="layer.name">
        <button
          type="button"
          class="layer"
          :class="{ active: selected === i }"
          @click="selected = i"
        >
          <span class="layer-name">{{ layer.name }}</span>
          <span class="layer-when">{{ layer.when }}</span>
          <span class="cost-dots" :aria-label="'修复成本 ' + layer.cost">
            <span v-for="n in 4" :key="n" class="dot" :class="{ filled: n <= layer.cost }"></span>
          </span>
        </button>
        <span v-if="i < layers.length - 1" class="arrow">→</span>
      </template>
    </div>

    <div class="detail">
      <div class="row">
        <span class="k">拦截</span><span class="v">{{ current.catches }}</span>
      </div>
      <div class="row">
        <span class="k">反馈速度</span><span class="v">{{ current.speed }}</span>
      </div>
      <div class="row">
        <span class="k">漏过代价</span><span class="v">{{ costLabel[current.cost] }}</span>
      </div>
      <div class="row">
        <span class="k">例子</span><span class="v">{{ current.example }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.harness-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.lead {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.layers {
  display: flex;
  align-items: stretch;
  gap: 4px;
  flex-wrap: wrap;
}

.layer {
  flex: 1 1 0;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.layer.active {
  box-shadow: 0 0 0 2px var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.layer-name {
  font-weight: 700;
  font-size: 14px;
}

.layer-when {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.cost-dots {
  display: flex;
  gap: 3px;
  margin-top: 2px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-border);
}

.dot.filled {
  background: var(--vp-c-brand-1);
}

.arrow {
  align-self: center;
  color: var(--vp-c-text-3);
  font-weight: 700;
}

.detail {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 13px;
}

.row {
  display: flex;
  gap: 10px;
  padding: 4px 0;
}

.row + .row {
  border-top: 1px dashed var(--vp-c-divider);
}

.k {
  flex: 0 0 64px;
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.v {
  flex: 1;
  color: var(--vp-c-text-1);
}

@media (max-width: 560px) {
  .arrow {
    display: none;
  }
  .layer {
    flex-basis: 100%;
  }
}
</style>
