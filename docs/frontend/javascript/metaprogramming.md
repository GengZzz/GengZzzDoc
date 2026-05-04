# 元编程

元编程是操作代码自身的能力——在运行时检查、修改或创建代码。JavaScript 的元编程能力主要来自 `Symbol`、`Proxy`/`Reflect`（已单独介绍）和一些内置的元属性。

## Symbol

`Symbol` 是 ES6 引入的原始类型，每个 Symbol 值唯一且不可变，常用作对象属性的键。

### 基本用法

```javascript
const s1 = Symbol('desc');
const s2 = Symbol('desc');
console.log(s1 === s2); // false（每个 Symbol 唯一）
console.log(typeof s1); // 'symbol'

// Symbol 作为属性键
const ID = Symbol('id');
const user = { [ID]: 123, name: 'Alice' };

// 不会被 for...in、Object.keys() 枚举
Object.keys(user);           // ['name']
Object.getOwnPropertySymbols(user); // [Symbol(id)]
Reflect.ownKeys(user);       // ['name', Symbol(id)]
```

### 全局 Symbol 注册表

```javascript
// 跨文件/模块共享同一个 Symbol
const s1 = Symbol.for('app.id');
const s2 = Symbol.for('app.id');
console.log(s1 === s2); // true

// 反向查找描述
Symbol.keyFor(s1); // 'app.id'
```

### 内置 Symbol（Well-Known Symbols）

这些 Symbol 控制对象的内部行为。

```javascript
// Symbol.iterator — 定义 for...of 遍历行为
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { done: true };
      }
    };
  }
};
console.log([...range]); // [1, 2, 3, 4, 5]

// Symbol.toPrimitive — 自定义类型转换
const money = {
  amount: 100,
  currency: 'CNY',
  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number': return this.amount;
      case 'string': return `${this.amount} ${this.currency}`;
      default: return this.amount;
    }
  }
};
console.log(+money);      // 100
console.log(`${money}`);   // '100 CNY'
console.log(money + 50);   // 150

// Symbol.hasInstance — 自定义 instanceof
class EvenNumber {
  static [Symbol.hasInstance](num) {
    return typeof num === 'number' && num % 2 === 0;
  }
}
console.log(4 instanceof EvenNumber); // true
console.log(3 instanceof EvenNumber); // false

// Symbol.species — 控制派生对象的构造函数
class MyArray extends Array {
  static get [Symbol.species]() {
    return Array;  // map()、filter() 返回普通 Array 而非 MyArray
  }
}
const arr = new MyArray(1, 2, 3);
const mapped = arr.map(x => x * 2);
console.log(mapped instanceof MyArray); // false
console.log(mapped instanceof Array);   // true

// Symbol.toStringTag — 自定义 Object.prototype.toString
class Collection {
  get [Symbol.toStringTag]() {
    return 'Collection';
  }
}
console.log(Object.prototype.toString.call(new Collection()));
// '[object Collection]'

// Symbol.unscopables — with 语句中排除的属性
// 已很少使用，了解即可
```

## Reflect 元编程

`Reflect` 提供了一组静态方法，与 Proxy 拦截器一一对应，同时提供了操作对象的标准方式。

```javascript
// Reflect 的优势：返回值统一
const obj = {};

// Object.defineProperty 失败时抛异常
Object.defineProperty(obj, 'x', { value: 1 });
// Reflect.defineProperty 返回 boolean
Reflect.defineProperty(obj, 'y', { value: 2 }); // true

// 函数调用
function greet(name) { return `Hello, ${name}`; }
Reflect.apply(greet, null, ['Alice']); // 'Hello, Alice'

// 构造对象
class Point { constructor(x, y) { this.x = x; this.y = y; } }
const p = Reflect.construct(Point, [1, 2]); // new Point(1, 2)

// 获取原型
Reflect.getPrototypeOf(p); // Point.prototype
```

## 元属性（Meta Properties）

### new.target

检测函数是否通过 `new` 调用。

```javascript
function Person(name) {
  if (!new.target) {
    // 不用 new 调用时自动补上
    return new Person(name);
  }
  this.name = name;
}

Person('Alice');  // 等价于 new Person('Alice')
```

```javascript
// 抽象基类：禁止直接实例化
class Shape {
  constructor() {
    if (new.target === Shape) {
      throw new Error('Shape 不能直接实例化');
    }
  }
}

class Circle extends Shape {
  constructor() {
    super();
    this.type = 'circle';
  }
}

// new Shape();  // Error
new Circle();   // OK
```

### import.meta

ES Module 中的元信息。

```javascript
// import.meta.url — 当前模块的完整 URL
console.log(import.meta.url);
// 'file:///path/to/module.js'

// 获取当前模块所在目录
const dir = new URL('.', import.meta.url).pathname;

// Vite 环境变量
console.log(import.meta.env.VITE_API_URL);

// Vite HMR
if (import.meta.hot) {
  import.meta.hot.accept();
}
```

## eval 与 new Function

### eval

执行字符串形式的代码。

```javascript
// eval 在当前作用域执行
let x = 1;
eval('x = x + 1');
console.log(x); // 2

// 严格模式下 eval 有自己的作用域
(function() {
  'use strict';
  let x = 1;
  eval('let x = 99; console.log(x)'); // 99
  console.log(x); // 1（不受 eval 影响）
})();

// 安全隐患：XSS 攻击
// 永远不要对用户输入使用 eval
```

### new Function

创建函数，参数是字符串形式的函数体。

```javascript
// new Function 在全局作用域执行
const sum = new Function('a', 'b', 'return a + b');
sum(1, 2); // 3

// 实际应用：动态生成验证函数
function createValidator(rules) {
  const checks = rules
    .map(r => `if (!(${r.condition})) errors.push('${r.message}');`)
    .join('\n');

  return new Function('data', 'errors', checks);
}

const validate = createValidator([
  { condition: 'data.name', message: '名称不能为空' },
  { condition: 'data.age > 0', message: '年龄必须大于0' }
]);

const errors = [];
validate({ name: '', age: -1 }, errors);
// errors: ['名称不能为空', '年龄必须大于0']
```

::: warning 安全警告
`eval` 和 `new Function` 都可以执行任意代码，存在安全风险。日常开发中应避免使用：
- 用 `JSON.parse()` 替代 `eval()` 解析 JSON
- 用模板字符串 + 函数替代字符串拼接逻辑
- 如果必须使用，确保输入经过严格校验
:::
