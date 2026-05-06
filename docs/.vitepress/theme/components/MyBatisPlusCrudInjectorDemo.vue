<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)

const stages = [
  { title: '扫描 Mapper', note: 'Spring 扫描 UserMapper，识别它继承 BaseMapper<UserDO>。' },
  { title: '读取实体元数据', note: '@TableName、@TableId、字段策略形成 TableInfo。' },
  { title: 'SQL 注入器', note: 'DefaultSqlInjector 为 insert、selectById、updateById 等方法生成声明。' },
  { title: 'MappedStatement', note: '通用 CRUD 被注册到 MyBatis Configuration。' },
  { title: '业务调用', note: 'userMapper.selectById(1L) 最终仍然进入 MyBatis Executor。' },
]

const active = computed(() => stages[step.value])

function next() {
  step.value = (step.value + 1) % stages.length
}
</script>

<template>
  <div class="mp-demo">
    <div class="flow">
      <div
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="stage"
        :class="{ active: step === index, done: step > index }"
      >
        <b>{{ index + 1 }}</b>
        <strong>{{ stage.title }}</strong>
      </div>
    </div>
    <div class="code-panel">
      <code>BaseMapper&lt;UserDO&gt;</code>
      <span>→</span>
      <code>selectById / insert / updateById</code>
      <span>→</span>
      <code>Executor</code>
    </div>
    <p><strong>{{ active.title }}：</strong>{{ active.note }}</p>
    <button type="button" @click="next">下一步</button>
  </div>
</template>

<style scoped>
.mp-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.flow {
  display: grid;
  grid-template-columns: repeat(5, minmax(118px, 1fr));
  gap: 8px;
  overflow-x: auto;
}

.stage {
  min-height: 88px;
  padding: 10px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}

.stage.active {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.stage.done {
  opacity: 0.78;
}

.stage b {
  display: block;
  color: var(--vp-c-brand-1);
  font-size: 12px;
}

.stage strong {
  display: block;
  margin-top: 8px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.code-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.code-panel span {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

p {
  color: var(--vp-c-text-2);
  font-size: 13px;
}

button {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff;
  cursor: pointer;
}
</style>
