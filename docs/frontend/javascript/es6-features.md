# ES6+ 特性

ES6（ECMAScript 2015）及后续版本引入了大量现代特性，彻底改变了 JavaScript 的编码方式。

## 解构赋值

```javascript
// 对象解构
const { name, age, address: { city = 'Unknown' } = {} } = user;

// 数组解构
const [first, , third] = [1, 2, 3];  // 跳过第二个

// 函数参数解构
function createUser({ name, age = 18, role = 'user' }) {
  return { name, age, role };
}

// 交换变量
let a = 1, b = 2;
[a, b] = [b, a];

// 默认值（仅 undefined 触发，null 不触发）
const { timeout = 1000 } = options;
```

## 展开运算符与剩余参数

```javascript
// 数组展开
const merged = [...arr1, ...arr2];
const copy = [...original];  // 浅拷贝

// 对象展开（合并属性，后者覆盖前者）
const config = { ...defaults, ...userConfig };

// 剩余参数（收集）
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}

// 对象剩余属性
const { id, ...rest } = user;  // 提取 id，其余放入 rest
```

## 模板字符串

```javascript
const name = 'Alice';
const greeting = `Hello, ${name}!`;

// 标签模板
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    return `${result}${str}<mark>${values[i] ?? ''}</mark>`;
  }, '');
}
const html = highlight`Name: ${name}, Age: ${age}`;
```

## 可选链与空值合并

```javascript
// 可选链（?.）
const city = user?.address?.city;         // undefined（不报错）
const method = obj?.method?.();           // 安全调用
const value = arr?.[0];                   // 安全索引

// 空值合并（??）：仅 null/undefined 触发
const port = config.port ?? 3000;         // 0、'' 不会触发
const name = user.name ?? 'Anonymous';

// 逻辑赋值（ES2021）
config.timeout ??= 3000;    // 仅 null/undefined 时赋值
obj.enabled ||= true;       // 仅 falsy 时赋值
flags.visible &&= false;    // 仅 truthy 时赋值
```

## Map 与 Set

```javascript
// Map：任意类型作为键
const cache = new Map();
const key = { id: 1 };
cache.set(key, 'data');
cache.get(key);        // 'data'
cache.has(key);        // true
cache.size;            // 1

// Set：不重复值集合
const unique = new Set([1, 2, 2, 3, 3]);  // {1, 2, 3}
unique.add(4);
unique.has(3);         // true

// 数组去重
const deduped = [...new Set(arr)];

// 交集、并集、差集
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);
const union = new Set([...a, ...b]);           // {1,2,3,4}
const intersection = a.filter(x => b.has(x));  // [2,3]
```

## Symbol

```javascript
// 唯一标识符
const id = Symbol('id');
const SECRET = Symbol('secret');

// 用作对象属性键（不会被 for...in 枚举）
const obj = {
  [id]: 123,
  [SECRET]: 'hidden',
  name: 'Alice'
};

// Well-known Symbols
obj[Symbol.toStringTag] = 'MyObject';
Object.prototype.toString.call(obj);  // '[object MyObject]'

// Symbol.for：全局共享 Symbol
const s1 = Symbol.for('key');
const s2 = Symbol.for('key');
s1 === s2;  // true
```

## WeakRef 与 FinalizationRegistry（ES2021）

```javascript
// WeakRef：弱引用，不阻止 GC 回收目标对象
let target = { data: 'large' };
const weakRef = new WeakRef(target);

// 获取引用对象（可能已被回收）
const obj = weakRef.deref();
if (obj) { /* 使用 obj */ }

// FinalizationRegistry：对象被 GC 后执行回调
const registry = new FinalizationRegistry((key) => {
  console.log(`${key} 已被回收`);
  cache.delete(key);
});

registry.register(target, 'target-key');
```

## 顶层 await（ES2022）

```javascript
// 仅在 ES Module 中可用
const response = await fetch('/api/config');
const config = await response.json();

export default config;

// 动态导入
const module = await import('./heavy-module.js');
```

::: tip 顶层 await 的影响
模块的加载会被阻塞直到顶层 await 完成。使用 `import()` 动态导入可以避免阻塞。
:::
