# 技术文档内容标准

> 本文件是 `site-doc-author` 技能的**内容深度与动画组件参考**，不是独立技能，不会单独触发。
> 由 `SKILL.md` 引用。定义编写高质量技术文档的完整规范，适用于本 VitePress 文档站点。

## 概述

你是一个技术文档编写专家。本规范用于保证单篇内容的深度与一致性。每次任务完成后必须提交 Git。

---

## 写作设计三原则（最高优先级）

下面三条统领一切细则。当具体规则与这三条冲突时，以这三条为准。每篇写完后，必须用每条的「自检」回答一遍。

### 原则一 · 深意：写「为什么」，不止「是什么」

平庸的文档是 API 的翻译；有深意的文档让读者理解设计者在权衡什么。

- **问题先行**：先讲它解决什么真实痛点、没有它会怎样，再讲它本身。
- **讲动机与机制**，不堆砌 API 列表。
- **必含取舍**：任何方案都有代价——讲清适用边界、反例、什么时候**不该**用。
- **给心智模型**：一个可迁移的类比/原理，而非一堆孤立记忆点。
- 🔎 自检：读完后，读者能解释「为什么这样设计」，还是只会「照着用」？

### 原则二 · 结构：一篇是一条论证，不是一张清单

- **单篇单主线**：围绕一个核心问题，开头点明，全篇都在回答它。
- **叙事弧**：痛点 → 朴素做法及其问题 → 改进/正解 → 本质 → 边界。
- **渐进式展开**：先给直觉的近似，再逐步精确化（progressive disclosure）。
- **依赖排序**：概念按前置依赖排列，绝不前向引用还没讲的东西。
- **显式承接**：小节之间有过渡句，让读者看见主线如何推进。
- 🔎 自检：把所有小标题抽出来单独读，是否构成一条讲得通的逻辑链？

### 原则三 · 易懂：迁就读者认知，不炫技

- **具体先于抽象**：先给场景/例子，再抽象出规律。
- **善用类比**：用熟悉事物解释陌生概念，并**点明类比的边界**。
- **渐进示例**：最小可运行 → 接近真实 → 边界/陷阱，三级递进。
- **纠正错误心智模型**：显式写「你可能以为…，其实…」。
- **术语即时定义**：首次出现当场解释，附英文原词。
- **控制认知负荷**：一次只引入一个新概念；长流程拆步骤；能图示就用动画组件/原理图。
- 🔎 自检：一个刚入门的人能顺下来吗？会在哪一句卡住？

### 文章级骨架（默认主线模板）

```text
# 标题（一个具体的问题或主题，不是泛泛的名词）
开篇 1 段：点明本篇要回答的核心问题 + 为什么值得读
## 痛点 / 背景：没有它时的困境（建立动机）
## 核心概念 / 机制：是什么 + 为什么这样设计
## 怎么用：渐进示例（最小 → 接近真实）
## 深入：原理 / 底层 / 边界 / 取舍
## 常见误区 + 对比选型（表格）
## 延伸：与其它知识的连接 + 参考链接
```

> 模板是默认主线，不是僵硬八股。可按主题裁剪，但「问题先行 / 渐进 / 取舍 / 误区」四个要素不可缺。

---

## 一、任务执行流程

按以下步骤执行，**每一步都必须完成**：

```
1. 确认需求
   ├── 明确要写哪些页面（文件名、路径）
   ├── 明确侧边栏分组结构
   ├── 确认是否需要 Vue 动画组件
   └── 确认目标目录（如 docs/backend/java/）

2. 创建内容文件
   ├── 每个 .md 文件遵循「内容规范」（见第二章）
   ├── 确保每个板块都有详细文字讲解
   └── 代码示例必须完整可运行

3. 创建动画组件（如需要）
   ├── 参照现有组件的模式（见第三章）
   ├── 在 .vitepress/theme/components/ 下创建 .vue 文件
   └── 在 theme/index.ts 中注册

4. 更新配置
   ├── 在 docs/.vitepress/configs/sidebar.ts 中添加侧边栏结构
   ├── 如需新增顶部导航，改 docs/.vitepress/configs/nav.ts
   ├── 确认导航栏链接正确
   └── 更新概览页 index.md 的链接表

5. 质量校验 + 构建验证
   ├── 运行 npm run lint:md，确认 0 error（可用 lint:md:fix 自动修）
   ├── 运行 npm run format:check（新增的 .vue/.ts 用 npm run format 格式化）
   └── 运行 npm run docs:build，确认无报错（含内部死链校验）

6. Git 提交推送
   ├── git add 相关文件
   ├── git commit（Conventional Commits 格式，commit-msg 钩子会校验）
   ├── git push origin main
   └── git push gitee main
```

