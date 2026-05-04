# 表格

HTML 表格用于展示**表格化数据**（不是用于布局）。正确的表格结构对可访问性和数据呈现都至关重要。

## table 完整结构

```html
<table>
  <caption>2026 年 Q1 销售数据</caption>
  <colgroup>
    <col>
    <col span="2" class="sales">
    <col>
  </colgroup>
  <thead>
    <tr>
      <th scope="col">产品</th>
      <th scope="col">一月</th>
      <th scope="col">二月</th>
      <th scope="col">三月</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">产品 A</th>
      <td>¥12,000</td>
      <td>¥15,000</td>
      <td>¥18,000</td>
    </tr>
    <tr>
      <th scope="row">产品 B</th>
      <td>¥8,000</td>
      <td>¥9,500</td>
      <td>¥11,000</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">合计</th>
      <td>¥20,000</td>
      <td>¥24,500</td>
      <td>¥29,000</td>
    </tr>
  </tfoot>
</table>
```

### 结构元素说明

| 元素 | 用途 |
|------|------|
| `<table>` | 表格容器 |
| `<caption>` | 表格标题，必须是 `<table>` 的第一个子元素 |
| `<colgroup>` / `<col>` | 定义列的样式分组 |
| `<thead>` | 表头区域 |
| `<tbody>` | 表体区域 |
| `<tfoot>` | 表尾区域 |
| `<tr>` | 表行 |
| `<th>` | 表头单元格（加粗、居中） |
| `<td>` | 数据单元格 |

### colgroup / col

```html
<table>
  <colgroup>
    <col class="product">          <!-- 第 1 列 -->
    <col span="2" class="numeric"> <!-- 第 2-3 列 -->
    <col class="total">            <!-- 第 4 列 -->
  </colgroup>
  <!-- ... -->
</table>

<style>
col.product { background: #f3f4f6; width: 150px; }
col.numeric { text-align: right; }
col.total   { background: #fef3c7; font-weight: bold; }
</style>
```

## 单元格合并

```html
<!-- colspan：跨列合并 -->
<table>
  <thead>
    <tr>
      <th colspan="2">产品信息</th>
      <th colspan="2">销售数据</th>
    </tr>
    <tr>
      <th>编号</th>
      <th>名称</th>
      <th>Q1</th>
      <th>Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>001</td>
      <td>产品 A</td>
      <td>¥10,000</td>
      <td>¥12,000</td>
    </tr>
  </tbody>
</table>

<!-- rowspan：跨行合并 -->
<table>
  <thead>
    <tr>
      <th>分类</th>
      <th>产品</th>
      <th>价格</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">前端</td>
      <td>HTML 教程</td>
      <td>¥99</td>
    </tr>
    <tr>
      <td>CSS 教程</td>
      <td>¥99</td>
    </tr>
    <tr>
      <td rowspan="2">后端</td>
      <td>Java 教程</td>
      <td>¥149</td>
    </tr>
    <tr>
      <td>Python 教程</td>
      <td>¥129</td>
    </tr>
  </tbody>
</table>

<!-- colspan + rowspan 综合 -->
<table>
  <tr>
    <th colspan="3">季度销售报表</th>
  </tr>
  <tr>
    <th rowspan="2">产品</th>
    <th colspan="2">销售额</th>
  </tr>
  <tr>
    <th>Q1</th>
    <th>Q2</th>
  </tr>
  <tr>
    <td>产品 A</td>
    <td>¥10,000</td>
    <td>¥12,000</td>
  </tr>
</table>
```

::: warning 合并单元格的陷阱
- `colspan` 和 `rowspan` 会影响后续行/列的单元格对齐
- 手工维护合并表格很复杂，建议使用工具生成或可视化验证
- 合并后的表格对屏幕阅读器的体验会下降，尽量避免复杂的合并
:::

## 表格可访问性

### scope 属性

```html
<table>
  <caption>员工信息表</caption>
  <thead>
    <tr>
      <th scope="col">姓名</th>
      <th scope="col">部门</th>
      <th scope="col">薪资</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">张三</th>
      <td>研发</td>
      <td>¥20,000</td>
    </tr>
    <tr>
      <th scope="row">李四</th>
      <td>产品</td>
      <td>¥18,000</td>
    </tr>
  </tbody>
</table>
```

`scope` 值：
- `col`：该 `<th>` 是其所在列的标题
- `row`：该 `<th>` 是其所在行的标题
- `colgroup`：跨列标题组
- `rowgroup`：跨行标题组

### headers 属性

```html
<!-- 复杂表格使用 headers 属性明确关联 -->
<table>
  <caption>课程安排</caption>
  <thead>
    <tr>
      <th id="time">时间</th>
      <th id="mon">周一</th>
      <th id="tue">周二</th>
      <th id="wed">周三</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th id="morning">上午</th>
      <td headers="mon morning">数学</td>
      <td headers="tue morning">语文</td>
      <td headers="wed morning">英语</td>
    </tr>
    <tr>
      <th id="afternoon">下午</th>
      <td headers="mon afternoon">体育</td>
      <td headers="tue afternoon">音乐</td>
      <td headers="wed afternoon">美术</td>
    </tr>
  </tbody>
</table>
```

::: tip caption 的重要性
`<caption>` 是表格的标题，屏幕阅读器会先朗读它，让用户了解表格的内容。不要省略 `<caption>`，它对可访问性至关重要。
:::

## 响应式表格策略

### 方案一：水平滚动

```html
<style>
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
table {
  min-width: 600px;
}
</style>

<div class="table-wrapper">
  <table>
    <!-- 宽表格在小屏幕上水平滚动 -->
  </table>
</div>
```

### 方案二：卡片化（小屏幕）

```html
<style>
@media (max-width: 600px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }
  thead {
    display: none; /* 隐藏表头 */
  }
  tr {
    margin-bottom: 1em;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }
  td {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  td::before {
    content: attr(data-label);
    font-weight: bold;
  }
}
</style>

<table>
  <thead>
    <tr>
      <th>产品</th>
      <th>价格</th>
      <th>库存</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="产品">产品 A</td>
      <td data-label="价格">¥99</td>
      <td data-label="库存">100</td>
    </tr>
  </tbody>
</table>
```

### 方案三：优先级列

```html
<style>
/* 小屏幕隐藏次要列 */
@media (max-width: 768px) {
  .hide-mobile {
    display: none;
  }
}
</style>

<table>
  <thead>
    <tr>
      <th>名称</th>
      <th class="hide-mobile">描述</th>
      <th>价格</th>
      <th class="hide-mobile">创建时间</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>产品 A</td>
      <td class="hide-mobile">这是一个产品描述</td>
      <td>¥99</td>
      <td class="hide-mobile">2026-05-04</td>
    </tr>
  </tbody>
</table>
```

::: tip 表格使用原则
- 只用于展示二维数据，不用来做布局
- 始终包含 `<caption>` 和 `scope` 属性
- 简单的键值对用 `<dl>` 而非 `<table>`
- 复杂的响应式表格考虑用卡片布局替代
:::
