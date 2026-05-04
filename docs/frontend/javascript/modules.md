# 模块系统

JavaScript 有两种主要的模块系统：CommonJS（Node.js）和 ES Modules（浏览器 + 现代 Node.js）。

## ES Modules

ESM 是 JavaScript 的标准模块系统，浏览器原生支持。

```javascript
// math.js - 命名导出
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export const PI = 3.14159;

// 默认导出（每个模块一个）
export default class Calculator { /* ... */ }

// app.js - 导入
import Calculator from './math.js';           // 默认导入
import { add, PI } from './math.js';          // 命名导入
import * as math from './math.js';            // 命名空间导入
import { add as plus } from './math.js';      // 重命名

// 动态导入（返回 Promise）
const module = await import('./heavy.js');
```

### ESM 的关键特性

```javascript
// 静态分析：import 必须在顶层（动态 import 除外）
// import foo from './foo.js';  // 必须在文件顶部

// 导出是实时绑定（live binding），不是值的拷贝
// counter.js
export let count = 0;
export function increment() { count++; }

// app.js
import { count, increment } from './counter.js';
console.log(count);  // 0
increment();
console.log(count);  // 1（引用了原始绑定）

// 重新导出
export { add, subtract } from './math.js';
export { default as Calculator } from './calculator.js';
export * from './utils.js';  // 不导出 default
```

::: tip import.meta
```javascript
import.meta.url;       // 当前模块的 URL
import.meta.env;       // Vite 环境变量
import.meta.hot;       // Vite HMR API
```
:::

## CommonJS

Node.js 的传统模块系统，运行时加载。

```javascript
// math.js
function add(a, b) { return a + b; }
const PI = 3.14159;

module.exports = { add, PI };  // 导出对象
// 或
exports.add = add;             // 在 exports 上添加属性
exports.PI = PI;

// app.js - 导入
const { add, PI } = require('./math.js');
const math = require('./math.js');
```

### require 的行为

```javascript
// require 是同步的，返回 module.exports 的值
// 模块在首次 require 时执行，结果被缓存

// 缓存 key 是模块的绝对路径
const a = require('./mod');
const b = require('./mod');
a === b;  // true（同一对象，缓存命中）

// 循环引用：先返回未完成的 exports
// a.js
exports.done = false;
const b = require('./b.js');  // 此时 b.js 的 exports 可能不完整
exports.done = true;

// b.js
const a = require('./a.js');
console.log(a.done);  // false（a.js 还没执行完）
```

## ESM vs CommonJS

| 特性 | ESM | CommonJS |
|------|-----|----------|
| 语法 | `import`/`export` | `require`/`module.exports` |
| 加载 | 静态（编译时） | 动态（运行时） |
| 值 | 实时绑定（引用） | 值的拷贝 |
| this | `undefined` | `module.exports` |
| 顶层 await | 支持 | 不支持 |
| Tree Shaking | 支持 | 不支持 |
| 条件导入 | `import()` 动态导入 | `require()` 可在任何位置 |

::: warning ESM 与 CJS 互操作
- ESM 可以导入 CJS：`import pkg from './pkg.cjs'`（仅默认导入）
- CJS 导入 ESM：`await import('./module.mjs')`（必须用动态导入）
- `.mjs` 强制 ESM，`.cjs` 强制 CJS
:::

## Tree Shaking

ESM 的静态结构使打包工具可以移除未使用的导出。

```javascript
// utils.js
export function used() { /* ... */ }
export function unused() { /* ... */ }  // 不会被打包

// app.js
import { used } from './utils.js';
// 打包后 unused 函数被移除
```

::: tip 确保 Tree Shaking 生效
- 使用 `export`/`import`，避免 `export default` 对象
- 在 `package.json` 中设置 `"sideEffects": false`
- 避免在模块顶层产生副作用的代码
:::
