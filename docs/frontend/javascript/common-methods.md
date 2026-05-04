# 数组与字符串常用方法

日常开发中最高频使用的 API，按功能分类整理。

## 数组变更方法（修改原数组）

### push / pop — 栈操作

```javascript
// push：末尾添加，返回新长度
const arr = [1, 2, 3];
arr.push(4, 5);       // 5
// arr: [1, 2, 3, 4, 5]

// pop：末尾移除，返回被移除的元素
arr.pop();             // 5
// arr: [1, 2, 3, 4]

// 实际应用：用数组模拟栈
function createStack() {
  const items = [];
  return {
    push: (item) => items.push(item),
    pop: () => items.pop(),
    peek: () => items[items.length - 1],
    size: () => items.length
  };
}
```

### unshift / shift — 队列操作

```javascript
// unshift：头部添加
const arr = [2, 3];
arr.unshift(1);        // 3
// arr: [1, 2, 3]

// shift：头部移除
arr.shift();           // 1
// arr: [2, 3]

// 注意：unshift 在大数组上性能差（需要移动所有元素）
// 需要频繁头部插入 → 用双向链表或反转数组
```

### splice — 万能删除/插入/替换

```javascript
const arr = ['a', 'b', 'c', 'd', 'e'];

// 删除：splice(start, count)
arr.splice(1, 2);              // ['b', 'c']
// arr: ['a', 'd', 'e']

// 插入：splice(start, 0, ...items)
arr.splice(1, 0, 'x', 'y');   // []
// arr: ['a', 'x', 'y', 'd', 'e']

// 替换：splice(start, count, ...items)
arr.splice(1, 2, 'm', 'n');   // ['x', 'y']
// arr: ['a', 'm', 'n', 'd', 'e']

// 实际应用：原地移除指定元素
function removeItem(arr, item) {
  const index = arr.indexOf(item);
  if (index > -1) arr.splice(index, 1);
  return arr;
}
```

### sort — 排序

```javascript
// 默认按字符串 Unicode 排序（注意！）
[10, 9, 2, 80].sort();       // [10, 2, 80, 9] ❌

// 数字排序：必须传比较函数
[10, 9, 2, 80].sort((a, b) => a - b);  // [2, 9, 10, 80] 升序
[10, 9, 2, 80].sort((a, b) => b - a);  // [80, 10, 9, 2] 降序

// 对象排序
const users = [
  { name: 'Bob', age: 25 },
  { name: 'Alice', age: 30 },
  { name: 'Charlie', age: 20 }
];
users.sort((a, b) => a.age - b.age);
// [{ name: 'Charlie', age: 20 }, { name: 'Bob', age: 25 }, ...]

// 字符串排序（localeCompare 支持中文）
['橙子', '苹果', '香蕉'].sort((a, b) => a.localeCompare(b, 'zh'));

// 多字段排序
users.sort((a, b) => {
  if (a.age !== b.age) return a.age - b.age;
  return a.name.localeCompare(b.name);
});
```

::: warning sort 的坑
- 默认按字符串排序，数字排序会出错
- **会修改原数组**，如果不想修改先 `slice()` 或展开
- 比较函数返回负数 = a 在前，正数 = b 在前，0 = 相等
:::

### reverse — 反转

```javascript
const arr = [1, 2, 3];
arr.reverse();         // [3, 2, 1]
// 修改原数组

// 不修改原数组的方式
const reversed = [...arr].reverse();
```

### fill / copyWithin

```javascript
// fill：填充数组
new Array(5).fill(0);           // [0, 0, 0, 0, 0]
[1, 2, 3, 4].fill('x', 1, 3); // [1, 'x', 'x', 4]（索引 1-3）

// copyWithin：内部复制
[1, 2, 3, 4, 5].copyWithin(0, 3, 5);  // [4, 5, 3, 4, 5]
// 将索引 3-5 的值复制到索引 0 开始的位置
```

## 数组非变更方法（返回新数组/值）

### map — 映射

```javascript
// 对每个元素做变换，返回新数组
const nums = [1, 2, 3];
nums.map(n => n * 2);          // [2, 4, 6]

// 实际应用：数据格式转换
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
users.map(u => u.name);        // ['Alice', 'Bob']

// 配合解构
users.map(({ name }) => name); // ['Alice', 'Bob']

// map 链式调用
[1, 2, 3]
  .map(n => n * 2)             // [2, 4, 6]
  .map(n => n.toString())      // ['2', '4', '6']
```

### filter — 过滤

```javascript
// 保留满足条件的元素
[1, 2, 3, 4, 5].filter(n => n > 3);    // [4, 5]

// 实际应用：移除 falsy 值
const mixed = [0, 1, '', null, 'hello', undefined, false];
mixed.filter(Boolean);                   // [1, 'hello']

// 配合 find 精确查找 vs filter 过滤所有
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

### reduce — 归约

将数组归约为单个值，最强大也最容易写错的方法。

```javascript
// 基本语法：reduce(callback, initialValue)
// callback(acc, currentValue, index, array)

