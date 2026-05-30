<script setup lang="ts">
import { ref, computed } from 'vue';

const templateColumns = ref('1fr 2fr 1fr');
const templateRows = ref('auto');
const gap = ref('12');
const gridAreas = ref(false);

const colCount = computed(() => {
  return templateColumns.value.trim().split(/\s+/).length;
});

const containerStyle = computed(() => {
  const style: Record<string, string> = {
    display: 'grid',
    gridTemplateColumns: templateColumns.value,
    gap: gap.value + 'px',
    padding: '16px',
    border: '2px dashed #43a047',
    borderRadius: '8px',
    background: '#f1f8e9',
    minHeight: '180px',
  };
  if (templateRows.value !== 'auto') {
    style.gridTemplateRows = templateRows.value;
  }
  if (gridAreas.value) {
    style.gridTemplateAreas = '"header header header" "sidebar main main" "footer footer footer"';
  }
  return style;
});

const gridItems = computed(() => {
  if (gridAreas.value) {
    return [
      { label: 'Header', area: 'header', bg: '#e3f2fd', h: '50px' },
      { label: 'Sidebar', area: 'sidebar', bg: '#fff3e0', h: '120px' },
      { label: 'Main', area: 'main', bg: '#e8f5e9', h: '120px' },
      { label: 'Footer', area: 'footer', bg: '#fce4ec', h: '50px' },
    ];
  }
  const colors = ['#e3f2fd', '#fff3e0', '#e8f5e9', '#fce4ec', '#f3e5f5', '#e0f7fa'];
  return Array.from({ length: colCount.value * 2 }, (_, i) => ({
    label: String(i + 1),
    area: '',
    bg: colors[i % colors.length],
    h: '60px',
  }));
});

const presets = [
  { label: '三等分', cols: '1fr 1fr 1fr' },
  { label: '侧边栏+主内容', cols: '250px 1fr' },
  { label: '圣杯布局', cols: '200px 1fr 200px' },
  { label: 'auto-fill', cols: 'repeat(auto-fill, minmax(120px, 1fr))' },
  { label: 'auto-fit', cols: 'repeat(auto-fit, minmax(120px, 1fr))' },
];

const codeSnippet = computed(() => {
  let code = `.grid-container {
  display: grid;
  grid-template-columns: ${templateColumns.value};
  gap: ${gap.value}px;`;
  if (gridAreas.value) {
    code += `
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";`;
  }
  code += '\n}';
  return code;
});
</script>

<template>
  <div class="grid-demo">
    <h4>Grid 布局交互演示</h4>

    <div class="controls-section">
      <label>列模板 (grid-template-columns)：</label>
      <div class="presets">
        <button
          v-for="p in presets"
          :key="p.label"
          :class="{ selected: templateColumns === p.cols }"
          @click="templateColumns = p.cols"
        >
          {{ p.label }}
        </button>
      </div>
      <input v-model="templateColumns" class="col-input" placeholder="如: 1fr 2fr 1fr" />
    </div>

    <div class="controls-row">
      <label>间距：<input type="range" v-model.number="gap" min="0" max="32" /> {{ gap }}px</label>
      <label>
        <input type="checkbox" v-model="gridAreas" />
        启用 grid-template-areas
      </label>
    </div>

    <div :style="containerStyle">
      <div
        v-for="item in gridItems"
        :key="item.label"
        class="grid-item"
        :style="{
          background: item.bg,
          minHeight: item.h,
          gridArea: item.area || undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: '14px',
          border: '1px solid rgba(0,0,0,0.1)',
        }"
      >
        {{ item.label }}
      </div>
    </div>

    <pre class="code-output"><code>{{ codeSnippet }}</code></pre>
  </div>
</template>

<style scoped>
.grid-demo {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
  background: #fafafa;
}
.controls-section {
  margin-bottom: 14px;
}
.controls-section label {
  font-weight: 600;
  font-size: 14px;
  display: block;
  margin-bottom: 8px;
}
.presets {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.presets button {
  padding: 5px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.presets button.selected {
  background: #43a047;
  color: #fff;
  border-color: #43a047;
}
.col-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  box-sizing: border-box;
}
.controls-row {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  align-items: center;
  font-size: 14px;
  flex-wrap: wrap;
}
.controls-row input[type='range'] {
  vertical-align: middle;
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
