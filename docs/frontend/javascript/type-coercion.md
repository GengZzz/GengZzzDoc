# 类型转换与相等性

JavaScript 的类型转换是面试高频考点，也是日常开发中 bug 的常见来源。理解隐式转换规则，才能写出可靠的比较逻辑。

## 类型转换规则

### 转布尔值（Boolean）

以下值转换为 `false`，其余全部为 `true`：

```javascript
// 假值列表（共 8 个）
Boolean(undefined)  // false
Boolean(null)       // false
Boolean(0)          // false
Boolean(-0)         // false
Boolean(NaN)        // false
Boolean('')         // false
Boolean(false)      // false
BigInt(0)           // false

// 常见陷阱
Boolean('0')        // true（非空字符串）
Boolean('false')    // true（非空字符串）
Boolean([])         // true（空数组是真值）
Boolean({})         // true（空对象是真值）
Boolean(function(){}) // true
```

### 转数字（Number）

```javascript
// 字符串 → 数字
Number('123')     // 123
Number('12.3')    // 12.3
Number('')        // 0
Number(' ')       // 0（trim 后为空）
Number('12a')     // NaN
Number('0x10')    // 16（十六进制）

// 布尔值 → 数字
Number(true)      // 1
Number(false)     // 0

// null / undefined
Number(null)      // 0
Number(undefined) // NaN

// 对象 → 数字（先调用 valueOf，再 toString，再 ToNumber）
Number([1])       // 1
Number([1, 2])    // NaN（'1,2' 无法转数字）
Number({})        // NaN（'[object Object]' 无法转数字）
```

### 转字符串（String）

```javascript
String(123)       // '123'
String(true)      // 'true'
String(null)      // 'null'
String(undefined) // 'undefined'
String([1, 2])    // '1,2'
String({})        // '[object Object]'
```

## ToPrimitive 算法

对象转原始值时调用的内部算法。

```javascript
// hint = 'number'：先 valueOf()，不行再 toString()
// hint = 'string'：先 toString()，不行再 valueOf()

const obj = {
  valueOf() { return 42; },
  toString() { return 'hello'; }
};

Number(obj);  // 42（hint='number'，先 valueOf）
String(obj);  // 'hello'（hint='string'，先 toString）
```

```javascript
// Date 对象的特殊行为
const date = new Date(2024, 0, 1);

// Date 的 toString() 优先级高于 valueOf（hint='string' 时）
// 但 hint='number' 时 valueOf 返回时间戳
+date           // 1704038400000（valueOf 返回时间戳）
`${date}`       // 'Mon Jan 01 2024 ...'（toString 返回日期字符串）

// 数组的转换
[1, 2, 3] + ''        // '1,2,3'（toString）
[1] + [2]             // '12'（两边都 toString 再拼接）
[] + {}               // '[object Object]'（空数组 → ''，对象 → '[object Object]')
{} + []               // 0（被解析为代码块 +[] → +'' → 0）
```

## == 与 ===

### === 严格相等

不做类型转换，类型不同直接 `false`。

```javascript
1 === 1       // true
1 === '1'     // false（类型不同）
null === undefined // false
NaN === NaN   // false（NaN 不等于自身）
+0 === -0     // true
```

### == 宽松相等

**规则优先级：**

```
1. 类型相同 → 直接比较值
2. null == undefined → true
3. String == Number → String 转 Number 再比较
4. Boolean == * → Boolean 转 Number 再比较
5. Object == String/Number/Symbol → 对象转原始值再比较
6. 其他 → false
```

```javascript
// 经典面试题
'0' == false    // true（'0'→0, false→0, 0==0）
'' == false     // true（''→0, false→0）
'1' == true     // true（'1'→1, true→1）
'2' == true     // false（'2'→2, true→1）
[] == false     // true（[]→''→0, false→0）
[] == ![]       // true（![] → false, []==false → true）
[] == ''        // true（[]→''）
[] == 0         // true（[]→''→0）
[0] == 0        // true（[0]→'0'→0）
[1] == 1        // true（[1]→'1'→1）
[1,2] == '1,2'  // true（[1,2]→'1,2'）
{} == '[object Object]' // 语法错误（行首 {} 被当代码块）

// null 和 undefined
null == undefined    // true
null == 0            // false（null 只 == undefined）
undefined == 0       // false（undefined 只 == null）
null == false        // false
undefined == false   // false
```

