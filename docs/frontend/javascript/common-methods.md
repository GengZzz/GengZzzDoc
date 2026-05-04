# 数组与字符串常用方法

日常开发中最高频使用的 API，按功能分类整理。每个方法都详细说明参数、返回值和使用场景。

## 数组变更方法（修改原数组）

### push

`push()` 接收一个或多个参数，将它们**依次添加到数组末尾**，返回数组的**新长度**。这是最常用的添加元素方式，性能比 `concat` 更好（不需要创建新数组），适合日志收集、队列入栈等场景。

```javascript
const arr = [1, 2, 3];
const len = arr.push(4, 5);  // 返回新长度 5
console.log(arr);             // [1, 2, 3, 4, 5]

// 实际应用：用数组模拟栈
class Stack {
  #items = [];
  push(item) { this.#items.push(item); }
  pop() { return this.#items.pop(); }
  peek() { return this.#items[this.#items.length - 1]; }
  get size() { return this.#items.length; }
}
```

### pop

`pop()` 不接收参数，移除数组的**最后一个元素**并返回该元素。如果数组为空则返回 `undefined`。与 `push` 配合可以实现栈结构（后进先出）。

```javascript
const arr = [1, 2, 3];
const last = arr.pop();   // 返回被移除的元素 3
console.log(arr);          // [1, 2]

// 空数组 pop
[].pop();                  // undefined
```

### unshift

`unshift()` 接收一个或多个参数，将它们**依次插入到数组头部**，返回新长度。注意：这会导致**所有现有元素向后移动**，在大数组上性能较差。如果需要频繁头部插入，考虑使用链表或先收集再反转。

```javascript
const arr = [3, 4];
arr.unshift(1, 2);         // 返回 4
console.log(arr);           // [1, 2, 3, 4]

// 性能陷阱：每次 unshift 都要移动全部元素
// 100 万次 unshift 比 100 万次 push 慢几个数量级
```

### shift

`shift()` 不接收参数，移除数组的**第一个元素**并返回该元素。同样会导致剩余元素整体前移，在大数组上性能差。与 `unshift` 配合可实现队列（先进先出），但生产环境建议用真正的队列数据结构。

```javascript
const arr = [1, 2, 3];
const first = arr.shift();  // 返回 1
console.log(arr);            // [2, 3]

// 性能更好的队列实现：用两个数组模拟
class Queue {
  #inbox = [];
  #outbox = [];
  enqueue(item) { this.#inbox.push(item); }
  dequeue() {
    if (!this.#outbox.length) {
      while (this.#inbox.length) this.#outbox.push(this.#inbox.pop());
    }
    return this.#outbox.pop();
  }
}
```

### splice

`splice(start, deleteCount, ...items)` 是数组最灵活的方法，可以在任意位置**删除、插入或替换**元素。第一个参数是起始索引，第二个参数是要删除的个数，之后的参数是要插入的新元素。**会修改原数组**，返回被删除的元素组成的数组。

```javascript
const arr = ['a', 'b', 'c', 'd', 'e'];

// 删除：从索引 1 开始删 2 个
arr.splice(1, 2);              // ['b', 'c']，arr 变成 ['a', 'd', 'e']

// 插入：从索引 1 开始删 0 个，插入 'x' 和 'y'
arr.splice(1, 0, 'x', 'y');   // []（没有删除任何元素）
                                // arr 变成 ['a', 'x', 'y', 'd', 'e']

// 替换：从索引 1 开始删 2 个，替换为 'm' 和 'n'
arr.splice(1, 2, 'm', 'n');   // ['x', 'y']
                                // arr 变成 ['a', 'm', 'n', 'd', 'e']

// 实际应用：原地移除指定元素
function removeItem(arr, item) {
  const index = arr.indexOf(item);
  if (index > -1) arr.splice(index, 1);
  return arr;
}
```

### sort

`sort(compareFn)` 对数组元素**原地排序**。如果不传比较函数，会将元素转为字符串按 Unicode 码点排序——这意味着数字排序会出错：`[10, 9, 2, 80].sort()` 的结果是 `[10, 2, 80, 9]`，因为按字符串比较 `'10' < '2'`。

