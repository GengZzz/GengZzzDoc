# 事件循环

JavaScript 是单线程的，但通过**事件循环**（Event Loop）实现了非阻塞的异步操作。理解事件循环是写出正确异步代码的基础。

<JsEventLoopDemo />

## 执行模型

JavaScript 运行时由三部分组成：

```
┌──────────────────────────────────────────────┐
│                  JavaScript 引擎               │
│  ┌──────────────┐    ┌─────────────────────┐  │
│  │  调用栈        │    │  堆（Heap）          │  │
│  │  (Call Stack) │    │  对象分配在这里       │  │
│  └──────────────┘    └─────────────────────┘  │
└──────────────────────────────────────────────┘
        ↑ 事件循环检查
┌──────────────────────────────────────────────┐
│  宏任务队列（MacroTask Queue）                  │
│  [setTimeout, setInterval, I/O, UI rendering] │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  微任务队列（MicroTask Queue）                  │
│  [Promise.then, queueMicrotask, MutationObs]  │
└──────────────────────────────────────────────┘
```

## 执行顺序

1. 执行同步代码（调用栈）
2. 调用栈清空后，**清空微任务队列**（所有微任务）
3. 执行一个宏任务
4. 回到步骤 2

```javascript
console.log('1 - 同步');

setTimeout(() => console.log('2 - 宏任务'), 0);

Promise.resolve().then(() => console.log('3 - 微任务'));

Promise.resolve().then(() => {
  console.log('4 - 微任务');
  setTimeout(() => console.log('5 - 宏任务（嵌套在微任务中）'), 0);
});

console.log('6 - 同步');

// 输出顺序：
// 1 - 同步
// 6 - 同步
// 3 - 微任务
// 4 - 微任务
// 2 - 宏任务
// 5 - 宏任务（嵌套在微任务中）
```

::: tip 记忆口诀
**同步 → 微任务 → 宏任务 → 微任务 → 宏任务 → ...**
每次宏任务执行完，必须先清空微任务队列。
:::

## 宏任务 vs 微任务

| 类型 | API | 场景 |
|------|-----|------|
| 宏任务 | `setTimeout`, `setInterval`, `setImmediate`(Node) | 延迟执行、定时器 |
| 宏任务 | `requestAnimationFrame` | 动画帧 |
| 宏任务 | I/O 操作, UI 渲染 | 浏览器事件 |
| 微任务 | `Promise.then/catch/finally` | 异步链式调用 |
| 微任务 | `queueMicrotask(fn)` | 显式调度微任务 |
| 微任务 | `MutationObserver` | DOM 变化监听 |

## 经典面试题

```javascript
async function async1() {
  console.log('async1 start');   // 同步
  await async2();
  console.log('async1 end');     // 微任务
}

async function async2() {
  console.log('async2');         // 同步
}

console.log('script start');     // 同步
setTimeout(() => console.log('setTimeout'), 0);  // 宏任务
async1();
new Promise((resolve) => {
  console.log('promise1');       // 同步（executor 立即执行）
  resolve();
}).then(() => console.log('promise2'));  // 微任务
console.log('script end');       // 同步

// 输出顺序：
// script start
// async1 start
// async2
// promise1
// script end
// async1 end      ← await 后面的代码是微任务
// promise2
// setTimeout
```

## 微任务的嵌套

```javascript
Promise.resolve().then(() => {
  console.log('微任务 1');
  Promise.resolve().then(() => {
    console.log('微任务 1-1');  // 嵌套微任务也会在当前轮次执行
  });
});

Promise.resolve().then(() => {
  console.log('微任务 2');
});

// 输出：微任务 1 → 微任务 2 → 微任务 1-1
// 规则：先处理已有的微任务，新产生的微任务排到队尾
```

::: warning 微任务饥饿
如果微任务不断产生新的微任务，宏任务永远不会执行（包括 UI 渲染），页面会卡死。避免在微任务中做无限循环。
:::

## Node.js 事件循环

Node.js 的事件循环分为多个阶段：

```
   timers (setTimeout/setInterval)
      ↓
   pending callbacks (系统回调)
      ↓
   poll (I/O 回调)
      ↓
   check (setImmediate)
      ↓
   close callbacks
```

```javascript
// Node.js 中的特殊行为
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

// 顺序不确定（取决于事件循环进入哪个阶段先）
// 但在 I/O 回调中，setImmediate 一定先于 setTimeout
fs.readFile('file.txt', () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));  // 一定先输出
});
```