// 求和
[1, 2, 3, 4].reduce((acc, cur) => acc + cur, 0);  // 10

// 求最大值
[3, 7, 2, 9].reduce((max, cur) => cur > max ? cur : max);  // 9

// 统计出现次数
const fruits = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
const count = fruits.reduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, cherry: 1 }

// 数组扁平化
[[1, 2], [3, 4], [5]].reduce((acc, cur) => acc.concat(cur), []);

// 管道函数
const pipe = (...fns) => (input) =>
  fns.reduce((acc, fn) => fn(acc), input);

const transform = pipe(
  x => x * 2,
  x => x + 1,
  x => x.toString()
);
transform(5);  // '11'

// 分组
const people = [
  { name: 'Alice', dept: 'eng' },
  { name: 'Bob', dept: 'sales' },
  { name: 'Charlie', dept: 'eng' }
];
const grouped = people.reduce((acc, p) => {
  (acc[p.dept] = acc[p.dept] || []).push(p);
  return acc;
}, {});
// { eng: [...], sales: [...] }
```

::: tip reduce 使用建议
- **始终提供 `initialValue`**，否则空数组会报错
- 复杂逻辑可拆成多步：先 `map` 再 `reduce`
- 能用 `map`/`filter` 解决的问题不要强行用 `reduce`
:::

### find / findIndex / findLast

```javascript
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

// find：返回第一个匹配的元素（未找到返回 undefined）
users.find(u => u.id === 2);           // { id: 2, name: 'Bob' }
users.find(u => u.id === 99);          // undefined

// findIndex：返回索引（未找到返回 -1）
users.findIndex(u => u.id === 2);      // 1

// findLast / findLastIndex（ES2023）：从后往前找
[1, 2, 3, 4].findLast(n => n % 2 === 0);       // 4
[1, 2, 3, 4].findLastIndex(n => n % 2 === 0);   // 3
```

### some / every — 条件判断

```javascript
// some：至少一个满足条件
[1, 2, 3].some(n => n > 2);    // true
[1, 2, 3].some(n => n > 5);    // false

// every：全部满足条件
[1, 2, 3].every(n => n > 0);   // true
[1, 2, 3].every(n => n > 1);   // false

// 实际应用：表单验证
const rules = [
  value => value.length > 0,
  value => value.length <= 50,
  value => !/[<>]/.test(value)
];
const isValid = rules.every(rule => rule(input));
```

### includes / indexOf

```javascript
// includes：是否包含（推荐，语义清晰）
[1, 2, 3].includes(2);         // true
[1, NaN, 3].includes(NaN);     // true（能检测 NaN）

// indexOf：返回索引（-1 表示不存在）
[1, 2, 3].indexOf(2);          // 1
[1, NaN, 3].indexOf(NaN);      // -1（检测不了 NaN）
```

### flat / flatMap — 扁平化

```javascript
// flat：展平嵌套数组
[1, [2, [3]]].flat();          // [1, 2, [3]]（默认 1 层）
[1, [2, [3]]].flat(Infinity);  // [1, 2, 3]（全部展平）

// flatMap：map + flat(1)
['hello world', 'foo bar']
  .flatMap(s => s.split(' '));
// ['hello', 'world', 'foo', 'bar']

// 实际应用：一对多映射
const items = [
  { tags: ['js', 'web'] },
  { tags: ['java', 'backend'] }
];
items.flatMap(item => item.tags);
// ['js', 'web', 'java', 'backend']
```

### slice — 截取（不修改原数组）

```javascript
const arr = ['a', 'b', 'c', 'd', 'e'];

arr.slice(1, 3);    // ['b', 'c']（从索引 1 到 3，不含 3）
arr.slice(0, 2);    // ['a', 'b']
arr.slice(-2);      // ['d', 'e']（负数从末尾算）
arr.slice();        // ['a', 'b', 'c', 'd', 'e']（浅拷贝）

// 实际应用：浅拷贝数组
const copy = [...arr];    // 展开运算符，等价于 slice()
```

::: tip slice vs splice
- `slice`：不修改原数组，返回截取的子数组
- `splice`：**修改原数组**，返回被移除的元素
- 记忆：slice 有 s 无 p = 不变；splice 有 p = 破坏
:::

### Array.from / Array.of

```javascript
// Array.from：类数组/可迭代对象 → 数组
Array.from('hello');           // ['h', 'e', 'l', 'l', 'o']
Array.from({ length: 5 }, (_, i) => i);  // [0, 1, 2, 3, 4]

// 实际应用：DOM 集合转数组
const divs = document.querySelectorAll('div');
const arr = Array.from(divs);

// 去重
Array.from(new Set([1, 2, 2, 3]));  // [1, 2, 3]