比较函数 `compareFn(a, b)` 的规则：
- 返回**负数**：a 排在 b 前面
- 返回**正数**：b 排在 a 前面
- 返回 **0**：保持相对顺序

```javascript
// 数字升序：a - b 为负说明 a < b，a 排前面
[10, 9, 2, 80].sort((a, b) => a - b);  // [2, 9, 10, 80]

// 数字降序：b - a 为负说明 b < a，b 排前面
[10, 9, 2, 80].sort((a, b) => b - a);  // [80, 10, 9, 2]

// 对象按属性排序
const users = [
  { name: 'Bob', age: 25 },
  { name: 'Alice', age: 30 },
  { name: 'Charlie', age: 20 }
];
users.sort((a, b) => a.age - b.age);
// Charlie(20) → Bob(25) → Alice(30)

// 中文排序：localeCompare 支持拼音排序
['橙子', '苹果', '香蕉'].sort((a, b) => a.localeCompare(b, 'zh'));

// 多字段排序：先按年龄，再按姓名
users.sort((a, b) => {
  if (a.age !== b.age) return a.age - b.age;
  return a.name.localeCompare(b.name);
});
```

::: warning sort 的坑
- 默认按**字符串**排序，数字排序必须传比较函数
- **会修改原数组**，不想修改可以先 `slice()` 或 `[...arr].sort()`
- V8 对短数组用插入排序，长数组用快速排序/归并排序，时间复杂度 O(n log n)
:::

### reverse

`reverse()` 将数组元素**原地反转**，返回反转后的原数组引用。会修改原数组。

```javascript
const arr = [1, 2, 3];
arr.reverse();            // [3, 2, 1]
console.log(arr);         // [3, 2, 1]（原数组被修改）

// 不修改原数组的写法
const reversed = [...arr].reverse();  // 浅拷贝后再反转
```

### fill

`fill(value, start, end)` 用指定值**填充数组的指定区间**。start 默认为 0，end 默认为数组长度（不含 end 位置）。**会修改原数组**，常用于初始化数组。

```javascript
// 填充整个数组
new Array(5).fill(0);              // [0, 0, 0, 0, 0]

// 区间填充：索引 1 到 3（不含 3）
[1, 2, 3, 4].fill('x', 1, 3);    // [1, 'x', 'x', 4]

// 注意：fill 对象时填充的是同一个引用
const arr = new Array(3).fill({});
arr[0].a = 1;
console.log(arr);  // [{a:1}, {a:1}, {a:1}]（三个元素指向同一个对象）
```

### copyWithin

`copyWithin(target, start, end)` 将数组中 `[start, end)` 区间的元素**复制到以 target 为起点的位置**，覆盖原有元素。**会修改原数组**，实际开发中较少使用。

```javascript
// 将索引 3-5 的值复制到索引 0 开始的位置
[1, 2, 3, 4, 5].copyWithin(0, 3, 5);  // [4, 5, 3, 4, 5]
// 源：索引 3→4，索引 4→5
// 目标：覆盖索引 0 和 1
```

## 数组非变更方法（返回新数组/值）

### map

`map(callback)` 对数组的**每个元素**执行回调函数，将返回值组成一个**新数组**返回，不修改原数组。新数组的长度与原数组完全一致。这是数据转换的核心方法：从一种格式映射到另一种格式。

```javascript
const nums = [1, 2, 3];
nums.map(n => n * 2);          // [2, 4, 6]
console.log(nums);              // [1, 2, 3]（原数组不变）

// 数据格式转换：从对象数组中提取某个字段
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
users.map(u => u.name);        // ['Alice', 'Bob']

// 配合解构更简洁
users.map(({ name }) => name); // ['Alice', 'Bob']

// 链式调用：每一步 map 产生新数组
[1, 2, 3]
  .map(n => n * 2)             // [2, 4, 6]
  .map(n => n.toString())      // ['2', '4', '6']
```

::: tip map 使用建议
- 回调函数应该是一个**纯函数**（相同输入产生相同输出，无副作用）
- 如果不需要返回值只是遍历，用 `forEach` 更合适
- 如果同时需要过滤，考虑 `flatMap` 或先 `filter` 再 `map`
:::

