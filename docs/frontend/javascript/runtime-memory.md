---
title: "运行时与内存模型"
description: "理解运行时和内存模型，可以解释很多“为什么代码没报错但页面越来越卡”的问题。日常开发里，重点不是背 V8 内部细节，而是知道对象如何被引用、如何被回收、哪些写法会让优化失效。"
---

# 运行时与内存模型

理解运行时和内存模型，可以解释很多“为什么代码没报错但页面越来越卡”的问题。日常开发里，重点不是背 V8 内部细节，而是知道对象如何被引用、如何被回收、哪些写法会让优化失效。

## 栈与堆

JavaScript 运行时通常把执行上下文放在调用栈里，把对象、数组、函数等引用类型放在堆里。

```javascript
function createUser() {
  const name = 'Alice';
  const user = { name };
  return user;
}

const result = createUser();
```

可以这样理解：

```text
调用栈：
createUser 执行上下文
- name: 'Alice'
- user: 指向堆对象的引用

堆：
{ name: 'Alice' }
```

函数返回后，执行上下文会出栈，但返回的对象还被 `result` 引用，所以对象仍然存活。

## 原始值与引用值

```javascript
let a = 1;
let b = a;
b = 2;
console.log(a); // 1

const obj1 = { count: 1 };
const obj2 = obj1;
obj2.count = 2;
console.log(obj1.count); // 2
```

原始值复制的是值本身，引用值复制的是引用地址。日常写状态更新时，这个差异非常关键。

```javascript
// 不推荐：直接修改原对象
state.user.name = 'Bob';

// 推荐：创建新对象，方便变更追踪
state = {
  ...state,
  user: {
    ...state.user,
    name: 'Bob'
  }
};
```

## 垃圾回收

现代 JavaScript 引擎主要基于“可达性”判断对象是否还需要保留。

<JsMemoryLifecycleDemo />

如果一个对象可以从全局对象、当前调用栈、闭包、DOM 引用、定时器、事件监听器等路径访问到，它就是可达的。

```javascript
let user = { name: 'Alice' };
user = null;
```

当对象没有任何可达路径后，就可以被垃圾回收。

## 常见内存泄漏

### 意外全局变量

```javascript
function saveUser(user) {
  cachedUser = user;
}
```

没有 `let`、`const` 或 `var` 的赋值可能创建全局变量。严格模式会直接报错。

```javascript
'use strict';
function saveUser(user) {
  const cachedUser = user;
}
```

### 定时器未清理

```javascript
function mount() {
  const timer = setInterval(() => {
    console.log('polling');
  }, 1000);

  return () => clearInterval(timer);
}
```

组件卸载、路由离开、弹窗关闭时，需要清理定时器。

### 事件监听器未移除

```javascript
function mountButton(button) {
  function handleClick() {
    console.log('click');
  }

  button.addEventListener('click', handleClick);

  return () => {
    button.removeEventListener('click', handleClick);
  };
}
```

如果 DOM 节点已经移除，但外部仍然持有监听函数和节点引用，相关对象就可能无法回收。

### 闭包捕获大对象

```javascript
function createHandler(list) {
  return function handleClick() {
    console.log(list.length);
  };
}
```

如果只需要长度，不要捕获整个列表：

```javascript
function createHandler(list) {
  const length = list.length;
  return function handleClick() {
    console.log(length);
  };
}
```

### 缓存没有上限

```javascript
const cache = new Map();

function getUser(id) {
  if (!cache.has(id)) {
    cache.set(id, fetchUser(id));
  }
  return cache.get(id);
}
```

`Map` 会强引用 key 和 value。长期运行的页面里，缓存要有上限或过期策略。

```javascript
class LRUCache {
  constructor(limit = 100) {
    this.limit = limit;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);

    if (this.map.size > this.limit) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}
```

## WeakMap 与 WeakSet

`WeakMap` 的 key 必须是对象，并且不会阻止 key 被垃圾回收。

```javascript
const meta = new WeakMap();

function bindMeta(element, data) {
  meta.set(element, data);
}
```

适合给 DOM 节点、对象实例存附加信息，而不想手动管理生命周期。

注意：

- `WeakMap` 不能遍历。
- key 被回收后，对应 value 也会变成可回收。
- 它适合生命周期跟随对象本身的数据。

## V8 优化心智

具体优化由引擎决定，但有几条稳定的工程经验。

### 保持对象结构稳定

```javascript
// 不稳定：后续动态补字段
function createUser(name) {
  const user = { name };
  user.age = 18;
  return user;
}

// 稳定：初始化时声明完整结构
function createUser(name) {
  return {
    name,
    age: 18,
    role: 'member'
  };
}
```

对象结构稳定时，引擎更容易优化属性访问。

### 避免稀疏数组

```javascript
const list = [];
list[10000] = 'x';
```

这种数组中间有大量空洞，引擎可能退化为更慢的存储结构。

更好的方式：

```javascript
const list = Array.from({ length: 10000 }, () => null);
list[9999] = 'x';
```

### 热路径避免频繁改变类型

```javascript
let total = 0;

for (const item of list) {
  total += item.price;
}
```

如果 `price` 有时是数字、有时是字符串，性能和正确性都会变差。

```javascript
const price = Number(item.price) || 0;
```

在入口处做数据标准化，热路径里就少做分支和类型修正。

## 性能排查路径

### 页面越来越卡

优先怀疑：

- 定时器没有清理。
- 事件监听器重复绑定。
- 缓存无限增长。
- 大量 DOM 节点没有释放。
- 长任务阻塞主线程。

### 内存持续上涨

排查顺序：

1. 复现操作路径。
2. 观察内存是否在 GC 后仍然回不去。
3. 检查是否有全局数组、Map、订阅中心持续增长。
4. 检查组件卸载时是否释放定时器、事件、请求、观察器。
5. 用浏览器 Performance / Memory 面板查看保留路径。

## 释放资源模板

日常封装时，可以让函数返回清理函数。

```javascript
function setupAutoRefresh(callback) {
  const timer = setInterval(callback, 5000);

  window.addEventListener('visibilitychange', callback);

  return function cleanup() {
    clearInterval(timer);
    window.removeEventListener('visibilitychange', callback);
  };
}
```

使用：

```javascript
const cleanup = setupAutoRefresh(fetchData);

// 页面离开、组件卸载、弹窗关闭
cleanup();
```

## 日常判断清单

- 数据是否真的需要长期缓存？
- `Map`、数组、订阅列表是否有删除逻辑？
- 事件监听器、定时器、Observer 是否有清理函数？
- 闭包是否捕获了不必要的大对象？
- 对象结构和数组类型是否稳定？
- 性能问题是 CPU 计算、DOM 更新、网络等待，还是内存增长？
