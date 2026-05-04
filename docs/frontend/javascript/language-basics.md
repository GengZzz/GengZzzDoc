# 语言基础

JavaScript 的类型系统和变量声明机制是一切的起点。理解它们的内部行为，是写出正确代码的前提。

## 变量声明

JavaScript 有三种声明方式，行为差异巨大。

### var

`var` 声明的变量有**函数作用域**和**变量提升**。

```javascript
// 变量提升：声明被提升到函数顶部，但赋值留在原地
console.log(a); // undefined（不是 ReferenceError）
var a = 10;

// 等价于：
var a;          // 声明提升
console.log(a); // undefined
a = 10;         // 赋值留在原地
```

::: warning var 的经典陷阱
`for` 循环中 `var` 声明的变量共享同一个作用域：

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出：3, 3, 3（而非 0, 1, 2）
// 因为 3 个回调共享同一个 i，循环结束时 i === 3
```

用 `let` 或闭包修复。
:::

### let 与 const

`let` 和 `const` 有**块级作用域**，不存在变量提升（存在但不可访问，称为暂时性死区 TDZ）。

```javascript
// 暂时性死区
// console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 20;

// 块级作用域
{
  let c = 30;
  const PI = 3.14159;
}
// console.log(c); // ReferenceError

// const 保证绑定不可变，不保证值不可变
const obj = { name: 'Alice' };
obj.name = 'Bob';    // 可以修改属性
// obj = {};          // TypeError: Assignment to constant variable
```

::: tip 选择原则
默认用 `const`，需要重新赋值时用 `let`，永远不用 `var`。
:::

## 类型系统

JavaScript 是**弱类型**、**动态类型**语言，有 8 种数据类型。

### 原始类型（7 种）

```javascript
// 原始类型按值传递，不可变
const str  = 'hello';       // string
const num  = 42;            // number（64 位双精度浮点，无独立整型）
const big  = 9007199254740993n; // bigint
const bool = true;          // boolean
const sym  = Symbol('id');  // symbol（唯一标识符）
const und  = undefined;     // undefined
const nul  = null;          // null
```

::: warning typeof 的陷阱
```javascript
typeof null       // 'object'（历史 Bug，null 是空指针，类型标签为 0）
typeof undefined  // 'undefined'
typeof function(){} // 'function'（函数是 object 的子类型，但 typeof 识别为 function）
typeof []         // 'object'（数组也是对象）
```
:::

### 引用类型（Object）

对象、数组、函数、Date、RegExp 等都是 Object 的子类型，按引用传递。

```javascript
const a = { x: 1 };
const b = a;       // b 和 a 指向同一个对象
b.x = 2;
console.log(a.x);  // 2

// 浅拷贝
const c = { ...a };    // 或 Object.assign({}, a)

// 深拷贝
const d = structuredClone(a);  // 现代浏览器原生支持
const e = JSON.parse(JSON.stringify(a));  // 兼容方案（丢失函数/undefined/Symbol/循环引用）
```

## 类型转换

JavaScript 的类型转换规则是面试和日常开发中的常见坑。

### 显式转换

```javascript
// 转数字
Number('42')      // 42
Number('42px')    // NaN
parseInt('42px')  // 42（逐字符解析，遇到非数字停止）
+'123'            // 123（一元加号）

// 转字符串
String(123)       // '123'
123 + ''          // '123'

// 转布尔值
Boolean(0)        // false
Boolean('')       // false
Boolean(null)     // false
Boolean(undefined) // false
Boolean(NaN)      // false
// 以上为 falsy 值，其余全部为 truthy（包括 '0'、[]、{}）
```

### 隐式转换（== 运算符）

```javascript
// == 的转换规则（简化版）
'' == 0           // true  ('' → 0)
'0' == 0          // true  ('0' → 0)
'0' == false      // true  (两边都转数字)
null == undefined // true  (特殊规则)
null == 0         // false (null 不转数字)
[] == false       // true  ([] → '' → 0)
[1] == 1          // true  ([1] → '1' → 1)
```

::: tip 始终使用 ===
`==` 的隐式转换规则过于复杂且容易出错。除非有明确理由，否则永远使用 `===`。
:::

## 运算符

### 解构赋值

```javascript
// 数组解构
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// 对象解构（按属性名匹配）
const { name, age, address: { city } } = user;

// 默认值
const { timeout = 1000 } = options;

// 重命名
const { name: userName } = user;
```

### 展开运算符

```javascript
// 数组展开
const merged = [...arr1, ...arr2];

// 对象展开（浅拷贝）
const updated = { ...user, age: 26 };

// 剩余参数
function log(first, ...args) {
  console.log(args);
}
```

### 可选链与空值合并

```javascript
// 可选链（?.）
const city = user?.address?.city;  // 不存在返回 undefined，不报错
const method = obj?.['key']?.();

// 空值合并（??）：仅 null/undefined 触发
const value = input ?? 'default';  // 0、''、false 都不会触发

// 空值合并赋值（??=）
config.timeout ??= 3000;  // 仅当 timeout 为 null/undefined 时赋值
```

## 内存结构

JavaScript 引擎（V8）中，原始类型存储在**栈**上（实际存储在堆的 FixedArray 中，栈上存引用），对象存储在**堆**上。

```
栈（Stack）                      堆（Heap）
┌──────────────┐
│ name ────────────→  ┌──────────────────────┐
└──────────────┘       │ String: "Alice"       │
┌──────────────┐       └──────────────────────┘
│ age = 25     │  ← 原始类型直接存值
└──────────────┘
┌──────────────┐
│ user ────────────→  ┌──────────────────────┐
└──────────────┘       │ { name: "Alice",     │
                       │   age: 25,           │
                       │   hobbies: ──────→ [...] }
                       └──────────────────────┘
```
