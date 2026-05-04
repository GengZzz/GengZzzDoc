# 集合类型

## Map

`Map` 保持插入顺序，任何类型的值（包括对象）都可以作为键。

```javascript
const map = new Map();

// 基本操作
map.set('name', 'Alice');
map.set(1, 'one');
map.set({ id: 1 }, 'object key');

map.get('name');      // 'Alice'
map.has(1);           // true
map.delete(1);        // true
map.size;             // 2

// 遍历
for (const [key, value] of map) { /* ... */ }
map.forEach((value, key) => { /* ... */ });
map.keys();   // MapIterator
map.values(); // MapIterator
```

### Map vs Object

| 特性 | Map | Object |
|------|-----|--------|
| 键类型 | 任意类型 | string/Symbol |
| 插入顺序 | 保证 | ES6+ 保证（部分情况不保证） |
| 大小 | `map.size` | `Object.keys(obj).length` |
| 性能 | 频繁增删更优 | 静态键值对更优 |
| 原型 | 无原型 | 有原型链（`toString` 等） |

## WeakMap

`WeakMap` 的键必须是对象，且是弱引用（不阻止 GC 回收键对象）。

```javascript
const weakMap = new WeakMap();

let element = document.getElementById('btn');
weakMap.set(element, { clickCount: 0 });

element.addEventListener('click', () => {
  weakMap.get(element).clickCount++;
});

// 当 element 从 DOM 移除且无其他引用时，WeakMap 中的条目自动清除
element = null;  // GC 可回收
```

::: tip WeakMap 应用
- 给对象附加私有数据
- 缓存计算结果（对象被回收时自动清除缓存）
- DOM 节点关联数据（节点移除时自动清理）
:::

## Set

```javascript
const set = new Set([1, 2, 3, 3, 4]);  // {1, 2, 3, 4}

set.add(5);
set.has(3);    // true
set.delete(2); // true
set.size;      // 4

// 集合运算
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

// 并集
const union = a.union(b);           // ES2025: {1, 2, 3, 4}

// 交集
const intersect = a.intersection(b); // ES2025: {2, 3}

// 差集
const diff = a.difference(b);        // ES2025: {1}
```

## TypedArray

类型化数组用于处理二进制数据，性能远高于普通数组。

```javascript
// 创建
const buffer = new ArrayBuffer(16);       // 16 字节
const int32View = new Int32Array(buffer);  // 4 个 32 位整数
const uint8View = new Uint8Array(buffer); // 16 个 8 位无符号整数（同一块内存的不同视图）

int32View[0] = 42;
console.log(uint8View[0]);  // 42（低 8 位）

// 常用类型
new Int8Array(10);       // 8 位有符号
new Uint8Array(10);      // 8 位无符号
new Uint8ClampedArray(10); // 8 位无符号（溢出钳位）
new Int16Array(10);      // 16 位
new Float32Array(10);    // 32 位浮点
new Float64Array(10);    // 64 位浮点
new BigInt64Array(10);   // 64 位大整数

// DataView：更灵活的字节级操作
const view = new DataView(buffer);
view.setInt32(0, 42);       // 从偏移 0 写入
view.getFloat64(8);         // 从偏移 8 读取
```

::: warning TypedArray 注意事项
- 固定长度，创建后不可增删元素
- 默认值为 0（非 undefined）
- `Array.isArray(new Uint8Array())` 返回 `false`
- 需要转换时用 `Array.from(typedArray)`
:::
