<script setup lang="ts">
import { ref, computed } from 'vue'

type ContainerProp = 'justifyContent' | 'alignItems' | 'flexDirection' | 'flexWrap'

const activeProp = ref<ContainerProp>('justifyContent')
const justifyContent = ref('flex-start')
const alignItems = ref('stretch')
const flexDirection = ref('row')
const flexWrap = ref('nowrap')

const propOptions: Record<ContainerProp, { label: string; options: string[]; current: any }> = {
  justifyContent: { label: 'justify-content', options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'], current: justifyContent },
  alignItems: { label: 'align-items', options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'], current: alignItems },
  flexDirection: { label: 'flex-direction', options: ['row', 'row-reverse', 'column', 'column-reverse'], current: flexDirection },
  flexWrap: { label: 'flex-wrap', options: ['nowrap', 'wrap', 'wrap-reverse'], current: flexWrap }
}

const containerStyle = computed(() => ({
  display: 'flex',
  justifyContent: justifyContent.value,
  alignItems: alignItems.value,
  flexDirection: flexDirection.value,
  flexWrap: flexWrap.value,
  gap: '8px',
  minHeight: '200px',
  padding: '16px',
  border: '2px dashed #1a73e8',
  borderRadius: '8px',
  background: '#f0f4ff'
}))

const items = [
  { label: 'A', flex: '0 0 60px', height: '50px', bg: '#e3f2fd' },
  { label: 'B', flex: '0 0 80px', height: '70px', bg: '#fff3e0' },
  { label: 'C', flex: '0 0 50px', height: '40px', bg: '#e8f5e9' },
  { label: 'D', flex: '0 0 70px', height: '60px', bg: '#fce4ec' }
]

const codeSnippet = computed(() => {
  return `.container {
  display: flex;
  justify-content: ${justifyContent.value};
  align-items: ${alignItems.value};
  flex-direction: ${flexDirection.value};
  flex-wrap: ${flexWrap.value};
}`
})
</script>

<template>
  <div class="flexbox-demo">
    <h4>Flex 布局交互演示</h4>
    <div class="prop-tabs">
      <button
        v-for="(config, key) in propOptions"
        :key="key"
        :class="{ active: activeProp === key }"
        @click="activeProp = key as ContainerProp"
      >
        {{ config.label }}
      </button>
    </div>
    <div class="prop-controls">
      <button
        v-for="opt in propOptions[activeProp].options"
        :key="opt"
        :class="{ selected: propOptions[activeProp].current.value === opt }"
        @click="propOptions[activeProp].current.value = opt"
      >
        {{ opt }}
      </button>
    </div>
    <div :style="containerStyle">
      <div
        v-for="item in items"
        :key="item.label"
        class="flex-item"
        :style="{
          flex: item.flex,
          height: item.height,
          background: item.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: '16px',
          border: '1px solid rgba(0,0,0,0.1)'
        }"
      >
        {{ item.label }}
      </div>
    </div>
    <pre class="code-output"><code>{{ codeSnippet }}</code></pre>
  </div>
</template>

<style scoped>
.flexbox-demo {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
  background: #fafafa;
}
.prop-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.prop-tabs button {
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-family: monospace;
}
.prop-tabs button.active {
  border-color: #1a73e8;
  background: #e8f0fe;
  color: #1a73e8;
  font-weight: 600;
}
.prop-controls {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.prop-controls button {
  padding: 5px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  font-family: monospace;
}
.prop-controls button.selected {
  background: #1a73e8;
  color: #fff;
  border-color: #1a73e8;
}
.code-output {
  margin-top: 14px;
  background: #263238;
  color: #eeffff;
  padding: 14px;
  border-radius: 6px;
  font-size: 13px;
  overflow-x: auto;
}
</style>
