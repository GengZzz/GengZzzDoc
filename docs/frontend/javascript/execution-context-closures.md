# 执行上下文与闭包

执行上下文决定了变量如何创建、函数如何调用、`this` 如何绑定。闭包不是特殊语法，而是函数和词法环境共同作用的结果。

## 执行上下文

JavaScript 执行代码时，会创建执行上下文。常见上下文有三类：

| 类型 | 什么时候创建 | 作用 |
| --- | --- | --- |
| 全局执行上下文 | 脚本或模块开始执行 | 创建全局对象、全局词法环境 |
| 函数执行上下文 | 函数被调用 | 保存参数、局部变量、`this` |
| 模块执行上下文 | ES Module 执行 | 保存模块作用域和 live binding |

函数每调用一次，就会创建一个新的函数执行上下文：

```javascript
function sum(a, b) {
  const result = a + b;
  return result;
}

sum(1, 2);
sum(3, 4);
```

上面两次 `sum` 调用互不影响，因为每次调用都有独立的参数和局部变量环境。

## 调用栈

调用栈用来管理执行上下文，后调用的函数先返回。

```javascript
function a() {
  b();
}

function b() {
  c();
}

function c() {
  console.log('run');
}

a();
```

执行过程：

```text
push global
push a
push b
push c
pop c
pop b
pop a
```

如果递归没有终止条件，调用栈会不断增长，最终触发栈溢出。

```javascript
function loop() {
  loop();
}

loop(); // RangeError: Maximum call stack size exceeded
```

## 词法环境

词法环境可以理解为“变量名到变量值的映射表”。它由代码书写位置决定，不由函数调用位置决定。

```javascript
const name = 'global';

function outer() {
  const name = 'outer';

  function inner() {
    console.log(name);
  }

  return inner;
}

const fn = outer();
fn(); // outer
```

`inner` 在 `outer` 内部定义，所以它的外层词法环境是 `outer`。即使 `fn` 在全局调用，查找 `name` 时仍然回到 `outer`。

## 变量提升

变量提升不是“代码被移动”，而是执行上下文创建时先登记声明。

```javascript
console.log(a); // undefined
var a = 1;

console.log(b); // ReferenceError
let b = 2;
```

差异：

| 声明 | 是否提升 | 初始化时间 | 访问未初始化变量 |
| --- | --- | --- | --- |
| `var` | 是 | 初始化为 `undefined` | 得到 `undefined` |
| `let` / `const` | 是 | 执行到声明处 | 抛出 `ReferenceError` |
| `function` 声明 | 是 | 创建函数对象 | 可以提前调用 |

`let` 和 `const` 从作用域开始到声明执行前，处于暂时性死区。

## 闭包

闭包 = 函数 + 函数创建时能访问的词法环境。

<JsClosureScopeDemo />

```javascript
function createCounter() {
  let count = 0;

  return function increment() {
    count += 1;
    return count;
  };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
```

`createCounter` 执行结束后，它的执行上下文会弹出调用栈，但 `increment` 仍然引用着 `count` 所在的词法环境，所以 `count` 不会被回收。

## 闭包的高频用法

### 封装私有状态

```javascript
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;
      listeners.forEach(listener => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
```

外部不能直接修改 `state`，只能通过暴露的方法访问。

### 函数工厂

```javascript
function createValidator(rules) {
  return function validate(data) {
    return rules.every(rule => rule(data));
  };
}

const validateUser = createValidator([
  user => user.name.length > 0,
  user => user.age >= 18
]);
```

规则只配置一次，后续每次校验都复用同一组规则。

### 缓存计算结果

```javascript
function memoize(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

适合纯函数，不适合依赖时间、随机数、网络状态的函数。

## 闭包与内存

闭包会延长变量生命周期，这既是能力，也是风险。

```javascript
function bindLargeData() {
  const largeList = new Array(100000).fill({ value: 1 });

  return function handleClick() {
    console.log(largeList.length);
  };
}

const handler = bindLargeData();
button.addEventListener('click', handler);
```

只要 `handler` 还被事件监听器引用，`largeList` 就不能被回收。

更好的写法是只保留真正需要的数据：

```javascript
function bindListLength(list) {
  const length = list.length;

  return function handleClick() {
    console.log(length);
  };
}
```

## this 与闭包

闭包保留的是词法环境，不会自动保留调用对象。

```javascript
const user = {
  name: 'Alice',
  getNameLater() {
    return function() {
      return this.name;
    };
  }
};

const getName = user.getNameLater();
getName(); // undefined，严格模式下 this 是 undefined
```

如果需要保留外层 `this`，可以用箭头函数：

```javascript
const user = {
  name: 'Alice',
  getNameLater() {
    return () => this.name;
  }
};
```

箭头函数没有自己的 `this`，会捕获外层函数的 `this`。

## 常见误区

### 误区一：闭包一定导致内存泄漏

闭包本身不会导致泄漏。泄漏来自“已经不需要的数据仍然被引用”。

```javascript
function createHandler(id) {
  return () => console.log(id);
}
```

这种闭包只保存一个 `id`，非常正常。

### 误区二：var 循环问题是异步导致的

本质原因是多个回调共享同一个函数作用域中的 `i`。

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
```

`setTimeout` 执行时，循环已经结束，唯一的 `i` 已经变成 `3`。

`let` 会为每次循环创建新的词法绑定：

```javascript
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
```

## 日常判断清单

- 函数是否依赖外层变量？
- 外层变量是否会在函数返回后继续被使用？
- 闭包是否捕获了大对象、DOM 节点、定时器或订阅？
- 是否需要提供取消函数来释放引用？
- `this` 是否可能在回调中丢失？