### filter

`filter(callback)` 对每个元素执行回调，**返回值为 `true` 的元素组成新数组**返回。回调函数的签名与 `map` 相同：`(element, index, array)`。常用于数据筛选、移除无效值。

```javascript
[1, 2, 3, 4, 5].filter(n => n > 3);    // [4, 5]

// 移除 falsy 值（0, '', null, undefined, false, NaN）
const mixed = [0, 1, '', null, 'hello', undefined, false];
mixed.filter(Boolean);                   // [1, 'hello']

// find vs filter 的区别：
// find 返回第一个匹配元素（或 undefined），filter 返回所有匹配的数组
const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
items.find(item => item.id === 1);       // { id: 1 }（第一个）
items.filter(item => item.id === 1);     // [{ id: 1 }, { id: 1 }]（全部）

// 实际应用：搜索过滤
function searchUsers(users, keyword) {
  return users.filter(u =>
    u.name.toLowerCase().includes(keyword.toLowerCase())
  );
}
```

### find / findIndex

`find(callback)` 从数组头部开始遍历，返回**第一个**使回调返回 `true` 的元素，找不到则返回 `undefined`。`findIndex` 返回索引，找不到返回 `-1`。与 `filter` 的关键区别是 `find` 找到第一个就停止遍历。

```javascript
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

users.find(u => u.id === 2);           // { id: 2, name: 'Bob' }
users.find(u => u.id === 99);          // undefined

users.findIndex(u => u.id === 2);      // 1
users.findIndex(u => u.id === 99);     // -1

// 实际应用：查找并修改
const target = users.find(u => u.id === 2);
if (target) target.name = 'Bobby';
```

### findLast / findLastIndex

ES2022 新增。与 `find`/`findIndex` 功能相同，但**从数组末尾向前**遍历。适合需要找最后一个匹配项的场景。

```javascript
[1, 2, 3, 4].findLast(n => n % 2 === 0);       // 4（最后一个偶数）
[1, 2, 3, 4].findLastIndex(n => n % 2 === 0);   // 3（最后一个偶数的索引）

// 实际应用：找到最后一条错误日志
const logs = [
  { level: 'info', msg: 'started' },
  { level: 'error', msg: 'timeout' },
  { level: 'info', msg: 'recovered' },
  { level: 'error', msg: 'crashed' }
];
const lastError = logs.findLast(l => l.level === 'error');
// { level: 'error', msg: 'crashed' }
```

### some

`some(callback)` 检查数组中**是否存在至少一个**使回调返回 `true` 的元素。只要找到第一个满足条件的就立即返回 `true`（短路），全部不满足则返回 `false`。空数组返回 `false`。

```javascript
[1, 2, 3].some(n => n > 2);    // true（3 > 2）
[1, 2, 3].some(n => n > 5);    // false（没有元素 > 5）

// 实际应用：权限检查
const permissions = ['read', 'write'];
const hasWrite = permissions.some(p => p === 'write');  // true
```

### every

`every(callback)` 检查数组中**是否所有元素**都使回调返回 `true`。只要找到第一个不满足的就立即返回 `false`（短路），全部满足才返回 `true`。空数组返回 `true`。

```javascript
[1, 2, 3].every(n => n > 0);   // true
[1, 2, 3].every(n => n > 1);   // false（1 不大于 1）

// 实际应用：表单多规则校验
const rules = [
  v => v.length > 0,           // 非空
  v => v.length <= 50,         // 长度限制
  v => !/[<>]/.test(v)         // 无危险字符
];
const input = 'hello';
const isValid = rules.every(rule => rule(input));  // true
```

### includes

`includes(value, fromIndex)` 判断数组中**是否包含**指定值，返回布尔值。内部使用 `SameValueZero` 算法比较，**可以正确检测 `NaN`**（`indexOf` 无法检测 NaN）。可选第二个参数指定搜索起始位置。

```javascript
[1, 2, 3].includes(2);         // true
[1, 2, 3].includes(4);         // false
[1, NaN, 3].includes(NaN);     // true ✓（indexOf 返回 -1）
[1, 2, 3].includes(2, 2);      // false（从索引 2 开始找）

// 判断值是否存在，includes 比 indexOf 语义更清晰
// 不好：if (arr.indexOf(x) !== -1)
// 好：  if (arr.includes(x))
```