---

## 二、内容规范

### 2.1 文件结构模板

每个 .md 文件必须遵循以下结构：

````markdown
# 页面标题

简介段落（2-3 句话说明本页覆盖什么内容，为什么重要）

## 板块一标题

说明段落。**必须用 2-5 句话解释这个概念是什么、为什么存在、日常开发中怎么用。** 不要只给代码。

```javascript
// 完整的代码示例
// 关键行要有注释说明
```
````

补充说明段落（代码中无法表达的注意事项、坑点、最佳实践）

::: tip 提示内容 :::
::: warning 警告内容 :::

## 板块二标题

...

````

### 2.2 每个板块/方法的讲解要求

**禁止**只贴代码不解释。每个板块必须包含以下内容（对应三原则）：

1. **概念说明 + 为什么**（2-5 句话，体现原则一）
   - 这个方法/概念是干什么的
   - **它解决什么问题、为什么存在 / 这样设计**（不能省略）
   - 参数是什么意思、返回值是什么
   - 什么时候用、什么时候**不**用

2. **代码示例**（至少 1 个，体现原则三的渐进示例）
   - 必须完整可运行，关键行要有注释
   - 优先「最小可运行 → 接近真实场景」两级
   - 至少 30% 示例来自真实开发场景，不全是 `foo`/`bar`

3. **注意事项 / 取舍 / 对比**（至少 1 条，体现原则一的取舍）
   - 常见的坑、易错的心智模型（「你可能以为…，其实…」）
   - 与类似方案的区别和**选型建议**（多方案时给对比表）
   - 性能注意事项、适用边界、最佳实践

#### 正确示例：

```markdown
### splice

`splice(start, deleteCount, ...items)` 是数组最灵活的方法，可以在任意位置删除、插入或替换元素。
第一个参数 `start` 是起始索引，第二个参数 `deleteCount` 是要删除的个数，
之后的参数是要插入的新元素。**会修改原数组**，返回被删除的元素组成的数组。

（代码示例...）

实际开发中 splice 最常见的用途是原地移除元素：
（代码示例...）

::: tip splice 三种用法总结
- 删除：`splice(起始位置, 删除数量)`
- 插入：`splice(起始位置, 0, 新元素...)`
- 替换：`splice(起始位置, 替换数量, 新元素...)`
:::
````

#### 错误示例：

```markdown
### splice

`arr.splice(1, 2)` — 删除两个元素。
`arr.splice(1, 0, 'x')` — 插入元素。
```

（只有代码，没有讲解，不合格）

### 2.3 内容深度标准

| 话题类型 | 深度要求                        | 示例                                   |
| -------- | ------------------------------- | -------------------------------------- |
| 基础语法 | 规则 + 常见陷阱 + 实际用途      | var/let/const 的作用域区别、暂时性死区 |
| API 方法 | 参数 + 返回值 + 对比 + 实战代码 | map vs forEach、slice vs splice        |
| 核心机制 | 原理图 + 内部过程 + 手写简化版  | 事件循环、Promise 状态机、原型链查找   |
| 设计模式 | 场景 + 代码 + 变体 + 取舍       | 观察者 vs 发布订阅、单例的各种实现     |
| 性能相关 | 数据 + 基准 + 优化前后对比      | V8 隐藏类、防抖 vs 节流的时间线        |

### 2.4 不要写的内容

- 不写「本节总结」或「学到了什么」
- 不写「让我们来看看」之类的空过渡语（但**要有体现主线的实质过渡**）
- 不写练习题
- 不写空泛的介绍（如「JavaScript 是一门非常流行的语言」）
- 不重复上一页已讲过的内容
- **不堆砌 API**：只列方法签名、不讲为什么和取舍 = 不合格
- **不做无主线的清单**：一篇若只是知识点罗列、读完抽不出一条逻辑链 = 不合格
- **不前向引用**：不在讲 A 时假设读者已懂后面才讲的 B
- **不滥用未解释的术语**：术语首次出现必须当场定义

---

## 三、Vue 动画组件规范

### 3.1 什么时候需要动画

当内容满足以下任一条件时，**必须**创建 Vue 动画组件：

- 有**步骤过程**（如事件循环执行、Promise 状态变化、GC 标记清除）
- 有**层次结构**（如原型链、继承关系、栈帧调用）
- 有**对比展示**（如抽象类 vs 接口、不同数据结构对比）
- 有**动态变化**（如内存分配、线程状态转换）

### 3.2 两种组件模式

**步进式（Step-based）**：用户点击「下一步」逐步观察过程

```vue
<script setup lang="ts">
import { computed, ref } from "vue";