// Array.of：创建数组（避免 new Array 的歧义）
Array.of(3);         // [3]
new Array(3);        // [, , ,]（3 个空位）
```

## 字符串方法

### split — 分割

```javascript
'a,b,c'.split(',');           // ['a', 'b', 'c']
'hello'.split('');             // ['h', 'e', 'l', 'l', 'o']
'a,,b'.split(',');            // ['a', '', 'b']
'a,,b'.split(',', 2);         // ['a', '']（限制结果数量）

// 实际应用：解析 CSV 行
function parseCSVLine(line) {
  return line.split(',').map(cell => cell.trim());
}

// 按正则分割
'hello   world  foo'.split(/\s+/);  // ['hello', 'world', 'foo']
```

### replace / replaceAll — 替换

```javascript
// replace：替换第一个匹配
'hello world'.replace('world', 'JS');     // 'hello JS'

// replaceAll：替换所有匹配（ES2021）
'a-b-c'.replaceAll('-', '/');             // 'a/b/c'

// 正则 + 全局标志
'a-b-c'.replace(/-/g, '/');              // 'a/b/c'

// 回调替换
'price: 100'.replace(/\d+/, match => `$${Number(match) * 2}`);
// 'price: $200'

// 命名组
'2024-01-15'.replace(
  /(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/,
  '$<m>/$<d>/$<y>'
);
// '01/15/2024'

// 实际应用：模板替换
function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
}
renderTemplate('Hello, {{name}}!', { name: 'Alice' });
// 'Hello, Alice!'
```

### trim / padStart / padEnd

```javascript
// trim：去除两端空白
'  hello  '.trim();            // 'hello'
'  hello  '.trimStart();       // 'hello  '
'  hello  '.trimEnd();         // '  hello'

// padStart / padEnd：填充到指定长度
'5'.padStart(3, '0');          // '005'
'hello'.padEnd(10, '.');       // 'hello.....'

// 实际应用：格式化时间
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
```

### includes / startsWith / endsWith

```javascript
'hello world'.includes('world');     // true
'hello world'.startsWith('hello');   // true
'hello world'.endsWith('world');     // true

// 从指定位置开始搜索
'hello world'.includes('world', 6);  // false（从索引 6 开始）

// 实际应用：文件类型检查
function isImage(filename) {
  return ['.jpg', '.png', '.gif', '.webp']
    .some(ext => filename.endsWith(ext));
}
```

### indexOf / lastIndexOf / search

```javascript
'hello world'.indexOf('o');        // 4（首次出现）
'hello world'.lastIndexOf('o');    // 7（最后出现）
'hello world'.indexOf('o', 5);     // 7（从索引 5 开始）
'hello world'.indexOf('xyz');      // -1（不存在）

// search：返回正则匹配的索引
'hello 123 world'.search(/\d+/);   // 6
```

### charAt / charCodeAt / at

```javascript
'hello'.charAt(1);              // 'e'
'hello'.charCodeAt(0);          // 104（'h' 的 Unicode）

// at()（ES2022）：支持负数索引
'hello'.at(0);                  // 'h'
'hello'.at(-1);                 // 'o'（最后一个字符）
```

### repeat / match / matchAll

```javascript
// repeat：重复
'ha'.repeat(3);                  // 'hahaha'

// match：正则匹配
'hello 123 world 456'.match(/\d+/);    // ['123']
'hello 123 world 456'.match(/\d+/g);   // ['123', '456']

// matchAll（ES2020）：返回所有匹配的迭代器
const str = 'name=Alice age=25';
const matches = [...str.matchAll(/(\w+)=(\w+)/g)];
// matches[0]: ['name=Alice', 'name', 'Alice']
// matches[1]: ['age=25', 'age', '25']
```

## 常见套路组合

```javascript
// 去重
const unique = arr => [...new Set(arr)];
unique([1, 2, 2, 3, 3]);  // [1, 2, 3]

// 数组转对象
const arr = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
const map = Object.fromEntries(arr.map(item => [item.id, item]));
// { 1: { id: 1, name: 'A' }, 2: { id: 2, name: 'B' } }

// 取交集
const intersect = (a, b) => a.filter(x => b.includes(x));
intersect([1, 2, 3], [2, 3, 4]);  // [2, 3]

// 取差集
const diff = (a, b) => a.filter(x => !b.includes(x));
diff([1, 2, 3], [2, 3, 4]);      // [1]

// 分页切片
function paginate(arr, page, pageSize) {
  return arr.slice((page - 1) * pageSize, page * pageSize);
}

// 数组随机打乱（Fisher-Yates）
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

// 截断字符串
const truncate = (s, max) =>
  s.length > max ? s.slice(0, max) + '...' : s;

// camelCase → kebab-case
const toKebab = s => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
toKebab('backgroundColor');  // 'background-color'
```