### indexOf

`indexOf(value, fromIndex)` 返回指定值在数组中**首次出现的索引**，不存在则返回 `-1`。内部使用 `===` 严格相等，**无法检测 `NaN`**。第二个参数可指定搜索起始位置。

```javascript
[1, 2, 3, 2].indexOf(2);       // 1（首次出现）
[1, 2, 3, 2].indexOf(2, 2);    // 3（从索引 2 开始）
[1, 2, 3].indexOf(4);          // -1

// 查找所有出现位置
function findAll(arr, value) {
  const indices = [];
  let index = arr.indexOf(value);
  while (index !== -1) {
    indices.push(index);
    index = arr.indexOf(value, index + 1);
  }
  return indices;
}
```

### reduce

`reduce(callback, initialValue)` 对数组的每个元素执行回调，将结果**累积**到一个值上。回调接收四个参数：`accumulator`（累加值）、`currentValue`（当前元素）、`index`（当前索引）、`array`（原数组）。是最强大也最容易写错的数组方法。

**一定要传 `initialValue`**。不传时 accumulator 取数组第一个元素，空数组会直接报错。

```javascript
// 求和：acc 是累加器，cur 是当前元素
[1, 2, 3, 4].reduce((acc, cur) => acc + cur, 0);  // 10

// 求最大值
[3, 7, 2, 9].reduce((max, cur) => cur > max ? cur : max, -Infinity);  // 9

// 统计出现次数：利用对象作为累加器
const fruits = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
const count = fruits.reduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, cherry: 1 }

// 数组扁平化（flat() 出现前的写法）
[[1, 2], [3, 4], [5]].reduce((acc, cur) => acc.concat(cur), []);

// 管道函数：将多个函数串联执行
const pipe = (...fns) => (input) =>
  fns.reduce((acc, fn) => fn(acc), input);

const transform = pipe(
  x => x * 2,
  x => x + 1,
  x => x.toString()
);
transform(5);  // '11'

// 按字段分组
const people = [
  { name: 'Alice', dept: 'eng' },
  { name: 'Bob', dept: 'sales' },
  { name: 'Charlie', dept: 'eng' }
];
const grouped = people.reduce((acc, p) => {
  (acc[p.dept] = acc[p.dept] || []).push(p);
  return acc;
}, {});
// { eng: [Alice, Charlie], sales: [Bob] }
```

::: tip reduce 使用建议
- **始终提供 `initialValue`**，空数组也能安全返回初始值
- 复杂逻辑可以拆成多步：先 `map` 再 `reduce`，可读性更好
- 能用 `map`/`filter` 解决的问题不要强行用 `reduce`
- 实在复杂可以用 `for...of` 循环，不必追求一行搞定
:::

### flat

`flat(depth)` 将嵌套数组**展平**指定层数，默认 `depth = 1`。返回新数组，不修改原数组。`flat(Infinity)` 可以完全展平任意深度。

```javascript
[1, [2, [3]]].flat();          // [1, 2, [3]]（展平 1 层）
[1, [2, [3]]].flat(2);         // [1, 2, 3]（展平 2 层）
[1, [2, [3]]].flat(Infinity);  // [1, 2, 3]（完全展平）

// 移除数组中的空位
[1, , 3, , 5].flat();          // [1, 3, 5]
```

### flatMap

`flatMap(callback)` 等价于 `map` 后再 `flat(1)`，但效率更高（只遍历一次）。回调函数可以返回数组，返回的数组会被自动展平一层。常用于**一对多**的映射场景。

```javascript
// 一个句子拆成多个单词
['hello world', 'foo bar']
  .flatMap(s => s.split(' '));
// ['hello', 'world', 'foo', 'bar']

// 一对多映射：每个对象的 tags 数组展平
const items = [
  { tags: ['js', 'web'] },
  { tags: ['java', 'backend'] }
];
items.flatMap(item => item.tags);
// ['js', 'web', 'java', 'backend']

// 与 map 的区别：
// map 返回嵌套数组：[[1,2], [3,4]]
// flatMap 返回展平数组：[1, 2, 3, 4]
```