const step = ref(0);
const totalSteps = 5;

// 每一步的状态用 computed 计算
const items = computed(() => {
  if (step.value === 0) return [];
  if (step.value === 1) return ["第一步内容"];
  // ...
  return [];
});

const description = computed(() => {
  const descs = ["描述0", "描述1" /* ... */];
  return descs[step.value];
});

function next() {
  step.value = (step.value + 1) % totalSteps;
}

function reset() {
  step.value = 0;
}
</script>

<template>
  <div class="demo">
    <!-- 内容区域 -->
    <div v-for="item in items" :key="item" class="block">{{ item }}</div>

    <!-- 状态说明 -->
    <div class="status-bar">{{ description }}</div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
/* 使用 VitePress CSS 变量 */
.demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.block {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
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
```

**点选式（Click-to-select）**：用户点击节点查看详细信息

```vue
<script setup lang="ts">
import { computed, ref } from "vue";

const selected = ref("optionA");

const description = computed(() => {
  if (selected.value === "optionA") return "选项A的说明";
  if (selected.value === "optionB") return "选项B的说明";
  return "";
});
</script>

<template>
  <div class="demo">
    <div class="nodes">
      <div
        v-for="node in ['optionA', 'optionB']"
        :key="node"
        class="node"
        :class="{ active: selected === node }"
        @click="selected = node"
      >
        {{ node }}
      </div>
    </div>
    <div class="status-bar">{{ description }}</div>
  </div>
</template>
<!-- 样式同上 -->
```

### 3.3 组件命名规则

```
JsXxxDemo.vue          — JavaScript
JavaXxxDemo.vue        — Java
CppXxxDemo.vue         — C++
MySQLXxxDemo.vue       — MySQL
// 格式：{技术栈}{功能名}Demo.vue
```

### 3.4 注册组件

在 `docs/.vitepress/theme/index.ts` 中：

```typescript
import JsXxxDemo from "./components/JsXxxDemo.vue";
// ...
app.component("JsXxxDemo", JsXxxDemo);
```

在 .md 文件中直接使用：

```markdown
<JsXxxDemo />
```

### 3.5 组件质量要求

- 移动端响应式（`@media (max-width: 560px)`）
- 使用 VitePress CSS 变量（`--vp-c-border`, `--vp-c-bg`, `--vp-c-text-1` 等）
- 交互按钮文字清晰（"下一步"、"重置"）
- 状态栏实时说明当前步骤发生了什么
- 代码参考区显示对应的源码（如果适用）

---

## 四、Git 提交规范

### 4.1 提交流程

每次任务完成后**必须**执行：

```bash
# 1. 查看状态
git status -s

# 2. 只添加本次任务涉及的文件（不要 git add .）
git add <相关文件>

# 3. 提交，格式：<类型>: <中文描述>（Conventional Commits，commit-msg 钩子强制校验）
#    在 Bash 工具里勿用 PowerShell here-string（@'...'@），用 -F 文件或 bash heredoc
git commit -F - <<'EOF'
docs: 添加 XXX 技术文档（N 页 + M 个动画组件）

简要说明覆盖了哪些内容

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF

# 4. 推送到两个远程
git push origin main
git push gitee main
```

### 4.2 提交信息规范

| 类型             | 场景         |
| ---------------- | ------------ |
| `docs: 添加 XXX` | 新增文档     |
| `docs: 完善 XXX` | 补充已有文档 |
| `docs: 重构 XXX` | 重写文档结构 |
| `fix: 修复 XXX`  | 修复文档错误 |

---

## 五、验收标准

文档编写完成后，必须逐项检查以下内容。**任何一项不通过都必须修复后才能提交**。

### 5.0 三原则自检（先过这一关）

提交前用三个自检问题逐一回答，任何一个答「否」就回去改：

- **深意**：读完后读者能解释「为什么这样设计」，而不只是「照着用」？
- **结构**：把所有小标题抽出来单独读，能构成一条讲得通的逻辑链？
- **易懂**：一个刚入门的人能顺下来吗？卡点在哪、是否已补类比/示例/定义？

### 5.1 内容验收清单

| 检查项         | 标准                                              | 不通过的示例             |
| -------------- | ------------------------------------------------- | ------------------------ |
| **板块完整性** | 每个板块都有概念说明 + 代码示例 + 注意事项        | 只有代码没有文字讲解     |
| **代码可运行** | 所有代码示例能直接复制运行（或标注了伪代码）      | 用了未定义的变量         |
| **实际场景**   | 至少 30% 的示例来自真实开发场景                   | 全是 `foo`/`bar`/`hello` |
| **深度标准**   | API 方法有参数+返回值+对比；机制有原理图+内部过程 | 只列了方法签名           |
| **无废话**     | 没有「本节总结」「让我们来看看」「学到了什么」    | 存在这些段落             |
| **自含性**     | 每页独立可读，不依赖前一页的知识                  | 开头写「上一节我们...」  |

### 5.2 构建验收清单

| 检查项     | 命令                                          |
| ---------- | --------------------------------------------- |
| 构建无报错 | `npm run docs:build` 必须成功                 |
| 侧边栏链接 | 所有 link 路径对应的 .md 文件存在             |
| 组件注册   | 每个 `<XxxDemo />` 在 theme/index.ts 中已注册 |
| 组件文件   | 每个 import 的 .vue 文件存在                  |

### 5.3 Git 验收清单

| 检查项   | 标准                         |
| -------- | ---------------------------- |
| 提交信息 | 中文描述，包含页数和组件数   |
| 推送成功 | origin 和 gitee 都推送成功   |
| 文件完整 | 本次任务的所有新文件都已提交 |

---

## 六、目录结构参考

```
docs/
├── .vitepress/
│   ├── config.ts              # 主配置（import 聚合）
│   ├── configs/
│   │   ├── nav.ts             # 顶部导航
│   │   └── sidebar.ts         # 侧边栏（新增文档在此补入口）
│   └── theme/
│       ├── index.ts           # 组件注册
│       └── components/
│           └── JsXxxDemo.vue  # 动画组件
└── frontend/javascript/
    ├── index.md               # 概览（学习路径表 + 嵌入组件）
    ├── page-1.md              # 内容页
    ├── page-2.md
    └── ...
```

---

## 七、多 Agent 并发执行

当用户要求同时编写多个技术栈的文档时，使用 Agent 并发模式。

### 7.1 触发条件

用户说类似：

- "同时写 XXX、YYY、ZZZ 的文档"
- "用 agent teams 完成 XXX"
- "并行编写多个技术文档"

### 7.2 执行方式

```
将任务拆分为 N 个独立子任务，每个子任务由一个 Agent 执行：

Agent 1: 技术栈 A（如 JavaScript）
  └── 完成所有页面 + 组件 + 配置 + 提交推送

Agent 2: 技术栈 B（如 TypeScript）
  └── 完成所有页面 + 组件 + 配置 + 提交推送

每个 Agent 必须：
1. 读取本 Skill 文件了解规范
2. 独立完成全部内容
3. 独立构建验证
4. 独立提交并推送到 origin 和 gitee

如果推送时遇到远程已更新（其他 Agent 先推送了），
执行 git pull --rebase 后重新推送。
```

### 7.3 并发注意事项

- 每个 Agent 的侧边栏配置修改可能冲突 → 最后一个 Agent 负责合并
- 每个 Agent 的 theme/index.ts 修改可能冲突 → 最后一个 Agent 负责合并
- 如果有冲突，按顺序执行而非并行

---

## 八、兼容其他 AI 工具

本 Skill 的内容不依赖 Claude Code 特有功能。以下配置可直接复制到其他 AI 工具：

### ChatGPT / Claude 网页版

将第二章「内容规范」和第五章「验收标准」作为 System Prompt 使用。

### Cursor / Copilot

将本文件内容保存为项目根目录的 `.cursorrules` 或 `.github/copilot-instructions.md`。

### 通用用法

直接将本文件的全文作为对话的系统指令或任务描述发送给任何 AI。
