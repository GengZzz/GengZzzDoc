# 性能优化

## 内存管理

JavaScript 使用**自动垃圾回收**（GC），基于标记-清除算法。

### GC 工作原理

```
V8 堆分为：
┌────────────────────────────────────┐
│ 新生代空间（Young Generation）       │  ← 新对象，小空间（1-8MB）
│  Scavenge 算法（半空间复制）          │  ← 频繁 GC，存活对象晋升
├────────────────────────────────────┤
│ 老生代空间（Old Generation）         │  ← 存活多次的对象
│  Mark-Sweep + Mark-Compact         │  ← 不频繁但耗时较长
├────────────────────────────────────┤
│ 大对象空间（Large Object Space）      │  ← 超过阈值的对象
└────────────────────────────────────┘
```

### 内存泄漏

```javascript
// 1. 全局变量（意外的隐式全局）
function leak() {
  leakedVar = 'oops';  // 没有声明，成为全局变量
}

// 2. 被遗忘的定时器
const timer = setInterval(() => {
  // 如果 DOM 已移除但 timer 还在，相关数据无法回收
}, 1000);
// 必须 clearInterval(timer)

// 3. 闭包引用大对象
function createHandler() {
  const largeData = new Array(1000000);
  return function() {
    // largeData 被闭包引用，无法回收
    console.log('handler called');
  };
}

// 4. DOM 引用
const elements = {
  button: document.getElementById('btn')
};
// 如果 button 从 DOM 移除，但 elements.button 还在引用
// → 无法回收
// 修复：elements.button = null

// 5. 事件监听器未移除
element.addEventListener('click', handler);
// element.remove() 不会自动移除事件监听器
// 需要手动：element.removeEventListener('click', handler)
```

## V8 优化技巧

### 隐藏类（Hidden Class）

V8 为对象创建隐藏类来优化属性访问。保持对象结构一致。

```javascript
// 不好：动态添加属性（每个对象隐藏类不同）
function Point(x) {
  this.x = x;
}
const p1 = new Point(1);
p1.y = 2;  // 动态添加，破坏隐藏类

// 好：构造函数中初始化所有属性
function Point(x, y) {
  this.x = x;
  this.y = y;  // 所有 Point 实例共享同一隐藏类
}
```

### 数组优化

```javascript
// V8 对连续整数数组使用 Elements Kind 优化
const fast = [1, 2, 3];        // PACKED_SMI_ELEMENTS（最快）
const mixed = [1, 'a', 3];     // PACKED_ELEMENTS
const sparse = []; sparse[100] = 1;  // DICTIONARY_ELEMENTS（最慢）

// 避免稀疏数组
// 避免在数组中混用类型
// 避免 delete array[index]（产生空洞）
```

## 防抖与节流

```javascript
// 防抖（debounce）：事件停止触发后延迟执行
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
// 场景：搜索框输入、窗口 resize

// 节流（throttle）：固定间隔执行
function throttle(fn, interval) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
// 场景：滚动事件、鼠标移动

// RAF 节流（与浏览器刷新率同步）
function rafThrottle(fn) {
  let ticking = false;
  return function(...args) {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
    }
  };
}
```

## 长列表优化

### 虚拟滚动

只渲染视口内可见的元素。

```javascript
class VirtualList {
  constructor(container, items, itemHeight) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
    this.startIndex = 0;

    container.addEventListener('scroll', () => {
      this.startIndex = Math.floor(container.scrollTop / itemHeight);
      this.render();
    });

    this.render();
  }

  render() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(this.startIndex + this.visibleCount, this.items.length);

    for (let i = this.startIndex; i < end; i++) {
      const item = document.createElement('div');
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      item.style.height = `${this.itemHeight}px`;
      item.textContent = this.items[i];
      fragment.appendChild(item);
    }

    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.height = `${this.items.length * this.itemHeight}px`;
    this.container.appendChild(fragment);
  }
}
```

## Web Worker

将 CPU 密集型任务放到独立线程，避免阻塞主线程。

```javascript
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => {
  console.log('结果:', e.data);
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```
