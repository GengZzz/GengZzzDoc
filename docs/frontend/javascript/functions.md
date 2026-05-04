# 函数深入

函数是 JavaScript 的一等公民，理解函数的行为是掌握这门语言的关键。

## 函数类型

```javascript
// 函数声明（有提升）
function add(a, b) { return a + b; }

// 函数表达式（无提升）
const multiply = function(a, b) { return a * b; };

// 箭头函数（无自己的 this、arguments、super、new.target）
const divide = (a, b) => a / b;

// 立即执行函数表达式（IIFE）
(function() {
  // 独立作用域，避免污染全局
})();

// 命名函数表达式（名字只能在函数内部访问）
const factorial = function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);  // 内部可递归调用
};
```

## 作用域与闭包

### 作用域链

JavaScript 采用**词法作用域**：函数的作用域在定义时确定，而非调用时。

```javascript
const x = 10;

function outer() {
  const y = 20;

  function inner() {
    const z = 30;
    console.log(x + y + z);  // 逐级向上查找：inner → outer → global
  }

  inner();
}
outer(); // 60
```

### 闭包

闭包 = 函数 + 其定义时的词法环境。函数可以"记住"它被创建时的环境。

```javascript
function createCounter() {
  let count = 0;  // 这个变量被闭包捕获

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    getCount() { return count; }
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getCount();  // 2
// count 变量依然存活，被闭包引用
```

::: warning 闭包与循环的经典问题
```javascript
// 问题：3 个回调共享同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);  // 3, 3, 3
}

// 修复 1：let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);  // 0, 1, 2
}

// 修复 2：IIFE 创建独立作用域
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100);  // 0, 1, 2
  })(i);
}
```
:::

### 闭包的实际应用

```javascript
// 1. 数据封装（模块模式）
const api = (function() {
  const baseUrl = 'https://api.example.com';
  const token = 'secret';

  return {
    get(path) {
      return fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };
})();

// 2. 函数工厂
function createMultiplier(factor) {
  return (number) => number * factor;
}
const double = createMultiplier(2);
const triple = createMultiplier(3);

// 3. 防抖（debounce）
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

## this 绑定

`this` 的值在函数**调用时**确定，有四种绑定规则。

### 默认绑定

```javascript
function foo() {
  'use strict';
  console.log(this);  // undefined（严格模式）
}
foo();

function bar() {
  console.log(this);  // window（非严格模式）
}
bar();
```

### 隐式绑定

```javascript
const obj = {
  name: 'Alice',
  greet() {
    console.log(this.name);
  }
};

obj.greet();  // 'Alice'（调用时 obj 是前缀）

// 隐式丢失
const fn = obj.greet;
fn();  // undefined（丢失了 obj 上下文）
```

### 显式绑定

```javascript
function greet(greeting) {
  console.log(`${greeting}, ${this.name}`);
}

const user = { name: 'Bob' };

greet.call(user, 'Hello');    // 'Hello, Bob'
greet.apply(user, ['Hello']); // 'Hello, Bob'

// bind：创建新函数，永久绑定 this
const boundGreet = greet.bind(user);
boundGreet('Hi');  // 'Hi, Bob'
```

### new 绑定

```javascript
function Person(name) {
  this.name = name;  // this 指向新创建的对象
}

const p = new Person('Charlie');
```

### 箭头函数的 this

箭头函数**没有自己的 this**，继承外层作用域的 this（词法 this）。

```javascript
const timer = {
  seconds: 0,
  start() {
    // 普通函数：this 是 window（回调丢失上下文）
    // 箭头函数：this 继承 start 的 this（即 timer）
    setInterval(() => {
      this.seconds++;
      console.log(this.seconds);
    }, 1000);
  }
};
```

::: tip this 优先级
new 绑定 > 显式绑定 > 隐式绑定 > 默认绑定

箭头函数不适用以上规则，始终继承外层 this。
:::

## 高阶函数

```javascript
// 柯里化（Curry）
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
}

const add3 = curry((a, b, c) => a + b + c);
add3(1)(2)(3);    // 6
add3(1, 2)(3);    // 6

// 组合（Compose）
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);

const process = compose(
  (x) => x.toUpperCase(),
  (x) => x.trim(),
  (x) => x.replace(/\s+/g, ' ')
);
process('  hello   world  '); // 'HELLO WORLD'
```