### slice

`slice(start, end)` 返回数组的**一个浅拷贝片段**，从 start 到 end（不含 end）。**不修改原数组**。支持负数索引（-1 表示最后一个）。不传参数相当于浅拷贝整个数组。

```javascript
const arr = ['a', 'b', 'c', 'd', 'e'];

arr.slice(1, 3);    // ['b', 'c']（索引 1 到 3，不含 3）
arr.slice(0, 2);    // ['a', 'b']
arr.slice(-2);      // ['d', 'e']（最后两个）
arr.slice();        // ['a', 'b', 'c', 'd', 'e']（浅拷贝）

// 浅拷贝的等价写法
const copy = [...arr];
const copy2 = Array.from(arr);
```

::: tip slice vs splice
- `slice`（无 p）：不修改原数组，返回截取片段
- `splice`（有 p）：**修改原数组**，返回被删除的元素
- 记忆：splice 有 p = **p**lease（请）修改原数组
:::

### Array.from

`Array.from(arrayLike, mapFn)` 将类数组对象或可迭代对象**转换为真正的数组**。可选的第二个参数相当于对每个元素执行 `map`。

```javascript
// 字符串 → 字符数组
Array.from('hello');           // ['h', 'e', 'l', 'l', 'o']

// 生成序列：配合 mapFn 创建等差数列
Array.from({ length: 5 }, (_, i) => i);      // [0, 1, 2, 3, 4]
Array.from({ length: 5 }, (_, i) => i * 2);  // [0, 2, 4, 6, 8]

// Set 去重
Array.from(new Set([1, 2, 2, 3]));  // [1, 2, 3]

// DOM NodeList 转数组（querySelectorAll 返回的是 NodeList，不是数组）
const divs = document.querySelectorAll('div');
const arr = Array.from(divs);
// 现在可以用 map、filter 等数组方法
```

### Array.of

`Array.of(...items)` 创建一个包含所有参数的新数组。主要是为了解决 `new Array()` 的歧义：`new Array(3)` 创建 3 个空位的数组，而 `Array.of(3)` 创建包含一个元素 `3` 的数组。

```javascript
Array.of(3);         // [3]（一个元素，值为 3）
Array.of(1, 2, 3);   // [1, 2, 3]
new Array(3);        // [, , ,]（3 个空位）
new Array(1, 2, 3);  // [1, 2, 3]
```

## 字符串方法

### split

`split(separator, limit)` 按分隔符将字符串**切割成数组**。第一个参数可以是字符串或正则表达式。第二个参数 `limit` 限制返回数组的最大长度。不修改原字符串。

```javascript
'a,b,c'.split(',');           // ['a', 'b', 'c']
'hello'.split('');             // ['h', 'e', 'l', 'l', 'o']（拆成字符数组）
'a,,b'.split(',');            // ['a', '', 'b']（保留空字符串）
'a,,b'.split(',', 2);         // ['a', '']（只保留前 2 个）

// 按空白字符分割（连续空白算一个分隔符）
'hello   world  foo'.split(/\s+/);  // ['hello', 'world', 'foo']

// 实际应用：解析键值对
'name=Alice;age=25'.split(';').map(pair => pair.split('='));
// [['name', 'Alice'], ['age', '25']]
```

### replace

`replace(pattern, replacement)` 在字符串中找到第一个匹配 `pattern` 的子串，替换为 `replacement`。pattern 可以是字符串（只替换第一个）或带 `g` 标志的正则（替换所有）。

replacement 可以是：
- **字符串**：用 `$1`、`$2` 引用捕获组，`$&` 引用整个匹配
- **回调函数**：参数是匹配内容、捕获组、偏移量、原字符串

```javascript
'hello world'.replace('world', 'JS');     // 'hello JS'

// 用正则 + g 标志替换所有
'a-b-c'.replace(/-/g, '/');              // 'a/b/c'

// ES2021 的 replaceAll 更直观
'a-b-c'.replaceAll('-', '/');            // 'a/b/c'

// 回调函数：动态计算替换值
'price: 100'.replace(/\d+/, match => `$${Number(match) * 2}`);
// 'price: $200'

// 命名捕获组（ES2018）
'2024-01-15'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<month>/$<day>/$<year>'
);
// '01/15/2024'
```

