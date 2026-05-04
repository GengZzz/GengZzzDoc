# 迭代器与生成器

## 迭代器协议

任何实现了 `next()` 方法、返回 `{ value, done }` 的对象就是迭代器。

```javascript
// 手写迭代器
function createRangeIterator(start, end) {
  let current = start;
  return {
    next() {
      if (current <= end) {
        return { value: current++, done: false };
      }
      return { value: undefined, done: true };
    }
  };
}

const iter = createRangeIterator(1, 3);
iter.next(); // { value: 1, done: false }
iter.next(); // { value: 2, done: false }
iter.next(); // { value: 3, done: false }
iter.next(); // { value: undefined, done: true }
```

## 可迭代协议

实现了 `Symbol.iterator` 方法的对象是可迭代的，可以用 `for...of` 遍历。

```javascript
const range = {
  start: 1,
  end: 5,
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end
          ? { value: current++, done: false }
          : { done: true };
      }
    };
  }
};

for (const n of range) {
  console.log(n);  // 1, 2, 3, 4, 5
}

// 展开运算符也依赖迭代器
const arr = [...range];  // [1, 2, 3, 4, 5]
```

## 生成器函数

`function*` 定义生成器函数，`yield` 暂停执行并返回值。

```javascript
function* countUp(max) {
  for (let i = 1; i <= max; i++) {
    yield i;  // 暂停，返回 i
  }
}

const gen = countUp(3);
gen.next();  // { value: 1, done: false }
gen.next();  // { value: 2, done: false }
gen.next();  // { value: 3, done: false }
gen.next();  // { value: undefined, done: true }

// 生成器是可迭代的
for (const n of countUp(5)) {
  console.log(n);  // 1, 2, 3, 4, 5
}
```

### yield 双向通信

```javascript
function* dialog() {
  const name = yield '你叫什么名字？';
  const age = yield `你好 ${name}，你多大了？`;
  return `${name}, ${age}岁`;
}

const gen = dialog();
gen.next();           // { value: '你叫什么名字？', done: false }
gen.next('Alice');    // { value: '你好 Alice，你多大了？', done: false }
gen.next(25);         // { value: 'Alice, 25岁', done: true }
```

### yield* 委托

```javascript
function* concat(...iterables) {
  for (const iterable of iterables) {
    yield* iterable;  // 委托给另一个可迭代对象
  }
}

function* natural() {
  let n = 1;
  while (true) yield n++;
}

// 取前 5 个自然数
const first5 = [...natural()].slice(0, 5);  // 注意：无限生成器
// 更好的方式：
function* take(n, iterable) {
  for (const item of iterable) {
    if (n-- <= 0) return;
    yield item;
  }
}
const five = [...take(5, natural())];  // [1, 2, 3, 4, 5]
```

## 异步迭代器

```javascript
// 异步可迭代协议：Symbol.asyncIterator
const asyncRange = {
  start: 1,
  end: 5,
  [Symbol.asyncIterator]() {
    let current = this.start;
    const end = this.end;
    return {
      async next() {
        await new Promise(r => setTimeout(r, 100));
        return current <= end
          ? { value: current++, done: false }
          : { done: true };
      }
    };
  }
};

// for await...of 遍历异步迭代器
for await (const n of asyncRange) {
  console.log(n);  // 每隔 100ms 输出 1, 2, 3, 4, 5
}

// 异步生成器
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const response = await fetch(`${url}?page=${page}`);
    const data = await response.json();
    if (data.length === 0) return;
    yield data;
    page++;
  }
}
```