::: danger 避免使用 ==
`==` 的规则复杂且反直觉，日常开发中**始终使用 `===`**。只有在需要同时检查 `null` 和 `undefined` 时可以使用 `== null`：
```javascript
if (value == null) {
  // 等价于 value === null || value === undefined
}
```
:::

## 加法与比较运算符

### + 运算符

```javascript
// 规则：任一操作数是字符串 → 字符串拼接
// 否则 → 数字加法

1 + 2             // 3
'1' + 2           // '12'（字符串拼接）
1 + '2'           // '12'
1 + 2 + '3'       // '33'（从左到右：3+'3'）
'1' + 2 + 3       // '123'（从左到右：'12'+3）

true + 1          // 2
null + 1          // 1
undefined + 1     // NaN

// 对象
[1] + [2]         // '12'
{} + []           // 0 或 '[object Object]'（取决于解析上下文）
[] + {}           // '[object Object]'
({} + [])         // '[object Object]'（括号内表达式）
```

### 比较运算符（> < >= <=）

```javascript
// 规则：
// 1. 两边都是字符串 → 按字典序比较
// 2. 否则 → 转数字比较

// 字符串按字典序
'10' > '2'        // false（'1' < '2'）
'abc' > 'aac'     // true（'b' > 'a'）

// 转数字
'10' > 2          // true（'10'→10）
'10' >= 10        // true
true > false      // true（1 > 0）
null >= 0         // true（null→0）
null <= 0         // true

// 特殊情况
undefined > 0     // false（undefined→NaN，NaN 比较全 false）
undefined < 0     // false
undefined == 0    // false（undefined 只 == null）
null > 0          // false（null→0，但 0 > 0 是 false）
null >= 0         // true（0 >= 0 是 true）
null <= 0         // true（0 <= 0 是 true）
```

## typeof 与 instanceof

### typeof

```javascript
typeof 42           // 'number'
typeof 'hello'      // 'string'
typeof true         // 'boolean'
typeof undefined    // 'undefined'
typeof Symbol()     // 'symbol'
typeof 10n          // 'bigint'
typeof function(){} // 'function'

// 所有其他对象（包括 null）都是 'object'
typeof null         // 'object'（历史遗留 bug）
typeof []           // 'object'
typeof {}           // 'object'
typeof /regex/      // 'object'

// 判断数组
Array.isArray([])   // true（推荐方式）
```

### instanceof

检查构造函数的 `prototype` 是否在对象的原型链上。

```javascript
// 原理：沿原型链查找
function myInstanceOf(obj, Constructor) {
  let proto = Object.getPrototypeOf(obj);
  while (proto) {
    if (proto === Constructor.prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// 注意事项
[] instanceof Array       // true
[] instanceof Object      // true（Array.prototype 继承自 Object.prototype）

// 跨 iframe 问题
// iframe 中的数组 instanceof 主页面的 Array → false
// 使用 Array.isArray() 或 Object.prototype.toString.call()
```

### Object.prototype.toString.call()

最可靠的类型检测方式。

```javascript
Object.prototype.toString.call(42)        // '[object Number]'
Object.prototype.toString.call('hi')      // '[object String]'
Object.prototype.toString.call(null)      // '[object Null]'
Object.prototype.toString.call(undefined) // '[object Undefined]'
Object.prototype.toString.call([])        // '[object Array]'
Object.prototype.toString.call({})        // '[object Object]'
Object.prototype.toString.call(/re/)      // '[object RegExp]'
Object.prototype.toString.call(new Date())// '[object Date]'
Object.prototype.toString.call(new Map()) // '[object Map]'
Object.prototype.toString.call(new Set()) // '[object Set]'

// 封装为工具函数
function typeOf(value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}
typeOf([])  // 'array'
typeOf(null) // 'null'
```