### replaceAll

`replaceAll(pattern, replacement)` 是 ES2021 新增的方法，功能与 `replace` 相同，但会**替换所有匹配**，不需要加 `g` 标志。pattern 为字符串时行为直观。

```javascript
'a-b-c'.replaceAll('-', '/');     // 'a/b/c'

// 与 replace 的对比
'a-b-c'.replace('-', '/');       // 'a-b-c'（只替换第一个）
'a-b-c'.replace(/-/g, '/');      // 'a/b/c'（正则 g 标志）
'a-b-c'.replaceAll('-', '/');    // 'a/b/c'（更简洁）
```

### trim / trimStart / trimEnd

`trim()` 移除字符串**首尾的空白字符**（空格、制表符 `\t`、换行符 `\n` 等），返回新字符串。`trimStart()` 只移除开头，`trimEnd()` 只移除结尾。常用于用户输入清理。

```javascript
'  hello  '.trim();            // 'hello'
'  hello  '.trimStart();       // 'hello  '
'  hello  '.trimEnd();         // '  hello'

// 实际应用：清理用户输入
function cleanInput(input) {
  return input.trim().toLowerCase();
}
```

### padStart / padEnd

`padStart(targetLength, padString)` 在字符串**开头**填充指定字符，直到达到目标长度。`padEnd()` 在**末尾**填充。padString 默认是空格，如果填充后超过目标长度会截断。

```javascript
'5'.padStart(3, '0');          // '005'（数字补零）
'hello'.padEnd(10, '.');       // 'hello.....'
'hi'.padEnd(2, '.');           // 'hi'（已够长，不填充）

// 实际应用：格式化时间
const h = String(9).padStart(2, '0');   // '09'
const m = String(5).padStart(2, '0');   // '05'

// 实际应用：脱敏显示
function maskPhone(phone) {
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
maskPhone('13812345678');  // '138****5678'
```

### includes

`includes searchString, position)` 判断字符串**是否包含**指定子串，返回布尔值。比 `indexOf() !== -1` 语义更清晰。可选 position 参数指定搜索起始位置。

```javascript
'hello world'.includes('world');     // true
'hello world'.includes('World');     // false（区分大小写）
'hello world'.includes('hello', 5);  // false（从索引 5 开始）

// 实际应用：文件类型检查
function isImage(filename) {
  return ['.jpg', '.png', '.gif', '.webp']
    .some(ext => filename.endsWith(ext));
}
```

### startsWith / endsWith

`startsWith searchString, position)` 判断字符串是否**以指定子串开头**，`endsWith()` 判断是否**以指定子串结尾**。比手写正则更直观。

```javascript
'https://example.com'.startsWith('https://');  // true
'report.pdf'.endsWith('.pdf');                  // true
'report.pdf'.endsWith('.PDF');                  // false（区分大小写）

// startsWith 的第二个参数：从哪个位置开始匹配
'hello'.startsWith('el', 1);  // true（从索引 1 开始检查）

// 实际应用：路由判断
if (path.startsWith('/api/')) {
  // API 请求
} else if (path.startsWith('/admin/')) {
  // 管理后台
}
```

### indexOf / lastIndexOf

`indexOf searchString, position)` 返回子串**首次出现的索引**，不存在返回 `-1`。`lastIndexOf()` 从末尾搜索，返回**最后出现的索引**。都支持第二个参数指定搜索起点。

```javascript
'hello world'.indexOf('o');        // 4（首次出现）
'hello world'.lastIndexOf('o');    // 7（最后出现）
'hello world'.indexOf('o', 5);     // 7（从索引 5 开始）
'hello world'.indexOf('xyz');      // -1（不存在）

// 实际应用：截取文件名中的扩展名
function getExt(filename) {
  const index = filename.lastIndexOf('.');
  return index > -1 ? filename.slice(index + 1) : '';
}
getExt('photo.jpg');  // 'jpg'
```

