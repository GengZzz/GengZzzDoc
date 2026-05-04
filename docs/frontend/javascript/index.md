# JavaScript

JavaScript 是一门运行在浏览器和 Node.js 中的动态类型语言，也是前端开发的核心。这套文档从引擎原理到高级特性，覆盖 JavaScript 核心知识体系。

<JsEventLoopDemo />

## 学习路径

### 入门

| 章节 | 内容 |
| --- | --- |
| [语言基础](./language-basics) | 变量声明、类型系统、运算符、类型转换与强制转换 |
| [控制流](./control-flow) | 条件、循环、异常处理、标签循环 |
| [函数深入](./functions) | 函数类型、作用域链、闭包、IIFE、柯里化 |
| [常用方法](./common-methods) | 数组 map/filter/reduce/sort、字符串 split/replace/trim 等 |

### 核心机制

| 章节 | 内容 |
| --- | --- |
| [原型与继承](./prototypes) | 原型链、构造函数、class 语法糖、继承方式对比 |
| [异步编程](./async-programming) | 回调、Promise、async/await、并发控制 |
| [事件循环](./event-loop) | 调用栈、宏任务/微任务、浏览器 vs Node.js 差异 |

<JsPromiseChainDemo />

### 现代特性

| 章节 | 内容 |
| --- | --- |
| [ES6+ 特性](./es6-features) | 解构、展开运算符、模板字符串、可选链、空值合并 |
| [集合类型](./collections) | Map/Set/WeakMap/WeakSet、TypedArray、ArrayBuffer |
| [迭代器与生成器](./iterators-generators) | 迭代器协议、生成器函数、yield、异步迭代器 |
| [Proxy 与 Reflect](./proxy-reflect) | 拦截器、响应式原理、Vue3 响应式源码分析 |

### 模块与工程

| 章节 | 内容 |
| --- | --- |
| [模块系统](./modules) | CommonJS vs ESM、Tree Shaking、动态导入 |
| [错误处理](./error-handling) | Error 类型、自定义错误、错误边界、全局捕获 |
| [DOM 与 BOM](./dom-bom) | 节点操作、事件委托、History API、Storage |

### 进阶

| 章节 | 内容 |
| --- | --- |
| [性能优化](./performance) | 内存管理、GC、V8 优化、防抖节流、长列表优化 |
| [设计模式](./design-patterns) | 观察者、发布订阅、单例、策略、装饰器、组合 |
| [类型系统](./type-coercion) | 隐式转换规则、== vs ===、typeof/instanceof 原理 |
| [元编程](./metaprogramming) | Reflect API、Symbol、well-known Symbols、装饰器提案 |
| [正则表达式](./regex) | 语法、捕获组、前瞻后顾、性能陷阱 |

<JsPrototypeChainDemo />