### charAt / at

`charAt(index)` 返回指定位置的字符，超出范围返回空字符串。`at(index)` 是 ES2022 新增，**支持负数索引**（-1 表示最后一个字符），推荐使用。

```javascript
'hello'.charAt(1);              // 'e'
'hello'.charAt(99);             // ''（空字符串）

'hello'.at(0);                  // 'h'
'hello'.at(-1);                 // 'o'（最后一个字符）
'hello'.at(-2);                 // 'l'（倒数第二个）
```

### charCodeAt

`charCodeAt(index)` 返回指定位置字符的 **Unicode 码点**（0-65535），超出范围返回 `NaN`。与 `charAt` 配合可以做字符编码转换。对于超出基本多文种平面（BMP）的字符需要使用 `codePointAt`。

```javascript
'hello'.charCodeAt(0);          // 104（'h' 的 Unicode 值）
'A'.charCodeAt(0);              // 65
String.fromCharCode(65);        // 'A'（反向转换）

// 中文
'中'.charCodeAt(0);             // 20013
```

### repeat

`repeat(count)` 返回一个新字符串，由原字符串**重复 count 次**组成。count 必须是非负数且不能为 Infinity。

```javascript
'ha'.repeat(3);                  // 'hahaha'
'abc'.repeat(0);                 // ''
'-'.repeat(20);                  // '--------------------'

// 实际应用：生成缩进
const indent = '  '.repeat(level) + text;
```

### match

`match(regexp)` 用正则表达式匹配字符串，返回一个数组。不带 `g` 标志时返回第一个匹配及其捕获组；带 `g` 标志时返回所有匹配的数组（不含捕获组）。没有匹配时返回 `null`。

```javascript
// 不带 g：返回第一个匹配 + 捕获组
'hello 123 world 456'.match(/(\d+)/);
// ['123', '123', index: 6, ...]

// 带 g：返回所有匹配
'hello 123 world 456'.match(/\d+/g);
// ['123', '456']

// 无匹配
'hello'.match(/\d+/);  // null
```

### matchAll

`matchAll(regexp)` 是 ES2020 新增的方法，返回**所有匹配的迭代器**，每个匹配包含完整信息（捕获组、index 等）。regexp 必须带 `g` 标志。比 `match` + `g` 更强大，因为能拿到每个匹配的捕获组。

```javascript
const str = 'name=Alice age=25';
const matches = [...str.matchAll(/(\w+)=(\w+)/g)];

// matches[0]: ['name=Alice', 'name', 'Alice', index: 0, ...]
// matches[1]: ['age=25', 'age', '25', index: 12, ...]

// 实际应用：提取所有链接
const html = '<a href="/a">A</a> and <a href="/b">B</a>';
const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
// ['/a', '/b']
```

## 常见套路组合

```javascript
// 去重
const unique = arr => [...new Set(arr)];
unique([1, 2, 2, 3, 3]);  // [1, 2, 3]

// 数组转 Map（按某个字段索引）
const arr = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
const map = Object.fromEntries(arr.map(item => [item.id, item]));
// { 1: { id: 1, name: 'A' }, 2: { id: 2, name: 'B' } }

// 取交集（两数组共有的元素）
const intersect = (a, b) => a.filter(x => b.includes(x));
intersect([1, 2, 3], [2, 3, 4]);  // [2, 3]

// 取差集（在 a 中但不在 b 中的元素）
const diff = (a, b) => a.filter(x => !b.includes(x));
diff([1, 2, 3], [2, 3, 4]);      // [1]

// 分页切片
function paginate(arr, page, pageSize) {
  return arr.slice((page - 1) * pageSize, page * pageSize);
}

// 数组随机打乱（Fisher-Yates 算法）
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 按字段分组
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

// 字符串首字母大写
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

// 截断字符串并加省略号
const truncate = (s, max) =>
  s.length > max ? s.slice(0, max) + '...' : s;

// camelCase → kebab-case
const toKebab = s => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
toKebab('backgroundColor');  // 'background-color'

// kebab-case → camelCase
const toCamel = s => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
toCamel('background-color'); // 'backgroundColor'
```
